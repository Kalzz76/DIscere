import { Router, Response } from 'express';
import { z } from 'zod';
import crypto from 'crypto';
import os from 'os';
import { prisma } from '../db.js';
import { config } from '../config.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import { roleMiddleware } from '../middleware/role.js';

export const papanRouter = Router();

function getNetworkBaseUrl(req: any): string {
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

// ============================================================================
// 1. RUTE PUBLIK: Validasi Token Berbagi Papan (Viewer / Editor)
// ============================================================================

// GET /api/papan/share/:token - Ambil informasi papan via token berbagi tanpa login
papanRouter.get('/share/:token', async (req, res: Response) => {
  try {
    const token = req.params.token as string;
    if (!token) {
      return res.status(400).json({ pesan: 'Token berbagi wajib disertakan.' });
    }

    const share = await prisma.boardShare.findUnique({
      where: { token },
      include: {
        board: {
          select: {
            id: true,
            judul: true,
            data: true,
            ownerId: true,
            updatedAt: true,
            owner: { select: { nama: true, sekolah: true } },
          },
        },
      },
    });

    if (!share || !share.aktif) {
      return res.status(404).json({
        pesan: 'Tautan berbagi tidak ditemukan atau akses telah dicabut oleh pemilik papan.',
      });
    }

    return res.json({
      share: {
        id: share.id,
        token: share.token,
        peran: share.peran, // 'viewer' | 'editor'
        boardId: share.boardId,
        judul: share.board.judul,
        data: share.board.data,
        pemilik: share.board.owner.nama,
        updatedAt: share.board.updatedAt,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ pesan: err.message || 'Gagal memvalidasi token berbagi.' });
  }
});

// PUT /api/papan/share/:token - Simpan perubahan kanvas oleh Editor via token berbagi
const simpanShareSchema = z.object({
  data: z.string().min(1, 'Data kanvas tidak boleh kosong.'),
});

papanRouter.put('/share/:token', async (req, res: Response) => {
  try {
    const token = req.params.token as string;
    const { data } = simpanShareSchema.parse(req.body);

    const share = await prisma.boardShare.findUnique({
      where: { token },
    });

    if (!share || !share.aktif) {
      return res.status(403).json({
        pesan: 'Akses ditolak: Tautan berbagi tidak valid atau telah dicabut.',
      });
    }

    // Pastikan hak akses adalah editor
    if (share.peran !== 'editor') {
      return res.status(403).json({
        pesan: 'Akses ditolak: Peran Anda hanya Viewer dan tidak diizinkan menyimpan perubahan.',
      });
    }

    const updatedBoard = await prisma.board.update({
      where: { id: share.boardId },
      data: {
        data,
        updatedAt: new Date(),
      },
      select: {
        id: true,
        judul: true,
        updatedAt: true,
      },
    });

    return res.json({
      pesan: 'Perubahan papan berhasil disimpan.',
      board: updatedBoard,
    });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ pesan: err.issues[0]?.message || 'Input tidak valid.' });
    }
    return res.status(500).json({ pesan: err.message || 'Gagal menyimpan data papan.' });
  }
});

// ============================================================================
// 2. RUTE TERLINDUNGI GURU: Kelola Papan Tulis Milik Guru
// ============================================================================
papanRouter.use(authMiddleware);
papanRouter.use(roleMiddleware('guru'));

// GET /api/papan - Daftar papan tulis milik guru
papanRouter.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const boards = await prisma.board.findMany({
      where: { ownerId: req.user!.id },
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        judul: true,
        updatedAt: true,
        createdAt: true,
        _count: {
          select: {
            shares: { where: { aktif: true } },
          },
        },
      },
    });

    return res.json({ boards });
  } catch (err: any) {
    return res.status(500).json({ pesan: err.message || 'Gagal memuat daftar papan tulis.' });
  }
});

// POST /api/papan - Buat papan tulis baru
const buatPapanSchema = z.object({
  judul: z.string().trim().min(1, 'Judul papan wajib diisi.').optional(),
});

papanRouter.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const parsed = buatPapanSchema.parse(req.body || {});
    const judul = parsed.judul || 'Papan Pembelajaran Baru';

    // Inisialisasi kanvas kosong dalam format JSON Fabric standar
    const defaultData = JSON.stringify({
      version: '7.4.0',
      objects: [],
      background: '#ffffff',
    });

    const board = await prisma.board.create({
      data: {
        ownerId: req.user!.id,
        judul,
        data: defaultData,
      },
    });

    return res.status(201).json({
      pesan: 'Papan tulis baru berhasil dibuat.',
      board: {
        id: board.id,
        judul: board.judul,
        data: board.data,
        updatedAt: board.updatedAt,
      },
    });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ pesan: err.issues[0]?.message || 'Input tidak valid.' });
    }
    return res.status(500).json({ pesan: err.message || 'Gagal membuat papan tulis.' });
  }
});

// GET /api/papan/:id - Ambil detail papan tulis
papanRouter.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const board = await prisma.board.findUnique({
      where: { id },
      include: {
        owner: { select: { id: true, nama: true } },
        shares: {
          where: { aktif: true },
          select: { id: true, token: true, peran: true, createdAt: true },
        },
      },
    });

    if (!board) {
      return res.status(404).json({ pesan: 'Papan tulis tidak ditemukan.' });
    }

    // Pastikan hanya pemilik yang bisa mengakses via rute guru terlindungi
    if (board.ownerId !== req.user!.id) {
      return res.status(403).json({ pesan: 'Anda tidak memiliki hak akses ke papan ini.' });
    }

    const baseUrl = getNetworkBaseUrl(req);
    const sharesWithUrl = board.shares.map((s) => ({
      ...s,
      joinUrl: `${baseUrl}/b/${s.token}`,
    }));

    return res.json({
      board: {
        id: board.id,
        judul: board.judul,
        data: board.data,
        ownerId: board.ownerId,
        ownerName: board.owner.nama,
        updatedAt: board.updatedAt,
        shares: sharesWithUrl,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ pesan: err.message || 'Gagal memuat papan tulis.' });
  }
});

// PUT /api/papan/:id - Autosave data kanvas oleh pemilik
const autosaveSchema = z.object({
  data: z.string().min(1, 'Data kanvas tidak boleh kosong.'),
  judul: z.string().trim().min(1).optional(),
});

papanRouter.put('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const { data, judul } = autosaveSchema.parse(req.body);

    const board = await prisma.board.findUnique({
      where: { id },
      select: { ownerId: true },
    });

    if (!board) {
      return res.status(404).json({ pesan: 'Papan tulis tidak ditemukan.' });
    }

    if (board.ownerId !== req.user!.id) {
      return res.status(403).json({ pesan: 'Anda tidak memiliki hak akses mengubah papan ini.' });
    }

    const updated = await prisma.board.update({
      where: { id },
      data: {
        data,
        ...(judul ? { judul } : {}),
        updatedAt: new Date(),
      },
      select: {
        id: true,
        judul: true,
        updatedAt: true,
      },
    });

    return res.json({
      pesan: 'Papan tulis berhasil disimpan.',
      board: updated,
    });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ pesan: err.issues[0]?.message || 'Input tidak valid.' });
    }
    return res.status(500).json({ pesan: err.message || 'Gagal menyimpan perubahan papan.' });
  }
});

// PATCH /api/papan/:id/judul - Ganti judul papan tulis
const gantiJudulSchema = z.object({
  judul: z.string().trim().min(1, 'Judul papan tidak boleh kosong.'),
});

papanRouter.patch('/:id/judul', async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const { judul } = gantiJudulSchema.parse(req.body);

    const board = await prisma.board.findUnique({
      where: { id },
      select: { ownerId: true },
    });

    if (!board) {
      return res.status(404).json({ pesan: 'Papan tulis tidak ditemukan.' });
    }

    if (board.ownerId !== req.user!.id) {
      return res.status(403).json({ pesan: 'Anda tidak berwenang mengubah judul papan ini.' });
    }

    const updated = await prisma.board.update({
      where: { id },
      data: { judul, updatedAt: new Date() },
      select: { id: true, judul: true, updatedAt: true },
    });

    return res.json({
      pesan: 'Judul papan tulis berhasil diperbarui.',
      board: updated,
    });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ pesan: err.issues[0]?.message || 'Input tidak valid.' });
    }
    return res.status(500).json({ pesan: err.message || 'Gagal mengubah judul papan.' });
  }
});

// DELETE /api/papan/:id - Hapus papan tulis
papanRouter.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;

    const board = await prisma.board.findUnique({
      where: { id },
      select: { ownerId: true },
    });

    if (!board) {
      return res.status(404).json({ pesan: 'Papan tulis tidak ditemukan.' });
    }

    if (board.ownerId !== req.user!.id) {
      return res.status(403).json({ pesan: 'Anda tidak berwenang menghapus papan ini.' });
    }

    await prisma.board.delete({
      where: { id },
    });

    return res.json({ pesan: 'Papan tulis berhasil dihapus.' });
  } catch (err: any) {
    return res.status(500).json({ pesan: err.message || 'Gagal menghapus papan tulis.' });
  }
});

// POST /api/papan/:id/bagikan - Buat atau dapatkan tautan berbagi (Viewer / Editor)
const bagikanSchema = z.object({
  peran: z.enum(['viewer', 'editor'], {
    message: "Peran harus berupa 'viewer' atau 'editor'.",
  }),
});

papanRouter.post('/:id/bagikan', async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const { peran } = bagikanSchema.parse(req.body);

    const board = await prisma.board.findUnique({
      where: { id },
      select: { ownerId: true },
    });

    if (!board) {
      return res.status(404).json({ pesan: 'Papan tulis tidak ditemukan.' });
    }

    if (board.ownerId !== req.user!.id) {
      return res.status(403).json({ pesan: 'Anda tidak berwenang membagikan papan ini.' });
    }

    // Cek apakah sudah ada token aktif untuk peran ini
    let share = await prisma.boardShare.findFirst({
      where: { boardId: id, peran, aktif: true },
    });

    if (!share) {
      // Buat token acak yang aman (16 bytes hex)
      const token = crypto.randomBytes(12).toString('hex');
      share = await prisma.boardShare.create({
        data: {
          boardId: id,
          token,
          peran,
          aktif: true,
        },
      });
    }

    const baseUrl = getNetworkBaseUrl(req);
    const joinUrl = `${baseUrl}/b/${share.token}`;

    return res.status(201).json({
      pesan: `Tautan ${peran === 'editor' ? 'Editor' : 'Viewer'} siap dibagikan.`,
      share: {
        id: share.id,
        token: share.token,
        peran: share.peran,
        joinUrl,
        networkUrl: baseUrl,
        aktif: share.aktif,
      },
    });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ pesan: err.issues[0]?.message || 'Input tidak valid.' });
    }
    return res.status(500).json({ pesan: err.message || 'Gagal membuat tautan berbagi.' });
  }
});

// DELETE /api/papan/:id/bagikan/:shareId - Cabut tautan berbagi
papanRouter.delete('/:id/bagikan/:shareId', async (req: AuthRequest, res: Response) => {
  try {
    const { id, shareId } = req.params as { id: string; shareId: string };

    const board = await prisma.board.findUnique({
      where: { id },
      select: { ownerId: true },
    });

    if (!board || board.ownerId !== req.user!.id) {
      return res.status(403).json({ pesan: 'Anda tidak berwenang mencabut akses papan ini.' });
    }

    await prisma.boardShare.update({
      where: { id: shareId },
      data: { aktif: false },
    });

    return res.json({ pesan: 'Akses tautan berbagi berhasil dicabut.' });
  } catch (err: any) {
    return res.status(500).json({ pesan: err.message || 'Gagal mencabut tautan berbagi.' });
  }
});
