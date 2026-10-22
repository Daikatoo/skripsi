import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        
        const { data, error } = await supabase
            .from('master_unit')
            .select('*')
            .order('kode', { ascending: true })

        if (error) return NextResponse.json({ error: error.message }, { status: 500 })

        // Normalize fields to ensure department_no, name, category, status are always available
        const normalized = (data || []).map((u: any) => ({
            ...u,
            department_no: u.department_no || u.kode,
            name: u.name || u.nama,
            category: (u.category || (u.tipe === 'prodi' ? 'prodi' : 'unit')).toLowerCase(),
            status: u.status || 'Active',
            kode: u.kode || u.department_no,
            nama: u.nama || u.name,
            tipe: u.tipe || u.category || 'unit'
        }))

        // Sort by category ('prodi' first, then 'unit'), then department_no
        normalized.sort((a: any, b: any) => {
            if (a.category !== b.category) {
                return a.category === 'prodi' ? -1 : 1
            }
            return (a.department_no || '').localeCompare(b.department_no || '', undefined, { numeric: true })
        })

        return NextResponse.json(normalized)
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
        const deptNo = (body.department_no || body.kode || '').trim()
        const deptName = (body.name || body.nama || '').trim()
        const deptCategory = (body.category || body.tipe || 'unit').trim().toLowerCase()
        const deptStatus = (body.status || 'Active').trim()

        if (!deptNo || !deptName) {
            return NextResponse.json({ error: 'Nomor departemen dan nama departemen wajib diisi.' }, { status: 400 })
        }

        // Constraint: category only 'prodi' or 'unit'
        if (!['prodi', 'unit'].includes(deptCategory)) {
            return NextResponse.json({ error: 'Nilai kategori hanya boleh "prodi" atau "unit".' }, { status: 400 })
        }

        const payload: Record<string, any> = {
            kode: deptNo,
            nama: deptName,
            tipe: deptCategory,
            department_no: deptNo,
            name: deptName,
            category: deptCategory,
            status: deptStatus,
            parent_id: body.parent_id || null
        }

        const { data, error } = await supabase.from('master_unit').insert(payload).select().single()
        if (error) {
            if (error.code === '23505' || error.message.includes('unique')) {
                return NextResponse.json({ error: `Departemen dengan nomor "${deptNo}" sudah terdaftar.` }, { status: 409 })
            }
            return NextResponse.json({ error: error.message }, { status: 500 })
        }
        return NextResponse.json(data)
    } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 500 }) }
}

export async function PUT(request: Request) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        const { data: p } = await supabase.from('profiles').select('role').eq('id', user.id).single()
        if (!p || p.role !== 'admin') return NextResponse.json({ error: 'Hanya admin.' }, { status: 403 })

        const body = await request.json()
        if (!body.id) return NextResponse.json({ error: 'ID departemen wajib disertakan.' }, { status: 400 })

        const deptNo = (body.department_no || body.kode || '').trim()
        const deptName = (body.name || body.nama || '').trim()
        const deptCategory = (body.category || body.tipe || 'unit').trim().toLowerCase()
        const deptStatus = (body.status || 'Active').trim()

        if (!deptNo || !deptName) {
            return NextResponse.json({ error: 'Nomor departemen dan nama departemen wajib diisi.' }, { status: 400 })
        }

        // Constraint: category only 'prodi' or 'unit'
        if (!['prodi', 'unit'].includes(deptCategory)) {
            return NextResponse.json({ error: 'Nilai kategori hanya boleh "prodi" atau "unit".' }, { status: 400 })
        }

        const payload: Record<string, any> = {
            kode: deptNo,
            nama: deptName,
            tipe: deptCategory,
            department_no: deptNo,
            name: deptName,
            category: deptCategory,
            status: deptStatus,
        }

        const { data, error } = await supabase.from('master_unit').update(payload).eq('id', body.id).select().single()
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

        // Check if unit is in use
        const { data: pRef } = await supabase.from('profiles').select('id').eq('unit_id', id).limit(1)
        if (pRef && pRef.length > 0) {
            return NextResponse.json({ error: 'Departemen tidak dapat dihapus karena masih digunakan oleh pengguna sistem.' }, { status: 400 })
        }

        const { data: rRef } = await supabase.from('rapb').select('id').eq('unit_id', id).limit(1)
        if (rRef && rRef.length > 0) {
            return NextResponse.json({ error: 'Departemen tidak dapat dihapus karena masih digunakan pada data RAPB.' }, { status: 400 })
        }

        const { data: pgRef } = await supabase.from('pengajuan').select('id').eq('unit_id', id).limit(1)
        if (pgRef && pgRef.length > 0) {
            return NextResponse.json({ error: 'Departemen tidak dapat dihapus karena masih digunakan pada data pengajuan.' }, { status: 400 })
        }

        const { error } = await supabase.from('master_unit').delete().eq('id', id)
        if (error) return NextResponse.json({ error: error.message }, { status: 500 })
        return NextResponse.json({ success: true })
    } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 500 }) }
}

