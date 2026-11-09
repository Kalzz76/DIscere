import { Server, Socket } from 'socket.io';
import { prisma } from '../db.js';

interface PesertaPapan {
  socketId: string;
  nama: string;
  peran: 'owner' | 'editor' | 'viewer';
  token?: string;
  userId?: string;
}

// In-memory tracking peserta per ruang papan: boardId -> Map<socketId, PesertaPapan>
const boardRooms = new Map<string, Map<string, PesertaPapan>>();

export function setupBoardSocket(io: Server) {
  io.on('connection', (socket: Socket) => {
    // 1. Bergabung ke ruang papan tulis
    socket.on(
      'papan:gabung',
      async (
        data: { boardId: string; token?: string; nama: string; userId?: string },
        callback?: (res: any) => void
      ) => {
        try {
          const { boardId, token, nama, userId } = data || {};
          if (!boardId) {
            callback?.({ success: false, pesan: 'ID papan wajib disertakan.' });
            return;
          }

          let peran: 'owner' | 'editor' | 'viewer' = 'viewer';
          const cleanNama = (nama || 'Tamu').trim();

          // A. Otorisasi Pemilik (Guru)
          if (userId) {
            const board = await prisma.board.findUnique({
              where: { id: boardId },
              select: { ownerId: true },
            });
            if (board && board.ownerId === userId) {
              peran = 'owner';
            }
          }

          // B. Otorisasi Kolaborator via Token Berbagi
          if (peran !== 'owner') {
            if (!token) {
              callback?.({
                success: false,
                pesan: 'Akses ditolak: Anda bukan pemilik papan dan token berbagi tidak disertakan.',
              });
              return;
            }

            const share = await prisma.boardShare.findUnique({
              where: { token },
              select: { boardId: true, peran: true, aktif: true },
            });

            if (!share || !share.aktif || share.boardId !== boardId) {
              callback?.({
                success: false,
                pesan: 'Akses ditolak: Tautan berbagi tidak valid atau telah dicabut oleh pemilik papan.',
              });
              return;
            }

            peran = share.peran === 'editor' ? 'editor' : 'viewer';
          }

          // Gabungkan socket ke room papan
          const roomName = `board:${boardId}`;
          socket.join(roomName);

          if (!boardRooms.has(boardId)) {
            boardRooms.set(boardId, new Map());
          }
          const roomMap = boardRooms.get(boardId)!;
          roomMap.set(socket.id, {
            socketId: socket.id,
            nama: cleanNama,
            peran,
            token,
            userId,
          });

          // Hitung peserta aktif
          const daftarPeserta = Array.from(roomMap.values()).map((p) => ({
            id: p.socketId,
            nama: p.nama,
            peran: p.peran,
          }));

          const viewers = daftarPeserta.filter((p) => p.peran === 'viewer').length;
          const editors = daftarPeserta.filter((p) => p.peran === 'editor' || p.peran === 'owner').length;

          // Siarkan daftar peserta ke seluruh room
          io.to(roomName).emit('papan:peserta', {
            total: daftarPeserta.length,
            viewers,
            editors,
            daftarPeserta,
          });

          callback?.({
            success: true,
            boardId,
            peran,
            nama: cleanNama,
          });
        } catch (err: any) {
          callback?.({ success: false, pesan: err.message || 'Gagal bergabung ke papan tulis.' });
        }
      }
    );

    // 2. Menerima dan Menyiarkan Perubahan Objek Kanvas (Real-time Collaboration)
    socket.on(
      'papan:ubah',
      (
        data: {
          boardId: string;
          aksi: 'tambah' | 'ubah' | 'hapus' | 'batch' | 'full';
          objekData: any;
          timestamp?: number;
        },
        callback?: (res: any) => void
      ) => {
        try {
          const { boardId, aksi, objekData } = data || {};
          if (!boardId || !aksi) {
            callback?.({ success: false, pesan: 'Parameter perubahan tidak lengkap.' });
            return;
          }

          const roomMap = boardRooms.get(boardId);
          const peserta = roomMap?.get(socket.id);

          if (!peserta) {
            callback?.({ success: false, pesan: 'Anda belum terdaftar di sesi papan ini.' });
            return;
          }

          // KEAMANAN KETAT: Periksa peran di server!
          if (peserta.peran === 'viewer') {
            callback?.({
              success: false,
              pesan: 'Akses ditolak: Viewer hanya memiliki izin membaca dan tidak dapat mengubah papan.',
            });
            return;
          }

          // Siarkan perubahan ke seluruh peserta LAIN di ruang papan (tidak mengirim balik ke pengirim)
          const roomName = `board:${boardId}`;
          socket.to(roomName).emit('papan:ubah', {
            aksi,
            objekData,
            pengirim: {
              id: socket.id,
              nama: peserta.nama,
              peran: peserta.peran,
            },
            timestamp: data.timestamp || Date.now(),
          });

          callback?.({ success: true });
        } catch (err: any) {
          callback?.({ success: false, pesan: err.message || 'Gagal menyinkronkan perubahan papan.' });
        }
      }
    );

    // 3. Pemilik Mencabut Akses Tautan Berbagi
    socket.on(
      'papan:cabut_akses',
      (data: { boardId: string; token: string }, callback?: (res: any) => void) => {
        try {
          const { boardId, token } = data || {};
          if (!boardId || !token) return;

          const roomMap = boardRooms.get(boardId);
          const peserta = roomMap?.get(socket.id);

          // Hanya owner yang boleh mencabut akses
          if (!peserta || peserta.peran !== 'owner') {
            callback?.({ success: false, pesan: 'Hanya pemilik papan yang dapat mencabut akses.' });
            return;
          }

          const roomName = `board:${boardId}`;
          // Siarkan bahwa token ini telah dicabut
          io.to(roomName).emit('papan:akses_dicabut', { token });

          callback?.({ success: true });
        } catch (err: any) {
          callback?.({ success: false, pesan: err.message || 'Gagal memproses pencabutan akses.' });
        }
      }
    );

    // 4. Penanganan Disconnect Kolaborator
    socket.on('disconnect', () => {
      for (const [boardId, roomMap] of boardRooms.entries()) {
        if (roomMap.has(socket.id)) {
          roomMap.delete(socket.id);

          const roomName = `board:${boardId}`;
          const daftarPeserta = Array.from(roomMap.values()).map((p) => ({
            id: p.socketId,
            nama: p.nama,
            peran: p.peran,
          }));

          const viewers = daftarPeserta.filter((p) => p.peran === 'viewer').length;
          const editors = daftarPeserta.filter((p) => p.peran === 'editor' || p.peran === 'owner').length;

          io.to(roomName).emit('papan:peserta', {
            total: daftarPeserta.length,
            viewers,
            editors,
            daftarPeserta,
          });

          if (roomMap.size === 0) {
            boardRooms.delete(boardId);
          }
          break;
        }
      }
    });
  });
}
