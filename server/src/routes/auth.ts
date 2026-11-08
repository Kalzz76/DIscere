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

const masukSchema = z.object({
  email: z.string({ message: 'Email wajib diisi.' }).email('Format email tidak valid.'),
  kataSandi: z.string({ message: 'Kata sandi wajib diisi.' }).min(1, 'Kata sandi wajib diisi.'),
});

// POST /api/auth/masuk
authRouter.post('/masuk', authRateLimiter, async (req, res, next) => {
  try {
    const validData = masukSchema.parse(req.body);
    const emailNorm = validData.email.trim().toLowerCase();

    const user = await prisma.user.findUnique({
      where: { email: emailNorm },
    });

    if (!user) {
      return res.status(401).json({
        pesan: 'Email atau kata sandi tidak cocok.',
      });
    }

    const passwordMatch = await bcryptjs.compare(validData.kataSandi, user.passwordHash);
    if (!passwordMatch) {
      return res.status(401).json({
        pesan: 'Email atau kata sandi tidak cocok.',
      });
    }

    if (user.status !== 'aktif') {
      return res.status(403).json({
        pesan: 'Akun Anda telah dinonaktifkan. Silakan hubungi administrator.',
      });
    }

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

    return res.json({
      pesan: 'Berhasil masuk.',
      user: {
        id: user.id,
        nama: user.nama,
        email: user.email,
        role: user.role,
        sekolah: user.sekolah,
        status: user.status,
      },
    });
  } catch (error) {
    return next(error);
  }
});
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
