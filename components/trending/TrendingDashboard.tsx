'use client'

import { useEffect, useState, useCallback } from 'react'
import Image from 'next/image'
import type { AdAccount, Creative } from '@/lib/meta'
import { useAccounts } from '@/lib/AccountContext'
import CreativeModal from '../CreativeModal'

interface TrendingCreative extends Creative {
  accountId: string
  accountName: string
  accountCurrency: string
}

function fmtCurrency(n: number, currency: string) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(n)
}

export default function TrendingDashboard() {
  const { accounts, isLoadingAccounts } = useAccounts()
  const [items, setItems] = useState<TrendingCreative[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [modalCreative, setModalCreative] = useState<TrendingCreative | null>(null)

  const load = useCallback(async (accs: AdAccount[]) => {
    if (accs.length === 0) {
      setItems([])
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const results = await Promise.all(
        accs.map(async (acc) => {
          const res = await fetch(
            `/api/meta/creatives?accountId=${acc.id}&datePreset=last_7d&minSpend=0&format=all`
          )
          const data = await res.json()
          if (data.error) return [] as TrendingCreative[]
          return (data.creatives as Creative[])
            .slice(0, 5)
            .map((c) => ({ ...c, accountId: acc.id, accountName: acc.name, accountCurrency: acc.currency }))
        })
      )
      const merged = results.flat().sort((a, b) => b.spend - a.spend)
      setItems(merged)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!isLoadingAccounts) load(accounts)
  }, [isLoadingAccounts, accounts, load])

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <div
        className="flex items-center justify-between px-6 py-3"
        style={{ borderBottom: '1px solid #2d1f50', background: '#130c22' }}
      >
        <div>
          <h1 className="text-base font-semibold" style={{ color: '#f5f3ff' }}>
            Trending
          </h1>
          <p className="text-xs" style={{ color: '#6b7280' }}>
            Top-moving creatives across all your connected ad accounts, last 7 days
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

      <main className="flex-1 overflow-y-auto p-6 flex flex-col gap-4">
        <div
          className="text-xs px-4 py-2.5 rounded-lg"
          style={{ background: '#1a1230', border: '1px solid #2d1f50', color: '#9ca3af' }}
        >
          This view aggregates your own accounts. Point it at public competitor ads via Meta&apos;s Ad Library API
          once you pick which brands or Pages to track.
        </div>

        {loading ? (
          <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))' }}>
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-64 rounded-xl animate-pulse" style={{ background: '#1a1230' }} />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center gap-2 rounded-xl py-16"
            style={{ background: '#1a1230', border: '1px solid #2d1f50' }}
          >
            <p className="text-sm font-medium" style={{ color: '#f5f3ff' }}>
              No trending creatives found
            </p>
          </div>
        ) : (
          <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))' }}>
            {items.map((c) => (
              <div
                key={`${c.accountName}-${c.id}`}
                className="rounded-xl overflow-hidden flex flex-col cursor-pointer transition-all hover:scale-[1.01]"
                style={{ background: '#1a1230', border: '1px solid #2d1f50' }}
                onClick={() => setModalCreative(c)}
              >
                <div className="relative aspect-[4/3] w-full" style={{ background: '#0d0918' }}>
                  {c.thumbnailUrl ? (
                    <Image src={c.thumbnailUrl} alt={c.name} fill className="object-cover" unoptimized />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <span style={{ color: '#3d2a6a' }}>No preview</span>
                    </div>
                  )}
                  <div
                    className="absolute top-2 left-2 text-xs font-medium px-2 py-0.5 rounded"
                    style={{ background: 'rgba(13,9,24,0.75)', color: '#a78bfa' }}
                  >
                    {c.accountName}
                  </div>
                </div>
                <div className="p-3 flex flex-col gap-1.5">
                  <p className="text-sm font-medium line-clamp-2" style={{ color: '#f5f3ff' }}>
                    {c.name}
                  </p>
                  <div className="flex justify-between text-xs">
                    <span style={{ color: '#9ca3af' }}>Spend</span>
                    <span style={{ color: '#f5f3ff' }}>{fmtCurrency(c.spend, c.accountCurrency)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span style={{ color: '#9ca3af' }}>ROAS</span>
                    <span style={{ color: '#f5f3ff' }}>{c.roas > 0 ? c.roas.toFixed(2) + 'x' : '—'}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {modalCreative && (
        <CreativeModal
          creative={modalCreative}
          currency={modalCreative.accountCurrency}
          accountId={modalCreative.accountId}
          onClose={() => setModalCreative(null)}
        />
      )}
    </div>
  )
}
