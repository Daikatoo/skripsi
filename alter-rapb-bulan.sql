-- Skrip untuk menambahkan kolom bulan ke tabel rapb
-- Jalankan di Supabase SQL Editor

ALTER TABLE rapb ADD COLUMN IF NOT EXISTS bulan INT DEFAULT 0;

-- Update kebijakan check: 0 berarti "Semua Bulan/Tahunan", 1-12 berarti spesifik bulan
ALTER TABLE rapb DROP CONSTRAINT IF EXISTS rapb_bulan_check;
ALTER TABLE rapb ADD CONSTRAINT rapb_bulan_check CHECK (bulan BETWEEN 0 AND 12);

-- Opsional: Set existing records ke 0 (Tahunan)
UPDATE rapb SET bulan = 0 WHERE bulan IS NULL;
