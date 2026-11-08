import http from 'http';
import express from 'express';
import { Server } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import os from 'os';
import cookieParser from 'cookie-parser';
import { config } from './config.js';
import { authRouter } from './routes/auth.js';
import { errorHandler } from './middleware/error.js';
import { authMiddleware, AuthRequest } from './middleware/auth.js';
import { roleMiddleware } from './middleware/role.js';

const app = express();
const server = http.createServer(app);

export const io = new Server(server, {
  cors: {
    origin: '*',
  },
});

app.use(express.json());
app.use(cookieParser());

// Endpoint health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// Rute API Auth
app.use('/api/auth', authRouter);

// Rute uji sementara role & auth (akan dihapus setelah verifikasi)
app.get('/api/uji/guru', authMiddleware, roleMiddleware('guru'), (req: AuthRequest, res) => {
  res.json({ pesan: 'Akses guru berhasil.', user: req.user });
});

app.get('/api/uji/admin', authMiddleware, roleMiddleware('admin'), (req: AuthRequest, res) => {
  res.json({ pesan: 'Akses admin berhasil.', user: req.user });
});

// Socket.IO event handler dasar
io.on('connection', (socket) => {
  socket.on('ping', () => {
    socket.emit('pong');
  });
});

// Layani client/dist jika file build tersedia (SPA fallback)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const clientDist = path.resolve(__dirname, '../../client/dist');

if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.use((req, res, next) => {
    if (req.method === 'GET' && !req.path.startsWith('/api')) {
      return res.sendFile(path.join(clientDist, 'index.html'));
    }
    next();
  });
}

// Error handler terpusat
app.use(errorHandler);

function getLocalIp(): string {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name] || []) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

const host = '0.0.0.0';
server.listen(config.port, host, () => {
  const localIp = getLocalIp();
  console.log(`Discere server aktif di http://${host}:${config.port}`);
  console.log(`- Local:   http://localhost:${config.port}`);
  console.log(`- Network: http://${localIp}:${config.port}`);
});
