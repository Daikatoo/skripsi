'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatRupiah, BULAN_NAMES } from '@/lib/utils'

interface Unit {
    id: string
    kode: string
    nama: string
    department_no?: string
    name?: string
    category?: string
    status?: string
}

export default function LaporanPage() {
    const supabase = createClient()
    const now = new Date()
    const [units, setUnits] = useState<Unit[]>([]); const [loading, setLoading] = useState(true)
    const [fBulan, setFBulan] = useState(now.getMonth() + 1); const [fTahun, setFTahun] = useState(now.getFullYear()); const [fUnit, setFUnit] = useState('')
    const [rapbTotal, setRapbTotal] = useState(0); const [pengTotal, setPengTotal] = useState(0); const [realTotal, setRealTotal] = useState(0)
    const [unitSummary, setUnitSummary] = useState<Array<{ name: string; rapb: number; peng: number; real: number }>>([])
    const [canExport, setCanExport] = useState(false)

    useEffect(() => {
        (async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return
            const { data: p } = await supabase.from('profiles').select('role').eq('id', user.id).single()
            if (p && ['keuangan', 'rektorat', 'admin'].includes(p.role)) setCanExport(true)
        })()
        fetchUnits()
    }, [])
    useEffect(() => { fetchReport() }, [fBulan, fTahun, fUnit])

    const fetchUnits = async () => { const r = await fetch('/api/master-unit'); if (r.ok) setUnits(await r.json()) }
    const fetchReport = async () => {
        setLoading(true)
        const rp = new URLSearchParams({ tahun: String(fTahun) }); if (fUnit) rp.set('unit_id', fUnit)
        const rapbRes = await fetch(`/api/rapb?${rp}`); const rapbData = rapbRes.ok ? await rapbRes.json() : []
        const ep = new URLSearchParams({ bulan: String(fBulan), tahun: String(fTahun) }); if (fUnit) ep.set('unit_id', fUnit)
        const realRes = await fetch(`/api/realisasi?${ep}`); const realData = realRes.ok ? await realRes.json() : []

        let pengQ = supabase.from('pengajuan').select('unit_id, jumlah_pengajuan').eq('status', 'approved').eq('tahun', fTahun)
        if (fUnit) pengQ = pengQ.eq('unit_id', fUnit)
        const { data: pengData } = await pengQ

        const rT = rapbData.reduce((s: number, i: any) => s + Number(i.jumlah_anggaran), 0)
        const pT = (pengData || []).reduce((s: number, i: any) => s + Number(i.jumlah_pengajuan), 0)
        const eT = realData.reduce((s: number, i: any) => s + Number(i.jumlah), 0)
        setRapbTotal(rT); setPengTotal(pT); setRealTotal(eT)

        const m: Record<string, { name: string; rapb: number; peng: number; real: number }> = {}
        rapbData.forEach((i: any) => { const k = i.unit_id; if (!m[k]) m[k] = { name: i.master_unit?.nama || '—', rapb: 0, peng: 0, real: 0 }; m[k].rapb += Number(i.jumlah_anggaran) })
        ;(pengData || []).forEach((i: any) => { const k = i.unit_id; if (!m[k]) m[k] = { name: '', rapb: 0, peng: 0, real: 0 }; m[k].peng += Number(i.jumlah_pengajuan) })
        realData.forEach((i: any) => { const k = i.unit_id; if (!m[k]) m[k] = { name: i.master_unit?.nama || '—', rapb: 0, peng: 0, real: 0 }; m[k].real += Number(i.jumlah) })
        setUnitSummary(Object.values(m).sort((a, b) => b.rapb - a.rapb)); setLoading(false)
    }

    const sisa = rapbTotal - realTotal
    const pct = rapbTotal > 0 ? ((realTotal / rapbTotal) * 100).toFixed(1) : '0'
    const handleExport = () => { window.open(`/api/export-accurate?bulan=${fBulan}&tahun=${fTahun}`, '_blank') }

    return (
        <div style={{ animation: 'fadeIn 0.4s ease' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <div><h1 className="page-title">📈 Laporan Keuangan</h1><p className="page-subtitle">Anggaran vs Realisasi — {BULAN_NAMES[fBulan]} {fTahun}</p></div>
                {canExport && <button className="btn btn-primary" onClick={handleExport}>📥 Export CSV (ACCURATE)</button>}
            </div>

            <div className="card" style={{ marginBottom: '20px', padding: '16px 20px' }}>
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                    <div><label className="form-label">Bulan</label><select className="form-input" style={{ width: '150px' }} value={fBulan} onChange={e => setFBulan(Number(e.target.value))}>{BULAN_NAMES.slice(1).map((b, i) => <option key={i + 1} value={i + 1}>{b}</option>)}</select></div>
                    <div><label className="form-label">Tahun</label><select className="form-input" style={{ width: '120px' }} value={fTahun} onChange={e => setFTahun(Number(e.target.value))}>{[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}</select></div>
                    <div><label className="form-label">Unit</label><select className="form-input" style={{ width: '260px' }} value={fUnit} onChange={e => setFUnit(e.target.value)}><option value="">Semua</option>{units.map(u => <option key={u.id} value={u.id}>[{u.category === 'prodi' ? 'Prodi' : 'Unit'}] {u.name || u.nama} ({u.department_no || u.kode})</option>)}</select></div>
                </div>
            </div>

            <div className="stats-grid" style={{ marginBottom: '20px' }}>
                <div className="stat-card"><div className="stat-icon" style={{ background: '#eef2ff', color: '#6366f1' }}>📋</div><div><div className="stat-value" style={{ fontSize: '17px' }}>{formatRupiah(rapbTotal)}</div><div className="stat-label">RAPB (Tahun)</div></div></div>
                <div className="stat-card"><div className="stat-icon" style={{ background: '#dbeafe', color: '#2563eb' }}>📤</div><div><div className="stat-value" style={{ fontSize: '17px' }}>{formatRupiah(pengTotal)}</div><div className="stat-label">Pengajuan (Approved)</div></div></div>
                <div className="stat-card"><div className="stat-icon" style={{ background: '#fef3c7', color: '#d97706' }}>💰</div><div><div className="stat-value" style={{ fontSize: '17px' }}>{formatRupiah(realTotal)}</div><div className="stat-label">Realisasi ({BULAN_NAMES[fBulan]})</div></div></div>
                <div className="stat-card" style={{ borderColor: sisa < 0 ? '#fca5a5' : '#bbf7d0', background: sisa < 0 ? '#fef2f2' : '#f0fdf4' }}><div className="stat-icon" style={{ background: sisa < 0 ? '#fee2e2' : '#d1fae5', color: sisa < 0 ? '#dc2626' : '#059669' }}>{sisa < 0 ? '⚠️' : '✅'}</div><div><div className="stat-value" style={{ fontSize: '17px', color: sisa < 0 ? '#dc2626' : '#059669' }}>{formatRupiah(sisa)}</div><div className="stat-label">Sisa Dana ({pct}% terpakai)</div></div></div>
            </div>

            <div className="card" style={{ padding: 0 }}>
                <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--border)' }}><h2 style={{ fontSize: '15px', fontWeight: 600, margin: 0 }}>Perbandingan per Unit</h2></div>
                {loading ? <div style={{ padding: '48px', textAlign: 'center', color: '#94a3b8' }}>Memuat...</div> : unitSummary.length === 0 ? (
                    <div style={{ padding: '48px', textAlign: 'center', color: '#94a3b8' }}><div style={{ fontSize: '36px', marginBottom: '8px', opacity: 0.5 }}>📭</div><p>Belum ada data.</p></div>
                ) : (
                    <div className="table-wrapper" style={{ margin: 0, border: 'none', borderRadius: '0 0 12px 12px' }}>
                        <table className="data-table"><thead><tr><th>Unit</th><th>RAPB</th><th>Pengajuan</th><th>Realisasi</th><th>Sisa</th><th style={{ width: '120px' }}>%</th></tr></thead>
                            <tbody>{unitSummary.map((u, i) => {
                                const s = u.rapb - u.real; const p = u.rapb > 0 ? ((u.real / u.rapb) * 100).toFixed(1) : '0'
                                return (<tr key={i}>
                                    <td style={{ fontWeight: 500 }}>{u.name}</td>
                                    <td style={{ fontVariantNumeric: 'tabular-nums' }}>{formatRupiah(u.rapb)}</td>
                                    <td style={{ fontVariantNumeric: 'tabular-nums' }}>{formatRupiah(u.peng)}</td>
                                    <td style={{ fontVariantNumeric: 'tabular-nums' }}>{formatRupiah(u.real)}</td>
                                    <td style={{ fontWeight: 600, color: s < 0 ? '#dc2626' : '#059669', fontVariantNumeric: 'tabular-nums' }}>{formatRupiah(s)}</td>
                                    <td><div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><div style={{ flex: 1, height: '6px', background: '#f1f5f9', borderRadius: '3px', overflow: 'hidden' }}><div style={{ height: '100%', width: `${Math.min(Number(p), 100)}%`, background: Number(p) > 100 ? '#dc2626' : '#6366f1', borderRadius: '3px', transition: 'width 0.5s' }} /></div><span style={{ fontSize: '11px', color: '#64748b', width: '36px', textAlign: 'right' }}>{p}%</span></div></td>
                                </tr>)
                            })}
                                <tr style={{ background: '#f8fafc' }}><td style={{ fontWeight: 700 }}>TOTAL</td><td style={{ fontWeight: 700 }}>{formatRupiah(rapbTotal)}</td><td style={{ fontWeight: 700 }}>{formatRupiah(pengTotal)}</td><td style={{ fontWeight: 700 }}>{formatRupiah(realTotal)}</td><td style={{ fontWeight: 700, color: sisa < 0 ? '#dc2626' : '#059669' }}>{formatRupiah(sisa)}</td><td><span style={{ fontSize: '11px', fontWeight: 600 }}>{pct}%</span></td></tr>
                            </tbody></table>
                    </div>
                )}
            </div>
        </div>
    )
}
