'use client'

import { useState, useEffect, useCallback } from 'react'
import { startOfWeek, endOfWeek, subWeeks, format } from 'date-fns'
import { fmt, delta, emptyMetrics, type MetricsSnapshot } from '@/lib/metricUtils'
import KPICard from './KPICard'
import type { AdAccount } from '@/lib/meta'

interface Props {
  account: AdAccount | null
  onDataChange?: (thisWeek: MetricsSnapshot, lastWeek: MetricsSnapshot) => void
}

type Mode = 'conversion' | 'leadgen' | 'both'

function weekRange(offsetWeeks: number) {
  const ref = subWeeks(new Date(), offsetWeeks)
  return {
    since: format(startOfWeek(ref, { weekStartsOn: 1 }), 'yyyy-MM-dd'),
    until: format(endOfWeek(ref, { weekStartsOn: 1 }), 'yyyy-MM-dd'),
  }
}

const CONVERSION_METRICS: { key: keyof MetricsSnapshot; label: string; type: any; higherIsBetter: boolean | null }[] = [
  { key: 'spend', label: 'Spend', type: 'currency', higherIsBetter: null },
  { key: 'impressions', label: 'Impressions', type: 'number', higherIsBetter: true },
  { key: 'cpm', label: 'CPM', type: 'currency', higherIsBetter: false },
  { key: 'ctr', label: 'CTR', type: 'percent', higherIsBetter: true },
  { key: 'lpv', label: 'Landing Page Views', type: 'number', higherIsBetter: true },
  { key: 'atc', label: 'Add to Cart', type: 'number', higherIsBetter: true },
  { key: 'checkout', label: 'Checkout Initiated', type: 'number', higherIsBetter: true },
  { key: 'purchases', label: 'Purchases', type: 'number', higherIsBetter: true },
  { key: 'costPerPurchase', label: 'Cost/Purchase', type: 'currency', higherIsBetter: false },
  { key: 'purchaseValue', label: 'Purchase Value', type: 'currency', higherIsBetter: true },
  { key: 'roas', label: 'ROAS', type: 'roas', higherIsBetter: true },
  { key: 'aov', label: 'AOV', type: 'currency', higherIsBetter: true },
]

const LEADGEN_METRICS: { key: keyof MetricsSnapshot; label: string; type: any; higherIsBetter: boolean | null }[] = [
  { key: 'spend', label: 'Spend', type: 'currency', higherIsBetter: null },
  { key: 'impressions', label: 'Impressions', type: 'number', higherIsBetter: true },
  { key: 'cpm', label: 'CPM', type: 'currency', higherIsBetter: false },
  { key: 'ctr', label: 'CTR', type: 'percent', higherIsBetter: true },
  { key: 'lpv', label: 'Landing Page Views', type: 'number', higherIsBetter: true },
  { key: 'leads', label: 'Leads', type: 'number', higherIsBetter: true },
  { key: 'cpl', label: 'CPL', type: 'currency', higherIsBetter: false },
]

export default function MetaPerformance({ account, onDataChange }: Props) {
  const [mode, setMode] = useState<Mode>('both')
  const [thisWeek, setThisWeek] = useState<MetricsSnapshot>(emptyMetrics())
  const [lastWeek, setLastWeek] = useState<MetricsSnapshot>(emptyMetrics())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const thisRange = weekRange(0)
  const lastRange = weekRange(1)

  const fetch_ = useCallback(async () => {
    if (!account) return
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({
        accountId: account.id,
        since1: thisRange.since, until1: thisRange.until,
        since2: lastRange.since, until2: lastRange.until,
      })
      const res = await fetch(`/api/meta/performance?${params}`)
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setThisWeek(data.thisWeek)
      setLastWeek(data.lastWeek)
      onDataChange?.(data.thisWeek, data.lastWeek)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [account])

  useEffect(() => { fetch_() }, [fetch_])

  const autoMode: Mode = thisWeek.leads > 0 && thisWeek.purchases === 0 ? 'leadgen' : thisWeek.purchases > 0 ? 'conversion' : 'both'
  const effectiveMode = mode === 'both' ? autoMode : mode
  const metrics = effectiveMode === 'leadgen' ? LEADGEN_METRICS : CONVERSION_METRICS

  return (
    <section>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div>
          <h2 style={{ color: '#f5f3ff', fontSize: '15px', fontWeight: 600 }}>Meta Ads</h2>
          <p style={{ color: '#6b7280', fontSize: '11px', marginTop: '2px' }}>
            {thisRange.since} → {thisRange.until} &nbsp;vs&nbsp; {lastRange.since} → {lastRange.until}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '6px' }}>
          {(['conversion', 'leadgen'] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              style={{
                padding: '5px 12px', borderRadius: '8px', fontSize: '11px', fontWeight: 500, border: 'none', cursor: 'pointer',
                background: (mode === 'both' ? autoMode : mode) === m ? '#7c3aed' : '#1a1230',
                color: (mode === 'both' ? autoMode : mode) === m ? '#fff' : '#6b7280',
              }}
            >
              {m === 'conversion' ? 'Conversion' : 'Lead Gen'}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div style={{ background: '#1a0a0a', border: '1px solid #7f1d1d', borderRadius: '8px', padding: '10px 14px', marginBottom: '16px', color: '#f87171', fontSize: '12px' }}>
          {error}
        </div>
      )}

      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '10px' }}>
          {metrics.map((_, i) => (
            <div key={i} style={{ height: '84px', borderRadius: '12px', background: '#1a1230', border: '1px solid #2d1f50', animation: 'pulse 1.5s ease-in-out infinite' }} />
          ))}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '10px' }}>
          {metrics.map(({ key, label, type, higherIsBetter }) => (
            <KPICard
              key={key}
              label={label}
              value={fmt(thisWeek[key] as number | null, type)}
              delta={delta(thisWeek[key] as number | null, lastWeek[key] as number | null)}
              higherIsBetter={higherIsBetter}
            />
          ))}
        </div>
      )}
    </section>
  )
}
