'use client'
import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatRupiah } from '@/lib/utils'

interface Unit { id: string; kode: string; nama: string; tipe: string }
interface RapbItem {
    id?: string;
    unit_id: string;
    tahun_anggaran: number;
    kategori: string;
    sub_kategori: string;
    keterangan: string | null;
    volume: number;
    satuan: string;
    harga_satuan: number;
    jumlah_anggaran: number;
    bulan?: number;
    status: string;
    _isNew?: boolean;
    _isDeleted?: boolean;
    _isModified?: boolean;
}

const KATEGORI_OPTIONS = ['Pendapatan', 'Belanja', 'Umum']

export default function RapbSpreadsheetPage() {
    const supabase = createClient()
    const [units, setUnits] = useState<Unit[]>([])
    const [userProfile, setUserProfile] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [msg, setMsg] = useState({ t: '', x: '' })

    const [fTahun, setFTahun] = useState(new Date().getFullYear())
    const [fUnit, setFUnit] = useState('')
    
    const [rows, setRows] = useState<RapbItem[]>([])
    const [originalRows, setOriginalRows] = useState<RapbItem[]>([])

    useEffect(() => {
        (async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return
            const { data: p } = await supabase.from('profiles').select('*').eq('id', user.id).single()
            setUserProfile(p)
            if (p?.role === 'kepala_divisi' || p?.role === 'anggota') {
                setFUnit(p.unit_id) // Lock unit for divisi
            }
            fetchUnits()
        })()
    }, [])

    useEffect(() => {
        if (fUnit && fTahun) fetchData()
        else { setRows([]); setOriginalRows([]); setLoading(false) }
    }, [fTahun, fUnit])

    const fetchUnits = async () => {
        const r = await fetch('/api/master-unit')
        if (r.ok) {
            const d = await r.json()
            setUnits(Array.isArray(d) ? d : [])
        }
    }

    const fetchData = async () => {
        setLoading(true); setMsg({ t: '', x: '' })
        const p = new URLSearchParams({ tahun: String(fTahun), unit_id: fUnit })
        const r = await fetch(`/api/rapb?${p}`)
        if (r.ok) {
            const data = await r.json()
            if (Array.isArray(data)) {
                setRows(data)
                setOriginalRows(JSON.parse(JSON.stringify(data))) // Deep copy
            } else setRows([])
        }
        setLoading(false)
    }

    // -- Editing Logic --
    const handleAddRow = () => {
        if (!fUnit) return alert('Pilih unit terlebih dahulu')
        setRows([...rows, {
            unit_id: fUnit,
            tahun_anggaran: fTahun,
            bulan: 0,
            kategori: 'Belanja',
            sub_kategori: '',
            keterangan: '',
            volume: 1,
            satuan: 'ls',
            harga_satuan: 0,
            jumlah_anggaran: 0,
            status: 'draft',
            _isNew: true,
            _isModified: true
        }])
    }

    const handleCellChange = (index: number, field: keyof RapbItem, value: any) => {
        const newRows = [...rows]
        const row = newRows[index]
        
        if (field === 'volume' || field === 'harga_satuan') {
            const val = Number(value) || 0
            row[field] = val as never
            row.jumlah_anggaran = row.volume * row.harga_satuan
        } else {
            row[field] = value as never
        }
        
        row._isModified = true
        setRows(newRows)
    }

    const handleDeleteRow = (index: number) => {
        const row = rows[index]
        if (row._isNew) {
            setRows(rows.filter((_, i) => i !== index))
        } else {
            const newRows = [...rows]
            newRows[index]._isDeleted = !newRows[index]._isDeleted
            newRows[index]._isModified = true
            setRows(newRows)
        }
    }

    // -- Save & Workflow Logic --
    const handleSave = async () => {
        const changes = rows.filter(r => r._isModified && !r._isDeleted && !r._isNew)
        const inserts = rows.filter(r => r._isNew && !r._isDeleted)
        const deletes = rows.filter(r => r._isDeleted && !r._isNew).map(r => r.id)

        if (!changes.length && !inserts.length && !deletes.length) {
            setMsg({ t: 's', x: 'Tidak ada perubahan.' }); return
        }

        setSaving(true); setMsg({ t: '', x: '' })
        const payload = { changes: [...changes, ...inserts], deletes }
        
        const r = await fetch('/api/rapb', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        })
        
        if (r.ok) {
            setMsg({ t: 's', x: 'Perubahan berhasil disimpan.' })
            fetchData()
        } else {
            const d = await r.json()
            setMsg({ t: 'e', x: d.error || 'Gagal menyimpan data.' })
        }
        setSaving(false)
    }

    const handleWorkflowAction = async (newStatus: string, currentStatuses: string[]) => {
        if (!confirm(`Anda yakin ingin mengubah status menjadi: ${newStatus}?`)) return
        setSaving(true)
        const r = await fetch('/api/rapb/status', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                unit_id: fUnit,
                tahun_anggaran: fTahun,
                new_status: newStatus,
                current_status: currentStatuses
            })
        })
        if (r.ok) {
            setMsg({ t: 's', x: 'Status berhasil diperbarui.' })
            fetchData()
        } else {
            const d = await r.json()
            setMsg({ t: 'e', x: d.error || 'Gagal merubah status.' })
        }
        setSaving(false)
    }

    // -- Derived State & Permissions --
    const isLockedRole = userProfile?.role === 'kepala_divisi' || userProfile?.role === 'anggota'
    const activeRows = rows.filter(r => !r._isDeleted)
    const grandTotal = activeRows.reduce((sum, r) => sum + r.jumlah_anggaran, 0)
    
    // Determine overall status for this unit & year
    const statuses = Array.from(new Set(activeRows.map(r => r.status)))
    const currentStatus = statuses.length === 1 ? statuses[0] : (statuses.length > 0 ? 'mixed' : 'empty')

    const canEdit = () => {
        if (userProfile?.role === 'keuangan' || userProfile?.role === 'admin') return true
        if (isLockedRole && ['draft', 'revision_keuangan', 'revision_rektorat', 'empty'].includes(currentStatus)) return true
        return false
    }

    const showSaveButton = canEdit() && rows.some(r => r._isModified)

    return (
        <div style={{ animation: 'fadeIn 0.4s ease', paddingBottom: '100px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <div>
                    <h1 className="page-title">📋 RAPB Spreadsheet</h1>
                    <p className="page-subtitle">Rencana Anggaran Pendapatan & Belanja</p>
                </div>
                {msg.x && (
                    <div className={`alert ${msg.t === 'e' ? 'alert-danger' : 'alert-success'}`} style={{ padding: '8px 16px', margin: 0 }}>
                        {msg.x}
                    </div>
                )}
            </div>

            {/* Filters */}
            <div className="card" style={{ marginBottom: '20px', padding: '16px 20px', display: 'flex', gap: '16px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                <div>
                    <label className="form-label">Tahun Anggaran</label>
                    <select className="form-input" style={{ width: '120px' }} value={fTahun} onChange={e => setFTahun(Number(e.target.value))}>
                        {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}/{y+1}</option>)}
                    </select>
                </div>
                <div>
                    <label className="form-label">Unit / Divisi</label>
                    <select className="form-input" style={{ width: '260px' }} value={fUnit} onChange={e => setFUnit(e.target.value)} disabled={isLockedRole}>
                        <option value="">-- Pilih Unit --</option>
                        {units.map(u => <option key={u.id} value={u.id}>{u.nama} ({u.kode})</option>)}
                    </select>
                </div>
                
                {/* Workflow Status Banner */}
                {fUnit && currentStatus !== 'empty' && (
                    <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ padding: '6px 16px', borderRadius: '20px', fontSize: '13px', fontWeight: 600, background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                            Status: <span style={{ color: currentStatus.includes('approved') ? '#059669' : currentStatus.includes('pending') ? '#d97706' : '#6366f1' }}>
                                {currentStatus.toUpperCase().replace('_', ' ')}
                            </span>
                        </div>
                        
                        {/* Workflow Buttons */}
                        {isLockedRole && ['draft', 'revision_keuangan', 'revision_rektorat'].includes(currentStatus) && (
                            <button className="btn btn-primary btn-sm" disabled={saving || rows.some(r => r._isModified)} onClick={() => handleWorkflowAction('pending_keuangan', [currentStatus])}>
                                🚀 Ajukan RAPB
                            </button>
                        )}
                        {(userProfile?.role === 'keuangan' || userProfile?.role === 'admin') && currentStatus === 'pending_keuangan' && (
                            <>
                                <button className="btn btn-primary btn-sm" disabled={saving} onClick={() => handleWorkflowAction('pending_rektorat', ['pending_keuangan'])}>✅ Setujui (Lanjut ke Rektorat)</button>
                                <button className="btn btn-outline btn-sm" disabled={saving} onClick={() => handleWorkflowAction('revision_keuangan', ['pending_keuangan'])}>🔙 Revisi</button>
                            </>
                        )}
                        {userProfile?.role === 'rektorat' && currentStatus === 'pending_rektorat' && (
                            <>
                                <button className="btn btn-primary btn-sm" disabled={saving} onClick={() => handleWorkflowAction('approved', ['pending_rektorat'])}>✅ Setujui (Final)</button>
                                <button className="btn btn-outline btn-sm" disabled={saving} onClick={() => handleWorkflowAction('revision_rektorat', ['pending_rektorat'])}>🔙 Revisi</button>
                            </>
                        )}
                    </div>
                )}
            </div>

            {/* Spreadsheet Grid */}
            {!fUnit ? (
                <div className="card" style={{ padding: '60px', textAlign: 'center', color: '#94a3b8' }}>
                    <div style={{ fontSize: '48px', marginBottom: '16px' }}>📊</div>
                    <p>Pilih Unit / Divisi terlebih dahulu untuk melihat atau mengisi RAPB.</p>
                </div>
            ) : loading ? (
                <div style={{ textAlign: 'center', padding: '40px' }}>Memuat data...</div>
            ) : (
                <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                    <div style={{ overflowX: 'auto', maxHeight: '600px' }}>
                        <table className="data-table" style={{ minWidth: '1000px', borderCollapse: 'separate', borderSpacing: 0 }}>
                            <thead style={{ position: 'sticky', top: 0, zIndex: 10, background: '#f8fafc', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                                <tr>
                                    <th style={{ width: '100px' }}>Bulan</th>
                                    <th style={{ width: '120px' }}>Kategori</th>
                                    <th style={{ width: '150px' }}>Sub Kategori</th>
                                    <th>Deskripsi / Uraian</th>
                                    <th style={{ width: '80px', textAlign: 'right' }}>Vol</th>
                                    <th style={{ width: '80px' }}>Satuan</th>
                                    <th style={{ width: '140px', textAlign: 'right' }}>Harga Sat (Rp)</th>
                                    <th style={{ width: '150px', textAlign: 'right' }}>Total (Rp)</th>
                                    {canEdit() && <th style={{ width: '50px', textAlign: 'center' }}>⚙️</th>}
                                </tr>
                            </thead>
                            <tbody>
                                {rows.length === 0 ? (
                                    <tr><td colSpan={8} style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>Belum ada data RAPB. Tekan "Tambah Baris" untuk memulai.</td></tr>
                                ) : (
                                    rows.map((row, i) => (
                                        <tr key={row.id || `new-${i}`} style={{ background: row._isDeleted ? '#fee2e2' : row._isModified ? '#f0fdf4' : 'white', opacity: row._isDeleted ? 0.5 : 1 }}>
                                            <td style={{ padding: '4px' }}>
                                                <select className="form-input" style={{ border: 'none', background: 'transparent', padding: '4px' }} disabled={!canEdit() || row._isDeleted} value={row.bulan || 0} onChange={e => handleCellChange(i, 'bulan', Number(e.target.value))}>
                                                    <option value={0}>Semua</option>
                                                    {[...Array(12)].map((_, idx) => <option key={idx+1} value={idx+1}>{idx+1}</option>)}
                                                </select>
                                            </td>
                                            <td style={{ padding: '4px' }}>
                                                <select className="form-input" style={{ border: 'none', background: 'transparent', padding: '4px' }} disabled={!canEdit() || row._isDeleted} value={row.kategori} onChange={e => handleCellChange(i, 'kategori', e.target.value)}>
                                                    {KATEGORI_OPTIONS.map(k => <option key={k} value={k}>{k}</option>)}
                                                </select>
                                            </td>
                                            <td style={{ padding: '4px' }}>
                                                <input className="form-input" style={{ border: 'none', background: 'transparent', padding: '4px' }} disabled={!canEdit() || row._isDeleted} value={row.sub_kategori} onChange={e => handleCellChange(i, 'sub_kategori', e.target.value)} placeholder="Contoh: ATK" />
                                            </td>
                                            <td style={{ padding: '4px' }}>
                                                <input className="form-input" style={{ border: 'none', background: 'transparent', padding: '4px' }} disabled={!canEdit() || row._isDeleted} value={row.keterangan || ''} onChange={e => handleCellChange(i, 'keterangan', e.target.value)} placeholder="Deskripsi pengeluaran..." />
                                            </td>
                                            <td style={{ padding: '4px' }}>
                                                <input type="number" className="form-input" style={{ border: 'none', background: 'transparent', padding: '4px', textAlign: 'right' }} disabled={!canEdit() || row._isDeleted} value={row.volume || ''} onChange={e => handleCellChange(i, 'volume', e.target.value)} min={0} />
                                            </td>
                                            <td style={{ padding: '4px' }}>
                                                <input className="form-input" style={{ border: 'none', background: 'transparent', padding: '4px' }} disabled={!canEdit() || row._isDeleted} value={row.satuan} onChange={e => handleCellChange(i, 'satuan', e.target.value)} placeholder="Pcs/Bulan" />
                                            </td>
                                            <td style={{ padding: '4px' }}>
                                                <input type="number" className="form-input" style={{ border: 'none', background: 'transparent', padding: '4px', textAlign: 'right' }} disabled={!canEdit() || row._isDeleted} value={row.harga_satuan || ''} onChange={e => handleCellChange(i, 'harga_satuan', e.target.value)} min={0} />
                                            </td>
                                            <td style={{ padding: '12px', textAlign: 'right', fontWeight: 600, color: '#475569' }}>
                                                {formatRupiah(row.jumlah_anggaran)}
                                            </td>
                                            {canEdit() && (
                                                <td style={{ textAlign: 'center' }}>
                                                    <button onClick={() => handleDeleteRow(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', opacity: 0.6 }}>
                                                        {row._isDeleted ? '↩️' : '🗑️'}
                                                    </button>
                                                </td>
                                            )}
                                        </tr>
                                    ))
                                )}
                            </tbody>
                            <tfoot style={{ position: 'sticky', bottom: 0, background: '#f8fafc', boxShadow: '0 -1px 2px rgba(0,0,0,0.05)' }}>
                                <tr>
                                    <td colSpan={6} style={{ textAlign: 'right', fontWeight: 700, padding: '16px' }}>GRAND TOTAL RAPB {fTahun}</td>
                                    <td style={{ textAlign: 'right', fontWeight: 800, color: '#059669', padding: '16px', fontSize: '16px' }}>{formatRupiah(grandTotal)}</td>
                                    {canEdit() && <td></td>}
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </div>
            )}

            {/* Bottom Actions */}
            {fUnit && canEdit() && (
                <div style={{ position: 'fixed', bottom: 0, left: '260px', right: 0, background: 'white', padding: '16px 24px', borderTop: '1px solid var(--border)', display: 'flex', gap: '12px', zIndex: 50, boxShadow: '0 -4px 20px rgba(0,0,0,0.05)' }}>
                    <button className="btn btn-outline" onClick={handleAddRow} disabled={saving}>+ Tambah Baris</button>
                    {showSaveButton && (
                        <button className="btn btn-primary" onClick={handleSave} disabled={saving} style={{ background: '#059669', borderColor: '#059669' }}>
                            {saving ? 'Menyimpan...' : '💾 Simpan Perubahan'}
                        </button>
                    )}
                    {rows.some(r => r._isModified) && (
                        <span style={{ margin: 'auto 0 auto auto', fontSize: '13px', color: '#d97706', fontWeight: 500 }}>
                            ⚠️ Terdapat baris yang belum disimpan (Simpan terlebih dahulu sebelum mengajukan)
                        </span>
                    )}
                </div>
            )}
        </div>
    )
}
