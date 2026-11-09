import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router';
import { apiRequest } from '../../lib/api';
import LayarHostSolo from './LayarHostSolo';
import LayarHostMulti from './LayarHostMulti';
import { Loader2 } from 'lucide-react';
import { Card, Button } from '../../components';

export default function LayarHost() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [mode, setMode] = useState<'solo' | 'multi' | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorPesan, setErrorPesan] = useState<string | null>(null);

  useEffect(() => {
    async function checkSessionMode() {
      if (!id) return;
      try {
        const res = await apiRequest<{ session: { mode: 'solo' | 'multi' } }>(`/sesi/${id}`);
        setMode(res.session.mode || 'solo');
      } catch (err: any) {
        setErrorPesan(err.pesan || 'Gagal memeriksa sesi permainan.');
      } finally {
        setLoading(false);
      }
    }
    checkSessionMode();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  if (errorPesan) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <Card className="max-w-md p-6 bg-slate-800 border-slate-700 text-center">
          <h2 className="text-xl font-bold text-white mb-2">Terjadi Kesalahan</h2>
          <p className="text-slate-400 text-sm mb-6">{errorPesan}</p>
          <Button variant="utama" onClick={() => navigate('/guru')} className="w-full">
            Kembali ke Dashboard
          </Button>
        </Card>
      </div>
    );
  }

  if (mode === 'multi') {
    return <LayarHostMulti />;
  }

  return <LayarHostSolo />;
}
