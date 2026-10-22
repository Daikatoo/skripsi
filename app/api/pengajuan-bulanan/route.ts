import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const MAX_PDF_SIZE = 10 * 1024 * 1024

type MonthlyItem = { source_rapb_id?: string; item: string; nominal: number; keterangan: string }

const nextStatus = (status: string, action: 'approved' | 'revision') => {
    if (action === 'revision') return 'revision_bulanan'
    return ({
        pending_dekan: 'pending_keuangan_awal',
        pending_keuangan_awal: 'pending_wr1',
        pending_wr1: 'pending_wr2',
        pending_wr2: 'pending_rektor',
        pending_rektor: 'pending_keuangan_akhir',
        pending_keuangan_akhir: 'approved',
    } as Record<string, string>)[status]
}

const reviewerRole = (status: string) => ({
    pending_dekan: 'dekan', pending_keuangan_awal: 'keuangan', pending_wr1: 'wakil_rektor_1',
    pending_wr2: 'wakil_rektor_2', pending_rektor: 'rektor', pending_keuangan_akhir: 'keuangan',
} as Record<string, string>)[status]

export async function POST(request: Request) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const form = await request.formData()
        const raw = form.get('payload')
        const pdf = form.get('berita_acara')
        if (typeof raw !== 'string' || !(pdf instanceof File)) return NextResponse.json({ error: 'Data pengajuan atau berita acara tidak lengkap.' }, { status: 400 })
        if (pdf.type !== 'application/pdf' || !pdf.name.toLowerCase().endsWith('.pdf')) return NextResponse.json({ error: 'Surat berita harus berupa file PDF.' }, { status: 400 })
        if (pdf.size === 0 || pdf.size > MAX_PDF_SIZE) return NextResponse.json({ error: 'Ukuran PDF harus antara 1 byte hingga 10 MB.' }, { status: 400 })

        const payload = JSON.parse(raw) as { bulan: number; tahun: number; unit_id: string; keterangan: string; items: MonthlyItem[] }
        const items = Array.isArray(payload.items) ? payload.items.filter(item => item.nominal > 0) : []
        if (!Number.isInteger(payload.bulan) || payload.bulan < 1 || payload.bulan > 12 || !Number.isInteger(payload.tahun) || !payload.unit_id) return NextResponse.json({ error: 'Bulan, tahun, dan unit wajib valid.' }, { status: 400 })
        if (!payload.keterangan?.trim() || items.length === 0 || items.some(item => !item.item.trim() || !item.keterangan.trim())) return NextResponse.json({ error: 'Keterangan pengajuan dan keterangan setiap item anggaran wajib diisi.' }, { status: 400 })

        const { data: profile } = await supabase.from('profiles').select('unit_id').eq('id', user.id).single()
        if (profile?.unit_id && profile.unit_id !== payload.unit_id) return NextResponse.json({ error: 'Unit pengajuan tidak sesuai dengan akun Anda.' }, { status: 403 })
        const { data: unit, error: unitError } = await supabase.from('master_unit').select('nama, tipe, category').eq('id', payload.unit_id).single()
        if (unitError || !unit) return NextResponse.json({ error: 'Unit atau prodi tidak ditemukan.' }, { status: 400 })

        const path = `${user.id}/rapb-bulanan/${crypto.randomUUID()}.pdf`
        const { error: uploadError } = await supabase.storage.from('anggaran-files').upload(path, pdf, { contentType: 'application/pdf', upsert: false })
        if (uploadError) return NextResponse.json({ error: `Gagal mengunggah berita acara: ${uploadError.message}` }, { status: 500 })

        const isProdi = (unit.category || unit.tipe) === 'prodi'
        const status = isProdi ? 'pending_dekan' : 'pending_keuangan_awal'
        const total = items.reduce((sum, item) => sum + Number(item.nominal), 0)
        const { data, error } = await supabase.from('pengajuan').insert({
            unit_id: payload.unit_id, bulan: payload.bulan, tahun: payload.tahun,
            judul: `RAPB Bulanan ${unit.nama} - ${payload.bulan}/${payload.tahun}`,
            deskripsi: payload.keterangan.trim(), keterangan_pengajuan: payload.keterangan.trim(),
            parsed_data: { items }, jumlah_pengajuan: total, submitted_by: user.id, status,
            jenis: 'rapb_bulanan', berita_acara_path: path, berita_acara_name: pdf.name,
        }).select().single()
        if (error) {
            await supabase.storage.from('anggaran-files').remove([path])
            return NextResponse.json({ error: error.message }, { status: 500 })
        }
        await supabase.from('pengajuan_bulanan_logs').insert({ pengajuan_id: data.id, actor_id: user.id, status, action: 'submitted', catatan: 'Pengajuan RAPB bulanan dibuat.' })
        return NextResponse.json(data, { status: 201 })
    } catch (error) {
        return NextResponse.json({ error: error instanceof Error ? error.message : 'Terjadi kesalahan sistem.' }, { status: 500 })
    }
}

export async function GET() {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
        const reviewStatuses = Object.entries({ pending_dekan: 'dekan', pending_keuangan_awal: 'keuangan', pending_wr1: 'wakil_rektor_1', pending_wr2: 'wakil_rektor_2', pending_rektor: 'rektor', pending_keuangan_akhir: 'keuangan' }).filter(([, role]) => role === profile?.role).map(([status]) => status)
        let query = supabase.from('pengajuan').select('*, master_unit(nama, tipe, category), profiles!pengajuan_submitted_by_fkey(full_name), pengajuan_bulanan_logs(*)').eq('jenis', 'rapb_bulanan').order('created_at', { ascending: false })
        if (profile?.role !== 'admin' && reviewStatuses.length === 0) query = query.eq('submitted_by', user.id)
        else if (profile?.role !== 'admin') query = query.in('status', reviewStatuses)
        const { data, error } = await query
        if (error) return NextResponse.json({ error: error.message }, { status: 500 })
        return NextResponse.json(data)
    } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Terjadi kesalahan sistem.' }, { status: 500 }) }
}

export async function PATCH(request: Request) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        const body = await request.json() as { id?: string; action?: 'approved' | 'revision'; catatan?: string }
        const action = body.action
        if (!body.id || (action !== 'approved' && action !== 'revision')) return NextResponse.json({ error: 'Aksi tidak valid.' }, { status: 400 })
        if (action === 'revision' && !body.catatan?.trim()) return NextResponse.json({ error: 'Alasan revisi wajib diisi.' }, { status: 400 })
        const [{ data: profile }, { data: submission, error: submissionError }] = await Promise.all([
            supabase.from('profiles').select('role').eq('id', user.id).single(),
            supabase.from('pengajuan').select('id, status').eq('id', body.id).eq('jenis', 'rapb_bulanan').single(),
        ])
        if (submissionError || !submission) return NextResponse.json({ error: 'Pengajuan tidak ditemukan.' }, { status: 404 })
        if (profile?.role !== 'admin' && reviewerRole(submission.status) !== profile?.role) return NextResponse.json({ error: 'Anda tidak berwenang memproses tahap ini.' }, { status: 403 })
        const status = nextStatus(submission.status, action)
        if (!status) return NextResponse.json({ error: 'Status pengajuan tidak dapat diproses.' }, { status: 409 })
        const { error } = await supabase.from('pengajuan').update({ status, deskripsi: action === 'revision' ? body.catatan?.trim() : undefined, revised_at: action === 'revision' ? new Date().toISOString() : undefined }).eq('id', body.id).eq('status', submission.status)
        if (error) return NextResponse.json({ error: error.message }, { status: 500 })
        await supabase.from('pengajuan_bulanan_logs').insert({ pengajuan_id: body.id, actor_id: user.id, status, action, catatan: body.catatan?.trim() || null })
        return NextResponse.json({ success: true, status })
    } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Terjadi kesalahan sistem.' }, { status: 500 }) }
}
