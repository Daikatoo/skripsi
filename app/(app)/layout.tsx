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

    let pendingReviewCount = 0
    if (profile.role === 'kepala_divisi') {
        const { count } = await supabase
            .from('anggaran')
            .select('*', { count: 'exact', head: true })
            .eq('divisi', profile.divisi)
            .eq('status', 'pending_kepala')
        pendingReviewCount = count || 0
    } else if (profile.role === 'keuangan') {
        const { count } = await supabase
            .from('anggaran')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'pending_keuangan')
        pendingReviewCount = count || 0
    } else if (profile.role === 'rektorat') {
        const { count } = await supabase
            .from('anggaran')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'pending_rektorat')
        pendingReviewCount = count || 0
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
