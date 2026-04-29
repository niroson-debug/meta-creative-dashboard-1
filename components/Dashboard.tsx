'use client'

import { useState, useEffect, useCallback } from 'react'
import type { AdAccount, Creative } from '@/lib/meta'
import Sidebar from './Sidebar'
import FiltersBar from './FiltersBar'
import CreativeCard from './CreativeCard'
import CreativeModal from './CreativeModal'

export default function Dashboard() {
  const [accounts, setAccounts] = useState<AdAccount[]>([])
  const [selectedAccount, setSelectedAccount] = useState<AdAccount | null>(null)
  const [creatives, setCreatives] = useState<Creative[]>([])
  const [isLoadingAccounts, setIsLoadingAccounts] = useState(true)
  const [isSyncing, setIsSyncing] = useState(false)
  const [lastSync, setLastSync] = useState<Date | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [selectedCreative, setSelectedCreative] = useState<Creative | null>(null)

  // Filters
  const [datePreset, setDatePreset] = useState('last_14d')
  const [format, setFormat] = useState('all')
  const [minSpend, setMinSpend] = useState(0)

  // Load accounts on mount
  useEffect(() => {
    setIsLoadingAccounts(true)
    fetch('/api/meta/accounts')
      .then((r) => r.json())
      .then((data) => {
        if (data.error) throw new Error(data.error)
        setAccounts(data.accounts)
        if (data.accounts.length > 0) setSelectedAccount(data.accounts[0])
      })
      .catch((err) => setError(err.message))
      .finally(() => setIsLoadingAccounts(false))
  }, [])

  // Fetch creatives when account or filters change
  const fetchCreatives = useCallback(async () => {
    if (!selectedAccount) return
    setIsSyncing(true)
    setError(null)
    try {
      const params = new URLSearchParams({
        accountId: selectedAccount.id,
        datePreset,
        minSpend: String(minSpend),
        format,
      })
      const res = await fetch(`/api/meta/creatives?${params}`)
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setCreatives(data.creatives)
      setLastSync(new Date())
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsSyncing(false)
    }
  }, [selectedAccount, datePreset, minSpend, format])

  useEffect(() => {
    fetchCreatives()
  }, [fetchCreatives])

  const currency = selectedAccount?.currency || 'USD'

  return (
    <div className="flex h-full overflow-hidden">
      <Sidebar
        accounts={accounts}
        selectedAccount={selectedAccount}
        onSelectAccount={setSelectedAccount}
        isLoadingAccounts={isLoadingAccounts}
      />

      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Top bar */}
        <div
          className="flex items-center justify-between px-6 py-3"
          style={{ borderBottom: '1px solid #2d1f50', background: '#130c22' }}
        >
          <div>
            <h1 className="text-base font-semibold" style={{ color: '#f5f3ff' }}>
              {selectedAccount?.name ?? 'Creative Analytics'}
            </h1>
            <p className="text-xs" style={{ color: '#6b7280' }}>
              {creatives.length} creatives
            </p>
          </div>

          {error && (
            <div
              className="text-xs px-3 py-1.5 rounded-lg"
              style={{ background: '#2d0f0f', color: '#f87171', border: '1px solid #7f1d1d' }}
            >
              {error}
            </div>
          )}
        </div>

        {/* Filters */}
        <FiltersBar
          datePreset={datePreset}
          setDatePreset={setDatePreset}
          format={format}
          setFormat={setFormat}
          minSpend={minSpend}
          setMinSpend={setMinSpend}
          onSync={fetchCreatives}
          isSyncing={isSyncing}
          lastSync={lastSync}
        />

        {/* Creative grid */}
        <main className="flex-1 overflow-y-auto p-6">
          {isSyncing && creatives.length === 0 ? (
            <LoadingSkeleton />
          ) : creatives.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))' }}>
              {creatives.map((creative) => (
                <CreativeCard
                  key={creative.id}
                  creative={creative}
                  currency={currency}
                  onClick={() => setSelectedCreative(creative)}
                />
              ))}
            </div>
          )}
        </main>
      </div>

      {selectedCreative && (
        <CreativeModal
          creative={selectedCreative}
          currency={currency}
          onClose={() => setSelectedCreative(null)}
        />
      )}
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))' }}>
      {[...Array(8)].map((_, i) => (
        <div
          key={i}
          className="rounded-xl overflow-hidden animate-pulse"
          style={{ background: '#1a1230', border: '1px solid #2d1f50' }}
        >
          <div className="aspect-[4/3]" style={{ background: '#0d0918' }} />
          <div className="p-3 flex flex-col gap-2">
            <div className="h-4 rounded" style={{ background: '#2d1f50', width: '80%' }} />
            <div className="h-3 rounded" style={{ background: '#2d1f50', width: '60%' }} />
            <div className="h-3 rounded" style={{ background: '#2d1f50', width: '70%' }} />
          </div>
        </div>
      ))}
    </div>
  )
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-64 gap-3">
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#3d2a6a" strokeWidth="1.5">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <circle cx="8.5" cy="8.5" r="1.5" />
        <path d="M21 15l-5-5L5 21" />
      </svg>
      <p className="text-sm" style={{ color: '#6b7280' }}>
        No creatives found for this period
      </p>
      <p className="text-xs" style={{ color: '#4b5563' }}>
        Try adjusting your filters or lowering the minimum spend
      </p>
    </div>
  )
}
