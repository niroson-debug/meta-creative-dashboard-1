'use client'

import { useState } from 'react'
import type { Creative } from '@/lib/meta'

interface Props {
  creative: Creative
  autoLabel?: string
}

interface Brief {
  whyItWorks: string
  hooks: string[]
  headlines: string[]
  briefs: string[]
}

function creativePayload(c: Creative) {
  return {
    name: c.name,
    headline: c.headline,
    primaryText: c.primaryText,
    description: c.description,
    cta: c.cta,
    isVideo: c.isVideo,
    spend: c.spend,
    roas: c.roas,
    ctr: c.ctr,
    hookRate: c.hookRate,
    holdRate: c.holdRate,
  }
}

function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="flex flex-col gap-1.5 list-disc pl-4">
      {items.map((item, i) => (
        <li key={i} className="text-sm" style={{ color: '#f5f3ff' }}>
          {item}
        </li>
      ))}
    </ul>
  )
}

export default function BriefPanel({ creative, autoLabel }: Props) {
  const [brief, setBrief] = useState<Brief | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function generate() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/brief', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ creative: creativePayload(creative) }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setBrief(data.brief)
    } catch (e: any) {
      setError(e.message || 'Failed to generate ideas')
    } finally {
      setLoading(false)
    }
  }

  if (!brief) {
    return (
      <div>
        <button
          onClick={generate}
          disabled={loading}
          className="flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-lg transition-all"
          style={{
            background: '#7c3aed',
            color: '#f5f3ff',
            border: 'none',
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.7 : 1,
          }}
        >
          {loading ? (
            <>
              <span className="w-3.5 h-3.5 rounded-full border-2 border-white border-t-transparent animate-spin inline-block" />
              Generating ideas…
            </>
          ) : (
            <>✨ {autoLabel || 'Give me new hook ideas based on this ad'}</>
          )}
        </button>
        {error && (
          <p className="text-xs mt-2" style={{ color: '#f87171' }}>
            {error}
          </p>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#a78bfa' }}>
          AI Creative Brief
        </p>
        <button
          onClick={generate}
          disabled={loading}
          className="text-xs px-2.5 py-1 rounded-lg"
          style={{ background: '#1a1230', color: '#9ca3af', border: '1px solid #2d1f50', cursor: 'pointer' }}
        >
          {loading ? 'Regenerating…' : '↻ Regenerate'}
        </button>
      </div>

      <div className="rounded-lg p-3" style={{ background: '#0d0918', border: '1px solid #2d1f50' }}>
        <p className="text-xs font-semibold mb-1" style={{ color: '#6b7280' }}>
          Why it works
        </p>
        <p className="text-sm" style={{ color: '#f5f3ff', lineHeight: 1.5 }}>
          {brief.whyItWorks}
        </p>
      </div>

      <div>
        <p className="text-xs font-semibold mb-2" style={{ color: '#6b7280' }}>
          Hook Ideas
        </p>
        <BulletList items={brief.hooks} />
      </div>

      <div>
        <p className="text-xs font-semibold mb-2" style={{ color: '#6b7280' }}>
          Headline Ideas
        </p>
        <BulletList items={brief.headlines} />
      </div>

      <div>
        <p className="text-xs font-semibold mb-2" style={{ color: '#6b7280' }}>
          New Variants To Brief
        </p>
        <BulletList items={brief.briefs} />
      </div>

      {error && (
        <p className="text-xs" style={{ color: '#f87171' }}>
          {error}
        </p>
      )}
    </div>
  )
}
