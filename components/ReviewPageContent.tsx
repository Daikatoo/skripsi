import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ReviewForm } from '@/components/ReviewForm'
import Link from 'next/link'

interface Props {
    params: Promise<{ id: string }>
    role: 'kepala_divisi' | 'keuangan' | 'rektorat'
    expectedStatus: string
    backHref: string
}

export async function ReviewPageContent({ params, role, expectedStatus, backHref }: Props) {
    const { id } = await params
    const supabase = await createClient()

    const {
        data: { user },
    } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    const { data: profile } = await supabase
        .from('profiles').select('*').eq('id', user.id).single()
    if (!profile || profile.role !== role) redirect('/dashboard')

    const { data: anggaran } = await supabase
        .from('anggaran')
        .select('*, profiles!anggaran_submitted_by_fkey(full_name)')
        .eq('id', id)
        .single()

    if (!anggaran) notFound()
    if (anggaran.status !== expectedStatus) redirect(backHref)

    const submitter = anggaran.profiles as { full_name: string } | null

    return (
        <div>
            <div style={{ marginBottom: '24px' }}>
                <Link href={backHref} style={{ fontSize: '14px', color: '#64748b', textDecoration: 'none' }}>
                    ← Kembali ke Daftar Review
                </Link>
            </div>

            <div className="page-header">
                <h1 className="page-title">⚖️ Review Pengajuan Anggaran</h1>
                <p className="page-subtitle">Tinjau data anggaran dan berikan keputusan</p>
            </div>

            <ReviewForm
                anggaranId={anggaran.id}
                judul={anggaran.judul}
                deskripsi={anggaran.deskripsi}
                filName={anggaran.file_name}
                totalAnggaran={anggaran.total_anggaran}
                divisi={anggaran.divisi}
                submitterName={submitter?.full_name || 'Unknown'}
                parsedData={anggaran.parsed_data || []}
                reviewerRole={role}
            />
        </div>
    )
}
