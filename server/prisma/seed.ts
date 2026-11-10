import bcryptjs from 'bcryptjs';
import { prisma } from '../src/db.js';
import { config } from '../src/config.js';

async function main() {
  console.log('Memulai proses seeding database Discere...');

  // 1. Akun Admin
  const adminPasswordHash = await bcryptjs.hash(config.seedAdminPassword, 10);
  const admin = await prisma.user.upsert({
    where: { email: config.seedAdminEmail },
    update: {
      passwordHash: adminPasswordHash,
      role: 'admin',
      status: 'aktif',
    },
    create: {
      nama: 'Administrator Discere',
      email: config.seedAdminEmail,
      passwordHash: adminPasswordHash,
      role: 'admin',
      sekolah: 'Pusat Discere',
      status: 'aktif',
    },
  });
  console.log(`Akun admin siap: ${admin.email}`);

  // 2. Akun Guru Demo
  const guruPasswordHash = await bcryptjs.hash(config.seedGuruPassword, 10);
  const guru = await prisma.user.upsert({
    where: { email: config.seedGuruEmail },
    update: {
      passwordHash: guruPasswordHash,
      role: 'guru',
      status: 'aktif',
    },
    create: {
      nama: 'Guru Demo',
      email: config.seedGuruEmail,
      passwordHash: guruPasswordHash,
      role: 'guru',
      sekolah: 'SD Negeri Merdeka 01',
      status: 'aktif',
    },
  });
  console.log(`Akun guru demo siap: ${guru.email}`);

  // 3. Template Guru Demo: Pecahan Kelas 5 (Mode Solo, 6 Soal)
  let templatePecahan = await prisma.template.findFirst({
    where: { ownerId: guru.id, judul: 'Pecahan Kelas 5' },
  });

  if (!templatePecahan) {
    templatePecahan = await prisma.template.create({
      data: {
        ownerId: guru.id,
        judul: 'Pecahan Kelas 5',
        game: 'tarik_tambang',
        mode: 'solo',
        resmi: false,
      },
    });
  }

  // Buat/reset soal untuk template pecahan
  await prisma.question.deleteMany({ where: { templateId: templatePecahan.id } });
  await prisma.question.createMany({
    data: [
      {
        templateId: templatePecahan.id,
        urutan: 1,
        teks: 'Hasil dari 1/2 + 1/4 adalah...',
        opsiA: '3/4',
        opsiB: '2/6',
        opsiC: '1/8',
        jawabanBenar: 'A',
        penjelasan: 'Samakan penyebut menjadi 4: 2/4 + 1/4 = 3/4.',
        dibuatAi: false,
      },
      {
        templateId: templatePecahan.id,
        urutan: 2,
        teks: 'Bentuk desimal dari 3/5 adalah...',
        opsiA: '0,5',
        opsiB: '0,6',
        opsiC: '0,75',
        jawabanBenar: 'B',
        penjelasan: '3 dibagi 5 sama dengan 0,6.',
        dibuatAi: false,
      },
      {
        templateId: templatePecahan.id,
        urutan: 3,
        teks: 'Hasil dari 3/4 - 1/2 adalah...',
        opsiA: '1/4',
        opsiB: '2/4',
        opsiC: '1/2',
        jawabanBenar: 'A',
        penjelasan: 'Samakan penyebut: 3/4 - 2/4 = 1/4.',
        dibuatAi: false,
      },
      {
        templateId: templatePecahan.id,
        urutan: 4,
        teks: 'Bentuk persen dari 1/4 adalah...',
        opsiA: '20%',
        opsiB: '25%',
        opsiC: '40%',
        jawabanBenar: 'B',
        penjelasan: '1/4 dikalikan 100% sama dengan 25%.',
        dibuatAi: false,
      },
      {
        templateId: templatePecahan.id,
        urutan: 5,
        teks: 'Pecahan yang senilai dengan 2/3 adalah...',
        opsiA: '4/6',
        opsiB: '3/4',
        opsiC: '4/9',
        jawabanBenar: 'A',
        penjelasan: 'Pembilang dan penyebut dikalikan 2 menghasilkan 4/6.',
        dibuatAi: false,
      },
      {
        templateId: templatePecahan.id,
        urutan: 6,
        teks: 'Hasil dari 2/3 × 3/4 adalah...',
        opsiA: '5/7',
        opsiB: '1/2',
        opsiC: '6/7',
        jawabanBenar: 'B',
        penjelasan: '2/3 × 3/4 = 6/12 = 1/2 setelah disederhanakan.',
        dibuatAi: false,
      },
    ],
  });
  console.log('Template "Pecahan Kelas 5" (6 soal) berhasil disiapkan.');

  // 4. Template Guru Demo: Sejarah Proklamasi (Mode Multi, 4 Soal)
  let templateProklamasi = await prisma.template.findFirst({
    where: { ownerId: guru.id, judul: 'Sejarah Proklamasi' },
  });

  if (!templateProklamasi) {
    templateProklamasi = await prisma.template.create({
      data: {
        ownerId: guru.id,
        judul: 'Sejarah Proklamasi',
        game: 'tarik_tambang',
        mode: 'multi',
        resmi: false,
      },
    });
  }

  await prisma.question.deleteMany({ where: { templateId: templateProklamasi.id } });
  await prisma.question.createMany({
    data: [
      {
        templateId: templateProklamasi.id,
        urutan: 1,
        teks: 'Teks proklamasi kemerdekaan Indonesia dibacakan pada tanggal...',
        opsiA: '17 Agustus 1945',
        opsiB: '18 Agustus 1945',
        opsiC: '1 Juni 1945',
        jawabanBenar: 'A',
        penjelasan: 'Proklamasi dibacakan pada hari Jumat, 17 Agustus 1945 pukul 10.00 WIB.',
        dibuatAi: false,
      },
      {
        templateId: templateProklamasi.id,
        urutan: 2,
        teks: 'Tokoh bangsa yang mengetik naskah proklamasi kemerdekaan adalah...',
        opsiA: 'Sukarni',
        opsiB: 'Sayuti Melik',
        opsiC: 'Fatmawati',
        jawabanBenar: 'B',
        penjelasan: 'Sayuti Melik mengetik naskah proklamasi yang disusun oleh Soekarno, Hatta, dan Achmad Soebardjo.',
        dibuatAi: false,
      },
      {
        templateId: templateProklamasi.id,
        urutan: 3,
        teks: 'Bendera pusaka merah putih pertama dijahit langsung oleh...',
        opsiA: 'Ibu Fatmawati',
        opsiB: 'S.K. Trimurti',
        opsiC: 'R.A. Kartini',
        jawabanBenar: 'A',
        penjelasan: 'Ibu Fatmawati menjahit bendera merah putih yang dikibarkan saat proklamasi.',
        dibuatAi: false,
      },
      {
        templateId: templateProklamasi.id,
        urutan: 4,
        teks: 'Pembacaan teks proklamasi berlangsung di kediaman Bung Karno yang beralamat di...',
        opsiA: 'Jl. Imam Bonjol No. 1',
        opsiB: 'Jl. Pegangsaan Timur No. 56',
        opsiC: 'Jl. Menteng Raya No. 31',
        jawabanBenar: 'B',
        penjelasan: 'Proklamasi dibacakan di teras depan Jl. Pegangsaan Timur No. 56 Jakarta Pusat.',
        dibuatAi: false,
      },
    ],
  });
  console.log('Template "Sejarah Proklamasi" (4 soal) berhasil disiapkan.');

  // 5. Tiga Template Resmi (resmi = true, ownerId = null, masing-masing minimal 5 soal)
  const templateResmiList = [
    {
      judul: 'Matematika Dasar: Operasi Hitung Campuran',
      game: 'tarik_tambang',
      mode: 'solo',
      questions: [
        {
          urutan: 1,
          teks: 'Berapakah hasil dari 15 + 25 × 2?',
          opsiA: '65',
          opsiB: '80',
          opsiC: '50',
          jawabanBenar: 'A',
          penjelasan: 'Operasi perkalian didahulukan: 25 × 2 = 50, lalu 15 + 50 = 65.',
        },
        {
          urutan: 2,
          teks: 'Hasil dari (50 - 20) : 5 adalah...',
          opsiA: '6',
          opsiB: '8',
          opsiC: '10',
          jawabanBenar: 'A',
          penjelasan: 'Operasi di dalam kurung didahulukan: 50 - 20 = 30, lalu 30 : 5 = 6.',
        },
        {
          urutan: 3,
          teks: 'Berapakah hasil perhitungan dari 12 × 4 - 18 : 2?',
          opsiA: '39',
          opsiB: '42',
          opsiC: '30',
          jawabanBenar: 'A',
          penjelasan: '12 × 4 = 48 dan 18 : 2 = 9. Jadi 48 - 9 = 39.',
        },
        {
          urutan: 4,
          teks: 'Hasil dari 100 - 25 × 3 + 15 adalah...',
          opsiA: '40',
          opsiB: '240',
          opsiC: '50',
          jawabanBenar: 'A',
          penjelasan: '25 × 3 = 75. Maka 100 - 75 + 15 = 25 + 15 = 40.',
        },
        {
          urutan: 5,
          teks: 'Berapakah nilai dari (16 + 24) × (10 - 7)?',
          opsiA: '120',
          opsiB: '100',
          opsiC: '140',
          jawabanBenar: 'A',
          penjelasan: '(16 + 24) = 40 dan (10 - 7) = 3. Maka 40 × 3 = 120.',
        },
      ],
    },
    {
      judul: 'Ilmu Pengetahuan Alam: Sistem Tata Surya',
      game: 'tarik_tambang',
      mode: 'multi',
      questions: [
        {
          urutan: 1,
          teks: 'Planet terdekat dari matahari dalam tata surya adalah...',
          opsiA: 'Merkurius',
          opsiB: 'Venus',
          opsiC: 'Mars',
          jawabanBenar: 'A',
          penjelasan: 'Merkurius adalah planet dengan orbit paling dekat dengan matahari.',
        },
        {
          urutan: 2,
          teks: 'Planet yang dikenal sebagai "Planet Merah" adalah...',
          opsiA: 'Jupiter',
          opsiB: 'Mars',
          opsiC: 'Saturnus',
          jawabanBenar: 'B',
          penjelasan: 'Mars tampak kemerahan karena permukaan tanahnya kaya akan besi oksida (karat).',
        },
        {
          urutan: 3,
          teks: 'Planet terbesar dalam tata surya kita adalah...',
          opsiA: 'Saturnus',
          opsiB: 'Jupiter',
          opsiC: 'Neptunus',
          jawabanBenar: 'B',
          penjelasan: 'Jupiter adalah planet raksasa gas dengan massa dan ukuran terbesar.',
        },
        {
          urutan: 4,
          teks: 'Pusat tata surya yang dikelilingi oleh planet-planet adalah...',
          opsiA: 'Bumi',
          opsiB: 'Matahari',
          opsiC: 'Bulan',
          jawabanBenar: 'B',
          penjelasan: 'Teori heliosentris membuktikan bahwa matahari adalah pusat tata surya kita.',
        },
        {
          urutan: 5,
          teks: 'Benda langit yang mengelilingi planet disebut...',
          opsiA: 'Satelit',
          opsiB: 'Komet',
          opsiC: 'Asteroid',
          jawabanBenar: 'A',
          penjelasan: 'Satelit alami (seperti Bulan bagi Bumi) bergerak mengelilingi planet.',
        },
      ],
    },
    {
      judul: 'Bahasa Indonesia: Antonim dan Sinonim',
      game: 'tarik_tambang',
      mode: 'solo',
      questions: [
        {
          urutan: 1,
          teks: 'Antonim (lawan kata) dari kata "LUAS" adalah...',
          opsiA: 'Sempit',
          opsiB: 'Besar',
          opsiC: 'Panjang',
          jawabanBenar: 'A',
          penjelasan: 'Lawan kata dari sesuatu yang luas adalah sempit.',
        },
        {
          urutan: 2,
          teks: 'Sinonim (persamaan kata) dari kata "GEMBIRA" adalah...',
          opsiA: 'Sedih',
          opsiB: 'Senang',
          opsiC: 'Marah',
          jawabanBenar: 'B',
          penjelasan: 'Gembira memiliki makna yang sama dengan senang atau bahagia.',
        },
        {
          urutan: 3,
          teks: 'Antonim dari kata "KOLOT" adalah...',
          opsiA: 'Modern',
          opsiB: 'Kuno',
          opsiC: 'Lama',
          jawabanBenar: 'A',
          penjelasan: 'Kolot berarti berpikiran kuno, sehingga lawan katanya adalah modern.',
        },
        {
          urutan: 4,
          teks: 'Sinonim dari kata "PANDAI" adalah...',
          opsiA: 'Pintar',
          opsiB: 'Rajin',
          opsiC: 'Tekun',
          jawabanBenar: 'A',
          penjelasan: 'Kata pandai memiliki arti yang sepadan dengan pintar atau cerdas.',
        },
        {
          urutan: 5,
          teks: 'Antonim dari kata "BERANI" adalah...',
          opsiA: 'Gagah',
          opsiB: 'Takut',
          opsiC: 'Kuat',
          jawabanBenar: 'B',
          penjelasan: 'Lawan dari sikap berani adalah takut atau penakut.',
        },
      ],
    },
    {
      judul: 'Panjat Pinang 17-an: Pengetahuan Umum Nusantara',
      game: 'panjat_pinang',
      mode: 'multi',
      questions: [
        {
          urutan: 1,
          teks: 'Semboyan resmi bangsa Indonesia yang terdapat pada lambang Garuda Pancasila adalah...',
          opsiA: 'Bhinneka Tunggal Ika',
          opsiB: 'Tut Wuri Handayani',
          opsiC: 'Ing Ngarsa Sung Tuladha',
          jawabanBenar: 'A',
          penjelasan: 'Bhinneka Tunggal Ika berarti berbeda-beda tetapi tetap satu jua.',
        },
        {
          urutan: 2,
          teks: 'Lagu kebangsaan Indonesia Raya pertama kali diciptakan oleh...',
          opsiA: 'Ismail Marzuki',
          opsiB: 'W.R. Supratman',
          opsiC: 'Ibu Sud',
          jawabanBenar: 'B',
          penjelasan: 'Wage Rudolf Supratman menciptakan dan memperdengarkan Indonesia Raya pada Kongres Pemuda II.',
        },
        {
          urutan: 3,
          teks: 'Pulau terluas yang dimiliki oleh negara Indonesia adalah...',
          opsiA: 'Pulau Jawa',
          opsiB: 'Pulau Kalimantan',
          opsiC: 'Pulau Bali',
          jawabanBenar: 'B',
          penjelasan: 'Kalimantan adalah pulau terbesar ketiga di dunia dan pulau terbesar yang wilayahnya dimiliki Indonesia.',
        },
        {
          urutan: 4,
          teks: 'Lomba memanjat batang pinang yang dilumuri pelumas pada perayaan 17 Agustus disebut...',
          opsiA: 'Tarik Tambang',
          opsiB: 'Balap Karung',
          opsiC: 'Panjat Pinang',
          jawabanBenar: 'C',
          penjelasan: 'Panjat Pinang merupakan lomba tradisional 17 Agustus untuk memperebutkan hadiah di puncak tiang.',
        },
        {
          urutan: 5,
          teks: 'Dasar negara Republik Indonesia adalah...',
          opsiA: 'Pancasila',
          opsiB: 'Sumpah Pemuda',
          opsiC: 'Proklamasi',
          jawabanBenar: 'A',
          penjelasan: 'Pancasila adalah dasar negara dan ideologi bangsa Indonesia.',
        },
      ],
    },
    {
      judul: 'Balap Karung 17-an: Cerdas Cermat Merdeka',
      game: 'balap_karung',
      mode: 'multi',
      questions: [
        {
          urutan: 1,
          teks: 'Bendera kebangsaan negara Indonesia bernama...',
          opsiA: 'Sang Saka Merah Putih',
          opsiB: 'Dwi Warna Biru Putih',
          opsiC: 'Panji Nusantara',
          jawabanBenar: 'A',
          penjelasan: 'Sang Saka Merah Putih adalah sebutan kehormatan untuk bendera negara Indonesia.',
        },
        {
          urutan: 2,
          teks: 'Siapakah bapak Proklamator kemerdekaan Indonesia bersama Ir. Soekarno?',
          opsiA: 'Ki Hajar Dewantara',
          opsiB: 'Drs. Mohammad Hatta',
          opsiC: 'Jenderal Sudirman',
          jawabanBenar: 'B',
          penjelasan: 'Ir. Soekarno dan Drs. Mohammad Hatta adalah dwitunggal Proklamator RI.',
        },
        {
          urutan: 3,
          teks: 'Hasil dari 125 + 75 - 50 adalah...',
          opsiA: '150',
          opsiB: '175',
          opsiC: '200',
          jawabanBenar: 'A',
          penjelasan: '125 + 75 = 200, kemudian 200 - 50 = 150.',
        },
        {
          urutan: 4,
          teks: 'Tanggal berapakah Hari Kemerdekaan Republik Indonesia diperingati setiap tahun?',
          opsiA: '10 November',
          opsiB: '28 Oktober',
          opsiC: '17 Agustus',
          jawabanBenar: 'C',
          penjelasan: 'Proklamasi Kemerdekaan Indonesia dibacakan pada tanggal 17 Agustus 1945.',
        },
        {
          urutan: 5,
          teks: 'Planet terbesar di tata surya kita adalah...',
          opsiA: 'Mars',
          opsiB: 'Jupiter',
          opsiC: 'Saturnus',
          jawabanBenar: 'B',
          penjelasan: 'Jupiter adalah planet gas raksasa dan terbesar di tata surya.',
        },
      ],
    },
  ];

  for (const t of templateResmiList) {
    let tmpl = await prisma.template.findFirst({
      where: { resmi: true, judul: t.judul },
    });

    if (!tmpl) {
      tmpl = await prisma.template.create({
        data: {
          ownerId: null,
          judul: t.judul,
          game: t.game,
          mode: t.mode,
          resmi: true,
        },
      });
    }

    await prisma.question.deleteMany({ where: { templateId: tmpl.id } });
    await prisma.question.createMany({
      data: t.questions.map((q) => ({
        templateId: tmpl.id,
        urutan: q.urutan,
        teks: q.teks,
        opsiA: q.opsiA,
        opsiB: q.opsiB,
        opsiC: q.opsiC,
        jawabanBenar: q.jawabanBenar,
        penjelasan: q.penjelasan,
        dibuatAi: false,
      })),
    });
    console.log(`Template resmi "${t.judul}" siap.`);
  }

  console.log('Proses seeding selesai dengan sukses!');
}

main()
  .catch((e) => {
    console.error('Terjadi kesalahan pada seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
