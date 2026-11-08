import { Link } from 'react-router';
import { Button } from '../components';
import { Home } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="w-20 h-20 mx-auto rounded-3xl bg-red-100 dark:bg-red-950/50 text-[#D7262E] flex items-center justify-center font-bold text-3xl">
          404
        </div>
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Halaman Tidak Ditemukan</h1>
          <p className="text-slate-600 dark:text-slate-400">
            Maaf, halaman yang Anda tuju tidak tersedia atau telah dipindahkan.
          </p>
        </div>
        <div>
          <Link to="/">
            <Button variant="utama" size="md" icon={<Home className="w-4 h-4" />}>
              Kembali ke Beranda
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

