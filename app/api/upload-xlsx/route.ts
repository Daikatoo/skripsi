import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
        if (!profile || profile.role !== 'anggota')
            return NextResponse.json({ error: 'Hanya anggota yang dapat mengajukan.' }, { status: 403 })

        const formData = await request.formData()
        const file = formData.get('file') as File
        const judul = formData.get('judul') as string
        const deskripsi = formData.get('deskripsi') as string
        const unit_id = formData.get('unit_id') as string
        const coa_id = formData.get('coa_id') as string
        const bulan = formData.get('bulan') as string
        const tahun = formData.get('tahun') as string
        const parsedDataStr = formData.get('parsed_data') as string
        const totalStr = formData.get('total_anggaran') as string
        const docFile = formData.get('doc_file') as File | null

        if (!file || !judul || !unit_id || !parsedDataStr)
            return NextResponse.json({ error: 'Data tidak lengkap.' }, { status: 400 })

        // 1. Upload Excel
        const ext = file.name.split('.').pop()
        const fPath = `uploads/${user.id}-${Date.now()}.${ext}`
        const { error: upErr } = await supabase.storage.from('anggaran-files').upload(fPath, file)
        if (upErr) return NextResponse.json({ error: 'Gagal upload file.' }, { status: 500 })
        const { data: urlData } = supabase.storage.from('anggaran-files').getPublicUrl(fPath)

        // 2. Upload Doc (optional)
        let docUrl = null, docName = null
        if (docFile) {
            const dExt = docFile.name.split('.').pop()
            const dPath = `uploads/${user.id}-doc-${Date.now()}.${dExt}`
            const { error: dErr } = await supabase.storage.from('anggaran-files').upload(dPath, docFile)
            if (dErr) return NextResponse.json({ error: 'Gagal upload dokumen.' }, { status: 500 })
            const { data: dUrl } = supabase.storage.from('anggaran-files').getPublicUrl(dPath)
            docUrl = dUrl.publicUrl; docName = docFile.name
        }

        // 3. Insert to pengajuan table
        const parsedData = JSON.parse(parsedDataStr)
        const total = parseFloat(totalStr) || 0

        const { data: pengajuan, error: dbErr } = await supabase.from('pengajuan').insert({
            unit_id, coa_id: coa_id || null,
            bulan: parseInt(bulan) || new Date().getMonth() + 1,
            tahun: parseInt(tahun) || new Date().getFullYear(),
            judul, deskripsi,
            file_url: urlData.publicUrl, file_name: file.name,
            dokumen_url: docUrl, dokumen_name: docName,
            parsed_data: parsedData, jumlah_pengajuan: total,
            submitted_by: user.id, status: 'pending_kepala',
        }).select().single()

        if (dbErr) {
            console.error('DB Error:', dbErr)
            return NextResponse.json({ error: 'Gagal menyimpan pengajuan.' }, { status: 500 })
        }

        // 4. Also insert to legacy anggaran table for backward compat
        await supabase.from('anggaran').insert({
            judul, deskripsi, divisi: unit_id,
            file_url: urlData.publicUrl, file_name: file.name,
            dokumen_url: docUrl, dokumen_name: docName,
            parsed_data: parsedData, total_anggaran: total,
            submitted_by: user.id, status: 'pending_kepala',
        })

        // 5. Log
        await supabase.from('approval_logs').insert({
            pengajuan_id: pengajuan.id,
            approver_id: user.id,
            role: 'anggota',
            action: 'submitted',
            catatan: 'Pengajuan awal',
        })

        return NextResponse.json({ success: true, pengajuan })
    } catch (error: any) {
        console.error('API Error:', error)
        return NextResponse.json({ error: error.message || 'Kesalahan sistem.' }, { status: 500 })
    }
}
