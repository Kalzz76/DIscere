import express, { Router, Response } from 'express';
import { z } from 'zod';
import rateLimit from 'express-rate-limit';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import { roleMiddleware } from '../middleware/role.js';
import {
  generateSoalFromMateri,
  solveQuestionFromBoard,
  periksaDanPakaiKuota,
  getInfoKuota,
} from '../ai/ai.js';
import { config } from '../config.js';

export const aiRouter = Router();

// Batas body JSON khusus rute AI: 6 MB
aiRouter.use(express.json({ limit: '6mb' }));

// Rate limiter khusus endpoint AI: maksimal 25 request per 5 menit per IP
const aiLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  limit: 25,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { pesan: 'Terlalu banyak permintaan AI. Silakan tunggu beberapa menit.' },
});

aiRouter.use(aiLimiter);
aiRouter.use(authMiddleware);
aiRouter.use(roleMiddleware(['guru', 'admin']));

// GET /api/ai/kuota - Ambil info kuota harian guru
aiRouter.get('/kuota', async (req: AuthRequest, res: Response) => {
  try {
    const kuota = await getInfoKuota(req.user!.id);
    return res.json({
      ...kuota,
      hasApiKey: Boolean(config.aiApiKey),
      model: config.aiModel || 'gemini-1.5-flash (terintegrasi)',
    });
  } catch (err: any) {
    return res.status(500).json({ pesan: err.message || 'Gagal memeriksa kuota AI.' });
  }
});

// Skema validasi POST /api/ai/soal
const buatSoalSchema = z.object({
  materi: z.string().trim().min(20, 'Teks materi minimal 20 karakter agar AI dapat menyusun soal yang mendidik.'),
  jumlah: z.number().int().min(1).max(15).default(5),
  tingkat: z.enum(['SD', 'SMP']).default('SD'),
});

// POST /api/ai/soal - Buat soal dari teks materi
aiRouter.post('/soal', async (req: AuthRequest, res: Response) => {
  try {
    const parsed = buatSoalSchema.parse(req.body);

    // 1. Periksa batas kuota harian
    const kuotaCheck = await periksaDanPakaiKuota(req.user!.id);
    if (!kuotaCheck.bisaPakai) {
      return res.status(429).json({
        pesan: `Batas kuota harian AI Anda (${kuotaCheck.batasHarian} request/hari) telah tercapai. Kuota akan direset besok hari.`,
        kuota: kuotaCheck,
      });
    }

    // 2. Generate soal
    const { soal, dariCache } = await generateSoalFromMateri({
      materi: parsed.materi,
      jumlah: parsed.jumlah,
      tingkat: parsed.tingkat,
    });

    return res.json({
      pesan: `Berhasil membuat ${soal.length} soal dengan AI.`,
      soal,
      dariCache,
      kuota: {
        sisaKuota: kuotaCheck.sisaKuota,
        totalTerpakai: kuotaCheck.totalTerpakai,
        batasHarian: kuotaCheck.batasHarian,
      },
    });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ pesan: err.issues[0]?.message || 'Input materi tidak valid.' });
    }
    return res.status(500).json({ pesan: err.message || 'Gagal menghasilkan soal dengan AI.' });
  }
});

// Skema validasi POST /api/ai/jawab
const jawabPapanSchema = z.object({
  gambar: z.string().min(10, 'Gambar area soal wajib disertakan.').optional(),
  imageBase64: z.string().min(10).optional(),
  pertanyaan: z.string().max(500, 'Pertanyaan maksimal 500 karakter.').optional(),
}).refine((data) => data.gambar || data.imageBase64, {
  message: 'Gambar area soal wajib disertakan.',
});

// POST /api/ai/jawab - Jawab soal yang dilingkari guru di papan tulis
aiRouter.post('/jawab', async (req: AuthRequest, res: Response) => {
  try {
    const parsed = jawabPapanSchema.parse(req.body);
    const gambarData = parsed.gambar || parsed.imageBase64 || '';

    // 1. Periksa batas kuota harian per guru
    const kuotaCheck = await periksaDanPakaiKuota(req.user!.id);
    if (!kuotaCheck.bisaPakai) {
      return res.status(429).json({
        pesan: `Batas kuota harian Tanya AI (${kuotaCheck.batasHarian} request/hari) telah tercapai. Kuota akan direset besok.`,
        kuota: kuotaCheck,
      });
    }

    // 2. Panggil analisis soal dari potongan kanvas
    const { hasil, dariCache } = await solveQuestionFromBoard({
      imageBase64: gambarData,
      pertanyaan: parsed.pertanyaan,
    });

    return res.json({
      jawaban: hasil.jawaban,
      rumus: hasil.rumus || '-',
      langkah: hasil.langkah,
      dariCache,
      hasil,
      kuota: {
        sisaKuota: kuotaCheck.sisaKuota,
        totalTerpakai: kuotaCheck.totalTerpakai,
        batasHarian: kuotaCheck.batasHarian,
      },
    });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ pesan: err.issues[0]?.message || 'Data gambar tidak valid.' });
    }
    return res.status(500).json({ pesan: 'Gagal memproses Tanya AI dari kanvas. Silakan coba kembali.' });
  }
});
