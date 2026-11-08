import { useAuth } from '../../lib/auth';
import { Button, Card } from '../../components';
import { LogOut, GraduationCap } from 'lucide-react';
import { useNavigate } from 'react-router';

export default function DashboardGuru() {
  const { user, keluar } = useAuth();
  const navigate = useNavigate();

  const handleKeluar = async () => {
    await keluar();
    navigate('/masuk');
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 p-6 md:p-10">
      <div className="max-w-4xl mx-auto space-y-6">
        <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-red-100 dark:bg-red-950/60 text-[#D7262E] flex items-center justify-center font-bold">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Dashboard Guru</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Selamat datang, {user?.nama} {user?.sekolah ? `(${user.sekolah})` : ''}
              </p>
            </div>
          </div>
          <Button
            variant="hantu"
            size="md"
            icon={<LogOut className="w-4 h-4" />}
            onClick={handleKeluar}
          >
            Keluar
          </Button>
        </header>

        <Card padding="lg">
          <h2 className="text-xl font-bold mb-2">Area Kerja Guru</h2>
          <p className="text-slate-600 dark:text-slate-300">
            Fitur manajemen template, soal kuis, papan tulis interaktif, dan riwayat game akan aktif pada tahap berikutnya.
          </p>
        </Card>
      </div>
    </div>
  );
}

