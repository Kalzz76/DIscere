import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router';
import { apiRequest } from '../../lib/api';
import { Modal } from '../../components';
import {
  ArrowLeft,
  Plus,
  Trash2,
  Save,
  Loader2,
  Sparkles,
  Info,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';

interface QuestionFormItem {
  id?: string;
  urutan: number;
  teks: string;
  opsiA: string;
  opsiB: string;
  opsiC: string;
  jawabanBenar: 'A' | 'B' | 'C';
  penjelasan: string;
  dibuatAi?: boolean;
}

export default function TemplateForm() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [judul, setJudul] = useState('');
  const [game, setGame] = useState('tarik_tambang');
  const [mode, setMode] = useState<'solo' | 'multi'>('solo');
  const [questions, setQuestions] = useState<QuestionFormItem[]>([
    {
      urutan: 1,
      teks: '',
      opsiA: '',
      opsiB: '',
      opsiC: '',
      jawabanBenar: 'A',
      penjelasan: '',
    },
  ]);

  const [loading, setLoading] = useState(isEdit);
  const [submitting, setSubmitting] = useState(false);
  const [errorPesan, setErrorPesan] = useState<string | null>(null);

  // State Generator Soal AI
  const [modalAiOpen, setModalAiOpen] = useState(false);
  const [aiMateri, setAiMateri] = useState('');
  const [aiJumlah, setAiJumlah] = useState<number>(5);
  const [aiTingkat, setAiTingkat] = useState<'SD' | 'SMP'>('SD');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiSuksesPesan, setAiSuksesPesan] = useState<string | null>(null);
  const [aiKuota, setAiKuota] = useState<{
    sisaKuota: number;
    totalTerpakai: number;
    batasHarian: number;
  } | null>(null);

  useEffect(() => {
    if (!id) return;

    async function loadTemplate() {
      try {
        const res = await apiRequest<{ template: any }>(`/template/${id}`);
        const t = res.template;
        setJudul(t.judul);
        setGame(t.game);
        setMode(t.mode);
        if (t.questions && t.questions.length > 0) {
          setQuestions(
            t.questions.map((q: any, idx: number) => ({
              id: q.id,
              urutan: q.urutan || idx + 1,
              teks: q.teks,
              opsiA: q.opsiA,
              opsiB: q.opsiB,
              opsiC: q.opsiC,
              jawabanBenar: q.jawabanBenar,
              penjelasan: q.penjelasan || '',
              dibuatAi: Boolean(q.dibuatAi),
            }))
          );
        }
      } catch (err: any) {
        setErrorPesan(err.pesan || 'Gagal memuat template.');
      } finally {
        setLoading(false);
      }
    }

    loadTemplate();
  }, [id]);

  const bukaModalAi = async () => {
    setAiError(null);
    setAiSuksesPesan(null);
    setModalAiOpen(true);
    try {
      const k = await apiRequest<any>('/ai/kuota');
      setAiKuota({
        sisaKuota: k.sisaKuota,
        totalTerpakai: k.totalTerpakai,
        batasHarian: k.batasHarian,
      });
    } catch {
      // Abaikan jika info kuota gagal
    }
  };

  const handleGenerateAi = async () => {
    if (!aiMateri.trim() || aiMateri.trim().length < 20) {
      setAiError('Teks materi minimal 20 karakter agar AI dapat menyusun soal yang mendidik.');
      return;
    }

    try {
      setAiLoading(true);
      setAiError(null);
      const res = await apiRequest<{
        sukses: boolean;
        questions: Array<{
          urutan: number;
          teks: string;
          opsiA: string;
          opsiB: string;
          opsiC: string;
          jawabanBenar: 'A' | 'B' | 'C';
          penjelasan: string;
        }>;
      }>('/ai/generate-soal', {
        method: 'POST',
        body: JSON.stringify({
          materi: aiMateri.trim(),
          jumlahSoal: aiJumlah,
          jenjang: aiTingkat,
        }),
      });

      if (res.sukses && res.questions) {
        const aiQuestionsFormatted: QuestionFormItem[] = res.questions.map(
          (q, idx) => ({
            urutan: idx + 1,
            teks: q.teks,
            opsiA: q.opsiA,
            opsiB: q.opsiB,
            opsiC: q.opsiC,
            jawabanBenar: q.jawabanBenar,
            penjelasan: q.penjelasan || '',
            dibuatAi: true,
          })
        );

        setQuestions(aiQuestionsFormatted);
        setAiSuksesPesan(
          `Berhasil menghasilkan ${aiQuestionsFormatted.length} soal kuis!`
        );

        setTimeout(() => {
          setModalAiOpen(false);
          setAiSuksesPesan(null);
          setAiMateri('');
        }, 1200);
      }
    } catch (err: any) {
      setAiError(err.pesan || 'Gagal menghasilkan soal dengan AI.');
    } finally {
      setAiLoading(false);
    }
  };

  const handleTambahSoal = () => {
    setQuestions((prev) => [
      ...prev,
      {
        urutan: prev.length + 1,
        teks: '',
        opsiA: '',
        opsiB: '',
        opsiC: '',
        jawabanBenar: 'A',
        penjelasan: '',
      },
    ]);
  };

  const handleHapusSoal = (index: number) => {
    if (questions.length <= 1) {
      alert('Template wajib memiliki minimal 1 soal.');
      return;
    }
    setQuestions((prev) =>
      prev.filter((_, i) => i !== index).map((q, i) => ({ ...q, urutan: i + 1 }))
    );
  };

  const handleUpdateSoal = (
    index: number,
    field: keyof QuestionFormItem,
    value: any
  ) => {
    setQuestions((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const handleSimpan = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorPesan(null);

    // Validasi
    if (!judul.trim()) {
      setErrorPesan('Judul materi wajib diisi.');
      return;
    }

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.teks.trim()) {
        setErrorPesan(`Teks pertanyaan soal #${i + 1} belum diisi.`);
        return;
      }
      if (!q.opsiA.trim() || !q.opsiB.trim() || !q.opsiC.trim()) {
        setErrorPesan(`Semua pilihan jawaban (A, B, C) pada soal #${i + 1} wajib diisi.`);
        return;
      }
    }

    try {
      setSubmitting(true);
      const payload = {
        judul,
        game,
        mode,
        questions: questions.map((q, idx) => ({
          urutan: idx + 1,
          teks: q.teks.trim(),
          opsiA: q.opsiA.trim(),
          opsiB: q.opsiB.trim(),
          opsiC: q.opsiC.trim(),
          jawabanBenar: q.jawabanBenar,
          penjelasan: q.penjelasan.trim() || null,
        })),
      };

      if (isEdit) {
        await apiRequest(`/template/${id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
      } else {
        await apiRequest('/template', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      }

      navigate('/guru?tab=template');
    } catch (err: any) {
      setErrorPesan(err.pesan || 'Gagal menyimpan template.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="portal-bg min-h-screen flex flex-col items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-[#f2c230] mb-3" />
        <p className="portal-cv text-2xl text-[#f4ecd8]">Memuat formulir template...</p>
      </div>
    );
  }

  return (
    <div className="portal-bg">
      <div className="max-w-4xl mx-auto w-full p-6 md:p-10 space-y-6">
        {/* Header Bar */}
        <div className="portal-head">
          <div>
            <h1>{isEdit ? 'Ubah Template Kuis' : 'Buat Template Kuis Baru'}</h1>
            <p>Susun materi soal untuk dimainkan dalam game tarik tambang interaktif.</p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => navigate('/guru?tab=template')}
              className="portal-btn ghost sm"
            >
              <ArrowLeft className="w-4 h-4" /> Kembali ke Daftar Template
            </button>
          </div>
        </div>

        {errorPesan && (
          <div className="portal-banner error">
            <AlertTriangle className="w-5 h-5 shrink-0 text-[#c8362f]" />
            <span className="font-bold text-[#c8362f]">{errorPesan}</span>
          </div>
        )}

        <form onSubmit={handleSimpan} className="space-y-6">
          {/* Metadata Template dalam Card Kertas Krem */}
          <div className="portal-card p-6 space-y-4">
            <h2 className="portal-cv text-2xl text-[#1d3b2e]">Informasi Utama Materi</h2>

            <div>
              <label className="block text-xs font-bold text-[#1d3b2e] uppercase tracking-wider mb-1.5">
                Judul Materi / Topik Soal
              </label>
              <input
                type="text"
                placeholder="Contoh: Pecahan Campuran Kelas 5 atau Sejarah Proklamasi"
                value={judul}
                onChange={(e) => setJudul(e.target.value)}
                className="portal-input font-bold text-base"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              <div>
                <label className="block text-xs font-bold text-[#1d3b2e] uppercase tracking-wider mb-1.5">
                  Jenis Game
                </label>
                <select
                  value={game}
                  onChange={(e) => {
                    const newGame = e.target.value;
                    setGame(newGame);
                    if (newGame === 'makan_kerupuk') {
                      setMode('multi');
                    }
                  }}
                  className="portal-select"
                >
                  <option value="tarik_tambang">Tarik Tambang Edukasi (Beregu / Solo)</option>
                  <option value="makan_kerupuk">Makan Kerupuk Challenge (Individu 17 Agustus)</option>
                </select>
                <span className="text-[11px] text-[#6b7d6c] mt-1 block">
                  {game === 'makan_kerupuk'
                    ? 'Lomba makan kerupuk seru dengan gacha keberuntungan gigitan dan kuis interaktif.'
                    : 'Game lomba tarik tambang klasik untuk Discere.'}
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#1d3b2e] uppercase tracking-wider mb-1.5">
                  Mode Permainan
                </label>
                <select
                  value={mode}
                  onChange={(e) => setMode(e.target.value as 'solo' | 'multi')}
                  className="portal-select"
                >
                  <option value="multi">Mode Multiplayer (HP Siswa Masing-Masing)</option>
                  {game !== 'makan_kerupuk' && (
                    <option value="solo">Mode Solo (Satu Layar Bersama)</option>
                  )}
                </select>
                <span className="text-[11px] text-[#6b7d6c] mt-1 block">
                  {game === 'makan_kerupuk'
                    ? 'Setiap siswa bergabung menggunakan HP masing-masing dan bertanding secara individu.'
                    : 'Pilih cara siswa berpartisipasi dalam sesi kelas.'}
                </span>
              </div>
            </div>
          </div>

          {/* Daftar Soal */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <h2 className="portal-cv text-3xl text-[#f4ecd8]">
                Daftar Soal ({questions.length})
              </h2>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={bukaModalAi}
                  className="portal-btn sm"
                  style={{ background: '#f2c230', color: '#1d3b2e' }}
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Buat Soal dengan AI</span>
                </button>
                <button
                  type="button"
                  onClick={handleTambahSoal}
                  className="portal-btn ghost sm"
                >
                  <Plus className="w-4 h-4" />
                  <span>Tambah Manual</span>
                </button>
              </div>
            </div>

            {questions.map((soal, index) => (
              <div key={index} className="portal-card p-6 space-y-4 relative">
                <div className="flex items-center justify-between border-b-2 border-dashed border-[#e0d5b8] pb-3">
                  <div className="flex items-center gap-2">
                    <span className="portal-cv text-2xl text-[#c8362f]">
                      Soal #{index + 1}
                    </span>
                    {soal.dibuatAi && (
                      <span className="portal-tag yellow">
                        <Sparkles className="w-3 h-3 text-[#8a6a00]" /> Dibuat AI
                      </span>
                    )}
                  </div>
                  {questions.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleHapusSoal(index)}
                      className="portal-btn ghost-red sm"
                      title="Hapus Soal"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#6b7d6c] uppercase tracking-wider mb-1">
                    Teks Pertanyaan Kuis
                  </label>
                  <textarea
                    rows={2}
                    className="portal-input font-medium"
                    placeholder={`Tuliskan pertanyaan soal nomor ${index + 1}...`}
                    value={soal.teks}
                    onChange={(e) =>
                      handleUpdateSoal(index, 'teks', e.target.value)
                    }
                    required
                  />
                </div>

                {/* 3 Opsi Jawaban */}
                <div className="space-y-3 pt-1">
                  <label className="block text-xs font-bold text-[#6b7d6c] uppercase tracking-wider">
                    Pilihan Jawaban & Kunci Benar (Klik Huruf untuk Menjadikan Kunci)
                  </label>

                  {(['A', 'B', 'C'] as const).map((opsiKey) => {
                    const fieldKey = `opsi${opsiKey}` as keyof QuestionFormItem;
                    const isSelected = soal.jawabanBenar === opsiKey;

                    return (
                      <div key={opsiKey} className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() =>
                            handleUpdateSoal(index, 'jawabanBenar', opsiKey)
                          }
                          className={`w-10 h-10 rounded-xl font-extrabold flex items-center justify-center shrink-0 transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-[#1f4a37] text-[#f4ecd8] shadow-md ring-2 ring-[#f2c230]'
                              : 'bg-[#f4ecd9] text-[#1d3b2e] hover:bg-[#e0d5b8]'
                          }`}
                          title={`Jadikan Opsi ${opsiKey} sebagai Kunci Jawaban`}
                        >
                          {opsiKey}
                        </button>
                        <input
                          type="text"
                          className="portal-input flex-1"
                          placeholder={`Jawaban untuk Pilihan ${opsiKey}...`}
                          value={soal[fieldKey] as string}
                          onChange={(e) =>
                            handleUpdateSoal(index, fieldKey, e.target.value)
                          }
                          required
                        />
                        {isSelected && (
                          <span className="portal-tag green shrink-0">
                            ✓ Kunci Benar
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#6b7d6c] uppercase tracking-wider mb-1">
                    Penjelasan Pembahasan (Opsional)
                  </label>
                  <input
                    type="text"
                    className="portal-input text-xs"
                    placeholder="Contoh: Penjelasan materi mengapa jawaban ini benar..."
                    value={soal.penjelasan}
                    onChange={(e) =>
                      handleUpdateSoal(index, 'penjelasan', e.target.value)
                    }
                  />
                </div>
              </div>
            ))}

            <button
              type="button"
              onClick={handleTambahSoal}
              className="portal-btn ghost w-full justify-center py-3"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Soal Berikutnya</span>
            </button>
          </div>

          {/* Submit Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t-2 border-dashed border-[#f4ecd8]/30">
            <button
              type="button"
              onClick={() => navigate('/guru?tab=template')}
              disabled={submitting}
              className="portal-btn ghost"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="portal-btn red"
            >
              <Save className="w-4 h-4" />
              <span>{submitting ? 'Menyimpan...' : 'Simpan Template'}</span>
            </button>
          </div>
        </form>

        {/* Modal Generator Soal AI */}
        <Modal
          isOpen={modalAiOpen}
          onClose={() => !aiLoading && setModalAiOpen(false)}
          title="Buat Soal Otomatis dengan AI"
          maxWidth="lg"
        >
          <div className="space-y-4">
            {/* Kuota & Warning */}
            <div className="portal-banner warn">
              <Sparkles className="w-5 h-5 text-[#8a6a00] shrink-0" />
              <div className="text-xs space-y-0.5">
                <span className="font-bold block text-[#1d3b2e]">
                  Sisa Kuota AI Hari Ini: {aiKuota ? `${aiKuota.sisaKuota} / ${aiKuota.batasHarian}` : '30'} kali
                </span>
                <span className="text-[#8a6a00] block">Reset otomatis setiap tengah malam</span>
              </div>
            </div>

            {/* Peringatan Privasi UU PDP */}
            <div className="portal-banner info">
              <Info className="w-5 h-5 text-[#f2c230] shrink-0 mt-0.5" />
              <p className="text-xs text-[#cfd9c3] leading-relaxed">
                <strong className="text-[#f4ecd8]">Privasi Terisolasi:</strong> Jangan memasukkan nama siswa atau data pribadi ke dalam teks materi. Soal hasil AI wajib ditinjau guru sebelum disimpan.
              </p>
            </div>

            {aiError && (
              <div className="portal-banner error">
                <AlertTriangle className="w-4 h-4 shrink-0 text-[#c8362f]" />
                <span className="text-xs font-bold text-[#c8362f]">{aiError}</span>
              </div>
            )}

            {aiSuksesPesan && (
              <div className="portal-banner success">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-[#1f4a37]" />
                <span className="text-xs font-bold text-[#1d3b2e]">{aiSuksesPesan}</span>
              </div>
            )}

            {/* Input Materi */}
            <div>
              <label className="block text-xs font-bold text-[#1d3b2e] uppercase tracking-wider mb-1.5">
                Teks Rangkuman Materi Pembelajaran
              </label>
              <textarea
                rows={5}
                disabled={aiLoading}
                className="portal-input text-xs leading-relaxed"
                placeholder="Tempelkan ringkasan materi pembelajaran, bab buku, atau catatan konsep di sini (minimal 20 karakter)... Contoh: Perkembangbiakan tumbuhan secara generatif melibatkan penyerbukan dan pembuahan melalui serbuk sari dan putik..."
                value={aiMateri}
                onChange={(e) => setAiMateri(e.target.value)}
              />
              <span className="text-[11px] text-[#6b7d6c] mt-1 block">
                {aiMateri.length} karakter (minimal 20 karakter)
              </span>
            </div>

            {/* Pilihan Pengaturan AI */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-[#1d3b2e] uppercase tracking-wider mb-1">
                  Jumlah Soal
                </label>
                <select
                  disabled={aiLoading}
                  value={aiJumlah}
                  onChange={(e) => setAiJumlah(parseInt(e.target.value, 10))}
                  className="portal-select"
                >
                  <option value={5}>5 Soal (Rekomendasi Cepat)</option>
                  <option value={8}>8 Soal</option>
                  <option value={10}>10 Soal (Lomba Standar)</option>
                  <option value={15}>15 Soal (Maksimal)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#1d3b2e] uppercase tracking-wider mb-1">
                  Jenjang / Tingkat
                </label>
                <select
                  disabled={aiLoading}
                  value={aiTingkat}
                  onChange={(e) => setAiTingkat(e.target.value as 'SD' | 'SMP')}
                  className="portal-select"
                >
                  <option value="SD">Sekolah Dasar (SD Kelas 4 - 6)</option>
                  <option value="SMP">Sekolah Menengah Pertama (SMP)</option>
                </select>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#e0d5b8]">
              <button
                type="button"
                className="portal-btn ghost sm"
                onClick={() => setModalAiOpen(false)}
                disabled={aiLoading}
              >
                Batal
              </button>
              <button
                type="button"
                className="portal-btn red sm"
                onClick={handleGenerateAi}
                disabled={aiLoading || aiMateri.trim().length < 20}
              >
                <Sparkles className="w-4 h-4" />
                <span>{aiLoading ? 'Menyusun Soal...' : 'Buat Soal Sekarang'}</span>
              </button>
            </div>
          </div>
        </Modal>
      </div>

      {/* DUDUKAN PAPAN TULIS COKLAT DI PALING BAWAH (MEMANJANG FULL DARI UJUNG KANAN KE KIRI) */}
      <div className="portal-ledge" aria-hidden="true">
        <svg viewBox="0 0 1440 80" preserveAspectRatio="none">
          <path d="M0 34C240 6 480 62 720 34S1200 6 1440 34V80H0z" fill="#a6783c" />
          <path d="M0 56C260 34 520 80 760 56S1220 36 1440 58V80H0z" fill="#8d6444" />
        </svg>
        <div className="portal-chalks">
          <i style={{ width: '84px', background: '#7a9c85' }} />
          <i style={{ width: '70px', background: '#7a9c85' }} />
          <i style={{ width: '92px', background: '#7a9c85' }} />
        </div>
      </div>
    </div>
  );
}
