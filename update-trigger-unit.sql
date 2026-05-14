-- Perbarui fungsi trigger untuk memasukkan unit_id saat akun baru dibuat
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO profiles (id, full_name, role, divisi, unit_id)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', 'User'),
    COALESCE(new.raw_user_meta_data->>'role', 'anggota'),
    new.raw_user_meta_data->>'divisi',
    NULLIF(new.raw_user_meta_data->>'unit_id', '')::UUID
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql;
