'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ROLE_CONFIG } from '@/lib/utils'
import { useState } from 'react'

interface Profile {
  id: string
  full_name: string
  role: string
  divisi: string | null
  avatar_url?: string | null
}

interface SidebarProps {
  profile: Profile
  pendingReviewCount?: number
}

const NAV_ITEMS: Record<string, Array<{ href: string; label: string; icon: string }>> = {
  anggota: [
    { href: '/dashboard', label: 'Dashboard', icon: '📊' },
    { href: '/submit', label: 'Ajukan Anggaran', icon: '📤' },
    { href: '/riwayat', label: 'Riwayat', icon: '📋' },
    { href: '/password', label: 'Ganti Password', icon: '🔑' },
  ],
  kepala_divisi: [
    { href: '/dashboard', label: 'Dashboard', icon: '📊' },
    { href: '/kepala', label: 'Review Anggaran', icon: '✅' },
    { href: '/riwayat', label: 'Semua Pengajuan', icon: '📋' },
    { href: '/password', label: 'Ganti Password', icon: '🔑' },
  ],
  keuangan: [
    { href: '/dashboard', label: 'Dashboard', icon: '📊' },
    { href: '/keuangan', label: 'Review Anggaran', icon: '✅' },
    { href: '/riwayat', label: 'Semua Pengajuan', icon: '📋' },
    { href: '/password', label: 'Ganti Password', icon: '🔑' },
  ],
  rektorat: [
    { href: '/dashboard', label: 'Dashboard', icon: '📊' },
    { href: '/rektorat', label: 'Review Anggaran', icon: '✅' },
    { href: '/riwayat', label: 'Semua Pengajuan', icon: '📋' },
    { href: '/password', label: 'Ganti Password', icon: '🔑' },
  ],
}

export function Sidebar({ profile, pendingReviewCount = 0 }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const [hovered, setHovered] = useState(false)

  let navItems: any[] = [...(NAV_ITEMS[profile.role] || NAV_ITEMS.anggota)]
  const roleConfig = ROLE_CONFIG[profile.role] || { label: profile.role, color: '#64748b' }

  if (pendingReviewCount > 0) {
    navItems = navItems.map((item) => {
      if (item.label === 'Review Anggaran') {
        return { ...item, hasBadge: true, badgeCount: pendingReviewCount }
      }
      return item
    })
  }

  // Hanya admin yang bisa melihat Manajemen User
  if (profile.role === 'admin') {
    navItems.push({ href: '/admin/users', label: 'Manajemen User', icon: '👥' })
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const initials = profile.full_name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase()

  const collapsed = !hovered
  const sidebarWidth = collapsed ? '68px' : '260px'

  return (
    <aside
      style={{
        width: sidebarWidth,
        minHeight: '100vh',
        background: '#0f172a',
        display: 'flex',
        flexDirection: 'column',
        position: 'fixed',
        left: 0,
        top: 0,
        bottom: 0,
        zIndex: 100,
        overflowY: 'auto',
        overflowX: 'hidden',
        transition: 'width 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Logo */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: collapsed ? '20px 16px' : '20px',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        overflow: 'hidden',
        whiteSpace: 'nowrap',
      }}>
        <div style={{
          width: '36px',
          height: '36px',
          background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
          borderRadius: '10px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 800,
          fontSize: '16px',
          color: 'white',
          flexShrink: 0,
        }}>B</div>
        <div style={{
          opacity: collapsed ? 0 : 1,
          transition: 'opacity 0.2s',
          overflow: 'hidden',
        }}>
          <div style={{ fontSize: '15px', fontWeight: 700, color: 'white', letterSpacing: '-0.02em' }}>BudgetFlow</div>
          <div style={{ fontSize: '10px', color: '#475569', marginTop: '1px' }}>Bottom-Up Budgeting</div>
        </div>
      </div>

      {/* Navigation */}
      <nav style={{ flex: 1, padding: '16px 8px' }}>
        <div style={{
          fontSize: '10px',
          fontWeight: 700,
          color: '#475569',
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          padding: '4px 8px 8px',
          opacity: collapsed ? 0 : 1,
          transition: 'opacity 0.15s',
          whiteSpace: 'nowrap',
        }}>Menu Utama</div>
        {navItems.map((item: any) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.href}
              href={item.href}
              title={item.label}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: collapsed ? '10px 14px' : '9px 12px',
                borderRadius: '8px',
                fontSize: '13px',
                color: isActive ? '#a5b4fc' : '#94a3b8',
                background: isActive ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
                textDecoration: 'none',
                transition: 'all 0.15s',
                marginBottom: '2px',
                fontWeight: 500,
                overflow: 'hidden',
                whiteSpace: 'nowrap',
              }}
            >
              <span style={{ fontSize: '16px', width: '20px', textAlign: 'center', flexShrink: 0 }}>{item.icon}</span>
              <span style={{
                flex: 1,
                opacity: collapsed ? 0 : 1,
                transition: 'opacity 0.15s',
              }}>{item.label}</span>
              {item.hasBadge && !collapsed && (
                <span style={{
                  background: '#ef4444',
                  color: 'white',
                  fontSize: '10px',
                  fontWeight: 700,
                  padding: '2px 7px',
                  borderRadius: '10px',
                  minWidth: '18px',
                  textAlign: 'center',
                  lineHeight: '1.4',
                }}>
                  {item.badgeCount > 99 ? '99+' : item.badgeCount}
                </span>
              )}
              {item.hasBadge && collapsed && (
                <span style={{
                  position: 'absolute',
                  top: '4px',
                  right: '8px',
                  width: '8px',
                  height: '8px',
                  background: '#ef4444',
                  borderRadius: '50%',
                }} />
              )}
            </Link>
          )
        })}
      </nav>

      {/* Approval Flow — only show when expanded */}
      {!collapsed && (
        <div style={{
          padding: '12px 16px 16px',
          borderTop: '1px solid rgba(255,255,255,0.06)',
          opacity: collapsed ? 0 : 1,
          transition: 'opacity 0.2s',
        }}>
          <div style={{
            fontSize: '10px',
            fontWeight: 700,
            color: '#475569',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            padding: '4px 0 8px',
          }}>Alur Persetujuan</div>
          <div style={{ display: 'flex', alignItems: 'center', marginTop: '4px' }}>
            {[
              { key: 'anggota', short: 'A' },
              { key: 'kepala_divisi', short: 'K' },
              { key: 'keuangan', short: 'U' },
              { key: 'rektorat', short: 'R' },
            ].map((step, i) => {
              const isCurrent = profile.role === step.key
              return (
                <div key={step.key} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                  <div style={{
                    width: '26px',
                    height: '26px',
                    borderRadius: '50%',
                    background: isCurrent ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : 'rgba(255,255,255,0.06)',
                    border: isCurrent ? '1px solid #818cf8' : '1px solid rgba(255,255,255,0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '10px',
                    fontWeight: 700,
                    color: isCurrent ? 'white' : '#475569',
                    flexShrink: 0,
                    boxShadow: isCurrent ? '0 0 12px rgba(99,102,241,0.4)' : 'none',
                  }}>{step.short}</div>
                  {i < 3 && <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.08)', margin: '0 3px' }} />}
                </div>
              )
            })}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px' }}>
            {['Anggota', 'K.Divisi', 'Keuangan', 'Rektorat'].map((l) => (
              <span key={l} style={{ fontSize: '9px', color: '#475569', textAlign: 'center', flex: 1 }}>{l}</span>
            ))}
          </div>
        </div>
      )}

      {/* User */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: collapsed ? '0' : '10px',
        padding: collapsed ? '14px 12px' : '14px 16px',
        borderTop: '1px solid rgba(255,255,255,0.06)',
        justifyContent: collapsed ? 'center' : 'flex-start',
      }}>
        <div style={{
          width: '34px',
          height: '34px',
          borderRadius: '8px',
          background: profile.avatar_url ? `url(${profile.avatar_url}) center/cover` : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
          color: 'white',
          fontWeight: 700,
          fontSize: '12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}>{profile.avatar_url ? '' : initials}</div>
        {!collapsed && (
          <>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '13px', fontWeight: 600, color: '#e2e8f0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {profile.full_name}
              </div>
              <div style={{ fontSize: '11px', color: '#64748b', marginTop: '1px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {roleConfig.label}{profile.divisi ? ` · ${profile.divisi}` : ''}
              </div>
            </div>
            <button
              onClick={handleLogout}
              title="Keluar"
              id="btn-logout"
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: '#475569',
                padding: '6px',
                borderRadius: '6px',
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
            </button>
          </>
        )}
      </div>
    </aside>
  )
}
