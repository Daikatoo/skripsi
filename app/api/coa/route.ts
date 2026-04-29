import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const { searchParams } = new URL(request.url)
        const tipe = searchParams.get('tipe_akun')
        const level = searchParams.get('level')
        const headerOnly = searchParams.get('header')
        const parentId = searchParams.get('parent_id')

        let query = supabase.from('coa_accounts').select('*').eq('is_active', true).order('id')
        if (tipe) query = query.eq('tipe_akun', tipe)
        if (level) query = query.eq('level', parseInt(level))
        if (headerOnly === 'false') query = query.eq('is_header', false)
        if (parentId) query = query.eq('parent_id', parentId)

        const { data, error } = await query
        if (error) return NextResponse.json({ error: error.message }, { status: 500 })
        return NextResponse.json(data)
    } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 500 }) }
}
