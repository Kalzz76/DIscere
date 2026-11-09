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
 * Parse teks balasan AI sesuai format yang diminta:
 * "Jawaban: ...", "Rumus: ...", "Langkah: ..."
 */
function parseAiAnswerFormat(rawText: string): { jawaban: string; rumus: string; langkah: string } {
  const clean = rawText.replace(/\*\*/g, '').replace(/###?/g, '').trim();

  // Coba parse JSON terlebih dahulu
  if (clean.startsWith('{') && clean.endsWith('}')) {
    try {
      const j = JSON.parse(clean);
      if (j.jawaban) {
        return {
          jawaban: String(j.jawaban).trim(),
          rumus: j.rumus ? String(j.rumus).trim() : '-',
          langkah: j.langkah ? String(j.langkah).trim() : '-',
        };
      }
    } catch {
      // lanjut ke text parsing
    }
  }

  let jawaban = '';
  let rumus = '-';
  let langkah = '';
  let currentSection: 'jawaban' | 'rumus' | 'langkah' | '' = '';

  const lines = clean.split('\n');
  for (const line of lines) {
    const l = line.trim();
    if (/^Jawaban\s*:/i.test(l)) {
      jawaban = l.replace(/^Jawaban\s*:/i, '').trim();
      currentSection = 'jawaban';
    } else if (/^Rumus\s*:/i.test(l)) {
      const val = l.replace(/^Rumus\s*:/i, '').trim();
      rumus = val || '-';
      currentSection = 'rumus';
    } else if (/^Langkah\s*:/i.test(l)) {
      langkah = l.replace(/^Langkah\s*:/i, '').trim();
      currentSection = 'langkah';
    } else if (l) {
      if (currentSection === 'jawaban' && !langkah && rumus === '-') {
        jawaban += '\n' + l;
      } else if (currentSection === 'rumus') {
        rumus += '\n' + l;
      } else if (currentSection === 'langkah') {
        langkah += (langkah ? '\n' : '') + l;
      } else if (!jawaban) {
        jawaban = l;
      }
    }
  }

  return {
    jawaban: jawaban || clean || 'Tidak dapat membaca gambar dengan jelas.',
    rumus: rumus || '-',
    langkah: langkah || '-',
  };
}

/**
 * Panggil AI untuk Menjawab Soal yang Dilingkari di Papan Tulis (Tanya AI)
 */
export async function solveQuestionFromBoard(params: {
  imageBase64: string;
  pertanyaan?: string;
}): Promise<{ hasil: AiSolveBoardResult; dariCache: boolean }> {
  const { imageBase64, pertanyaan } = params;
  const hash = generateAiHash(imageBase64.slice(0, 4000), {
    pertanyaan: pertanyaan?.trim() || '',
    jenis: 'jawab',
  });

  // 1. Cek Cache di tabel ai_cache
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

  // Jika API Key tidak ada, kembalikan pesan ramah tanpa melempar error
  if (!config.aiApiKey) {
    return {
      hasil: {
        jawaban: 'Kunci AI_API_KEY belum dikonfigurasi di server (.env).',
        rumus: '-',
        langkah: 'Silakan atur variabel AI_API_KEY dan AI_MODEL di .env agar asisten AI dapat menganalisis gambar papan tulis.',
        dibuatAi: true,
      },
      dariCache: false,
    };
  }

  let hasilJawaban: AiSolveBoardResult | null = null;

  // 2. Panggil API AI memakai fetch dari server (tanpa library tambahan)
  try {
    const model = config.aiModel || 'gemini-1.5-flash';
    const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');

    const promptTeks = `Kamu asisten guru; gambar adalah potongan papan tulis berisi soal atau materi; jawab singkat; format persis:
Jawaban: ...
Rumus: ... (tulis dengan simbol biasa, tanpa LaTeX)
Langkah: ...
tanpa markdown; kalau bukan soal hitungan, bagian Rumus boleh dilewati; kalau gambar tidak terbaca, katakan terus terang.${pertanyaan ? `\nPermintaan khusus guru: ${pertanyaan}` : ''}`;

    // A. Dukung Google Generative AI (Gemini)
    if (!model.includes('claude') && !model.includes('anthropic')) {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${config.aiApiKey}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: promptTeks },
                {
                  inlineData: {
                    mimeType: 'image/png',
                    data: cleanBase64,
                  },
                },
              ],
            },
          ],
        }),
      });

      if (response.ok) {
        const data = (await response.json()) as any;
        const textOut = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (textOut) {
          const parsed = parseAiAnswerFormat(textOut);
          hasilJawaban = {
            jawaban: parsed.jawaban,
            rumus: parsed.rumus,
            langkah: parsed.langkah,
            dibuatAi: true,
          };
        }
      }
    } else {
      // B. Dukung Anthropic (Claude) jika dikonfigurasi
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': config.aiApiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model,
          max_tokens: 1200,
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'image',
                  source: {
                    type: 'base64',
                    media_type: 'image/png',
                    data: cleanBase64,
                  },
                },
                {
                  type: 'text',
                  text: promptTeks,
                },
              ],
            },
          ],
        }),
      });

      if (response.ok) {
        const data = (await response.json()) as any;
        const textOut = (data.content || []).map((c: any) => c.text || '').join('');
        if (textOut) {
          const parsed = parseAiAnswerFormat(textOut);
          hasilJawaban = {
            jawaban: parsed.jawaban,
            rumus: parsed.rumus,
            langkah: parsed.langkah,
            dibuatAi: true,
          };
        }
      }
    }
  } catch (err) {
    console.warn('Panggilan Tanya AI Vision gagal:', err);
  }

  // Fallback jika pemanggilan gagal atau gambar tidak terbaca
  if (!hasilJawaban) {
    hasilJawaban = {
      jawaban: 'Maaf, gambar soal pada kanvas belum terbaca dengan jelas.',
      rumus: '-',
      langkah: 'Pastikan coretan soal atau tulisan di papan terlihat jelas dan lingkari kembali dengan rapi.',
      dibuatAi: true,
    };
  }

  // 3. Simpan ke Cache ai_cache
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
