import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// DELETE user — hanya admin
export async function DELETE(request: Request) {
    try {
        const cookieStore = await cookies()

        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                cookies: {
                    getAll: () => cookieStore.getAll(),
                    setAll: () => { }
                }
            }
        )

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single()

        if (!profile || profile.role !== 'admin') {
            return NextResponse.json({ error: 'Hanya admin yang dapat menghapus user.' }, { status: 403 })
        }

        const { searchParams } = new URL(request.url)
        const userId = searchParams.get('id')
        if (!userId) {
            return NextResponse.json({ error: 'ID user wajib disertakan.' }, { status: 400 })
        }

        // Jangan izinkan admin menghapus dirinya sendiri
        if (userId === user.id) {
            return NextResponse.json({ error: 'Anda tidak bisa menghapus akun Anda sendiri.' }, { status: 400 })
        }

        const supabaseAdmin = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY!,
            {
                cookies: {
                    getAll: () => [],
                    setAll: () => { }
                }
            }
        )

        const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId)
        if (deleteError) {
            console.error('Delete User Error:', deleteError)
            return NextResponse.json({ error: deleteError.message }, { status: 500 })
        }

        return NextResponse.json({ success: true })

    } catch (error: any) {
        console.error('Delete API Error:', error)
        return NextResponse.json({ error: error.message || 'Gagal menghapus user.' }, { status: 500 })
    }
}

// POST — create user (existing logic)
export async function POST(request: Request) {
    try {
        const cookieStore = await cookies()

        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                cookies: {
                    getAll: () => cookieStore.getAll(),
                    setAll: () => { }
                }
            }
        )

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single()

        if (!profile || profile.role !== 'admin') {
            return NextResponse.json(
                { error: 'Hanya Administrator yang dapat menambahkan pengguna.' },
                { status: 403 }
            )
        }

        const body = await request.json()
        const { username, password, full_name, role, divisi } = body

        if (!username || !password || !full_name || !role || !divisi) {
            return NextResponse.json({ error: 'Semua field wajib diisi.' }, { status: 400 })
        }

        if (password.length < 6) {
            return NextResponse.json({ error: 'Password minimal 6 karakter.' }, { status: 400 })
        }

        const supabaseAdmin = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY!,
            {
                cookies: {
                    getAll: () => [],
                    setAll: () => { }
                }
            }
        )

        const safeUsername = username.toLowerCase().trim().replace(/\s+/g, '')
        const internalEmail = `${safeUsername}@internal.budgetflow.app`

        const { data: newUserData, error: createError } = await supabaseAdmin.auth.admin.createUser({
            email: internalEmail,
            password,
            email_confirm: true,
            user_metadata: {
                full_name,
                role,
                divisi,
                username: safeUsername
            }
        })

        if (createError) {
            console.error('Admin Create User Error:', createError)
            let errorMessage = createError.message
            if (errorMessage.toLowerCase().includes('already registered')) {
                errorMessage = `Username "${safeUsername}" sudah terdaftar. Pilih username lain.`
            }
            return NextResponse.json({ error: errorMessage }, { status: 500 })
        }

        return NextResponse.json({ success: true, user: newUserData.user })

    } catch (error: any) {
        console.error('API Error:', error)
        return NextResponse.json({ error: error.message || 'Terjadi kesalahan.' }, { status: 500 })
    }
}
