import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        const { searchParams } = new URL(request.url)
        const tahun = searchParams.get('tahun')
        const unit_id = searchParams.get('unit_id')

        let query = supabase.from('rapb').select('*, master_unit(kode,nama,tipe), coa_accounts(id,nama_akun,tipe_akun)').order('created_at', { ascending: false })
        if (tahun) query = query.eq('tahun_anggaran', parseInt(tahun))
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
        if (!body.unit_id || !body.tahun_anggaran || !body.coa_id || body.jumlah_anggaran === undefined)
            return NextResponse.json({ error: 'Data tidak lengkap.' }, { status: 400 })

        const { data, error } = await supabase.from('rapb').insert({
            unit_id: body.unit_id, coa_id: body.coa_id, tahun_anggaran: body.tahun_anggaran,
            jumlah_anggaran: body.jumlah_anggaran, keterangan: body.keterangan || null, created_by: user.id
        }).select().single()
        if (error) return NextResponse.json({ error: error.message }, { status: 500 })
        return NextResponse.json(data)
    } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 500 }) }
}

export async function DELETE(request: Request) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        const { data: p } = await supabase.from('profiles').select('role').eq('id', user.id).single()
        if (!p || !['keuangan','admin'].includes(p.role)) return NextResponse.json({ error: 'Akses ditolak.' }, { status: 403 })
        const id = new URL(request.url).searchParams.get('id')
        if (!id) return NextResponse.json({ error: 'ID wajib.' }, { status: 400 })
        const { error } = await supabase.from('rapb').delete().eq('id', id)
        if (error) return NextResponse.json({ error: error.message }, { status: 500 })
        return NextResponse.json({ success: true })
    } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 500 }) }
}
