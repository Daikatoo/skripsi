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
        const kategori = searchParams.get('kategori')
        const bulan = searchParams.get('bulan')

        let query = supabase.from('rapb').select('*, master_unit(kode,nama,tipe)').order('created_at', { ascending: true })
        
        if (tahun) query = query.eq('tahun_anggaran', parseInt(tahun))
        if (unit_id) query = query.eq('unit_id', unit_id)
        if (kategori) query = query.eq('kategori', kategori)
        if (bulan && bulan !== '0') query = query.or(`bulan.eq.${parseInt(bulan)},bulan.eq.0`)

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
        
        const body = await request.json()
        
        // Single insert (fallback)
        if (!Array.isArray(body)) {
            const row = body
            const vol = Number(row.volume) || 1
            const hrg = Number(row.harga_satuan) || 0
            const { data, error } = await supabase.from('rapb').insert({
                unit_id: row.unit_id,
                tahun_anggaran: row.tahun_anggaran,
                bulan: Number(row.bulan) || 0,
                kategori: row.kategori,
                sub_kategori: row.sub_kategori,
                keterangan: row.keterangan || null,
                volume: vol,
                satuan: row.satuan,
                harga_satuan: hrg,
                jumlah_anggaran: vol * hrg,
                status: row.status || 'draft',
                created_by: user.id
            }).select().single()
            if (error) return NextResponse.json({ error: error.message }, { status: 500 })
            return NextResponse.json(data)
        }
        
        // Bulk save/update (from spreadsheet)
        const { changes, deletes } = body as any // expected format: { changes: [...], deletes: ['id1', 'id2'] }
        
        if (deletes && deletes.length > 0) {
            const { error: delErr } = await supabase.from('rapb').delete().in('id', deletes)
            if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 })
        }
        
        if (changes && changes.length > 0) {
            const upserts = changes.map((row: any) => {
                const vol = Number(row.volume) || 1
                const hrg = Number(row.harga_satuan) || 0
                return {
                    id: row.id || undefined, // undefined will let DB generate new UUID for inserts
                    unit_id: row.unit_id,
                    tahun_anggaran: row.tahun_anggaran,
                    bulan: Number(row.bulan) || 0,
                    kategori: row.kategori || 'Umum',
                    sub_kategori: row.sub_kategori || '-',
                    keterangan: row.keterangan || null,
                    volume: vol,
                    satuan: row.satuan || 'ls',
                    harga_satuan: hrg,
                    jumlah_anggaran: vol * hrg,
                    status: row.status || 'draft',
                    created_by: user.id
                }
            })
            const { error: upsertErr } = await supabase.from('rapb').upsert(upserts)
            if (upsertErr) return NextResponse.json({ error: upsertErr.message }, { status: 500 })
        }
        
        return NextResponse.json({ success: true })
    } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 500 }) }
}

export async function DELETE(request: Request) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        
        const id = new URL(request.url).searchParams.get('id')
        if (!id) return NextResponse.json({ error: 'ID wajib.' }, { status: 400 })
        
        const { error } = await supabase.from('rapb').delete().eq('id', id)
        if (error) return NextResponse.json({ error: error.message }, { status: 500 })
        return NextResponse.json({ success: true })
    } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 500 }) }
}
