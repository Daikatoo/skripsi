const fs = require('fs');
const accounts = JSON.parse(fs.readFileSync('coa_parsed.json', 'utf8'));

// Find parent for each account (nearest preceding account with lower level)
function findParent(level, idx) {
  if (level === 1) return null;
  for (let i = idx - 1; i >= 0; i--) {
    if (accounts[i].level < level) {
      return accounts[i].acctNo;
    }
  }
  return null;
}

// Determine is_header: an account is a header if the next account has a higher level
function isHeader(idx) {
  return (idx + 1 < accounts.length) && (accounts[idx + 1].level > accounts[idx].level);
}

// Generate SQL
const lines = [];
lines.push('-- ==============================================================================');
lines.push('-- INSERT COA 2026 KE TABEL coa_accounts');
lines.push('-- Sumber: file pendukung/COA 2026.xls (437 akun)');
lines.push('-- Jalankan di Supabase SQL Editor');
lines.push('-- ==============================================================================');
lines.push('');
lines.push('-- 1. Lepaskan referensi FK sementara dari tabel lain agar DELETE tidak error');
lines.push('UPDATE rapb SET coa_id = NULL WHERE coa_id IS NOT NULL;');
lines.push('UPDATE pengajuan SET coa_id = NULL WHERE coa_id IS NOT NULL;');
lines.push('UPDATE realisasi SET coa_id = NULL WHERE coa_id IS NOT NULL;');
lines.push('');
lines.push('-- 2. Hapus data CoA lama (hapus sub-akun terlebih dahulu untuk hindari constraint self-reference)');
lines.push('DELETE FROM coa_accounts WHERE parent_id IS NOT NULL;');
lines.push('DELETE FROM coa_accounts;');
lines.push('');
lines.push('-- 3. Insert semua akun CoA 2026 berdasarkan hirarki level (Level 1 -> 4)');

// Insert level by level (parents first for FK constraint)
for (let lvl = 1; lvl <= 4; lvl++) {
  const batch = [];
  accounts.forEach((a, idx) => {
    if (a.level === lvl) {
      batch.push({ ...a, idx });
    }
  });

  if (batch.length === 0) continue;
  
  lines.push('');
  lines.push('-- Level ' + lvl + ' (' + batch.length + ' akun)');
  lines.push('INSERT INTO coa_accounts (id, nama_akun, tipe_akun, level, parent_id, is_active, is_header) VALUES');
  
  const values = batch.map((item, bi) => {
    const parentNo = findParent(item.level, item.idx);
    const header = isHeader(item.idx) ? 'TRUE' : 'FALSE';
    const escapedName = item.name.replace(/'/g, "''");
    const parentVal = parentNo ? "'" + parentNo + "'" : 'NULL';
    const comma = bi < batch.length - 1 ? ',' : '';
    return "  ('" + item.acctNo + "', '" + escapedName + "', '" + item.type + "', " + item.level + ", " + parentVal + ", TRUE, " + header + ")" + comma;
  });
  
  lines.push(...values);
  lines.push('ON CONFLICT (id) DO UPDATE SET nama_akun = EXCLUDED.nama_akun, tipe_akun = EXCLUDED.tipe_akun, level = EXCLUDED.level, parent_id = EXCLUDED.parent_id, is_header = EXCLUDED.is_header;');
}

lines.push('');
lines.push('-- 4. Verifikasi hasil');
lines.push("SELECT level, is_header, COUNT(*) FROM coa_accounts GROUP BY level, is_header ORDER BY level, is_header;");
lines.push("SELECT COUNT(*) AS total_coa FROM coa_accounts;");

fs.writeFileSync('update-coa-2026.sql', lines.join('\n'));
console.log('Successfully generated update-coa-2026.sql:');
console.log('- Total accounts:', accounts.length);
console.log('- Level 1:', accounts.filter(a => a.level === 1).length);
console.log('- Level 2:', accounts.filter(a => a.level === 2).length);
console.log('- Level 3:', accounts.filter(a => a.level === 3).length);
console.log('- Level 4:', accounts.filter(a => a.level === 4).length);
