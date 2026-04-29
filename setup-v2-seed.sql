-- =============================================
-- SEED DATA Part 2: Master Unit + Bank + CoA
-- Jalankan SETELAH setup-v2-coa.sql
-- =============================================

-- ========== MASTER UNIT ==========
INSERT INTO master_unit (kode,nama,tipe,parent_id,urutan) VALUES ('REK','Rektorat','rektorat',NULL,1) ON CONFLICT(kode) DO NOTHING;
INSERT INTO master_unit (kode,nama,tipe,parent_id,urutan) SELECT v.k,v.n,'rektorat',r.id,v.u FROM (VALUES('WR1','Wakil Rektor 1',2),('WR2','Wakil Rektor 2',3),('SEK','Sekretariat',4)) AS v(k,n,u) CROSS JOIN master_unit r WHERE r.kode='REK' ON CONFLICT(kode) DO NOTHING;

INSERT INTO master_unit (kode,nama,tipe,parent_id,urutan) VALUES ('FE','Fakultas Ekonomi','fakultas',NULL,10) ON CONFLICT(kode) DO NOTHING;
INSERT INTO master_unit (kode,nama,tipe,parent_id,urutan) SELECT v.k,v.n,'prodi',f.id,v.u FROM (VALUES('FE-MJ','Manajemen',11),('FE-AK','Akuntansi',12)) AS v(k,n,u) CROSS JOIN master_unit f WHERE f.kode='FE' ON CONFLICT(kode) DO NOTHING;

INSERT INTO master_unit (kode,nama,tipe,parent_id,urutan) VALUES ('FT','Fakultas Teknik','fakultas',NULL,20) ON CONFLICT(kode) DO NOTHING;
INSERT INTO master_unit (kode,nama,tipe,parent_id,urutan) SELECT v.k,v.n,'prodi',f.id,v.u FROM (VALUES('FT-IF','Informatika',21),('FT-EL','Elektro',22),('FT-SP','Sipil',23),('FT-AR','Arsitektur',24)) AS v(k,n,u) CROSS JOIN master_unit f WHERE f.kode='FT' ON CONFLICT(kode) DO NOTHING;

INSERT INTO master_unit (kode,nama,tipe,parent_id,urutan) VALUES ('FSB','Fakultas Sastra & Bahasa','fakultas',NULL,30) ON CONFLICT(kode) DO NOTHING;
INSERT INTO master_unit (kode,nama,tipe,parent_id,urutan) SELECT v.k,v.n,'prodi',f.id,v.u FROM (VALUES('FSB-SI','Sastra Inggris',31),('FSB-MN','Mandarin',32)) AS v(k,n,u) CROSS JOIN master_unit f WHERE f.kode='FSB' ON CONFLICT(kode) DO NOTHING;

INSERT INTO master_unit (kode,nama,tipe,parent_id,urutan) VALUES
  ('PERP','Perpustakaan','unit',NULL,40),('ICT','ICT','unit',NULL,41),
  ('MCC','Marketing & Corporate Communication','unit',NULL,42),
  ('BAA','BAA','unit',NULL,43),('BAK','BAK','unit',NULL,44),
  ('HRD','HR','unit',NULL,45),('GA','GA','unit',NULL,46),
  ('LPPM','LPPM','unit',NULL,47),('PPM','PPM','unit',NULL,48)
ON CONFLICT(kode) DO NOTHING;

-- ========== BANK ACCOUNTS ==========
INSERT INTO bank_accounts (id,nama_rekening,kode_sistem,is_default_ops,is_default_gaji) VALUES
  ('12001','Bank OCBC NISP 054010700122','OCBC_NISP_0540',false,false),
  ('12002','Bank BCA 0103882009','BCA_0103',false,false),
  ('12003','Bank BNI Hibah 6003008899','BNI_HIBAH_6003',false,false),
  ('12004','Bank BCA Galaxy 7880136636','BCA_GALAXY_7880',true,false),
  ('12005','Bank BCA UG 7880922992','BCA_UG_7880',false,false),
  ('12006','Bank OCBC NISP PHP-PTS','OCBC_PHP',false,false),
  ('12007','Deposito NISP','DEP_NISP',false,false),
  ('12008','Deposito Maspion','DEP_MASPION',false,false),
  ('12009','Deposito Nobu','DEP_NOBU',false,false),
  ('12010','Bank BCA RMB 7880322332','BCA_RMB_7880',false,false),
  ('12011','Bank Maspion 1016101008','MASPION_1016',false,true),
  ('12012','Bank Maspion VA 1012038883','MASPION_VA_1012',false,false),
  ('12013','Deposito Bank Capital','DEP_CAPITAL',false,false),
  ('12014','Bank Maspion 1286001234','MASPION_1286',false,false),
  ('12015','Bank BRI 017201003061309','BRI_0172',false,false),
  ('12016','Bank BCA MABA 8725166555','BCA_MABA_8725',false,false),
  ('12017','Bank BCA FT 8725564666','BCA_FT_8725',false,false),
  ('12018','Bank BCA 8725684777','BCA_8725',false,false),
  ('12019','Bank BCA Genteng VA 5093670000','BCA_GENTENG_VA',false,false),
  ('12020','Bank BCA Genteng OP 5093671111','BCA_GENTENG_OP',false,false),
  ('12021','Bank Nobu 70130171400','NOBU_7013',false,false),
  ('12022','Deposito Mayapada','DEP_MAYAPADA',false,false)
ON CONFLICT(id) DO NOTHING;

-- ========== COA SEED: HEADERS ==========
INSERT INTO coa_accounts (id,nama_akun,tipe_akun,level,parent_id,is_header) VALUES
  ('41000','Pendapatan Mahasiswa','Revenue',1,NULL,true),
  ('42000','Pendapatan Lain Mahasiswa','Revenue',1,NULL,true),
  ('43000','Pendapatan Lain-Lain','Revenue',1,NULL,true),
  ('44000','Pendapatan Usaha Lain','Revenue',1,NULL,true),
  ('45000','Penerimaan Hibah','Revenue',1,NULL,true),
  ('51110','Beban Gaji','Expense',1,NULL,true),
  ('51120','Beban Akademik-Operasional','Expense',1,NULL,true),
  ('51130','Beban Kantor Umum','Expense',1,NULL,true),
  ('51140','Beban Pemeliharaan','Expense',1,NULL,true),
  ('51150','Beban Marketing','Expense',1,NULL,true),
  ('51160','Beban Asuransi','Expense',1,NULL,true),
  ('51170','Beban Penghapusan Piutang','Expense',1,NULL,true),
  ('51190','Beban Imbalan Pasca Kerja','Expense',1,NULL,true),
  ('51191','Beban Cadangan Pensiun & THR','Expense',1,NULL,true),
  ('51210','Beban Penyusutan','Expense',1,NULL,true),
  ('71100','Pengeluaran Hibah','Other Expense',1,NULL,true)
ON CONFLICT(id) DO NOTHING;

-- ========== COA SEED: PENDAPATAN ==========
INSERT INTO coa_accounts (id,nama_akun,tipe_akun,level,parent_id,is_header) VALUES
  ('41001','Pendapatan Uang Kuliah Mahasiswa','Revenue',3,'41000',false),
  ('41002','Pendapatan Daftar Ulang','Revenue',3,'41000',false),
  ('41003','Pendapatan Uang Gedung','Revenue',3,'41000',false),
  ('41004','Pendapatan DN-LN','Revenue',3,'41000',false),
  ('42001','Denda Mahasiswa','Revenue',3,'42000',false),
  ('42002','Pendapatan UPMB','Revenue',3,'42000',false),
  ('42003','Pendapatan Denda Perpustakaan','Revenue',3,'42000',false),
  ('42004','Pendapatan Semester Pendek','Revenue',3,'42000',false),
  ('42005','Pendapatan Sidang / Sidang Ulang TA','Revenue',3,'42000',false),
  ('42006','Pendapatan Sertifikasi','Revenue',3,'42000',false),
  ('42007','Pendapatan Skripsi','Revenue',3,'42000',false),
  ('42008','Pendapatan KKN','Revenue',3,'42000',false),
  ('42009','Pendapatan Wisuda','Revenue',3,'42000',false),
  ('42010','Pendapatan KHS / KRS / Translate','Revenue',3,'42000',false),
  ('42011','Pendapatan TOEFL / TOEIC','Revenue',3,'42000',false),
  ('42012','Pendapatan Virtual Account','Revenue',3,'42000',false),
  ('42013','Pendapatan Matrikulasi','Revenue',3,'42000',false),
  ('42014','Pendapatan Mahasiswa Lama','Revenue',3,'42000',false),
  ('42015','Pendapatan Kemahasiswaan','Revenue',3,'42000',false),
  ('42016','Pendapatan Alih Studi','Revenue',3,'42000',false),
  ('42017','Pendapatan Modul / Buku Ajar','Revenue',3,'42000',false),
  ('43001','Pendapatan EDC','Revenue',3,'43000',false),
  ('43002','Pendapatan Formulir','Revenue',3,'43000',false),
  ('43003','Pendapatan Bunga dan Deposito','Revenue',3,'43000',false),
  ('43004','Pendapatan Sanksi Kerja','Revenue',3,'43000',false),
  ('43005','Pendapatan Sewa','Revenue',3,'43000',false),
  ('43006','Pendapatan Parkir','Revenue',3,'43000',false),
  ('43007','Pendapatan Sanksi Magang','Revenue',3,'43000',false),
  ('43008','Pendapatan Lain-Lain','Revenue',3,'43000',false),
  ('44001','Pendapatan Kursus Bahasa Inggris','Revenue',3,'44000',false),
  ('44002','Pendapatan Kursus Bahasa Mandarin','Revenue',3,'44000',false),
  ('44003','Pendapatan Kursus Prodi','Revenue',3,'44000',false),
  ('45001','Penerimaan Hibah','Revenue',3,'45000',false)
ON CONFLICT(id) DO NOTHING;

-- ========== COA SEED: BEBAN GAJI (51110) ==========
INSERT INTO coa_accounts (id,nama_akun,tipe_akun,level,parent_id,is_header) VALUES
  ('511101','Gaji Pokok Dosen Tetap & THR','Expense',3,'51110',false),
  ('511102','Gaji Pokok Non Edukatif & THR','Expense',3,'51110',false),
  ('511103','Gaji Dosen LB-Pagi','Expense',3,'51110',false),
  ('511104','Gaji Dosen LB-Malam','Expense',3,'51110',false),
  ('511105','Insentif Dosen Tetap','Expense',3,'51110',false),
  ('511106','Insentif Non Edukatif','Expense',3,'51110',false),
  ('511107','Gaji Semester Pendek','Expense',3,'51110',false),
  ('511108','Gaji Native','Expense',3,'51110',false),
  ('511109','Gaji Outsourcing','Expense',3,'51110',false),
  ('511110','Gaji Kerjasama','Expense',3,'51110',false),
  ('511111','Gaji Sertifikasi','Expense',3,'51110',false)
ON CONFLICT(id) DO NOTHING;

-- ========== COA SEED: BEBAN AKADEMIK-OPS (51120) ==========
INSERT INTO coa_accounts (id,nama_akun,tipe_akun,level,parent_id,is_header) VALUES
  ('511201','Perpustakaan / Buku / Majalah','Expense',3,'51120',false),
  ('511202','Raker / Rapat','Expense',3,'51120',false),
  ('511203','Administrasi Pendidikan / Perkuliahan','Expense',3,'51120',false),
  ('511204','Program Jurusan / Rektorat','Expense',3,'51120',false),
  ('511205','Akreditasi (Jurusan)','Expense',3,'51120',false),
  ('511206','Peralatan / Alat Peraga','Expense',3,'51120',false),
  ('511207','Laboratorium / Pengelolaan Lab','Expense',3,'51120',false),
  ('511208','Iuran Aptisi / Keanggotaan','Expense',3,'51120',false),
  ('511209','Lain-Lain Akademik','Expense',3,'51120',false),
  ('511210','Seminar / Pelatihan / Studium Generale','Expense',3,'51120',false),
  ('511212','Perlengkapan Pengajaran / ATK','Expense',3,'51120',false),
  ('511213','Penulisan Buku / Pemakalah','Expense',3,'51120',false),
  ('511214','Biaya Internet','Expense',3,'51120',false),
  ('511216','Biaya Penelitian','Expense',3,'51120',false),
  ('511217','Campus Agreement / MOU Prodi','Expense',3,'51120',false),
  ('511218','Beban Kegiatan Wisuda','Expense',3,'51120',false),
  ('511219','Beban Kegiatan Sertifikasi','Expense',3,'51120',false),
  ('511220','Beban Kegiatan KKN','Expense',3,'51120',false),
  ('511221','Beban Kegiatan Ekskursi / Studi Tour','Expense',3,'51120',false),
  ('511222','Beban Kegiatan UPMB / PEMBA','Expense',3,'51120',false),
  ('511225','Beban Visa / Ijin & Lain Native','Expense',3,'51120',false),
  ('511226','Beban Kegiatan UAS / UTS','Expense',3,'51120',false),
  ('511229','Beban Kegiatan Sidang TA','Expense',3,'51120',false),
  ('511230','Beban Kegiatan Psikotest','Expense',3,'51120',false),
  ('511231','Beban Kegiatan Pembuatan KTM','Expense',3,'51120',false),
  ('511232','Beban Kegiatan ORMAWA','Expense',3,'51120',false),
  ('511233','Beban Kegiatan Pembuatan Modul','Expense',3,'51120',false),
  ('511234','Beban Kegiatan Lomba / Event','Expense',3,'51120',false),
  ('511235','Beban Kegiatan Konsumsi Probis','Expense',3,'51120',false),
  ('511236','Penghargaan / Tropi / Plakat','Expense',3,'51120',false),
  ('511237','Beban Kegiatan Beasiswa','Expense',3,'51120',false),
  ('511239','Beban Kegiatan TOEFL / TOEIC','Expense',3,'51120',false),
  ('511242','Beban Perjalanan Dinas','Expense',3,'51120',false),
  ('511243','Beban Kerjasama','Expense',3,'51120',false)
ON CONFLICT(id) DO NOTHING;

-- ========== COA SEED: BEBAN KANTOR UMUM (51130) ==========
INSERT INTO coa_accounts (id,nama_akun,tipe_akun,level,parent_id,is_header) VALUES
  ('511301','ATK & Benda Pos','Expense',3,'51130',false),
  ('511302','PDAM','Expense',3,'51130',false),
  ('511303','PLN / Listrik','Expense',3,'51130',false),
  ('511304','Telepon / Pulsa','Expense',3,'51130',false),
  ('511305','Koran','Expense',3,'51130',false),
  ('511306','Sumbangan / Pernikahan / Uang Duka','Expense',3,'51130',false),
  ('511307','Iuran RT','Expense',3,'51130',false),
  ('511308','Konsumsi','Expense',3,'51130',false),
  ('511309','BBM / Tol / Parkir / Ekspedisi','Expense',3,'51130',false),
  ('511310','Fotocopy Unit / Cetak / Jilid','Expense',3,'51130',false),
  ('511311','Jasa Konsultan','Expense',3,'51130',false),
  ('511312','Kegiatan Hari Besar / Parcel','Expense',3,'51130',false),
  ('511313','Peralatan Kantor / RT','Expense',3,'51130',false),
  ('511314','Lain-Lain Non Akademik','Expense',3,'51130',false),
  ('511315','Entertainment','Expense',3,'51130',false),
  ('511316','Administrasi Bank','Expense',3,'51130',false),
  ('511325','Beban PPH 4 Ayat 2','Expense',3,'51130',false)
ON CONFLICT(id) DO NOTHING;

-- ========== COA SEED: BEBAN LAINNYA ==========
INSERT INTO coa_accounts (id,nama_akun,tipe_akun,level,parent_id,is_header) VALUES
  ('511401','Pemeliharaan Bangunan','Expense',3,'51140',false),
  ('511402','Pemeliharaan Peralatan','Expense',3,'51140',false),
  ('511403','Pemeliharaan Kendaraan','Expense',3,'51140',false),
  ('511404','Pemeliharaan Kebersihan','Expense',3,'51140',false),
  ('511501','Program PMB / Marketing','Expense',3,'51150',false),
  ('511502','Beban Cetak / Souvenir Marketing','Expense',3,'51150',false),
  ('511601','BPJS Tenaga Kerja','Expense',3,'51160',false),
  ('511602','BPJS Kesehatan','Expense',3,'51160',false),
  ('511603','DPLK & Manulife','Expense',3,'51160',false),
  ('511701','Penghapusan Piutang Mahasiswa','Expense',3,'51170',false),
  ('511901','Beban Imbalan Pasca Kerja','Expense',3,'51190',false),
  ('511911','Beban Cadangan Pensiun','Expense',3,'51191',false),
  ('511912','Beban Cadangan THR Edukatif','Expense',3,'51191',false),
  ('511913','Beban Cadangan THR Non Edukatif','Expense',3,'51191',false),
  ('512101','Beban Penyusutan Inventaris','Expense',3,'51210',false),
  ('711001','Pengeluaran Hibah','Other Expense',3,'71100',false)
ON CONFLICT(id) DO NOTHING;
