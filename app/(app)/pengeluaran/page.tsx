'use client'
import React, { useState, useEffect, useMemo } from 'react'
import { BULAN_NAMES } from '@/lib/utils'

interface PengeluaranRow {
    id: string;
    unitName: string;
    jumlahAnggaran: number;
    bonBudget: number;
    bonNonBudget: number;
    adminBank: number;
    keterangan: string;
}

interface GroupData {
    name: string;
    units: string[];
}

const GROUPS: GroupData[] = [
    { name: 'Group 1 — Rektorat', units: ['Rektor', 'WR 1', 'WR 2'] },
    { name: 'Group 2 — Fakultas Teknik', units: ['Dekan Fakultas Teknik', 'Informatika', 'Elektro', 'Sipil', 'Arsitektur', 'Sekretariat'] },
    { name: 'Group 3 — Fakultas Ekonomi', units: ['Dekan Fakultas Ekonomi', 'Manajemen', 'Akuntansi'] },
    { name: 'Group 4 — Fakultas Sastra & Pendidikan Bahasa', units: ['Dekan FSPB', 'Sastra Inggris', 'Mandarin'] },
    { name: 'Group 5 — Unit', units: ['Marketing', 'Corporate Communication', 'BAA', 'BAK', 'Human Resources', 'General Affair', 'Perpustakaan', 'LPPM', 'PPM', 'ICT - TIK', 'Lain-Lain'] }
]

const fmtRp = (n: number) => 'Rp ' + n.toLocaleString('id-ID')
const parseNum = (v: string) => { const n = parseInt(v.replace(/\D/g, ''), 10); return isNaN(n) ? 0 : Math.max(0, n) }

export default function RekapPengeluaranPage() {
    const now = new Date()
    const [bulan, setBulan] = useState(now.getMonth() + 1)
    const [tahun, setTahun] = useState(now.getFullYear())
    
    // Row state
    const [rows, setRows] = useState<Record<string, PengeluaranRow>>({})
    
    // Summary state
    const [saldoAkhirSebelumnya, setSaldoAkhirSebelumnya] = useState(0)
    const [pencairanCek, setPencairanCek] = useState(0)
    const [pengembalianKoperasi, setPengembalianKoperasi] = useState(0)
    const [pengembalianDanaOps, setPengembalianDanaOps] = useState(0)
    const [pemasukanLain, setPemasukanLain] = useState(0)

    const [saved, setSaved] = useState(false)

    // Init rows if empty
    useEffect(() => {
        const key = `rekap_pengeluaran_${bulan}_${tahun}`
        const raw = localStorage.getItem(key)
        if (raw) {
            try {
                const parsed = JSON.parse(raw)
                if (parsed.rows) setRows(parsed.rows)
                if (parsed.saldoAkhirSebelumnya !== undefined) setSaldoAkhirSebelumnya(parsed.saldoAkhirSebelumnya)
                if (parsed.pencairanCek !== undefined) setPencairanCek(parsed.pencairanCek)
                if (parsed.pengembalianKoperasi !== undefined) setPengembalianKoperasi(parsed.pengembalianKoperasi)
                if (parsed.pengembalianDanaOps !== undefined) setPengembalianDanaOps(parsed.pengembalianDanaOps)
                if (parsed.pemasukanLain !== undefined) setPemasukanLain(parsed.pemasukanLain)
                return
            } catch { /* ignore */ }
        }

        // Initialize empty
        const initialRows: Record<string, PengeluaranRow> = {}
        GROUPS.forEach(g => {
            g.units.forEach(u => {
                const id = `${g.name}_${u}`
                initialRows[id] = { id, unitName: u, jumlahAnggaran: 0, bonBudget: 0, bonNonBudget: 0, adminBank: 0, keterangan: '' }
            })
        })
        setRows(initialRows)
        setSaldoAkhirSebelumnya(0); setPencairanCek(0); setPengembalianKoperasi(0); setPengembalianDanaOps(0); setPemasukanLain(0)
    }, [bulan, tahun])

    // Update row handler
    const updateRow = (id: string, field: keyof PengeluaranRow, value: any) => {
        setRows(prev => {
            const next = { ...prev }
            if (next[id]) {
                next[id] = { ...next[id], [field]: value }
            }
            return next
        })
    }

    // Calculations
    const calcSubtotal = (group: GroupData) => {
        let jam = 0, bb = 0, bnb = 0, ab = 0, sisa = 0;
        group.units.forEach(u => {
            const row = rows[`${group.name}_${u}`]
            if (row) {
                jam += row.jumlahAnggaran
                bb += row.bonBudget
                bnb += row.bonNonBudget
                ab += row.adminBank
                sisa += (row.jumlahAnggaran - row.bonBudget - row.bonNonBudget - row.adminBank)
            }
        })
        return { jam, bb, bnb, ab, sisa }
    }

    let totJam = 0, totBb = 0, totBnb = 0, totAb = 0, totSisa = 0;
    GROUPS.forEach(g => {
        const sub = calcSubtotal(g)
        totJam += sub.jam; totBb += sub.bb; totBnb += sub.bnb; totAb += sub.ab; totSisa += sub.sisa;
    })

    const totalPengeluaran = totBb + totBnb + totAb
    const finalSaldoAkhir = saldoAkhirSebelumnya + pencairanCek - totalPengeluaran + pengembalianKoperasi + pengembalianDanaOps + pemasukanLain

    const handleSave = () => {
        const key = `rekap_pengeluaran_${bulan}_${tahun}`
        const payload = { rows, saldoAkhirSebelumnya, pencairanCek, pengembalianKoperasi, pengembalianDanaOps, pemasukanLain }
        localStorage.setItem(key, JSON.stringify(payload))
        setSaved(true)
        setTimeout(() => setSaved(false), 2000)
    }

    const prevBulanName = bulan === 1 ? BULAN_NAMES[12] : BULAN_NAMES[bulan - 1]
    const prevTahun = bulan === 1 ? tahun - 1 : tahun

    return (
        <div className="rekap-container" style={{ maxWidth: '1400px', margin: '0 auto', paddingBottom: '80px', animation: 'fadeIn 0.4s ease' }}>
            <style dangerouslySetInnerHTML={{__html: `
                @media print {
                    @page { size: landscape; margin: 10mm; }
                    body { background: white; }
                    .rekap-container { max-width: 100% !important; padding: 0 !important; }
                    .no-print { display: none !important; }
                    .card { box-shadow: none !important; border: 1px solid #ddd !important; }
                    input { border: none !important; background: transparent !important; }
                    input::placeholder { color: transparent !important; }
                    table th, table td { padding: 4px 8px !important; font-size: 10px !important; }
                    h1 { font-size: 16px !important; }
                    h2 { font-size: 14px !important; }
                }
                .rekap-table { width: 100%; border-collapse: collapse; min-width: 1000px; }
                .rekap-table th, .rekap-table td { padding: 8px 12px; border: 1px solid #e2e8f0; font-size: 13px; }
                .rekap-table th { background: #f8fafc; font-weight: 600; color: #475569; text-align: center; position: sticky; top: 0; z-index: 10; }
                .frozen-col { position: sticky; left: 0; background: white; z-index: 5; font-weight: 500; color: #334155; }
                .rekap-table th.frozen-col { z-index: 15; background: #f8fafc; }
                .subtotal-row { background: #f1f5f9; font-weight: 700; color: #0f172a; }
                .subtotal-row .frozen-col { background: #f1f5f9; }
                .group-header { background: #e2e8f0; font-weight: 700; font-size: 12px; color: #334155; letter-spacing: 0.05em; text-transform: uppercase; }
                .group-header .frozen-col { background: #e2e8f0; }
                .cell-input { width: 100%; border: none; background: transparent; text-align: right; font-family: inherit; font-size: 13px; color: #0f172a; outline: none; }
                .cell-input:focus { background: #fef08a44; }
                .cell-text { text-align: left; }
                .negative-val { color: #dc2626 !important; font-weight: 600; }
            `}} />

            {/* Title & Header */}
            <div className="card" style={{ marginBottom: '24px', padding: '24px', textAlign: 'center', borderBottom: '4px solid #3b82f6' }}>
                <h1 style={{ margin: '0 0 4px', fontSize: '24px', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em' }}>Rekap Pengeluaran Operasional</h1>
                <h2 style={{ margin: '0 0 16px', fontSize: '18px', fontWeight: 600, color: '#3b82f6' }}>BCA 7880136636</h2>
                <div style={{ display: 'inline-block', background: '#f1f5f9', padding: '8px 24px', borderRadius: '30px', fontWeight: 700, color: '#334155', letterSpacing: '0.05em' }}>
                    PERIODE {BULAN_NAMES[bulan].toUpperCase()} {tahun}
                </div>
            </div>

            {/* Controls (No Print) */}
            <div className="card no-print" style={{ marginBottom: '20px', padding: '16px 20px', display: 'flex', gap: '16px', alignItems: 'flex-end', background: '#f8fafc' }}>
                <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#64748b', marginBottom: '4px' }}>Bulan</label>
                    <select className="form-input" style={{ width: '160px' }} value={bulan} onChange={e => setBulan(Number(e.target.value))}>
                        {BULAN_NAMES.slice(1).map((b, i) => <option key={i + 1} value={i + 1}>{b}</option>)}
                    </select>
                </div>
                <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#64748b', marginBottom: '4px' }}>Tahun</label>
                    <input type="number" className="form-input" style={{ width: '100px' }} value={tahun} onChange={e => setTahun(Number(e.target.value))} />
                </div>
                <div style={{ flex: 1 }}></div>
                <div style={{ fontSize: '14px', fontWeight: 600, color: '#64748b' }}>Account: <span style={{ color: '#0f172a' }}>BCA 7880136636</span></div>
            </div>

            {/* Main Table */}
            <div className="card" style={{ padding: 0, overflowX: 'auto', marginBottom: '24px' }}>
                <table className="rekap-table">
                    <thead>
                        <tr>
                            <th className="frozen-col" style={{ width: '220px', textAlign: 'left' }}>Unit / Prodi</th>
                            <th style={{ width: '130px' }}>Jumlah Anggaran</th>
                            <th style={{ width: '130px' }}>Bon Sementara<br/><span style={{ fontSize: '11px', fontWeight: 400 }}>Budget</span></th>
                            <th style={{ width: '130px' }}>Bon Sementara<br/><span style={{ fontSize: '11px', fontWeight: 400 }}>Non Budget</span></th>
                            <th style={{ width: '120px' }}>Admin Bank</th>
                            <th style={{ width: '130px' }}>Sisa Anggaran</th>
                            <th>Keterangan</th>
                        </tr>
                    </thead>
                    <tbody>
                        {GROUPS.map((g, gIdx) => {
                            const sub = calcSubtotal(g)
                            return (
                                <React.Fragment key={g.name}>
                                    {/* Group Header */}
                                    <tr className="group-header">
                                        <td colSpan={7} className="frozen-col" style={{ paddingTop: gIdx === 0 ? '12px' : '20px' }}>{g.name}</td>
                                    </tr>
                                    {/* Group Rows */}
                                    {g.units.map(u => {
                                        const id = `${g.name}_${u}`
                                        const row = rows[id]
                                        if (!row) return null
                                        const sisa = row.jumlahAnggaran - row.bonBudget - row.bonNonBudget - row.adminBank
                                        return (
                                            <tr key={id}>
                                                <td className="frozen-col">{u}</td>
                                                <td><input className="cell-input" value={row.jumlahAnggaran ? row.jumlahAnggaran.toLocaleString('id-ID') : ''} onChange={e => updateRow(id, 'jumlahAnggaran', parseNum(e.target.value))} placeholder="0" /></td>
                                                <td><input className="cell-input" value={row.bonBudget ? row.bonBudget.toLocaleString('id-ID') : ''} onChange={e => updateRow(id, 'bonBudget', parseNum(e.target.value))} placeholder="0" /></td>
                                                <td><input className="cell-input" value={row.bonNonBudget ? row.bonNonBudget.toLocaleString('id-ID') : ''} onChange={e => updateRow(id, 'bonNonBudget', parseNum(e.target.value))} placeholder="0" /></td>
                                                <td><input className="cell-input" value={row.adminBank ? row.adminBank.toLocaleString('id-ID') : ''} onChange={e => updateRow(id, 'adminBank', parseNum(e.target.value))} placeholder="0" /></td>
                                                <td style={{ textAlign: 'right', fontWeight: 600 }} className={sisa < 0 ? 'negative-val' : ''}>{sisa !== 0 ? sisa.toLocaleString('id-ID') : '-'}</td>
                                                <td><input className="cell-input cell-text" value={row.keterangan} onChange={e => updateRow(id, 'keterangan', e.target.value)} placeholder="..." /></td>
                                            </tr>
                                        )
                                    })}
                                    {/* Subtotal */}
                                    <tr className="subtotal-row">
                                        <td className="frozen-col" style={{ textAlign: 'right', paddingRight: '16px' }}>Subtotal</td>
                                        <td style={{ textAlign: 'right' }}>{sub.jam.toLocaleString('id-ID')}</td>
                                        <td style={{ textAlign: 'right' }}>{sub.bb.toLocaleString('id-ID')}</td>
                                        <td style={{ textAlign: 'right' }}>{sub.bnb.toLocaleString('id-ID')}</td>
                                        <td style={{ textAlign: 'right' }}>{sub.ab.toLocaleString('id-ID')}</td>
                                        <td style={{ textAlign: 'right' }} className={sub.sisa < 0 ? 'negative-val' : ''}>{sub.sisa.toLocaleString('id-ID')}</td>
                                        <td></td>
                                    </tr>
                                </React.Fragment>
                            )
                        })}
                        {/* Grand Total */}
                        <tr className="subtotal-row" style={{ background: '#cbd5e1', fontSize: '14px' }}>
                            <td className="frozen-col" style={{ textAlign: 'right', paddingRight: '16px', background: '#cbd5e1' }}>GRAND TOTAL</td>
                            <td style={{ textAlign: 'right' }}>{totJam.toLocaleString('id-ID')}</td>
                            <td style={{ textAlign: 'right' }}>{totBb.toLocaleString('id-ID')}</td>
                            <td style={{ textAlign: 'right' }}>{totBnb.toLocaleString('id-ID')}</td>
                            <td style={{ textAlign: 'right' }}>{totAb.toLocaleString('id-ID')}</td>
                            <td style={{ textAlign: 'right' }} className={totSisa < 0 ? 'negative-val' : ''}>{totSisa.toLocaleString('id-ID')}</td>
                            <td></td>
                        </tr>
                    </tbody>
                </table>
            </div>

            {/* Summary Section */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px' }}>
                
                {/* Breakdowns */}
                <div className="card" style={{ padding: '24px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                    <h3 style={{ margin: '0 0 16px', fontSize: '16px', fontWeight: 700, color: '#334155' }}>Rekapitulasi Pengeluaran</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', borderBottom: '1px dashed #cbd5e1', paddingBottom: '8px' }}>
                            <span style={{ color: '#475569' }}>Pengeluaran Budget</span>
                            <span style={{ fontWeight: 600 }}>{fmtRp(totBb)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', borderBottom: '1px dashed #cbd5e1', paddingBottom: '8px' }}>
                            <span style={{ color: '#475569' }}>Pengeluaran Non Budget</span>
                            <span style={{ fontWeight: 600 }}>{fmtRp(totBnb)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', borderBottom: '1px dashed #cbd5e1', paddingBottom: '8px' }}>
                            <span style={{ color: '#475569' }}>Admin Bank</span>
                            <span style={{ fontWeight: 600 }}>{fmtRp(totAb)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '15px', fontWeight: 700, color: '#0f172a', paddingTop: '4px' }}>
                            <span>Total Pengeluaran</span>
                            <span>{fmtRp(totalPengeluaran)}</span>
                        </div>
                    </div>
                </div>

                {/* Cash Flow */}
                <div className="card" style={{ padding: '24px', background: 'linear-gradient(135deg, #eff6ff 0%, #ffffff 100%)', border: '1px solid #bfdbfe' }}>
                    <h3 style={{ margin: '0 0 16px', fontSize: '16px', fontWeight: 700, color: '#1d4ed8' }}>Rekonsiliasi Arus Kas</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '13px', color: '#475569' }}>Saldo Akhir {prevBulanName} {prevTahun}</span>
                            <input className="form-input" style={{ width: '160px', textAlign: 'right', padding: '6px 12px', fontSize: '13px' }} value={saldoAkhirSebelumnya ? saldoAkhirSebelumnya.toLocaleString('id-ID') : ''} onChange={e => setSaldoAkhirSebelumnya(parseNum(e.target.value))} placeholder="0" />
                        </div>
                        
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '13px', color: '#475569' }}>Pencairan Cek/BG {BULAN_NAMES[bulan]} {tahun}</span>
                            <input className="form-input" style={{ width: '160px', textAlign: 'right', padding: '6px 12px', fontSize: '13px' }} value={pencairanCek ? pencairanCek.toLocaleString('id-ID') : ''} onChange={e => setPencairanCek(parseNum(e.target.value))} placeholder="0" />
                        </div>
                        
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 12px', background: '#fee2e2', borderRadius: '6px', margin: '4px 0' }}>
                            <span style={{ fontSize: '13px', color: '#991b1b', fontWeight: 600 }}>Pengeluaran {BULAN_NAMES[bulan]} {tahun}</span>
                            <span style={{ fontSize: '14px', fontWeight: 700, color: '#991b1b' }}>- {fmtRp(totalPengeluaran)}</span>
                        </div>
                        
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '13px', color: '#475569' }}>Pengembalian Koperasi</span>
                            <input className="form-input" style={{ width: '160px', textAlign: 'right', padding: '6px 12px', fontSize: '13px' }} value={pengembalianKoperasi ? pengembalianKoperasi.toLocaleString('id-ID') : ''} onChange={e => setPengembalianKoperasi(parseNum(e.target.value))} placeholder="0" />
                        </div>
                        
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '13px', color: '#475569' }}>Pengembalian Dana Operasional</span>
                            <input className="form-input" style={{ width: '160px', textAlign: 'right', padding: '6px 12px', fontSize: '13px' }} value={pengembalianDanaOps ? pengembalianDanaOps.toLocaleString('id-ID') : ''} onChange={e => setPengembalianDanaOps(parseNum(e.target.value))} placeholder="0" />
                        </div>
                        
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '13px', color: '#475569' }}>Pemasukan Lain-Lain</span>
                            <input className="form-input" style={{ width: '160px', textAlign: 'right', padding: '6px 12px', fontSize: '13px' }} value={pemasukanLain ? pemasukanLain.toLocaleString('id-ID') : ''} onChange={e => setPemasukanLain(parseNum(e.target.value))} placeholder="0" />
                        </div>
                        
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px', paddingTop: '16px', borderTop: '2px solid #93c5fd' }}>
                            <span style={{ fontSize: '14px', fontWeight: 800, color: '#1e3a8a' }}>Saldo Akhir {BULAN_NAMES[bulan]} {tahun}</span>
                            <span style={{ fontSize: '18px', fontWeight: 800, color: '#1e3a8a', padding: '6px 16px', background: '#dbeafe', borderRadius: '8px' }}>
                                {fmtRp(finalSaldoAkhir)}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Actions */}
            <div className="no-print" style={{ display: 'flex', gap: '16px', justifyContent: 'flex-end', marginTop: '32px' }}>
                <button className="btn btn-outline" onClick={handleSave} style={{ minWidth: '140px' }}>
                    {saved ? '✓ Tersimpan' : '💾 Simpan Draft'}
                </button>
                <button className="btn btn-primary" onClick={() => window.print()} style={{ minWidth: '180px' }}>
                    🖨️ Cetak / Export PDF
                </button>
            </div>
        </div>
    )
}
