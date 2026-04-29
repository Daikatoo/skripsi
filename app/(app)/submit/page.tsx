'use client'
import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import * as XLSX from 'xlsx'
import { formatRupiah, BULAN_NAMES } from '@/lib/utils'

interface ParsedRow { [key: string]: string | number }
interface Unit { id: string; kode: string; nama: string }
interface Coa { id: string; nama_akun: string; tipe_akun: string }

export default function SubmitPage() {
    const router = useRouter()
    const fileInputRef = useRef<HTMLInputElement>(null)
    const [units, setUnits] = useState<Unit[]>([])
    const [coaList, setCoaList] = useState<Coa[]>([])
    const [coaSearch, setCoaSearch] = useState('')
    const now = new Date()
    const [form, setForm] = useState({ judul: '', deskripsi: '', unit_id: '', coa_id: '', bulan: now.getMonth() + 1, tahun: now.getFullYear() })
    const [file, setFile] = useState<File | null>(null)
    const [docFile, setDocFile] = useState<File | null>(null)
    const [previewHeaders, setPreviewHeaders] = useState<string[]>([])
    const [previewRows, setPreviewRows] = useState<ParsedRow[]>([])
    const [parsedData, setParsedData] = useState<ParsedRow[]>([])
    const [totalAnggaran, setTotalAnggaran] = useState(0)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [parsedJson, setParsedJson] = useState('')

    useEffect(() => {
        fetch('/api/master-unit').then(r => r.json()).then(setUnits).catch(() => {})
        fetch('/api/coa?tipe_akun=Expense&header=false').then(r => r.json()).then(setCoaList).catch(() => {})
    }, [])

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const f = e.target.files?.[0]; if (!f) return
        if (!f.name.endsWith('.xlsx') && !f.name.endsWith('.xls')) { setError('Hanya file Excel.'); return }
        setFile(f); setError('')
        const buf = await f.arrayBuffer()
        const wb = XLSX.read(buf, { type: 'array' })
        const json = XLSX.utils.sheet_to_json<ParsedRow>(wb.Sheets[wb.SheetNames[0]], { raw: false, defval: '' })
        if (!json.length) { setError('File kosong.'); return }
        const h = Object.keys(json[0])
        const tk = h.find(h2 => ['total','jumlah','amount','total anggaran','total_anggaran'].includes(h2.toLowerCase().trim()))
        const tot = tk ? json.reduce((s, r) => { const v = parseFloat(String(r[tk]).replace(/[^0-9.-]/g, '')); return s + (isNaN(v) ? 0 : v) }, 0) : 0
        setPreviewHeaders(h); setPreviewRows(json.slice(0, 5)); setParsedData(json); setTotalAnggaran(tot); setParsedJson(JSON.stringify(json))
    }

    const handleDocChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const f = e.target.files?.[0]; if (!f) return
        if (f.size > 5 * 1024 * 1024) { setError('Max 5MB.'); return }
        setDocFile(f); setError('')
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!file) { setError('Upload file Excel.'); return }
        if (!form.unit_id) { setError('Pilih unit.'); return }
        if (!form.coa_id) { setError('Pilih akun CoA.'); return }
        setLoading(true); setError('')
        const fd = new FormData()
        fd.append('file', file)
        if (docFile) fd.append('doc_file', docFile)
        fd.append('judul', form.judul); fd.append('deskripsi', form.deskripsi)
        fd.append('unit_id', form.unit_id); fd.append('coa_id', form.coa_id)
        fd.append('bulan', String(form.bulan)); fd.append('tahun', String(form.tahun))
        fd.append('parsed_data', parsedJson); fd.append('total_anggaran', String(totalAnggaran))
        const res = await fetch('/api/upload-xlsx', { method: 'POST', body: fd })
        const data = await res.json()
        if (!res.ok) { setError(data.error || 'Gagal.'); setLoading(false) }
        else router.push('/dashboard')
    }

    const filteredCoa = coaSearch ? coaList.filter(c => c.id.includes(coaSearch) || c.nama_akun.toLowerCase().includes(coaSearch.toLowerCase())) : coaList

    return (
        <div>
            <div className="page-header"><h1 className="page-title">📤 Ajukan Anggaran Baru</h1><p className="page-subtitle">Isi formulir dan upload file Excel</p></div>
            {error && <div className="alert alert-danger"><span>⚠️</span><span>{error}</span></div>}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                <div>
                    <form onSubmit={handleSubmit}>
                        <div className="card" style={{ marginBottom: '16px' }}>
                            <h2 style={{ margin: '0 0 20px', fontSize: '16px', fontWeight: 600 }}>Informasi Pengajuan</h2>
                            <div className="form-group"><label className="form-label">Judul *</label><input className="form-input" placeholder="Contoh: Pengajuan Gaji Maret 2026" value={form.judul} onChange={e => setForm(f => ({ ...f, judul: e.target.value }))} required /></div>
                            <div className="form-group"><label className="form-label">Unit / Prodi *</label><select className="form-input" value={form.unit_id} onChange={e => setForm(f => ({ ...f, unit_id: e.target.value }))} required><option value="">Pilih</option>{units.map(u => <option key={u.id} value={u.id}>{u.nama} ({u.kode})</option>)}</select></div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                <div className="form-group"><label className="form-label">Bulan *</label><select className="form-input" value={form.bulan} onChange={e => setForm(f => ({ ...f, bulan: Number(e.target.value) }))}>{BULAN_NAMES.slice(1).map((b, i) => <option key={i + 1} value={i + 1}>{b}</option>)}</select></div>
                                <div className="form-group"><label className="form-label">Tahun *</label><select className="form-input" value={form.tahun} onChange={e => setForm(f => ({ ...f, tahun: Number(e.target.value) }))}>{[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}</select></div>
                            </div>
                            <div className="form-group"><label className="form-label">Akun CoA (Expense) *</label>
                                <input className="form-input" placeholder="Cari no. akun atau nama..." value={coaSearch} onChange={e => setCoaSearch(e.target.value)} style={{ marginBottom: '6px', fontSize: '12px' }} />
                                <select className="form-input" value={form.coa_id} onChange={e => setForm(f => ({ ...f, coa_id: e.target.value }))} required size={5} style={{ fontSize: '12px' }}><option value="">Pilih akun</option>{filteredCoa.map(c => <option key={c.id} value={c.id}>[{c.id}] {c.nama_akun}</option>)}</select>
                            </div>
                            <div className="form-group" style={{ marginBottom: 0 }}><label className="form-label">Deskripsi</label><textarea className="form-input" style={{ resize: 'vertical', minHeight: '70px' }} placeholder="Opsional" value={form.deskripsi} onChange={e => setForm(f => ({ ...f, deskripsi: e.target.value }))} /></div>
                        </div>

                        <div className="card" style={{ marginBottom: '16px' }}>
                            <h2 style={{ margin: '0 0 20px', fontSize: '16px', fontWeight: 600 }}>File Excel</h2>
                            <div onClick={() => fileInputRef.current?.click()} style={{ border: `2px dashed ${file ? '#10b981' : '#cbd5e1'}`, background: file ? '#f0fdf4' : '#f8fafc', borderRadius: '10px', padding: '32px 24px', textAlign: 'center', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                                {file ? (<><div style={{ fontSize: '36px' }}>✅</div><div style={{ fontWeight: 600, color: '#059669' }}>{file.name}</div><div style={{ fontSize: '13px', color: '#64748b' }}>{(file.size / 1024).toFixed(1)} KB</div></>) : (<><div style={{ fontSize: '36px' }}>📊</div><div style={{ fontWeight: 500, color: '#475569' }}>Upload file Excel</div></>)}
                            </div>
                            <input ref={fileInputRef} type="file" accept=".xlsx,.xls" style={{ display: 'none' }} onChange={handleFileChange} />
                            {totalAnggaran > 0 && <div style={{ marginTop: '16px', padding: '14px 16px', background: '#f0fdf4', borderRadius: '8px', border: '1px solid #bbf7d0' }}><div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>Total (auto)</div><div style={{ fontWeight: 700, fontSize: '20px', color: '#059669' }}>{formatRupiah(totalAnggaran)}</div></div>}
                        </div>

                        <div className="card" style={{ marginBottom: '16px' }}>
                            <h2 style={{ margin: '0 0 20px', fontSize: '16px', fontWeight: 600 }}>Dokumen Pendukung (Opsional)</h2>
                            <div onClick={() => document.getElementById('doc-input')?.click()} style={{ border: `2px dashed ${docFile ? '#3b82f6' : '#cbd5e1'}`, background: docFile ? '#eff6ff' : '#f8fafc', borderRadius: '10px', padding: '32px 24px', textAlign: 'center', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                                {docFile ? (<><div style={{ fontSize: '36px' }}>✅</div><div style={{ fontWeight: 600, color: '#2563eb' }}>{docFile.name}</div></>) : (<><div style={{ fontSize: '36px' }}>📄</div><div style={{ fontWeight: 500, color: '#475569' }}>Lampirkan dokumen</div></>)}
                            </div>
                            <input type="file" accept=".pdf,.doc,.docx,.png,.jpg,.zip" style={{ display: 'none' }} onChange={handleDocChange} id="doc-input" />
                        </div>

                        <button type="submit" className="btn btn-primary" disabled={loading || !file} style={{ width: '100%', justifyContent: 'center' }}>{loading ? '⏳ Mengajukan...' : '📤 Ajukan Anggaran'}</button>
                    </form>
                </div>
                <div>
                    <div className="card">
                        <h2 style={{ margin: '0 0 16px', fontSize: '16px', fontWeight: 600 }}>Preview Excel {previewRows.length > 0 && <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 400 }}>{parsedData.length} baris</span>}</h2>
                        {previewRows.length === 0 ? <div style={{ textAlign: 'center', padding: '48px 0', color: '#94a3b8' }}><div style={{ fontSize: '40px', marginBottom: '12px' }}>📊</div><p style={{ margin: 0 }}>Upload file Excel untuk preview</p></div> : (
                            <><div className="table-wrapper" style={{ maxHeight: '400px', overflowY: 'auto' }}><table className="data-table"><thead><tr>{previewHeaders.map(h => <th key={h}>{h}</th>)}</tr></thead><tbody>{previewRows.map((r, i) => <tr key={i}>{previewHeaders.map(h => <td key={h}>{String(r[h] ?? '')}</td>)}</tr>)}</tbody></table></div>
                                {parsedData.length > 5 && <p style={{ fontSize: '12px', color: '#94a3b8', textAlign: 'center', margin: '12px 0 0' }}>Menampilkan 5 dari {parsedData.length} baris</p>}</>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
