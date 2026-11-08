# Discere

Platform kelas interaktif untuk guru: papan tulis digital tak terbatas untuk materi pelajaran dan game lomba interaktif berbasis web. Dibuat untuk **LOGICODIX 2026 Hackathon Competition**, subtema **Smart & Fun Education**.

Tagline: *"Belajar seru, tarik kemenangan bersama."*

---

## Fitur Utama

- **Sistem Desain & Aksesibilitas Modern:**
  - Desain bertema 17 Agustusan ramah anak: Merah `#D7262E`, Kuning `#F5B700`, Biru `#1E2A5A`, dan Slate.
  - Tipografi lokal: font *Baloo 2* untuk judul dan *Inter* untuk teks isi via `@fontsource` (tanpa CDN eksternal).
  - Dukungan mode gelap otomatis (`prefers-color-scheme`) dan pengurangan gerak (`prefers-reduced-motion`).
  - Komponen antarmuka modular: Button, Card, Input, Modal, Badge, dan Toast dengan ikon `lucide-react`.
- **Halaman Publik Lengkap:**
  - **Beranda (`/`):** 7 bagian komprehensif (Hero dengan simulasi tarik tambang animasi SVG, Masalah, Cara Kerja 3 langkah, Fitur Unggulan, Kelebihan, FAQ, dan Call-to-Action).
  - **Fitur (`/fitur`):** Penjelasan detail papan tulis Fabric.js, lomba tarik tambang, 2 mode main, asisten AI, kolaborasi, dan rekapitulasi evaluasi.
  - **Kelebihan (`/kelebihan`):** Keunggulan siswa tanpa akun, jalan di kelas tanpa HP, hemat sumber daya lokal, dan jaminan privasi data.
  - **Dokumentasi (`/dokumentasi`):** Panduan langkah demi langkah guru di kelas beserta tanya jawab teknis jaringan lokal.
  - **Kebijakan Privasi (`/privasi`):** Transparansi data sesuai UU PDP No. 27 Tahun 2022, penegasan bahwa nama siswa tidak disimpan ke database, dan isolasi akses admin.
- **Autentikasi & Keamanan:**
  - Pendaftaran guru (`/daftar`) dan Masuk (`/masuk`) divalidasi ganda dengan Zod (sisi klien dan server).
  - Sesi JWT aman tersimpan di cookie `httpOnly` dengan perlindungan rate limit `express-rate-limit`.
  - Proteksi rute otomatis: pengunjung belum login diarahkan ke `/masuk`, guru diarahkan ke `/guru`, dan admin diarahkan ke `/admin`.
- **Database & Data Awal:**
  - Basis data SQLite lokal berbasis Prisma ORM 7 dengan adapter driver `better-sqlite3`.
  - Skrip seed idempoten dengan akun demo guru, administrator, serta 5 template soal siap pakai.

---

## Cara Menjalankan

### Kebutuhan Sistem
- Node.js LTS (v22+)
- npm (v10+)

### Instalasi dan Konfigurasi
1. **Pasang dependensi:**
   ```bash
   npm install
   ```
2. **Siapkan konfigurasi lingkungan:**
   Salin `.env.example` ke `.env` lalu sesuaikan nilai rahasia (seperti `JWT_SECRET` dan kata sandi akun seed):
   ```bash
   cp .env.example .env
   ```
3. **Migrasi Database:**
   Jalankan migrasi Prisma untuk menyiapkan skema database SQLite lokal:
   ```bash
   npm run db:migrate
   ```
4. **Isi Data Awal (Seed):**
   Jalankan seed untuk membuat akun demo dan template contoh:
   ```bash
   npm run db:seed
   ```

### Menjalankan Aplikasi
- **Mode Pengembangan (Hot Reload Client + Server):**
  ```bash
  npm run dev
  ```
  Akses di peramban: `http://localhost:5173` (client) dan `http://localhost:3000` (server API).

- **Mode Produksi (Single Process Melayani API + Client Dist):**
  ```bash
  npm run build
  npm start
  ```
  Server akan melayani aplikasi di `http://localhost:3000` dan mencetak alamat IP jaringan lokal agar siswa dapat bergabung dari perangkat lain di WiFi yang sama.

### Akun Demo Bawaan
Setelah menjalankan `npm run db:seed`, akun berikut siap digunakan:

| Peran | Email | Kata Sandi Bawaan | Keterangan |
| :--- | :--- | :--- | :--- |
| **Administrator** | `admin@discere.local` | `AdminDiscere2026!` | Pengelola platform & template resmi |
| **Guru Demo** | `guru@discere.local` | `GuruDiscere2026!` | Memiliki template "Pecahan Kelas 5" & "Sejarah Proklamasi" |

---

## Penggunaan AI
*(Bagian ini akan dicatat dan didokumentasikan secara terbuka seiring pengembangan fitur dan modul)*
