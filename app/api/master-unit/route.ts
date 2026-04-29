import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        const { data, error } = await supabase.from('master_unit').select('*').order('urutan')
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
        if (!p || p.role !== 'admin') return NextResponse.json({ error: 'Hanya admin.' }, { status: 403 })
        const body = await request.json()
        if (!body.kode || !body.nama || !body.tipe) return NextResponse.json({ error: 'Data tidak lengkap.' }, { status: 400 })
        const { data, error } = await supabase.from('master_unit').insert({ kode: body.kode, nama: body.nama, tipe: body.tipe, parent_id: body.parent_id || null }).select().single()
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
        if (!p || p.role !== 'admin') return NextResponse.json({ error: 'Hanya admin.' }, { status: 403 })
        const id = new URL(request.url).searchParams.get('id')
        if (!id) return NextResponse.json({ error: 'ID wajib.' }, { status: 400 })
        const { error } = await supabase.from('master_unit').delete().eq('id', id)
        if (error) return NextResponse.json({ error: error.message }, { status: 500 })
        return NextResponse.json({ success: true })
    } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 500 }) }
}
