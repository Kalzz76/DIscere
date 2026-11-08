import { Router } from 'express';
import { z } from 'zod';
import bcryptjs from 'bcryptjs';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import { prisma } from '../db.js';
import { config } from '../config.js';
import { COOKIE_NAME } from '../middleware/auth.js';

export const authRouter = Router();

export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { pesan: 'Terlalu banyak permintaan. Silakan coba beberapa saat lagi.' },
});

const daftarSchema = z.object({
  nama: z.string({ message: 'Nama wajib diisi.' }).min(2, 'Nama minimal 2 karakter.'),
  email: z.string({ message: 'Email wajib diisi.' }).email('Format email tidak valid.'),
  kataSandi: z.string({ message: 'Kata sandi wajib diisi.' }).min(8, 'Kata sandi minimal 8 karakter.'),
  sekolah: z.string().optional(),
});

// POST /api/auth/daftar
authRouter.post('/daftar', authRateLimiter, async (req, res, next) => {
  try {
    const validData = daftarSchema.parse(req.body);
    const emailNorm = validData.email.trim().toLowerCase();

    const existingUser = await prisma.user.findUnique({
      where: { email: emailNorm },
    });

    if (existingUser) {
      return res.status(400).json({
        pesan: 'Email sudah terdaftar. Silakan gunakan email lain atau masuk.',
      });
    }

    const passwordHash = await bcryptjs.hash(validData.kataSandi, 10);

    const user = await prisma.user.create({
      data: {
        nama: validData.nama.trim(),
        email: emailNorm,
        passwordHash,
        role: 'guru', // Role selalu guru untuk pendaftaran publik
        sekolah: validData.sekolah?.trim() || null,
        status: 'aktif',
      },
      select: {
        id: true,
        nama: true,
        email: true,
        role: true,
        sekolah: true,
        status: true,
      },
    });

    const token = jwt.sign({ userId: user.id }, config.jwtSecret, {
      expiresIn: '7d',
    });

    res.cookie(COOKIE_NAME, token, {
      httpOnly: true,
      secure: config.isProduction,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/',
    });

    return res.status(201).json({
      pesan: 'Pendaftaran berhasil.',
      user,
    });
  } catch (error) {
    return next(error);
  }
});
