import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth.js';

export function roleMiddleware(allowedRoles: string | string[]) {
  const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ pesan: 'Silakan masuk terlebih dahulu.' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        pesan: 'Anda tidak memiliki hak akses untuk tindakan ini.',
      });
    }

    return next();
  };
}
