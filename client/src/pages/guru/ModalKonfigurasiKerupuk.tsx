import React, { useState } from 'react';
import { Modal } from '../../components';
import {
  Sparkles,
  Users,
  Clock,
  UserCheck,
  AlertTriangle,
  CheckCircle2,
  Play,
  RotateCcw,
} from 'lucide-react';

export interface ProbabilitasForm {
  besar: number;
  sedang: number;
  kecil: number;
  sangat_kecil: number;
  zonk: number;
}

export interface KonfigurasiKerupukPayload {
  probabilitas: ProbabilitasForm;
  maxPeserta: number;
  durasiSoalDetik: number;
  allowLateJoin: boolean;
}

interface ModalKonfigurasiKerupukProps {
  isOpen: boolean;
  onClose: () => void;
  templateJudul: string;
  totalSoal: number;
  onMulai: (config: KonfigurasiKerupukPayload) => void;
  loading?: boolean;
}

const PRESET_DATA: Record<'normal' | 'mudah' | 'sulit', ProbabilitasForm> = {
  normal: { besar: 15, sedang: 25, kecil: 35, sangat_kecil: 20, zonk: 5 },
  mudah: { besar: 35, sedang: 30, kecil: 20, sangat_kecil: 12, zonk: 3 },
  sulit: { besar: 5, sedang: 15, kecil: 30, sangat_kecil: 35, zonk: 15 },
};

export default function ModalKonfigurasiKerupuk({
  isOpen,
  onClose,
  templateJudul,
  totalSoal,
  onMulai,
  loading = false,
}: ModalKonfigurasiKerupukProps) {
  const [preset, setPreset] = useState<'normal' | 'mudah' | 'sulit' | 'kustom'>('normal');
  const [probabilitas, setProbabilitas] = useState<ProbabilitasForm>({ ...PRESET_DATA.normal });
  const [maxPeserta, setMaxPeserta] = useState<number>(30);
  const [durasiSoalDetik, setDurasiSoalDetik] = useState<number>(15);
  const [allowLateJoin, setAllowLateJoin] = useState<boolean>(true);

  // Hitung total probabilitas live
  const totalPersen =
    Math.round(
      (probabilitas.besar +
        probabilitas.sedang +
        probabilitas.kecil +
        probabilitas.sangat_kecil +
        probabilitas.zonk) *
        100
    ) / 100;

  const isValidTotal = totalPersen === 100;

  const pilihPreset = (tipe: 'normal' | 'mudah' | 'sulit') => {
    setPreset(tipe);
    setProbabilitas({ ...PRESET_DATA[tipe] });
  };

  const updateNilai = (kunci: keyof ProbabilitasForm, nilai: number) => {
    setPreset('kustom');
    setProbabilitas((prev) => ({
      ...prev,
      [kunci]: Math.max(0, Math.min(100, isNaN(nilai) ? 0 : nilai)),
    }));
  };

  const handleSimpanDanMulai = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidTotal) return;
    onMulai({
      probabilitas,
      maxPeserta,
      durasiSoalDetik,
      allowLateJoin,
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Pengaturan Makan Kerupuk Challenge" maxWidth="lg">
      <form onSubmit={handleSimpanDanMulai} className="space-y-5 text-[#1d3b2e]">
        {/* Banner Info Materi */}
        <div className="bg-[#fcf8ed] border border-[#e0d5b8] rounded-xl p-3.5 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#6b7d6c] block">
              Materi Kuis
            </span>
            <p className="font-bold text-sm text-[#1d3b2e] line-clamp-1">{templateJudul}</p>
          </div>
          <span className="px-2.5 py-1 bg-[#1d3b2e] text-[#f4ecd8] text-xs font-bold rounded-lg shrink-0">
            {totalSoal} Soal
          </span>
        </div>

        {/* 1. Pemilihan Preset Probabilitas */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider mb-2 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-[#d97706]" /> Probabilitas Peluang Gigitan
            </span>
            <button
              type="button"
              onClick={() => pilihPreset('normal')}
              className="text-[11px] font-semibold text-[#1d3b2e] hover:underline flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3" /> Reset Normal
            </button>
          </label>

          <div className="grid grid-cols-3 gap-2 mb-3">
            <button
              type="button"
              onClick={() => pilihPreset('normal')}
              className={`py-2 px-3 text-xs font-bold rounded-lg border transition-all text-center ${
                preset === 'normal'
                  ? 'bg-[#1d3b2e] text-white border-[#1d3b2e] shadow-sm'
                  : 'bg-white text-[#1d3b2e] border-[#e0d5b8] hover:bg-[#f7f2e4]'
              }`}
            >
              Normal (15-25-35)
            </button>
            <button
              type="button"
              onClick={() => pilihPreset('mudah')}
              className={`py-2 px-3 text-xs font-bold rounded-lg border transition-all text-center ${
                preset === 'mudah'
                  ? 'bg-[#1d3b2e] text-white border-[#1d3b2e] shadow-sm'
                  : 'bg-white text-[#1d3b2e] border-[#e0d5b8] hover:bg-[#f7f2e4]'
              }`}
            >
              Mudah (Kenyang Cepat)
            </button>
            <button
              type="button"
              onClick={() => pilihPreset('sulit')}
              className={`py-2 px-3 text-xs font-bold rounded-lg border transition-all text-center ${
                preset === 'sulit'
                  ? 'bg-[#1d3b2e] text-white border-[#1d3b2e] shadow-sm'
                  : 'bg-white text-[#1d3b2e] border-[#e0d5b8] hover:bg-[#f7f2e4]'
              }`}
            >
              Sulit (Banyak Zonk)
            </button>
          </div>

          {/* 5 Slider Probabilitas */}
          <div className="space-y-2.5 bg-[#fcf8ed] border border-[#e0d5b8] p-3.5 rounded-xl">
            {/* Gigitan Besar */}
            <div>
              <div className="flex justify-between text-xs font-bold mb-1">
                <span>🍖 Gigitan Besar (-40% kerupuk, +40 pt)</span>
                <span className="font-mono text-sm text-[#1d3b2e]">{probabilitas.besar}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={probabilitas.besar}
                onChange={(e) => updateNilai('besar', parseInt(e.target.value))}
                className="w-full accent-[#1d3b2e] h-2 bg-[#e0d5b8] rounded-lg appearance-none cursor-pointer"
              />
            </div>

            {/* Gigitan Sedang */}
            <div>
              <div className="flex justify-between text-xs font-bold mb-1">
                <span>🥪 Gigitan Sedang (-25% kerupuk, +25 pt)</span>
                <span className="font-mono text-sm text-[#1d3b2e]">{probabilitas.sedang}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={probabilitas.sedang}
                onChange={(e) => updateNilai('sedang', parseInt(e.target.value))}
                className="w-full accent-[#1d3b2e] h-2 bg-[#e0d5b8] rounded-lg appearance-none cursor-pointer"
              />
            </div>

            {/* Gigitan Kecil */}
            <div>
              <div className="flex justify-between text-xs font-bold mb-1">
                <span>🍪 Gigitan Kecil (-10% kerupuk, +10 pt)</span>
                <span className="font-mono text-sm text-[#1d3b2e]">{probabilitas.kecil}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={probabilitas.kecil}
                onChange={(e) => updateNilai('kecil', parseInt(e.target.value))}
                className="w-full accent-[#1d3b2e] h-2 bg-[#e0d5b8] rounded-lg appearance-none cursor-pointer"
              />
            </div>

            {/* Gigitan Sangat Kecil */}
            <div>
              <div className="flex justify-between text-xs font-bold mb-1">
                <span>🥟 Gigitan Sangat Kecil (-5% kerupuk, +5 pt)</span>
                <span className="font-mono text-sm text-[#1d3b2e]">{probabilitas.sangat_kecil}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={probabilitas.sangat_kecil}
                onChange={(e) => updateNilai('sangat_kecil', parseInt(e.target.value))}
                className="w-full accent-[#1d3b2e] h-2 bg-[#e0d5b8] rounded-lg appearance-none cursor-pointer"
              />
            </div>

            {/* Zonk */}
            <div>
              <div className="flex justify-between text-xs font-bold mb-1">
                <span>💨 Zonk / Meleset (0% kerupuk, +0 pt)</span>
                <span className="font-mono text-sm text-[#c8362f]">{probabilitas.zonk}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={probabilitas.zonk}
                onChange={(e) => updateNilai('zonk', parseInt(e.target.value))}
                className="w-full accent-[#c8362f] h-2 bg-[#e0d5b8] rounded-lg appearance-none cursor-pointer"
              />
            </div>
          </div>

          {/* Indikator Validasi Total Persen */}
          <div className="mt-2 flex items-center justify-between px-1">
            <span className="text-xs font-semibold">Total Probabilitas:</span>
            <div
              className={`flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-md ${
                isValidTotal ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-700'
              }`}
            >
              {isValidTotal ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" /> Tepat 100% (Valid)
                </>
              ) : (
                <>
                  <AlertTriangle className="w-3.5 h-3.5" /> {totalPersen}% (Wajib Tepat 100%)
                </>
              )}
            </div>
          </div>
        </div>

        {/* 2. Pengaturan Batas Peserta & Waktu */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          {/* Maksimum Peserta */}
          <div className="bg-[#fcf8ed] border border-[#e0d5b8] p-3 rounded-xl">
            <label className="block text-xs font-bold uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-[#1d3b2e]" /> Kapasitas Peserta
            </label>
            <select
              value={maxPeserta}
              onChange={(e) => setMaxPeserta(parseInt(e.target.value))}
              className="w-full p-2 bg-white border border-[#e0d5b8] rounded-lg text-xs font-bold text-[#1d3b2e] focus:outline-none"
            >
              <option value={15}>15 Siswa (Kelas Kecil)</option>
              <option value={30}>30 Siswa (Standar Kelas)</option>
              <option value={45}>45 Siswa (Kelas Gabungan)</option>
              <option value={60}>60 Siswa</option>
              <option value={100}>100 Siswa (Maksimum)</option>
            </select>
          </div>

          {/* Durasi per Soal */}
          <div className="bg-[#fcf8ed] border border-[#e0d5b8] p-3 rounded-xl">
            <label className="block text-xs font-bold uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-[#1d3b2e]" /> Waktu per Soal
            </label>
            <select
              value={durasiSoalDetik}
              onChange={(e) => setDurasiSoalDetik(parseInt(e.target.value))}
              className="w-full p-2 bg-white border border-[#e0d5b8] rounded-lg text-xs font-bold text-[#1d3b2e] focus:outline-none"
            >
              <option value={10}>10 Detik (Cepat / Refleks)</option>
              <option value={15}>15 Detik (Standar)</option>
              <option value={20}>20 Detik (Santai)</option>
              <option value={30}>30 Detik (Materi Menghitung)</option>
            </select>
          </div>
        </div>

        {/* 3. Izinkan Siswa Susulan (Late Join) */}
        <div className="flex items-center justify-between bg-[#fcf8ed] border border-[#e0d5b8] p-3 rounded-xl">
          <div className="flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-[#1d3b2e]" />
            <div>
              <p className="text-xs font-bold text-[#1d3b2e]">Izinkan Siswa Susulan</p>
              <p className="text-[11px] text-[#6b7d6c]">
                Siswa dapat bergabung ke kuis meskipun permainan sudah dimulai
              </p>
            </div>
          </div>
          <input
            type="checkbox"
            checked={allowLateJoin}
            onChange={(e) => setAllowLateJoin(e.target.checked)}
            className="w-4 h-4 accent-[#1d3b2e] cursor-pointer"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-2 pt-3 border-t border-[#e0d5b8]">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-[#e0d5b8] text-xs font-bold rounded-lg text-[#1d3b2e] hover:bg-[#f7f2e4] transition-colors"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={!isValidTotal || loading}
            className={`px-5 py-2 text-xs font-bold rounded-lg flex items-center gap-2 text-white shadow-sm transition-all ${
              !isValidTotal || loading
                ? 'bg-slate-400 cursor-not-allowed opacity-60'
                : 'bg-[#1d3b2e] hover:bg-[#254b3b] cursor-pointer'
            }`}
          >
            <Play className="w-3.5 h-3.5" />
            {loading ? 'Menyiapkan Sesi...' : 'Buat Sesi & Buka Lobi'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
