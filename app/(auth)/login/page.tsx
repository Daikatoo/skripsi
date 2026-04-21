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

      <style jsx>{`
        .login-page {
          min-height: 100vh;
          display: grid;
          grid-template-columns: 1fr 1fr;
        }

        /* Left branding panel */
        .login-brand {
          background: linear-gradient(145deg, #312e81, #4f46e5, #7c3aed);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 48px;
          position: relative;
          overflow: hidden;
        }
        .login-brand::before {
          content: '';
          position: absolute;
          width: 600px;
          height: 600px;
          border-radius: 50%;
          background: rgba(255,255,255,0.04);
          top: -200px;
          right: -200px;
        }
        .login-brand::after {
          content: '';
          position: absolute;
          width: 300px;
          height: 300px;
          border-radius: 50%;
          background: rgba(255,255,255,0.03);
          bottom: -50px;
          left: -50px;
        }

        .brand-content {
          position: relative;
          z-index: 1;
          max-width: 400px;
        }
        .brand-icon {
          font-size: 56px;
          margin-bottom: 20px;
          animation: fadeIn 0.6s ease;
        }
        .brand-title {
          font-size: 40px;
          font-weight: 800;
          color: white;
          margin: 0 0 8px;
          letter-spacing: -0.03em;
          animation: fadeIn 0.6s ease 0.1s both;
        }
        .brand-tagline {
          font-size: 16px;
          color: rgba(255,255,255,0.7);
          margin: 0 0 40px;
          animation: fadeIn 0.6s ease 0.2s both;
        }
        .brand-features {
          display: flex;
          flex-direction: column;
          gap: 14px;
          animation: fadeIn 0.6s ease 0.3s both;
        }
        .brand-feature {
          display: flex;
          align-items: center;
          gap: 12px;
          color: rgba(255,255,255,0.85);
          font-size: 14px;
        }
        .feature-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #a5b4fc;
          flex-shrink: 0;
        }

        /* Right form panel */
        .login-form-side {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 48px;
          background: white;
        }
        .login-card {
          width: 100%;
          max-width: 400px;
          animation: fadeIn 0.5s ease;
        }
        .login-header {
          margin-bottom: 32px;
        }
        .login-header h2 {
          font-size: 28px;
          font-weight: 700;
          color: #0f172a;
          margin: 0 0 8px;
          letter-spacing: -0.02em;
        }
        .login-header p {
          font-size: 14px;
          color: #64748b;
          margin: 0;
        }
        .login-footer {
          text-align: center;
          margin-top: 24px;
          font-size: 13px;
          color: #94a3b8;
        }

        .spinner {
          width: 16px;
          height: 16px;
          border: 2px solid rgba(255,255,255,0.3);
          border-top-color: white;
          border-radius: 50%;
          animation: spin 0.6s linear infinite;
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        @media (max-width: 900px) {
          .login-page { grid-template-columns: 1fr; }
          .login-brand { display: none; }
        }
      `}</style>
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
