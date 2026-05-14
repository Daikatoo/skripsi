import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function PATCH(request: Request) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        
        const { data: p } = await supabase.from('profiles').select('role').eq('id', user.id).single()
        if (!p) return NextResponse.json({ error: 'Profile not found' }, { status: 403 })

        const body = await request.json()
        const { unit_id, tahun_anggaran, new_status, current_status } = body

        if (!unit_id || !tahun_anggaran || !new_status) {
            return NextResponse.json({ error: 'Data tidak lengkap (unit_id, tahun_anggaran, new_status)' }, { status: 400 })
        }

        // Validate Role and Status transitions
        // Divisi: draft -> pending_keuangan
        // Keuangan: pending_keuangan -> pending_rektorat OR revision_keuangan
        // Rektorat: pending_rektorat -> approved OR revision_rektorat
        
        let allowed = false
        if (p.role === 'keuangan' || p.role === 'admin') allowed = true
        else if (p.role === 'rektorat') {
            if (['approved', 'revision_rektorat', 'pending_keuangan'].includes(new_status)) allowed = true
        } else if (p.role === 'kepala_divisi' || p.role === 'anggota') {
            if (new_status === 'pending_keuangan') allowed = true
        }

        if (!allowed) return NextResponse.json({ error: 'Akses ditolak untuk mengubah status ini.' }, { status: 403 })

        // Update all rows for that unit and year that match the current_status
        let query = supabase.from('rapb').update({ status: new_status })
            .eq('unit_id', unit_id)
            .eq('tahun_anggaran', tahun_anggaran)
            
        if (current_status) {
            // Only update rows that are currently in a specific status (e.g. only draft rows to pending)
            // If current_status is an array
            if (Array.isArray(current_status)) {
                query = query.in('status', current_status)
            } else {
                query = query.eq('status', current_status)
            }
        }

        const { error } = await query
        
        if (error) return NextResponse.json({ error: error.message }, { status: 500 })
        return NextResponse.json({ success: true })
        
    } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 500 }) }
}
