'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ROLE_CONFIG, formatDate } from '@/lib/utils'
import { useRouter } from 'next/navigation'

interface UserProfile {
    id: string
    full_name: string
    email: string
    username: string | null
    role: string
    divisi: string | null
    unit_id: string | null
    created_at: string
}

interface Unit {
    id: string
    nama: string
    kode: string
    department_no?: string
    name?: string
    category?: string
    status?: string
}

export default function AdminUsersPage() {
    const supabase = createClient()
    const router = useRouter()

    const [users, setUsers] = useState<UserProfile[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [message, setMessage] = useState({ type: '', text: '' })
    const [drawerOpen, setDrawerOpen] = useState(false)
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
    const [isAdmin, setIsAdmin] = useState(false)
    const [checkingAuth, setCheckingAuth] = useState(true)

    const [form, setForm] = useState({
        full_name: '',
        username: '',
        password: '',
        role: 'anggota',
        unit_id: '',
    })
    
    const [units, setUnits] = useState<Unit[]>([])

    // Proteksi: cek apakah user = admin
    useEffect(() => {
        async function checkAdmin() {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) { router.push('/dashboard'); return }

            const { data: profile } = await supabase
                .from('profiles')
                .select('role')
                .eq('id', user.id)
                .single()

            if (!profile || profile.role !== 'admin') {
                router.push('/dashboard')
                return
            }

            setIsAdmin(true)
            setCheckingAuth(false)
        }
        checkAdmin()
    }, [])

    const fetchUsers = async () => {
        setIsLoading(true)
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .order('created_at', { ascending: false })

        if (!error && data) {
            setUsers(data as UserProfile[])
        }
        setIsLoading(false)
    }

    useEffect(() => {
        if (isAdmin) {
            fetchUsers()
            fetch('/api/master-unit').then(r => r.json()).then(d => Array.isArray(d) ? setUnits(d) : setUnits([]))
        }
    }, [isAdmin])

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setForm({ ...form, [e.target.name]: e.target.value })
    }

    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault()
        setMessage({ type: '', text: '' })
        setIsSubmitting(true)

        if (!form.unit_id) {
            setMessage({ type: 'error', text: 'Silakan pilih unit/divisi.' })
            setIsSubmitting(false)
            return
        }

        try {
            const res = await fetch('/api/admin/users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form)
            })
            const data = await res.json()

            if (!res.ok) throw new Error(data.error || 'Terjadi kesalahan')

            setMessage({ type: 'success', text: `Akun ${form.full_name} berhasil dibuat!` })
            setForm({ full_name: '', username: '', password: '', role: 'anggota', unit_id: '' })
            fetchUsers()
            setTimeout(() => setDrawerOpen(false), 1500)

        } catch (error: any) {
            setMessage({ type: 'error', text: error.message })
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleDeleteUser = async (userId: string) => {
        try {
            const res = await fetch(`/api/admin/users?id=${userId}`, { method: 'DELETE' })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error)
            setDeleteConfirm(null)
            fetchUsers()
        } catch (err: any) {
            alert('Gagal menghapus: ' + err.message)
            setDeleteConfirm(null)
        }
    }

    if (checkingAuth) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', color: '#94a3b8' }}>
                Memeriksa akses...
            </div>
        )
    }

    if (!isAdmin) return null

    return (
        <div style={{ animation: 'fadeIn 0.4s ease' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <div>
                    <h1 className="page-title">Manajemen Pengguna</h1>
                    <p className="page-subtitle">Kelola seluruh akun pengguna dalam sistem BudgetFlow.</p>
                </div>
                <button
                    className="btn btn-primary"
                    onClick={() => { setDrawerOpen(true); setMessage({ type: '', text: '' }) }}
                >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                    Tambah Akun
                </button>
            </div>

            {/* Users Table */}
            <div className="card" style={{ padding: 0 }}>
                <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--border)' }}>
                    <h2 style={{ fontSize: '15px', fontWeight: 600, margin: 0 }}>
                        Daftar Pengguna
                        <span style={{ marginLeft: '8px', fontSize: '12px', color: '#94a3b8', fontWeight: 400 }}>
                            {users.length} akun
                        </span>
                    </h2>
                </div>

                {isLoading ? (
                    <div style={{ padding: '48px', textAlign: 'center', color: '#94a3b8' }}>Memuat data...</div>
                ) : (
                    <div className="table-wrapper" style={{ margin: 0, border: 'none', borderRadius: '0 0 12px 12px' }}>
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Nama Lengkap</th>
                                    <th>Username</th>
                                    <th>Role</th>
                                    <th>Divisi</th>
                                    <th>Terdaftar</th>
                                    <th style={{ width: '80px' }}></th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} style={{ textAlign: 'center', color: '#94a3b8', padding: '32px' }}>
                                            Belum ada pengguna terdaftar.
                                        </td>
                                    </tr>
                                ) : (
                                    users.map((u) => {
                                        const roleCfg = ROLE_CONFIG[u.role] || { label: u.role, color: '#64748b' }
                                        return (
                                            <tr key={u.id}>
                                                <td style={{ fontWeight: 500, fontSize: '13px' }}>{u.full_name}</td>
                                                <td>
                                                    <span style={{ fontSize: '12px', color: '#6366f1', fontWeight: 500 }}>
                                                        @{u.username || '—'}
                                                    </span>
                                                </td>
                                                <td>
                                                    <span style={{
                                                        padding: '3px 10px',
                                                        borderRadius: '20px',
                                                        fontSize: '11px',
                                                        fontWeight: 600,
                                                        background: u.role === 'admin' ? '#eef2ff' : '#f1f5f9',
                                                        color: u.role === 'admin' ? '#6366f1' : '#475569',
                                                    }}>
                                                        {roleCfg.label}
                                                    </span>
                                                </td>
                                                <td style={{ fontSize: '13px', color: '#64748b' }}>{u.divisi || '—'}</td>
                                                <td style={{ fontSize: '12px', color: '#94a3b8', whiteSpace: 'nowrap' }}>
                                                    {new Date(u.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                </td>
                                                <td>
                                                    {deleteConfirm === u.id ? (
                                                        <div style={{ display: 'flex', gap: '4px' }}>
                                                            <button
                                                                className="btn btn-danger btn-sm"
                                                                onClick={() => handleDeleteUser(u.id)}
                                                                style={{ padding: '4px 8px', fontSize: '11px' }}
                                                            >Ya</button>
                                                            <button
                                                                className="btn btn-outline btn-sm"
                                                                onClick={() => setDeleteConfirm(null)}
                                                                style={{ padding: '4px 8px', fontSize: '11px' }}
                                                            >Batal</button>
                                                        </div>
                                                    ) : (
                                                        <button
                                                            className="btn btn-ghost btn-sm"
                                                            onClick={() => setDeleteConfirm(u.id)}
                                                            title="Hapus user"
                                                            style={{ color: '#94a3b8', padding: '4px 8px' }}
                                                        >
                                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        )
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Right Drawer — Tambah Akun Baru */}
            {drawerOpen && (
                <div
                    style={{
                        position: 'fixed',
                        inset: 0,
                        zIndex: 200,
                        display: 'flex',
                        justifyContent: 'flex-end',
                    }}
                >
                    {/* Backdrop */}
                    <div
                        onClick={() => setDrawerOpen(false)}
                        style={{
                            position: 'absolute',
                            inset: 0,
                            background: 'rgba(0,0,0,0.3)',
                            backdropFilter: 'blur(2px)',
                            animation: 'fadeIn 0.2s ease',
                        }}
                    />

                    {/* Panel */}
                    <div style={{
                        position: 'relative',
                        width: '400px',
                        maxWidth: '90vw',
                        background: 'white',
                        boxShadow: '-8px 0 30px rgba(0,0,0,0.1)',
                        display: 'flex',
                        flexDirection: 'column',
                        animation: 'slideInRight 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        overflowY: 'auto',
                    }}>
                        {/* Header */}
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '20px 24px',
                            borderBottom: '1px solid var(--border)',
                        }}>
                            <h2 style={{ margin: 0, fontSize: '17px', fontWeight: 700 }}>Tambah Akun Baru</h2>
                            <button
                                onClick={() => setDrawerOpen(false)}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer',
                                    color: '#94a3b8',
                                    fontSize: '20px',
                                    padding: '4px',
                                    lineHeight: 1,
                                }}
                            >✕</button>
                        </div>

                        {/* Form */}
                        <div style={{ padding: '24px', flex: 1 }}>
                            {message.text && (
                                <div className={`alert ${message.type === 'error' ? 'alert-danger' : 'alert-success'}`} style={{ marginBottom: '16px' }}>
                                    <span>{message.type === 'error' ? '⚠️' : '✅'}</span>
                                    <span style={{ fontSize: '13px' }}>{message.text}</span>
                                </div>
                            )}

                            <form onSubmit={handleCreateUser}>
                                <div className="form-group">
                                    <label className="form-label" htmlFor="full_name">Nama Lengkap</label>
                                    <input id="full_name" name="full_name" type="text" className="form-input"
                                        placeholder="Contoh: Budi Santoso" value={form.full_name}
                                        onChange={handleChange} required />
                                </div>

                                <div className="form-group">
                                    <label className="form-label" htmlFor="username">Username</label>
                                    <input id="username" name="username" type="text" className="form-input"
                                        placeholder="Contoh: budisantoso" value={form.username}
                                        onChange={handleChange} required />
                                </div>

                                <div className="form-group">
                                    <label className="form-label" htmlFor="password">Password</label>
                                    <input id="password" name="password" type="text" className="form-input"
                                        placeholder="Buat sandi sementara" value={form.password}
                                        onChange={handleChange} required minLength={6} />
                                </div>

                                <div className="form-group">
                                    <label className="form-label" htmlFor="role">Role</label>
                                    <select id="role" name="role" className="form-input form-select"
                                        value={form.role} onChange={handleChange} required>
                                        <option value="anggota">Anggota</option>
                                        <option value="kepala_divisi">Kepala Divisi</option>
                                        <option value="dekan">Dekan</option>
                                        <option value="keuangan">Keuangan</option>
                                        <option value="wakil_rektor_1">Wakil Rektor 1</option>
                                        <option value="wakil_rektor_2">Wakil Rektor 2</option>
                                        <option value="rektor">Rektor</option>
                                        <option value="rektorat">Rektorat</option>
                                        <option value="admin">Administrator</option>
                                    </select>
                                </div>

                                <div className="form-group">
                                    <label className="form-label" htmlFor="unit_id">Unit / Divisi</label>
                                    <select id="unit_id" name="unit_id" className="form-input form-select"
                                        value={form.unit_id} onChange={handleChange} required>
                                        <option value="">Pilih Unit / Divisi</option>
                                        {units.map((u) => (
                                            <option key={u.id} value={u.id}>
                                                [{u.category === 'prodi' ? 'Prodi' : 'Unit'}] {u.name || u.nama} ({u.department_no || u.kode})
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <button
                                    type="submit"
                                    className="btn btn-primary"
                                    disabled={isSubmitting}
                                    style={{ width: '100%', justifyContent: 'center', marginTop: '8px' }}
                                >
                                    {isSubmitting ? 'Mendaftarkan...' : 'Daftarkan Pengguna'}
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            )}


        </div>
    )
}
