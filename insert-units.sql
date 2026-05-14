-- Skrip untuk memasukkan daftar Unit/Divisi ke dalam master_unit
-- Jalankan di Supabase SQL Editor

INSERT INTO master_unit (kode, nama, tipe) VALUES
('P-AKN', 'Akuntansi', 'prodi'),
('P-ARS', 'Arsitek', 'prodi'),
('P-ELK', 'Elektro', 'prodi'),
('P-INF', 'Informatika', 'prodi'),
('P-ING', 'Inggris S1', 'prodi'),
('P-KMA', 'Komp. Akun', 'prodi'),
('P-MAN', 'Manajemen', 'prodi'),
('P-MDR', 'Mandarin S1', 'prodi'),
('P-SPL', 'Sipil', 'prodi'),

('F-BHS', 'Dekan Bahasa', 'fakultas'),
('F-EKM', 'Dekan Ekonomi', 'fakultas'),
('F-TKN', 'Dekan Teknik', 'fakultas'),

('R-REK', 'Rektorat', 'rektorat'),
('R-RKT', 'Rektor', 'rektorat'),
('R-WR1', 'WR 1', 'rektorat'),
('R-WR2', 'WR 2', 'rektorat'),
('R-SEC', 'Sekretariat Rektorat', 'rektorat'),

('U-PRB', 'Probis', 'unit'),
('U-MCC', 'MCC', 'unit'),
('U-BAA', 'BAA', 'unit'),
('U-BAK', 'BAK', 'unit'),
('U-HRD', 'HRD', 'unit'),
('U-HMS', 'Humas', 'unit'),
('U-ICT', 'ICT', 'unit'),
('U-KEU', 'Keuangan', 'unit'),
('U-LAB', 'Lab. Bahasa', 'unit'),
('U-LPK', 'LPK', 'unit'),
('U-PPM', 'PPM', 'unit'),
('U-LPM', 'LPPM', 'unit'),
('U-MEE', 'ME', 'unit'),
('U-PER', 'Perpustakaan', 'unit'),
('U-PKR', 'Pusat Karir', 'unit'),
('U-SAT', 'Satpam', 'unit'),
('U-LEM', 'Lemkerma', 'unit'),
('U-KOP', 'Koperasi', 'unit')
ON CONFLICT (kode) DO NOTHING;
