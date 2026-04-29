'use client'

import type { Creative } from '@/lib/meta'
import Image from 'next/image'

interface Props {
  creative: Creative
  currency: string
  onClick: () => void
}

function ScoreBar({ label, score }: { label: string; score: number | null }) {
  if (score === null) return null

  const color =
    score >= 71 ? '#22c55e' : score >= 41 ? '#eab308' : '#f97316'

  return (
    <div className="flex items-center gap-2 text-xs">
      <span style={{ color: '#9ca3af' }} className="w-20 shrink-0">
        {label}
      </span>
      <div className="flex-1 rounded-full h-1.5" style={{ background: '#2d1f50' }}>
        <div
          className="h-1.5 rounded-full transition-all"
          style={{ width: `${score}%`, background: color }}
        />
      </div>
      <span style={{ color: '#f5f3ff' }} className="w-6 text-right font-medium">
        {score}
      </span>
    </div>
  )
}

function MetricRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center text-xs">
      <span style={{ color: '#9ca3af' }}>{label}</span>
      <span style={{ color: '#f5f3ff' }} className="font-medium">
        {value}
      </span>
    </div>
  )
}

function fmt(n: number, currency: string) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(n)
}

function fmtDecimals(n: number, currency: string) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n)
}

export default function CreativeCard({ creative, currency, onClick }: Props) {
  const roasColor =
    creative.roas >= 3
      ? '#22c55e'
      : creative.roas >= 2
        ? '#eab308'
        : creative.roas > 0
          ? '#f97316'
          : '#9ca3af'

  return (
    <div
      className="rounded-xl overflow-hidden flex flex-col transition-all duration-200 hover:scale-[1.01] cursor-pointer"
      style={{
        background: '#1a1230',
        border: '1px solid #2d1f50',
      }}
      onClick={onClick}
    >
      {/* Thumbnail */}
      <div className="relative aspect-[4/3] w-full" style={{ background: '#0d0918' }}>
        {creative.thumbnailUrl ? (
          <Image
            src={creative.thumbnailUrl}
            alt={creative.name}
            fill
            className="object-cover"
            unoptimized
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="3" width="18" height="18" rx="2" stroke="#3d2a6a" strokeWidth="1.5" />
              <circle cx="8.5" cy="8.5" r="1.5" stroke="#3d2a6a" strokeWidth="1.5" />
              <path d="M21 15l-5-5L5 21" stroke="#3d2a6a" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </div>
        )}

        {/* Format badge */}
        <div
          className="absolute top-2 left-2 text-xs font-medium px-2 py-0.5 rounded"
          style={{ background: 'rgba(13,9,24,0.75)', color: '#a78bfa' }}
        >
          {creative.isVideo ? 'Video' : 'Static'}
        </div>
      </div>

      {/* Content */}
      <div className="p-3 flex flex-col gap-3 flex-1">
        {/* Name */}
        <p
          className="text-sm font-medium leading-snug line-clamp-2"
          style={{ color: '#f5f3ff' }}
          title={creative.name}
        >
          {creative.name}
        </p>

        {/* Core metrics */}
        <div className="flex flex-col gap-1.5">
          <MetricRow label="Spend" value={fmt(creative.spend, currency)} />
          <div className="flex justify-between items-center text-xs">
            <span style={{ color: '#9ca3af' }}>ROAS</span>
            <span className="font-semibold" style={{ color: roasColor }}>
              {creative.roas > 0 ? creative.roas.toFixed(1) : '—'}
            </span>
          </div>
          <MetricRow label="CPC" value={fmtDecimals(creative.cpc, currency)} />
          <MetricRow label="CPM" value={fmtDecimals(creative.cpm, currency)} />
        </div>

        {/* Divider */}
        <div style={{ borderTop: '1px solid #2d1f50' }} />

        {/* Score bars */}
        <div className="flex flex-col gap-2">
          <ScoreBar label="Hook Score" score={creative.hookScore} />
          <ScoreBar label="Hold Score" score={creative.holdScore} />
          <ScoreBar label="Click Score" score={creative.clickScore} />
          <ScoreBar label="Buy Score" score={creative.buyScore} />
        </div>
      </div>
    </div>
  )
}
