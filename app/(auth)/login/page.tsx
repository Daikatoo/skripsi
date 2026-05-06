'use client'

import { useState, useEffect, Suspense } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'

function LoginForm() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  useEffect(() => {
    if (searchParams.get('error') === 'profile_not_found') {
      setError('Profil akun Anda tidak ditemukan. Silakan hubungi Administrator IT.')
    }
  }, [searchParams])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const loginEmail = `${username.toLowerCase().trim().replace(/\s+/g, '')}@internal.budgetflow.app`
    const { error } = await supabase.auth.signInWithPassword({ email: loginEmail, password })

    if (error) {
      setError('Username atau password salah.')
      setLoading(false)
    } else {
      router.push('/dashboard')
      router.refresh()
    }
  }

  return (
    <div className="login-page">
      {/* Left — Branding */}
      <div className="login-brand">
        <div className="brand-content">
          <div className="brand-icon">💰</div>
          <h1 className="brand-title">BudgetFlow</h1>
          <p className="brand-tagline">Sistem Penganggaran Bottom-Up</p>
          <div className="brand-features">
            <div className="brand-feature">
              <span className="feature-dot" />
              <span>Ajukan anggaran secara digital</span>
            </div>
            <div className="brand-feature">
              <span className="feature-dot" />
              <span>Alur persetujuan berjenjang</span>
            </div>
            <div className="brand-feature">
              <span className="feature-dot" />
              <span>Pantau status secara real-time</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right — Form */}
      <div className="login-form-side">
        <div className="login-card">
          <div className="login-header">
            <h2>Masuk</h2>
            <p>Silakan masuk dengan akun Anda</p>
          </div>

          {error && (
            <div className="alert alert-danger">
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label className="form-label" htmlFor="username">Username</label>
              <input
                id="username"
                type="text"
                className="form-input"
                placeholder="Ketik username Anda"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoComplete="username"
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                className="form-input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-lg"
              disabled={loading}
              style={{ width: '100%', marginTop: '8px' }}
              id="btn-login"
            >
              {loading ? (
                <>
                  <span className="spinner" />
                  Memproses...
                </>
              ) : 'Masuk →'}
            </button>
          </form>

          <p className="login-footer">
            Belum punya akun? Hubungi Administrator IT Anda.
          </p>
        </div>
      </div>



    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', color: '#94a3b8' }}>Loading...</div>}>
      <LoginForm />
    </Suspense>
  )
}
