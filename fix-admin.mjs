import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://kamrqjivnlcvzofsogag.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImthbXJxaml2bmxjdnpvZnNvZ2FnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjY2NDU0NiwiZXhwIjoyMDg4MjQwNTQ2fQ.IpJb3S5ATu0Tj30xFWJeYxi6wY8tVkEQL9RGjaICKzs'

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
})

async function fixAdmin() {
    console.log('=== LANGKAH 1: Perbaiki CHECK CONSTRAINT role ===')

    // Hapus constraint lama dan tambahkan yang baru termasuk 'admin'
    const { error: sqlErr1 } = await supabase.rpc('exec_sql', {
        sql: `ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;`
    })

    const { error: sqlErr2 } = await supabase.rpc('exec_sql', {
        sql: `ALTER TABLE profiles ADD CONSTRAINT profiles_role_check CHECK (role IN ('anggota', 'kepala_divisi', 'keuangan', 'rektorat', 'admin'));`
    })

    // RPC mungkin tidak tersedia, kita akan coba cara langsung via REST
    if (sqlErr1 || sqlErr2) {
        console.log('⚠️ RPC exec_sql tidak tersedia (wajar). Lanjut cari admin user...')
    } else {
        console.log('✅ Constraint role berhasil diperbaiki!')
    }

    console.log('\n=== LANGKAH 2: Cari user admin_it di Auth ===')
    const { data: listData, error: listErr } = await supabase.auth.admin.listUsers()
    if (listErr) {
        console.error('Gagal list users:', listErr)
        return
    }

    const adminUser = listData.users.find(u => u.email === 'admin_it@internal.budgetflow.app')
    if (!adminUser) {
        console.log('❌ User admin_it tidak ditemukan di Auth. Membuat baru...')
        const { data: newUser, error: createErr } = await supabase.auth.admin.createUser({
            email: 'admin_it@internal.budgetflow.app',
            password: 'password_aman_123',
            email_confirm: true,
            user_metadata: {
                full_name: 'Administrator IT',
                role: 'admin',
                divisi: 'IT & Teknologi',
                username: 'admin_it'
            }
        })
        if (createErr) {
            console.error('Error create:', createErr)
            return
        }
        console.log('✅ User admin_it dibuat, ID:', newUser.user.id)
        console.log('⏳ Menunggu trigger untuk membuat profil...')
        await new Promise(r => setTimeout(r, 2000))

        // Cek apakah profil berhasil tercreate oleh trigger
        const { data: profile } = await supabase.from('profiles').select('*').eq('id', newUser.user.id).single()
        if (profile) {
            console.log('✅ Profil berhasil dibuat oleh trigger:', profile)
        } else {
            console.log('⚠️ Trigger gagal membuat profil. Menyisipkan manual...')
            const { error: insertErr } = await supabase.from('profiles').insert({
                id: newUser.user.id,
                full_name: 'Administrator IT',
                role: 'admin',
                divisi: 'IT & Teknologi'
            })
            if (insertErr) console.error('❌ Gagal insert manual:', insertErr)
            else console.log('✅ Profil admin berhasil disisipkan manual!')
        }
    } else {
        console.log('✔️ User admin_it sudah ada di Auth, ID:', adminUser.id)

        // Cek apakah profilnya ada  
        const { data: profile } = await supabase.from('profiles').select('*').eq('id', adminUser.id).single()

        if (profile) {
            console.log('✅ Profil sudah ada:', profile)
            console.log('Admin sudah oke, langsung coba login!')
        } else {
            console.log('⚠️ Profil TIDAK ADA! Menyisipkan manual...')

            // Insert langsung pakai service role (bypass RLS)
            const { error: insertErr } = await supabase.from('profiles').insert({
                id: adminUser.id,
                full_name: 'Administrator IT',
                role: 'admin',
                divisi: 'IT & Teknologi'
            })

            if (insertErr) {
                console.error('❌ Gagal insert:', insertErr.message)

                if (insertErr.message.includes('check') || insertErr.message.includes('constraint')) {
                    console.log('\n🔧 CONSTRAINT BELUM DIPERBAIKI!')
                    console.log('Anda HARUS menjalankan SQL ini di Supabase SQL Editor:')
                    console.log('---')
                    console.log(`ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;`)
                    console.log(`ALTER TABLE profiles ADD CONSTRAINT profiles_role_check CHECK (role IN ('anggota', 'kepala_divisi', 'keuangan', 'rektorat', 'admin'));`)
                    console.log('---')
                    console.log('Setelah itu jalankan script ini lagi.')
                }
            } else {
                console.log('✅ Profil admin berhasil disisipkan! Silakan login dengan admin_it / password_aman_123')
            }
        }
    }
}

fixAdmin()
