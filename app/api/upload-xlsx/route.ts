import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

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

        if (!profile || profile.role !== 'anggota') {
            return NextResponse.json(
                { error: 'Hanya anggota yang dapat mengajukan anggaran.' },
                { status: 403 }
            )
        }

        const formData = await request.formData()
        const file = formData.get('file') as File
        const judul = formData.get('judul') as string
        const deskripsi = formData.get('deskripsi') as string
        const divisi = formData.get('divisi') as string
        const parsedDataStr = formData.get('parsed_data') as string
        const totalAnggaranStr = formData.get('total_anggaran') as string
        const docFile = formData.get('doc_file') as File | null

        if (!file || !judul || !divisi || !parsedDataStr) {
            return NextResponse.json(
                { error: 'Data tidak lengkap.' },
                { status: 400 }
            )
        }

        // 1. Upload file to Storage
        const fileExt = file.name.split('.').pop()
        const fileName = `${user.id}-${Date.now()}.${fileExt}`
        const filePath = `uploads/${fileName}`

        const { error: uploadError } = await supabase.storage
            .from('anggaran-files')
            .upload(filePath, file)

        if (uploadError) {
            console.error('Upload Error:', uploadError)
            return NextResponse.json(
                { error: 'Gagal mengupload file Excel.' },
                { status: 500 }
            )
        }

        const { data: publicUrlData } = supabase.storage
            .from('anggaran-files')
            .getPublicUrl(filePath)

        // 1.5. Upload Document File (if exists)
        let docPublicUrl = null
        let docName = null

        if (docFile) {
            const docExt = docFile.name.split('.').pop()
            const docFileName = `${user.id}-doc-${Date.now()}.${docExt}`
            const docFilePath = `uploads/${docFileName}`

            const { error: docUploadError } = await supabase.storage
                .from('anggaran-files')
                .upload(docFilePath, docFile)

            if (docUploadError) {
                console.error('Doc Upload Error:', docUploadError)
                return NextResponse.json(
                    { error: 'Gagal mengupload file dokumen pendukung.' },
                    { status: 500 }
                )
            }

            const { data: docUrlData } = supabase.storage
                .from('anggaran-files')
                .getPublicUrl(docFilePath)

            docPublicUrl = docUrlData.publicUrl
            docName = docFile.name
        }

        // 2. Save to database
        const parsedData = JSON.parse(parsedDataStr)
        const totalAnggaran = parseFloat(totalAnggaranStr) || 0

        const { data: anggaran, error: dbError } = await supabase
            .from('anggaran')
            .insert({
                judul,
                deskripsi,
                divisi,
                file_url: publicUrlData.publicUrl,
                file_name: file.name,
                dokumen_url: docPublicUrl,
                dokumen_name: docName,
                parsed_data: parsedData,
                total_anggaran: totalAnggaran,
                submitted_by: user.id,
                status: 'pending_kepala',
            })
            .select()
            .single()

        if (dbError) {
            console.error('DB Insert Error:', dbError)
            return NextResponse.json(
                { error: 'Gagal menyimpan data pengajuan.' },
                { status: 500 }
            )
        }

        // 3. Log initial submission
        await supabase.from('approval_logs').insert({
            anggaran_id: anggaran.id,
            approver_id: user.id,
            role: 'anggota',
            action: 'submitted',
            catatan: 'Pengajuan awal',
        })

        return NextResponse.json({ success: true, anggaran })
    } catch (error: any) {
        console.error('API Error:', error)
        return NextResponse.json(
            { error: error.message || 'Terjadi kesalahan sistem.' },
            { status: 500 }
        )
    }
}
