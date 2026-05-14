'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { BULAN_NAMES } from '@/lib/utils'

// -- Data Types --
interface BudgetRow { id: string; item: string; nominal: number; keterangan: string }
interface Section { key: string; title: string; accent: string; accentBg: string; subtotalLabel: string; rows: BudgetRow[]; locked: boolean }

// -- Pre-filled rows --
const GAJI_TETAP_ITEMS = [
    'Gaji Edukatif', 'Gaji Edukatif (Rapelan)', 'THR Edukatif',
    'Gaji Non Edukatif', 'Gaji Non Edukatif (Rapelan)', 'THR Non Edukatif',
    'Honor Dosen Tetap (MKU)', 'Honor Dosen Tetap (Probis)',
    'Honor Sertifikasi Dosen Tetap (Reguler)',
    'Honor Pengajar Bahasa Mandarin YPPI-NSA (tetap)',
    'THR Honor Pengajar Bahasa Mandarin YPPI-NSA',
    'Honor Pengajar Bahasa Mandarin (PT INSERA)',
    'Honor Sidang Proposal & Skripsi', 'Tali Asih', 'Pensiun',
]
const GAJI_LB_ITEMS = [
    'Gaji LB (Reguler)', 'Gaji LB (Probis)', 'Gaji EPSBED (Profesional Dosen)',
    'Gaji Edukatif LB Regular', 'Gaji Edukatif LB Probis',
    'Honor Pengajar Bahasa Mandarin YPPI-NSA (parttime)',
    'Kerjasama Konfusius (Native)', 'Honor Native Mandarin',
    'Gaji Non Edu', 'Gaji Outsourcing',
]
const OPERASIONAL_ITEMS = [
    'DPLK', 'BPJS - Kesehatan', 'BPJS - Jamsostek (TK & Pensiun)',
    'Koperasi', 'Piutang Karyawan (PLN Rumah YPPI)', 'PPh 21, 23, 4(2)',
]

// -- Helpers --
let _uid = 0
const uid = () => `r_${Date.now()}_${++_uid}`
const makeRows = (items: string[]): BudgetRow[] => items.map(item => ({ id: uid(), item, nominal: 0, keterangan: '' }))
const fmtRp = (n: number) => 'Rp ' + n.toLocaleString('id-ID')
const parseNum = (v: string) => { const n = parseInt(v.replace(/\D/g, ''), 10); return isNaN(n) ? 0 : Math.max(0, n) }
const roundThousand = (n: number) => Math.round(n / 1000) * 1000

// -- Unit/Prodi Groups --
const UNIT_GROUPS = [
    { label: 'Rektorat', options: ['WR-1', 'WR-2', 'Sekretariat Rektorat'] },
    { label: 'Fakultas Ekonomi', options: ['Dekan FE', 'Prodi Manajemen', 'Prodi Akuntansi'] },
    { label: 'Fakultas Teknik', options: ['Dekan FT', 'Prodi Arsitektur', 'Prodi Informatika', 'Prodi Elektro', 'Prodi Sipil', 'ICT'] },
    { label: 'Fakultas Sastra & Pendidikan Bahasa', options: ['Dekan FSPB', 'Prodi Sastra Inggris', 'Prodi Mandarin'] },
    { label: 'Unit', options: ['Marketing', 'Corp Com', 'BAA', 'BAK', 'HR', 'GA', 'LPPM', 'PPM', 'Perpustakaan', 'Cadangan Kas Non Budget'] },
]

function initSections(): Section[] {
    return [
        { key: 'gaji_tetap', title: 'Anggaran Gaji Tetap', accent: '#3b82f6', accentBg: '#eff6ff', subtotalLabel: 'Gaji Netto Bank Maspion', rows: makeRows(GAJI_TETAP_ITEMS), locked: false },
        { key: 'gaji_lb', title: 'Anggaran Gaji LB / Kerjasama / Outsourcing', accent: '#14b8a6', accentBg: '#f0fdfa', subtotalLabel: 'Jumlah Gaji LB & Kerjasama / Gaji BCA', rows: makeRows(GAJI_LB_ITEMS), locked: false },
        { key: 'operasional', title: 'Operasional', accent: '#f59e0b', accentBg: '#fffbeb', subtotalLabel: 'Jumlah Operasional', rows: makeRows(OPERASIONAL_ITEMS), locked: false },
        { key: 'unit', title: 'Anggaran Prodi / Unit / Lembaga', accent: '#8b5cf6', accentBg: '#f5f3ff', subtotalLabel: 'Total Anggaran Unit', rows: [], locked: false },
    ]
}

// -- Collapsible Section Component --
function BudgetSection({ section, collapsed, onToggle, onAddRow, onDeleteRow, onChangeRow, readOnly }: {
    section: Section; collapsed: boolean; onToggle: () => void;
    onAddRow: () => void; onDeleteRow: (id: string) => void;
    onChangeRow: (id: string, field: 'item' | 'nominal' | 'keterangan', value: string) => void;
    readOnly: boolean;
}) {
    const subtotal = section.rows.reduce((s, r) => s + r.nominal, 0)
    return (
        <div style={{ marginBottom: '16px', border: `1px solid ${section.accent}22`, borderRadius: '12px', overflow: 'hidden', background: 'white' }}>
            {/* Header */}
            <button onClick={onToggle} style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: '12px',
                padding: '16px 20px', background: section.accentBg, border: 'none',
                cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit',
                borderBottom: collapsed ? 'none' : `1px solid ${section.accent}22`,
            }}>
                <span style={{ fontSize: '18px', transition: 'transform 0.2s', transform: collapsed ? 'rotate(-90deg)' : 'rotate(0deg)', color: section.accent }}>▼</span>
                <span style={{ flex: 1, fontWeight: 700, fontSize: '15px', color: section.accent }}>{section.title}</span>
                <span style={{ fontWeight: 700, fontSize: '14px', color: section.accent, background: 'white', padding: '4px 14px', borderRadius: '20px', border: `1px solid ${section.accent}33` }}>
                    {fmtRp(subtotal)}
                </span>
            </button>
            {/* Body */}
            {!collapsed && (
                <div style={{ padding: '0' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                        <thead>
                            <tr style={{ background: '#f8fafc' }}>
                                <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600, fontSize: '11px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', width: '40%' }}>Item / Uraian</th>
                                <th style={{ padding: '10px 16px', textAlign: 'right', fontWeight: 600, fontSize: '11px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', width: '25%' }}>Nominal (Rp)</th>
                                <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600, fontSize: '11px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', width: '30%' }}>Keterangan</th>
                                {!readOnly && <th style={{ width: '50px' }}></th>}
                            </tr>
                        </thead>
                        <tbody>
                            {section.rows.length === 0 && (
                                <tr><td colSpan={readOnly ? 3 : 4} style={{ padding: '24px', textAlign: 'center', color: '#94a3b8', fontStyle: 'italic' }}>Belum ada item. Klik "Tambah Baris" di bawah.</td></tr>
                            )}
                            {section.rows.map(row => (
                                <tr key={row.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                    <td style={{ padding: '6px 16px' }}>
                                        <input value={row.item} disabled={readOnly} onChange={e => onChangeRow(row.id, 'item', e.target.value)}
                                            placeholder="Nama item..."
                                            style={{ width: '100%', border: 'none', background: 'transparent', padding: '6px 0', fontSize: '13px', fontFamily: 'inherit', color: '#0f172a', outline: 'none' }} />
                                    </td>
                                    <td style={{ padding: '6px 16px' }}>
                                        <input value={row.nominal ? row.nominal.toLocaleString('id-ID') : ''} disabled={readOnly}
                                            onChange={e => onChangeRow(row.id, 'nominal', e.target.value)}
                                            placeholder="0"
                                            style={{ width: '100%', border: 'none', background: 'transparent', padding: '6px 0', fontSize: '13px', fontFamily: 'inherit', color: '#0f172a', textAlign: 'right', outline: 'none', fontWeight: 600 }} />
                                    </td>
                                    <td style={{ padding: '6px 16px' }}>
                                        <input value={row.keterangan} disabled={readOnly} onChange={e => onChangeRow(row.id, 'keterangan', e.target.value)}
                                            placeholder="Keterangan..."
                                            style={{ width: '100%', border: 'none', background: 'transparent', padding: '6px 0', fontSize: '13px', fontFamily: 'inherit', color: '#64748b', outline: 'none' }} />
                                    </td>
                                    {!readOnly && (
                                        <td style={{ padding: '6px 8px', textAlign: 'center' }}>
                                            <button onClick={() => onDeleteRow(row.id)} title="Hapus baris"
                                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', opacity: 0.5, fontSize: '16px', padding: '4px' }}>×</button>
                                        </td>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                        <tfoot>
                            <tr style={{ background: section.accentBg }}>
                                <td style={{ padding: '12px 16px', fontWeight: 700, fontSize: '13px', color: section.accent }}>{section.subtotalLabel}</td>
                                <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 800, fontSize: '14px', color: section.accent }}>{fmtRp(subtotal)}</td>
                                <td colSpan={readOnly ? 1 : 2}></td>
                            </tr>
                        </tfoot>
                    </table>
                    {!readOnly && (
                        <div style={{ padding: '12px 16px', borderTop: '1px solid #f1f5f9' }}>
                            <button onClick={onAddRow} style={{
                                background: 'none', border: `1px dashed ${section.accent}55`, borderRadius: '6px',
                                padding: '6px 16px', color: section.accent, fontWeight: 500, fontSize: '13px',
                                cursor: 'pointer', fontFamily: 'inherit',
                            }}>+ Tambah Baris</button>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}

// -- Main Page --
export default function PengajuanBulananPage() {
    const supabase = createClient()
    const now = new Date()
    const [bulan, setBulan] = useState(now.getMonth() + 1)
    const [tahun, setTahun] = useState(now.getFullYear())
    const [unitProdi, setUnitProdi] = useState('')
    const [sections, setSections] = useState<Section[]>(initSections)
    const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})
    const [status, setStatus] = useState<'draft' | 'diajukan' | 'disetujui'>('draft')
    const [saved, setSaved] = useState(false)
    const [submitMsg, setSubmitMsg] = useState('')
    const [userProfile, setUserProfile] = useState<any>(null)
    const [unitsMap, setUnitsMap] = useState<Record<string, string>>({})
    const [rapbLimit, setRapbLimit] = useState(0)
    const [justifikasi, setJustifikasi] = useState('')

    // Load profile and units
    useEffect(() => {
        (async () => {
            // Load Units Map
            const res = await fetch('/api/master-unit')
            if (res.ok) {
                const uData = await res.json()
                const uMap: Record<string, string> = {}
                uData.forEach((u: any) => { uMap[u.nama] = u.id })
                setUnitsMap(uMap)
            }

            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return
            const { data: p } = await supabase.from('profiles').select('*, master_unit(nama)').eq('id', user.id).single()
            setUserProfile(p)
            // Auto-lock unit for non-admin/keuangan/rektorat
            if (p && !['keuangan', 'rektorat', 'admin'].includes(p.role) && p.master_unit?.nama) {
                setUnitProdi(p.master_unit.nama)
            }
        })()
    }, [])

    // Auto-load draft from localStorage
    useEffect(() => {
        const key = `pengajuan_draft_${bulan}_${tahun}_${unitProdi}`
        const raw = localStorage.getItem(key)
        if (raw) {
            try {
                const parsed = JSON.parse(raw)
                if (parsed.sections) setSections(parsed.sections)
                if (parsed.status) setStatus(parsed.status)
                if (parsed.justifikasi) setJustifikasi(parsed.justifikasi)
            } catch { /* ignore */ }
        } else {
            setSections(initSections())
            setStatus('draft')
            setJustifikasi('')
        }
    }, [bulan, tahun, unitProdi])

    // Fetch RAPB Limit
    useEffect(() => {
        if (!unitProdi || !unitsMap[unitProdi]) {
            setRapbLimit(0); return;
        }
        const unitId = unitsMap[unitProdi]
        fetch(`/api/rapb?unit_id=${unitId}&tahun=${tahun}&bulan=${bulan}`)
            .then(r => r.json())
            .then(data => {
                if (Array.isArray(data)) {
                    // Sum all rapb items for this month/year/unit
                    const totalRapb = data.reduce((s, r) => s + r.jumlah_anggaran, 0)
                    setRapbLimit(totalRapb)
                } else {
                    setRapbLimit(0)
                }
            })
            .catch(() => setRapbLimit(0))
    }, [bulan, tahun, unitProdi, unitsMap])

    // -- Section Handlers --
    const handleToggle = (key: string) => setCollapsed(c => ({ ...c, [key]: !c[key] }))

    const handleAddRow = (sectionKey: string) => {
        setSections(prev => prev.map(s => s.key === sectionKey ? { ...s, rows: [...s.rows, { id: uid(), item: '', nominal: 0, keterangan: '' }] } : s))
    }

    const handleDeleteRow = (sectionKey: string, rowId: string) => {
        setSections(prev => prev.map(s => s.key === sectionKey ? { ...s, rows: s.rows.filter(r => r.id !== rowId) } : s))
    }

    const handleChangeRow = (sectionKey: string, rowId: string, field: 'item' | 'nominal' | 'keterangan', value: string) => {
        setSections(prev => prev.map(s => {
            if (s.key !== sectionKey) return s
            return {
                ...s, rows: s.rows.map(r => {
                    if (r.id !== rowId) return r
                    if (field === 'nominal') return { ...r, nominal: parseNum(value) }
                    return { ...r, [field]: value }
                })
            }
        }))
    }

    // -- Calculations --
    const sectionTotal = (key: string) => sections.find(s => s.key === key)?.rows.reduce((sum, r) => sum + r.nominal, 0) || 0
    const totalS1 = sectionTotal('gaji_tetap')
    const totalS2 = sectionTotal('gaji_lb')
    const totalS3 = sectionTotal('operasional')
    const totalS4 = sectionTotal('unit')
    const grandTotal = totalS1 + totalS2 + totalS3 + totalS4
    const pembulatan = roundThousand(grandTotal)
    const sisaDana = rapbLimit - pembulatan
    const isOverbudget = rapbLimit > 0 && sisaDana < 0

    const readOnly = status !== 'draft'

    // -- Save Draft --
    const handleSaveDraft = () => {
        if (!unitProdi) { alert('Pilih Unit/Prodi terlebih dahulu.'); return }
        const key = `pengajuan_draft_${bulan}_${tahun}_${unitProdi}`
        localStorage.setItem(key, JSON.stringify({ sections, status, justifikasi }))
        setSaved(true)
        setTimeout(() => setSaved(false), 2000)
    }

    // -- Submit --
    const handleSubmit = async () => {
        if (!unitProdi) { alert('Pilih Unit/Prodi terlebih dahulu.'); return }
        const hasNominal = sections.some(s => s.rows.some(r => r.nominal > 0))
        if (!hasNominal) { alert('Minimal isi satu nominal anggaran.'); return }
        if (isOverbudget && !justifikasi.trim()) { alert('Anda melampaui Pagu RAPB. Silakan isi Justifikasi Overbudget.'); return }

        // Save to API
        const payload = {
            bulan, tahun, unit_prodi: unitProdi,
            sections: sections.map(s => ({
                key: s.key, title: s.title,
                rows: s.rows.map(r => ({ item: r.item, nominal: r.nominal, keterangan: r.keterangan })),
            })),
            total: grandTotal,
            justifikasi: isOverbudget ? justifikasi : '',
            rapb_limit: rapbLimit
        }

        const res = await fetch('/api/pengajuan-bulanan', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        })

        if (res.ok) {
            setStatus('diajukan')
            const key = `pengajuan_draft_${bulan}_${tahun}_${unitProdi}`
            localStorage.setItem(key, JSON.stringify({ sections, status: 'diajukan', justifikasi }))
            setSubmitMsg(`Pengajuan ${unitProdi} bulan ${BULAN_NAMES[bulan]} ${tahun} berhasil diajukan.`)
            setTimeout(() => setSubmitMsg(''), 5000)
        } else {
            const d = await res.json()
            alert(d.error || 'Gagal mengajukan.')
        }
    }

    const statusSteps = [
        { key: 'draft', label: 'Draft', color: '#94a3b8' },
        { key: 'diajukan', label: 'Diajukan', color: '#3b82f6' },
        { key: 'disetujui', label: 'Disetujui', color: '#10b981' },
    ]
    const activeIdx = statusSteps.findIndex(s => s.key === status)

    return (
        <div style={{ animation: 'fadeIn 0.4s ease', maxWidth: '1100px', margin: '0 auto', paddingBottom: '80px' }}>
            {/* Title */}
            <div style={{ marginBottom: '24px' }}>
                <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#0f172a', margin: '0 0 4px', letterSpacing: '-0.02em' }}>📋 Pengajuan Anggaran Bulanan</h1>
                <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>Universitas Widya Kartika</p>
            </div>

            {/* Header Controls */}
            <div className="card" style={{ marginBottom: '20px', padding: '16px 20px' }}>
                <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                    <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#64748b', marginBottom: '4px' }}>Bulan</label>
                        <select className="form-input" style={{ width: '160px' }} value={bulan} onChange={e => setBulan(Number(e.target.value))} disabled={readOnly}>
                            {BULAN_NAMES.slice(1).map((b, i) => <option key={i + 1} value={i + 1}>{b}</option>)}
                        </select>
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#64748b', marginBottom: '4px' }}>Tahun</label>
                        <input type="number" className="form-input" style={{ width: '100px' }} value={tahun} onChange={e => setTahun(Number(e.target.value))} disabled={readOnly} />
                    </div>
                    <div style={{ flex: 1, minWidth: '220px' }}>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#64748b', marginBottom: '4px' }}>Unit / Prodi</label>
                        {userProfile && !['keuangan', 'rektorat', 'admin'].includes(userProfile.role) ? (
                            <input className="form-input" value={unitProdi} disabled style={{ background: '#f1f5f9' }} />
                        ) : (
                            <select className="form-input" value={unitProdi} onChange={e => setUnitProdi(e.target.value)} disabled={readOnly}>
                                <option value="">-- Pilih Unit/Prodi --</option>
                                {UNIT_GROUPS.map(g => (
                                    <optgroup key={g.label} label={g.label}>
                                        {g.options.map(o => <option key={o} value={o}>{o}</option>)}
                                    </optgroup>
                                ))}
                            </select>
                        )}
                    </div>
                </div>

                {/* Status Badge Row */}
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #f1f5f9' }}>
                    {statusSteps.map((step, i) => (
                        <div key={step.key} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{
                                display: 'flex', alignItems: 'center', gap: '6px',
                                padding: '4px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: 600,
                                background: i <= activeIdx ? step.color + '18' : '#f1f5f9',
                                color: i <= activeIdx ? step.color : '#94a3b8',
                                border: `1.5px solid ${i <= activeIdx ? step.color + '44' : '#e2e8f0'}`,
                                transition: 'all 0.3s',
                            }}>
                                {i < activeIdx ? '✓' : i === activeIdx ? '●' : '○'} {step.label}
                            </div>
                            {i < statusSteps.length - 1 && <div style={{ width: '24px', height: '2px', background: i < activeIdx ? step.color : '#e2e8f0', borderRadius: '1px' }} />}
                        </div>
                    ))}
                </div>
            </div>

            {/* Sisa Dana Indicator */}
            {unitProdi && rapbLimit > 0 && (
                <div className="card animate-fade-in" style={{ 
                    marginBottom: '20px', padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    border: `1.5px solid ${isOverbudget ? '#fecaca' : '#bbf7d0'}`, 
                    background: isOverbudget ? '#fef2f2' : '#f0fdf4'
                }}>
                    <div style={{ display: 'flex', gap: '40px' }}>
                        <div>
                            <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600, marginBottom: '2px' }}>Pagu RAPB {BULAN_NAMES[bulan]}</div>
                            <div style={{ fontSize: '18px', fontWeight: 700, color: '#0f172a' }}>{fmtRp(rapbLimit)}</div>
                        </div>
                        <div>
                            <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600, marginBottom: '2px' }}>Total Pengajuan</div>
                            <div style={{ fontSize: '18px', fontWeight: 700, color: '#0f172a' }}>{fmtRp(pembulatan)}</div>
                        </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '12px', color: isOverbudget ? '#dc2626' : '#059669', fontWeight: 700, marginBottom: '2px' }}>
                            {isOverbudget ? '⚠️ OVERBUDGET' : '✅ SISA DANA'}
                        </div>
                        <div style={{ fontSize: '24px', fontWeight: 800, color: isOverbudget ? '#dc2626' : '#059669' }}>
                            {fmtRp(Math.abs(sisaDana))}
                        </div>
                    </div>
                </div>
            )}

            {/* Success message */}
            {submitMsg && (
                <div className="alert alert-success" style={{ marginBottom: '16px' }}>
                    <span>✅</span><span>{submitMsg}</span>
                </div>
            )}

            {/* Sections */}
            {sections.map(section => (
                <BudgetSection
                    key={section.key}
                    section={section}
                    collapsed={!!collapsed[section.key]}
                    onToggle={() => handleToggle(section.key)}
                    onAddRow={() => handleAddRow(section.key)}
                    onDeleteRow={(id) => handleDeleteRow(section.key, id)}
                    onChangeRow={(id, field, value) => handleChangeRow(section.key, id, field, value)}
                    readOnly={readOnly}
                />
            ))}

            {/* Summary Card */}
            <div className="card" style={{ marginTop: '24px', padding: '24px', background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)', border: '1px solid #e2e8f0' }}>
                <h3 style={{ margin: '0 0 16px', fontSize: '15px', fontWeight: 700, color: '#0f172a' }}>📊 Rekapitulasi Pengajuan</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 16px', background: '#eff6ff', borderRadius: '8px', border: '1px solid #bfdbfe' }}>
                        <span style={{ fontSize: '13px', fontWeight: 500, color: '#1e40af' }}>Pengajuan Gaji {BULAN_NAMES[bulan]} {tahun} — Bank Maspion</span>
                        <span style={{ fontSize: '14px', fontWeight: 700, color: '#1e40af' }}>{fmtRp(totalS1)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 16px', background: '#f0fdfa', borderRadius: '8px', border: '1px solid #99f6e4' }}>
                        <span style={{ fontSize: '13px', fontWeight: 500, color: '#0f766e' }}>Pengajuan Dana Ops — BCA 7880136636</span>
                        <span style={{ fontSize: '14px', fontWeight: 700, color: '#0f766e' }}>{fmtRp(totalS2 + totalS3)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 16px', background: '#f5f3ff', borderRadius: '8px', border: '1px solid #c4b5fd' }}>
                        <span style={{ fontSize: '13px', fontWeight: 500, color: '#6d28d9' }}>Total Anggaran Prodi/Unit</span>
                        <span style={{ fontSize: '14px', fontWeight: 700, color: '#6d28d9' }}>{fmtRp(totalS4)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 16px', color: '#64748b', fontSize: '12px' }}>
                        <span>Pembulatan (ke Rp 1.000 terdekat)</span>
                        <span style={{ fontWeight: 600 }}>{fmtRp(pembulatan)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', background: '#0f172a', borderRadius: '10px', marginTop: '4px' }}>
                        <span style={{ fontSize: '15px', fontWeight: 700, color: 'white' }}>TOTAL ANGGARAN {BULAN_NAMES[bulan].toUpperCase()} {tahun}</span>
                        <span style={{ fontSize: '22px', fontWeight: 800, color: '#a5b4fc' }}>{fmtRp(pembulatan)}</span>
                    </div>
                </div>
            </div>

            {/* Justifikasi Overbudget */}
            {isOverbudget && (
                <div className="card animate-slide-in" style={{ marginTop: '20px', border: '1.5px solid #fecaca', background: '#fff' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', color: '#dc2626', fontWeight: 700 }}>
                        <span style={{ fontSize: '18px' }}>⚠️</span> Wajib: Justifikasi Overbudget
                    </div>
                    <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '12px' }}>Pengajuan Anda melampaui Pagu RAPB bulan ini sebesar {fmtRp(Math.abs(sisaDana))}. Harap berikan penjelasan terperinci.</p>
                    <textarea 
                        className="form-input" 
                        style={{ minHeight: '80px', borderColor: '#fca5a5' }}
                        value={justifikasi}
                        onChange={(e) => setJustifikasi(e.target.value)}
                        placeholder="Contoh: Terdapat kenaikan harga barang tak terduga..."
                        disabled={readOnly}
                    />
                </div>
            )}

            {/* Action Buttons */}
            {!readOnly && (
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px' }}>
                    <button className="btn btn-outline" onClick={handleSaveDraft} style={{ position: 'relative' }}>
                        {saved ? '✓ Tersimpan' : '💾 Simpan Draft'}
                    </button>
                    <button className="btn btn-primary" onClick={handleSubmit}>
                        📤 Ajukan ke Keuangan
                    </button>
                </div>
            )}
        </div>
    )
}
