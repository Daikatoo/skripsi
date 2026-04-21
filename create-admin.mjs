import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://kamrqjivnlcvzofsogag.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImthbXJxaml2bmxjdnpvZnNvZ2FnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjY2NDU0NiwiZXhwIjoyMDg4MjQwNTQ2fQ.IpJb3S5ATu0Tj30xFWJeYxi6wY8tVkEQL9RGjaICKzs'

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
})

async function injectAdmin() {
    const username = 'admin_it'
    const internalEmail = `${username}@internal.budgetflow.app`

    console.log(`Menyuntikkan user: ${internalEmail}...`)

    const { data, error } = await supabase.auth.admin.createUser({
        email: internalEmail,
        password: 'password_aman_123',
        email_confirm: true,
        user_metadata: {
            full_name: 'Administrator IT',
            role: 'admin',
            divisi: 'IT & Teknologi',
            username: username
        }
    })

    if (error) {
        if (error.message.includes('already registered')) {
            console.log(`User ${username} sudah ada di Auth. Kita coba Update metadata-nya dan biarkan trigger bekerja ulang...`)

            // Coba Get User ID via Email jika mungkin (Supabase Admin API tidak punya native get by email, kita harus list dulu)
            const { data: list, error: listErr } = await supabase.auth.admin.listUsers()
            if (listErr) { console.error('Gagal list user:', listErr); return }

            const existingUser = list.users.find(u => u.email === internalEmail)
            if (existingUser) {
                console.log('ID Ditemukan:', existingUser.id, '-> Memperbarui User & mengharap trigger baru berjalan')

                // Hapus lalu buat ulang supaya clean sesuai harapan User kita
                await supabase.auth.admin.deleteUser(existingUser.id)
                console.log('Menghapus profile hantu selesai, mendaftarkan ulang secara fresh...')

                const { data: freshData, error: freshErr } = await supabase.auth.admin.createUser({
                    email: internalEmail,
                    password: 'password_aman_123',
                    email_confirm: true,
                    user_metadata: {
                        full_name: 'Administrator IT',
                        role: 'admin',
                        divisi: 'IT & Teknologi',
                        username: username
                    }
                })
                if (freshErr) console.error('Gagal fresh recreate:', freshErr)
                else console.log('✅ FRESH RECREATE SUKSES! Silahkan login dengan username:', username)

            } else {
                console.log('Tidak dapat menemukan UUID user tersebut.')
            }

        } else {
            console.error('Error membuat admin:', error)
        }
    } else {
        console.log('✅ BERHASIL: User admin_it berhasil disuntikkan ke Database Supabase!')
    }
}

injectAdmin()
