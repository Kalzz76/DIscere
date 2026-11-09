import { useParams, Link } from 'react-router';
import { Button } from '../../components';

export default function KolaborasiPublik() {
  const { token } = useParams<{ token: string }>();

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-6 text-center">
      <div className="max-w-md bg-slate-800 p-8 rounded-2xl shadow-xl border border-slate-700">
        <h1 className="text-2xl font-bold text-yellow-400 mb-2">Papan Kolaborasi</h1>
        <p className="text-slate-300 mb-6">
          Sesi kolaborasi publik (Token: <code className="bg-slate-700 px-2 py-1 rounded text-white">{token}</code>) akan segera hadir di tahap berikutnya.
        </p>
        <Link to="/">
          <Button variant="utama">Kembali ke Beranda</Button>
        </Link>
      </div>
    </div>
  );
}
