-- RAPB Tahunan dan pengajuan RAPB bulanan
-- Jalankan sekali di Supabase SQL Editor setelah setup-v2-coa.sql.

ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check CHECK (role IN (
  'anggota', 'kepala_divisi', 'dekan', 'keuangan', 'wakil_rektor_1',
  'wakil_rektor_2', 'rektor', 'rektorat', 'admin'
));

ALTER TABLE pengajuan ADD COLUMN IF NOT EXISTS jenis TEXT NOT NULL DEFAULT 'umum';
ALTER TABLE pengajuan ADD COLUMN IF NOT EXISTS keterangan_pengajuan TEXT;
ALTER TABLE pengajuan ADD COLUMN IF NOT EXISTS berita_acara_path TEXT;
ALTER TABLE pengajuan ADD COLUMN IF NOT EXISTS berita_acara_name TEXT;
ALTER TABLE pengajuan ADD COLUMN IF NOT EXISTS revised_at TIMESTAMPTZ;

ALTER TABLE pengajuan DROP CONSTRAINT IF EXISTS pengajuan_status_check;
ALTER TABLE pengajuan ADD CONSTRAINT pengajuan_status_check CHECK (status IN (
  'draft', 'pending_kepala', 'revision_kepala', 'pending_keuangan',
  'revision_keuangan', 'pending_rektorat', 'revision_rektorat', 'approved', 'rejected',
  'pending_dekan', 'pending_keuangan_awal', 'pending_wr1', 'pending_wr2',
  'pending_rektor', 'pending_keuangan_akhir', 'revision_bulanan'
));

-- Reviewer khusus RAPB bulanan harus dapat membaca dan memperbarui pengajuan
-- pada tahapnya. Policy ini juga tetap mempertahankan akses pemilik pengajuan.
DROP POLICY IF EXISTS "peng_sel" ON pengajuan;
DROP POLICY IF EXISTS "peng_upd" ON pengajuan;
CREATE POLICY "peng_sel" ON pengajuan FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND (
    p.role IN ('keuangan', 'rektorat', 'dekan', 'wakil_rektor_1', 'wakil_rektor_2', 'rektor', 'admin')
    OR pengajuan.submitted_by = auth.uid()
    OR (p.role = 'kepala_divisi' AND p.unit_id = pengajuan.unit_id)
  ))
);
CREATE POLICY "peng_upd" ON pengajuan FOR UPDATE USING (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND (
    p.role IN ('kepala_divisi', 'dekan', 'keuangan', 'wakil_rektor_1', 'wakil_rektor_2', 'rektor', 'rektorat', 'admin')
    OR pengajuan.submitted_by = auth.uid()
  ))
);

CREATE TABLE IF NOT EXISTS pengajuan_bulanan_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  pengajuan_id UUID NOT NULL REFERENCES pengajuan(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES profiles(id),
  status TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('submitted', 'approved', 'revision')),
  catatan TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE pengajuan_bulanan_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "pengajuan_bulanan_logs_select" ON pengajuan_bulanan_logs;
DROP POLICY IF EXISTS "pengajuan_bulanan_logs_insert" ON pengajuan_bulanan_logs;
CREATE POLICY "pengajuan_bulanan_logs_select" ON pengajuan_bulanan_logs FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid())
);
CREATE POLICY "pengajuan_bulanan_logs_insert" ON pengajuan_bulanan_logs FOR INSERT WITH CHECK (
  actor_id = auth.uid()
);
