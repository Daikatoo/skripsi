import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ApprovalTimeline } from '@/components/ApprovalTimeline'
import { StatusBadgeStyled } from '@/components/StatusBadge'
import { formatRupiah, formatDate } from '@/lib/utils'
import type { AnggaranStatus } from '@/lib/utils'
import Link from 'next/link'
import { ExportActionClient } from '@/components/ExportActionClient'

interface Props {
    params: Promise<{ id: string }>
}

export default async function AnggaranDetailPage({ params }: Props) {
    const { id } = await params
    const supabase = await createClient()

    const {
        data: { user },
    } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    const { data: profile } = await supabase
        .from('profiles').select('*').eq('id', user.id).single()
    if (!profile) redirect('/login')

    const { data: anggaran } = await supabase
        .from('anggaran')
        .select('*, profiles!anggaran_submitted_by_fkey(full_name, role, divisi)')
        .eq('id', id)
        .single()

    if (!anggaran) notFound()

    const { data: logs } = await supabase
        .from('approval_logs')
        .select('*, profiles(full_name)')
        .eq('anggaran_id', id)
        .order('created_at', { ascending: true })

    const parsedData = anggaran.parsed_data as Array<Record<string, string | number>> | null
    const headers = parsedData && parsedData.length > 0 ? Object.keys(parsedData[0]) : []

    const canReview =
        (profile.role === 'kepala_divisi' && anggaran.status === 'pending_kepala') ||
        (profile.role === 'keuangan' && anggaran.status === 'pending_keuangan') ||
        (profile.role === 'rektorat' && anggaran.status === 'pending_rektorat')

    const reviewHref =
        profile.role === 'kepala_divisi' ? `/kepala/review/${id}` :
            profile.role === 'keuangan' ? `/keuangan/review/${id}` :
                profile.role === 'rektorat' ? `/rektorat/review/${id}` : null

    const submitter = anggaran.profiles as { full_name: string; role: string; divisi: string } | null

    return (
        <div>
            <div style={{ marginBottom: '24px' }}>
                <Link href="/dashboard" style={{ fontSize: '14px', color: '#64748b', textDecoration: 'none' }}>
                    ← Kembali ke Dashboard
                </Link>
            </div>

            {/* Header */}
            <div className="card" style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                            <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 700 }}>{anggaran.judul}</h1>
                            <StatusBadgeStyled status={anggaran.status as AnggaranStatus} />
                        </div>
                        {anggaran.deskripsi && (
                            <p style={{ margin: '0 0 12px', color: '#64748b', fontSize: '14px' }}>{anggaran.deskripsi}</p>
                        )}
                        <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', fontSize: '13px', color: '#64748b' }}>
                            <span>👤 <strong>{submitter?.full_name}</strong></span>
                            <span>🏢 <strong>{anggaran.divisi}</strong></span>
                            <span>📅 {formatDate(anggaran.created_at)}</span>
                            {anggaran.file_name && <span>📎 {anggaran.file_name}</span>}
                        </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Total Anggaran</div>
                        <div style={{ fontSize: '26px', fontWeight: 800, color: '#059669' }}>
                            {anggaran.total_anggaran ? formatRupiah(anggaran.total_anggaran) : '-'}
                        </div>
                    </div>
                </div>

                <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #f1f5f9' }}>
                    <div style={{ fontSize: '12px', color: '#475569', fontWeight: 600, marginBottom: '8px' }}>Pilihan Unduhan Berkas:</div>
                    <ExportActionClient
                        parsedDataStr={JSON.stringify(anggaran.parsed_data || [])}
                        fileName={anggaran.file_name}
                        docUrl={anggaran.dokumen_url}
                        docName={anggaran.dokumen_name}
                    />
                </div>

                {canReview && reviewHref && (
                    <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid #f1f5f9', display: 'flex', gap: '10px' }}>
                        <Link href={reviewHref} className="btn btn-primary" id="btn-review-anggaran">
                            🔍 Review & Tindak Lanjut
                        </Link>
                    </div>
                )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '20px' }}>
                {/* Data Table */}
                <div className="card">
                    <h2 style={{ margin: '0 0 16px', fontSize: '16px', fontWeight: 600 }}>
                        📊 Data Anggaran
                        {parsedData && (
                            <span style={{ marginLeft: '8px', fontSize: '12px', color: '#94a3b8', fontWeight: 400 }}>
                                {parsedData.length} baris · {headers.length} kolom
                            </span>
                        )}
                    </h2>

                    {!parsedData || parsedData.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '32px', color: '#94a3b8', fontSize: '14px' }}>
                            Tidak ada data Excel yang tersimpan.
                        </div>
                    ) : (
                        <div className="table-wrapper" style={{ maxHeight: '500px', overflowY: 'auto' }}>
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>#</th>
                                        {headers.map((h) => <th key={h}>{h}</th>)}
                                    </tr>
                                </thead>
                                <tbody>
                                    {parsedData.map((row, i) => (
                                        <tr key={i}>
                                            <td style={{ color: '#94a3b8', fontSize: '12px' }}>{i + 1}</td>
                                            {headers.map((h) => (
                                                <td key={h}>{String(row[h] ?? '')}</td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Approval Timeline */}
                <div className="card">
                    <h2 style={{ margin: '0 0 16px', fontSize: '16px', fontWeight: 600 }}>📋 Riwayat Persetujuan</h2>
                    <ApprovalTimeline logs={logs || []} />
                </div>
            </div>
        </div>
    )
}
