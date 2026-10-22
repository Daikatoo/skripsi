'use client'
import React, { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface Unit {
    id: string
    department_no: string
    name: string
    category: 'prodi' | 'unit'
    status: string
    kode?: string
    nama?: string
    tipe?: string
    parent_id?: string | null
    urutan?: number
}

const CATEGORY_OPT = [
    { value: 'prodi', label: 'Program Studi (Prodi)' },
    { value: 'unit', label: 'Unit Pendukung (Unit)' }
]

const STATUS_OPT = [
    { value: 'Active', label: 'Active' },
    { value: 'Inactive', label: 'Inactive' }
]

export default function MasterDataPage() {
    const supabase = createClient()
    const router = useRouter()
    const [units, setUnits] = useState<Unit[]>([])
    const [loading, setLoading] = useState(true)
    const [drawerOpen, setDrawerOpen] = useState(false)
    const [isAdmin, setIsAdmin] = useState(false)
    const [msg, setMsg] = useState({ t: '', x: '' })
    const [delId, setDelId] = useState<string | null>(null)
    const [editId, setEditId] = useState<string | null>(null)
    const [form, setForm] = useState({
        department_no: '',
        name: '',
        category: 'unit' as 'prodi' | 'unit',
        status: 'Active'
    })
    const [tab, setTab] = useState<'unit' | 'coa'>('unit')
    const [categoryFilter, setCategoryFilter] = useState<'all' | 'prodi' | 'unit'>('all')
    const [searchTerm, setSearchTerm] = useState('')
    const [coaList, setCoaList] = useState<any[]>([])
    const [coaFilter, setCoaFilter] = useState('')

    useEffect(() => {
        (async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) { router.push('/dashboard'); return }
            const { data: p } = await supabase.from('profiles').select('role').eq('id', user.id).single()
            if (!p || p.role !== 'admin') { router.push('/dashboard'); return }
            setIsAdmin(true)
        })()
    }, [])

    useEffect(() => {
        if (isAdmin) {
            fetchUnits()
            fetchCoa()
        }
    }, [isAdmin])

    const fetchUnits = async () => {
        setLoading(true)
        const r = await fetch('/api/master-unit')
        if (r.ok) {
            const data = await r.json()
            setUnits(Array.isArray(data) ? data : [])
        }
        setLoading(false)
    }

    const fetchCoa = async () => {
        const r = await fetch('/api/coa')
        if (r.ok) setCoaList(await r.json())
    }

    const openAddDrawer = () => {
        setEditId(null)
        setForm({ department_no: '', name: '', category: 'unit', status: 'Active' })
        setMsg({ t: '', x: '' })
        setDrawerOpen(true)
    }

    const openEditDrawer = (u: Unit) => {
        setEditId(u.id)
        setForm({
            department_no: u.department_no || u.kode || '',
            name: u.name || u.nama || '',
            category: (u.category || u.tipe === 'prodi' ? 'prodi' : 'unit') as 'prodi' | 'unit',
            status: u.status || 'Active'
        })
        setMsg({ t: '', x: '' })
        setDrawerOpen(true)
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setMsg({ t: '', x: '' })
        
        // Validation: Category strictly 'prodi' or 'unit'
        if (!['prodi', 'unit'].includes(form.category)) {
            setMsg({ t: 'e', x: 'Kategori harus dipilih antara "prodi" atau "unit".' })
            return
        }

        const method = editId ? 'PUT' : 'POST'
        const body = editId ? { id: editId, ...form } : form
        const r = await fetch('/api/master-unit', {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        })
        const d = await r.json()
        if (!r.ok) {
            setMsg({ t: 'e', x: d.error || 'Terjadi kesalahan.' })
            return
        }
        setMsg({ t: 's', x: editId ? `Departemen "${form.name}" berhasil diperbarui.` : `Departemen "${form.name}" berhasil ditambahkan.` })
        fetchUnits()
        setTimeout(() => setDrawerOpen(false), 1000)
    }

    const handleDel = async (id: string) => {
        const r = await fetch(`/api/master-unit?id=${id}`, { method: 'DELETE' })
        const d = await r.json()
        if (!r.ok) {
            alert(d.error || 'Gagal menghapus departemen.')
        }
        setDelId(null)
        fetchUnits()
    }

    // Filter units by category and search
    const filteredUnits = units.filter(u => {
        const matchesCategory = categoryFilter === 'all' || u.category === categoryFilter
        const q = searchTerm.toLowerCase().trim()
        const matchesSearch = !q ||
            (u.department_no || u.kode || '').toLowerCase().includes(q) ||
            (u.name || u.nama || '').toLowerCase().includes(q)
        return matchesCategory && matchesSearch
    })

    const countProdi = units.filter(u => u.category === 'prodi').length
    const countUnit = units.filter(u => u.category === 'unit').length

    const filteredCoa = coaFilter
        ? coaList.filter(c => c.id.includes(coaFilter) || c.nama_akun.toLowerCase().includes(coaFilter.toLowerCase()))
        : coaList

    if (!isAdmin) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh', color: '#94a3b8' }}>
                Memeriksa akses...
            </div>
        )
    }

    return (
        <div style={{ animation: 'fadeIn 0.4s ease' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <div>
                    <h1 className="page-title">🏛️ Master Data</h1>
                    <p className="page-subtitle">Departemen (Unit & Program Studi) dan Chart of Accounts (CoA)</p>
                </div>
                {tab === 'unit' && (
                    <button className="btn btn-primary" onClick={openAddDrawer}>
                        + Tambah Departemen
                    </button>
                )}
            </div>

            {/* Main Tabs */}
            <div style={{ display: 'flex', gap: '4px', marginBottom: '20px', background: '#f1f5f9', padding: '4px', borderRadius: '10px', width: 'fit-content' }}>
                {[
                    { k: 'unit' as const, l: '🏛️ Departemen (Prodi & Unit)' },
                    { k: 'coa' as const, l: '📒 Chart of Accounts' }
                ].map(t => (
                    <button
                        key={t.k}
                        onClick={() => setTab(t.k)}
                        style={{
                            padding: '8px 16px',
                            borderRadius: '8px',
                            border: 'none',
                            cursor: 'pointer',
                            fontSize: '13px',
                            fontWeight: 600,
                            background: tab === t.k ? 'white' : 'transparent',
                            color: tab === t.k ? '#0f172a' : '#64748b',
                            boxShadow: tab === t.k ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                            transition: 'all 0.2s'
                        }}
                    >
                        {t.l}
                    </button>
                ))}
            </div>

            {tab === 'unit' ? (
                <div className="card" style={{ padding: 0 }}>
                    {/* Header bar with Category Filters & Search */}
                    <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--border)', display: 'flex', flexWrap: 'wrap', gap: '16px', justifyContent: 'space-between', alignItems: 'center' }}>
                        {/* Category filter pills */}
                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                            <span style={{ fontSize: '13px', fontWeight: 600, color: '#64748b', marginRight: '6px' }}>Filter Kategori:</span>
                            <button
                                onClick={() => setCategoryFilter('all')}
                                style={{
                                    padding: '5px 12px',
                                    borderRadius: '20px',
                                    fontSize: '12px',
                                    fontWeight: 600,
                                    border: '1px solid',
                                    cursor: 'pointer',
                                    borderColor: categoryFilter === 'all' ? '#6366f1' : '#e2e8f0',
                                    background: categoryFilter === 'all' ? '#eef2ff' : '#ffffff',
                                    color: categoryFilter === 'all' ? '#4f46e5' : '#64748b',
                                    transition: 'all 0.15s'
                                }}
                            >
                                Semua ({units.length})
                            </button>
                            <button
                                onClick={() => setCategoryFilter('prodi')}
                                style={{
                                    padding: '5px 12px',
                                    borderRadius: '20px',
                                    fontSize: '12px',
                                    fontWeight: 600,
                                    border: '1px solid',
                                    cursor: 'pointer',
                                    borderColor: categoryFilter === 'prodi' ? '#10b981' : '#e2e8f0',
                                    background: categoryFilter === 'prodi' ? '#ecfdf5' : '#ffffff',
                                    color: categoryFilter === 'prodi' ? '#059669' : '#64748b',
                                    transition: 'all 0.15s'
                                }}
                            >
                                🎓 Prodi ({countProdi})
                            </button>
                            <button
                                onClick={() => setCategoryFilter('unit')}
                                style={{
                                    padding: '5px 12px',
                                    borderRadius: '20px',
                                    fontSize: '12px',
                                    fontWeight: 600,
                                    border: '1px solid',
                                    cursor: 'pointer',
                                    borderColor: categoryFilter === 'unit' ? '#3b82f6' : '#e2e8f0',
                                    background: categoryFilter === 'unit' ? '#eff6ff' : '#ffffff',
                                    color: categoryFilter === 'unit' ? '#2563eb' : '#64748b',
                                    transition: 'all 0.15s'
                                }}
                            >
                                🏢 Unit ({countUnit})
                            </button>
                        </div>

                        {/* Search input */}
                        <div style={{ minWidth: '240px' }}>
                            <input
                                placeholder="Cari No. Departemen atau Nama..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className="form-input"
                                style={{ fontSize: '13px', padding: '6px 12px' }}
                            />
                        </div>
                    </div>

                    {loading ? (
                        <div style={{ padding: '48px', textAlign: 'center', color: '#94a3b8' }}>Memuat data departemen...</div>
                    ) : filteredUnits.length === 0 ? (
                        <div style={{ padding: '48px', textAlign: 'center', color: '#94a3b8' }}>
                            Tidak ada departemen yang sesuai dengan filter.
                        </div>
                    ) : (
                        <div className="table-wrapper" style={{ margin: 0, border: 'none', borderRadius: '0 0 12px 12px' }}>
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th style={{ width: '160px' }}>Department No</th>
                                        <th>Nama Departemen</th>
                                        <th style={{ width: '150px' }}>Kategori</th>
                                        <th style={{ width: '120px' }}>Status</th>
                                        <th style={{ width: '100px', textAlign: 'center' }}>Aksi</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredUnits.map(u => {
                                        const isProdi = u.category === 'prodi'
                                        return (
                                            <tr key={u.id}>
                                                <td style={{ fontWeight: 700, fontSize: '13px', fontFamily: 'monospace', color: '#4f46e5' }}>
                                                    {u.department_no || u.kode}
                                                </td>
                                                <td style={{ fontWeight: 600, color: '#1e293b' }}>
                                                    {u.name || u.nama}
                                                </td>
                                                <td>
                                                    <span style={{
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        gap: '4px',
                                                        padding: '3px 12px',
                                                        borderRadius: '20px',
                                                        fontSize: '11px',
                                                        fontWeight: 700,
                                                        letterSpacing: '0.03em',
                                                        textTransform: 'uppercase',
                                                        background: isProdi ? '#d1fae5' : '#dbeafe',
                                                        color: isProdi ? '#047857' : '#1d4ed8',
                                                        border: `1px solid ${isProdi ? '#a7f3d0' : '#bfdbfe'}`
                                                    }}>
                                                        {isProdi ? '🎓 Prodi' : '🏢 Unit'}
                                                    </span>
                                                </td>
                                                <td>
                                                    <span style={{
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        gap: '5px',
                                                        padding: '2px 10px',
                                                        borderRadius: '16px',
                                                        fontSize: '11px',
                                                        fontWeight: 600,
                                                        background: u.status === 'Active' ? '#f0fdf4' : '#fef2f2',
                                                        color: u.status === 'Active' ? '#15803d' : '#b91c1c',
                                                        border: `1px solid ${u.status === 'Active' ? '#bbf7d0' : '#fecaca'}`
                                                    }}>
                                                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: u.status === 'Active' ? '#22c55e' : '#ef4444' }}></span>
                                                        {u.status || 'Active'}
                                                    </span>
                                                </td>
                                                <td style={{ textAlign: 'center' }}>
                                                    <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', alignItems: 'center' }}>
                                                        <button
                                                            onClick={() => openEditDrawer(u)}
                                                            title="Edit Departemen"
                                                            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px', color: '#6366f1', padding: '4px' }}
                                                        >
                                                            ✏️
                                                        </button>
                                                        {delId === u.id ? (
                                                            <div style={{ display: 'flex', gap: '4px' }}>
                                                                <button
                                                                    onClick={() => handleDel(u.id)}
                                                                    style={{ padding: '2px 6px', fontSize: '11px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                                                                >
                                                                    Ya
                                                                </button>
                                                                <button
                                                                    onClick={() => setDelId(null)}
                                                                    style={{ padding: '2px 6px', fontSize: '11px', border: '1px solid #cbd5e1', background: 'white', borderRadius: '4px', cursor: 'pointer' }}
                                                                >
                                                                    Batal
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <button
                                                                onClick={() => setDelId(u.id)}
                                                                title="Hapus Departemen"
                                                                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px', color: '#94a3b8', padding: '4px' }}
                                                            >
                                                                🗑️
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
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

            {/* Add / Edit Drawer */}
            {drawerOpen && (
                <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', justifyContent: 'flex-end' }}>
                    <div onClick={() => setDrawerOpen(false)} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(2px)' }} />
                    <div style={{ position: 'relative', width: '440px', maxWidth: '90vw', background: 'white', boxShadow: '-8px 0 30px rgba(0,0,0,0.1)', display: 'flex', flexDirection: 'column', animation: 'slideInRight 0.3s ease', overflowY: 'auto' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid var(--border)' }}>
                            <h2 style={{ margin: 0, fontSize: '17px', fontWeight: 700 }}>
                                {editId ? 'Edit Departemen' : 'Tambah Departemen'}
                            </h2>
                            <button onClick={() => setDrawerOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: '20px' }}>✕</button>
                        </div>
                        <div style={{ padding: '24px' }}>
                            {msg.x && (
                                <div className={`alert ${msg.t === 'e' ? 'alert-danger' : 'alert-success'}`}>
                                    <span>{msg.t === 'e' ? '⚠️' : '✅'}</span>
                                    <span style={{ fontSize: '13px' }}>{msg.x}</span>
                                </div>
                            )}
                            <form onSubmit={handleSubmit}>
                                <div className="form-group">
                                    <label className="form-label">Department No (Nomor Departemen) *</label>
                                    <input
                                        className="form-input"
                                        placeholder="Contoh: WK-014"
                                        value={form.department_no}
                                        onChange={e => setForm(f => ({ ...f, department_no: e.target.value }))}
                                        required
                                    />
                                    <span style={{ fontSize: '11px', color: '#94a3b8' }}>Nomor unik departemen (e.g. WK-002, WK-014).</span>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Nama Departemen *</label>
                                    <input
                                        className="form-input"
                                        placeholder="Contoh: Informatika"
                                        value={form.name}
                                        onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Kategori (Category) *</label>
                                    <select
                                        className="form-input"
                                        value={form.category}
                                        onChange={e => setForm(f => ({ ...f, category: e.target.value as 'prodi' | 'unit' }))}
                                        required
                                    >
                                        {CATEGORY_OPT.map(c => (
                                            <option key={c.value} value={c.value}>{c.label}</option>
                                        ))}
                                    </select>
                                    <span style={{ fontSize: '11px', color: '#94a3b8' }}>Hanya boleh bernilai 'prodi' atau 'unit'.</span>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Status *</label>
                                    <select
                                        className="form-input"
                                        value={form.status}
                                        onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                                        required
                                    >
                                        {STATUS_OPT.map(s => (
                                            <option key={s.value} value={s.value}>{s.label}</option>
                                        ))}
                                    </select>
                                </div>
                                <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: '12px' }}>
                                    {editId ? 'Simpan Perubahan' : 'Simpan Departemen'}
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

