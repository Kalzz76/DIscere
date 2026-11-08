import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  if (err instanceof ZodError) {
    const issues = err.issues || (err as { errors?: Array<{ message: string }> }).errors;
    const pesan = issues?.[0]?.message || 'Data yang dikirimkan tidak valid.';
    return res.status(400).json({ pesan });
  }

  // Log error secara internal di konsol server
  console.error('[Error Server]:', err);

  // Jangan pernah menampilkan stack trace atau pesan teknis ke klien
  return res.status(500).json({
    pesan: 'Terjadi kesalahan pada server. Silakan coba beberapa saat lagi.',
  });
}
