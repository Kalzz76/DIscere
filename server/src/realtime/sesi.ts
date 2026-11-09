import { Server, Socket } from 'socket.io';
import { multiManager, SesiMultiplayerActive } from '../games/multiManager.js';
import { prisma } from '../db.js';

export function setupMultiplayerSocket(io: Server) {
  io.on('connection', (socket: Socket) => {
    // 1. Siswa atau Host bergabung ke room sesi
    socket.on(
      'sesi:gabung',
      async (
        data: { token: string; nama: string; pesertaId?: string },
        callback?: (res: any) => void
      ) => {
        try {
          const { token, nama, pesertaId } = data || {};
          if (!token || !nama) {
            callback?.({ success: false, pesan: 'Token dan nama panggilan wajib diisi.' });
            return;
          }

          const { sesi, peserta, isReconnect } = multiManager.gabungPeserta(
            token,
            nama,
            socket.id,
            pesertaId
          );

          // Masuk ke room socket sesi
          const roomName = `session:${sesi.sessionId}`;
          socket.join(roomName);

          const daftarPeserta = Array.from(sesi.peserta.values()).map((p) => ({
            id: p.id,
            nama: p.nama,
            tim: p.tim,
            connected: p.connected,
          }));

          // Balas ke siswa
          const soalAktif =
            sesi.status === 'jalan' ? sesi.questions[sesi.currentQuestionIndex] : null;

          const sudahJawabSoalAktif =
            soalAktif && sesi.jawabanPerSoal.get(soalAktif.id)?.has(peserta.id);

          callback?.({
            success: true,
            isReconnect,
            pesertaId: peserta.id,
            sessionId: sesi.sessionId,
            templateJudul: sesi.templateJudul,
            status: sesi.status,
            tim: peserta.tim,
            taliPosition: sesi.taliPosition,
            skorMerah: sesi.skorMerah,
            skorPutih: sesi.skorPutih,
            currentQuestionIndex: sesi.currentQuestionIndex,
            totalSoal: sesi.totalSoal,
            soalAktif: soalAktif
              ? {
                  id: soalAktif.id,
                  nomorSoal: sesi.currentQuestionIndex + 1,
                  totalSoal: sesi.totalSoal,
                  teks: soalAktif.teks,
                  opsiA: soalAktif.opsiA,
                  opsiB: soalAktif.opsiB,
                  opsiC: soalAktif.opsiC,
                  endsAt: sesi.soalBerakhirPada,
                }
              : null,
            sudahJawabSoalAktif: Boolean(sudahJawabSoalAktif),
          });

          // Siarkan pembaruan lobi ke semua orang di room (host & siswa)
          io.to(roomName).emit('lobi:update', {
            totalPeserta: sesi.peserta.size,
            daftarPeserta,
          });
        } catch (err: any) {
          callback?.({ success: false, pesan: err.message || 'Gagal bergabung ke sesi.' });
        }
      }
    );

    // 2. Host (Guru) bergabung dan mengikat socket ke room sesi
    socket.on('sesi:host_join', (data: { sessionId: string }) => {
      const { sessionId } = data || {};
      const sesi = multiManager.dapatkanSesi(sessionId);
      if (sesi) {
        sesi.hostSocketId = socket.id;
        const roomName = `session:${sesi.sessionId}`;
        socket.join(roomName);

        // Kirim status lobi saat ini ke host
        const daftarPeserta = Array.from(sesi.peserta.values()).map((p) => ({
          id: p.id,
          nama: p.nama,
          tim: p.tim,
          connected: p.connected,
        }));

        socket.emit('lobi:update', {
          totalPeserta: sesi.peserta.size,
          daftarPeserta,
        });
      }
    });

    // 3. Guru menekan tombol "Mulai Lomba"
    socket.on(
      'sesi:mulai',
      async (
        data: { sessionId: string; hostId?: string },
        callback?: (res: any) => void
      ) => {
        try {
          const { sessionId } = data || {};
          const sesiTarget = multiManager.dapatkanSesi(sessionId);
          if (!sesiTarget) {
            callback?.({ success: false, pesan: 'Sesi tidak ditemukan.' });
            return;
          }

          const sesi = multiManager.mulaiPermainan(sessionId, sesiTarget.hostId);

          const roomName = `session:${sesi.sessionId}`;

          // Update status di database menjadi 'jalan'
          await prisma.session.update({
            where: { id: sessionId },
            data: { status: 'jalan', mulaiPada: new Date() },
          });

          // Siarkan pembagian tim ke semua peserta
          const daftarPeserta = Array.from(sesi.peserta.values()).map((p) => ({
            id: p.id,
            nama: p.nama,
            tim: p.tim,
            connected: p.connected,
          }));

          io.to(roomName).emit('teams_assigned', {
            daftarPeserta,
          });

          // Mulai soal pertama (index 0)
          mulaiSoalIndex(io, sesi, 0);

          callback?.({ success: true, pesan: 'Permainan dimulai!' });
        } catch (err: any) {
          callback?.({ success: false, pesan: err.message || 'Gagal memulai permainan.' });
        }
      }
    );

    // 4. Siswa mengirimkan jawaban
    socket.on(
      'jawab:kirim',
      (
        data: {
          sessionId: string;
          pesertaId: string;
          questionId: string;
          jawaban: string;
        },
        callback?: (res: any) => void
      ) => {
        try {
          const { sessionId, pesertaId, questionId, jawaban } = data || {};
          const hasil = multiManager.prosesJawabanSiswa(
            sessionId,
            pesertaId,
            questionId,
            jawaban
          );

          const sesi = multiManager.dapatkanSesi(sessionId);
          if (!sesi) return;

          const roomName = `session:${sesi.sessionId}`;

          // Kirim feedback personal ke siswa yang menjawab
          callback?.({
            success: true,
            benar: hasil.benar,
            jawabanBenar: hasil.jawabanBenar,
            penjelasan: hasil.penjelasan,
          });

          const mapJawaban = sesi.jawabanPerSoal.get(questionId);
          const answeredCount = mapJawaban ? mapJawaban.size : 0;
          const activeCount = Array.from(sesi.peserta.values()).filter((p) => p.connected).length;

          // Siarkan pergerakan tali & skor terbaru ke seluruh ruangan
          io.to(roomName).emit('tali:update', {
            taliPosition: hasil.taliPosition,
            skorMerah: hasil.skorMerah,
            skorPutih: hasil.skorPutih,
            answeredCount,
            totalCount: Math.max(activeCount, sesi.peserta.size),
          });

          // Jika tali mencapai ujung atau semua siswa sudah menjawab
          if (hasil.gameSelesai || hasil.semuaSelesai) {
            if (sesi.timerHandle) {
              clearTimeout(sesi.timerHandle);
              sesi.timerHandle = undefined;
            }
            // Eksekusi penutupan soal secara aman
            tutupSoalAktif(io, sesi);
          }
        } catch (err: any) {
          callback?.({ success: false, pesan: err.message || 'Gagal memproses jawaban.' });
        }
      }
    );

    // 5. Guru mengakhiri permainan secara manual
    socket.on(
      'sesi:akhiri_manual',
      async (data: { sessionId: string }, callback?: (res: any) => void) => {
        try {
          const { sessionId } = data || {};
          const sesi = multiManager.akhiriPermainan(sessionId);
          await simpanHasilMultiKeDatabase(sesi);

          const roomName = `session:${sesi.sessionId}`;
          io.to(roomName).emit('sesi:selesai', {
            hasil: sesi.hasil,
          });

          callback?.({ success: true, hasil: sesi.hasil });
        } catch (err: any) {
          callback?.({ success: false, pesan: err.message || 'Gagal mengakhiri permainan.' });
        }
      }
    );

    // 6. Penanganan siswa atau host disconnect
    socket.on('disconnect', () => {
      const { sessionId } = multiManager.putusKoneksiPeserta(socket.id);
      if (sessionId) {
        const sesi = multiManager.dapatkanSesi(sessionId);
        if (sesi) {
          const roomName = `session:${sesi.sessionId}`;
          const daftarPeserta = Array.from(sesi.peserta.values()).map((p) => ({
            id: p.id,
            nama: p.nama,
            tim: p.tim,
            connected: p.connected,
          }));

          io.to(roomName).emit('lobi:update', {
            totalPeserta: sesi.peserta.size,
            daftarPeserta,
          });
        }
      }
    });
  });
}

/**
 * Menyiapkan dan menyiarkan soal aktif beserta timer server 15 detik
 */
function mulaiSoalIndex(io: Server, sesi: SesiMultiplayerActive, index: number) {
  sesi.currentQuestionIndex = index;
  const soalAktif = sesi.questions[index];
  if (!soalAktif) return;

  const { soalBerakhirPada } = multiManager.mulaiTimerSoal(sesi.sessionId, 15);

  const roomName = `session:${sesi.sessionId}`;
  const totalPesertaAktif = Array.from(sesi.peserta.values()).filter((p) => p.connected).length;

  io.to(roomName).emit('soal:tampil', {
    questionIndex: index,
    nomorSoal: index + 1,
    totalSoal: sesi.totalSoal,
    questionId: soalAktif.id,
    teks: soalAktif.teks,
    opsiA: soalAktif.opsiA,
    opsiB: soalAktif.opsiB,
    opsiC: soalAktif.opsiC,
    endsAt: soalBerakhirPada,
    duration: 15,
    answeredCount: 0,
    totalCount: Math.max(totalPesertaAktif, sesi.peserta.size),
  });

  // Pasang timer 15 detik di server
  sesi.timerHandle = setTimeout(() => {
    tutupSoalAktif(io, sesi);
  }, 15000);
}

/**
 * Menutup soal aktif, mengecek kondisi kemenangan, dan melanjutkan atau mengakhiri
 */
async function tutupSoalAktif(io: Server, sesi: SesiMultiplayerActive) {
  if (sesi.timerHandle) {
    clearTimeout(sesi.timerHandle);
    sesi.timerHandle = undefined;
  }

  const hasilTutup = multiManager.selesaikanSoalAktif(sesi.sessionId);
  const roomName = `session:${sesi.sessionId}`;

  // Hitung statistik jawaban pada soal ini
  const mapJawaban = sesi.jawabanPerSoal.get(sesi.questions[hasilTutup.questionIndex]?.id);
  let benarCount = 0;
  let salahCount = 0;
  if (mapJawaban) {
    for (const j of mapJawaban.values()) {
      if (j.benar) benarCount++;
      else salahCount++;
    }
  }

  // Beri tahu seluruh pemain bahwa soal telah selesai
  io.to(roomName).emit('soal:selesai', {
    questionIndex: hasilTutup.questionIndex,
    jawabanBenar: hasilTutup.jawabanBenar,
    penjelasan: hasilTutup.penjelasan,
    taliPosition: hasilTutup.posisiTali,
    skorMerah: hasilTutup.skorMerah,
    skorPutih: hasilTutup.skorPutih,
    isGameFinished: hasilTutup.isGameFinished,
    stats: {
      benar: benarCount,
      salah: salahCount,
      tidakJawab: Math.max(0, sesi.peserta.size - (benarCount + salahCount)),
    },
  });

  if (hasilTutup.isGameFinished) {
    await simpanHasilMultiKeDatabase(sesi);
    io.to(roomName).emit('sesi:selesai', {
      hasil: sesi.hasil,
    });
  } else {
    // Intermission 3 detik agar siswa membaca pembahasan dan host melihat rekap
    sesi.intermissionHandle = setTimeout(() => {
      const nextIndex = multiManager.lanjutKeSoalBerikutnya(sesi.sessionId);
      mulaiSoalIndex(io, sesi, nextIndex);
    }, 3000);
  }
}

/**
 * Menyimpan hasil akhir permainan multiplayer ke database via Prisma transaksi
 */
export async function simpanHasilMultiKeDatabase(sesi: SesiMultiplayerActive) {
  const hasil = sesi.hasil;
  if (!hasil) return;

  await prisma.$transaction(async (tx) => {
    // 1. Update status sesi
    await tx.session.update({
      where: { id: sesi.sessionId },
      data: {
        status: 'selesai',
        selesaiPada: new Date(),
      },
    });

    // 2. Simpan atau perbarui SessionResult
    await tx.sessionResult.upsert({
      where: { sessionId: sesi.sessionId },
      update: {
        timMenang: hasil.timMenang,
        posisiAkhir: hasil.posisiAkhir,
        skorMerah: hasil.skorMerah,
        skorPutih: hasil.skorPutih,
      },
      create: {
        sessionId: sesi.sessionId,
        timMenang: hasil.timMenang,
        posisiAkhir: hasil.posisiAkhir,
        skorMerah: hasil.skorMerah,
        skorPutih: hasil.skorPutih,
      },
    });

    // 3. Simpan question_stats per soal
    await tx.questionStat.deleteMany({
      where: { sessionId: sesi.sessionId },
    });

    for (const soal of sesi.questions) {
      const mapJawaban = sesi.jawabanPerSoal.get(soal.id);
      let jBenar = 0;
      let jSalah = 0;

      if (mapJawaban) {
        for (const j of mapJawaban.values()) {
          if (j.benar) jBenar++;
          else jSalah++;
        }
      }

      await tx.questionStat.create({
        data: {
          sessionId: sesi.sessionId,
          questionId: soal.id,
          jumlahBenar: jBenar,
          jumlahSalah: jSalah,
        },
      });
    }
  });
}
