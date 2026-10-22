'use client'

import { ChangeEvent, useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { BULAN_NAMES, formatRupiah } from '@/lib/utils'

type Unit = { id: string; nama?: string; name?: string; tipe?: string; category?: string }
type AnnualRow = { id: string; bulan: number; kategori: string; sub_kategori: string; keterangan: string | null; jumlah_anggaran: number }
type Item = { source_rapb_id?: string; item: string; nominal: number; keterangan: string }
type Submission = { id: string; judul: string; status: string; jumlah_pengajuan: number; created_at: string; deskripsi: string; berita_acara_name: string | null; parsed_data: { items?: Item[] }; master_unit?: { nama: string } | null; profiles?: { full_name: string } | null }

const statusLabel: Record<string, string> = {
    pending_dekan: 'Menunggu Dekan', pending_keuangan_awal: 'Menunggu Keuangan', pending_wr1: 'Menunggu Wakil Rektor 1', pending_wr2: 'Menunggu Wakil Rektor 2', pending_rektor: 'Menunggu Rektor', pending_keuangan_akhir: 'Menunggu Keuangan (final)', revision_bulanan: 'Perlu Revisi', approved: 'Disetujui',
}

const reviewerStatuses: Record<string, string> = { dekan: 'pending_dekan', keuangan: 'pending_keuangan_awal', wakil_rektor_1: 'pending_wr1', wakil_rektor_2: 'pending_wr2', rektor: 'pending_rektor' }

export default function PengajuanBulananPage() {
    const supabase = createClient()
    const now = new Date()
    const [profile, setProfile] = useState<any>(null)
    const [units, setUnits] = useState<Unit[]>([])
    const [bulan, setBulan] = useState(now.getMonth() + 1)
    const [tahun, setTahun] = useState(now.getFullYear())
    const [unitId, setUnitId] = useState('')
    const [annual, setAnnual] = useState<AnnualRow[]>([])
    const [items, setItems] = useState<Item[]>([])
    const [keterangan, setKeterangan] = useState('')
    const [pdf, setPdf] = useState<File | null>(null)
    const [submissions, setSubmissions] = useState<Submission[]>([])
    const [loading, setLoading] = useState(false)
    const [message, setMessage] = useState('')
    const isReviewer = Boolean(profile && reviewerStatuses[profile.role])

    const selectedUnit = units.find(unit => unit.id === unitId)
    const totalAnnual = annual.reduce((sum, row) => sum + Number(row.jumlah_anggaran), 0)
    const total = items.reduce((sum, item) => sum + Number(item.nominal || 0), 0)

    const loadSubmissions = async () => {
        const response = await fetch('/api/pengajuan-bulanan')
        if (response.ok) setSubmissions(await response.json())
    }

    useEffect(() => {
        void (async () => {
            const [{ data: { user } }, unitResponse] = await Promise.all([supabase.auth.getUser(), fetch('/api/master-unit')])
            if (!user) return
            const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
            setProfile(data)
            if (unitResponse.ok) setUnits(await unitResponse.json())
            if (data?.unit_id) setUnitId(data.unit_id)
            await loadSubmissions()
        })()
    }, [])

    useEffect(() => {
        if (!unitId) return
        void (async () => {
            const academicYear = bulan < 7 ? tahun - 1 : tahun
            const response = await fetch(`/api/rapb?unit_id=${unitId}&tahun=${academicYear}&bulan=${bulan}`)
            const data = response.ok ? await response.json() : []
            const source = Array.isArray(data) ? data.filter((row: AnnualRow) => row.bulan === bulan || row.bulan === 0) : []
            setAnnual(source)
            setItems(source.map((row: AnnualRow) => ({ source_rapb_id: row.id, item: row.sub_kategori || row.kategori, nominal: Number(row.jumlah_anggaran), keterangan: row.keterangan || '' })))
        })()
    }, [unitId, tahun, bulan])

    const updateItem = (index: number, field: keyof Item, value: string | number) => setItems(current => current.map((item, itemIndex) => itemIndex === index ? { ...item, [field]: field === 'nominal' ? Math.max(0, Number(value) || 0) : value } : item))
    const addItem = () => setItems(current => [...current, { item: '', nominal: 0, keterangan: '' }])
    const removeItem = (index: number) => setItems(current => current.filter((_, itemIndex) => itemIndex !== index))

    const submit = async () => {
        if (!unitId || !keterangan.trim() || !pdf) return setMessage('Unit, keterangan pengajuan, dan PDF berita acara wajib diisi.')
        if (!items.some(item => item.nominal > 0) || items.filter(item => item.nominal > 0).some(item => !item.item.trim() || !item.keterangan.trim())) return setMessage('Setiap item bernilai harus memiliki uraian dan keterangan.')
        setLoading(true); setMessage('')
        const form = new FormData()
        form.append('berita_acara', pdf)
        form.append('payload', JSON.stringify({ bulan, tahun, unit_id: unitId, keterangan, items }))
        const response = await fetch('/api/pengajuan-bulanan', { method: 'POST', body: form })
        const data = await response.json()
        setLoading(false)
        if (!response.ok) return setMessage(data.error || 'Gagal mengajukan RAPB bulanan.')
        setMessage('RAPB bulanan berhasil diajukan.')
        setKeterangan(''); setPdf(null); await loadSubmissions()
    }

    const review = async (id: string, action: 'approved' | 'revision') => {
        const catatan = action === 'revision' ? window.prompt('Alasan revisi (wajib diisi):') : window.prompt('Catatan persetujuan (opsional):')
        if (action === 'revision' && !catatan?.trim()) return
        const response = await fetch('/api/pengajuan-bulanan', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, action, catatan }) })
        const data = await response.json()
        setMessage(response.ok ? 'Status pengajuan diperbarui.' : data.error || 'Gagal memperbarui status.')
        if (response.ok) await loadSubmissions()
    }

    const pendingStatus = profile ? reviewerStatuses[profile.role] : ''

    return <div style={{ maxWidth: 1200, margin: '0 auto', paddingBottom: 60 }}>
        <div className="page-header"><h1 className="page-title">RAPB Bulanan</h1><p className="page-subtitle">Pengajuan diambil dari RAPB tahunan dan dapat disesuaikan sesuai kebutuhan.</p></div>
        {message && <div className="alert alert-info" style={{ marginBottom: 16 }}>{message}</div>}

        {!isReviewer && <>
            <div className="card" style={{ marginBottom: 20 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '150px 120px 1fr', gap: 16 }}>
                    <label className="form-group">Bulan<select className="form-input" value={bulan} onChange={event => setBulan(Number(event.target.value))}>{BULAN_NAMES.slice(1).map((name, index) => <option key={name} value={index + 1}>{name}</option>)}</select></label>
                    <label className="form-group">Tahun<input className="form-input" type="number" value={tahun} onChange={event => setTahun(Number(event.target.value))} /></label>
                    <label className="form-group">Unit / Prodi<select className="form-input" value={unitId} disabled={Boolean(profile?.unit_id)} onChange={event => setUnitId(event.target.value)}><option value="">Pilih unit/prodi</option>{units.map(unit => <option key={unit.id} value={unit.id}>{unit.name || unit.nama}</option>)}</select></label>
                </div>
                {unitId && <p style={{ margin: '12px 0 0', color: totalAnnual ? '#047857' : '#b45309' }}>{totalAnnual ? `Referensi RAPB tahunan ${BULAN_NAMES[bulan]}: ${formatRupiah(totalAnnual)}` : 'Belum ada RAPB tahunan untuk bulan ini. Tambahkan item kebutuhan dengan keterangan yang jelas.'}</p>}
            </div>
            <div className="card" style={{ marginBottom: 20, overflowX: 'auto' }}>
                <table className="data-table"><thead><tr><th>Uraian</th><th>Nominal</th><th>Keterangan</th><th></th></tr></thead><tbody>{items.map((item, index) => <tr key={`${item.source_rapb_id || 'new'}-${index}`}><td><input className="form-input" value={item.item} onChange={event => updateItem(index, 'item', event.target.value)} /></td><td><input className="form-input" type="number" min="0" value={item.nominal || ''} onChange={event => updateItem(index, 'nominal', event.target.value)} /></td><td><input className="form-input" value={item.keterangan} placeholder="Alasan/keterangan item" onChange={event => updateItem(index, 'keterangan', event.target.value)} /></td><td><button className="btn btn-outline btn-sm" onClick={() => removeItem(index)}>Hapus</button></td></tr>)}</tbody><tfoot><tr><td><button className="btn btn-outline btn-sm" onClick={addItem}>+ Tambah Item</button></td><td colSpan={2} style={{ textAlign: 'right', fontWeight: 700 }}>Total: {formatRupiah(total)}</td><td /></tr></tfoot></table>
            </div>
            <div className="card"><label className="form-group">Keterangan pengajuan<textarea className="form-input" value={keterangan} onChange={event => setKeterangan(event.target.value)} placeholder="Jelaskan kebutuhan dan perubahan dari RAPB tahunan." required /></label><label className="form-group">Surat berita (PDF, maks. 10 MB)<input className="form-input" type="file" accept="application/pdf,.pdf" onChange={(event: ChangeEvent<HTMLInputElement>) => setPdf(event.target.files?.[0] || null)} required /></label><button className="btn btn-primary" disabled={loading} onClick={submit}>{loading ? 'Mengajukan...' : 'Ajukan RAPB Bulanan'}</button></div>
        </>}

        <div className="card" style={{ marginTop: 20 }}><h2 style={{ marginTop: 0, fontSize: 18 }}>{isReviewer ? 'Menunggu Persetujuan Anda' : 'Riwayat Pengajuan RAPB Bulanan'}</h2>{submissions.length === 0 ? <p>Belum ada pengajuan.</p> : <div className="table-wrapper"><table className="data-table"><thead><tr><th>Pengajuan</th><th>Unit/Prodi</th><th>Total</th><th>Status</th><th>Berita Acara</th><th>Aksi</th></tr></thead><tbody>{submissions.map(submission => <tr key={submission.id}><td>{submission.judul}<br /><small>{new Date(submission.created_at).toLocaleDateString('id-ID')}</small></td><td>{submission.master_unit?.nama || '-'}</td><td>{formatRupiah(Number(submission.jumlah_pengajuan))}</td><td>{statusLabel[submission.status] || submission.status}</td><td>{submission.berita_acara_name || '-'}</td><td>{(profile?.role === 'admin' || submission.status === pendingStatus) ? <div style={{ display: 'flex', gap: 8 }}><button className="btn btn-primary btn-sm" onClick={() => review(submission.id, 'approved')}>Setujui</button><button className="btn btn-outline btn-sm" onClick={() => review(submission.id, 'revision')}>Revisi</button></div> : '-'}</td></tr>)}</tbody></table></div>}</div>
    </div>
}
