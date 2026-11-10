import { Router, Response, Request } from 'express';
import { z } from 'zod';
import QRCode from 'qrcode';
import os from 'os';
import { prisma } from '../db.js';
import { config } from '../config.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import { roleMiddleware } from '../middleware/role.js';
import { soloManager } from '../games/soloManager.js';
import { multiManager } from '../games/multiManager.js';
import { kerupukManager } from '../games/kerupukManager.js';
import { validasiProbabilitas, PRESET_PROBABILITAS } from '../games/makanKerupuk.js';
import { panjatPinangManager } from '../games/panjatPinangManager.js';
import {
  bangunKonfigurasiPanjatPinang,
  konfigurasiPanjatPinangSchema,
} from '../games/panjatPinang.js';

export const sesiRouter = Router();

function getNetworkBaseUrl(req: Request): string {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name] || []) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return `http://${iface.address}:${config.port}`;
      }
    }
  }
  return `http://${req.hostname || 'localhost'}:${config.port}`;
}

// 0. GET /api/sesi/token/:token - Publik: Cek validitas token sesi untuk siswa bergabung
sesiRouter.get('/token/:token', async (req: Request, res: Response) => {
  try {
    const token = req.params.token as string;
    if (!token || token.length !== 6) {
      return res.status(400).json({ valid: false, pesan: 'Kode token harus terdiri dari 6 angka.' });
    }

    // 0. Cek di in-memory panjatPinangManager (Game Panjat Pinang)
    const activePanjat = panjatPinangManager.dapatkanSesiDariToken(token);
    if (activePanjat) {
      if (activePanjat.status === 'selesai') {
        return res.status(400).json({ valid: false, pesan: 'Sesi Panjat Pinang ini sudah selesai.' });
      }
      return res.json({
        valid: true,
        sessionId: activePanjat.sessionId,
        templateJudul: activePanjat.templateJudul,
        game: 'panjat_pinang',
        status: activePanjat.status,
        totalPeserta: activePanjat.peserta.size,
        maxPeserta: activePanjat.config.maxPeserta,
        allowLateJoin: activePanjat.config.allowLateJoin,
      });
    }

    // 1. Cek di in-memory kerupukManager (Game Makan Kerupuk Challenge)
    const activeKerupuk = kerupukManager.dapatkanSesiDariToken(token);
    if (activeKerupuk) {
      if (activeKerupuk.status === 'selesai') {
        return res.status(400).json({ valid: false, pesan: 'Sesi permainan Makan Kerupuk ini sudah selesai.' });
      }
      return res.json({
        valid: true,
        sessionId: activeKerupuk.sessionId,
        templateJudul: activeKerupuk.templateJudul,
        game: 'makan_kerupuk',
        status: activeKerupuk.status,
        totalPeserta: activeKerupuk.peserta.size,
        maxPeserta: activeKerupuk.config.maxPeserta,
        allowLateJoin: activeKerupuk.config.allowLateJoin,
      });
    }

    // 2. Cek di in-memory multiManager (Game Tarik Tambang Multiplayer)
    const active = multiManager.dapatkanSesiDariToken(token);
    if (active) {
      if (active.status === 'selesai') {
        return res.status(400).json({ valid: false, pesan: 'Sesi permainan ini sudah selesai.' });
      }
      return res.json({
        valid: true,
        sessionId: active.sessionId,
        templateJudul: active.templateJudul,
        game: 'tarik_tambang',
        status: active.status,
        totalPeserta: active.peserta.size,
      });
    }

    // 3. Cek di database jika belum termuat di memori
    const sessionDb = await prisma.session.findFirst({
      where: { token, status: { in: ['lobi', 'jalan'] } },
      include: {
        template: {
          select: { judul: true, id: true, game: true },
        },
      },
    });

    if (!sessionDb) {
      return res.status(404).json({ valid: false, pesan: 'Kode token tidak ditemukan atau sudah tidak aktif.' });
    }

    return res.json({
      valid: true,
      sessionId: sessionDb.id,
      templateJudul: sessionDb.template.judul,
      game: sessionDb.template.game,
      status: sessionDb.status,
      totalPeserta: 0,
    });
  } catch (err: any) {
    return res.status(500).json({ valid: false, pesan: err.message || 'Gagal memeriksa token.' });
  }
});

// Seluruh rute sesi berikut membutuhkan login sebagai guru
sesiRouter.use(authMiddleware);
sesiRouter.use(roleMiddleware('guru'));

// 1. GET /api/sesi/riwayat - Daftar riwayat sesi milik guru
sesiRouter.get('/riwayat', async (req: AuthRequest, res: Response) => {
  try {
    const sessions = await prisma.session.findMany({
      where: {
        hostId: req.user!.id,
        status: 'selesai',
      },
      orderBy: { selesaiPada: 'desc' },
      include: {
        template: {
          select: {
            id: true,
            judul: true,
            game: true,
            mode: true,
          },
        },
        result: true,
        _count: {
          select: {
            questionStats: true,
          },
        },
      },
    });

    const riwayat = sessions.map((s) => ({
      id: s.id,
      templateId: s.templateId,
      templateJudul: s.template.judul,
      game: s.template.game,
      mode: s.mode.toUpperCase(),
      status: s.status,
      tanggal: s.selesaiPada || s.createdAt,
      timMenang: s.result?.timMenang || 'seri',
      posisiAkhir: s.result?.posisiAkhir ?? 0,
      skorMerah: s.result?.skorMerah ?? 0,
      skorPutih: s.result?.skorPutih ?? 0,
      totalSoal: s._count.questionStats,
    }));

    return res.json({ riwayat });
  } catch (err: any) {
    return res.status(500).json({ pesan: err.message || 'Gagal memuat riwayat permainan.' });
  }
});

// 2. GET /api/sesi/riwayat/:id - Detail spesifik riwayat guru termasuk analisis soal paling sering salah
sesiRouter.get('/riwayat/:id', async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const session = await prisma.session.findUnique({
      where: { id },
      include: {
        template: {
          include: {
            questions: { orderBy: { urutan: 'asc' } },
          },
        },
        result: true,
        questionStats: {
          include: {
            question: true,
          },
        },
      },
    });

    if (!session) {
      return res.status(404).json({ pesan: 'Sesi riwayat tidak ditemukan.' });
    }

    if (session.hostId !== req.user!.id) {
      return res.status(403).json({ pesan: 'Anda tidak dapat melihat riwayat milik guru lain.' });
    }

    // Hitung total benar dan salah dari question stats
    let totalBenar = 0;
    let totalSalah = 0;
    let soalPalingSeringSalah: any = null;
    let maxSalah = -1;

    const statsPerSoal = session.questionStats.map((qs) => {
      totalBenar += qs.jumlahBenar;
      totalSalah += qs.jumlahSalah;

      if (qs.jumlahSalah > maxSalah) {
        maxSalah = qs.jumlahSalah;
        soalPalingSeringSalah = {
          questionId: qs.questionId,
          urutan: qs.question.urutan,
          teks: qs.question.teks,
          jumlahSalah: qs.jumlahSalah,
          jumlahBenar: qs.jumlahBenar,
          penjelasan: qs.question.penjelasan,
        };
      }

      return {
        questionId: qs.questionId,
        urutan: qs.question.urutan,
        teks: qs.question.teks,
        opsiA: qs.question.opsiA,
        opsiB: qs.question.opsiB,
        opsiC: qs.question.opsiC,
        jawabanBenar: qs.question.jawabanBenar,
        penjelasan: qs.question.penjelasan,
        jumlahBenar: qs.jumlahBenar,
        jumlahSalah: qs.jumlahSalah,
      };
    });

    // Jika tidak ada yang salah sama sekali
    if (maxSalah <= 0) {
      soalPalingSeringSalah = null;
    }

    const laporanPanjatPinang =
      session.template.game === 'panjat_pinang'
        ? await panjatPinangManager.muatLaporanDariDatabase(session.id)
        : null;

    return res.json({
      detail: {
        sessionId: session.id,
        templateJudul: session.template.judul,
        game: session.template.game,
        mode: session.mode.toUpperCase(),
        tanggal: session.selesaiPada || session.createdAt,
        timMenang: session.result?.timMenang || 'seri',
        posisiAkhir: session.result?.posisiAkhir ?? 0,
        skorMerah: session.result?.skorMerah ?? 0,
        skorPutih: session.result?.skorPutih ?? 0,
        totalBenar,
        totalSalah,
        totalSoalDimainkan: session.questionStats.length,
        statsPerSoal,
        soalPalingSeringSalah,
        laporanPanjatPinang,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ pesan: err.message || 'Gagal memuat detail riwayat.' });
  }
});

// 3. POST /api/sesi - Buat sesi (Solo, Tarik Tambang Multi, Makan Kerupuk, atau Panjat Pinang)
const buatSesiSchema = z.object({
  templateId: z.string().min(1, 'ID template wajib disertakan.'),
  mode: z.enum(['solo', 'multi']).optional(),
  game: z.enum(['tarik_tambang', 'makan_kerupuk', 'panjat_pinang']).optional(),
  probabilitas: z
    .object({
      besar: z.number(),
      sedang: z.number(),
      kecil: z.number(),
      sangat_kecil: z.number(),
      zonk: z.number(),
    })
    .optional(),
  panjatPinangConfig: konfigurasiPanjatPinangSchema.optional(),
  maxPeserta: z.number().int().min(1).max(200).optional(),
  durasiSoalDetik: z.number().int().min(5).max(120).optional(),
  allowLateJoin: z.boolean().optional(),
});

sesiRouter.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const parsed = buatSesiSchema.parse(req.body);
    const templateId = parsed.templateId;

    const template = await prisma.template.findUnique({
      where: { id: templateId },
      include: {
        questions: { orderBy: { urutan: 'asc' } },
      },
    });

    if (!template) {
      return res.status(404).json({ pesan: 'Template tidak ditemukan.' });
    }

    // Pastikan template memiliki soal
    if (!template.questions || template.questions.length === 0) {
      return res.status(400).json({
        pesan: 'Template ini belum memiliki soal. Silakan tambahkan soal terlebih dahulu.',
      });
    }

    const targetGame = parsed.game || template.game || 'tarik_tambang';

    // -------------------------------------------------------------
    // CABANG 0: Game Panjat Pinang (Individual Multiplayer)
    // -------------------------------------------------------------
    if (targetGame === 'panjat_pinang') {
      const configSnapshot = bangunKonfigurasiPanjatPinang({
        ...(parsed.panjatPinangConfig || {}),
        ...(parsed.maxPeserta ? { maxPeserta: parsed.maxPeserta } : {}),
        ...(parsed.allowLateJoin !== undefined ? { allowLateJoin: parsed.allowLateJoin } : {}),
      });

      const token = panjatPinangManager.generateUniqueToken();
      const baseUrl = getNetworkBaseUrl(req);
      const joinUrl = `${baseUrl}/main?token=${token}`;
      const qrDataUrl = await QRCode.toDataURL(joinUrl, { margin: 2, width: 320 });

      const session = await prisma.session.create({
        data: {
          templateId: template.id,
          hostId: req.user!.id,
          mode: 'multi',
          token,
          status: 'lobi',
          konfigurasi: JSON.stringify(configSnapshot),
        },
      });

      const activeSession = panjatPinangManager.inisialisasiSesi(
        session.id,
        token,
        req.user!.id,
        { id: template.id, judul: template.judul },
        template.questions.map((q) => ({
          id: q.id,
          urutan: q.urutan,
          teks: q.teks,
          opsiA: q.opsiA,
          opsiB: q.opsiB,
          opsiC: q.opsiC,
          jawabanBenar: q.jawabanBenar,
          penjelasan: q.penjelasan,
        })),
        configSnapshot
      );

      return res.status(201).json({
        pesan: 'Sesi Panjat Pinang berhasil dibuat.',
        session: {
          id: session.id,
          game: 'panjat_pinang',
          mode: 'multi',
          token,
          qrDataUrl,
          joinUrl,
          networkUrl: baseUrl,
          templateId: template.id,
          templateJudul: template.judul,
          status: 'lobi',
          totalSoal: activeSession.totalSoal,
          config: activeSession.config,
        },
      });
    }

    // -------------------------------------------------------------
    // CABANG A: Game Makan Kerupuk Challenge
    // -------------------------------------------------------------
    if (targetGame === 'makan_kerupuk') {
      // Validasi probabilitas jika disertakan kustom oleh guru
      let probabilitasConfig = parsed.probabilitas || PRESET_PROBABILITAS.normal;
      const validasi = validasiProbabilitas(probabilitasConfig);
      if (!validasi.valid) {
        return res.status(400).json({
          pesan: validasi.pesanError || 'Total probabilitas harus tepat 100%.',
        });
      }

      const token = kerupukManager.generateUniqueToken();
      const baseUrl = getNetworkBaseUrl(req);
      const joinUrl = `${baseUrl}/main?token=${token}`;
      const qrDataUrl = await QRCode.toDataURL(joinUrl, { margin: 2, width: 320 });

      const session = await prisma.session.create({
        data: {
          templateId: template.id,
          hostId: req.user!.id,
          mode: 'multi',
          token,
          status: 'lobi',
        },
      });

      const activeSession = kerupukManager.inisialisasiSesi(
        session.id,
        token,
        req.user!.id,
        { id: template.id, judul: template.judul },
        template.questions.map((q) => ({
          id: q.id,
          urutan: q.urutan,
          teks: q.teks,
          opsiA: q.opsiA,
          opsiB: q.opsiB,
          opsiC: q.opsiC,
          jawabanBenar: q.jawabanBenar,
          penjelasan: q.penjelasan,
        })),
        {
          probabilitas: probabilitasConfig,
          maxPeserta: parsed.maxPeserta,
          durasiSoalDetik: parsed.durasiSoalDetik,
          allowLateJoin: parsed.allowLateJoin,
        }
      );

      return res.status(201).json({
        pesan: 'Sesi Makan Kerupuk Challenge berhasil dibuat.',
        session: {
          id: session.id,
          game: 'makan_kerupuk',
          mode: 'multi',
          token,
          qrDataUrl,
          joinUrl,
          networkUrl: baseUrl,
          templateId: template.id,
          templateJudul: template.judul,
          status: 'lobi',
          totalSoal: activeSession.totalSoal,
          config: activeSession.config,
        },
      });
    }

    // -------------------------------------------------------------
    // CABANG B: Game Tarik Tambang
    // -------------------------------------------------------------
    const targetMode = parsed.mode || (template.mode === 'multi' ? 'multi' : 'solo');

    if (targetMode === 'multi') {
      const token = multiManager.generateUniqueToken();
      const baseUrl = getNetworkBaseUrl(req);
      const joinUrl = `${baseUrl}/main?token=${token}`;
      const qrDataUrl = await QRCode.toDataURL(joinUrl, { margin: 2, width: 320 });

      const session = await prisma.session.create({
        data: {
          templateId: template.id,
          hostId: req.user!.id,
          mode: 'multi',
          token,
          status: 'lobi',
        },
      });

      const activeSession = multiManager.inisialisasiSesi(
        session.id,
        token,
        req.user!.id,
        { id: template.id, judul: template.judul },
        template.questions.map((q) => ({
          id: q.id,
          urutan: q.urutan,
          teks: q.teks,
          opsiA: q.opsiA,
          opsiB: q.opsiB,
          opsiC: q.opsiC,
          jawabanBenar: q.jawabanBenar,
          penjelasan: q.penjelasan,
        }))
      );

      return res.status(201).json({
        pesan: 'Sesi Multiplayer berhasil dibuat.',
        session: {
          id: session.id,
          game: 'tarik_tambang',
          mode: 'multi',
          token,
          qrDataUrl,
          joinUrl,
          networkUrl: baseUrl,
          templateId: template.id,
          templateJudul: template.judul,
          status: 'lobi',
          totalSoal: activeSession.totalSoal,
        },
      });
    }

    // Default: Mode Solo
    const session = await prisma.session.create({
      data: {
        templateId: template.id,
        hostId: req.user!.id,
        mode: 'solo',
        status: 'lobi',
      },
    });

    // Inisialisasi state sesi solo di memori server
    const activeSession = soloManager.inisialisasiSesi(
      session.id,
      req.user!.id,
      { id: template.id, judul: template.judul },
      template.questions.map((q) => ({
        id: q.id,
        urutan: q.urutan,
        teks: q.teks,
        opsiA: q.opsiA,
        opsiB: q.opsiB,
        opsiC: q.opsiC,
        jawabanBenar: q.jawabanBenar,
        penjelasan: q.penjelasan,
      }))
    );

    return res.status(201).json({
      pesan: 'Sesi Solo berhasil dibuat.',
      session: {
        id: session.id,
        mode: 'solo',
        templateId: template.id,
        templateJudul: template.judul,
        state: activeSession.state,
        totalSoal: activeSession.totalSoal,
      },
    });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ pesan: err.issues[0]?.message || 'Input tidak valid.' });
    }
    return res.status(500).json({ pesan: err.message || 'Gagal membuat sesi permainan.' });
  }
});

// 4. GET /api/sesi/:id - Ambil detail sesi Solo, Tarik Tambang, Makan Kerupuk, atau Panjat Pinang aktif
sesiRouter.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;

    // 0. Cek di in-memory panjatPinangManager atau pulihkan dari DB jika Panjat Pinang
    let activePanjat = panjatPinangManager.dapatkanSesi(id);
    if (!activePanjat) {
      activePanjat = (await panjatPinangManager.pulihkanSesiDariDb(id)) || undefined;
    }
    if (activePanjat) {
      if (activePanjat.hostId !== req.user!.id) {
        return res.status(403).json({ pesan: 'Anda tidak memiliki hak akses ke sesi ini.' });
      }
      const baseUrl = getNetworkBaseUrl(req);
      const joinUrl = `${baseUrl}/main?token=${activePanjat.token}`;
      const qrDataUrl = await QRCode.toDataURL(joinUrl, { margin: 2, width: 320 });
      const leaderboard = panjatPinangManager.dapatkanLeaderboard(activePanjat.sessionId);

      return res.json({
        session: {
          sessionId: activePanjat.sessionId,
          game: 'panjat_pinang',
          mode: 'multi',
          token: activePanjat.token,
          qrDataUrl,
          joinUrl,
          networkUrl: baseUrl,
          templateId: activePanjat.templateId,
          templateJudul: activePanjat.templateJudul,
          status: activePanjat.status,
          totalSoal: activePanjat.totalSoal,
          totalPeserta: activePanjat.peserta.size,
          config: activePanjat.config,
          leaderboard,
          daftarPeserta: leaderboard,
          isFinished: activePanjat.status === 'selesai',
          hasil: activePanjat.hasil || null,
        },
      });
    }

    // A. Cek di in-memory kerupukManager (Game Makan Kerupuk)
    const activeKerupuk = kerupukManager.dapatkanSesi(id);
    if (activeKerupuk) {
      if (activeKerupuk.hostId !== req.user!.id) {
        return res.status(403).json({ pesan: 'Anda tidak memiliki hak akses ke sesi ini.' });
      }
      const baseUrl = getNetworkBaseUrl(req);
      const joinUrl = `${baseUrl}/main?token=${activeKerupuk.token}`;
      const qrDataUrl = await QRCode.toDataURL(joinUrl, { margin: 2, width: 320 });
      const soalAktif = activeKerupuk.questions[activeKerupuk.currentQuestionIndex] || null;

      return res.json({
        session: {
          sessionId: activeKerupuk.sessionId,
          game: 'makan_kerupuk',
          mode: 'multi',
          token: activeKerupuk.token,
          qrDataUrl,
          joinUrl,
          networkUrl: baseUrl,
          templateId: activeKerupuk.templateId,
          templateJudul: activeKerupuk.templateJudul,
          status: activeKerupuk.status,
          currentQuestionIndex: activeKerupuk.currentQuestionIndex,
          totalSoal: activeKerupuk.totalSoal,
          totalPeserta: activeKerupuk.peserta.size,
          config: activeKerupuk.config,
          leaderboard: kerupukManager.dapatkanLeaderboard(activeKerupuk.sessionId),
          daftarPeserta: Array.from(activeKerupuk.peserta.values()).map((p) => ({
            id: p.id,
            nama: p.nama,
            connected: p.connected,
            sisaKerupuk: p.sisaKerupuk,
            skorTotal: p.skorTotal,
            skorPengetahuan: p.skorPengetahuan,
            skorKeberuntungan: p.skorKeberuntungan,
            totalBenar: p.totalBenar,
            totalSalah: p.totalSalah,
            streakBenar: p.streakBenar,
            selesaiKerupuk: p.selesaiKerupuk,
            terakhirGigitan: p.terakhirGigitan,
            rataRataWaktuJawabMs: p.rataRataWaktuJawabMs,
            jumlahJawab: p.jumlahJawab,
          })),
          soalSaatIni: soalAktif
            ? {
                id: soalAktif.id,
                urutan: soalAktif.urutan,
                nomorSoal: activeKerupuk.currentQuestionIndex + 1,
                teks: soalAktif.teks,
                opsiA: soalAktif.opsiA,
                opsiB: soalAktif.opsiB,
                opsiC: soalAktif.opsiC,
                endsAt: activeKerupuk.soalBerakhirPada,
              }
            : null,
          isFinished: activeKerupuk.status === 'selesai',
          hasil: activeKerupuk.hasil,
        },
      });
    }

    // B. Cek di in-memory multiManager
    const activeMulti = multiManager.dapatkanSesi(id);
    if (activeMulti) {
      if (activeMulti.hostId !== req.user!.id) {
        return res.status(403).json({ pesan: 'Anda tidak memiliki hak akses ke sesi ini.' });
      }
      const baseUrl = getNetworkBaseUrl(req);
      const joinUrl = `${baseUrl}/main?token=${activeMulti.token}`;
      const qrDataUrl = await QRCode.toDataURL(joinUrl, { margin: 2, width: 320 });
      const soalAktif = activeMulti.questions[activeMulti.currentQuestionIndex] || null;

      return res.json({
        session: {
          sessionId: activeMulti.sessionId,
          mode: 'multi',
          token: activeMulti.token,
          qrDataUrl,
          joinUrl,
          networkUrl: baseUrl,
          templateId: activeMulti.templateId,
          templateJudul: activeMulti.templateJudul,
          status: activeMulti.status,
          currentQuestionIndex: activeMulti.currentQuestionIndex,
          totalSoal: activeMulti.totalSoal,
          taliPosition: activeMulti.taliPosition,
          skorMerah: activeMulti.skorMerah,
          skorPutih: activeMulti.skorPutih,
          totalPeserta: activeMulti.peserta.size,
          daftarPeserta: Array.from(activeMulti.peserta.values()).map((p) => ({
            id: p.id,
            nama: p.nama,
            tim: p.tim,
            connected: p.connected,
          })),
          soalSaatIni: soalAktif
            ? {
                id: soalAktif.id,
                urutan: soalAktif.urutan,
                nomorSoal: activeMulti.currentQuestionIndex + 1,
                teks: soalAktif.teks,
                opsiA: soalAktif.opsiA,
                opsiB: soalAktif.opsiB,
                opsiC: soalAktif.opsiC,
                endsAt: activeMulti.soalBerakhirPada,
              }
            : null,
          isFinished: activeMulti.status === 'selesai',
        },
      });
    }

    // B. Cek di in-memory active solo manager
    let activeSession = soloManager.dapatkanSesi(id, req.user!.id);

    // C. Jika belum ada di memori (misal guru me-refresh browser), pulihkan dari database
    if (!activeSession) {
      const sessionDb = await prisma.session.findUnique({
        where: { id },
        include: {
          template: {
            include: { questions: { orderBy: { urutan: 'asc' } } },
          },
          result: true,
        },
      });

      if (!sessionDb) {
        return res.status(404).json({ pesan: 'Sesi permainan tidak ditemukan.' });
      }

      if (sessionDb.hostId !== req.user!.id) {
        return res.status(403).json({ pesan: 'Anda tidak memiliki hak akses ke sesi ini.' });
      }

      // Jika sesi multiplayer
      if (sessionDb.mode === 'multi') {
        const token = sessionDb.token || multiManager.generateUniqueToken();
        const baseUrl = getNetworkBaseUrl(req);
        const joinUrl = `${baseUrl}/main?token=${token}`;
        const qrDataUrl = await QRCode.toDataURL(joinUrl, { margin: 2, width: 320 });

        if (sessionDb.status === 'selesai') {
          return res.json({
            session: {
              sessionId: sessionDb.id,
              mode: 'multi',
              token,
              qrDataUrl,
              joinUrl,
              networkUrl: baseUrl,
              templateId: sessionDb.templateId,
              templateJudul: sessionDb.template.judul,
              hostId: sessionDb.hostId,
              status: 'selesai',
              taliPosition: sessionDb.result?.posisiAkhir ?? 0,
              skorMerah: sessionDb.result?.skorMerah ?? 0,
              skorPutih: sessionDb.result?.skorPutih ?? 0,
              totalSoal: sessionDb.template.questions.length,
              totalPeserta: 0,
              daftarPeserta: [],
              isFinished: true,
            },
          });
        }

        const multi = multiManager.inisialisasiSesi(
          sessionDb.id,
          token,
          sessionDb.hostId,
          { id: sessionDb.template.id, judul: sessionDb.template.judul },
          sessionDb.template.questions.map((q) => ({
            id: q.id,
            urutan: q.urutan,
            teks: q.teks,
            opsiA: q.opsiA,
            opsiB: q.opsiB,
            opsiC: q.opsiC,
            jawabanBenar: q.jawabanBenar,
            penjelasan: q.penjelasan,
          }))
        );

        const soalAktif = multi.questions[multi.currentQuestionIndex] || null;

        return res.json({
          session: {
            sessionId: multi.sessionId,
            mode: 'multi',
            token: multi.token,
            qrDataUrl,
            joinUrl,
            networkUrl: baseUrl,
            templateId: multi.templateId,
            templateJudul: multi.templateJudul,
            status: multi.status,
            currentQuestionIndex: multi.currentQuestionIndex,
            totalSoal: multi.totalSoal,
            taliPosition: multi.taliPosition,
            skorMerah: multi.skorMerah,
            skorPutih: multi.skorPutih,
            totalPeserta: multi.peserta.size,
            daftarPeserta: [],
            soalSaatIni: soalAktif
              ? {
                  id: soalAktif.id,
                  questionId: soalAktif.id,
                  urutan: soalAktif.urutan,
                  nomorSoal: multi.currentQuestionIndex + 1,
                  teks: soalAktif.teks,
                  opsiA: soalAktif.opsiA,
                  opsiB: soalAktif.opsiB,
                  opsiC: soalAktif.opsiC,
                }
              : null,
            isFinished: false,
          },
        });
      }

      // Jika sesi sudah selesai di database (Solo)
      if (sessionDb.status === 'selesai') {
        return res.json({
          session: {
            sessionId: sessionDb.id,
            mode: 'solo',
            templateId: sessionDb.templateId,
            templateJudul: sessionDb.template.judul,
            hostId: sessionDb.hostId,
            state: 'FINISHED',
            taliPosition: sessionDb.result?.posisiAkhir ?? 0,
            skorMerah: sessionDb.result?.skorMerah ?? 0,
            skorPutih: sessionDb.result?.skorPutih ?? 0,
            totalSoal: sessionDb.template.questions.length,
            isFinished: true,
          },
        });
      }

      // Inisialisasi ulang ke memori jika sesi masih aktif (Solo)
      activeSession = soloManager.inisialisasiSesi(
        sessionDb.id,
        req.user!.id,
        { id: sessionDb.template.id, judul: sessionDb.template.judul },
        sessionDb.template.questions.map((q) => ({
          id: q.id,
          urutan: q.urutan,
          teks: q.teks,
          opsiA: q.opsiA,
          opsiB: q.opsiB,
          opsiC: q.opsiC,
          jawabanBenar: q.jawabanBenar,
          penjelasan: q.penjelasan,
        }))
      );
    }

    // Format data untuk host screen (Solo)
    const soalSaatIni = activeSession.questions[activeSession.currentQuestionIndex] || null;

    return res.json({
      session: {
        sessionId: activeSession.sessionId,
        mode: 'solo',
        templateId: activeSession.templateId,
        templateJudul: activeSession.templateJudul,
        state: activeSession.state,
        currentQuestionIndex: activeSession.currentQuestionIndex,
        totalSoal: activeSession.totalSoal,
        currentTurn: activeSession.currentTurn,
        taliPosition: activeSession.taliPosition,
        skorMerah: activeSession.skorMerah,
        skorPutih: activeSession.skorPutih,
        soalSaatIni: soalSaatIni
          ? {
              id: soalSaatIni.id,
              urutan: soalSaatIni.urutan,
              nomorSoal: activeSession.currentQuestionIndex + 1,
              teks: soalSaatIni.teks,
              opsiA: soalSaatIni.opsiA,
              opsiB: soalSaatIni.opsiB,
              opsiC: soalSaatIni.opsiC,
              // JANGAN kirim jawabanBenar ke frontend sebelum dijawab!
            }
          : null,
        logJawaban: activeSession.logJawaban,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ pesan: err.message || 'Gagal memuat detail sesi.' });
  }
});

// 5. POST /api/sesi/:id/mulai - Mulai permainan Solo
sesiRouter.post('/:id/mulai', async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    let activeSession = soloManager.dapatkanSesi(id, req.user!.id);

    if (!activeSession) {
      // Coba pulihkan dari DB
      const sessionDb = await prisma.session.findUnique({
        where: { id },
        include: {
          template: { include: { questions: { orderBy: { urutan: 'asc' } } } },
        },
      });

      if (!sessionDb || sessionDb.hostId !== req.user!.id) {
        return res.status(404).json({ pesan: 'Sesi permainan tidak ditemukan.' });
      }

      activeSession = soloManager.inisialisasiSesi(
        sessionDb.id,
        req.user!.id,
        { id: sessionDb.template.id, judul: sessionDb.template.judul },
        sessionDb.template.questions.map((q) => ({
          id: q.id,
          urutan: q.urutan,
          teks: q.teks,
          opsiA: q.opsiA,
          opsiB: q.opsiB,
          opsiC: q.opsiC,
          jawabanBenar: q.jawabanBenar,
          penjelasan: q.penjelasan,
        }))
      );
    }

    const sesi = soloManager.mulaiSesi(id, req.user!.id);

    // Update status di DB menjadi 'jalan'
    await prisma.session.update({
      where: { id },
      data: {
        status: 'jalan',
        mulaiPada: new Date(),
      },
    });

    const soalAktif = sesi.questions[sesi.currentQuestionIndex];

    return res.json({
      pesan: 'Permainan Solo dimulai.',
      session: {
        sessionId: sesi.sessionId,
        state: sesi.state,
        currentTurn: sesi.currentTurn,
        taliPosition: sesi.taliPosition,
        currentQuestionIndex: sesi.currentQuestionIndex,
        totalSoal: sesi.totalSoal,
        soalSaatIni: {
          id: soalAktif.id,
          urutan: soalAktif.urutan,
          nomorSoal: 1,
          teks: soalAktif.teks,
          opsiA: soalAktif.opsiA,
          opsiB: soalAktif.opsiB,
          opsiC: soalAktif.opsiC,
        },
      },
    });
  } catch (err: any) {
    return res.status(400).json({ pesan: err.message || 'Gagal memulai permainan.' });
  }
});

// 6. POST /api/sesi/:id/state - Pause / Resume permainan
const stateSchema = z.object({
  state: z.enum(['PLAYING', 'PAUSED']),
});

sesiRouter.post('/:id/state', async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const { state } = stateSchema.parse(req.body);

    const sesi = soloManager.ubahStateSesi(id, req.user!.id, state);

    return res.json({
      pesan: `Permainan berhasil di-${state === 'PAUSED' ? 'jeda' : 'lanjutkan'}.`,
      state: sesi.state,
    });
  } catch (err: any) {
    return res.status(400).json({ pesan: err.message || 'Gagal mengubah status permainan.' });
  }
});

// 7. POST /api/sesi/:id/jawab - Kirim jawaban dari tim yang sedang giliran
const jawabSchema = z.object({
  questionId: z.string().min(1),
  tim: z.enum(['merah', 'putih']),
  jawabanDipilih: z.enum(['A', 'B', 'C', 'a', 'b', 'c']),
});

sesiRouter.post('/:id/jawab', async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const input = jawabSchema.parse(req.body);

    const hasilProses = soloManager.prosesJawaban(id, req.user!.id, {
      questionId: input.questionId,
      tim: input.tim,
      jawabanDipilih: input.jawabanDipilih.toUpperCase(),
    });

    const { sesi, benar, jawabanBenar, penjelasan, selesai } = hasilProses;

    // Jika permainan otomatis selesai karena tali mencapai batas atau soal habis
    if (selesai) {
      await simpanHasilSesiKeDatabase(sesi);
    }

    const soalBerikutnya =
      !selesai && sesi.currentQuestionIndex < sesi.totalSoal
        ? sesi.questions[sesi.currentQuestionIndex]
        : null;

    return res.json({
      benar,
      jawabanBenar,
      penjelasan,
      taliPosition: sesi.taliPosition,
      skorMerah: sesi.skorMerah,
      skorPutih: sesi.skorPutih,
      nextTurn: sesi.currentTurn,
      nextQuestionIndex: sesi.currentQuestionIndex,
      isFinished: selesai,
      winner: sesi.hasil?.timMenang || null,
      soalBerikutnya: soalBerikutnya
        ? {
            id: soalBerikutnya.id,
            urutan: soalBerikutnya.urutan,
            nomorSoal: sesi.currentQuestionIndex + 1,
            teks: soalBerikutnya.teks,
            opsiA: soalBerikutnya.opsiA,
            opsiB: soalBerikutnya.opsiB,
            opsiC: soalBerikutnya.opsiC,
          }
        : null,
    });
  } catch (err: any) {
    return res.status(400).json({ pesan: err.message || 'Gagal memproses jawaban.' });
  }
});

// 8. POST /api/sesi/:id/selesai - Akhiri permainan secara manual oleh guru
sesiRouter.post('/:id/selesai', async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const sesi = soloManager.selesaikanSesi(id, req.user!.id);

    await simpanHasilSesiKeDatabase(sesi);

    return res.json({
      pesan: 'Permainan berhasil diakhiri.',
      hasil: sesi.hasil,
    });
  } catch (err: any) {
    return res.status(400).json({ pesan: err.message || 'Gagal mengakhiri permainan.' });
  }
});

// 9. GET /api/sesi/:id/hasil - Ambil hasil permainan Solo, Makan Kerupuk, atau Panjat Pinang
sesiRouter.get('/:id/hasil', async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;

    // 0. Cek Panjat Pinang (memori atau database)
    const activePanjat = panjatPinangManager.dapatkanSesi(id);
    if (activePanjat) {
      if (activePanjat.hostId !== req.user!.id) {
        return res.status(403).json({ pesan: 'Anda tidak memiliki hak akses ke sesi ini.' });
      }
      const laporan =
        activePanjat.hasil || panjatPinangManager.dapatkanLaporanSementara(activePanjat.sessionId);
      if (laporan) {
        return res.json({
          hasil: {
            ...laporan,
            game: 'panjat_pinang',
          },
        });
      }
    }

    // A. Cek di memori kerupukManager
    const activeKerupuk = kerupukManager.dapatkanSesi(id);
    if (activeKerupuk && activeKerupuk.hasil) {
      return res.json({
        hasil: {
          sessionId: activeKerupuk.sessionId,
          game: 'makan_kerupuk',
          templateJudul: activeKerupuk.templateJudul,
          templateId: activeKerupuk.templateId,
          totalSoal: activeKerupuk.totalSoal,
          totalPeserta: activeKerupuk.hasil.totalPeserta,
          totalBenar: activeKerupuk.hasil.totalJawabanBenar,
          totalSalah: activeKerupuk.hasil.totalJawabanSalah,
          totalKerupukHabis: activeKerupuk.hasil.totalKerupukHabis,
          podium: activeKerupuk.hasil.podium,
          leaderboard: activeKerupuk.hasil.leaderboard,
        },
      });
    }

    // B. Cek di memori soloManager
    const activeSession = soloManager.dapatkanSesi(id, req.user!.id);
    if (activeSession && activeSession.state === 'FINISHED' && activeSession.hasil) {
      return res.json({
        hasil: {
          sessionId: activeSession.sessionId,
          templateJudul: activeSession.templateJudul,
          templateId: activeSession.templateId,
          timMenang: activeSession.hasil.timMenang,
          posisiAkhir: activeSession.hasil.posisiAkhir,
          skorMerah: activeSession.hasil.skorMerah,
          skorPutih: activeSession.hasil.skorPutih,
          totalSoal: activeSession.totalSoal,
          totalBenar: activeSession.hasil.totalBenar,
          totalSalah: activeSession.hasil.totalSalah,
          logJawaban: activeSession.logJawaban,
        },
      });
    }

    // Ambil dari database jika di memori sudah tidak ada
    const sessionDb = await prisma.session.findUnique({
      where: { id },
      include: {
        template: {
          include: { questions: { orderBy: { urutan: 'asc' } } },
        },
        result: true,
        questionStats: {
          include: { question: true },
        },
      },
    });

    if (!sessionDb) {
      return res.status(404).json({ pesan: 'Sesi permainan tidak ditemukan.' });
    }

    if (sessionDb.hostId !== req.user!.id) {
      return res.status(403).json({ pesan: 'Anda tidak memiliki hak akses ke sesi ini.' });
    }

    if (sessionDb.status !== 'selesai' || !sessionDb.result) {
      return res.status(400).json({ pesan: 'Sesi ini belum memiliki hasil akhir.' });
    }

    if (sessionDb.template.game === 'panjat_pinang') {
      const laporanDb = await panjatPinangManager.muatLaporanDariDatabase(sessionDb.id);
      if (laporanDb) {
        return res.json({
          hasil: {
            ...laporanDb,
            game: 'panjat_pinang',
            questionStats: sessionDb.questionStats.map((qs) => ({
              questionId: qs.questionId,
              nomorSoal: qs.question.urutan,
              teksSoal: qs.question.teks,
              jumlahBenar: qs.jumlahBenar,
              jumlahSalah: qs.jumlahSalah,
            })),
          },
        });
      }
    }

    const totalBenar = sessionDb.questionStats.reduce((acc, q) => acc + q.jumlahBenar, 0);
    const totalSalah = sessionDb.questionStats.reduce((acc, q) => acc + q.jumlahSalah, 0);

    return res.json({
      hasil: {
        sessionId: sessionDb.id,
        templateJudul: sessionDb.template.judul,
        templateId: sessionDb.templateId,
        timMenang: sessionDb.result.timMenang,
        posisiAkhir: sessionDb.result.posisiAkhir,
        skorMerah: sessionDb.result.skorMerah,
        skorPutih: sessionDb.result.skorPutih,
        totalSoal: sessionDb.template.questions.length,
        totalBenar,
        totalSalah,
        questionStats: sessionDb.questionStats.map((qs) => ({
          nomorSoal: qs.question.urutan,
          teksSoal: qs.question.teks,
          benar: qs.jumlahBenar > 0,
        })),
      },
    });
  } catch (err: any) {
    return res.status(500).json({ pesan: err.message || 'Gagal memuat hasil permainan.' });
  }
});

// 10. POST /api/sesi/:id/main-lagi - Buat sesi baru dari template yang sama
sesiRouter.post('/:id/main-lagi', async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const sessionLama = await prisma.session.findUnique({
      where: { id },
      include: {
        template: {
          include: { questions: { orderBy: { urutan: 'asc' } } },
        },
      },
    });

    if (!sessionLama) {
      return res.status(404).json({ pesan: 'Sesi lama tidak ditemukan.' });
    }

    if (sessionLama.hostId !== req.user!.id) {
      return res.status(403).json({ pesan: 'Anda tidak berwenang atas sesi ini.' });
    }

    // Buat sesi baru sesuai game & mode sesi sebelumnya
    if (sessionLama.template.game === 'panjat_pinang') {
      let configSebelumnya: any;
      if (sessionLama.konfigurasi) {
        try {
          configSebelumnya = JSON.parse(sessionLama.konfigurasi);
        } catch {
          configSebelumnya = undefined;
        }
      }
      const configSnapshot = bangunKonfigurasiPanjatPinang(configSebelumnya);
      const token = panjatPinangManager.generateUniqueToken();
      const baseUrl = getNetworkBaseUrl(req);
      const joinUrl = `${baseUrl}/main?token=${token}`;
      const qrDataUrl = await QRCode.toDataURL(joinUrl, { margin: 2, width: 320 });

      const sessionBaru = await prisma.session.create({
        data: {
          templateId: sessionLama.templateId,
          hostId: req.user!.id,
          mode: 'multi',
          token,
          status: 'lobi',
          konfigurasi: JSON.stringify(configSnapshot),
        },
      });

      panjatPinangManager.inisialisasiSesi(
        sessionBaru.id,
        token,
        req.user!.id,
        { id: sessionLama.template.id, judul: sessionLama.template.judul },
        sessionLama.template.questions.map((q) => ({
          id: q.id,
          urutan: q.urutan,
          teks: q.teks,
          opsiA: q.opsiA,
          opsiB: q.opsiB,
          opsiC: q.opsiC,
          jawabanBenar: q.jawabanBenar,
          penjelasan: q.penjelasan,
        })),
        configSnapshot
      );

      return res.status(201).json({
        pesan: 'Sesi Panjat Pinang baru berhasil dibuat.',
        sessionId: sessionBaru.id,
        game: 'panjat_pinang',
        token,
        qrDataUrl,
        joinUrl,
      });
    }

    if (sessionLama.mode === 'multi') {
      const token = multiManager.generateUniqueToken();
      const baseUrl = getNetworkBaseUrl(req);
      const joinUrl = `${baseUrl}/main?token=${token}`;
      const qrDataUrl = await QRCode.toDataURL(joinUrl, { margin: 2, width: 320 });

      const sessionBaru = await prisma.session.create({
        data: {
          templateId: sessionLama.templateId,
          hostId: req.user!.id,
          mode: 'multi',
          token,
          status: 'lobi',
        },
      });

      multiManager.inisialisasiSesi(
        sessionBaru.id,
        token,
        req.user!.id,
        { id: sessionLama.template.id, judul: sessionLama.template.judul },
        sessionLama.template.questions.map((q) => ({
          id: q.id,
          urutan: q.urutan,
          teks: q.teks,
          opsiA: q.opsiA,
          opsiB: q.opsiB,
          opsiC: q.opsiC,
          jawabanBenar: q.jawabanBenar,
          penjelasan: q.penjelasan,
        }))
      );

      return res.status(201).json({
        pesan: 'Sesi Multiplayer baru berhasil dibuat.',
        sessionId: sessionBaru.id,
        token,
        qrDataUrl,
        joinUrl,
      });
    }

    // Default: Mode Solo
    const sessionBaru = await prisma.session.create({
      data: {
        templateId: sessionLama.templateId,
        hostId: req.user!.id,
        mode: 'solo',
        status: 'lobi',
      },
    });

    // Inisialisasi state bersih di memori
    soloManager.inisialisasiSesi(
      sessionBaru.id,
      req.user!.id,
      { id: sessionLama.template.id, judul: sessionLama.template.judul },
      sessionLama.template.questions.map((q) => ({
        id: q.id,
        urutan: q.urutan,
        teks: q.teks,
        opsiA: q.opsiA,
        opsiB: q.opsiB,
        opsiC: q.opsiC,
        jawabanBenar: q.jawabanBenar,
        penjelasan: q.penjelasan,
      }))
    );

    return res.status(201).json({
      pesan: 'Sesi baru berhasil dibuat.',
      sessionId: sessionBaru.id,
    });
  } catch (err: any) {
    return res.status(500).json({ pesan: err.message || 'Gagal membuat sesi main lagi.' });
  }
});

// 11. DELETE /api/sesi/:id - Hapus sesi permainan milik guru atau admin
sesiRouter.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const session = await prisma.session.findUnique({
      where: { id },
    });

    if (!session) {
      return res.status(404).json({ pesan: 'Sesi tidak ditemukan.' });
    }

    if (session.hostId !== req.user!.id && req.user!.role !== 'admin') {
      return res.status(403).json({ pesan: 'Anda tidak berwenang menghapus sesi ini.' });
    }

    await prisma.session.delete({
      where: { id },
    });

    return res.json({ pesan: 'Sesi berhasil dihapus.' });
  } catch (err: any) {
    return res.status(500).json({ pesan: err.message || 'Gagal menghapus sesi.' });
  }
});

/**
 * Fungsi utilitas untuk menyimpan hasil permainan ke database menggunakan transaksi Prisma
 */
async function simpanHasilSesiKeDatabase(sesi: any) {
  if (!sesi.hasil) return;

  await prisma.$transaction(async (tx) => {
    // 1. Update status sesi
    await tx.session.update({
      where: { id: sesi.sessionId },
      data: {
        status: 'selesai',
        selesaiPada: new Date(),
      },
    });

    // 2. Simpan atau perbarui SessionResult
    await tx.sessionResult.upsert({
      where: { sessionId: sesi.sessionId },
      update: {
        timMenang: sesi.hasil.timMenang,
        posisiAkhir: sesi.hasil.posisiAkhir,
        skorMerah: sesi.hasil.skorMerah,
        skorPutih: sesi.hasil.skorPutih,
      },
      create: {
        sessionId: sesi.sessionId,
        timMenang: sesi.hasil.timMenang,
        posisiAkhir: sesi.hasil.posisiAkhir,
        skorMerah: sesi.hasil.skorMerah,
        skorPutih: sesi.hasil.skorPutih,
      },
    });

    // 3. Simpan question_stats per soal
    // Hitung aggregat dari logJawaban
    const statMap = new Map<string, { jumlahBenar: number; jumlahSalah: number }>();

    for (const log of sesi.logJawaban) {
      const existing = statMap.get(log.questionId) || { jumlahBenar: 0, jumlahSalah: 0 };
      if (log.benar) {
        existing.jumlahBenar += 1;
      } else {
        existing.jumlahSalah += 1;
      }
      statMap.set(log.questionId, existing);
    }

    // Hapus stat lama jika ada (idempotent)
    await tx.questionStat.deleteMany({
      where: { sessionId: sesi.sessionId },
    });

    for (const [questionId, stat] of statMap.entries()) {
      await tx.questionStat.create({
        data: {
          sessionId: sesi.sessionId,
          questionId,
          jumlahBenar: stat.jumlahBenar,
          jumlahSalah: stat.jumlahSalah,
        },
      });
    }
  });
}
