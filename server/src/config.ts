import dotenv from 'dotenv';
import path from 'path';

// Baca .env dari root terlebih dahulu, lalu dari folder server jika ada
dotenv.config({ path: path.resolve(process.cwd(), '../.env') });
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  databaseUrl: process.env.DATABASE_URL || 'file:./dev.db',
  jwtSecret: process.env.JWT_SECRET || 'dev_secret_discere_key_2026',
  aiApiKey: process.env.AI_API_KEY || '',
  aiModel: process.env.AI_MODEL || '',
  aiBatasHarian: parseInt(process.env.AI_BATAS_HARIAN || '30', 10),
  seedAdminPassword: process.env.SEED_ADMIN_PASSWORD || 'admin123456',
  isProduction: process.env.NODE_ENV === 'production',
};

