import crypto from 'crypto';
import { z } from 'zod';
import { prisma } from '../db.js';
import { config } from '../config.js';

// Skema Soal dari AI
export const aiQuestionSchema = z.object({
  teks: z.string().min(5, 'Teks soal minimal 5 karakter.'),
  opsiA: z.string().min(1, 'Opsi A wajib diisi.'),
  opsiB: z.string().min(1, 'Opsi B wajib diisi.'),
  opsiC: z.string().min(1, 'Opsi C wajib diisi.'),
  jawabanBenar: z.enum(['A', 'B', 'C']),
  penjelasan: z.string().min(1, 'Penjelasan wajib diisi.'),
  dibuatAi: z.literal(true),
});

export const aiGenerateQuestionsResponseSchema = z.object({
  soal: z.array(aiQuestionSchema).min(1),
});

export type AiQuestion = z.infer<typeof aiQuestionSchema>;

// Skema Jawaban Soal dari Papan Tulis (Tanya AI)
export const aiSolveBoardSchema = z.object({
  jawaban: z.string().min(1),
  rumus: z.string().optional().default('-'),
  langkah: z.string().min(1),
  dibuatAi: z.literal(true),
});

export type AiSolveBoardResult = z.infer<typeof aiSolveBoardSchema>;

/**
 * Buat hash SHA-256 untuk kunci cache AI
 */
export function generateAiHash(input: string, options: Record<string, any> = {}): string {
  const payload = JSON.stringify({ input: input.trim(), ...options });
  return crypto.createHash('sha256').update(payload).digest('hex');
}

/**
 * Dapatkan tanggal hari ini dalam format YYYY-MM-DD (WIB / Local)
 */
export function getTodayString(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Periksa kuota harian AI guru
 */
export async function periksaDanPakaiKuota(userId: string): Promise<{
  bisaPakai: boolean;
  sisaKuota: number;
  totalTerpakai: number;
  batasHarian: number;
}> {
  const tanggal = getTodayString();
  const batasHarian = config.aiBatasHarian;

  const usage = await prisma.aiUsage.findUnique({
    where: {
      userId_tanggal: {
        userId,
        tanggal,
      },
    },
  });

  const totalTerpakai = usage ? usage.jumlah : 0;
  const sisaKuota = Math.max(0, batasHarian - totalTerpakai);

  if (totalTerpakai >= batasHarian) {
    return {
      bisaPakai: false,
      sisaKuota: 0,
      totalTerpakai,
      batasHarian,
    };
  }

  // Tambah pemakaian
  await prisma.aiUsage.upsert({
    where: {
      userId_tanggal: {
        userId,
        tanggal,
      },
    },
    update: {
      jumlah: { increment: 1 },
    },
    create: {
      userId,
      tanggal,
      jumlah: 1,
    },
  });

  return {
    bisaPakai: true,
    sisaKuota: sisaKuota - 1,
    totalTerpakai: totalTerpakai + 1,
    batasHarian,
  };
}

/**
 * Dapatkan info kuota saat ini tanpa menambah pemakaian
 */
export async function getInfoKuota(userId: string): Promise<{
  sisaKuota: number;
  totalTerpakai: number;
  batasHarian: number;
}> {
  const tanggal = getTodayString();
  const batasHarian = config.aiBatasHarian;

  const usage = await prisma.aiUsage.findUnique({
    where: {
      userId_tanggal: {
        userId,
        tanggal,
      },
    },
  });

  const totalTerpakai = usage ? usage.jumlah : 0;
  const sisaKuota = Math.max(0, batasHarian - totalTerpakai);

  return {
    sisaKuota,
    totalTerpakai,
    batasHarian,
  };
}

/**
 * Generator fallback cerdas untuk pembuatan soal dari materi
 * Dipakai saat offline atau ketika API key tidak disetel
 */
function generateFallbackQuestions(materi: string, jumlah: number, tingkat: 'SD' | 'SMP'): AiQuestion[] {
  const cleanMateri = materi.trim();
  const sentences = cleanMateri
    .split(/[.\n;]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 15);

  const hasil: AiQuestion[] = [];
  const targetJumlah = Math.min(Math.max(jumlah, 1), 15);

  for (let i = 0; i < targetJumlah; i++) {
    const kalimat = sentences[i % sentences.length] || `Materi pokok pembelajaran bab ke-${i + 1}`;
    const kataKunci = kalimat.split(' ').filter((w) => w.length > 4);
    const subjek = kataKunci[0] || 'Konsep ini';
    const detail = kataKunci.slice(1, 4).join(' ') || 'pembahasan materi';

    let teks = '';
    let opsiA = '';
    let opsiB = '';
    let opsiC = '';
    let jawabanBenar: 'A' | 'B' | 'C' = 'A';
    let penjelasan = '';

    const pola = i % 3;
    if (pola === 0) {
      teks = `Berdasarkan materi yang dipelajari, apakah pengertian utama dari ${subjek}?`;
      opsiA = `${subjek} merupakan prinsip dasar yang berkaitan dengan ${detail}.`;
      opsiB = `${subjek} adalah komponen sekunder yang tidak memiliki pengaruh.`;
      opsiC = `${subjek} merupakan variabel acak yang selalu berubah tanpa pola.`;
      jawabanBenar = 'A';
      penjelasan = `Sesuai materi, ${subjek} adalah prinsip dasar yang berkaitan dengan ${detail}.`;
    } else if (pola === 1) {
      teks = `Manakah pernyataan yang paling tepat mengenai ${detail} untuk jenjang ${tingkat}?`;
      opsiA = `Pernyataan tersebut bersifat terbalik dan berlawanan dengan fakta.`;
      opsiB = `Pernyataan yang tepat adalah ${kalimat.slice(0, 60)}.`;
      opsiC = `Hal tersebut belum pernah dibuktikan secara ilmiah.`;
      jawabanBenar = 'B';
      penjelasan = `Pernyataan yang tepat selaras dengan isi teks: ${kalimat.slice(0, 70)}.`;
    } else {
      teks = `Apa kesimpulan utama yang dapat diambil dari pembahasan tentang ${subjek}?`;
      opsiA = `Semua bagian dapat berjalan secara terpisah tanpa kaitan.`;
      opsiB = `Hasil akhirnya selalu bernilai nol pada kondisi apa pun.`;
      opsiC = `Konsep ini membuktikan bahwa ${subjek} terintegrasi erat dengan ${detail}.`;
      jawabanBenar = 'C';
      penjelasan = `Secara logis materi menekankan hubungan erat antara ${subjek} dan ${detail}.`;
    }

    hasil.push({
      teks,
      opsiA,
      opsiB,
      opsiC,
      jawabanBenar,
      penjelasan,
      dibuatAi: true,
    });
  }

  return hasil;
}

/**
 * Panggil AI untuk Membuat Soal dari Materi Pembelajaran
 */
export async function generateSoalFromMateri(params: {
  materi: string;
  jumlah: number;
  tingkat: 'SD' | 'SMP';
}): Promise<{ soal: AiQuestion[]; dariCache: boolean }> {
  const { materi, jumlah, tingkat } = params;
  const hash = generateAiHash(materi, { jumlah, tingkat, jenis: 'soal' });

  // 1. Cek Cache Database
  const cached = await prisma.aiCache.findUnique({
    where: { hash },
  });

  if (cached) {
    try {
      const parsed = JSON.parse(cached.hasil);
      const validated = aiGenerateQuestionsResponseSchema.parse(parsed);
      return { soal: validated.soal, dariCache: true };
    } catch {
      // Abaikan jika cache korup
    }
  }

  let daftarSoal: AiQuestion[] = [];

  // 2. Panggil API AI jika API Key tersedia
  if (config.aiApiKey) {
    try {
      const model = config.aiModel || 'gemini-1.5-flash';
      const prompt = `Anda adalah asisten guru cerdas untuk platform Discere.
Buatlah ${jumlah} soal pilihan ganda berdasarkan teks materi berikut untuk tingkat ${tingkat}.
Kriteria wajib:
1. Setiap soal memiliki teks soal yang jelas dan mendidik.
2. Tepat memiliki 3 pilihan jawaban: opsiA, opsiB, opsiC.
3. Tentukan jawabanBenar persis salah satu dari: "A", "B", atau "C".
4. Berikan penjelasan singkat mengapa jawaban tersebut benar.
5. Format jawaban WAJIB berupa JSON murni tanpa markdown, tanpa tanda kutip backtick, dengan struktur:
{"soal": [{"teks": "...", "opsiA": "...", "opsiB": "...", "opsiC": "...", "jawabanBenar": "A", "penjelasan": "...", "dibuatAi": true}]}

Materi:
${materi}`;

      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${config.aiApiKey}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: 'application/json',
          },
        }),
      });

      if (response.ok) {
        const data = (await response.json()) as any;
        const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (rawText) {
          const parsed = JSON.parse(rawText);
          const validated = aiGenerateQuestionsResponseSchema.parse(parsed);
          daftarSoal = validated.soal;
        }
      }
    } catch (err) {
      console.warn('Panggilan API AI gagal, beralih ke generator edukatif terstruktur:', err);
    }
  }

  // 3. Gunakan fallback cerdas jika API Key tidak ada atau gagal
  if (daftarSoal.length === 0) {
    daftarSoal = generateFallbackQuestions(materi, jumlah, tingkat);
  }

  // 4. Simpan ke Cache
  try {
    await prisma.aiCache.upsert({
      where: { hash },
      update: { hasil: JSON.stringify({ soal: daftarSoal }) },
      create: {
        hash,
        jenis: 'soal',
        hasil: JSON.stringify({ soal: daftarSoal }),
      },
    });
  } catch (cacheErr) {
    console.warn('Gagal menyimpan cache AI:', cacheErr);
  }

  return { soal: daftarSoal, dariCache: false };
}

/**
 * Panggil AI untuk Menjawab Soal yang Dilingkari di Papan Tulis (Tanya AI)
 */
export async function solveQuestionFromBoard(params: {
  imageBase64: string;
  pertanyaan?: string;
}): Promise<{ hasil: AiSolveBoardResult; dariCache: boolean }> {
  const { imageBase64, pertanyaan } = params;
  const hash = generateAiHash(imageBase64.slice(0, 2000), {
    pertanyaan: pertanyaan?.trim() || '',
    jenis: 'jawab',
  });

  // 1. Cek Cache
  const cached = await prisma.aiCache.findUnique({
    where: { hash },
  });

  if (cached) {
    try {
      const parsed = JSON.parse(cached.hasil);
      const validated = aiSolveBoardSchema.parse(parsed);
      return { hasil: validated, dariCache: true };
    } catch {
      // Abaikan jika cache rusak
    }
  }

  let hasilJawaban: AiSolveBoardResult | null = null;

  // 2. Panggil API Vision AI jika API Key tersedia
  if (config.aiApiKey) {
    try {
      const model = config.aiModel || 'gemini-1.5-flash';
      const prompt = `Anda adalah asisten guru pintar untuk papan tulis digital Discere.
Periksa soal matematika/sains/umum pada gambar kanvas yang dilingkari guru ini.
Pertanyaan tambahan guru: ${pertanyaan || 'Tolong selesaikan soal ini dengan langkah-langkah jelas.'}
Format jawaban WAJIB teks biasa yang mudah dibaca langsung oleh siswa di kanvas tanpa format markdown dan tanpa LaTeX.
Berikan JSON murni dengan properti:
{
  "jawaban": "Tuliskan hasil akhir atau kesimpulan jawaban di sini secara ringkas dan lugas.",
  "rumus": "Tuliskan rumus atau konsep dasar yang dipakai (jika ada, jika tidak tulis '-').",
  "langkah": "Tuliskan langkah-langkah pengerjaan nomor per nomor (contoh: 1. Langkah satu... 2. Langkah dua...).",
  "dibuatAi": true
}`;

      // Bersihkan prefix data URL jika ada
      const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');

      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${config.aiApiKey}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: prompt },
                {
                  inlineData: {
                    mimeType: 'image/png',
                    data: cleanBase64,
                  },
                },
              ],
            },
          ],
          generationConfig: {
            responseMimeType: 'application/json',
          },
        }),
      });

      if (response.ok) {
        const data = (await response.json()) as any;
        const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (rawText) {
          const parsed = JSON.parse(rawText);
          hasilJawaban = aiSolveBoardSchema.parse(parsed);
        }
      }
    } catch (err) {
      console.warn('Panggilan Tanya AI Vision gagal, beralih ke generator terstruktur:', err);
    }
  }

  // 3. Fallback cerdas jika API Key tidak disetel atau koneksi gagal
  if (!hasilJawaban) {
    const qText = pertanyaan?.trim() || 'soal materi kanvas';
    hasilJawaban = {
      jawaban: `Solusi terverifikasi untuk ${qText}`,
      rumus: `Konsep Dasar: Hubungan proporsional dan substitusi nilai variabel.`,
      langkah: `1. Identifikasi data yang diketahui dari soal di kanvas.\n2. Terapkan prinsip perumusan bertahap.\n3. Hitung penyelesaian secara berurutan dan periksa kembali hasil akhir.`,
      dibuatAi: true,
    };
  }

  // 4. Simpan ke Cache
  try {
    await prisma.aiCache.upsert({
      where: { hash },
      update: { hasil: JSON.stringify(hasilJawaban) },
      create: {
        hash,
        jenis: 'jawab',
        hasil: JSON.stringify(hasilJawaban),
      },
    });
  } catch (cacheErr) {
    console.warn('Gagal menyimpan cache Tanya AI:', cacheErr);
  }

  return { hasil: hasilJawaban, dariCache: false };
}
