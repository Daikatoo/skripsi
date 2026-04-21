-- =============================================
-- FIX LENGKAP: Admin Role + Profil Admin IT
-- Jalankan SEMUA baris ini sekaligus di SQL Editor Supabase
-- =============================================

-- 1. Perbaiki constraint role agar menyertakan 'admin'
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check CHECK (role IN ('anggota', 'kepala_divisi', 'keuangan', 'rektorat', 'admin'));

-- 2. Tambahkan kolom dokumen pendukung (jika belum ada)
ALTER TABLE anggaran ADD COLUMN IF NOT EXISTS dokumen_url TEXT;
ALTER TABLE anggaran ADD COLUMN IF NOT EXISTS dokumen_name TEXT;

-- 3. Perbaiki trigger agar SECURITY DEFINER
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

-- 4. Sisipkan profil admin_it secara manual (karena trigger lama gagal)
-- Ganti UUID di bawah ini dengan ID user admin_it dari tabel auth.users
INSERT INTO profiles (id, full_name, role, divisi)
SELECT id, 'Administrator IT', 'admin', 'IT & Teknologi'
FROM auth.users
WHERE email = 'admin_it@internal.budgetflow.app'
ON CONFLICT (id) DO UPDATE SET role = 'admin', divisi = 'IT & Teknologi';
