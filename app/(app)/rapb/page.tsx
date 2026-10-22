'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatRupiah } from '@/lib/utils'

interface Unit { id: string; kode: string; nama: string; tipe: string; department_no?: string; name?: string; category?: string }
interface RapbItem { id?: string; unit_id: string; tahun_anggaran: number; kategori: string; sub_kategori: string; keterangan: string | null; volume: number; satuan: string; harga_satuan: number; jumlah_anggaran: number; bulan: number; status: string; _isNew?: boolean; _isDeleted?: boolean; _isModified?: boolean }
interface BudgetLine { key: string; kategori: string; subKategori: string; keterangan: string; rows: Map<number, RapbItem> }

const MONTHS = [
    { value: 7, label: 'Juli' }, { value: 8, label: 'Agustus' }, { value: 9, label: 'September' }, { value: 10, label: 'Oktober' }, { value: 11, label: 'November' }, { value: 12, label: 'Desember' },
    { value: 1, label: 'Januari' }, { value: 2, label: 'Februari' }, { value: 3, label: 'Maret' }, { value: 4, label: 'April' }, { value: 5, label: 'Mei' }, { value: 6, label: 'Juni' },
]
const CATEGORIES = ['Pendapatan', 'Beban']
const lineKey = (row: Pick<RapbItem, 'kategori' | 'sub_kategori' | 'keterangan'>) => `${row.kategori}::${row.sub_kategori}::${row.keterangan || ''}`

export default function RapbTahunanPage() {
    const supabase = createClient()
    const [units, setUnits] = useState<Unit[]>([])
    const [profile, setProfile] = useState<any>(null)
    const [year, setYear] = useState(new Date().getMonth() + 1 < 7 ? new Date().getFullYear() - 1 : new Date().getFullYear())
    const [unitId, setUnitId] = useState('')
    const [unitType, setUnitType] = useState<'all' | 'prodi' | 'unit'>('all')
    const [rows, setRows] = useState<RapbItem[]>([])
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [message, setMessage] = useState({ type: '', text: '' })

    const lockedUnit = profile?.role === 'anggota' || profile?.role === 'kepala_divisi'
    const visibleRows = rows.filter(row => !row._isDeleted)
    const statuses = Array.from(new Set(visibleRows.map(row => row.status)))
    const currentStatus = statuses.length === 0 ? 'empty' : statuses.length === 1 ? statuses[0] : 'mixed'
    const canEdit = profile?.role === 'admin' || profile?.role === 'keuangan' || (lockedUnit && ['draft', 'revision_keuangan', 'revision_rektorat', 'empty'].includes(currentStatus))

    const lines = useMemo(() => {
        const grouped = new Map<string, BudgetLine>()
        visibleRows.forEach(row => {
            const key = lineKey(row)
            const current = grouped.get(key) || { key, kategori: row.kategori === 'Belanja' ? 'Beban' : row.kategori, subKategori: row.sub_kategori, keterangan: row.keterangan || '', rows: new Map<number, RapbItem>() }
            current.rows.set(row.bulan, row)
            grouped.set(key, current)
        })
        return Array.from(grouped.values())
    }, [rows])

    const totals = useMemo(() => {
        const byCategory = Object.fromEntries(CATEGORIES.map(category => [category, lines.filter(line => line.kategori === category).reduce((sum, line) => sum + MONTHS.reduce((monthTotal, month) => monthTotal + Number(line.rows.get(month.value)?.jumlah_anggaran || 0), 0), 0)])) as Record<string, number>
        return { byCategory, total: Object.values(byCategory).reduce((sum, value) => sum + value, 0) }
    }, [lines])

    useEffect(() => { void (async () => {
        const [{ data: { user } }, unitResponse] = await Promise.all([supabase.auth.getUser(), fetch('/api/master-unit')])
        if (!user) return
        const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
        setProfile(data)
        if (data?.unit_id && ['anggota', 'kepala_divisi'].includes(data.role)) setUnitId(data.unit_id)
        if (unitResponse.ok) setUnits(await unitResponse.json())
    })() }, [])

    useEffect(() => {
        if (!unitId) { setRows([]); setLoading(false); return }
        void (async () => {
            setLoading(true); setMessage({ type: '', text: '' })
            const response = await fetch(`/api/rapb?tahun=${year}&unit_id=${unitId}`)
            setRows(response.ok ? await response.json() : [])
            setLoading(false)
        })()
    }, [year, unitId])

    const updateLine = (key: string, field: 'sub_kategori' | 'keterangan', value: string) => setRows(current => current.map(row => lineKey(row) === key ? { ...row, [field]: value, _isModified: true } : row))

    const changeAmount = (line: BudgetLine, month: number, rawValue: string) => {
        const amount = Math.max(0, Number(rawValue) || 0)
        setRows(current => {
            const existing = line.rows.get(month)
            if (existing) return current.map(row => row === existing ? { ...row, volume: 1, harga_satuan: amount, jumlah_anggaran: amount, _isModified: true } : row)
            return [...current, { unit_id: unitId, tahun_anggaran: year, bulan: month, kategori: line.kategori, sub_kategori: line.subKategori, keterangan: line.keterangan, volume: 1, satuan: 'ls', harga_satuan: amount, jumlah_anggaran: amount, status: currentStatus === 'empty' ? 'draft' : currentStatus, _isNew: true, _isModified: true }]
        })
    }

    const addLine = (kategori: string) => {
        if (!unitId) return
        const uid = `${kategori}-${Date.now()}-${Math.random()}`
        setRows(current => [...current, ...MONTHS.map(month => ({ unit_id: unitId, tahun_anggaran: year, bulan: month.value, kategori, sub_kategori: `Uraian baru ${uid}`, keterangan: '', volume: 1, satuan: 'ls', harga_satuan: 0, jumlah_anggaran: 0, status: currentStatus === 'empty' ? 'draft' : currentStatus, _isNew: true, _isModified: true }))])
    }

    const removeLine = (key: string) => setRows(current => current.map(row => lineKey(row) !== key ? row : row._isNew ? { ...row, _isDeleted: true } : { ...row, _isDeleted: true, _isModified: true }))

    const save = async () => {
        const changes = rows.filter(row => row._isModified && !row._isDeleted)
        const deletes = rows.filter(row => row._isDeleted && !row._isNew).map(row => row.id).filter(Boolean)
        if (!changes.length && !deletes.length) return setMessage({ type: 'success', text: 'Tidak ada perubahan.' })
        setSaving(true)
        const response = await fetch('/api/rapb', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ changes, deletes }) })
        const data = await response.json()
        setSaving(false)
        if (!response.ok) return setMessage({ type: 'error', text: data.error || 'Gagal menyimpan RAPB.' })
        setMessage({ type: 'success', text: 'RAPB tahunan berhasil disimpan.' })
        const refreshed = await fetch(`/api/rapb?tahun=${year}&unit_id=${unitId}`)
        if (refreshed.ok) setRows(await refreshed.json())
    }

    const updateStatus = async (newStatus: string) => {
        if (!confirm('Lanjutkan perubahan status RAPB?')) return
        const response = await fetch('/api/rapb/status', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ unit_id: unitId, tahun_anggaran: year, new_status: newStatus, current_status: [currentStatus] }) })
        const data = await response.json()
        if (!response.ok) return setMessage({ type: 'error', text: data.error || 'Gagal mengubah status.' })
        setMessage({ type: 'success', text: 'Status RAPB diperbarui.' })
        setRows(current => current.map(row => ({ ...row, status: newStatus })))
    }

    const renderSection = (category: string) => {
        const categoryLines = lines.filter(line => line.kategori === category)
        return <>
            <tr style={{ background: category === 'Pendapatan' ? '#dcfce7' : '#fee2e2' }}><td colSpan={15} style={{ padding: '12px 16px', fontWeight: 800, color: category === 'Pendapatan' ? '#166534' : '#991b1b' }}>{category === 'Pendapatan' ? 'Pendapatan' : 'Beban'}</td></tr>
            {categoryLines.map((line, index) => <tr key={line.key} style={{ background: index % 2 ? '#fafafa' : 'white' }}>
                <td style={{ minWidth: 200, padding: 4 }}><input className="form-input" style={{ border: 0, background: 'transparent', minWidth: 190 }} disabled={!canEdit} value={line.subKategori.startsWith('Uraian baru ') ? '' : line.subKategori} placeholder="Uraian anggaran" onChange={event => updateLine(line.key, 'sub_kategori', event.target.value)} /></td>
                <td style={{ minWidth: 180, padding: 4 }}><input className="form-input" style={{ border: 0, background: 'transparent', minWidth: 170 }} disabled={!canEdit} value={line.keterangan} placeholder="Keterangan" onChange={event => updateLine(line.key, 'keterangan', event.target.value)} /></td>
                {MONTHS.map(month => <td key={month.value} style={{ padding: 3, minWidth: 110 }}><input className="form-input" type="number" min="0" style={{ border: 0, background: 'transparent', width: 105, textAlign: 'right' }} disabled={!canEdit} value={line.rows.get(month.value)?.jumlah_anggaran || ''} onChange={event => changeAmount(line, month.value, event.target.value)} /></td>)}
                <td style={{ textAlign: 'right', fontWeight: 700, padding: 10, whiteSpace: 'nowrap' }}>{formatRupiah(MONTHS.reduce((sum, month) => sum + Number(line.rows.get(month.value)?.jumlah_anggaran || 0), 0))}</td>
                {canEdit && <td style={{ textAlign: 'center' }}><button className="btn btn-outline btn-sm" onClick={() => removeLine(line.key)}>Hapus</button></td>}
            </tr>)}
            <tr style={{ background: '#f8fafc' }}><td colSpan={14} style={{ textAlign: 'right', padding: 12, fontWeight: 800 }}>Total {category}</td><td style={{ textAlign: 'right', padding: 12, fontWeight: 800 }}>{formatRupiah(totals.byCategory[category])}</td>{canEdit && <td />}</tr>
            {canEdit && <tr><td colSpan={canEdit ? 16 : 15} style={{ padding: 10 }}><button className="btn btn-outline btn-sm" onClick={() => addLine(category)}>+ Tambah Uraian {category}</button></td></tr>}
        </>
    }

    return <div style={{ paddingBottom: 96 }}>
        <div className="page-header"><h1 className="page-title">RAPB Tahunan</h1><p className="page-subtitle">Format rencana anggaran Juli–Juni untuk tahun ajaran {year}/{year + 1}.</p></div>
        {message.text && <div className={`alert ${message.type === 'error' ? 'alert-danger' : 'alert-success'}`} style={{ marginBottom: 16 }}>{message.text}</div>}
        <div className="card" style={{ marginBottom: 20, display: 'flex', alignItems: 'end', gap: 16, flexWrap: 'wrap' }}>
            <label className="form-group">Tahun Ajaran<select className="form-input" value={year} onChange={event => setYear(Number(event.target.value))}>{[2024, 2025, 2026, 2027].map(value => <option key={value} value={value}>{value}/{value + 1}</option>)}</select></label>
            <label className="form-group">Jenis<select className="form-input" value={unitType} disabled={lockedUnit} onChange={event => setUnitType(event.target.value as 'all' | 'prodi' | 'unit')}><option value="all">Semua</option><option value="prodi">Prodi</option><option value="unit">Unit</option></select></label>
            <label className="form-group" style={{ minWidth: 280 }}>Unit / Prodi<select className="form-input" value={unitId} disabled={lockedUnit} onChange={event => setUnitId(event.target.value)}><option value="">Pilih unit/prodi</option>{units.filter(unit => unitType === 'all' || (unit.category || unit.tipe) === unitType).map(unit => <option key={unit.id} value={unit.id}>{unit.name || unit.nama} ({unit.department_no || unit.kode})</option>)}</select></label>
            {currentStatus !== 'empty' && <span style={{ marginLeft: 'auto', padding: '8px 12px', background: '#f1f5f9', borderRadius: 8, fontWeight: 600 }}>Status: {currentStatus.replaceAll('_', ' ')}</span>}
        </div>
        {!unitId ? <div className="card" style={{ textAlign: 'center', padding: 60, color: '#64748b' }}>Pilih unit atau prodi untuk mulai menyusun RAPB tahunan.</div> : loading ? <div style={{ textAlign: 'center', padding: 48 }}>Memuat RAPB...</div> : <div className="card" style={{ padding: 0, overflow: 'hidden' }}><div style={{ overflowX: 'auto', maxHeight: '65vh' }}><table className="data-table" style={{ minWidth: 1900, borderCollapse: 'separate', borderSpacing: 0 }}><thead style={{ position: 'sticky', top: 0, zIndex: 2, background: '#0f172a', color: 'white' }}><tr><th rowSpan={2}>Uraian</th><th rowSpan={2}>Keterangan</th><th colSpan={12} style={{ textAlign: 'center' }}>Tahun Ajaran {year}/{year + 1}</th><th rowSpan={2}>Total</th>{canEdit && <th rowSpan={2} />}</tr><tr>{MONTHS.map(month => <th key={month.value} style={{ textAlign: 'right' }}>{month.label}</th>)}</tr></thead><tbody>{renderSection('Pendapatan')}{renderSection('Beban')}</tbody><tfoot style={{ position: 'sticky', bottom: 0, background: '#e0f2fe' }}><tr><td colSpan={14} style={{ textAlign: 'right', padding: 16, fontWeight: 800 }}>TOTAL RAPB TAHUNAN</td><td style={{ textAlign: 'right', padding: 16, fontWeight: 800, fontSize: 16 }}>{formatRupiah(totals.total)}</td>{canEdit && <td />}</tr></tfoot></table></div></div>}
        {unitId && canEdit && <div style={{ position: 'fixed', bottom: 0, left: 260, right: 0, padding: '14px 24px', background: 'white', borderTop: '1px solid #e2e8f0', display: 'flex', gap: 10, zIndex: 20 }}><button className="btn btn-primary" disabled={saving || !rows.some(row => row._isModified)} onClick={save}>{saving ? 'Menyimpan...' : 'Simpan RAPB Tahunan'}</button>{lockedUnit && ['draft', 'revision_keuangan', 'revision_rektorat'].includes(currentStatus) && <button className="btn btn-outline" disabled={saving || rows.some(row => row._isModified)} onClick={() => updateStatus('pending_keuangan')}>Ajukan ke Keuangan</button>}{(profile?.role === 'keuangan' || profile?.role === 'admin') && currentStatus === 'pending_keuangan' && <><button className="btn btn-primary" onClick={() => updateStatus('pending_rektorat')}>Setujui ke Rektorat</button><button className="btn btn-outline" onClick={() => updateStatus('revision_keuangan')}>Minta Revisi</button></>}{profile?.role === 'rektorat' && currentStatus === 'pending_rektorat' && <><button className="btn btn-primary" onClick={() => updateStatus('approved')}>Setujui Final</button><button className="btn btn-outline" onClick={() => updateStatus('revision_rektorat')}>Minta Revisi</button></>}</div>}
    </div>
}
