-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_session_players" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionId" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "posisi" INTEGER NOT NULL DEFAULT 0,
    "keseimbangan" INTEGER NOT NULL DEFAULT 100,
    "jumlahJatuh" INTEGER NOT NULL DEFAULT 0,
    "efekAktif" TEXT NOT NULL DEFAULT '{}',
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
INSERT INTO "new_session_players" ("createdAt", "id", "jumlahJawab", "nama", "poinBonus", "posisi", "riwayatJawaban", "riwayatPosisi", "riwayatRintangan", "selesaiPada", "sessionId", "status", "streakSaatIni", "streakTertinggi", "totalBenar", "totalSalah", "totalWaktuJawabMs", "updatedAt", "waktuSelesaiMs") SELECT "createdAt", "id", "jumlahJawab", "nama", "poinBonus", "posisi", "riwayatJawaban", "riwayatPosisi", "riwayatRintangan", "selesaiPada", "sessionId", "status", "streakSaatIni", "streakTertinggi", "totalBenar", "totalSalah", "totalWaktuJawabMs", "updatedAt", "waktuSelesaiMs" FROM "session_players";
DROP TABLE "session_players";
ALTER TABLE "new_session_players" RENAME TO "session_players";
CREATE INDEX "session_players_sessionId_idx" ON "session_players"("sessionId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
