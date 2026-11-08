import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import { PrismaClient } from '@prisma/client';
import { config } from './config.js';

const adapter = new PrismaBetterSqlite3({ url: config.databaseUrl });

export const prisma = new PrismaClient({ adapter });
