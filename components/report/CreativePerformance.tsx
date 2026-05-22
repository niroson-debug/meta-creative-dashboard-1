'use client'

import { useState, useEffect, useCallback } from 'react'
import { startOfWeek, endOfWeek, format } from 'date-fns'
import { fmt } from '@/lib/metricUtils'
import type { Creative, AdAccount } from '@/lib/meta'

interface Props {
  account: AdAccount | null
  onCreativesChange?: (creatives: Creative[]) => void
}

export default function CreativePerformance({ account, onCreativesChange }: Props) {
  const [creatives, setCreatives] = useState<Creative[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const thisMonday = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd')
  const thisSunday = format(endOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd')

  const fetchCreatives = useCallback(async () => {
    if (!account) return
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({
        accountId: account.id,
        datePreset: 'this_week_mon_today',
        minSpend: '0',
        format: 'all',
      })
      const res = await fetch(`/api/meta/creatives?${params}`)
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setCreatives(data.creatives.slice(0, 20))
      onCreativesChange?.(data.creatives.slice(0, 20))
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [account])

  useEffect(() => { fetchCreatives() }, [fetchCreatives])

  if (!account) return null

  return (
    <section>
      <div style={{ marginBottom: '16px' }}>
        <h2 style={{ color: '#f5f3ff', fontSize: '15px', fontWeight: 600 }}>Creative Performance</h2>
        <p style={{ color: '#6b7280', fontSize: '11px', marginTop: '2px' }}>
          Meta only · {thisMonday} → {thisSunday} · sorted by spend
        </p>
      </div>

      {error && (
        <div style={{ background: '#1a0a0a', border: '1px solid #7f1d1d', borderRadius: '8px', padding: '10px 14px', marginBottom: '12px', color: '#f87171', fontSize: '12px' }}>
          {error}
        </div>
      )}

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #2d1f50' }}>
              {['Creative', 'Ad Name', 'Spend', 'Impressions', 'CPM', 'CTR', 'ROAS / CPL', 'Hook Rate', 'Hold Rate'].map((h) => (
                <th key={h} style={{ textAlign: 'left', padding: '6px 8px', color: '#6b7280', fontWeight: 500, whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading
              ? Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #1f1540' }}>
                    {Array.from({ length: 9 }).map((_, j) => (
                      <td key={j} style={{ padding: '10px 8px' }}>
                        <div style={{ height: '10px', borderRadius: '4px', background: '#1a1230', width: j === 1 ? '120px' : '60px' }} />
                      </td>
                    ))}
                  </tr>
                ))
              : creatives.map((c) => (
                  <tr key={c.id} style={{ borderBottom: '1px solid #1f1540' }}>
                    <td style={{ padding: '8px' }}>
                      {c.thumbnailUrl ? (
                        <img
                          src={c.thumbnailUrl}
                          alt=""
                          style={{ width: '44px', height: '44px', borderRadius: '6px', objectFit: 'cover', display: 'block' }}
                          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                        />
                      ) : (
                        <div style={{ width: '44px', height: '44px', borderRadius: '6px', background: '#2d1f50', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <span style={{ color: '#6b7280', fontSize: '16px' }}>{c.isVideo ? '▶' : '◻'}</span>
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '8px', color: '#e5e7eb', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {c.name}
                    </td>
                    <td style={{ padding: '8px', color: '#9ca3af', whiteSpace: 'nowrap' }}>{fmt(c.spend, 'currency')}</td>
                    <td style={{ padding: '8px', color: '#9ca3af' }}>{fmt(c.impressions, 'number')}</td>
                    <td style={{ padding: '8px', color: '#9ca3af' }}>{fmt(c.cpm, 'currency')}</td>
                    <td style={{ padding: '8px', color: '#9ca3af' }}>{fmt(c.ctr, 'percent')}</td>
                    <td style={{ padding: '8px', color: c.roas >= 2 ? '#22c55e' : c.roas > 0 ? '#f59e0b' : '#9ca3af' }}>
                      {c.roas > 0 ? fmt(c.roas, 'roas') : '—'}
                    </td>
                    <td style={{ padding: '8px', color: '#9ca3af' }}>
                      {c.hookRate !== null ? `${c.hookRate.toFixed(1)}%` : '—'}
                    </td>
                    <td style={{ padding: '8px', color: '#9ca3af' }}>
                      {c.holdRate !== null ? `${c.holdRate.toFixed(1)}%` : '—'}
                    </td>
                  </tr>
                ))}
          </tbody>
        </table>
      </div>

      {!loading && creatives.length === 0 && (
        <div style={{ textAlign: 'center', padding: '24px', color: '#4b5563', fontSize: '12px' }}>
          No creatives found for this period
        </div>
      )}
    </section>
  )
}
