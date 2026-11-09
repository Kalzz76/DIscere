import { BrowserRouter, Routes, Route } from 'react-router';
import { AuthProvider, RequireRole } from './lib/auth';
import { ToastProvider } from './components';

import Landing from './pages/publik/Landing';
import Fitur from './pages/publik/Fitur';
import Kelebihan from './pages/publik/Kelebihan';
import Dokumentasi from './pages/publik/Dokumentasi';
import Privasi from './pages/publik/Privasi';
import Daftar from './pages/publik/Daftar';
import Masuk from './pages/publik/Masuk';

import DashboardGuru from './pages/guru/Dashboard';
import TemplateForm from './pages/guru/TemplateForm';
import LayarHostSolo from './pages/game/LayarHostSolo';
import HasilSolo from './pages/game/HasilSolo';
import DashboardAdmin from './pages/admin/Statistik';
import NotFound from './pages/NotFound';

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <Routes>
            {/* Rute Publik */}
            <Route path="/" element={<Landing />} />
            <Route path="/fitur" element={<Fitur />} />
            <Route path="/kelebihan" element={<Kelebihan />} />
            <Route path="/dokumentasi" element={<Dokumentasi />} />
            <Route path="/privasi" element={<Privasi />} />
            <Route path="/daftar" element={<Daftar />} />
            <Route path="/masuk" element={<Masuk />} />

            {/* Rute Terlindungi Guru */}
            <Route element={<RequireRole allowedRole="guru" />}>
              <Route path="/guru" element={<DashboardGuru />} />
              <Route path="/guru/template/baru" element={<TemplateForm />} />
              <Route path="/guru/template/:id/ubah" element={<TemplateForm />} />
              <Route path="/guru/sesi/:id" element={<LayarHostSolo />} />
              <Route path="/guru/sesi/:id/hasil" element={<HasilSolo />} />
            </Route>

            {/* Rute Terlindungi Admin */}
            <Route element={<RequireRole allowedRole="admin" />}>
              <Route path="/admin" element={<DashboardAdmin />} />
            </Route>

            {/* Halaman 404 */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}
