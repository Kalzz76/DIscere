import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router';
import { apiRequest } from '../../lib/api';
import { Button, Card, Modal } from '../../components';
import { Plus, Trash2, ArrowRight, Loader2, LayoutGrid, Clock } from 'lucide-react';

interface BoardItem {
  id: string;
  judul: string;
  updatedAt: string;
  createdAt: string;
}

export default function DaftarPapan() {
  const navigate = useNavigate();
  const [boards, setBoards] = useState<BoardItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchBoards = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiRequest<{ boards: BoardItem[] }>('/papan');
      setBoards(res.boards || []);
    } catch (err: any) {
      setError(err.message || 'Gagal memuat daftar papan');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBoards();
  }, []);

  const handleCreateBoard = async () => {
    try {
      setCreating(true);
      const res = await apiRequest<{ board: { id: string } }>('/papan', {
        method: 'POST',
        body: JSON.stringify({ judul: 'Papan Pembelajaran Baru' }),
      });
      if (res.board?.id) {
        navigate(`/papan/${res.board.id}`);
      }
    } catch (err: any) {
      setError(err.message || 'Gagal membuat papan baru');
      setCreating(false);
    }
  };

  const handleDeleteBoard = async () => {
    if (!deletingId) return;
    try {
      setIsDeleting(true);
      await apiRequest(`/papan/${deletingId}`, { method: 'DELETE' });
      setBoards((prev) => prev.filter((b) => b.id !== deletingId));
      setDeletingId(null);
    } catch (err: any) {
      setError(err.message || 'Gagal menghapus papan');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-6 md:p-10 font-sans">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-3">
              <Link to="/guru" className="text-purple-400 hover:text-purple-300 text-sm font-semibold flex items-center gap-1">
                ← Kembali ke Dashboard
              </Link>
            </div>
            <h1 className="text-3xl font-extrabold text-white mt-2 flex items-center gap-3">
              <LayoutGrid className="w-8 h-8 text-purple-400" />
              Papan Tulis Guru
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              Kanvas 2D tak terbatas untuk mengajar, mencatat rumus, diagram, dan materi interaktif.
            </p>
          </div>

          <Button
            variant="utama"
            onClick={handleCreateBoard}
            disabled={creating}
            className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white font-bold px-5 py-2.5 rounded-xl shadow-lg shadow-purple-600/30"
          >
            {creating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
            Papan Baru
          </Button>
        </div>

        {/* Notifikasi error */}
        {error && (
          <div className="mt-6 p-4 bg-red-900/40 border border-red-700 text-red-200 rounded-xl text-sm">
            {error}
          </div>
        )}

        {/* Content */}
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center text-slate-400 gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
            <p className="text-sm">Memuat daftar papan tulis…</p>
          </div>
        ) : boards.length === 0 ? (
          <div className="py-24 text-center max-w-md mx-auto">
            <div className="w-20 h-20 rounded-3xl bg-slate-800 flex items-center justify-center mx-auto mb-4 border border-slate-700 text-purple-400">
              <LayoutGrid className="w-10 h-10" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Belum ada papan tulis</h3>
            <p className="text-slate-400 text-sm mb-6">
              Mulai buat papan pertama Anda untuk menggambar, menjelaskan rumus, atau menyiapkan materi.
            </p>
            <Button
              variant="utama"
              onClick={handleCreateBoard}
              disabled={creating}
              className="bg-purple-600 hover:bg-purple-700 text-white font-bold"
            >
              Buat Papan Sekarang
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
            {boards.map((b) => (
              <Card
                key={b.id}
                className="bg-slate-800/80 border-slate-700/80 hover:border-purple-500/60 transition-all rounded-2xl p-5 flex flex-col justify-between group shadow-lg"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-bold text-lg text-white group-hover:text-purple-300 transition-colors line-clamp-2">
                      {b.judul || 'Papan Tanpa Judul'}
                    </h3>
                    <button
                      onClick={() => setDeletingId(b.id)}
                      className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-700 rounded-lg transition-colors"
                      title="Hapus papan"
                      aria-label="Hapus papan"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-4">
                    <Clock className="w-3.5 h-3.5" />
                    <span>Terakhir diubah: {new Date(b.updatedAt).toLocaleString('id-ID')}</span>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-700/60 flex items-center justify-between">
                  <span className="text-xs text-slate-400 font-mono">ID: {b.id.slice(0, 8)}…</span>
                  <Link
                    to={`/papan/${b.id}`}
                    className="inline-flex items-center gap-1.5 text-sm font-bold text-purple-400 hover:text-purple-300 group-hover:translate-x-1 transition-all"
                  >
                    Buka Papan
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Modal Konfirmasi Hapus */}
      <Modal
        isOpen={!!deletingId}
        onClose={() => setDeletingId(null)}
        title="Hapus Papan Tulis"
      >
        <p className="text-slate-300 text-sm mb-6">
          Apakah Anda yakin ingin menghapus papan ini? Semua coretan, gambar, dan catatan di dalamnya akan dihapus permanen.
        </p>
        <div className="flex justify-end gap-3">
          <Button
            variant="sekunder"
            onClick={() => setDeletingId(null)}
            disabled={isDeleting}
          >
            Batal
          </Button>
          <Button
            variant="utama"
            onClick={handleDeleteBoard}
            disabled={isDeleting}
            className="bg-red-600 hover:bg-red-700 text-white font-bold"
          >
            {isDeleting ? 'Menghapus…' : 'Ya, Hapus Papan'}
          </Button>
        </div>
      </Modal>
    </div>
  );
}

