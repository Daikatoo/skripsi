-- =============================================
-- SETUP LENGKAP: Buat semua tabel + perbaikan
-- Salin SEMUA isi file ini ke SQL Editor Supabase, lalu klik RUN
-- =============================================

-- 1. Tabel Profiles
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('anggota', 'kepala_divisi', 'keuangan', 'rektorat', 'admin')),
  divisi TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Tabel Anggaran
CREATE TABLE IF NOT EXISTS anggaran (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  judul TEXT NOT NULL,
  deskripsi TEXT,
  file_url TEXT,
  file_name TEXT,
  dokumen_url TEXT,
  dokumen_name TEXT,
  parsed_data JSONB,
  total_anggaran NUMERIC DEFAULT 0,
  submitted_by UUID REFERENCES profiles(id),
  divisi TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending_kepala'
    CHECK (status IN (
      'draft', 'pending_kepala', 'revision_kepala',
      'pending_keuangan', 'revision_keuangan',
      'pending_rektorat', 'revision_rektorat', 'approved'
    )),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Tabel Approval Logs
CREATE TABLE IF NOT EXISTS approval_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  anggaran_id UUID REFERENCES anggaran(id) ON DELETE CASCADE,
  approver_id UUID REFERENCES profiles(id),
  role TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('submitted', 'approved', 'revision')),
  catatan TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE anggaran ENABLE ROW LEVEL SECURITY;
ALTER TABLE approval_logs ENABLE ROW LEVEL SECURITY;

-- Profiles
CREATE POLICY "profiles_select_all" ON profiles FOR SELECT USING (true);
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "profiles_insert_own" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Anggaran
CREATE POLICY "anggaran_select" ON anggaran FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND (
      p.role IN ('keuangan', 'rektorat', 'admin')
      OR submitted_by = auth.uid()
      OR (p.role = 'kepala_divisi' AND p.divisi = anggaran.divisi)
    )
  )
);

CREATE POLICY "anggaran_insert" ON anggaran FOR INSERT WITH CHECK (
  submitted_by = auth.uid()
);

CREATE POLICY "anggaran_update" ON anggaran FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND (
      p.role IN ('kepala_divisi', 'keuangan', 'rektorat', 'admin')
      OR submitted_by = auth.uid()
    )
  )
);

-- Approval Logs
CREATE POLICY "logs_select" ON approval_logs FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM anggaran a
    JOIN profiles p ON p.id = auth.uid()
    WHERE a.id = approval_logs.anggaran_id AND (
      a.submitted_by = auth.uid()
      OR p.role IN ('kepala_divisi', 'keuangan', 'rektorat', 'admin')
    )
  )
);

CREATE POLICY "logs_insert" ON approval_logs FOR INSERT WITH CHECK (
  approver_id = auth.uid()
);

-- =============================================
-- STORAGE BUCKET
-- =============================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('anggaran-files', 'anggaran-files', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "storage_upload" ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'anggaran-files' AND auth.role() = 'authenticated'
);

CREATE POLICY "storage_read" ON storage.objects FOR SELECT USING (
  bucket_id = 'anggaran-files' AND auth.role() = 'authenticated'
);

-- =============================================
-- TRIGGER: Auto-create profile on signup
-- =============================================
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO profiles (id, full_name, role, divisi)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', 'User'),
    COALESCE(new.raw_user_meta_data->>'role', 'anggota'),
    new.raw_user_meta_data->>'divisi'
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE handle_new_user();

-- =============================================
-- SISIPKAN PROFIL ADMIN (yang sudah ada di Auth)
-- =============================================
INSERT INTO profiles (id, full_name, role, divisi)
SELECT id, 'Administrator IT', 'admin', 'IT & Teknologi'
FROM auth.users
WHERE email = 'admin_it@internal.budgetflow.app'
ON CONFLICT (id) DO UPDATE SET role = 'admin', divisi = 'IT & Teknologi';
