import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { StatusBadgeStyled } from '@/components/StatusBadge'
import { formatRupiah } from '@/lib/utils'
import type { AnggaranStatus } from '@/lib/utils'

export default async function DashboardPage() {
    const supabase = await createClient()

    const {
        data: { user },
    } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()
    if (!profile) redirect('/login')

    let query = supabase
        .from('anggaran')
        .select('*, profiles!anggaran_submitted_by_fkey(full_name)')
        .order('created_at', { ascending: false })
        .limit(10)

    if (profile.role === 'anggota') {
        query = query.eq('submitted_by', user.id)
    } else if (profile.role === 'kepala_divisi') {
        query = query.eq('divisi', profile.divisi)
    }

    const { data: anggaranList } = await query

    const stats = {
        total: anggaranList?.length || 0,
        pending: anggaranList?.filter((a) => a.status.startsWith('pending')).length || 0,
        revision: anggaranList?.filter((a) => a.status.startsWith('revision')).length || 0,
        approved: anggaranList?.filter((a) => a.status === 'approved').length || 0,
    }

    let pendingReview = 0
    if (profile.role === 'kepala_divisi') {
        const { count } = await supabase
            .from('anggaran')
            .select('*', { count: 'exact', head: true })
            .eq('divisi', profile.divisi)
            .eq('status', 'pending_kepala')
        pendingReview = count || 0
    } else if (profile.role === 'keuangan') {
        const { count } = await supabase
            .from('anggaran')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'pending_keuangan')
        pendingReview = count || 0
    } else if (profile.role === 'rektorat') {
        const { count } = await supabase
            .from('anggaran')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'pending_rektorat')
        pendingReview = count || 0
    }

    const reviewLink =
        profile.role === 'kepala_divisi'
            ? '/kepala'
            : profile.role === 'keuangan'
                ? '/keuangan'
                : profile.role === 'rektorat'
                    ? '/rektorat'
                    : null

    const firstName = profile.full_name.split(' ')[0]

    return (
        <div style={{ animation: 'fadeIn 0.4s ease' }}>
            {/* Header */}
            <div className="page-header">
                <h1 className="page-title">
                    Halo, {firstName} 👋
                </h1>
                <p className="page-subtitle">
                    {profile.role === 'anggota'
                        ? 'Pantau dan kelola pengajuan anggaran Anda di sini.'
                        : 'Kelola dan tinjau pengajuan anggaran yang masuk.'}
                </p>
            </div>

            {/* Stats */}
            <div className="stats-grid">
                <div className="stat-card">
                    <div className="stat-icon" style={{ background: '#eef2ff', color: '#6366f1' }}>
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></svg>
                    </div>
                    <div>
                        <div className="stat-value">{stats.total}</div>
                        <div className="stat-label">Total Pengajuan</div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon" style={{ background: '#dbeafe', color: '#3b82f6' }}>
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
                    </div>
                    <div>
                        <div className="stat-value">{stats.pending}</div>
                        <div className="stat-label">Menunggu</div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon" style={{ background: '#fef3c7', color: '#d97706' }}>
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 4v6h6" /><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" /></svg>
                    </div>
                    <div>
                        <div className="stat-value">{stats.revision}</div>
                        <div className="stat-label">Perlu Revisi</div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon" style={{ background: '#d1fae5', color: '#059669' }}>
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
                    </div>
                    <div>
                        <div className="stat-value">{stats.approved}</div>
                        <div className="stat-label">Disetujui</div>
                    </div>
                </div>

                {reviewLink && (
                    <Link href={reviewLink} style={{ textDecoration: 'none' }}>
                        <div className="stat-card" style={{
                            borderColor: pendingReview > 0 ? '#fbbf24' : '#e2e8f0',
                            background: pendingReview > 0 ? '#fffbeb' : 'white',
                            cursor: 'pointer',
                            height: '100%',
                        }}>
                            <div className="stat-icon" style={{
                                background: pendingReview > 0 ? '#fef3c7' : '#f8fafc',
                                color: pendingReview > 0 ? '#d97706' : '#94a3b8',
                            }}>
                                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></svg>
                            </div>
                            <div>
                                <div className="stat-value" style={{ color: pendingReview > 0 ? '#d97706' : '#0f172a' }}>
                                    {pendingReview}
                                </div>
                                <div className="stat-label">Perlu Ditinjau</div>
                            </div>
                        </div>
                    </Link>
                )}
            </div>

            {/* Quick Action */}
            {profile.role === 'anggota' && (
                <div style={{ marginBottom: '24px' }}>
                    <Link href="/submit" className="btn btn-primary" id="btn-submit-anggaran">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                        Ajukan Anggaran Baru
                    </Link>
                </div>
            )}

            {/* Table */}
            <div className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>
                        {profile.role === 'anggota' ? 'Pengajuan Saya' : 'Pengajuan Terkini'}
                    </h2>
                    <Link href="/riwayat" style={{ fontSize: '13px', color: '#6366f1', textDecoration: 'none', fontWeight: 500 }}>
                        Lihat semua →
                    </Link>
                </div>

                {!anggaranList || anggaranList.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '48px 0', color: '#94a3b8' }}>
                        <div style={{ fontSize: '40px', marginBottom: '12px', opacity: 0.5 }}>📭</div>
                        <p style={{ margin: 0, fontSize: '14px' }}>
                            {profile.role === 'anggota'
                                ? 'Belum ada pengajuan. Klik tombol di atas untuk mulai.'
                                : 'Belum ada pengajuan anggaran masuk.'}
                        </p>
                    </div>
                ) : (
                    <div className="table-wrapper">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Judul</th>
                                    {profile.role !== 'anggota' && <th>Pengaju</th>}
                                    <th>Divisi</th>
                                    <th>Total</th>
                                    <th>Status</th>
                                    <th>Tanggal</th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody>
                                {anggaranList.map((a) => (
                                    <tr key={a.id}>
                                        <td style={{ fontWeight: 500 }}>{a.judul}</td>
                                        {profile.role !== 'anggota' && (
                                            <td style={{ color: '#64748b' }}>
                                                {(a.profiles as { full_name: string } | null)?.full_name || '-'}
                                            </td>
                                        )}
                                        <td>
                                            <span style={{ padding: '2px 10px', background: '#f1f5f9', borderRadius: '20px', fontSize: '12px', color: '#475569', fontWeight: 500 }}>
                                                {a.divisi}
                                            </span>
                                        </td>
                                        <td style={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                                            {a.total_anggaran ? formatRupiah(a.total_anggaran) : '-'}
                                        </td>
                                        <td>
                                            <StatusBadgeStyled status={a.status as AnggaranStatus} />
                                        </td>
                                        <td style={{ color: '#94a3b8', fontSize: '12px', whiteSpace: 'nowrap' }}>
                                            {new Date(a.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                                        </td>
                                        <td>
                                            <Link
                                                href={`/anggaran/${a.id}`}
                                                className="btn btn-outline btn-sm"
                                                id={`btn-detail-${a.id}`}
                                            >
                                                Detail
                                            </Link>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    )
}
