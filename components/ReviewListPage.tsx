import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { StatusBadgeStyled } from '@/components/StatusBadge'
import { formatRupiah } from '@/lib/utils'
import type { AnggaranStatus } from '@/lib/utils'

interface Props {
    role: 'kepala_divisi' | 'keuangan' | 'rektorat'
    pendingStatus: string
    title: string
    description: string
}

export default async function ReviewListPage({ role, pendingStatus, title, description }: Props) {
    const supabase = await createClient()
    const {
        data: { user },
    } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    const { data: profile } = await supabase
        .from('profiles').select('*').eq('id', user.id).single()
    if (!profile || profile.role !== role) redirect('/dashboard')

    let query = supabase
        .from('anggaran')
        .select('*, profiles!anggaran_submitted_by_fkey(full_name)')
        .order('created_at', { ascending: false })

    if (role === 'kepala_divisi') {
        query = query.eq('divisi', profile.divisi)
    }

    const { data: anggaran } = await query

    const pending = anggaran?.filter((a) => a.status === pendingStatus) || []
    const others = anggaran?.filter((a) => a.status !== pendingStatus) || []

    function ReviewHref(id: string) {
        if (role === 'kepala_divisi') return `/kepala/review/${id}`
        if (role === 'keuangan') return `/keuangan/review/${id}`
        return `/rektorat/review/${id}`
    }

    return (
        <div>
            <div className="page-header">
                <h1 className="page-title">{title}</h1>
                <p className="page-subtitle">{description}</p>
            </div>

            {/* Pending Review */}
            <div className="card" style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>
                        ⏳ Menunggu Review Anda
                        {pending.length > 0 && (
                            <span style={{
                                marginLeft: '8px', background: '#ef4444', color: 'white',
                                borderRadius: '12px', padding: '2px 8px', fontSize: '12px',
                            }}>
                                {pending.length}
                            </span>
                        )}
                    </h2>
                </div>

                {pending.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px 0', color: '#94a3b8' }}>
                        <div style={{ fontSize: '36px', marginBottom: '10px' }}>🎉</div>
                        <p style={{ margin: 0, fontSize: '14px' }}>Tidak ada anggaran yang perlu ditinjau saat ini.</p>
                    </div>
                ) : (
                    <div className="table-wrapper">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Judul</th>
                                    <th>Pengaju</th>
                                    <th>Divisi</th>
                                    <th>Total Anggaran</th>
                                    <th>Tanggal Pengajuan</th>
                                    <th>Aksi</th>
                                </tr>
                            </thead>
                            <tbody>
                                {pending.map((a) => (
                                    <tr key={a.id}>
                                        <td style={{ fontWeight: 500 }}>{a.judul}</td>
                                        <td style={{ color: '#64748b' }}>
                                            {(a.profiles as { full_name: string } | null)?.full_name || '-'}
                                        </td>
                                        <td>
                                            <span style={{ padding: '2px 8px', background: '#f1f5f9', borderRadius: '12px', fontSize: '12px', color: '#475569' }}>{a.divisi}</span>
                                        </td>
                                        <td style={{ fontWeight: 600, color: '#059669' }}>
                                            {a.total_anggaran ? formatRupiah(a.total_anggaran) : '-'}
                                        </td>
                                        <td style={{ color: '#64748b', fontSize: '13px' }}>
                                            {new Date(a.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', gap: '8px' }}>
                                                <Link href={ReviewHref(a.id)} className="btn btn-primary btn-sm" id={`btn-review-${a.id}`}>
                                                    🔍 Review
                                                </Link>
                                                <Link href={`/anggaran/${a.id}`} className="btn btn-outline btn-sm">
                                                    Detail
                                                </Link>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Other statuses */}
            {others.length > 0 && (
                <div className="card">
                    <h2 style={{ margin: '0 0 16px', fontSize: '16px', fontWeight: 600, color: '#64748b' }}>
                        📋 Riwayat Pengajuan Lainnya
                    </h2>
                    <div className="table-wrapper">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Judul</th>
                                    <th>Pengaju</th>
                                    <th>Total</th>
                                    <th>Status</th>
                                    <th>Tanggal</th>
                                    <th>Aksi</th>
                                </tr>
                            </thead>
                            <tbody>
                                {others.map((a) => (
                                    <tr key={a.id}>
                                        <td style={{ fontWeight: 500 }}>{a.judul}</td>
                                        <td style={{ color: '#64748b' }}>
                                            {(a.profiles as { full_name: string } | null)?.full_name || '-'}
                                        </td>
                                        <td>{a.total_anggaran ? formatRupiah(a.total_anggaran) : '-'}</td>
                                        <td><StatusBadgeStyled status={a.status as AnggaranStatus} /></td>
                                        <td style={{ color: '#64748b', fontSize: '13px' }}>
                                            {new Date(a.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                                        </td>
                                        <td>
                                            <Link href={`/anggaran/${a.id}`} className="btn btn-outline btn-sm">Detail</Link>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    )
}
