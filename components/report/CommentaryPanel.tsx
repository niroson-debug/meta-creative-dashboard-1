'use client'

import { useState } from 'react'
import type { MetricsSnapshot } from '@/lib/metricUtils'
import type { GoogleTotals } from '@/lib/googleCSV'
import type { Creative } from '@/lib/meta'

interface Props {
  metaThis: MetricsSnapshot
  metaPrev: MetricsSnapshot
  googleThis: GoogleTotals | null
  googlePrev: GoogleTotals | null
  topCreatives: Creative[]
}

function renderCommentary(text: string) {
  const lines = text.split('\n')
  return lines.map((line, i) => {
    const trimmed = line.trim()
    if (!trimmed) return <div key={i} style={{ height: '8px' }} />

    // Section headers **text**
    if (trimmed.startsWith('**') && trimmed.endsWith('**')) {
      return (
        <p key={i} style={{ color: '#a78bfa', fontSize: '13px', fontWeight: 600, marginTop: '12px', marginBottom: '4px' }}>
          {trimmed.replace(/\*\*/g, '')}
        </p>
      )
    }

    // Bullet points
    const bullet = trimmed.startsWith('- ') || trimmed.startsWith('• ')
    const content = bullet ? trimmed.slice(2) : trimmed

    // Colorise flag emojis
    let borderColor = '#2d1f50'
    if (content.includes('🟢')) borderColor = 'rgba(34,197,94,0.3)'
    else if (content.includes('🔴')) borderColor = 'rgba(239,68,68,0.3)'
    else if (content.includes('🟡')) borderColor = 'rgba(245,158,11,0.3)'

    return (
      <div
        key={i}
        style={{
          display: 'flex',
          gap: '8px',
          padding: '7px 10px',
          borderRadius: '7px',
          border: `1px solid ${borderColor}`,
          background: borderColor !== '#2d1f50' ? borderColor.replace('0.3', '0.04') : 'transparent',
          marginBottom: '4px',
        }}
      >
        {bullet && <span style={{ color: '#4b5563', marginTop: '1px' }}>·</span>}
        <p style={{ color: '#d1d5db', fontSize: '12px', lineHeight: '1.6', margin: 0 }}>{content}</p>
      </div>
    )
  })
}

export default function CommentaryPanel({ metaThis, metaPrev, googleThis, googlePrev, topCreatives }: Props) {
  const [commentary, setCommentary] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function generate() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/commentary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          metaThis,
          metaPrev,
          googleThis,
          googlePrev,
          topCreatives: topCreatives.slice(0, 5).map((c) => ({
            name: c.name,
            spend: c.spend,
            roas: c.roas,
            ctr: c.ctr,
          })),
        }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setCommentary(data.commentary)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <section>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div>
          <h2 style={{ color: '#f5f3ff', fontSize: '15px', fontWeight: 600 }}>Strategic Commentary</h2>
          <p style={{ color: '#6b7280', fontSize: '11px', marginTop: '2px' }}>AI-generated strategist analysis · edit before sending to client</p>
        </div>
        <button
          onClick={generate}
          disabled={loading}
          style={{
            padding: '8px 16px',
            borderRadius: '8px',
            background: loading ? '#2d1f50' : '#7c3aed',
            color: loading ? '#6b7280' : '#fff',
            border: 'none',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontSize: '12px',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          {loading ? (
            <>
              <span style={{ display: 'inline-block', width: '10px', height: '10px', border: '2px solid #6b7280', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
              Analysing...
            </>
          ) : (
            <>✦ Generate Commentary</>
          )}
        </button>
      </div>

      {error && (
        <div style={{ background: '#1a0a0a', border: '1px solid #7f1d1d', borderRadius: '8px', padding: '10px 14px', marginBottom: '12px', color: '#f87171', fontSize: '12px' }}>
          {error}
        </div>
      )}

      {commentary ? (
        <div style={{ background: '#1a1230', border: '1px solid #2d1f50', borderRadius: '12px', padding: '20px' }}>
          {renderCommentary(commentary)}
        </div>
      ) : !loading && (
        <div style={{ background: '#1a1230', border: '1px dashed #2d1f50', borderRadius: '12px', padding: '32px', textAlign: 'center' }}>
          <p style={{ color: '#4b5563', fontSize: '12px' }}>
            Click "Generate Commentary" to get a strategic analysis of this week's performance.
          </p>
          <p style={{ color: '#374151', fontSize: '11px', marginTop: '6px' }}>
            Flags red issues 🔴, wins 🟢, and gives concrete recommendations
          </p>
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
      `}</style>
    </section>
  )
}
