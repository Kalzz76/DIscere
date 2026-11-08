import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../db.js';
import { config } from '../config.js';

export interface UserPayload {
  id: string;
  nama: string;
  email: string;
  role: string;
  sekolah: string | null;
  status: string;
}

export interface AuthRequest extends Request {
  user?: UserPayload;
}

export const COOKIE_NAME = 'discere_token';

export async function authMiddleware(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const token = req.cookies?.[COOKIE_NAME] || req.headers.authorization?.replace(/^Bearer\s+/, '');

    if (!token) {
      return res.status(401).json({ pesan: 'Sesi tidak valid atau telah berakhir. Silakan masuk kembali.' });
    }

    let decoded: { userId: string };
    try {
      decoded = jwt.verify(token, config.jwtSecret) as { userId: string };
    } catch {
      return res.status(401).json({ pesan: 'Sesi tidak valid atau telah kedaluwarsa. Silakan masuk kembali.' });
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        nama: true,
        email: true,
        role: true,
        sekolah: true,
        status: true,
      },
    });

    if (!user) {
      return res.status(401).json({ pesan: 'Akun tidak ditemukan. Silakan masuk kembali.' });
    }

    if (user.status !== 'aktif') {
      return res.status(401).json({ pesan: 'Akun Anda telah dinonaktifkan. Silakan hubungi administrator.' });
    }

    req.user = user;
    return next();
  } catch (error) {
    return next(error);
  }
}
