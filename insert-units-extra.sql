-- Tambahan unit yang belum ada di master_unit
-- Jalankan di Supabase SQL Editor

INSERT INTO master_unit (kode, nama, tipe) VALUES
-- Fakultas Ekonomi
('F-FEK', 'Dekan FE', 'fakultas'),
-- Fakultas Teknik  
('F-FTK', 'Dekan FT', 'fakultas'),
-- Fakultas Sastra & Pendidikan Bahasa
('F-FSP', 'Dekan FSPB', 'fakultas'),
('P-SIN', 'Prodi Sastra Inggris', 'prodi'),
-- Unit tambahan
('U-MKT', 'Marketing', 'unit'),
('U-CCM', 'Corp Com', 'unit'),
('U-HRR', 'HR', 'unit'),
('U-GAA', 'GA', 'unit'),
('U-CKN', 'Cadangan Kas Non Budget', 'unit')
ON CONFLICT (kode) DO NOTHING;
