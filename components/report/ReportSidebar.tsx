'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { AdAccount } from '@/lib/meta'

interface Props {
  accounts: AdAccount[]
  selectedAccount: AdAccount | null
  onSelectAccount: (account: AdAccount) => void
  isLoadingAccounts: boolean
}

export default function ReportSidebar({ accounts, selectedAccount, onSelectAccount, isLoadingAccounts }: Props) {
  const path = usePathname()

  return (
    <aside
      className="flex flex-col h-full w-64 shrink-0"
      style={{ background: '#130c22', borderRight: '1px solid #2d1f50' }}
    >
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '16px 20px', borderBottom: '1px solid #2d1f50' }}>
        <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#7c3aed', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: '14px' }}>
          C
        </div>
        <span style={{ color: '#f5f3ff', fontSize: '14px', fontWeight: 600 }}>Ad Analytics</span>
      </div>

      {/* Nav */}
      <nav style={{ display: 'flex', flexDirection: 'column', gap: '2px', padding: '12px' }}>
        <NavLink href="/" label="Creatives" active={path === '/'} icon={
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
        } />
        <NavLink href="/report" label="Performance Report" active={path === '/report'} icon={
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
        } />
      </nav>

      {/* Ad accounts */}
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden', marginTop: '12px' }}>
        <p style={{ padding: '0 20px 8px', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#6b7280' }}>
          Ad Accounts
        </p>

        {isLoadingAccounts ? (
          <div style={{ padding: '0 20px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {[1, 2, 3].map((i) => (
              <div key={i} style={{ height: '32px', borderRadius: '8px', background: '#1a1230', animation: 'pulse 1.5s ease-in-out infinite' }} />
            ))}
          </div>
        ) : accounts.length === 0 ? (
          <p style={{ padding: '0 20px', fontSize: '12px', color: '#6b7280' }}>No accounts found</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', padding: '0 12px', overflowY: 'auto', flex: 1, paddingBottom: '16px' }}>
            {accounts.map((account) => {
              const active = selectedAccount?.id === account.id
              return (
                <button
                  key={account.id}
                  onClick={() => onSelectAccount(account)}
                  style={{
                    width: '100%', textAlign: 'left', padding: '8px 12px', borderRadius: '8px', fontSize: '13px',
                    background: active ? '#2d1f50' : 'transparent',
                    color: active ? '#a78bfa' : '#9ca3af',
                    border: 'none', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: '8px',
                  }}
                >
                  <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: active ? '#7c3aed' : '#2d1f50', flexShrink: 0 }} />
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{account.name}</span>
                </button>
              )
            })}
          </div>
        )}
      </div>

      <div style={{ padding: '12px 20px', borderTop: '1px solid #2d1f50', fontSize: '11px', color: '#6b7280' }}>
        Meta · Google Ads
      </div>

      <style>{`@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }`}</style>
    </aside>
  )
}

function NavLink({ href, label, active, icon }: { href: string; label: string; active: boolean; icon: React.ReactNode }) {
  return (
    <Link
      href={href}
      style={{
        display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', borderRadius: '8px', fontSize: '13px', textDecoration: 'none',
        background: active ? '#2d1f50' : 'transparent',
        color: active ? '#a78bfa' : '#6b7280',
      }}
    >
      {icon}
      {label}
    </Link>
  )
}
