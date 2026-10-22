-- ==============================================================================
-- UPDATE MASTER DEPARTEMEN DARI DEPARTEMEN(AutoRecovered).xls
-- Jalankan skrip ini di SQL Editor Supabase (bisa lewat browser Opera GX Anda)
-- ==============================================================================

-- 1. Tambah kolom baru jika belum ada
ALTER TABLE master_unit ADD COLUMN IF NOT EXISTS department_no TEXT;
ALTER TABLE master_unit ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE master_unit ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE master_unit ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Active';

-- 2. Constraint category: hanya boleh 'prodi' atau 'unit'
ALTER TABLE master_unit DROP CONSTRAINT IF EXISTS master_unit_category_check;
ALTER TABLE master_unit ADD CONSTRAINT master_unit_category_check CHECK (category IN ('prodi', 'unit'));

-- 3. Update data lama yang sedang direferensikan oleh profiles agar ID-nya tidak berubah
-- (Informatika dan Rektorat)
UPDATE master_unit 
SET department_no = 'WK-014', name = 'Informatika', kode = 'WK-014', nama = 'Informatika', category = 'prodi', tipe = 'prodi', status = 'Active'
WHERE id IN (SELECT DISTINCT unit_id FROM profiles WHERE unit_id IS NOT NULL) 
  AND (nama ILIKE '%informatika%' OR kode ILIKE '%inf%');

UPDATE master_unit 
SET department_no = 'WK-031', name = 'Rektorat', kode = 'WK-031', nama = 'Rektorat', category = 'unit', tipe = 'unit', status = 'Active'
WHERE id IN (SELECT DISTINCT unit_id FROM profiles WHERE unit_id IS NOT NULL) 
  AND (nama ILIKE '%rektorat%' OR kode ILIKE '%rek%');

-- 4. Hapus data departemen lama yang TIDAK direferensikan oleh tabel lain
-- (Melindungi data yang dipakai profiles, rapb, pengajuan, realisasi)
DELETE FROM master_unit
WHERE id NOT IN (
    SELECT DISTINCT unit_id FROM profiles WHERE unit_id IS NOT NULL
    UNION
    SELECT DISTINCT unit_id FROM rapb WHERE unit_id IS NOT NULL
    UNION
    SELECT DISTINCT unit_id FROM pengajuan WHERE unit_id IS NOT NULL
    UNION
    SELECT DISTINCT unit_id FROM realisasi WHERE unit_id IS NOT NULL
);

-- 5. Masukkan atau perbarui 35 departemen persis sesuai file DEPARTEMEN(AutoRecovered).xls
-- Menggunakan temporary table untuk upsert bersih
CREATE TEMP TABLE temp_dept (
    dept_no TEXT,
    dept_name TEXT,
    dept_cat TEXT,
    dept_status TEXT
) ON COMMIT DROP;

INSERT INTO temp_dept (dept_no, dept_name, dept_cat, dept_status) VALUES
-- CATEGORY = prodi (Akuntansi sampai Mandarin S1)
('WK-002', 'Akuntansi', 'prodi', 'Active'),
('WK-003', 'Arsitek', 'prodi', 'Active'),
('WK-010', 'Elektro', 'prodi', 'Active'),
('WK-014', 'Informatika', 'prodi', 'Active'),
('WK-016', 'Inggris S1', 'prodi', 'Active'),
('WK-018', 'Komp. Akun', 'prodi', 'Active'),
('WK-023', 'Manajemen', 'prodi', 'Active'),
('WK-025', 'Mandarin S1', 'prodi', 'Active'),

-- CATEGORY = unit (Semua data lainnya)
('WK-028', 'Probis', 'unit', 'Active'),
('WK-031', 'Rektorat', 'unit', 'Active'),
('WK-001', 'MCC', 'unit', 'Active'),
('WK-004', 'BAA', 'unit', 'Active'),
('WK-005', 'BAK', 'unit', 'Active'),
('WK-007', 'Dekan Bahasa', 'unit', 'Active'),
('WK-008', 'Dekan Ekonomi', 'unit', 'Active'),
('WK-009', 'Dekan Teknik', 'unit', 'Active'),
('WK-011', 'HRD', 'unit', 'Active'),
('WK-012', 'Humas', 'unit', 'Active'),
('WK-013', 'ICT', 'unit', 'Active'),
('WK-017', 'Keuangan', 'unit', 'Active'),
('WK-019', 'Lab. Bahasa', 'unit', 'Active'),
('WK-020', 'LPK', 'unit', 'Active'),
('WK-021', 'PPM', 'unit', 'Active'),
('WK-022', 'LPPM', 'unit', 'Active'),
('WK-026', 'ME', 'unit', 'Active'),
('WK-027', 'Perpustakaan', 'unit', 'Active'),
('WK-029', 'Pusat Karir', 'unit', 'Active'),
('WK-030', 'Rektor', 'unit', 'Active'),
('WK-032', 'Satpam', 'unit', 'Active'),
('WK-034', 'WR 1', 'unit', 'Active'),
('WK-035', 'WR 2', 'unit', 'Active'),
('WK-037', 'Sekretariat Rektorat', 'unit', 'Active'),
('WK-038', 'Lemkerma', 'unit', 'Active'),
('WK-039', 'Koperasi', 'unit', 'Active'),
('WK-033', 'Sipil', 'unit', 'Active');

-- Update baris yang sudah ada (berdasarkan department_no atau nama)
UPDATE master_unit m
SET 
    department_no = t.dept_no,
    name = t.dept_name,
    category = t.dept_cat,
    status = t.dept_status,
    kode = t.dept_no,
    nama = t.dept_name,
    tipe = t.dept_cat
FROM temp_dept t
WHERE m.department_no = t.dept_no OR m.nama = t.dept_name;

-- Insert baris yang belum ada
INSERT INTO master_unit (department_no, name, category, status, kode, nama, tipe)
SELECT t.dept_no, t.dept_name, t.dept_cat, t.dept_status, t.dept_no, t.dept_name, t.dept_cat
FROM temp_dept t
WHERE NOT EXISTS (
    SELECT 1 FROM master_unit m WHERE m.department_no = t.dept_no OR m.nama = t.dept_name
);

-- 6. Pasang constraint UNIQUE pada department_no
ALTER TABLE master_unit DROP CONSTRAINT IF EXISTS master_unit_department_no_unique;
ALTER TABLE master_unit ADD CONSTRAINT master_unit_department_no_unique UNIQUE (department_no);

-- 7. Verifikasi hasil
SELECT department_no, name, category, status, kode, nama, tipe FROM master_unit ORDER BY category DESC, department_no ASC;
