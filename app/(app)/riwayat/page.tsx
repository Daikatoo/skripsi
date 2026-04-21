import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { StatusBadgeStyled } from '@/components/StatusBadge'
import { formatRupiah, formatDate } from '@/lib/utils'
import type { AnggaranStatus } from '@/lib/utils'

export default async function RiwayatPage() {
    const supabase = await createClient()

    const {
        data: { user },
    } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    const { data: profile } = await supabase
        .from('profiles').select('*').eq('id', user.id).single()
    if (!profile) redirect('/login')

    let query = supabase
        .from('anggaran')
        .select('*, profiles!anggaran_submitted_by_fkey(full_name)')
        .order('created_at', { ascending: false })

    if (profile.role === 'anggota') {
        query = query.eq('submitted_by', user.id)
    } else if (profile.role === 'kepala_divisi') {
        query = query.eq('divisi', profile.divisi)
    }

    const { data: anggaranList } = await query

    return (
        <div>
            <div className="page-header">
                <h1 className="page-title">📋 Riwayat Pengajuan</h1>
                <p className="page-subtitle">
                    {profile.role === 'anggota' ? 'Semua pengajuan anggaran Anda' : 'Semua pengajuan anggaran yang masuk'}
                </p>
            </div>

            <div className="card">
                {!anggaranList || anggaranList.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '48px 0', color: '#94a3b8' }}>
                        <div style={{ fontSize: '40px', margin: '0 0 12px' }}>📭</div>
                        <p style={{ margin: 0, fontSize: '14px' }}>Belum ada pengajuan anggaran.</p>
                    </div>
                ) : (
                    <div className="table-wrapper">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Judul Anggaran</th>
                                    {profile.role !== 'anggota' && <th>Pengaju</th>}
                                    <th>Divisi</th>
                                    <th>Total</th>
                                    <th>Status</th>
                                    <th>Tanggal</th>
                                    <th>Aksi</th>
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
                                            <span style={{ padding: '2px 8px', background: '#f1f5f9', borderRadius: '12px', fontSize: '12px', color: '#475569' }}>
                                                {a.divisi}
                                            </span>
                                        </td>
                                        <td style={{ fontWeight: 500 }}>
                                            {a.total_anggaran ? formatRupiah(a.total_anggaran) : '-'}
                                        </td>
                                        <td>
                                            <StatusBadgeStyled status={a.status as AnggaranStatus} />
                                        </td>
                                        <td style={{ color: '#64748b', fontSize: '13px', whiteSpace: 'nowrap' }}>
                                            {formatDate(a.created_at)}
                                        </td>
                                        <td>
                                            <Link href={`/anggaran/${a.id}`} className="btn btn-outline btn-sm">
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
