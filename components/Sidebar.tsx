'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ROLE_CONFIG } from '@/lib/utils'
import { useState } from 'react'

interface Profile { id: string; full_name: string; role: string; divisi: string | null; avatar_url?: string | null }
interface SidebarProps { profile: Profile; pendingReviewCount?: number }

const NAV: Record<string, Array<{ href: string; label: string; icon: string }>> = {
  anggota: [
    { href: '/dashboard', label: 'Dashboard', icon: '📊' },
    { href: '/rapb', label: 'RAPB', icon: '📋' },
    { href: '/submit', label: 'Ajukan Anggaran', icon: '📤' },
    { href: '/riwayat', label: 'Riwayat', icon: '🗂️' },
    { href: '/password', label: 'Ganti Password', icon: '🔑' },
  ],
  kepala_divisi: [
    { href: '/dashboard', label: 'Dashboard', icon: '📊' },
    { href: '/rapb', label: 'RAPB', icon: '📋' },
    { href: '/kepala', label: 'Review Anggaran', icon: '✅' },
    { href: '/realisasi', label: 'Realisasi', icon: '💰' },
    { href: '/riwayat', label: 'Semua Pengajuan', icon: '🗂️' },
    { href: '/password', label: 'Ganti Password', icon: '🔑' },
  ],
  keuangan: [
    { href: '/dashboard', label: 'Dashboard', icon: '📊' },
    { href: '/rapb', label: 'RAPB', icon: '📋' },
    { href: '/keuangan', label: 'Review Anggaran', icon: '✅' },
    { href: '/realisasi', label: 'Realisasi', icon: '💰' },
    { href: '/laporan', label: 'Laporan Keuangan', icon: '📈' },
    { href: '/riwayat', label: 'Semua Pengajuan', icon: '🗂️' },
    { href: '/password', label: 'Ganti Password', icon: '🔑' },
  ],
  rektorat: [
    { href: '/dashboard', label: 'Dashboard', icon: '📊' },
    { href: '/rapb', label: 'RAPB', icon: '📋' },
    { href: '/rektorat', label: 'Review Anggaran', icon: '✅' },
    { href: '/realisasi', label: 'Realisasi', icon: '💰' },
    { href: '/laporan', label: 'Laporan Keuangan', icon: '📈' },
    { href: '/riwayat', label: 'Semua Pengajuan', icon: '🗂️' },
    { href: '/password', label: 'Ganti Password', icon: '🔑' },
  ],
  admin: [
    { href: '/dashboard', label: 'Dashboard', icon: '📊' },
    { href: '/master', label: 'Master Data', icon: '🏛️' },
    { href: '/rapb', label: 'RAPB', icon: '📋' },
    { href: '/realisasi', label: 'Realisasi', icon: '💰' },
    { href: '/laporan', label: 'Laporan Keuangan', icon: '📈' },
    { href: '/riwayat', label: 'Semua Pengajuan', icon: '🗂️' },
    { href: '/admin/users', label: 'Manajemen User', icon: '👥' },
    { href: '/password', label: 'Ganti Password', icon: '🔑' },
  ],
}

export function Sidebar({ profile, pendingReviewCount = 0 }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const [hovered, setHovered] = useState(false)
  let navItems: any[] = [...(NAV[profile.role] || NAV.anggota)]
  const roleConfig = ROLE_CONFIG[profile.role] || { label: profile.role, color: '#64748b' }

  if (pendingReviewCount > 0) {
    navItems = navItems.map(item => item.label === 'Review Anggaran' ? { ...item, hasBadge: true, badgeCount: pendingReviewCount } : item)
  }

  async function handleLogout() { await supabase.auth.signOut(); router.push('/login'); router.refresh() }
  const initials = profile.full_name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
  const collapsed = !hovered
  const w = collapsed ? '68px' : '260px'

  return (
    <aside style={{ width: w, minHeight: '100vh', background: '#0f172a', display: 'flex', flexDirection: 'column', position: 'fixed', left: 0, top: 0, bottom: 0, zIndex: 100, overflowY: 'auto', overflowX: 'hidden', transition: 'width 0.25s cubic-bezier(0.4,0,0.2,1)' }}
      onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}>
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: collapsed ? '20px 16px' : '20px', borderBottom: '1px solid rgba(255,255,255,0.06)', overflow: 'hidden', whiteSpace: 'nowrap' }}>
        <div style={{ width: '36px', height: '36px', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '16px', color: 'white', flexShrink: 0 }}>B</div>
        <div style={{ opacity: collapsed ? 0 : 1, transition: 'opacity 0.2s', overflow: 'hidden' }}>
          <div style={{ fontSize: '15px', fontWeight: 700, color: 'white', letterSpacing: '-0.02em' }}>BudgetFlow</div>
          <div style={{ fontSize: '10px', color: '#475569', marginTop: '1px' }}>UWIKA Budgeting</div>
        </div>
      </div>
      {/* Nav */}
      <nav style={{ flex: 1, padding: '12px 8px', overflowY: 'auto' }}>
        <div style={{ fontSize: '10px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.1em', padding: '4px 8px 6px', opacity: collapsed ? 0 : 1, transition: 'opacity 0.15s', whiteSpace: 'nowrap' }}>Menu</div>
        {navItems.map((item: any) => {
          const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href + '/'))
          return (
            <Link key={item.href} href={item.href} title={item.label} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: collapsed ? '9px 14px' : '8px 12px', borderRadius: '8px', fontSize: '13px', color: isActive ? '#a5b4fc' : '#94a3b8', background: isActive ? 'rgba(99,102,241,0.15)' : 'transparent', textDecoration: 'none', transition: 'all 0.15s', marginBottom: '1px', fontWeight: 500, overflow: 'hidden', whiteSpace: 'nowrap', position: 'relative' }}>
              <span style={{ fontSize: '15px', width: '20px', textAlign: 'center', flexShrink: 0 }}>{item.icon}</span>
              <span style={{ flex: 1, opacity: collapsed ? 0 : 1, transition: 'opacity 0.15s' }}>{item.label}</span>
              {item.hasBadge && !collapsed && <span style={{ background: '#ef4444', color: 'white', fontSize: '10px', fontWeight: 700, padding: '2px 7px', borderRadius: '10px', minWidth: '18px', textAlign: 'center', lineHeight: '1.4' }}>{item.badgeCount > 99 ? '99+' : item.badgeCount}</span>}
            </Link>
          )
        })}
      </nav>
      {/* User */}
      <div style={{ display: 'flex', alignItems: 'center', gap: collapsed ? '0' : '10px', padding: collapsed ? '14px 12px' : '14px 16px', borderTop: '1px solid rgba(255,255,255,0.06)', justifyContent: collapsed ? 'center' : 'flex-start' }}>
        <div style={{ width: '34px', height: '34px', borderRadius: '8px', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: 'white', fontWeight: 700, fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{initials}</div>
        {!collapsed && (<>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '13px', fontWeight: 600, color: '#e2e8f0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{profile.full_name}</div>
            <div style={{ fontSize: '11px', color: '#64748b', marginTop: '1px' }}>{roleConfig.label}</div>
          </div>
          <button onClick={handleLogout} title="Keluar" id="btn-logout" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#475569', padding: '6px', borderRadius: '6px', flexShrink: 0, display: 'flex', alignItems: 'center' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>
          </button>
        </>)}
      </div>
    </aside>
  )
}
