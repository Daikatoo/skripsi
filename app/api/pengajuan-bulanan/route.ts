import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const body = await request.json()
        const { bulan, tahun, unit_prodi, sections, total, justifikasi, rapb_limit } = body

        if (!bulan || !tahun || !unit_prodi) {
            return NextResponse.json({ error: 'Data tidak lengkap.' }, { status: 400 })
        }

        // Store as a pengajuan record with parsed_data containing the full sections
        const { data: profile } = await supabase.from('profiles').select('unit_id').eq('id', user.id).single()

        const { data, error } = await supabase.from('pengajuan').insert({
            unit_id: profile?.unit_id || null,
            bulan: bulan,
            tahun: tahun,
            judul: `Pengajuan Anggaran ${unit_prodi} - Bulan ${bulan}/${tahun}`,
            deskripsi: justifikasi ? `OVERBUDGET: ${justifikasi}` : `Pengajuan anggaran bulanan untuk ${unit_prodi}`,
            parsed_data: { unit_prodi, sections, justifikasi, rapb_limit },
            jumlah_pengajuan: total || 0,
            submitted_by: user.id,
            status: 'pending_keuangan',
        }).select().single()

        if (error) return NextResponse.json({ error: error.message }, { status: 500 })
        return NextResponse.json(data)
    } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 500 }) }
}

export async function GET(request: Request) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const { searchParams } = new URL(request.url)
        const bulan = searchParams.get('bulan')
        const tahun = searchParams.get('tahun')

        let query = supabase.from('pengajuan').select('*, master_unit(kode,nama)')
            .not('parsed_data', 'is', null)
            .order('created_at', { ascending: false })

        if (bulan) query = query.eq('bulan', parseInt(bulan))
        if (tahun) query = query.eq('tahun', parseInt(tahun))

        const { data, error } = await query
        if (error) return NextResponse.json({ error: error.message }, { status: 500 })
        return NextResponse.json(data)
    } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 500 }) }
}
