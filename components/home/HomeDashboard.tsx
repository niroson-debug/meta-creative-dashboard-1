'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import type { Creative, CreativeTrend } from '@/lib/meta'
import type { MetricsSnapshot } from '@/lib/metricUtils'
import { emptyMetrics, fmt, delta, deltaLabel } from '@/lib/metricUtils'
import { useAccounts } from '@/lib/AccountContext'
import { periodVsPriorPeriod } from '@/lib/dateRanges'
import BriefPanel from '../BriefPanel'
import CreativeModal from '../CreativeModal'

function KPICard({
  label,
  value,
  deltaPct,
  higherIsBetter,
}: {
  label: string
  value: string
  deltaPct: number | null
  higherIsBetter: boolean | null
}) {
  const good = deltaPct === null || higherIsBetter === null ? null : higherIsBetter ? deltaPct > 0 : deltaPct < 0
  const deltaColor = deltaPct === null ? '#6b7280' : good ? '#22c55e' : '#ef4444'

  return (
    <div className="rounded-xl p-4 flex-1" style={{ background: '#1a1230', border: '1px solid #2d1f50' }}>
      <p className="text-xs mb-2" style={{ color: '#6b7280' }}>
        {label}
      </p>
      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-semibold" style={{ color: '#f5f3ff' }}>
          {value}
        </span>
        {deltaPct !== null && (
          <span className="text-xs font-medium" style={{ color: deltaColor }}>
            {deltaLabel(deltaPct)}
          </span>
        )}
      </div>
    </div>
  )
}

function ShiftPill({ label, count, color }: { label: string; count: number; color: string }) {
  return (
    <Link
      href="/leaderboard"
      className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all"
      style={{ background: '#0d0918', border: '1px solid #2d1f50', textDecoration: 'none' }}
    >
      <span className="w-2 h-2 rounded-full shrink-0" style={{ background: color }} />
      <span style={{ color: '#9ca3af' }}>{label}</span>
      <span className="ml-auto font-semibold" style={{ color: '#f5f3ff' }}>
        {count}
      </span>
    </Link>
  )
}

export default function HomeDashboard() {
  const { selectedAccount } = useAccounts()
  const [thisWeek, setThisWeek] = useState<MetricsSnapshot>(emptyMetrics())
  const [lastWeek, setLastWeek] = useState<MetricsSnapshot>(emptyMetrics())
  const [trends, setTrends] = useState<CreativeTrend[]>([])
  const [topCreative, setTopCreative] = useState<Creative | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [modalCreative, setModalCreative] = useState<Creative | null>(null)

  const load = useCallback(async () => {
    if (!selectedAccount) return
    setLoading(true)
    setError(null)
    const { thisPeriod, lastPeriod } = periodVsPriorPeriod(7)
    try {
      const [perfRes, trendsRes, creativesRes] = await Promise.all([
        fetch(
          `/api/meta/performance?accountId=${selectedAccount.id}&since1=${thisPeriod.since}&until1=${thisPeriod.until}&since2=${lastPeriod.since}&until2=${lastPeriod.until}`
        ).then((r) => r.json()),
        fetch(
          `/api/meta/trends?accountId=${selectedAccount.id}&since1=${thisPeriod.since}&until1=${thisPeriod.until}&since2=${lastPeriod.since}&until2=${lastPeriod.until}`
        ).then((r) => r.json()),
        fetch(`/api/meta/creatives?accountId=${selectedAccount.id}&datePreset=last_7d&minSpend=0&format=all`).then(
          (r) => r.json()
        ),
      ])

      if (perfRes.error) throw new Error(perfRes.error)
      if (trendsRes.error) throw new Error(trendsRes.error)
      if (creativesRes.error) throw new Error(creativesRes.error)

      setThisWeek(perfRes.thisWeek)
      setLastWeek(perfRes.lastWeek)
      setTrends(trendsRes.trends)
      setTopCreative(creativesRes.creatives[0] || null)
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
  const shiftCounts = {
    scaling: trends.filter((t) => t.shift === 'scaling').length,
    declining: trends.filter((t) => t.shift === 'declining').length,
    newly_launched: trends.filter((t) => t.shift === 'newly_launched').length,
    recently_paused: trends.filter((t) => t.shift === 'recently_paused').length,
  }

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <div
        className="flex items-center justify-between px-6 py-3"
        style={{ borderBottom: '1px solid #2d1f50', background: '#130c22' }}
      >
        <div>
          <h1 className="text-base font-semibold" style={{ color: '#f5f3ff' }}>
            {selectedAccount?.name ?? 'Home'}
          </h1>
          <p className="text-xs" style={{ color: '#6b7280' }}>
            This week at a glance
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
        {/* KPI row */}
        <div className="flex gap-4 flex-wrap">
          <KPICard
            label="Total spend"
            value={fmt(thisWeek.spend, 'currency')}
            deltaPct={delta(thisWeek.spend, lastWeek.spend)}
            higherIsBetter={null}
          />
          <KPICard
            label="ROAS"
            value={fmt(thisWeek.roas, 'roas')}
            deltaPct={delta(thisWeek.roas, lastWeek.roas)}
            higherIsBetter={true}
          />
          <KPICard
            label="Creatives launched"
            value={String(shiftCounts.newly_launched)}
            deltaPct={null}
            higherIsBetter={null}
          />
        </div>

        {/* Performance shifts teaser */}
        <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
          <ShiftPill label="Scaling" count={shiftCounts.scaling} color="#22c55e" />
          <ShiftPill label="Declining" count={shiftCounts.declining} color="#ef4444" />
          <ShiftPill label="Newly launched" count={shiftCounts.newly_launched} color="#a78bfa" />
          <ShiftPill label="Recently paused" count={shiftCounts.recently_paused} color="#6b7280" />
        </div>

        {/* Top spending creative spotlight */}
        <div className="rounded-xl p-5" style={{ background: '#1a1230', border: '1px solid #2d1f50' }}>
          <p className="text-sm font-semibold mb-4" style={{ color: '#f5f3ff' }}>
            This week&apos;s top spending creative
          </p>

          {loading ? (
            <div className="h-40 rounded-lg animate-pulse" style={{ background: '#0d0918' }} />
          ) : !topCreative ? (
            <p className="text-sm" style={{ color: '#6b7280' }}>
              No creatives found for this period.
            </p>
          ) : (
            <div className="flex gap-5 flex-col md:flex-row">
              <div
                className="relative rounded-lg overflow-hidden shrink-0"
                style={{ width: '160px', height: '160px', background: '#0d0918' }}
              >
                {topCreative.thumbnailUrl ? (
                  <Image
                    src={topCreative.thumbnailUrl}
                    alt={topCreative.name}
                    fill
                    className="object-cover cursor-pointer"
                    unoptimized
                    onClick={() => setModalCreative(topCreative)}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <span style={{ color: '#3d2a6a' }}>No preview</span>
                  </div>
                )}
              </div>

              <div className="flex-1 flex flex-col gap-3 min-w-0">
                <div>
                  <p className="text-sm font-medium truncate" style={{ color: '#f5f3ff' }}>
                    {topCreative.name}
                  </p>
                  <p className="text-xs mt-1" style={{ color: '#9ca3af' }}>
                    This ad drove {fmt(topCreative.spend, 'currency')} in spend
                    {topCreative.roas > 0 ? ` with a ROAS of ${topCreative.roas.toFixed(2)}x` : ''}.
                  </p>
                </div>

                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={() => setModalCreative(topCreative)}
                    className="text-xs font-medium px-3 py-1.5 rounded-lg"
                    style={{ background: '#0d0918', color: '#a78bfa', border: '1px solid #2d1f50', cursor: 'pointer' }}
                  >
                    🔍 Analyze this ad
                  </button>
                  <Link
                    href="/trending"
                    className="text-xs font-medium px-3 py-1.5 rounded-lg"
                    style={{
                      background: '#0d0918',
                      color: '#a78bfa',
                      border: '1px solid #2d1f50',
                      textDecoration: 'none',
                    }}
                  >
                    🌐 Similar ads from other brands
                  </Link>
                </div>

                <div className="pt-1" style={{ borderTop: '1px solid #2d1f50' }}>
                  <BriefPanel creative={topCreative} autoLabel="Give me new hook ideas based on this ad" />
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {modalCreative && (
        <CreativeModal
          creative={modalCreative}
          currency={currency}
          accountId={selectedAccount?.id || ''}
          onClose={() => setModalCreative(null)}
        />
      )}
    </div>
  )
}
