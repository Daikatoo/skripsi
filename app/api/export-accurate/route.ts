import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        const { data: p } = await supabase.from('profiles').select('role').eq('id', user.id).single()
        if (!p || !['keuangan','rektorat','admin'].includes(p.role))
            return NextResponse.json({ error: 'Akses ditolak.' }, { status: 403 })

        const { searchParams } = new URL(request.url)
        const bulan = searchParams.get('bulan')
        const tahun = searchParams.get('tahun')
        if (!bulan || !tahun) return NextResponse.json({ error: 'Bulan & tahun wajib.' }, { status: 400 })

        const { data, error } = await supabase.from('realisasi')
            .select('*, master_unit(nama), coa_accounts(id,nama_akun), bank_accounts(nama_rekening)')
            .eq('bulan', parseInt(bulan)).eq('tahun', parseInt(tahun))
            .order('created_at')

        if (error) return NextResponse.json({ error: error.message }, { status: 500 })

        // Build CSV
        let csv = 'Tanggal,No. Akun,Nama Akun,Debit,Kredit,Keterangan,Unit\n'
        for (const r of data || []) {
            const tgl = new Date(r.created_at).toLocaleDateString('id-ID')
            const coaId = r.coa_id || ''
            const coaNama = (r.coa_accounts as any)?.nama_akun || ''
            const debit = r.jumlah
            const kredit = 0
            const ket = (r.keterangan || '').replace(/,/g, ';')
            const unit = (r.master_unit as any)?.nama || ''
            csv += `${tgl},${coaId},"${coaNama}",${debit},${kredit},"${ket}","${unit}"\n`
        }

        return new NextResponse(csv, {
            headers: {
                'Content-Type': 'text/csv; charset=utf-8',
                'Content-Disposition': `attachment; filename="export_accurate_${tahun}_${bulan}.csv"`,
            },
        })
    } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 500 }) }
}
