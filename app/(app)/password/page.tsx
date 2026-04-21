'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function PasswordPage() {
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [error, setError] = useState('')
    const [success, setSuccess] = useState('')
    const [loading, setLoading] = useState(false)
    const router = useRouter()
    const supabase = createClient()

    const handleUpdatePassword = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')
        setSuccess('')

        if (password.length < 6) {
            setError('Password baru minimal 6 karakter.')
            return
        }

        if (password !== confirmPassword) {
            setError('Konfirmasi password tidak cocok.')
            return
        }

        setLoading(true)

        const { error } = await supabase.auth.updateUser({
            password: password
        })

        if (error) {
            setError('Gagal mengubah password: ' + error.message)
        } else {
            setSuccess('Password berhasil diperbarui!')
            setPassword('')
            setConfirmPassword('')
        }
        setLoading(false)
    }

    return (
        <div style={{ maxWidth: '480px', margin: '0 auto', paddingTop: '40px' }}>
            <div className="page-header" style={{ marginBottom: '24px' }}>
                <h1 className="page-title">🔑 Ganti Password</h1>
                <p className="page-subtitle">Perbarui kata sandi akun Anda untuk keamanan.</p>
            </div>

            <div className="card">
                {error && (
                    <div className="alert alert-danger" style={{ marginBottom: '16px' }}>
                        <span>⚠️</span>
                        <span>{error}</span>
                    </div>
                )}

                {success && (
                    <div className="alert alert-success" style={{ marginBottom: '16px' }}>
                        <span>✅</span>
                        <span>{success}</span>
                    </div>
                )}

                <form onSubmit={handleUpdatePassword}>
                    <div className="form-group" style={{ marginBottom: '16px' }}>
                        <label className="form-label" htmlFor="password">Password Baru</label>
                        <input
                            id="password"
                            type="password"
                            className="form-input"
                            placeholder="Minimal 6 karakter"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            minLength={6}
                        />
                    </div>

                    <div className="form-group" style={{ marginBottom: '24px' }}>
                        <label className="form-label" htmlFor="confirmPassword">Konfirmasi Password Baru</label>
                        <input
                            id="confirmPassword"
                            type="password"
                            className="form-input"
                            placeholder="Ulangi password baru"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            required
                            minLength={6}
                        />
                    </div>

                    <button
                        type="submit"
                        className="btn btn-primary"
                        disabled={loading}
                        style={{ width: '100%', justifyContent: 'center' }}
                    >
                        {loading ? '⏳ Menyimpan...' : '💾 Simpan Password Baru'}
                    </button>
                </form>
            </div>
        </div>
    )
}
