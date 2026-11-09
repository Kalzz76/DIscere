import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router';
import { apiRequest } from '../../lib/api';
import { Button, Card, Input } from '../../components';
import {
  ArrowLeft,
  Plus,
  Trash2,
  Save,
  Loader2,
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

    // Validasi sederhana
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
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100">
        <Loader2 className="w-10 h-10 animate-spin text-[#D7262E] mb-3" />
        <p className="font-medium">Memuat form template...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 p-6 md:p-10">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header Bar */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={() => navigate('/guru?tab=template')}
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
          >
            <ArrowLeft className="w-4 h-4" /> Kembali ke Daftar Template
          </button>
          <span className="text-xs uppercase font-extrabold tracking-wider px-3 py-1 bg-red-100 dark:bg-red-950/60 text-[#D7262E] rounded-full">
            {isEdit ? 'Ubah Template' : 'Template Baru'}
          </span>
        </div>

        {errorPesan && (
          <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-300 dark:border-red-800 text-red-900 dark:text-red-200 text-sm font-semibold">
            {errorPesan}
          </div>
        )}

        <form onSubmit={handleSimpan} className="space-y-6">
          {/* Metadata Template */}
          <Card padding="md" className="space-y-4">
            <h2 className="text-xl font-bold">Informasi Utama Template</h2>

            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Judul Materi / Topik Soal
              </label>
              <Input
                placeholder="Contoh: Pecahan Campuran Kelas 5 atau Pahlawan Kemerdekaan"
                value={judul}
                onChange={(e) => setJudul(e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Jenis Game
                </label>
                <select
                  value={game}
                  disabled
                  className="w-full h-11 px-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 cursor-not-allowed font-medium"
                >
                  <option value="tarik_tambang">Tarik Tambang (Aktif)</option>
                </select>
                <span className="text-xs text-slate-400 mt-1 block">
                  Game lomba 17-an standar untuk Discere.
                </span>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Mode Permainan
                </label>
                <select
                  value={mode}
                  disabled
                  className="w-full h-11 px-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 cursor-not-allowed font-medium"
                >
                  <option value="solo">Mode Solo (Satu Layar Bersama)</option>
                </select>
                <span className="text-xs text-slate-400 mt-1 block">
                  Mode Multiplayer akan aktif pada tahap berikutnya.
                </span>
              </div>
            </div>
          </Card>

          {/* Daftar Soal */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold">
                Daftar Soal ({questions.length})
              </h2>
              <Button
                type="button"
                variant="sekunder"
                size="sm"
                icon={<Plus className="w-4 h-4" />}
                onClick={handleTambahSoal}
              >
                Tambah Soal
              </Button>
            </div>

            {questions.map((soal, index) => (
              <Card key={index} padding="md" className="space-y-4 relative">
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
                  <span className="font-extrabold text-base text-[#D7262E]">
                    Soal #{index + 1}
                  </span>
                  {questions.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleHapusSoal(index)}
                      className="text-slate-400 hover:text-red-500 transition-colors p-1"
                      title="Hapus Soal"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Teks Pertanyaan
                  </label>
                  <textarea
                    rows={2}
                    className="w-full p-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#D7262E] font-medium"
                    placeholder={`Tuliskan soal nomor ${index + 1}...`}
                    value={soal.teks}
                    onChange={(e) =>
                      handleUpdateSoal(index, 'teks', e.target.value)
                    }
                    required
                  />
                </div>

                {/* 3 Opsi Jawaban */}
                <div className="space-y-3 pt-1">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Pilihan Jawaban & Kunci Benar
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
                          className={`w-10 h-10 rounded-xl font-bold flex items-center justify-center shrink-0 transition-all ${
                            isSelected
                              ? 'bg-emerald-500 text-white shadow-sm ring-2 ring-emerald-300'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                          }`}
                          title={`Jadikan Opsi ${opsiKey} Jawaban Benar`}
                        >
                          {opsiKey}
                        </button>
                        <input
                          type="text"
                          className="flex-1 h-11 px-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#D7262E] text-sm font-medium"
                          placeholder={`Jawaban untuk Pilihan ${opsiKey}...`}
                          value={soal[fieldKey] as string}
                          onChange={(e) =>
                            handleUpdateSoal(index, fieldKey, e.target.value)
                          }
                          required
                        />
                        {isSelected && (
                          <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 shrink-0 hidden sm:inline">
                            Kunci Benar
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Penjelasan Jawaban (Opsional)
                  </label>
                  <input
                    type="text"
                    className="w-full h-10 px-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 text-slate-700 dark:text-slate-300 text-xs"
                    placeholder="Contoh: Mengapa jawaban ini benar..."
                    value={soal.penjelasan}
                    onChange={(e) =>
                      handleUpdateSoal(index, 'penjelasan', e.target.value)
                    }
                  />
                </div>
              </Card>
            ))}

            <Button
              type="button"
              variant="sekunder"
              size="md"
              icon={<Plus className="w-4 h-4" />}
              onClick={handleTambahSoal}
              className="w-full border-dashed"
            >
              Tambah Soal Baru
            </Button>
          </div>

          {/* Submit Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
            <Button
              type="button"
              variant="hantu"
              onClick={() => navigate('/guru?tab=template')}
              disabled={submitting}
            >
              Batal
            </Button>
            <Button
              type="submit"
              variant="utama"
              icon={<Save className="w-4 h-4" />}
              loading={submitting}
            >
              Simpan Template
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
