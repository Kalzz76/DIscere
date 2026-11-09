import { Server, Socket } from 'socket.io';
import { multiManager, SesiMultiplayerActive } from '../games/multiManager.js';
import { kerupukManager, SesiKerupukActive } from '../games/kerupukManager.js';
import { prisma } from '../db.js';

export function setupMultiplayerSocket(io: Server) {
  io.on('connection', (socket: Socket) => {
    // 1. Siswa atau Peserta bergabung ke room sesi (Tarik Tambang atau Makan Kerupuk)
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

          // A. CABANG MAKAN KERUPUK CHALLENGE
          const sesiKerupukCek = kerupukManager.dapatkanSesiDariToken(token);
          if (sesiKerupukCek) {
            const { sesi, peserta, isReconnect } = kerupukManager.gabungPeserta(
              token,
              nama,
              socket.id,
              pesertaId
            );

            const roomName = `session:${sesi.sessionId}`;
            socket.join(roomName);

            const daftarPeserta = Array.from(sesi.peserta.values()).map((p) => ({
              id: p.id,
              nama: p.nama,
              connected: p.connected,
              sisaKerupuk: p.sisaKerupuk,
              skorTotal: p.skorTotal,
              streakBenar: p.streakBenar,
              selesaiKerupuk: p.selesaiKerupuk,
            }));

            const soalAktif =
              sesi.status === 'jalan' ? sesi.questions[sesi.currentQuestionIndex] : null;

            const sudahJawabSoalAktif =
              soalAktif && sesi.jawabanPerSoal.get(soalAktif.id)?.has(peserta.id);

            callback?.({
              success: true,
              game: 'makan_kerupuk',
              isReconnect,
              pesertaId: peserta.id,
              sessionId: sesi.sessionId,
              templateJudul: sesi.templateJudul,
              status: sesi.status,
              peserta: {
                id: peserta.id,
                nama: peserta.nama,
                sisaKerupuk: peserta.sisaKerupuk,
                skorTotal: peserta.skorTotal,
                skorPengetahuan: peserta.skorPengetahuan,
                skorKeberuntungan: peserta.skorKeberuntungan,
                streakBenar: peserta.streakBenar,
                selesaiKerupuk: peserta.selesaiKerupuk,
                terakhirGigitan: peserta.terakhirGigitan,
              },
              leaderboard: kerupukManager.dapatkanLeaderboard(sesi.sessionId),
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

            // Siarkan pembaruan lobi ke semua orang di room
            io.to(roomName).emit('lobi:update', {
              game: 'makan_kerupuk',
              totalPeserta: sesi.peserta.size,
              daftarPeserta,
            });
            return;
          }

          // B. CABANG TARIK TAMBANG MULTIPLAYER
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
            game: 'tarik_tambang',
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
            game: 'tarik_tambang',
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

      // A. Cek sesi Makan Kerupuk
      const sesiKerupuk = kerupukManager.dapatkanSesi(sessionId);
      if (sesiKerupuk) {
        sesiKerupuk.hostSocketId = socket.id;
        const roomName = `session:${sesiKerupuk.sessionId}`;
        socket.join(roomName);

        const daftarPeserta = Array.from(sesiKerupuk.peserta.values()).map((p) => ({
          id: p.id,
          nama: p.nama,
          connected: p.connected,
          sisaKerupuk: p.sisaKerupuk,
          skorTotal: p.skorTotal,
          streakBenar: p.streakBenar,
          selesaiKerupuk: p.selesaiKerupuk,
        }));

        socket.emit('lobi:update', {
          game: 'makan_kerupuk',
          totalPeserta: sesiKerupuk.peserta.size,
          daftarPeserta,
        });

        // Kirimkan juga leaderboard terkini
        socket.emit('kerupuk:update', {
          leaderboard: kerupukManager.dapatkanLeaderboard(sesiKerupuk.sessionId),
          answeredCount: 0,
          totalCount: sesiKerupuk.peserta.size,
        });
        return;
      }

      // B. Sesi Tarik Tambang
      const sesi = multiManager.dapatkanSesi(sessionId);
      if (sesi) {
        sesi.hostSocketId = socket.id;
        const roomName = `session:${sesi.sessionId}`;
        socket.join(roomName);

        const daftarPeserta = Array.from(sesi.peserta.values()).map((p) => ({
          id: p.id,
          nama: p.nama,
          tim: p.tim,
          connected: p.connected,
        }));

        socket.emit('lobi:update', {
          game: 'tarik_tambang',
          totalPeserta: sesi.peserta.size,
          daftarPeserta,
        });
      }
    });

    // 3. Guru menekan tombol "Mulai Permainan"
    socket.on(
      'sesi:mulai',
      async (
        data: { sessionId: string; hostId?: string },
        callback?: (res: any) => void
      ) => {
        try {
          const { sessionId } = data || {};

          // A. Sesi Makan Kerupuk
          const sesiKerupukTarget = kerupukManager.dapatkanSesi(sessionId);
          if (sesiKerupukTarget) {
            const sesi = kerupukManager.mulaiPermainan(sessionId, sesiKerupukTarget.hostId);
            const roomName = `session:${sesi.sessionId}`;

            await prisma.session.update({
              where: { id: sessionId },
              data: { status: 'jalan', mulaiPada: new Date() },
            });

            io.to(roomName).emit('game:mulai', {
              game: 'makan_kerupuk',
              totalSoal: sesi.totalSoal,
            });

            // Mulai soal pertama
            mulaiSoalKerupukIndex(io, sesi, 0);

            callback?.({ success: true, pesan: 'Makan Kerupuk Challenge dimulai!' });
            return;
          }

          // B. Sesi Tarik Tambang
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

          // A. Sesi Makan Kerupuk
          const sesiKerupuk = kerupukManager.dapatkanSesi(sessionId);
          if (sesiKerupuk) {
            const hasil = kerupukManager.prosesJawabanSiswa(
              sessionId,
              pesertaId,
              questionId,
              jawaban
            );

            const roomName = `session:${sesiKerupuk.sessionId}`;

            // Callback feedback personal lengkap ke siswa yang menjawab
            callback?.({
              success: true,
              game: 'makan_kerupuk',
              benar: hasil.hasilJawaban.benar,
              jawabanBenar: sesiKerupuk.questions[sesiKerupuk.currentQuestionIndex]?.jawabanBenar,
              penjelasan: sesiKerupuk.questions[sesiKerupuk.currentQuestionIndex]?.penjelasan,
              poinDidapat: hasil.hasilJawaban.poinDidapat,
              poinDasar: hasil.hasilJawaban.poinDasar,
              bonusStreak: hasil.hasilJawaban.bonusStreak,
              bonusPenyelesaian: hasil.hasilJawaban.bonusPenyelesaian,
              gacha: hasil.hasilJawaban.gacha,
              sisaKerupukBaru: hasil.hasilJawaban.sisaKerupukBaru,
              selesaiBaru: hasil.hasilJawaban.selesaiBaru,
              pesertaUpdated: hasil.hasilJawaban.pesertaUpdated,
            });

            const mapJawaban = sesiKerupuk.jawabanPerSoal.get(questionId);
            const answeredCount = mapJawaban ? mapJawaban.size : 0;
            const activeCount = Array.from(sesiKerupuk.peserta.values()).filter((p) => p.connected).length;

            // Siarkan pembaruan leaderboard & gigitan ke seluruh room
            io.to(roomName).emit('kerupuk:update', {
              leaderboard: hasil.leaderboard,
              answeredCount,
              totalCount: Math.max(activeCount, sesiKerupuk.peserta.size),
              terakhirJawab: {
                pesertaId,
                nama: hasil.hasilJawaban.pesertaUpdated.nama,
                benar: hasil.hasilJawaban.benar,
                gacha: hasil.hasilJawaban.gacha,
                sisaKerupuk: hasil.hasilJawaban.sisaKerupukBaru,
              },
            });

            // Jika semua kerupuk habis atau semua peserta sudah menjawab
            if (hasil.gameSelesaiSemuaHabis || hasil.semuaSelesai) {
              if (sesiKerupuk.timerHandle) {
                clearTimeout(sesiKerupuk.timerHandle);
                sesiKerupuk.timerHandle = undefined;
              }
              tutupSoalKerupukAktif(io, sesiKerupuk);
            }
            return;
          }

          // B. Sesi Tarik Tambang
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
            game: 'tarik_tambang',
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

          // A. Sesi Makan Kerupuk
          const sesiKerupuk = kerupukManager.dapatkanSesi(sessionId);
          if (sesiKerupuk) {
            const hasil = kerupukManager.akhiriPermainan(sessionId);
            await simpanHasilKerupukKeDatabase(sesiKerupuk);

            const roomName = `session:${sesiKerupuk.sessionId}`;
            io.to(roomName).emit('sesi:selesai', {
              game: 'makan_kerupuk',
              hasil,
            });

            callback?.({ success: true, hasil });
            return;
          }

          // B. Sesi Tarik Tambang
          const sesi = multiManager.akhiriPermainan(sessionId);
          await simpanHasilMultiKeDatabase(sesi);

          const roomName = `session:${sesi.sessionId}`;
          io.to(roomName).emit('sesi:selesai', {
            game: 'tarik_tambang',
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
      // Cek apakah socket berasal dari peserta Makan Kerupuk
      const { sessionId: kerupukSessionId } = kerupukManager.putusKoneksiPeserta(socket.id);
      if (kerupukSessionId) {
        const sesi = kerupukManager.dapatkanSesi(kerupukSessionId);
        if (sesi) {
          const roomName = `session:${sesi.sessionId}`;
          const daftarPeserta = Array.from(sesi.peserta.values()).map((p) => ({
            id: p.id,
            nama: p.nama,
            connected: p.connected,
            sisaKerupuk: p.sisaKerupuk,
            skorTotal: p.skorTotal,
            streakBenar: p.streakBenar,
            selesaiKerupuk: p.selesaiKerupuk,
          }));

          io.to(roomName).emit('lobi:update', {
            game: 'makan_kerupuk',
            totalPeserta: sesi.peserta.size,
            daftarPeserta,
          });
        }
        return;
      }

      // Cek apakah socket berasal dari peserta Tarik Tambang
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
            game: 'tarik_tambang',
            totalPeserta: sesi.peserta.size,
            daftarPeserta,
          });
        }
      }
    });
  });
}

// ---------------------------------------------------------------------------
// HELPER MAKAN KERUPUK CHALLENGE
// ---------------------------------------------------------------------------

/**
 * Menyiapkan dan menyiarkan soal aktif Makan Kerupuk beserta timer server
 */
function mulaiSoalKerupukIndex(io: Server, sesi: SesiKerupukActive, index: number) {
  sesi.currentQuestionIndex = index;
  const soalAktif = sesi.questions[index];
  if (!soalAktif) return;

  const durasiDetik = sesi.config.durasiSoalDetik || 15;
  const { soalBerakhirPada } = kerupukManager.mulaiTimerSoal(sesi.sessionId, durasiDetik);

  const roomName = `session:${sesi.sessionId}`;
  const totalPesertaAktif = Array.from(sesi.peserta.values()).filter((p) => p.connected).length;

  io.to(roomName).emit('soal:tampil', {
    game: 'makan_kerupuk',
    questionIndex: index,
    nomorSoal: index + 1,
    totalSoal: sesi.totalSoal,
    questionId: soalAktif.id,
    teks: soalAktif.teks,
    opsiA: soalAktif.opsiA,
    opsiB: soalAktif.opsiB,
    opsiC: soalAktif.opsiC,
    endsAt: soalBerakhirPada,
    duration: durasiDetik,
    answeredCount: 0,
    totalCount: Math.max(totalPesertaAktif, sesi.peserta.size),
  });

  // Timer timeout di server
  sesi.timerHandle = setTimeout(() => {
    tutupSoalKerupukAktif(io, sesi);
  }, durasiDetik * 1000);
}

/**
 * Menutup soal aktif Makan Kerupuk, rekap skor, dan lanjut ke soal berikutnya atau podium
 */
async function tutupSoalKerupukAktif(io: Server, sesi: SesiKerupukActive) {
  if (sesi.timerHandle) {
    clearTimeout(sesi.timerHandle);
    sesi.timerHandle = undefined;
  }

  const { questionIndex, isLastQuestion, rekapSoal } = kerupukManager.selesaikanSoalAktif(sesi.sessionId);
  const roomName = `session:${sesi.sessionId}`;

  const soal = sesi.questions[questionIndex];
  const leaderboard = kerupukManager.dapatkanLeaderboard(sesi.sessionId);

  // Siarkan rekap soal ke semua peserta
  io.to(roomName).emit('soal:selesai', {
    game: 'makan_kerupuk',
    questionIndex,
    jawabanBenar: soal?.jawabanBenar || '',
    penjelasan: soal?.penjelasan || null,
    leaderboard,
    stats: {
      benar: rekapSoal.totalBenar,
      salah: rekapSoal.totalSalah,
      tidakJawab: Math.max(0, sesi.peserta.size - rekapSoal.totalJawaban),
    },
    isGameFinished: isLastQuestion,
  });

  if (isLastQuestion) {
    const hasil = kerupukManager.akhiriPermainan(sesi.sessionId);
    await simpanHasilKerupukKeDatabase(sesi);
    io.to(roomName).emit('sesi:selesai', {
      game: 'makan_kerupuk',
      hasil,
    });
  } else {
    // Intermission 3 detik agar siswa membaca kunci jawaban & pembahasan
    sesi.intermissionHandle = setTimeout(() => {
      try {
        const next = kerupukManager.lanjutSoalBerikutnya(sesi.sessionId);
        mulaiSoalKerupukIndex(io, sesi, next.currentQuestionIndex);
      } catch {
        // Jika gagal melangkah, akhiri permainan
        const hasil = kerupukManager.akhiriPermainan(sesi.sessionId);
        simpanHasilKerupukKeDatabase(sesi);
        io.to(roomName).emit('sesi:selesai', { game: 'makan_kerupuk', hasil });
      }
    }, 3000);
  }
}

/**
 * Menyimpan hasil akhir Makan Kerupuk ke database
 */
export async function simpanHasilKerupukKeDatabase(sesi: SesiKerupukActive) {
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

    // 2. Simpan SessionResult
    const namaJuara1 = hasil.podium.juara1?.nama || 'Selesai';
    const skorJuara1 = hasil.podium.juara1?.skorTotal || 0;
    const skorJuara2 = hasil.podium.juara2?.skorTotal || 0;

    await tx.sessionResult.upsert({
      where: { sessionId: sesi.sessionId },
      update: {
        timMenang: namaJuara1,
        posisiAkhir: hasil.totalKerupukHabis,
        skorMerah: skorJuara1,
        skorPutih: skorJuara2,
      },
      create: {
        sessionId: sesi.sessionId,
        timMenang: namaJuara1,
        posisiAkhir: hasil.totalKerupukHabis,
        skorMerah: skorJuara1,
        skorPutih: skorJuara2,
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

// ---------------------------------------------------------------------------
// HELPER TARIK TAMBANG MULTIPLAYER
// ---------------------------------------------------------------------------

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
    game: 'tarik_tambang',
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
    game: 'tarik_tambang',
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
      game: 'tarik_tambang',
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
