'use client'

interface Props {
  label: string
  value: string
  delta: number | null
  higherIsBetter: boolean | null
  size?: 'sm' | 'md'
}

export default function KPICard({ label, value, delta, higherIsBetter, size = 'md' }: Props) {
  let arrowColor = '#6b7280'
  let bgPulse = 'transparent'

  if (delta !== null && delta !== 0) {
    const good = higherIsBetter === null ? null : higherIsBetter ? delta > 0 : delta < 0
    if (good === true) { arrowColor = '#22c55e'; bgPulse = 'rgba(34,197,94,0.06)' }
    else if (good === false) { arrowColor = '#ef4444'; bgPulse = 'rgba(239,68,68,0.06)' }
  }

  const sign = delta !== null && delta > 0 ? '+' : ''
  const arrow = delta !== null ? (delta > 0 ? '▲' : delta < 0 ? '▼' : '—') : null

  return (
    <div
      style={{
        background: '#1a1230',
        border: '1px solid #2d1f50',
        borderRadius: '12px',
        padding: size === 'sm' ? '12px 14px' : '16px',
        backgroundColor: bgPulse !== 'transparent' ? bgPulse : '#1a1230',
      }}
    >
      <p style={{ color: '#6b7280', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>
        {label}
      </p>
      <p style={{ color: '#f5f3ff', fontSize: size === 'sm' ? '18px' : '22px', fontWeight: 700, lineHeight: 1 }}>
        {value}
      </p>
      {delta !== null && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '6px' }}>
          <span style={{ color: arrowColor, fontSize: '11px', fontWeight: 600 }}>
            {arrow} {sign}{Math.abs(delta).toFixed(1)}%
          </span>
          <span style={{ color: '#4b5563', fontSize: '10px' }}>vs prev week</span>
        </div>
      )}
    </div>
  )
}
