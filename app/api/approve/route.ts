import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { AnggaranStatus } from '@/lib/utils'

export async function POST(request: Request) {
    try {
        const supabase = await createClient()

        const {
            data: { user },
        } = await supabase.auth.getUser()
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single()

        if (!profile || !['kepala_divisi', 'keuangan', 'rektorat'].includes(profile.role)) {
            return NextResponse.json({ error: 'Anda tidak memiliki hak akses untuk mereview.' }, { status: 403 })
        }

        const body = await request.json()
        const { anggaran_id, action, catatan } = body

        if (!anggaran_id || !action || (action === 'revision' && !catatan)) {
            return NextResponse.json({ error: 'Data tidak valid.' }, { status: 400 })
        }

        // Determine new status based on role and action
        let newStatus: AnggaranStatus = 'draft'

        if (profile.role === 'kepala_divisi') {
            newStatus = action === 'approved' ? 'pending_keuangan' : 'revision_kepala'
        } else if (profile.role === 'keuangan') {
            newStatus = action === 'approved' ? 'pending_rektorat' : 'revision_keuangan'
        } else if (profile.role === 'rektorat') {
            newStatus = action === 'approved' ? 'approved' : 'revision_rektorat'
        }

        // 1. Update anggaran
        const { error: updateError } = await supabase
            .from('anggaran')
            .update({ status: newStatus, updated_at: new Date().toISOString() })
            .eq('id', anggaran_id)

        if (updateError) {
            console.error('Update Anggaran Error:', updateError)
            return NextResponse.json({ error: 'Gagal mengupdate status anggaran.' }, { status: 500 })
        }

        // 2. Add log
        const { error: logError } = await supabase
            .from('approval_logs')
            .insert({
                anggaran_id,
                approver_id: user.id,
                role: profile.role,
                action,
                catatan: catatan || null,
            })

        if (logError) {
            console.error('Insert Log Error:', logError)
            return NextResponse.json({ error: 'Gagal mencatat riwayat persetujuan.' }, { status: 500 })
        }

        return NextResponse.json({ success: true, newStatus })
    } catch (error: any) {
        console.error('API Error:', error)
        return NextResponse.json(
            { error: error.message || 'Terjadi kesalahan sistem.' },
            { status: 500 }
        )
    }
}
