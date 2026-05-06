import { createClient } from '@supabase/supabase-js'
const supabase = createClient('https://kamrqjivnlcvzofsogag.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImthbXJxaml2bmxjdnpvZnNvZ2FnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjY2NDU0NiwiZXhwIjoyMDg4MjQwNTQ2fQ.IpJb3S5ATu0Tj30xFWJeYxi6wY8tVkEQL9RGjaICKzs', { auth: { autoRefreshToken: false, persistSession: false } })
const { data } = await supabase.from('profiles').select('id, full_name, username').eq('role', 'admin')
if (!data?.length) { console.log('No admin found.'); process.exit() }
const admin = data[0]
const { error } = await supabase.auth.admin.updateUserById(admin.id, { password: 'admin123' })
if (error) { console.error('Error:', error.message); process.exit(1) }
console.log(`✅ Password direset!\nUsername: ${admin.username}\nPassword: admin123`)
