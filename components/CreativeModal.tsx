'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import type { Creative } from '@/lib/meta'
import BriefPanel from './BriefPanel'

interface Props {
  creative: Creative
  currency: string
  accountId: string
  onClose: () => void
}

function fmt(n: number, currency: string) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(n)
}
function fmtD(n: number, currency: string) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency, minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)
}
function pctStr(n: number | null) {
  if (n === null) return '—'
  return n.toFixed(2) + '%'
}

function RetentionChart({ data }: { data: number[] }) {
  // data = [hook, p25, p50, p75, p95] as % of impressions
  const labels = ['Hook (3s)', '25%', '50%', '75%', '95%']
  const max = Math.max(...data, 1)
  const width = 380
  const height = 140
  const padL = 48
  const padR = 12
  const padT = 12
  const padB = 28
  const chartW = width - padL - padR
  const chartH = height - padT - padB

  const points = data.map((v, i) => {
    const x = padL + (i / (data.length - 1)) * chartW
    const y = padT + chartH - (v / max) * chartH
    return [x, y] as [number, number]
  })

  const pathD =
    points
      .map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`)
      .join(' ')

  const fillD = `${pathD} L${points[points.length - 1][0].toFixed(1)},${(padT + chartH).toFixed(1)} L${padL},${(padT + chartH).toFixed(1)} Z`

  return (
    <div>
      <p className="text-xs font-semibold mb-2" style={{ color: '#a78bfa' }}>
        Video Retention Curve
      </p>
      <svg width={width} height={height} style={{ display: 'block' }}>
        {/* Grid lines */}
        {[0, 25, 50, 75, 100].map((pct) => {
          const y = padT + chartH - (pct / 100) * chartH * (max / 100 > 1 ? 100 / max : 1)
          const clampedY = padT + chartH - ((pct / 100) * max / max) * chartH
          return (
            <g key={pct}>
              <line x1={padL} x2={padL + chartW} y1={clampedY} y2={clampedY}
                stroke="#2d1f50" strokeWidth="1" />
              <text x={padL - 4} y={clampedY + 4} textAnchor="end" fontSize="9" fill="#6b7280">
                {pct}%
              </text>
            </g>
          )
        })}

        {/* Fill */}
        <path d={fillD} fill="rgba(124,58,237,0.15)" />

        {/* Line */}
        <path d={pathD} fill="none" stroke="#7c3aed" strokeWidth="2" strokeLinejoin="round" />

        {/* Dots + values */}
        {points.map(([x, y], i) => (
          <g key={i}>
            <circle cx={x} cy={y} r="4" fill="#7c3aed" />
            <text x={x} y={y - 8} textAnchor="middle" fontSize="9" fill="#a78bfa">
              {data[i].toFixed(1)}%
            </text>
            <text x={x} y={padT + chartH + 16} textAnchor="middle" fontSize="9" fill="#6b7280">
              {labels[i]}
            </text>
          </g>
        ))}
      </svg>
    </div>
  )
}

function MetricBox({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-lg p-3" style={{ background: '#0d0918', border: '1px solid #2d1f50' }}>
      <p className="text-xs mb-1" style={{ color: '#6b7280' }}>{label}</p>
      <p className="text-lg font-semibold" style={{ color: '#f5f3ff' }}>{value}</p>
      {sub && <p className="text-xs mt-0.5" style={{ color: '#6b7280' }}>{sub}</p>}
    </div>
  )
}

function CopyBlock({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-semibold mb-1" style={{ color: '#6b7280' }}>{label}</p>
      <p className="text-sm" style={{ color: '#f5f3ff', lineHeight: 1.5 }}>{value}</p>
    </div>
  )
}

export default function CreativeModal({ creative, currency, accountId, onClose }: Props) {
  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  const [videoLoading, setVideoLoading] = useState(false)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  // Fetch real video URL when modal opens for a video creative
  useEffect(() => {
    if (!creative.isVideo || !creative.videoId) return
    setVideoLoading(true)
    fetch(`/api/meta/video?videoId=${creative.videoId}&accountId=${accountId}`)
      .then((r) => r.json())
      .then((d) => { if (d.url) setVideoUrl(d.url) })
      .catch(() => {})
      .finally(() => setVideoLoading(false))
  }, [creative.videoId, creative.isVideo, accountId])

  const openUrl = creative.imageUrl || creative.thumbnailUrl

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-5xl max-h-[90vh] overflow-y-auto rounded-2xl"
        style={{ background: '#130c22', border: '1px solid #2d1f50' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-5" style={{ borderBottom: '1px solid #2d1f50' }}>
          <div className="flex-1 min-w-0 pr-4">
            <p className="text-xs mb-1" style={{ color: '#6b7280' }}>
              {creative.isVideo ? 'Video' : 'Static'} Ad
            </p>
            <h2 className="text-base font-semibold leading-snug" style={{ color: '#f5f3ff' }}>
              {creative.name}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
            style={{ background: '#1a1230', color: '#9ca3af', border: '1px solid #2d1f50' }}
          >
            ✕
          </button>
        </div>

        <div className="flex gap-0" style={{ minHeight: 0 }}>
          {/* Left: image */}
          <div className="w-80 shrink-0 p-5" style={{ borderRight: '1px solid #2d1f50' }}>
            {/* Video player or image */}
            <div className="relative w-full rounded-xl overflow-hidden mb-3"
              style={{ aspectRatio: '9/16', background: '#0d0918', maxHeight: '340px' }}>
              {creative.isVideo ? (
                videoLoading ? (
                  <div className="w-full h-full flex flex-col items-center justify-center gap-2">
                    <div className="w-6 h-6 rounded-full border-2 border-purple-500 border-t-transparent animate-spin" />
                    <span className="text-xs" style={{ color: '#6b7280' }}>Loading video…</span>
                  </div>
                ) : videoUrl ? (
                  <video
                    src={videoUrl}
                    controls
                    autoPlay
                    playsInline
                    className="w-full h-full object-contain"
                    style={{ background: '#000' }}
                  />
                ) : creative.thumbnailUrl ? (
                  // Fallback: thumbnail with play overlay linking to Meta
                  <div className="relative w-full h-full">
                    <Image src={creative.thumbnailUrl} alt={creative.name} fill className="object-cover" unoptimized />
                    <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.4)' }}>
                      <span className="text-xs text-white px-3 py-1 rounded-full" style={{ background: 'rgba(0,0,0,0.6)' }}>
                        Video unavailable via API
                      </span>
                    </div>
                  </div>
                ) : null
              ) : creative.thumbnailUrl ? (
                <Image
                  src={creative.thumbnailUrl}
                  alt={creative.name}
                  fill
                  className="object-contain"
                  unoptimized
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <span style={{ color: '#3d2a6a' }}>No preview</span>
                </div>
              )}
            </div>

            {/* Open original link (for images or video fallback) */}
            {openUrl && !videoUrl && (
              <a
                href={openUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full text-sm font-medium py-2 rounded-lg transition-all mb-1"
                style={{ background: '#7c3aed', color: '#f5f3ff', textDecoration: 'none' }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
                  <polyline points="15 3 21 3 21 9" />
                  <line x1="10" y1="14" x2="21" y2="3" />
                </svg>
                Open original
              </a>
            )}

            {/* Ad copy */}
            {(creative.headline || creative.primaryText || creative.cta || creative.description) && (
              <div className="mt-4 flex flex-col gap-3" style={{ borderTop: '1px solid #2d1f50', paddingTop: '16px' }}>
                <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#6b7280' }}>Ad Copy</p>
                {creative.headline && <CopyBlock label="Headline" value={creative.headline} />}
                {creative.primaryText && <CopyBlock label="Primary Text" value={creative.primaryText} />}
                {creative.description && <CopyBlock label="Description" value={creative.description} />}
                {creative.cta && (
                  <div>
                    <p className="text-xs font-semibold mb-1" style={{ color: '#6b7280' }}>CTA Button</p>
                    <span className="inline-block text-xs font-medium px-2.5 py-1 rounded-lg"
                      style={{ background: '#2d1f50', color: '#a78bfa' }}>
                      {creative.cta}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right: metrics + chart */}
          <div className="flex-1 p-5 flex flex-col gap-5 overflow-y-auto">
            {/* Core metrics grid */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: '#6b7280' }}>
                Performance
              </p>
              <div className="grid grid-cols-2 gap-2">
                <MetricBox label="Spend" value={fmt(creative.spend, currency)} />
                <MetricBox
                  label="ROAS"
                  value={creative.roas > 0 ? creative.roas.toFixed(2) + 'x' : '—'}
                />
                <MetricBox label="CPC" value={fmtD(creative.cpc, currency)} />
                <MetricBox label="CPM" value={fmtD(creative.cpm, currency)} />
              </div>
            </div>

            {/* Engagement rates */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: '#6b7280' }}>
                Engagement Rates
              </p>
              <div className="grid grid-cols-2 gap-2">
                {creative.hookRate !== null && (
                  <MetricBox label="Hook Rate (3s view)" value={pctStr(creative.hookRate)} sub={`Score ${creative.hookScore}`} />
                )}
                {creative.holdRate !== null && (
                  <MetricBox label="Hold Rate (ThruPlay)" value={pctStr(creative.holdRate)} sub={`Score ${creative.holdScore}`} />
                )}
                <MetricBox label="CTR (Link Click)" value={pctStr(creative.ctr)} sub={`Score ${creative.clickScore}`} />
                {creative.cvr !== null && (
                  <MetricBox label="CVR (Purchase)" value={pctStr(creative.cvr)} sub={`Score ${creative.buyScore}`} />
                )}
              </div>
            </div>

            {/* Retention chart */}
            {creative.videoRetention && creative.videoRetention.length > 0 && (
              <div className="rounded-xl p-4" style={{ background: '#1a1230', border: '1px solid #2d1f50' }}>
                <RetentionChart data={creative.videoRetention} />
              </div>
            )}

            {/* AI creative brief */}
            <div className="rounded-xl p-4" style={{ background: '#1a1230', border: '1px solid #2d1f50' }}>
              <BriefPanel creative={creative} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
