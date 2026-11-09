import React, { useState } from 'react';
import { apiRequest } from '../../lib/api';
import { Button, Modal } from '../../components';
import {
  Copy,
  Check,
  Eye,
  Edit3,
  ShieldAlert,
  Loader2,
  Trash2,
  Share2,
} from 'lucide-react';

interface ShareItem {
  id: string;
  token: string;
  peran: 'viewer' | 'editor';
  joinUrl: string;
}

interface PapanShareModalProps {
  boardId: string;
  isOpen: boolean;
  onClose: () => void;
  shares: ShareItem[];
  onRefreshShares: () => void;
  onRevokeShareToken?: (token: string) => void;
}

export const PapanShareModal: React.FC<PapanShareModalProps> = ({
  boardId,
  isOpen,
  onClose,
  shares,
  onRefreshShares,
  onRevokeShareToken,
}) => {
  const [activeTab, setActiveTab] = useState<'viewer' | 'editor'>('viewer');
  const [loadingPeran, setLoadingPeran] = useState<'viewer' | 'editor' | null>(null);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  const viewerShare = shares.find((s) => s.peran === 'viewer');
  const editorShare = shares.find((s) => s.peran === 'editor');

  // Buat atau dapatkan tautan berbagi untuk peran tertentu
  const handleGenerateShare = async (peran: 'viewer' | 'editor') => {
    try {
      setLoadingPeran(peran);
      await apiRequest(`/papan/${boardId}/bagikan`, {
        method: 'POST',
        body: JSON.stringify({ peran }),
      });
      onRefreshShares();
    } catch (err: any) {
      alert(err.pesan || 'Gagal membuat tautan berbagi.');
    } finally {
      setLoadingPeran(null);
    }
  };

  // Salin ke clipboard
  const handleCopy = (url: string, token: string) => {
    navigator.clipboard.writeText(url);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2500);
  };

  // Cabut tautan berbagi
  const handleRevoke = async (shareId: string, token: string) => {
    if (!confirm('Apakah Anda yakin ingin mencabut tautan ini? Pengguna yang menggunakan tautan ini tidak akan dapat mengakses papan lagi.')) {
      return;
    }
    try {
      setRevokingId(shareId);
      await apiRequest(`/papan/${boardId}/bagikan/${shareId}`, {
        method: 'DELETE',
      });
      onRevokeShareToken?.(token);
      onRefreshShares();
    } catch (err: any) {
      alert(err.pesan || 'Gagal mencabut tautan berbagi.');
    } finally {
      setRevokingId(null);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Bagikan Papan Tulis"
    >
      <div className="space-y-5">
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Siapa pun yang memiliki tautan dapat membuka papan tulis ini dari HP, tablet, atau laptop tanpa memerlukan akun.
        </p>

        {/* Tab Pemilihan Peran */}
        <div className="flex rounded-xl bg-slate-100 dark:bg-slate-800 p-1">
          <button
            onClick={() => setActiveTab('viewer')}
            className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'viewer'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            Tautan Menyimak (Viewer)
          </button>
          <button
            onClick={() => setActiveTab('editor')}
            className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'editor'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Edit3 className="w-3.5 h-3.5" />
            Tautan Kolaborator (Editor)
          </button>
        </div>

        {/* Konten Tab Viewer */}
        {activeTab === 'viewer' && (
          <div className="space-y-4">
            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 text-xs flex items-start gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                <strong>Mode Menyimak:</strong> Penerima hanya dapat melihat kanvas secara langsung dan mengikuti penjelasan Anda tanpa dapat mengubah atau menghapus objek.
              </span>
            </div>

            {viewerShare ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={viewerShare.joinUrl}
                    className="flex-1 px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-mono text-slate-700 dark:text-slate-200 select-all focus:outline-none"
                  />
                  <Button
                    variant="utama"
                    size="sm"
                    icon={
                      copiedToken === viewerShare.token ? (
                        <Check className="w-3.5 h-3.5" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )
                    }
                    onClick={() => handleCopy(viewerShare.joinUrl, viewerShare.token)}
                    className="text-xs font-bold"
                  >
                    {copiedToken === viewerShare.token ? 'Tersalin!' : 'Salin'}
                  </Button>
                </div>

                <div className="flex justify-between items-center pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                  <span className="text-slate-400">Status: Aktif</span>
                  <button
                    onClick={() => handleRevoke(viewerShare.id, viewerShare.token)}
                    disabled={revokingId === viewerShare.id}
                    className="text-rose-500 hover:text-rose-600 font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    {revokingId === viewerShare.id ? 'Mencabut...' : 'Cabut Akses'}
                  </button>
                </div>
              </div>
            ) : (
              <Button
                variant="utama"
                onClick={() => handleGenerateShare('viewer')}
                disabled={loadingPeran === 'viewer'}
                className="w-full text-xs font-bold py-3 flex items-center justify-center gap-2"
              >
                {loadingPeran === 'viewer' ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Membuat Tautan...
                  </>
                ) : (
                  <>
                    <Share2 className="w-4 h-4" />
                    Buat Tautan Menyimak (Viewer)
                  </>
                )}
              </Button>
            )}
          </div>
        )}

        {/* Konten Tab Editor */}
        {activeTab === 'editor' && (
          <div className="space-y-4">
            <div className="p-3.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-700 dark:text-blue-300 text-xs flex items-start gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                <strong>Mode Kolaborator:</strong> Penerima dapat menggambar, menulis, dan memanipulasi objek di kanvas bersamaan secara real-time.
              </span>
            </div>

            {editorShare ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={editorShare.joinUrl}
                    className="flex-1 px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-mono text-slate-700 dark:text-slate-200 select-all focus:outline-none"
                  />
                  <Button
                    variant="utama"
                    size="sm"
                    icon={
                      copiedToken === editorShare.token ? (
                        <Check className="w-3.5 h-3.5" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )
                    }
                    onClick={() => handleCopy(editorShare.joinUrl, editorShare.token)}
                    className="text-xs font-bold"
                  >
                    {copiedToken === editorShare.token ? 'Tersalin!' : 'Salin'}
                  </Button>
                </div>

                <div className="flex justify-between items-center pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                  <span className="text-slate-400">Status: Aktif</span>
                  <button
                    onClick={() => handleRevoke(editorShare.id, editorShare.token)}
                    disabled={revokingId === editorShare.id}
                    className="text-rose-500 hover:text-rose-600 font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    {revokingId === editorShare.id ? 'Mencabut...' : 'Cabut Akses'}
                  </button>
                </div>
              </div>
            ) : (
              <Button
                variant="utama"
                onClick={() => handleGenerateShare('editor')}
                disabled={loadingPeran === 'editor'}
                className="w-full text-xs font-bold py-3 flex items-center justify-center gap-2"
              >
                {loadingPeran === 'editor' ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Membuat Tautan...
                  </>
                ) : (
                  <>
                    <Share2 className="w-4 h-4" />
                    Buat Tautan Kolaborator (Editor)
                  </>
                )}
              </Button>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
};

