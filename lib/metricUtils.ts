export function fmt(value: number | null | undefined, type: 'currency' | 'number' | 'percent' | 'decimal' | 'roas'): string {
  if (value === null || value === undefined) return '—'
  switch (type) {
    case 'currency':
      return value >= 1000
        ? `$${(value / 1000).toFixed(1)}k`
        : `$${value.toFixed(2)}`
    case 'number':
      return value >= 1_000_000
        ? `${(value / 1_000_000).toFixed(1)}M`
        : value >= 1000
        ? `${(value / 1000).toFixed(1)}k`
        : value.toFixed(0)
    case 'percent':
      return `${value.toFixed(2)}%`
    case 'decimal':
      return value.toFixed(2)
    case 'roas':
      return `${value.toFixed(2)}x`
  }
}

export function delta(current: number | null | undefined, previous: number | null | undefined): number | null {
  if (!current || !previous || previous === 0) return null
  return ((current - previous) / previous) * 100
}

export function deltaColor(pct: number | null, higherIsBetter: boolean | null): string {
  if (pct === null) return '#6b7280'
  if (higherIsBetter === null) return '#6b7280'
  const good = higherIsBetter ? pct > 0 : pct < 0
  return good ? '#22c55e' : '#ef4444'
}

export function deltaLabel(pct: number | null): string {
  if (pct === null) return ''
  const sign = pct > 0 ? '+' : ''
  return `${sign}${pct.toFixed(1)}%`
}

export interface MetricsSnapshot {
  spend: number
  impressions: number
  cpm: number
  ctr: number
  lpv: number
  atc: number
  checkout: number
  purchases: number
  costPerPurchase: number | null
  purchaseValue: number
  roas: number | null
  aov: number | null
  leads: number
  cpl: number | null
}

export function emptyMetrics(): MetricsSnapshot {
  return {
    spend: 0, impressions: 0, cpm: 0, ctr: 0, lpv: 0,
    atc: 0, checkout: 0, purchases: 0, costPerPurchase: null,
    purchaseValue: 0, roas: null, aov: null, leads: 0, cpl: null,
  }
}
