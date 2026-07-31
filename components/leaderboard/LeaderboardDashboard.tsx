'use client'

import { useEffect, useState, useCallback } from 'react'
import Image from 'next/image'
import type { CreativeShift, CreativeTrend } from '@/lib/meta'
import { useAccounts } from '@/lib/AccountContext'
import { periodVsPriorPeriod } from '@/lib/dateRanges'

const SHIFT_TABS: { key: CreativeShift; label: string; color: string; icon: string }[] = [
  { key: 'scaling', label: 'Scaling', color: '#22c55e', icon: '↑' },
  { key: 'declining', label: 'Declining', color: '#ef4444', icon: '↓' },
  { key: 'newly_launched', label: 'Newly launched', color: '#a78bfa', icon: '✦' },
  { key: 'recently_paused', label: 'Recently paused', color: '#6b7280', icon: '⏸' },
]

function fmtCurrency(n: number, currency: string) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(n)
}

function pctLabel(pct: number | null) {
  if (pct === null) return null
  const sign = pct > 0 ? '+' : ''
  return `${sign}${pct.toFixed(0)}%`
}

function ShiftCard({ trend, currency }: { trend: CreativeTrend; currency: string }) {
  return (
    <div className="rounded-xl overflow-hidden flex flex-col" style={{ background: '#1a1230', border: '1px solid #2d1f50' }}>
      <div className="relative aspect-[4/3] w-full" style={{ background: '#0d0918' }}>
        {trend.thumbnailUrl ? (
          <Image src={trend.thumbnailUrl} alt={trend.name} fill className="object-cover" unoptimized />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span style={{ color: '#3d2a6a' }}>No preview</span>
          </div>
        )}
      </div>
      <div className="p-3 flex flex-col gap-1.5">
        <p className="text-sm font-medium line-clamp-2" style={{ color: '#f5f3ff' }}>
          {trend.name}
        </p>
        <div className="flex justify-between text-xs">
          <span style={{ color: '#9ca3af' }}>Spend</span>
          <span style={{ color: '#f5f3ff' }}>
            {fmtCurrency(trend.thisSpend, currency)}
            {trend.spendChangePct !== null && (
              <span style={{ color: trend.spendChangePct >= 0 ? '#22c55e' : '#ef4444' }}> ({pctLabel(trend.spendChangePct)})</span>
            )}
          </span>
        </div>
        <div className="flex justify-between text-xs">
          <span style={{ color: '#9ca3af' }}>ROAS</span>
          <span style={{ color: '#f5f3ff' }}>{trend.thisRoas > 0 ? trend.thisRoas.toFixed(2) + 'x' : '—'}</span>
        </div>
      </div>
    </div>
  )
}

function RankChange({ change }: { change: number | null }) {
  if (change === null) return <span className="text-xs" style={{ color: '#a78bfa' }}>New</span>
  if (change === 0) return <span className="text-xs" style={{ color: '#6b7280' }}>—</span>
  const up = change > 0
  return (
    <span className="text-xs font-medium flex items-center gap-1" style={{ color: up ? '#22c55e' : '#ef4444' }}>
      {up ? '↑' : '↓'} {Math.abs(change)}
    </span>
  )
}

export default function LeaderboardDashboard() {
  const { selectedAccount } = useAccounts()
  const [trends, setTrends] = useState<CreativeTrend[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<CreativeShift>('scaling')
  const [showAll, setShowAll] = useState(false)

  const load = useCallback(async () => {
    if (!selectedAccount) return
    setLoading(true)
    setError(null)
    const { thisPeriod, lastPeriod } = periodVsPriorPeriod(7)
    try {
      const res = await fetch(
        `/api/meta/trends?accountId=${selectedAccount.id}&since1=${thisPeriod.since}&until1=${thisPeriod.until}&since2=${lastPeriod.since}&until2=${lastPeriod.until}`
      )
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setTrends(data.trends)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [selectedAccount])

  useEffect(() => {
    load()
  }, [load])

  const currency = selectedAccount?.currency || 'USD'
  const shiftCounts: Record<CreativeShift, number> = {
    scaling: 0,
    declining: 0,
    newly_launched: 0,
    recently_paused: 0,
    stable: 0,
  }
  for (const t of trends) shiftCounts[t.shift]++
  const activeTrends = trends.filter((t) => t.shift === activeTab)
  const ranked = [...trends].sort((a, b) => a.thisRank - b.thisRank)
  const visibleRanked = showAll ? ranked : ranked.slice(0, 10)

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <div
        className="flex items-center justify-between px-6 py-3"
        style={{ borderBottom: '1px solid #2d1f50', background: '#130c22' }}
      >
        <div>
          <h1 className="text-base font-semibold" style={{ color: '#f5f3ff' }}>
            Leaderboard
          </h1>
          <p className="text-xs" style={{ color: '#6b7280' }}>
            Track performance shifts and top creatives · {selectedAccount?.name ?? ''}
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

      <main className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
        {/* Performance shifts */}
        <section>
          <p className="text-sm font-semibold mb-3" style={{ color: '#f5f3ff' }}>
            Performance shifts
          </p>
          <div className="flex gap-2 flex-wrap mb-4">
            {SHIFT_TABS.map((tab) => {
              const active = activeTab === tab.key
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className="flex items-center gap-2 text-sm px-3 py-1.5 rounded-full transition-all"
                  style={{
                    background: active ? '#2d1f50' : '#1a1230',
                    border: `1px solid ${active ? tab.color : '#2d1f50'}`,
                    color: active ? '#f5f3ff' : '#9ca3af',
                    cursor: 'pointer',
                  }}
                >
                  <span style={{ color: tab.color }}>{tab.icon}</span>
                  {tab.label}
                  <span
                    className="text-xs px-1.5 rounded-full"
                    style={{ background: '#0d0918', color: '#9ca3af' }}
                  >
                    {shiftCounts[tab.key]}
                  </span>
                </button>
              )
            })}
          </div>

          {loading ? (
            <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))' }}>
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-56 rounded-xl animate-pulse" style={{ background: '#1a1230' }} />
              ))}
            </div>
          ) : activeTrends.length === 0 ? (
            <div
              className="flex flex-col items-center justify-center gap-2 rounded-xl py-16"
              style={{ background: '#1a1230', border: '1px solid #2d1f50' }}
            >
              <p className="text-sm font-medium" style={{ color: '#f5f3ff' }}>
                No creatives have {activeTab.replace('_', ' ')} this week
              </p>
              <p className="text-xs" style={{ color: '#6b7280' }}>
                Ads that pass your spend threshold will appear here
              </p>
            </div>
          ) : (
            <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))' }}>
              {activeTrends.map((t) => (
                <ShiftCard key={t.id} trend={t} currency={currency} />
              ))}
            </div>
          )}
        </section>

        {/* Creative leaderboard */}
        <section>
          <p className="text-sm font-semibold mb-3" style={{ color: '#f5f3ff' }}>
            Creative leaderboard
          </p>
          <div className="rounded-xl overflow-hidden" style={{ border: '1px solid #2d1f50' }}>
            <table className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#130c22', borderBottom: '1px solid #2d1f50' }}>
                  {['Rank', 'Creative', 'Wks on board', 'Spend', 'ROAS', 'Trend'].map((h) => (
                    <th key={h} className="text-left px-4 py-2.5 text-xs font-medium" style={{ color: '#6b7280' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visibleRanked.map((t) => (
                  <tr key={t.id} style={{ borderBottom: '1px solid #1f1540', background: '#1a1230' }}>
                    <td className="px-4 py-3" style={{ color: '#f5f3ff' }}>
                      {t.thisRank}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="relative shrink-0 rounded-md overflow-hidden" style={{ width: '40px', height: '40px', background: '#0d0918' }}>
                          {t.thumbnailUrl && (
                            <Image src={t.thumbnailUrl} alt={t.name} fill className="object-cover" unoptimized />
                          )}
                        </div>
                        <span className="truncate" style={{ color: '#f5f3ff', maxWidth: '260px' }}>
                          {t.name}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3" style={{ color: '#9ca3af' }}>
                      {t.weeksOnBoard >= 6 ? '6+' : t.weeksOnBoard} weeks
                    </td>
                    <td className="px-4 py-3">
                      <span style={{ color: '#f5f3ff' }}>{fmtCurrency(t.thisSpend, currency)}</span>
                      {t.spendChangePct !== null && (
                        <span className="text-xs ml-1" style={{ color: t.spendChangePct >= 0 ? '#22c55e' : '#ef4444' }}>
                          {pctLabel(t.spendChangePct)}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span style={{ color: '#f5f3ff' }}>{t.thisRoas > 0 ? t.thisRoas.toFixed(2) + 'x' : '—'}</span>
                      {t.roasChangePct !== null && (
                        <span className="text-xs ml-1" style={{ color: t.roasChangePct >= 0 ? '#22c55e' : '#ef4444' }}>
                          {pctLabel(t.roasChangePct)}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <RankChange change={t.rankChange} />
                    </td>
                  </tr>
                ))}
                {visibleRanked.length === 0 && !loading && (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-sm" style={{ color: '#6b7280' }}>
                      No creative data for this period
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {!showAll && ranked.length > 10 && (
            <button
              onClick={() => setShowAll(true)}
              className="mt-3 text-xs font-medium px-3 py-1.5 rounded-lg"
              style={{ background: '#1a1230', color: '#9ca3af', border: '1px solid #2d1f50', cursor: 'pointer' }}
            >
              Show more
            </button>
          )}
        </section>
      </main>
    </div>
  )
}
