import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        const { searchParams } = new URL(request.url)
        const bulan = searchParams.get('bulan')
        const tahun = searchParams.get('tahun')
        const unit_id = searchParams.get('unit_id')

        let query = supabase.from('realisasi').select('*, master_unit(kode,nama), coa_accounts(id,nama_akun), bank_accounts(nama_rekening,kode_sistem), pengajuan(judul,jumlah_pengajuan)').order('created_at', { ascending: false })
        if (bulan) query = query.eq('bulan', parseInt(bulan))
        if (tahun) query = query.eq('tahun', parseInt(tahun))
        if (unit_id) query = query.eq('unit_id', unit_id)

        const { data, error } = await query
        if (error) return NextResponse.json({ error: error.message }, { status: 500 })
        return NextResponse.json(data)
    } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 500 }) }
}

export async function POST(request: Request) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        const { data: p } = await supabase.from('profiles').select('role').eq('id', user.id).single()
        if (!p || !['keuangan','admin'].includes(p.role)) return NextResponse.json({ error: 'Akses ditolak.' }, { status: 403 })

        const body = await request.json()
        if (!body.unit_id || !body.bulan || !body.tahun || !body.jenis || !body.coa_id || body.jumlah === undefined)
            return NextResponse.json({ error: 'Data tidak lengkap.' }, { status: 400 })

        const { data, error } = await supabase.from('realisasi').insert({
            pengajuan_id: body.pengajuan_id || null, unit_id: body.unit_id, coa_id: body.coa_id,
            bank_account_id: body.bank_account_id || null, bulan: body.bulan, tahun: body.tahun,
            jenis: body.jenis, keterangan: body.keterangan || null, jumlah: body.jumlah, created_by: user.id
        }).select().single()
        if (error) return NextResponse.json({ error: error.message }, { status: 500 })
        return NextResponse.json(data)
    } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 500 }) }
}
