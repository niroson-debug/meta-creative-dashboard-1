'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAccounts } from '@/lib/AccountContext'

export default function Sidebar() {
  const { accounts, selectedAccount, setSelectedAccount, isLoadingAccounts } = useAccounts()

  return (
    <aside
      className="flex flex-col h-full w-64 shrink-0"
      style={{ background: '#130c22', borderRight: '1px solid #2d1f50' }}
    >
      {/* Logo */}
      <div
        className="flex items-center gap-2.5 px-5 py-4"
        style={{ borderBottom: '1px solid #2d1f50' }}
      >
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm"
          style={{ background: '#7c3aed' }}
        >
          C
        </div>
        <span className="font-semibold text-sm" style={{ color: '#f5f3ff' }}>
          Creative Analytics
        </span>
      </div>

      {/* Nav */}
      <nav className="flex flex-col gap-1 px-3 pt-4">
        <NavLink href="/" icon={HomeIcon} label="Home" />
        <NavLink href="/creatives" icon={GridIcon} label="Creatives" />
        <NavLink href="/leaderboard" icon={TrophyIcon} label="Leaderboard" />
        <NavLink href="/trending" icon={TrendIcon} label="Trending" />
        <NavLink href="/report" icon={BarIcon} label="Performance Report" />
      </nav>

      {/* Ad Accounts */}
      <div className="flex flex-col flex-1 overflow-hidden mt-6">
        <p
          className="px-5 pb-2 text-xs font-semibold uppercase tracking-wider"
          style={{ color: '#6b7280' }}
        >
          Ad Accounts
        </p>

        {isLoadingAccounts ? (
          <div className="px-5 py-3 flex flex-col gap-2">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="h-8 rounded-lg animate-pulse"
                style={{ background: '#1a1230' }}
              />
            ))}
          </div>
        ) : accounts.length === 0 ? (
          <p className="px-5 text-xs" style={{ color: '#6b7280' }}>
            No accounts found
          </p>
        ) : (
          <div className="flex flex-col gap-0.5 px-3 overflow-y-auto flex-1 pb-4">
            {accounts.map((account) => {
              const active = selectedAccount?.id === account.id
              return (
                <button
                  key={account.id}
                  onClick={() => setSelectedAccount(account)}
                  className="w-full text-left px-3 py-2 rounded-lg text-sm transition-all"
                  style={{
                    background: active ? '#2d1f50' : 'transparent',
                    color: active ? '#a78bfa' : '#9ca3af',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ background: active ? '#7c3aed' : '#2d1f50' }}
                    />
                    <span className="truncate">{account.name}</span>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Footer */}
      <div
        className="px-5 py-3 text-xs"
        style={{ color: '#6b7280', borderTop: '1px solid #2d1f50' }}
      >
        Meta · Google Ads
      </div>
    </aside>
  )
}

function NavLink({ href, icon: Icon, label }: { href: string; icon: React.FC; label: string }) {
  const path = usePathname()
  const active = path === href
  return (
    <Link href={href} style={{ textDecoration: 'none' }} className="block">
      <span
        style={{
          color: active ? '#a78bfa' : '#6b7280',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          background: active ? '#2d1f50' : 'transparent',
          padding: '6px 10px',
          borderRadius: '8px',
          width: '100%',
          fontSize: '14px',
        }}
      >
        <Icon />
        {label}
      </span>
    </Link>
  )
}

function HomeIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
      <path d="M9 22V12h6v10" />
    </svg>
  )
}

function GridIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  )
}

function BarIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  )
}

function TrophyIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 01-10 0V4z" />
      <path d="M17 5h3a2 2 0 01-2 4h-1M7 5H4a2 2 0 002 4h1" />
    </svg>
  )
}

function TrendIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
      <polyline points="17 6 23 6 23 12" />
    </svg>
  )
}
