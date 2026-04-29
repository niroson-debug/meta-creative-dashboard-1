'use client'

interface Props {
  datePreset: string
  setDatePreset: (v: string) => void
  format: string
  setFormat: (v: string) => void
  minSpend: number
  setMinSpend: (v: number) => void
  onSync: () => void
  isSyncing: boolean
  lastSync: Date | null
}

const DATE_OPTIONS = [
  { value: 'last_7d', label: 'Last 7 days' },
  { value: 'last_14d', label: 'Last 14 days' },
  { value: 'last_30d', label: 'Last 30 days' },
  { value: 'last_90d', label: 'Last 90 days' },
]

const FORMAT_OPTIONS = [
  { value: 'all', label: 'All formats' },
  { value: 'video', label: 'Video' },
  { value: 'static', label: 'Static' },
]

const SPEND_OPTIONS = [
  { value: 0, label: 'All spend' },
  { value: 100, label: '$100+' },
  { value: 500, label: '$500+' },
  { value: 1000, label: '$1,000+' },
  { value: 5000, label: '$5,000+' },
]

const selectStyle = {
  background: '#1a1230',
  border: '1px solid #2d1f50',
  color: '#f5f3ff',
  borderRadius: '8px',
  padding: '6px 10px',
  fontSize: '13px',
  cursor: 'pointer',
  outline: 'none',
}

export default function FiltersBar({
  datePreset,
  setDatePreset,
  format,
  setFormat,
  minSpend,
  setMinSpend,
  onSync,
  isSyncing,
  lastSync,
}: Props) {
  return (
    <div
      className="flex items-center gap-3 flex-wrap"
      style={{
        padding: '12px 24px',
        borderBottom: '1px solid #2d1f50',
        background: '#130c22',
      }}
    >
      {/* Sync button */}
      <button
        onClick={onSync}
        disabled={isSyncing}
        className="flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg transition-all"
        style={{
          background: isSyncing ? '#2d1f50' : '#7c3aed',
          color: '#f5f3ff',
          border: 'none',
          cursor: isSyncing ? 'not-allowed' : 'pointer',
          opacity: isSyncing ? 0.7 : 1,
        }}
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className={isSyncing ? 'animate-spin' : ''}
        >
          <path d="M23 4v6h-6M1 20v-6h6" />
          <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
        </svg>
        {isSyncing ? 'Syncing…' : 'Sync'}
      </button>

      {/* Date filter */}
      <select
        value={datePreset}
        onChange={(e) => setDatePreset(e.target.value)}
        style={selectStyle}
      >
        {DATE_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>

      {/* Format filter */}
      <select
        value={format}
        onChange={(e) => setFormat(e.target.value)}
        style={selectStyle}
      >
        {FORMAT_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>

      {/* Min spend filter */}
      <select
        value={minSpend}
        onChange={(e) => setMinSpend(Number(e.target.value))}
        style={selectStyle}
      >
        {SPEND_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            Spend {o.label}
          </option>
        ))}
      </select>

      {/* Last sync time */}
      {lastSync && (
        <span className="text-xs ml-auto" style={{ color: '#6b7280' }}>
          Last synced {lastSync.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      )}
    </div>
  )
}
