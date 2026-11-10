-- AlterTable
ALTER TABLE "sessions" ADD COLUMN "konfigurasi" TEXT;

-- CreateTable
CREATE TABLE "session_players" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionId" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "posisi" INTEGER NOT NULL DEFAULT 0,
    "poinBonus" INTEGER NOT NULL DEFAULT 0,
    "totalBenar" INTEGER NOT NULL DEFAULT 0,
    "totalSalah" INTEGER NOT NULL DEFAULT 0,
    "streakSaatIni" INTEGER NOT NULL DEFAULT 0,
    "streakTertinggi" INTEGER NOT NULL DEFAULT 0,
    "totalWaktuJawabMs" INTEGER NOT NULL DEFAULT 0,
    "jumlahJawab" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'bermain',
    "waktuSelesaiMs" INTEGER,
    "selesaiPada" DATETIME,
    "riwayatPosisi" TEXT NOT NULL DEFAULT '[]',
    "riwayatRintangan" TEXT NOT NULL DEFAULT '[]',
    "riwayatJawaban" TEXT NOT NULL DEFAULT '[]',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "session_players_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "sessions" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "session_players_sessionId_idx" ON "session_players"("sessionId");
