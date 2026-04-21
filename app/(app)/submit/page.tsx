'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import * as XLSX from 'xlsx'
import { formatRupiah } from '@/lib/utils'

interface ParsedRow {
    [key: string]: string | number
}

const DIVISI_OPTIONS = [
    'Akademik', 'Administrasi', 'Keuangan', 'IT & Teknologi',
    'Kemahasiswaan', 'Penelitian & Pengabdian', 'Humas & Pemasaran',
    'Sarana & Prasarana', 'Lainnya',
]

export default function SubmitPage() {
    const router = useRouter()
    const fileInputRef = useRef<HTMLInputElement>(null)

    const [form, setForm] = useState({ judul: '', deskripsi: '', divisi: '' })
    const [file, setFile] = useState<File | null>(null) // File Excel
    const [docFile, setDocFile] = useState<File | null>(null) // File Pendukung (PDF dll)
    const [previewHeaders, setPreviewHeaders] = useState<string[]>([])
    const [previewRows, setPreviewRows] = useState<ParsedRow[]>([])
    const [parsedData, setParsedData] = useState<ParsedRow[]>([])
    const [totalAnggaran, setTotalAnggaran] = useState(0)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [parsedJson, setParsedJson] = useState<string>('')

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const f = e.target.files?.[0]
        if (!f) return
        if (!f.name.endsWith('.xlsx') && !f.name.endsWith('.xls')) {
            setError('Hanya file Excel (.xlsx / .xls) yang diterima.')
            return
        }

        setFile(f)
        setError('')

        const buffer = await f.arrayBuffer()
        const workbook = XLSX.read(buffer, { type: 'array' })
        const sheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[sheetName]
        const jsonData = XLSX.utils.sheet_to_json<ParsedRow>(worksheet, { raw: false, defval: '' })

        if (jsonData.length === 0) {
            setError('File Excel kosong atau tidak bisa dibaca.')
            return
        }

        const headers = Object.keys(jsonData[0])
        const totalKey = headers.find((h) =>
            ['total', 'jumlah', 'amount', 'total anggaran', 'total_anggaran'].includes(h.toLowerCase().trim())
        )

        const total = totalKey
            ? jsonData.reduce((sum, row) => {
                const val = parseFloat(String(row[totalKey]).replace(/[^0-9.-]/g, ''))
                return sum + (isNaN(val) ? 0 : val)
            }, 0)
            : 0

        setPreviewHeaders(headers)
        setPreviewRows(jsonData.slice(0, 5))
        setParsedData(jsonData)
        setTotalAnggaran(total)
        setParsedJson(JSON.stringify(jsonData))
    }

    const handleDocFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const f = e.target.files?.[0]
        if (!f) return

        // Cek ukuran max 5MB (contoh validasi)
        if (f.size > 5 * 1024 * 1024) {
            setError('Ukuran dokumen pendukung maksimal 5MB.')
            return
        }

        setDocFile(f)
        setError('')
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!file) { setError('Harap upload file Excel terlebih dahulu.'); return }
        if (!form.divisi) { setError('Harap pilih divisi.'); return }

        setLoading(true)
        setError('')

        const formData = new FormData()
        formData.append('file', file) // Excel
        if (docFile) {
            formData.append('doc_file', docFile) // Lampiran PDF dll
        }
        formData.append('judul', form.judul)
        formData.append('deskripsi', form.deskripsi)
        formData.append('divisi', form.divisi)
        formData.append('parsed_data', parsedJson)
        formData.append('total_anggaran', String(totalAnggaran))

        const res = await fetch('/api/upload-xlsx', { method: 'POST', body: formData })
        const data = await res.json()

        if (!res.ok) {
            setError(data.error || 'Gagal mengajukan anggaran.')
            setLoading(false)
        } else {
            router.push('/dashboard')
        }
    }

    return (
        <div>
            <div className="page-header">
                <h1 className="page-title">📤 Ajukan Anggaran Baru</h1>
                <p className="page-subtitle">Isi formulir dan upload file Excel rencana anggaran Anda</p>
            </div>

            {error && (
                <div className="alert alert-danger">
                    <span>⚠️</span>
                    <span>{error}</span>
                </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                {/* Left: Form */}
                <div>
                    <form onSubmit={handleSubmit}>
                        <div className="card" style={{ marginBottom: '16px' }}>
                            <h2 style={{ margin: '0 0 20px', fontSize: '16px', fontWeight: 600 }}>Informasi Anggaran</h2>

                            <div className="form-group">
                                <label className="form-label" htmlFor="judul">Judul Anggaran *</label>
                                <input
                                    id="judul"
                                    className="form-input"
                                    placeholder="Contoh: Anggaran Operasional Q1 2025"
                                    value={form.judul}
                                    onChange={(e) => setForm((p) => ({ ...p, judul: e.target.value }))}
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label" htmlFor="divisi">Divisi *</label>
                                <select
                                    id="divisi"
                                    className="form-input"
                                    value={form.divisi}
                                    onChange={(e) => setForm((p) => ({ ...p, divisi: e.target.value }))}
                                    required
                                >
                                    <option value="">Pilih Divisi</option>
                                    {DIVISI_OPTIONS.map((d) => <option key={d} value={d}>{d}</option>)}
                                </select>
                            </div>

                            <div className="form-group" style={{ marginBottom: 0 }}>
                                <label className="form-label" htmlFor="deskripsi">Deskripsi (Opsional)</label>
                                <textarea
                                    id="deskripsi"
                                    className="form-input"
                                    style={{ resize: 'vertical', minHeight: '80px' }}
                                    placeholder="Jelaskan tujuan penggunaan anggaran ini..."
                                    value={form.deskripsi}
                                    onChange={(e) => setForm((p) => ({ ...p, deskripsi: e.target.value }))}
                                />
                            </div>
                        </div>

                        {/* File Upload */}
                        <div className="card" style={{ marginBottom: '16px' }}>
                            <h2 style={{ margin: '0 0 20px', fontSize: '16px', fontWeight: 600 }}>File Excel</h2>

                            <div
                                className="upload-zone"
                                onClick={() => fileInputRef.current?.click()}
                                style={{
                                    border: `2px dashed ${file ? '#10b981' : '#cbd5e1'}`,
                                    background: file ? '#f0fdf4' : '#f8fafc',
                                }}
                            >
                                {file ? (
                                    <>
                                        <div style={{ fontSize: '36px' }}>✅</div>
                                        <div style={{ fontWeight: 600, color: '#059669' }}>{file.name}</div>
                                        <div style={{ fontSize: '13px', color: '#64748b' }}>
                                            {(file.size / 1024).toFixed(1)} KB · Klik untuk ganti
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div style={{ fontSize: '36px' }}>📊</div>
                                        <div style={{ fontWeight: 500, color: '#475569' }}>Klik untuk upload file Excel</div>
                                        <div style={{ fontSize: '13px', color: '#94a3b8' }}>.xlsx atau .xls · Baris pertama = Header kolom</div>
                                    </>
                                )}
                            </div>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".xlsx,.xls"
                                style={{ display: 'none' }}
                                onChange={handleFileChange}
                                id="file-input"
                            />

                            {totalAnggaran > 0 && (
                                <div style={{ marginTop: '16px', padding: '14px 16px', background: '#f0fdf4', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
                                    <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>Total Anggaran (auto-kalkulasi)</div>
                                    <div style={{ fontWeight: 700, fontSize: '20px', color: '#059669' }}>
                                        {formatRupiah(totalAnggaran)}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Document File Upload */}
                        <div className="card" style={{ marginBottom: '16px' }}>
                            <h2 style={{ margin: '0 0 20px', fontSize: '16px', fontWeight: 600 }}>Dokumen Pendukung (Opsional)</h2>

                            <div
                                className="upload-zone"
                                onClick={() => document.getElementById('doc-input')?.click()}
                                style={{
                                    border: `2px dashed ${docFile ? '#3b82f6' : '#cbd5e1'}`,
                                    background: docFile ? '#eff6ff' : '#f8fafc',
                                }}
                            >
                                {docFile ? (
                                    <>
                                        <div style={{ fontSize: '36px' }}>✅</div>
                                        <div style={{ fontWeight: 600, color: '#2563eb' }}>{docFile.name}</div>
                                        <div style={{ fontSize: '13px', color: '#64748b' }}>
                                            {(docFile.size / 1024 / 1024).toFixed(2)} MB · Klik untuk ganti
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div style={{ fontSize: '36px' }}>📄</div>
                                        <div style={{ fontWeight: 500, color: '#475569' }}>Klik untuk melampirkan dokumen File</div>
                                        <div style={{ fontSize: '13px', color: '#94a3b8' }}>Mendukung Lampiran Proposal PDF, Word, dsb (Max 5MB)</div>
                                    </>
                                )}
                            </div>
                            <input
                                type="file"
                                accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.zip"
                                style={{ display: 'none' }}
                                onChange={handleDocFileChange}
                                id="doc-input"
                            />
                        </div>

                        <button
                            type="submit"
                            className="btn btn-primary"
                            disabled={loading || !file}
                            style={{ width: '100%', justifyContent: 'center' }}
                            id="btn-submit"
                        >
                            {loading ? '⏳ Mengajukan...' : '📤 Ajukan Anggaran'}
                        </button>
                    </form>
                </div>

                {/* Right: Preview */}
                <div>
                    <div className="card">
                        <h2 style={{ margin: '0 0 16px', fontSize: '16px', fontWeight: 600 }}>
                            Preview Data Excel
                            {previewRows.length > 0 && (
                                <span style={{ marginLeft: '8px', fontSize: '12px', color: '#94a3b8', fontWeight: 400 }}>
                                    {parsedData.length} baris • {previewHeaders.length} kolom
                                </span>
                            )}
                        </h2>

                        {previewRows.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '48px 0', color: '#94a3b8' }}>
                                <div style={{ fontSize: '40px', marginBottom: '12px' }}>📊</div>
                                <p style={{ margin: 0, fontSize: '14px' }}>Upload file Excel untuk melihat preview data</p>
                            </div>
                        ) : (
                            <>
                                <div className="table-wrapper" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                                    <table className="data-table">
                                        <thead>
                                            <tr>
                                                {previewHeaders.map((h) => (
                                                    <th key={h}>{h}</th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {previewRows.map((row, i) => (
                                                <tr key={i}>
                                                    {previewHeaders.map((h) => (
                                                        <td key={h}>{String(row[h] ?? '')}</td>
                                                    ))}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                {parsedData.length > 5 && (
                                    <p style={{ fontSize: '12px', color: '#94a3b8', textAlign: 'center', margin: '12px 0 0' }}>
                                        Menampilkan 5 dari {parsedData.length} baris
                                    </p>
                                )}
                            </>
                        )}
                    </div>

                    {/* Format guide */}
                    <div className="card" style={{ marginTop: '16px' }}>
                        <h3 style={{ margin: '0 0 12px', fontSize: '14px', fontWeight: 600, color: '#475569' }}>
                            📋 Format File Excel yang Disarankan
                        </h3>
                        <div className="table-wrapper">
                            <table className="data-table" style={{ fontSize: '12px' }}>
                                <thead>
                                    <tr>
                                        <th>Nama Item</th>
                                        <th>Satuan</th>
                                        <th>Volume</th>
                                        <th>Harga Satuan</th>
                                        <th>Total</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td>Laptop</td>
                                        <td>Unit</td>
                                        <td>2</td>
                                        <td>15.000.000</td>
                                        <td>30.000.000</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                        <p style={{ fontSize: '12px', color: '#94a3b8', margin: '10px 0 0' }}>
                            Kolom &quot;Total&quot; (atau &quot;Jumlah&quot;) akan digunakan untuk menghitung total anggaran otomatis.
                        </p>
                    </div>
                </div>
            </div>

            <style jsx>{`
        .upload-zone {
          border-radius: 10px;
          padding: 32px 24px;
          text-align: center;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
        }
        .upload-zone:hover {
          border-color: #4f46e5 !important;
          background: #f5f3ff !important;
        }
      `}</style>
        </div>
    )
}
