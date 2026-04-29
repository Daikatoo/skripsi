'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface Unit { id: string; kode: string; nama: string; tipe: string; parent_id: string | null; urutan: number }
const TIPE_OPT = [{ value: 'rektorat', label: 'Rektorat' }, { value: 'fakultas', label: 'Fakultas' }, { value: 'prodi', label: 'Program Studi' }, { value: 'unit', label: 'Unit Pendukung' }]
const TC: Record<string, { bg: string; text: string }> = { rektorat: { bg: '#eef2ff', text: '#6366f1' }, fakultas: { bg: '#dbeafe', text: '#2563eb' }, prodi: { bg: '#d1fae5', text: '#059669' }, unit: { bg: '#fef3c7', text: '#d97706' } }

export default function MasterDataPage() {
    const supabase = createClient(); const router = useRouter()
    const [units, setUnits] = useState<Unit[]>([]); const [loading, setLoading] = useState(true)
    const [drawerOpen, setDrawerOpen] = useState(false); const [isAdmin, setIsAdmin] = useState(false)
    const [msg, setMsg] = useState({ t: '', x: '' }); const [delId, setDelId] = useState<string | null>(null)
    const [form, setForm] = useState({ kode: '', nama: '', tipe: 'unit', parent_id: '' })
    const [tab, setTab] = useState<'unit' | 'coa'>('unit')
    const [coaList, setCoaList] = useState<any[]>([]); const [coaFilter, setCoaFilter] = useState('')

    useEffect(() => {
        (async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) { router.push('/dashboard'); return }
            const { data: p } = await supabase.from('profiles').select('role').eq('id', user.id).single()
            if (!p || p.role !== 'admin') { router.push('/dashboard'); return }
            setIsAdmin(true)
        })()
    }, [])

    useEffect(() => { if (isAdmin) { fetchUnits(); fetchCoa() } }, [isAdmin])

    const fetchUnits = async () => { setLoading(true); const r = await fetch('/api/master-unit'); if (r.ok) setUnits(await r.json()); setLoading(false) }
    const fetchCoa = async () => { const r = await fetch('/api/coa'); if (r.ok) setCoaList(await r.json()) }

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault(); setMsg({ t: '', x: '' })
        const r = await fetch('/api/master-unit', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
        const d = await r.json()
        if (!r.ok) { setMsg({ t: 'e', x: d.error }); return }
        setMsg({ t: 's', x: `Unit "${form.nama}" ditambahkan.` }); setForm({ kode: '', nama: '', tipe: 'unit', parent_id: '' }); fetchUnits()
        setTimeout(() => setDrawerOpen(false), 1000)
    }
    const handleDel = async (id: string) => { await fetch(`/api/master-unit?id=${id}`, { method: 'DELETE' }); setDelId(null); fetchUnits() }

    const getChildren = (pid: string | null) => units.filter(u => u.parent_id === pid).sort((a, b) => a.urutan - b.urutan)
    const rootUnits = getChildren(null)
    const parentOpts = units.filter(u => ['fakultas', 'rektorat'].includes(u.tipe))
    const filteredCoa = coaFilter ? coaList.filter(c => c.id.includes(coaFilter) || c.nama_akun.toLowerCase().includes(coaFilter.toLowerCase())) : coaList

    if (!isAdmin) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh', color: '#94a3b8' }}>Memeriksa akses...</div>

    return (
        <div style={{ animation: 'fadeIn 0.4s ease' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <div><h1 className="page-title">🏛️ Master Data</h1><p className="page-subtitle">Unit organisasi dan Chart of Accounts (CoA)</p></div>
                {tab === 'unit' && <button className="btn btn-primary" onClick={() => { setDrawerOpen(true); setMsg({ t: '', x: '' }) }}>+ Tambah Unit</button>}
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: '4px', marginBottom: '20px', background: '#f1f5f9', padding: '4px', borderRadius: '10px', width: 'fit-content' }}>
                {[{ k: 'unit' as const, l: '🏛️ Unit/Prodi' }, { k: 'coa' as const, l: '📒 Chart of Accounts' }].map(t => (
                    <button key={t.k} onClick={() => setTab(t.k)} style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 600, background: tab === t.k ? 'white' : 'transparent', color: tab === t.k ? '#0f172a' : '#64748b', boxShadow: tab === t.k ? '0 1px 3px rgba(0,0,0,0.1)' : 'none', transition: 'all 0.2s' }}>{t.l}</button>
                ))}
            </div>

            {tab === 'unit' ? (
                <div className="card" style={{ padding: 0 }}>
                    <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--border)' }}>
                        <h2 style={{ fontSize: '15px', fontWeight: 600, margin: 0 }}>Daftar Unit <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 400 }}>{units.length} unit</span></h2>
                    </div>
                    {loading ? <div style={{ padding: '48px', textAlign: 'center', color: '#94a3b8' }}>Memuat...</div> : (
                        <div className="table-wrapper" style={{ margin: 0, border: 'none', borderRadius: '0 0 12px 12px' }}>
                            <table className="data-table"><thead><tr><th>Kode</th><th>Nama</th><th>Tipe</th><th>Induk</th><th style={{ width: '60px' }}></th></tr></thead>
                                <tbody>{rootUnits.map(u => { const ch = getChildren(u.id); const c = TC[u.tipe] || TC.unit; return (<>
                                    <tr key={u.id}><td style={{ fontWeight: 600, fontSize: '12px', color: '#6366f1' }}>{u.kode}</td><td style={{ fontWeight: 600 }}>{u.nama}</td><td><span style={{ padding: '2px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 600, background: c.bg, color: c.text }}>{u.tipe}</span></td><td style={{ color: '#94a3b8', fontSize: '12px' }}>—</td>
                                        <td>{delId === u.id ? <div style={{ display: 'flex', gap: '4px' }}><button className="btn btn-sm" onClick={() => handleDel(u.id)} style={{ padding: '3px 8px', fontSize: '11px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Ya</button><button className="btn btn-sm" onClick={() => setDelId(null)} style={{ padding: '3px 8px', fontSize: '11px', border: '1px solid #e2e8f0', background: 'white', borderRadius: '6px', cursor: 'pointer' }}>Batal</button></div> : <button onClick={() => setDelId(u.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: '3px 6px' }}>🗑️</button>}</td></tr>
                                    {ch.map(child => { const cc = TC[child.tipe] || TC.unit; return (
                                        <tr key={child.id}><td style={{ paddingLeft: '36px', fontSize: '12px', color: '#6366f1' }}>{child.kode}</td><td style={{ paddingLeft: '36px', color: '#475569' }}>↳ {child.nama}</td><td><span style={{ padding: '2px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 600, background: cc.bg, color: cc.text }}>{child.tipe}</span></td><td style={{ color: '#94a3b8', fontSize: '12px' }}>{u.nama}</td>
                                            <td><button onClick={() => setDelId(child.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: '3px 6px' }}>🗑️</button></td></tr>
                                    )})}
                                </>)})}</tbody></table>
                        </div>
                    )}
                </div>
            ) : (
                <div className="card" style={{ padding: 0 }}>
                    <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h2 style={{ fontSize: '15px', fontWeight: 600, margin: 0 }}>Chart of Accounts (CoA ACCURATE) <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 400 }}>{coaList.length} akun</span></h2>
                        <input placeholder="Cari no. akun atau nama..." value={coaFilter} onChange={e => setCoaFilter(e.target.value)} className="form-input" style={{ width: '260px', fontSize: '12px' }} />
                    </div>
                    <div className="table-wrapper" style={{ margin: 0, border: 'none', borderRadius: '0 0 12px 12px', maxHeight: '600px', overflowY: 'auto' }}>
                        <table className="data-table"><thead><tr><th>No. Akun</th><th>Nama Akun</th><th>Tipe</th><th>Level</th><th>Header</th></tr></thead>
                            <tbody>{filteredCoa.map((c: any) => (
                                <tr key={c.id} style={{ background: c.is_header ? '#f8fafc' : 'white' }}>
                                    <td style={{ fontWeight: c.is_header ? 700 : 500, fontSize: '12px', color: '#6366f1', paddingLeft: c.level > 1 ? `${(c.level - 1) * 20 + 12}px` : '12px' }}>{c.id}</td>
                                    <td style={{ fontWeight: c.is_header ? 600 : 400 }}>{c.nama_akun}</td>
                                    <td><span style={{ padding: '2px 8px', borderRadius: '20px', fontSize: '10px', fontWeight: 600, background: c.tipe_akun === 'Revenue' ? '#d1fae5' : c.tipe_akun === 'Expense' ? '#fee2e2' : '#f1f5f9', color: c.tipe_akun === 'Revenue' ? '#059669' : c.tipe_akun === 'Expense' ? '#dc2626' : '#475569' }}>{c.tipe_akun}</span></td>
                                    <td style={{ fontSize: '12px', color: '#94a3b8' }}>{c.level}</td>
                                    <td>{c.is_header ? <span style={{ fontSize: '11px', color: '#d97706' }}>Header</span> : <span style={{ fontSize: '11px', color: '#94a3b8' }}>—</span>}</td>
                                </tr>
                            ))}</tbody></table>
                    </div>
                </div>
            )}

            {/* Drawer */}
            {drawerOpen && (
                <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', justifyContent: 'flex-end' }}>
                    <div onClick={() => setDrawerOpen(false)} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(2px)' }} />
                    <div style={{ position: 'relative', width: '400px', maxWidth: '90vw', background: 'white', boxShadow: '-8px 0 30px rgba(0,0,0,0.1)', display: 'flex', flexDirection: 'column', animation: 'slideInRight 0.3s ease', overflowY: 'auto' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid var(--border)' }}>
                            <h2 style={{ margin: 0, fontSize: '17px', fontWeight: 700 }}>Tambah Unit</h2>
                            <button onClick={() => setDrawerOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: '20px' }}>✕</button>
                        </div>
                        <div style={{ padding: '24px' }}>
                            {msg.x && <div className={`alert ${msg.t === 'e' ? 'alert-danger' : 'alert-success'}`}><span>{msg.t === 'e' ? '⚠️' : '✅'}</span><span style={{ fontSize: '13px' }}>{msg.x}</span></div>}
                            <form onSubmit={handleCreate}>
                                <div className="form-group"><label className="form-label">Kode</label><input className="form-input" placeholder="FT-IF" value={form.kode} onChange={e => setForm(f => ({ ...f, kode: e.target.value }))} required /></div>
                                <div className="form-group"><label className="form-label">Nama</label><input className="form-input" placeholder="Informatika" value={form.nama} onChange={e => setForm(f => ({ ...f, nama: e.target.value }))} required /></div>
                                <div className="form-group"><label className="form-label">Tipe</label><select className="form-input" value={form.tipe} onChange={e => setForm(f => ({ ...f, tipe: e.target.value }))}>{TIPE_OPT.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}</select></div>
                                <div className="form-group"><label className="form-label">Induk</label><select className="form-input" value={form.parent_id} onChange={e => setForm(f => ({ ...f, parent_id: e.target.value }))}><option value="">— Tidak ada —</option>{parentOpts.map(p => <option key={p.id} value={p.id}>{p.nama} ({p.kode})</option>)}</select></div>
                                <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: '8px' }}>Simpan</button>
                            </form>
                        </div>
                    </div>
                </div>
            )}
            <style>{`@keyframes slideInRight{from{transform:translateX(100%)}to{transform:translateX(0)}}`}</style>
        </div>
    )
}
