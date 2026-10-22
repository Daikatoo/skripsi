'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatRupiah, BULAN_NAMES } from '@/lib/utils'

interface Unit {
    id: string
    kode: string
    nama: string
    department_no?: string
    name?: string
    category?: string
    status?: string
}
interface Coa { id: string; nama_akun: string; tipe_akun: string }
interface Bank { id: string; nama_rekening: string; kode_sistem: string }
interface RealisasiItem { id: string; unit_id: string; coa_id: string; bank_account_id: string | null; bulan: number; tahun: number; jenis: string; keterangan: string | null; jumlah: number; master_unit: { kode: string; nama: string; department_no?: string; name?: string; category?: string } | null; coa_accounts: { id: string; nama_akun: string } | null; bank_accounts: { nama_rekening: string } | null; pengajuan: { judul: string } | null }

export default function RealisasiPage() {
    const supabase = createClient()
    const now = new Date()
    const [items, setItems] = useState<RealisasiItem[]>([]); const [units, setUnits] = useState<Unit[]>([])
    const [coaList, setCoaList] = useState<Coa[]>([]); const [bankList, setBankList] = useState<Bank[]>([])
    const [pengajuanList, setPengajuanList] = useState<any[]>([])
    const [loading, setLoading] = useState(true); const [drawerOpen, setDrawerOpen] = useState(false)
    const [msg, setMsg] = useState({ t: '', x: '' }); const [canEdit, setCanEdit] = useState(false)
    const [fBulan, setFBulan] = useState(now.getMonth() + 1); const [fTahun, setFTahun] = useState(now.getFullYear()); const [fUnit, setFUnit] = useState('')
    const [form, setForm] = useState({ pengajuan_id: '', unit_id: '', coa_id: '', bank_account_id: '12004', bulan: now.getMonth() + 1, tahun: now.getFullYear(), jenis: 'budget', keterangan: '', jumlah: 0 })
    const [coaSearch, setCoaSearch] = useState('')

    useEffect(() => {
        (async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return
            const { data: p } = await supabase.from('profiles').select('role').eq('id', user.id).single()
            if (p && ['keuangan', 'admin'].includes(p.role)) setCanEdit(true)
            const { data: pList } = await supabase.from('pengajuan').select('id, judul, jumlah_pengajuan').eq('status', 'approved')
            if (pList) setPengajuanList(pList)
        })()
        fetchUnits(); fetchCoa(); fetchBanks()
    }, [])

    useEffect(() => { fetchData() }, [fBulan, fTahun, fUnit])

    const fetchUnits = async () => { const r = await fetch('/api/master-unit'); if (r.ok) setUnits(await r.json()) }
    const fetchCoa = async () => { const r = await fetch('/api/coa?tipe_akun=Expense&header=false'); if (r.ok) setCoaList(await r.json()) }
    const fetchBanks = async () => { const { data } = await supabase.from('bank_accounts').select('*').order('id'); if (data) setBankList(data) }
    const fetchData = async () => {
        setLoading(true)
        const p = new URLSearchParams({ bulan: String(fBulan), tahun: String(fTahun) })
        if (fUnit) p.set('unit_id', fUnit)
        const r = await fetch(`/api/realisasi?${p}`); if (r.ok) setItems(await r.json()); setLoading(false)
    }

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault(); setMsg({ t: '', x: '' })
        const r = await fetch('/api/realisasi', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
        const d = await r.json()
        if (!r.ok) { setMsg({ t: 'e', x: d.error }); return }
        setMsg({ t: 's', x: 'Realisasi berhasil.' }); setForm({ ...form, jumlah: 0, keterangan: '', coa_id: '', pengajuan_id: '' }); fetchData()
        setTimeout(() => setDrawerOpen(false), 1000)
    }

    const totalAll = items.reduce((s, i) => s + Number(i.jumlah), 0)
    const totalBudget = items.filter(i => i.jenis === 'budget').reduce((s, i) => s + Number(i.jumlah), 0)
    const totalNon = items.filter(i => i.jenis === 'non_budget').reduce((s, i) => s + Number(i.jumlah), 0)
    const filteredCoa = coaSearch ? coaList.filter(c => c.id.includes(coaSearch) || c.nama_akun.toLowerCase().includes(coaSearch.toLowerCase())) : coaList

    return (
        <div style={{ animation: 'fadeIn 0.4s ease' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <div><h1 className="page-title">💰 Realisasi Anggaran</h1><p className="page-subtitle">{BULAN_NAMES[fBulan]} {fTahun}</p></div>
                {canEdit && <button className="btn btn-primary" onClick={() => { setDrawerOpen(true); setMsg({ t: '', x: '' }) }}>+ Input Realisasi</button>}
            </div>

            <div className="card" style={{ marginBottom: '20px', padding: '16px 20px' }}>
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                    <div><label className="form-label">Bulan</label><select className="form-input" style={{ width: '150px' }} value={fBulan} onChange={e => setFBulan(Number(e.target.value))}>{BULAN_NAMES.slice(1).map((b, i) => <option key={i + 1} value={i + 1}>{b}</option>)}</select></div>
                    <div><label className="form-label">Tahun</label><select className="form-input" style={{ width: '120px' }} value={fTahun} onChange={e => setFTahun(Number(e.target.value))}>{[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}</select></div>
                    <div><label className="form-label">Unit</label><select className="form-input" style={{ width: '260px' }} value={fUnit} onChange={e => setFUnit(e.target.value)}><option value="">Semua Unit/Prodi</option>{units.map(u => <option key={u.id} value={u.id}>[{u.category === 'prodi' ? 'Prodi' : 'Unit'}] {u.name || u.nama} ({u.department_no || u.kode})</option>)}</select></div>
                </div>
            </div>

            <div className="stats-grid" style={{ marginBottom: '20px' }}>
                <div className="stat-card"><div className="stat-icon" style={{ background: '#fef3c7', color: '#d97706' }}>💰</div><div><div className="stat-value" style={{ fontSize: '18px' }}>{formatRupiah(totalAll)}</div><div className="stat-label">Total Realisasi</div></div></div>
                <div className="stat-card"><div className="stat-icon" style={{ background: '#d1fae5', color: '#059669' }}>✅</div><div><div className="stat-value" style={{ fontSize: '18px' }}>{formatRupiah(totalBudget)}</div><div className="stat-label">Budget</div></div></div>
                <div className="stat-card"><div className="stat-icon" style={{ background: '#fee2e2', color: '#dc2626' }}>⚠️</div><div><div className="stat-value" style={{ fontSize: '18px' }}>{formatRupiah(totalNon)}</div><div className="stat-label">Non-Budget</div></div></div>
            </div>

            <div className="card" style={{ padding: 0 }}>
                <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--border)' }}><h2 style={{ fontSize: '15px', fontWeight: 600, margin: 0 }}>Detail Pengeluaran</h2></div>
                {loading ? <div style={{ padding: '48px', textAlign: 'center', color: '#94a3b8' }}>Memuat...</div> : items.length === 0 ? (
                    <div style={{ padding: '48px', textAlign: 'center', color: '#94a3b8' }}><div style={{ fontSize: '36px', marginBottom: '8px', opacity: 0.5 }}>📭</div><p>Belum ada realisasi.</p></div>
                ) : (
                    <div className="table-wrapper" style={{ margin: 0, border: 'none', borderRadius: '0 0 12px 12px' }}>
                        <table className="data-table"><thead><tr><th>Unit</th><th>No. Akun</th><th>Nama Akun</th><th>Jenis</th><th>Jumlah</th><th>Bank</th><th>Keterangan</th></tr></thead>
                            <tbody>{items.map(i => (
                                <tr key={i.id}>
                                    <td style={{ fontWeight: 500 }}>{i.master_unit?.nama}</td>
                                    <td style={{ fontSize: '12px', color: '#6366f1', fontWeight: 600 }}>{i.coa_id}</td>
                                    <td style={{ fontSize: '13px' }}>{i.coa_accounts?.nama_akun || '—'}</td>
                                    <td><span style={{ padding: '2px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 600, background: i.jenis === 'budget' ? '#d1fae5' : '#fee2e2', color: i.jenis === 'budget' ? '#059669' : '#dc2626' }}>{i.jenis === 'budget' ? 'Budget' : 'Non-Budget'}</span></td>
                                    <td style={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{formatRupiah(Number(i.jumlah))}</td>
                                    <td style={{ fontSize: '11px', color: '#64748b' }}>{i.bank_accounts?.nama_rekening || '—'}</td>
                                    <td style={{ fontSize: '12px', color: '#94a3b8', maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{i.keterangan || '—'}</td>
                                </tr>
                            ))}
                                <tr style={{ background: '#f8fafc' }}><td colSpan={4} style={{ fontWeight: 700, textAlign: 'right' }}>TOTAL</td><td style={{ fontWeight: 700, color: '#d97706' }}>{formatRupiah(totalAll)}</td><td colSpan={2}></td></tr>
                            </tbody></table>
                    </div>
                )}
            </div>

            {drawerOpen && (
                <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', justifyContent: 'flex-end' }}>
                    <div onClick={() => setDrawerOpen(false)} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(2px)' }} />
                    <div style={{ position: 'relative', width: '440px', maxWidth: '90vw', background: 'white', boxShadow: '-8px 0 30px rgba(0,0,0,0.1)', display: 'flex', flexDirection: 'column', animation: 'slideInRight 0.3s ease', overflowY: 'auto' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid var(--border)' }}>
                            <h2 style={{ margin: 0, fontSize: '17px', fontWeight: 700 }}>Input Realisasi</h2>
                            <button onClick={() => setDrawerOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: '20px' }}>✕</button>
                        </div>
                        <div style={{ padding: '24px' }}>
                            {msg.x && <div className={`alert ${msg.t === 'e' ? 'alert-danger' : 'alert-success'}`}><span>{msg.t === 'e' ? '⚠️' : '✅'}</span><span style={{ fontSize: '13px' }}>{msg.x}</span></div>}
                            <form onSubmit={handleCreate}>
                                <div className="form-group"><label className="form-label">Unit *</label><select className="form-input" value={form.unit_id} onChange={e => setForm(f => ({ ...f, unit_id: e.target.value }))} required><option value="">Pilih Unit / Prodi</option>{units.map(u => <option key={u.id} value={u.id}>[{u.category === 'prodi' ? 'Prodi' : 'Unit'}] {u.name || u.nama} ({u.department_no || u.kode})</option>)}</select></div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                    <div className="form-group"><label className="form-label">Bulan *</label><select className="form-input" value={form.bulan} onChange={e => setForm(f => ({ ...f, bulan: Number(e.target.value) }))}>{BULAN_NAMES.slice(1).map((b, i) => <option key={i + 1} value={i + 1}>{b}</option>)}</select></div>
                                    <div className="form-group"><label className="form-label">Tahun *</label><select className="form-input" value={form.tahun} onChange={e => setForm(f => ({ ...f, tahun: Number(e.target.value) }))}>{[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}</select></div>
                                </div>
                                <div className="form-group"><label className="form-label">Jenis *</label><select className="form-input" value={form.jenis} onChange={e => setForm(f => ({ ...f, jenis: e.target.value }))}><option value="budget">Budget</option><option value="non_budget">Non-Budget</option></select></div>
                                <div className="form-group"><label className="form-label">Akun CoA *</label>
                                    <input className="form-input" placeholder="Cari..." value={coaSearch} onChange={e => setCoaSearch(e.target.value)} style={{ marginBottom: '6px', fontSize: '12px' }} />
                                    <select className="form-input" value={form.coa_id} onChange={e => setForm(f => ({ ...f, coa_id: e.target.value }))} required size={5} style={{ fontSize: '12px' }}><option value="">Pilih</option>{filteredCoa.map(c => <option key={c.id} value={c.id}>[{c.id}] {c.nama_akun}</option>)}</select>
                                </div>
                                <div className="form-group"><label className="form-label">Rekening Bank</label><select className="form-input" value={form.bank_account_id} onChange={e => setForm(f => ({ ...f, bank_account_id: e.target.value }))}>{bankList.map(b => <option key={b.id} value={b.id}>{b.nama_rekening}</option>)}</select></div>
                                <div className="form-group"><label className="form-label">Jumlah (Rp) *</label><input type="number" className="form-input" value={form.jumlah} onChange={e => setForm(f => ({ ...f, jumlah: Number(e.target.value) }))} required min={0} /></div>
                                <div className="form-group"><label className="form-label">Keterangan</label><input className="form-input" value={form.keterangan} onChange={e => setForm(f => ({ ...f, keterangan: e.target.value }))} /></div>
                                <div className="form-group"><label className="form-label">Link Pengajuan</label><select className="form-input" value={form.pengajuan_id} onChange={e => setForm(f => ({ ...f, pengajuan_id: e.target.value }))}><option value="">—</option>{pengajuanList.map(p => <option key={p.id} value={p.id}>{p.judul}</option>)}</select></div>
                                <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: '8px' }}>Simpan</button>
                            </form>
                        </div>
                    </div>
                </div>
            )}

        </div>
    )
}
