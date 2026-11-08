import { useAuth } from '../../lib/auth';
import { Button, Card } from '../../components';
import { LogOut, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router';

export default function DashboardAdmin() {
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
            <div className="w-12 h-12 rounded-2xl bg-blue-100 dark:bg-blue-950/60 text-[#1E2A5A] dark:text-blue-300 flex items-center justify-center font-bold">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Dashboard Administrator</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Akses Pengelola: {user?.nama} ({user?.email})
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
          <h2 className="text-xl font-bold mb-2">Panel Pengelola Platform</h2>
          <p className="text-slate-600 dark:text-slate-300">
            Pengelolaan statistik platform, kelola akun guru, pustaka template resmi, dan monitoring kuota AI akan hadir di tahap selanjutnya.
          </p>
        </Card>
      </div>
    </div>
  );
}

