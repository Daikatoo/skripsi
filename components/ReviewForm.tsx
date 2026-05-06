'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { formatRupiah } from '@/lib/utils'
import Link from 'next/link'

interface ParsedRow {
    [key: string]: string | number
}

interface ReviewFormProps {
    anggaranId: string
    judul: string
    deskripsi: string | null
    filName: string | null
    totalAnggaran: number
    divisi: string
    submitterName: string
    parsedData: ParsedRow[]
    reviewerRole: string
}

export function ReviewForm({
    anggaranId,
    judul,
    deskripsi,
    totalAnggaran,
    divisi,
    submitterName,
    parsedData,
    reviewerRole,
}: ReviewFormProps) {
    const [action, setAction] = useState<'approved' | 'revision' | null>(null)
    const [catatan, setCatatan] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const router = useRouter()

    const headers = parsedData.length > 0 ? Object.keys(parsedData[0]) : []

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!action) { setError('Pilih tindakan terlebih dahulu.'); return }
        if (action === 'revision' && !catatan.trim()) {
            setError('Catatan revisi wajib diisi agar pengaju dapat melakukan perbaikan.')
            return
        }

        setLoading(true)
        setError('')

        const res = await fetch('/api/approve', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ anggaran_id: anggaranId, action, catatan }),
        })

        const data = await res.json()
        if (!res.ok) {
            setError(data.error || 'Gagal memproses.')
            setLoading(false)
        } else {
            router.push(
                reviewerRole === 'kepala_divisi' ? '/kepala' :
                    reviewerRole === 'keuangan' ? '/keuangan' : '/rektorat'
            )
        }
    }

    return (
        <div>
            {/* Anggaran Info */}
            <div className="card" style={{ marginBottom: '20px', background: 'linear-gradient(135deg, #f8faff 0%, #f0f4ff 100%)', borderColor: '#c7d2fe' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
                    <div>
                        <h2 style={{ margin: '0 0 6px', fontSize: '20px', fontWeight: 700 }}>{judul}</h2>
                        {deskripsi && <p style={{ margin: '0 0 12px', color: '#64748b', fontSize: '14px' }}>{deskripsi}</p>}
                        <div style={{ display: 'flex', gap: '20px', fontSize: '13px', color: '#64748b', flexWrap: 'wrap' }}>
                            <span>👤 <strong>{submitterName}</strong></span>
                            <span>🏢 <strong>{divisi}</strong></span>
                        </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Total Anggaran</div>
                        <div style={{ fontSize: '28px', fontWeight: 800, color: '#059669' }}>
                            {totalAnggaran ? formatRupiah(totalAnggaran) : '-'}
                        </div>
                    </div>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: '20px' }}>
                {/* Data table */}
                <div className="card">
                    <h3 style={{ margin: '0 0 14px', fontSize: '15px', fontWeight: 600 }}>
                        📊 Data Anggaran
                        <span style={{ marginLeft: '8px', fontSize: '12px', color: '#94a3b8', fontWeight: 400 }}>
                            {parsedData.length} baris
                        </span>
                    </h3>
                    {parsedData.length === 0 ? (
                        <div style={{ color: '#94a3b8', textAlign: 'center', padding: '32px', fontSize: '14px' }}>
                            Tidak ada data Excel.
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
                                            {headers.map((h) => <td key={h}>{String(row[h] ?? '')}</td>)}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Review Form */}
                <form onSubmit={handleSubmit}>
                    <div className="card">
                        <h3 style={{ margin: '0 0 20px', fontSize: '15px', fontWeight: 600 }}>⚖️ Tindakan Review</h3>

                        {error && (
                            <div className="alert alert-danger">
                                <span>⚠️</span>
                                <span>{error}</span>
                            </div>
                        )}

                        {/* Action selection */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
                            <label
                                className={`action-option ${action === 'approved' ? 'selected-approve' : ''}`}
                                style={{ cursor: 'pointer' }}
                            >
                                <input
                                    type="radio"
                                    name="action"
                                    value="approved"
                                    onChange={() => setAction('approved')}
                                    style={{ display: 'none' }}
                                    id="radio-approve"
                                />
                                <div className="action-option-content">
                                    <span style={{ fontSize: '20px' }}>✅</span>
                                    <div>
                                        <div style={{ fontWeight: 600, color: '#059669' }}>Setujui</div>
                                        <div style={{ fontSize: '12px', color: '#64748b' }}>Lanjutkan ke tahap berikutnya</div>
                                    </div>
                                </div>
                            </label>

                            <label
                                className={`action-option ${action === 'revision' ? 'selected-revision' : ''}`}
                                style={{ cursor: 'pointer' }}
                            >
                                <input
                                    type="radio"
                                    name="action"
                                    value="revision"
                                    onChange={() => setAction('revision')}
                                    style={{ display: 'none' }}
                                    id="radio-revision"
                                />
                                <div className="action-option-content">
                                    <span style={{ fontSize: '20px' }}>🔄</span>
                                    <div>
                                        <div style={{ fontWeight: 600, color: '#d97706' }}>Minta Revisi</div>
                                        <div style={{ fontSize: '12px', color: '#64748b' }}>Kembalikan untuk diperbaiki</div>
                                    </div>
                                </div>
                            </label>
                        </div>

                        {/* Notes */}
                        <div className="form-group" style={{ marginBottom: '20px' }}>
                            <label className="form-label" htmlFor="catatan">
                                Catatan {action === 'revision' ? '(Wajib diisi) *' : '(Opsional)'}
                            </label>
                            <textarea
                                id="catatan"
                                className="form-input"
                                style={{ resize: 'vertical', minHeight: '100px' }}
                                placeholder={
                                    action === 'revision'
                                        ? 'Jelaskan apa yang perlu diperbaiki...'
                                        : 'Catatan tambahan (opsional)...'
                                }
                                value={catatan}
                                onChange={(e) => setCatatan(e.target.value)}
                                required={action === 'revision'}
                            />
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            <button
                                type="submit"
                                className={`btn ${action === 'approved' ? 'btn-success' : action === 'revision' ? 'btn-danger' : 'btn-outline'}`}
                                disabled={loading || !action}
                                style={{ justifyContent: 'center' }}
                                id="btn-submit-review"
                            >
                                {loading ? '⏳ Memproses...' : action === 'approved' ? '✅ Konfirmasi Persetujuan' : action === 'revision' ? '🔄 Kirim Permintaan Revisi' : 'Pilih tindakan di atas'}
                            </button>

                            <Link href="/dashboard" className="btn btn-outline" style={{ justifyContent: 'center', textDecoration: 'none' }}>
                                Batalkan
                            </Link>
                        </div>
                    </div>
                </form>
            </div>



        </div>
    )
}
