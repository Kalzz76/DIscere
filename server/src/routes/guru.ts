import { Router, Response } from 'express';
import { prisma } from '../db.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import { roleMiddleware } from '../middleware/role.js';

export const guruRouter = Router();

guruRouter.use(authMiddleware);
guruRouter.use(roleMiddleware('guru'));

// GET /api/guru/ringkasan - Data ringkasan dashboard guru
guruRouter.get('/ringkasan', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    const [totalTemplate, totalSesi, totalPapan, templateTerbaru, sesiTerakhir] =
      await Promise.all([
        prisma.template.count({ where: { ownerId: userId } }),
        prisma.session.count({ where: { hostId: userId, status: 'selesai' } }),
        prisma.board.count({ where: { ownerId: userId } }),
        prisma.template.findMany({
          where: { ownerId: userId },
          orderBy: { updatedAt: 'desc' },
          take: 4,
          include: {
            _count: { select: { questions: true } },
          },
        }),
        prisma.session.findFirst({
          where: { hostId: userId, status: 'selesai' },
          orderBy: { selesaiPada: 'desc' },
          include: {
            template: { select: { judul: true, game: true } },
            result: true,
          },
        }),
      ]);

    return res.json({
      ringkasan: {
        totalTemplate,
        totalSesi,
        totalPapan,
        templateTerbaru: templateTerbaru.map((t) => ({
          id: t.id,
          judul: t.judul,
          game: t.game,
          mode: t.mode,
          jumlahSoal: t._count.questions,
          updatedAt: t.updatedAt,
        })),
        sesiTerakhir: sesiTerakhir
          ? {
              id: sesiTerakhir.id,
              templateJudul: sesiTerakhir.template.judul,
              game: sesiTerakhir.template.game,
              tanggal: sesiTerakhir.selesaiPada || sesiTerakhir.createdAt,
              timMenang: sesiTerakhir.result?.timMenang || 'seri',
              posisiAkhir: sesiTerakhir.result?.posisiAkhir ?? 0,
              skorMerah: sesiTerakhir.result?.skorMerah ?? 0,
              skorPutih: sesiTerakhir.result?.skorPutih ?? 0,
            }
          : null,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ pesan: err.message || 'Gagal memuat ringkasan guru.' });
  }
});

