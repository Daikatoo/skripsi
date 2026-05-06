'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatRupiah } from '@/lib/utils'

interface Unit { id: string; kode: string; nama: string }
interface Coa { id: string; nama_akun: string; tipe_akun: string; is_header: boolean; level: number }
interface RapbItem { id: string; unit_id: string; coa_id: string; tahun_anggaran: number; jumlah_anggaran: number; keterangan: string | null; master_unit: { kode: string; nama: string } | null; coa_accounts: { id: string; nama_akun: string } | null }

export default function RapbPage() {
    const supabase = createClient()
    const [items, setItems] = useState<RapbItem[]>([]); const [units, setUnits] = useState<Unit[]>([]); const [coaList, setCoaList] = useState<Coa[]>([])
    const [loading, setLoading] = useState(true); const [drawerOpen, setDrawerOpen] = useState(false); const [msg, setMsg] = useState({ t: '', x: '' })
    const [canEdit, setCanEdit] = useState(false)
    const [fTahun, setFTahun] = useState(new Date().getFullYear()); const [fUnit, setFUnit] = useState('')
    const [form, setForm] = useState({ unit_id: '', coa_id: '', tahun_anggaran: new Date().getFullYear(), jumlah_anggaran: 0, keterangan: '' })
    const [coaSearch, setCoaSearch] = useState('')

    useEffect(() => {
        (async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return
            const { data: p } = await supabase.from('profiles').select('role').eq('id', user.id).single()
            if (p && ['keuangan', 'admin'].includes(p.role)) setCanEdit(true)
        })()
        fetchUnits(); fetchCoa()
    }, [])

    useEffect(() => { fetchData() }, [fTahun, fUnit])

    const fetchUnits = async () => { const r = await fetch('/api/master-unit'); if (r.ok) setUnits(await r.json()) }
    const fetchCoa = async () => { const r = await fetch('/api/coa?header=false'); if (r.ok) setCoaList(await r.json()) }
    const fetchData = async () => {
        setLoading(true)
        const p = new URLSearchParams({ tahun: String(fTahun) })
        if (fUnit) p.set('unit_id', fUnit)
        const r = await fetch(`/api/rapb?${p}`); if (r.ok) setItems(await r.json()); setLoading(false)
    }

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault(); setMsg({ t: '', x: '' })
        const r = await fetch('/api/rapb', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
        const d = await r.json()
        if (!r.ok) { setMsg({ t: 'e', x: d.error }); return }
        setMsg({ t: 's', x: 'Item RAPB ditambahkan.' }); setForm({ ...form, jumlah_anggaran: 0, keterangan: '', coa_id: '' }); fetchData()
        setTimeout(() => setDrawerOpen(false), 1000)
    }
    const handleDel = async (id: string) => { await fetch(`/api/rapb?id=${id}`, { method: 'DELETE' }); fetchData() }

    const total = items.reduce((s, i) => s + Number(i.jumlah_anggaran), 0)
    const filteredCoa = coaSearch ? coaList.filter(c => c.id.includes(coaSearch) || c.nama_akun.toLowerCase().includes(coaSearch.toLowerCase())) : coaList

    return (
        <div style={{ animation: 'fadeIn 0.4s ease' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <div><h1 className="page-title">📋 RAPB — Rencana Anggaran</h1><p className="page-subtitle">Tahun Anggaran {fTahun}</p></div>
                {canEdit && <button className="btn btn-primary" onClick={() => { setDrawerOpen(true); setMsg({ t: '', x: '' }) }}>+ Tambah Item</button>}
            </div>

            {/* Filters */}
            <div className="card" style={{ marginBottom: '20px', padding: '16px 20px' }}>
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                    <div><label className="form-label">Tahun</label><select className="form-input" style={{ width: '120px' }} value={fTahun} onChange={e => setFTahun(Number(e.target.value))}>{[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}</select></div>
                    <div><label className="form-label">Unit</label><select className="form-input" style={{ width: '220px' }} value={fUnit} onChange={e => setFUnit(e.target.value)}><option value="">Semua</option>{units.map(u => <option key={u.id} value={u.id}>{u.nama} ({u.kode})</option>)}</select></div>
                </div>
            </div>

            {/* Stats */}
            <div className="stats-grid" style={{ marginBottom: '20px' }}>
                <div className="stat-card"><div className="stat-icon" style={{ background: '#eef2ff', color: '#6366f1' }}>📋</div><div><div className="stat-value">{items.length}</div><div className="stat-label">Item RAPB</div></div></div>
                <div className="stat-card"><div className="stat-icon" style={{ background: '#d1fae5', color: '#059669' }}>💰</div><div><div className="stat-value" style={{ fontSize: '18px' }}>{formatRupiah(total)}</div><div className="stat-label">Total Anggaran</div></div></div>
            </div>

            {/* Table */}
            <div className="card" style={{ padding: 0 }}>
                <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--border)' }}><h2 style={{ fontSize: '15px', fontWeight: 600, margin: 0 }}>Detail RAPB</h2></div>
                {loading ? <div style={{ padding: '48px', textAlign: 'center', color: '#94a3b8' }}>Memuat...</div> : items.length === 0 ? (
                    <div style={{ padding: '48px', textAlign: 'center', color: '#94a3b8' }}><div style={{ fontSize: '36px', marginBottom: '8px', opacity: 0.5 }}>📭</div><p>Belum ada data RAPB.</p></div>
                ) : (
                    <div className="table-wrapper" style={{ margin: 0, border: 'none', borderRadius: '0 0 12px 12px' }}>
                        <table className="data-table"><thead><tr><th>Unit</th><th>No. Akun</th><th>Nama Akun (CoA)</th><th>Jumlah</th><th>Keterangan</th>{canEdit && <th style={{ width: '50px' }}></th>}</tr></thead>
                            <tbody>{items.map(i => (
                                <tr key={i.id}>
                                    <td><span style={{ fontWeight: 500 }}>{i.master_unit?.nama}</span><div style={{ fontSize: '11px', color: '#94a3b8' }}>{i.master_unit?.kode}</div></td>
                                    <td style={{ fontSize: '12px', fontWeight: 600, color: '#6366f1' }}>{i.coa_id}</td>
                                    <td style={{ fontSize: '13px' }}>{i.coa_accounts?.nama_akun || '—'}</td>
                                    <td style={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{formatRupiah(Number(i.jumlah_anggaran))}</td>
                                    <td style={{ fontSize: '12px', color: '#94a3b8', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{i.keterangan || '—'}</td>
                                    {canEdit && <td><button onClick={() => handleDel(i.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: '3px' }}>🗑️</button></td>}
                                </tr>
                            ))}
                                <tr style={{ background: '#f8fafc' }}><td colSpan={3} style={{ fontWeight: 700, textAlign: 'right' }}>TOTAL</td><td style={{ fontWeight: 700, color: '#059669' }}>{formatRupiah(total)}</td><td></td>{canEdit && <td></td>}</tr>
                            </tbody></table>
                    </div>
                )}
            </div>

            {/* Drawer */}
            {drawerOpen && (
                <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', justifyContent: 'flex-end' }}>
                    <div onClick={() => setDrawerOpen(false)} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(2px)' }} />
                    <div style={{ position: 'relative', width: '420px', maxWidth: '90vw', background: 'white', boxShadow: '-8px 0 30px rgba(0,0,0,0.1)', display: 'flex', flexDirection: 'column', animation: 'slideInRight 0.3s ease', overflowY: 'auto' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid var(--border)' }}>
                            <h2 style={{ margin: 0, fontSize: '17px', fontWeight: 700 }}>Tambah Item RAPB</h2>
                            <button onClick={() => setDrawerOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: '20px' }}>✕</button>
                        </div>
                        <div style={{ padding: '24px' }}>
                            {msg.x && <div className={`alert ${msg.t === 'e' ? 'alert-danger' : 'alert-success'}`}><span>{msg.t === 'e' ? '⚠️' : '✅'}</span><span style={{ fontSize: '13px' }}>{msg.x}</span></div>}
                            <form onSubmit={handleCreate}>
                                <div className="form-group"><label className="form-label">Unit *</label><select className="form-input" value={form.unit_id} onChange={e => setForm(f => ({ ...f, unit_id: e.target.value }))} required><option value="">Pilih</option>{units.map(u => <option key={u.id} value={u.id}>{u.nama} ({u.kode})</option>)}</select></div>
                                <div className="form-group"><label className="form-label">Tahun *</label><select className="form-input" value={form.tahun_anggaran} onChange={e => setForm(f => ({ ...f, tahun_anggaran: Number(e.target.value) }))}>{[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}</select></div>
                                <div className="form-group"><label className="form-label">Akun CoA * <span style={{ fontSize: '11px', color: '#94a3b8' }}>— hanya akun detail (non-header)</span></label>
                                    <input className="form-input" placeholder="Cari no. akun atau nama..." value={coaSearch} onChange={e => setCoaSearch(e.target.value)} style={{ marginBottom: '6px', fontSize: '12px' }} />
                                    <select className="form-input" value={form.coa_id} onChange={e => setForm(f => ({ ...f, coa_id: e.target.value }))} required size={6} style={{ fontSize: '12px' }}>
                                        <option value="">Pilih akun</option>{filteredCoa.map(c => <option key={c.id} value={c.id}>[{c.id}] {c.nama_akun} ({c.tipe_akun})</option>)}
                                    </select>
                                </div>
                                <div className="form-group"><label className="form-label">Jumlah (Rp) *</label><input type="number" className="form-input" value={form.jumlah_anggaran} onChange={e => setForm(f => ({ ...f, jumlah_anggaran: Number(e.target.value) }))} required min={0} /></div>
                                <div className="form-group"><label className="form-label">Keterangan</label><input className="form-input" value={form.keterangan} onChange={e => setForm(f => ({ ...f, keterangan: e.target.value }))} /></div>
                                <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: '8px' }}>Simpan RAPB</button>
                            </form>
                        </div>
                    </div>
                </div>
            )}

        </div>
    )
}
