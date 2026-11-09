import { Router, Response } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { prisma } from '../db.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import { roleMiddleware } from '../middleware/role.js';

export const adminRouter = Router();

// Proteksi Ganda: Wajib Login & Wajib Role Admin
adminRouter.use(authMiddleware);
adminRouter.use(roleMiddleware(['admin']));

// ============================================================================
// 1. STATISTIK PLATFORM (HANYA ANGKA AGREGAT, TANPA DATA PRIVAT GURU / SISWA)
// ============================================================================
adminRouter.get('/statistik', async (_req: AuthRequest, res: Response) => {
  try {
    const [
      totalGuru,
      totalTemplate,
      totalTemplateResmi,
      totalSesi,
      totalPapan,
      sesiSelesai,
      guruAktif,
      guruNonaktif,
    ] = await Promise.all([
      prisma.user.count({ where: { role: 'guru' } }),
      prisma.template.count(),
      prisma.template.count({ where: { resmi: true } }),
      prisma.session.count(),
      prisma.board.count(),
      prisma.session.count({ where: { status: 'selesai' } }),
      prisma.user.count({ where: { role: 'guru', status: 'aktif' } }),
      prisma.user.count({ where: { role: 'guru', status: 'nonaktif' } }),
    ]);

    // Agregat aktivitas sesi 7 hari terakhir
    const tujuhHariLalu = new Date();
    tujuhHariLalu.setDate(tujuhHariLalu.getDate() - 6);
    tujuhHariLalu.setHours(0, 0, 0, 0);

    const sesiTerbaru = await prisma.session.findMany({
      where: {
        createdAt: { gte: tujuhHariLalu },
      },
      select: { createdAt: true },
    });

    // Petakan ke format tanggal YYYY-MM-DD
    const aktivitasPerHari: Record<string, number> = {};
    for (let i = 0; i < 7; i++) {
      const d = new Date(tujuhHariLalu);
      d.setDate(d.getDate() + i);
      const key = d.toISOString().split('T')[0];
      aktivitasPerHari[key] = 0;
    }

    sesiTerbaru.forEach((s) => {
      const key = s.createdAt.toISOString().split('T')[0];
      if (aktivitasPerHari[key] !== undefined) {
        aktivitasPerHari[key]++;
      }
    });

    const grafikAktivitas = Object.entries(aktivitasPerHari).map(([tanggal, jumlah]) => ({
      tanggal,
      jumlah,
    }));

    return res.json({
      statistik: {
        totalGuru,
        guruAktif,
        guruNonaktif,
        totalTemplate,
        totalTemplateResmi,
        totalSesi,
        totalPapan,
        sesiSelesai,
        grafikAktivitas,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ pesan: err.message || 'Gagal memuat statistik platform.' });
  }
});

// ============================================================================
// 2. KELOLA AKUN GURU (Pencarian, Aktivasi, Nonaktivasi, Reset Password, Hapus)
// ============================================================================
adminRouter.get('/guru', async (req: AuthRequest, res: Response) => {
  try {
    const q = (req.query.q as string)?.trim();
    const where: any = { role: 'guru' };

    if (q) {
      where.OR = [
        { nama: { contains: q } },
        { email: { contains: q } },
        { sekolah: { contains: q } },
      ];
    }

    const guruList = await prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        nama: true,
        email: true,
        sekolah: true,
        status: true,
        createdAt: true,
        _count: {
          select: {
            templates: true,
            sessions: true,
            boards: true,
          },
        },
      },
    });

    return res.json({ guru: guruList });
  } catch (err: any) {
    return res.status(500).json({ pesan: err.message || 'Gagal memuat daftar guru.' });
  }
});

// PATCH /api/admin/guru/:id - Nonaktifkan/Aktifkan Akun atau Reset Password
const ubahGuruSchema = z.object({
  status: z.enum(['aktif', 'nonaktif']).optional(),
  resetPassword: z.boolean().optional(),
});

adminRouter.patch('/guru/:id', async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const parsed = ubahGuruSchema.parse(req.body);

    const targetUser = await prisma.user.findUnique({
      where: { id },
      select: { id: true, email: true, role: true, nama: true, status: true },
    });

    if (!targetUser || targetUser.role !== 'guru') {
      return res.status(404).json({ pesan: 'Akun guru tidak ditemukan.' });
    }

    const dataUpdate: any = {};
    let aksiLog = '';
    let passwordBaru: string | null = null;

    if (parsed.status && parsed.status !== targetUser.status) {
      dataUpdate.status = parsed.status;
      aksiLog = `Mengubah status akun guru ${targetUser.email} menjadi ${parsed.status}`;
    }

    if (parsed.resetPassword) {
      passwordBaru = 'GuruDiscereBaru123!';
      const salt = await bcrypt.genSalt(10);
      dataUpdate.passwordHash = await bcrypt.hash(passwordBaru, salt);
      aksiLog = aksiLog
        ? `${aksiLog} & Mereset kata sandi`
        : `Mereset kata sandi akun guru ${targetUser.email}`;
    }

    if (Object.keys(dataUpdate).length === 0) {
      return res.status(400).json({ pesan: 'Tidak ada perubahan yang diminta.' });
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: dataUpdate,
      select: {
        id: true,
        nama: true,
        email: true,
        status: true,
      },
    });

    // Catat log tindakan admin
    await prisma.adminLog.create({
      data: {
        adminId: req.user!.id,
        aksi: aksiLog,
        target: targetUser.email,
      },
    });

    return res.json({
      pesan: 'Akun guru berhasil diperbarui.',
      guru: updatedUser,
      passwordBaru,
    });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ pesan: err.issues[0]?.message || 'Input tidak valid.' });
    }
    return res.status(500).json({ pesan: err.message || 'Gagal memperbarui akun guru.' });
  }
});

// DELETE /api/admin/guru/:id - Hapus akun guru beserta seluruh datanya
adminRouter.delete('/guru/:id', async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;

    const targetUser = await prisma.user.findUnique({
      where: { id },
      select: { id: true, email: true, nama: true, role: true },
    });

    if (!targetUser || targetUser.role !== 'guru') {
      return res.status(404).json({ pesan: 'Akun guru tidak ditemukan.' });
    }

    // Hapus akun guru (Cascade onDelete akan menghapus template, sesi, dan papan)
    await prisma.user.delete({
      where: { id },
    });

    // Catat ke log tindakan admin
    await prisma.adminLog.create({
      data: {
        adminId: req.user!.id,
        aksi: `Menghapus akun guru ${targetUser.nama} (${targetUser.email}) beserta seluruh datanya`,
        target: targetUser.email,
      },
    });

    return res.json({ pesan: `Akun guru ${targetUser.email} berhasil dihapus.` });
  } catch (err: any) {
    return res.status(500).json({ pesan: err.message || 'Gagal menghapus akun guru.' });
  }
});

// ============================================================================
// 3. PUSTAKA TEMPLATE RESMI ADMIN (Kelola Template Contoh untuk Disalin Guru)
// ============================================================================
const pustakaSoalSchema = z.object({
  urutan: z.number().int().default(0),
  teks: z.string().min(1, 'Teks soal wajib diisi.'),
  opsiA: z.string().min(1, 'Opsi A wajib diisi.'),
  opsiB: z.string().min(1, 'Opsi B wajib diisi.'),
  opsiC: z.string().min(1, 'Opsi C wajib diisi.'),
  jawabanBenar: z.enum(['A', 'B', 'C']),
  penjelasan: z.string().nullable().optional(),
  dibuatAi: z.boolean().default(false),
});

const pustakaTemplateSchema = z.object({
  judul: z.string().min(3, 'Judul minimal 3 karakter.'),
  game: z.string().default('tarik_tambang'),
  mode: z.enum(['solo', 'multi']).default('solo'),
  questions: z.array(pustakaSoalSchema).min(1, 'Minimal sertakan 1 soal.'),
});

// GET /api/admin/pustaka - Daftar template resmi
adminRouter.get('/pustaka', async (_req: AuthRequest, res: Response) => {
  try {
    const templates = await prisma.template.findMany({
      where: { resmi: true },
      orderBy: { updatedAt: 'desc' },
      include: {
        questions: {
          orderBy: { urutan: 'asc' },
        },
      },
    });

    return res.json({ templates });
  } catch (err: any) {
    return res.status(500).json({ pesan: err.message || 'Gagal memuat pustaka template.' });
  }
});

// POST /api/admin/pustaka - Buat template resmi baru
adminRouter.post('/pustaka', async (req: AuthRequest, res: Response) => {
  try {
    const parsed = pustakaTemplateSchema.parse(req.body);

    const created = await prisma.template.create({
      data: {
        judul: parsed.judul,
        game: parsed.game,
        mode: parsed.mode,
        resmi: true,
        ownerId: null, // Template resmi tidak terikat ke akun guru privat
        questions: {
          create: parsed.questions.map((q, idx) => ({
            urutan: q.urutan || idx + 1,
            teks: q.teks,
            opsiA: q.opsiA,
            opsiB: q.opsiB,
            opsiC: q.opsiC,
            jawabanBenar: q.jawabanBenar,
            penjelasan: q.penjelasan || null,
            dibuatAi: q.dibuatAi || false,
          })),
        },
      },
      include: { questions: true },
    });

    await prisma.adminLog.create({
      data: {
        adminId: req.user!.id,
        aksi: `Membuat template resmi baru: "${created.judul}"`,
        target: created.id,
      },
    });

    return res.status(201).json({
      pesan: 'Template resmi berhasil dibuat.',
      template: created,
    });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ pesan: err.issues[0]?.message || 'Input template tidak valid.' });
    }
    return res.status(500).json({ pesan: err.message || 'Gagal membuat template resmi.' });
  }
});

// PUT /api/admin/pustaka/:id - Ubah template resmi
adminRouter.put('/pustaka/:id', async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const parsed = pustakaTemplateSchema.parse(req.body);

    const existing = await prisma.template.findUnique({
      where: { id },
      select: { id: true, resmi: true, judul: true },
    });

    if (!existing || !existing.resmi) {
      return res.status(404).json({ pesan: 'Template resmi tidak ditemukan.' });
    }

    const updated = await prisma.$transaction(async (tx) => {
      // Hapus soal lama
      await tx.question.deleteMany({ where: { templateId: id } });

      // Perbarui metadata template dan buat soal baru
      return tx.template.update({
        where: { id },
        data: {
          judul: parsed.judul,
          game: parsed.game,
          mode: parsed.mode,
          questions: {
            create: parsed.questions.map((q, idx) => ({
              urutan: q.urutan || idx + 1,
              teks: q.teks,
              opsiA: q.opsiA,
              opsiB: q.opsiB,
              opsiC: q.opsiC,
              jawabanBenar: q.jawabanBenar,
              penjelasan: q.penjelasan || null,
              dibuatAi: q.dibuatAi || false,
            })),
          },
        },
        include: { questions: true },
      });
    });

    await prisma.adminLog.create({
      data: {
        adminId: req.user!.id,
        aksi: `Memperbarui template resmi: "${updated.judul}"`,
        target: updated.id,
      },
    });

    return res.json({ pesan: 'Template resmi berhasil diperbarui.', template: updated });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ pesan: err.issues[0]?.message || 'Input tidak valid.' });
    }
    return res.status(500).json({ pesan: err.message || 'Gagal memperbarui template resmi.' });
  }
});

// DELETE /api/admin/pustaka/:id - Hapus template resmi
adminRouter.delete('/pustaka/:id', async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const existing = await prisma.template.findUnique({
      where: { id },
      select: { id: true, resmi: true, judul: true },
    });

    if (!existing || !existing.resmi) {
      return res.status(404).json({ pesan: 'Template resmi tidak ditemukan.' });
    }

    await prisma.template.delete({ where: { id } });

    await prisma.adminLog.create({
      data: {
        adminId: req.user!.id,
        aksi: `Menghapus template resmi: "${existing.judul}"`,
        target: existing.id,
      },
    });

    return res.json({ pesan: 'Template resmi berhasil dihapus.' });
  } catch (err: any) {
    return res.status(500).json({ pesan: err.message || 'Gagal menghapus template resmi.' });
  }
});

// ============================================================================
// 4. PEMAKAIAN AI PLATFORM (Monitoring Agregat Tanpa Membaca Soal Guru)
// ============================================================================
adminRouter.get('/ai', async (_req: AuthRequest, res: Response) => {
  try {
    const usages = await prisma.aiUsage.findMany({
      orderBy: { tanggal: 'desc' },
      take: 30,
      select: {
        tanggal: true,
        jumlah: true,
        userId: true,
      },
    });

    // Hitung agregat per tanggal
    const rekapHarian: Record<string, { totalPanggilan: number; totalGuru: Set<string> }> = {};
    let totalPanggilanSeluruhnya = 0;

    usages.forEach((u) => {
      totalPanggilanSeluruhnya += u.jumlah;
      if (!rekapHarian[u.tanggal]) {
        rekapHarian[u.tanggal] = { totalPanggilan: 0, totalGuru: new Set() };
      }
      rekapHarian[u.tanggal].totalPanggilan += u.jumlah;
      rekapHarian[u.tanggal].totalGuru.add(u.userId);
    });

    const daftarRekap = Object.entries(rekapHarian).map(([tanggal, data]) => ({
      tanggal,
      totalPanggilan: data.totalPanggilan,
      jumlahGuru: data.totalGuru.size,
    }));

    const totalCache = await prisma.aiCache.count();

    return res.json({
      aiMonitoring: {
        totalPanggilanSeluruhnya,
        totalCacheTersimpan: totalCache,
        rekapHarian: daftarRekap,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ pesan: err.message || 'Gagal memuat monitoring AI.' });
  }
});

// ============================================================================
// 5. AUDIT LOG TINDAKAN ADMIN (Transparansi & Akuntabilitas Pengelola)
// ============================================================================
adminRouter.get('/log', async (_req: AuthRequest, res: Response) => {
  try {
    const logs = await prisma.adminLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        admin: {
          select: {
            id: true,
            nama: true,
            email: true,
          },
        },
      },
    });

    return res.json({ logs });
  } catch (err: any) {
    return res.status(500).json({ pesan: err.message || 'Gagal memuat log tindakan admin.' });
  }
});
