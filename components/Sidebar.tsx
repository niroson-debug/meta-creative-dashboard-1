'use client'

import type { AdAccount } from '@/lib/meta'

interface Props {
  accounts: AdAccount[]
  selectedAccount: AdAccount | null
  onSelectAccount: (account: AdAccount) => void
  isLoadingAccounts: boolean
}

export default function Sidebar({
  accounts,
  selectedAccount,
  onSelectAccount,
  isLoadingAccounts,
}: Props) {
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
        <NavItem icon={GridIcon} label="Overview" active />
        <NavItem icon={BarIcon} label="Compare" />
        <NavItem icon={StarIcon} label="Top Creatives" />
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
                  onClick={() => onSelectAccount(account)}
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
        Facebook · Meta Ads
      </div>
    </aside>
  )
}

function NavItem({
  icon: Icon,
  label,
  active,
}: {
  icon: React.FC
  label: string
  active?: boolean
}) {
  return (
    <div
      className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm cursor-pointer transition-all"
      style={{
        background: active ? '#2d1f50' : 'transparent',
        color: active ? '#a78bfa' : '#6b7280',
      }}
    >
      <Icon />
      {label}
    </div>
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

function StarIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  )
}
