-- =============================================
-- SETUP V2 + CoA ACCURATE UWIKA
-- Jalankan di SQL Editor Supabase
-- Part 1: Tabel Struktur
-- =============================================

-- 1. MASTER UNIT
CREATE TABLE IF NOT EXISTS master_unit (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  kode TEXT NOT NULL UNIQUE,
  nama TEXT NOT NULL,
  tipe TEXT NOT NULL CHECK (tipe IN ('rektorat','fakultas','prodi','unit')),
  parent_id UUID REFERENCES master_unit(id) ON DELETE SET NULL,
  urutan INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. COA ACCOUNTS
CREATE TABLE IF NOT EXISTS coa_accounts (
  id TEXT PRIMARY KEY,
  nama_akun TEXT NOT NULL,
  tipe_akun TEXT NOT NULL CHECK (tipe_akun IN (
    'Cash/Bank','Account Receivable','Other Current Asset','Fixed Asset',
    'Accumulated Depreciation','Other Asset','Account Payable',
    'Long Term Liability','Equity','Revenue','Expense','Other Expense',
    'Inventory','Cost of Goods Sold','Other Current Liability'
  )),
  level SMALLINT NOT NULL CHECK (level BETWEEN 1 AND 4),
  parent_id TEXT REFERENCES coa_accounts(id),
  is_active BOOLEAN DEFAULT TRUE,
  is_header BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. BANK ACCOUNTS
CREATE TABLE IF NOT EXISTS bank_accounts (
  id TEXT PRIMARY KEY,
  nama_rekening TEXT NOT NULL,
  kode_sistem TEXT NOT NULL,
  is_default_ops BOOLEAN DEFAULT FALSE,
  is_default_gaji BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. unit_id on profiles
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='unit_id') THEN
    ALTER TABLE profiles ADD COLUMN unit_id UUID REFERENCES master_unit(id);
  END IF;
END $$;

-- 5. RAPB
CREATE TABLE IF NOT EXISTS rapb (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  unit_id UUID NOT NULL REFERENCES master_unit(id),
  coa_id TEXT REFERENCES coa_accounts(id),
  tahun_anggaran INT NOT NULL,
  jumlah_anggaran NUMERIC NOT NULL DEFAULT 0,
  keterangan TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. PENGAJUAN
CREATE TABLE IF NOT EXISTS pengajuan (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  unit_id UUID NOT NULL REFERENCES master_unit(id),
  coa_id TEXT REFERENCES coa_accounts(id),
  rapb_id UUID REFERENCES rapb(id),
  bulan INT NOT NULL CHECK (bulan BETWEEN 1 AND 12),
  tahun INT NOT NULL,
  judul TEXT NOT NULL,
  deskripsi TEXT,
  file_url TEXT, file_name TEXT,
  dokumen_url TEXT, dokumen_name TEXT,
  parsed_data JSONB,
  jumlah_pengajuan NUMERIC NOT NULL DEFAULT 0,
  submitted_by UUID REFERENCES profiles(id),
  status TEXT NOT NULL DEFAULT 'pending_kepala' CHECK (status IN (
    'draft','pending_kepala','revision_kepala','pending_keuangan',
    'revision_keuangan','pending_rektorat','revision_rektorat','approved','rejected'
  )),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. REALISASI
CREATE TABLE IF NOT EXISTS realisasi (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  pengajuan_id UUID REFERENCES pengajuan(id) ON DELETE SET NULL,
  unit_id UUID NOT NULL REFERENCES master_unit(id),
  coa_id TEXT REFERENCES coa_accounts(id),
  bank_account_id TEXT REFERENCES bank_accounts(id),
  bulan INT NOT NULL CHECK (bulan BETWEEN 1 AND 12),
  tahun INT NOT NULL,
  jenis TEXT NOT NULL CHECK (jenis IN ('budget','non_budget')),
  keterangan TEXT,
  jumlah NUMERIC NOT NULL DEFAULT 0,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. pengajuan_id on approval_logs
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='approval_logs' AND column_name='pengajuan_id') THEN
    ALTER TABLE approval_logs ADD COLUMN pengajuan_id UUID REFERENCES pengajuan(id) ON DELETE CASCADE;
  END IF;
END $$;

-- =============================================
-- RLS
-- =============================================
ALTER TABLE master_unit ENABLE ROW LEVEL SECURITY;
ALTER TABLE coa_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE rapb ENABLE ROW LEVEL SECURITY;
ALTER TABLE pengajuan ENABLE ROW LEVEL SECURITY;
ALTER TABLE realisasi ENABLE ROW LEVEL SECURITY;

-- master_unit: semua baca, admin CRUD
CREATE POLICY "mu_sel" ON master_unit FOR SELECT USING (true);
CREATE POLICY "mu_ins" ON master_unit FOR INSERT WITH CHECK (EXISTS(SELECT 1 FROM profiles WHERE id=auth.uid() AND role='admin'));
CREATE POLICY "mu_upd" ON master_unit FOR UPDATE USING (EXISTS(SELECT 1 FROM profiles WHERE id=auth.uid() AND role='admin'));
CREATE POLICY "mu_del" ON master_unit FOR DELETE USING (EXISTS(SELECT 1 FROM profiles WHERE id=auth.uid() AND role='admin'));

-- coa_accounts & bank_accounts: semua baca
CREATE POLICY "coa_sel" ON coa_accounts FOR SELECT USING (true);
CREATE POLICY "coa_ins" ON coa_accounts FOR INSERT WITH CHECK (EXISTS(SELECT 1 FROM profiles WHERE id=auth.uid() AND role IN ('admin','keuangan')));
CREATE POLICY "ba_sel" ON bank_accounts FOR SELECT USING (true);

-- rapb
CREATE POLICY "rapb_sel" ON rapb FOR SELECT USING (
  EXISTS(SELECT 1 FROM profiles p WHERE p.id=auth.uid() AND (p.role IN ('keuangan','rektorat','admin') OR p.unit_id=rapb.unit_id))
);
CREATE POLICY "rapb_ins" ON rapb FOR INSERT WITH CHECK (EXISTS(SELECT 1 FROM profiles WHERE id=auth.uid() AND role IN ('keuangan','admin')));
CREATE POLICY "rapb_upd" ON rapb FOR UPDATE USING (EXISTS(SELECT 1 FROM profiles WHERE id=auth.uid() AND role IN ('keuangan','admin')));
CREATE POLICY "rapb_del" ON rapb FOR DELETE USING (EXISTS(SELECT 1 FROM profiles WHERE id=auth.uid() AND role IN ('keuangan','admin')));

-- pengajuan
CREATE POLICY "peng_sel" ON pengajuan FOR SELECT USING (
  EXISTS(SELECT 1 FROM profiles p WHERE p.id=auth.uid() AND (
    p.role IN ('keuangan','rektorat','admin') OR submitted_by=auth.uid() OR (p.role='kepala_divisi' AND p.unit_id=pengajuan.unit_id)
  ))
);
CREATE POLICY "peng_ins" ON pengajuan FOR INSERT WITH CHECK (submitted_by=auth.uid());
CREATE POLICY "peng_upd" ON pengajuan FOR UPDATE USING (
  EXISTS(SELECT 1 FROM profiles p WHERE p.id=auth.uid() AND (p.role IN ('kepala_divisi','keuangan','rektorat','admin') OR submitted_by=auth.uid()))
);

-- realisasi
CREATE POLICY "real_sel" ON realisasi FOR SELECT USING (
  EXISTS(SELECT 1 FROM profiles p WHERE p.id=auth.uid() AND (p.role IN ('keuangan','rektorat','admin') OR p.unit_id=realisasi.unit_id))
);
CREATE POLICY "real_ins" ON realisasi FOR INSERT WITH CHECK (EXISTS(SELECT 1 FROM profiles WHERE id=auth.uid() AND role IN ('keuangan','admin')));
CREATE POLICY "real_upd" ON realisasi FOR UPDATE USING (EXISTS(SELECT 1 FROM profiles WHERE id=auth.uid() AND role IN ('keuangan','admin')));
