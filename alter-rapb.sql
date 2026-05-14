-- 1. CREATE TABLE jika belum ada (dari addendum sebelumnya)
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

-- 2. Drop NOT NULL constraint on coa_id if it exists
ALTER TABLE rapb ALTER COLUMN coa_id DROP NOT NULL;

-- 3. Add new columns for Spreadsheet & Workflow
ALTER TABLE rapb ADD COLUMN IF NOT EXISTS volume NUMERIC DEFAULT 1;
ALTER TABLE rapb ADD COLUMN IF NOT EXISTS satuan TEXT;
ALTER TABLE rapb ADD COLUMN IF NOT EXISTS harga_satuan NUMERIC DEFAULT 0;
ALTER TABLE rapb ADD COLUMN IF NOT EXISTS kategori TEXT;
ALTER TABLE rapb ADD COLUMN IF NOT EXISTS sub_kategori TEXT;
ALTER TABLE rapb ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'draft' CHECK (status IN (
  'draft', 'pending_keuangan', 'revision_keuangan', 'pending_rektorat', 'revision_rektorat', 'approved', 'rejected'
));

-- 4. Update existing rows to have default values for new columns (aman jika tabel baru kosong)
UPDATE rapb SET 
  volume = 1,
  satuan = 'ls',
  harga_satuan = jumlah_anggaran,
  kategori = 'Umum',
  sub_kategori = 'Lainnya',
  status = 'approved'
WHERE kategori IS NULL;

-- 5. Drop existing RLS policies for rapb
DROP POLICY IF EXISTS "rapb_sel" ON rapb;
DROP POLICY IF EXISTS "rapb_ins" ON rapb;
DROP POLICY IF EXISTS "rapb_upd" ON rapb;
DROP POLICY IF EXISTS "rapb_del" ON rapb;

-- 6. Enable RLS
ALTER TABLE rapb ENABLE ROW LEVEL SECURITY;

-- 7. New RLS Policies for RAPB with Workflow support
-- SELECT: Everyone can see RAPB if they are admin/keuangan/rektorat, OR if it belongs to their unit
CREATE POLICY "rapb_sel" ON rapb FOR SELECT USING (
  EXISTS(SELECT 1 FROM profiles p WHERE p.id=auth.uid() AND (p.role IN ('keuangan','rektorat','admin') OR p.unit_id=rapb.unit_id))
);

-- INSERT: admin/keuangan CAN insert anytime. Divisi can insert ONLY IF they are inserting for their own unit.
CREATE POLICY "rapb_ins" ON rapb FOR INSERT WITH CHECK (
  EXISTS(SELECT 1 FROM profiles p WHERE p.id=auth.uid() AND (
    p.role IN ('keuangan','admin') OR p.unit_id=rapb.unit_id
  ))
);

-- UPDATE: admin/keuangan can update. Divisi can update their own if it's in draft/revision status. Rektorat can update status if it's pending_rektorat.
CREATE POLICY "rapb_upd" ON rapb FOR UPDATE USING (
  EXISTS(SELECT 1 FROM profiles p WHERE p.id=auth.uid() AND (
    p.role IN ('keuangan','admin', 'rektorat') OR p.unit_id=rapb.unit_id
  ))
);

-- DELETE: admin/keuangan can delete. Divisi can delete their own if it's in draft/revision status.
CREATE POLICY "rapb_del" ON rapb FOR DELETE USING (
  EXISTS(SELECT 1 FROM profiles p WHERE p.id=auth.uid() AND (
    p.role IN ('keuangan','admin') OR (p.unit_id=rapb.unit_id AND status IN ('draft', 'revision_keuangan', 'revision_rektorat'))
  ))
);
