import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Baca .env dari root terlebih dahulu, lalu dari folder server jika ada
dotenv.config({ path: path.resolve(process.cwd(), '../.env') });
dotenv.config();

const rawDbUrl = process.env.DATABASE_URL || 'file:./dev.db';
let resolvedDbUrl = rawDbUrl;
if (rawDbUrl.startsWith('file:')) {
  const filePart = rawDbUrl.slice(5);
  if (filePart.startsWith('./') || filePart.startsWith('.\\')) {
    const rel = filePart.replace(/^\.[/\\]/, '');
    const serverDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
    const dbPath = path.resolve(serverDir, rel).replace(/\\/g, '/');
    resolvedDbUrl = `file:${dbPath}`;
  }
}

export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  databaseUrl: resolvedDbUrl,
  jwtSecret: process.env.JWT_SECRET || 'dev_secret_discere_key_2026',
  aiApiKey: process.env.AI_API_KEY || '',
  aiModel: process.env.AI_MODEL || '',
  aiBatasHarian: parseInt(process.env.AI_BATAS_HARIAN || '30', 10),
  seedAdminEmail: process.env.SEED_ADMIN_EMAIL || 'admin@discere.local',
  seedAdminPassword: process.env.SEED_ADMIN_PASSWORD || 'AdminDiscere2026!',
  seedGuruEmail: process.env.SEED_GURU_EMAIL || 'guru@discere.local',
  seedGuruPassword: process.env.SEED_GURU_PASSWORD || 'GuruDiscere2026!',
  isProduction: process.env.NODE_ENV === 'production',
};
