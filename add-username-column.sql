-- Tambahkan kolom username ke profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS username TEXT;

-- Update trigger agar menyimpan username
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO profiles (id, full_name, role, divisi, username)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', 'User'),
    COALESCE(new.raw_user_meta_data->>'role', 'anggota'),
    new.raw_user_meta_data->>'divisi',
    COALESCE(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1))
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE handle_new_user();

-- Update profil admin_it yang ada agar username-nya terisi
UPDATE profiles
SET username = split_part(u.email, '@', 1)
FROM auth.users u
WHERE profiles.id = u.id AND profiles.username IS NULL;
