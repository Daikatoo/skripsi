import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Sidebar } from '@/components/Sidebar'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
    const supabase = await createClient()

    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

    if (!profile) {
        await supabase.auth.signOut()
        redirect('/login?error=profile_not_found')
    }

    // Count pending reviews from both pengajuan (new) and anggaran (legacy)
    let pendingReviewCount = 0
    if (profile.role === 'kepala_divisi') {
        // New table: pengajuan (by unit_id)
        const { count: c1 } = await supabase.from('pengajuan')
            .select('*', { count: 'exact', head: true })
            .eq('unit_id', profile.unit_id).eq('status', 'pending_kepala')
        // Legacy table: anggaran (by divisi)
        const { count: c2 } = await supabase.from('anggaran')
            .select('*', { count: 'exact', head: true })
            .eq('divisi', profile.divisi).eq('status', 'pending_kepala')
        pendingReviewCount = (c1 || 0) + (c2 || 0)
    } else if (profile.role === 'keuangan') {
        const { count: c1 } = await supabase.from('pengajuan')
            .select('*', { count: 'exact', head: true }).eq('status', 'pending_keuangan')
        const { count: c2 } = await supabase.from('anggaran')
            .select('*', { count: 'exact', head: true }).eq('status', 'pending_keuangan')
        pendingReviewCount = (c1 || 0) + (c2 || 0)
    } else if (profile.role === 'rektorat') {
        const { count: c1 } = await supabase.from('pengajuan')
            .select('*', { count: 'exact', head: true }).eq('status', 'pending_rektorat')
        const { count: c2 } = await supabase.from('anggaran')
            .select('*', { count: 'exact', head: true }).eq('status', 'pending_rektorat')
        pendingReviewCount = (c1 || 0) + (c2 || 0)
    }

    return (
        <div style={{ display: 'flex', minHeight: '100vh' }}>
            <Sidebar profile={profile} pendingReviewCount={pendingReviewCount} />
            <main
                style={{
                    marginLeft: '68px',
                    flex: 1,
                    padding: '32px',
                    minHeight: '100vh',
                    background: 'var(--bg)',
                    transition: 'margin-left 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                }}
            >
                {children}
            </main>
        </div>
    )
}
