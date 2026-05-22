'use client'

import { useState, useRef } from 'react'
import { parseGoogleCSV, type GoogleTotals } from '@/lib/googleCSV'
import { fmt, delta } from '@/lib/metricUtils'
import KPICard from './KPICard'

interface Props {
  onDataChange?: (thisWeek: GoogleTotals | null, lastWeek: GoogleTotals | null) => void
}

type Tab = 'campaign' | 'adgroup' | 'searchterms'

const GOOGLE_METRICS: { key: keyof GoogleTotals; label: string; type: any; higherIsBetter: boolean | null }[] = [
  { key: 'cost', label: 'Spend', type: 'currency', higherIsBetter: null },
  { key: 'impressions', label: 'Impressions', type: 'number', higherIsBetter: true },
  { key: 'clicks', label: 'Clicks', type: 'number', higherIsBetter: true },
  { key: 'ctr', label: 'CTR', type: 'percent', higherIsBetter: true },
  { key: 'avgCpc', label: 'Avg. CPC', type: 'currency', higherIsBetter: false },
  { key: 'conversions', label: 'Conversions', type: 'number', higherIsBetter: true },
  { key: 'convRate', label: 'Conv. Rate', type: 'percent', higherIsBetter: true },
  { key: 'costPerConv', label: 'Cost/Conv.', type: 'currency', higherIsBetter: false },
  { key: 'convValue', label: 'Conv. Value', type: 'currency', higherIsBetter: true },
  { key: 'roas', label: 'ROAS', type: 'roas', higherIsBetter: true },
  { key: 'impressionShare', label: 'Impr. Share', type: 'percent', higherIsBetter: true },
]

function FileDropZone({
  label,
  file,
  onFile,
}: {
  label: string
  file: File | null
  onFile: (f: File) => void
}) {
  const ref = useRef<HTMLInputElement>(null)
  return (
    <div
      onClick={() => ref.current?.click()}
      style={{
        border: `1.5px dashed ${file ? '#7c3aed' : '#2d1f50'}`,
        borderRadius: '10px',
        padding: '18px',
        textAlign: 'center',
        cursor: 'pointer',
        background: file ? 'rgba(124,58,237,0.06)' : '#1a1230',
        flex: 1,
        minWidth: 0,
      }}
    >
      <input
        ref={ref}
        type="file"
        accept=".csv"
        style={{ display: 'none' }}
        onChange={(e) => { if (e.target.files?.[0]) onFile(e.target.files[0]) }}
      />
      <p style={{ color: file ? '#a78bfa' : '#6b7280', fontSize: '12px', fontWeight: 500 }}>
        {file ? `✓ ${file.name}` : label}
      </p>
      <p style={{ color: '#4b5563', fontSize: '10px', marginTop: '2px' }}>
        {file ? 'Click to replace' : 'Click to upload CSV'}
      </p>
    </div>
  )
}

export default function GooglePerformance({ onDataChange }: Props) {
  const [tab, setTab] = useState<Tab>('campaign')
  const [thisFile, setThisFile] = useState<File | null>(null)
  const [lastFile, setLastFile] = useState<File | null>(null)
  const [thisData, setThisData] = useState<GoogleTotals | null>(null)
  const [lastData, setLastData] = useState<GoogleTotals | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function process(file: File, isThisWeek: boolean) {
    setError(null)
    try {
      const text = await file.text()
      const parsed = parseGoogleCSV(text)
      if (isThisWeek) {
        setThisData(parsed)
        onDataChange?.(parsed, lastData)
      } else {
        setLastData(parsed)
        onDataChange?.(thisData, parsed)
      }
    } catch (e: any) {
      setError(e.message)
    }
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: 'campaign', label: 'Campaign' },
    { id: 'adgroup', label: 'Ad Group' },
    { id: 'searchterms', label: 'Search Terms' },
  ]

  return (
    <section>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <h2 style={{ color: '#f5f3ff', fontSize: '15px', fontWeight: 600 }}>Google Ads</h2>
        <div style={{ display: 'flex', gap: '4px', background: '#1a1230', padding: '3px', borderRadius: '8px', border: '1px solid #2d1f50' }}>
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                padding: '4px 10px', borderRadius: '6px', fontSize: '11px', border: 'none', cursor: 'pointer', fontWeight: 500,
                background: tab === t.id ? '#7c3aed' : 'transparent',
                color: tab === t.id ? '#fff' : '#6b7280',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
        <FileDropZone
          label="This Week CSV"
          file={thisFile}
          onFile={(f) => { setThisFile(f); process(f, true) }}
        />
        <FileDropZone
          label="Last Week CSV"
          file={lastFile}
          onFile={(f) => { setLastFile(f); process(f, false) }}
        />
      </div>

      {error && (
        <div style={{ background: '#1a0a0a', border: '1px solid #7f1d1d', borderRadius: '8px', padding: '10px 14px', marginBottom: '16px', color: '#f87171', fontSize: '12px' }}>
          {error}
        </div>
      )}

      {!thisData && !lastData && (
        <div style={{ textAlign: 'center', padding: '32px', color: '#4b5563', fontSize: '12px' }}>
          Upload this week's and last week's {tab} CSV exports from Google Ads
        </div>
      )}

      {thisData && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '10px', marginBottom: '16px' }}>
          {GOOGLE_METRICS.filter(({ key }) => {
            if (key === 'convValue' || key === 'roas') return !!thisData.convValue
            if (key === 'impressionShare') return thisData.impressionShare !== null
            return true
          }).map(({ key, label, type, higherIsBetter }) => (
            <KPICard
              key={key}
              label={label}
              value={fmt(thisData[key] as number | null, type)}
              delta={lastData ? delta(thisData[key] as number | null, lastData[key] as number | null) : null}
              higherIsBetter={higherIsBetter}
            />
          ))}
        </div>
      )}

      {thisData && thisData.rows.length > 0 && tab !== 'searchterms' && (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #2d1f50' }}>
                {[tab === 'campaign' ? 'Campaign' : 'Ad Group', 'Spend', 'Impressions', 'CTR', 'Conversions', 'Cost/Conv', ...(thisData.roas ? ['ROAS'] : [])].map((h) => (
                  <th key={h} style={{ textAlign: 'left', padding: '6px 8px', color: '#6b7280', fontWeight: 500 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {thisData.rows.slice(0, 15).map((row, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #1f1540' }}>
                  <td style={{ padding: '7px 8px', color: '#e5e7eb', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {tab === 'campaign' ? row.campaign : row.adGroup || row.campaign}
                  </td>
                  <td style={{ padding: '7px 8px', color: '#9ca3af' }}>{fmt(row.cost, 'currency')}</td>
                  <td style={{ padding: '7px 8px', color: '#9ca3af' }}>{fmt(row.impressions, 'number')}</td>
                  <td style={{ padding: '7px 8px', color: '#9ca3af' }}>{fmt(row.ctr, 'percent')}</td>
                  <td style={{ padding: '7px 8px', color: '#9ca3af' }}>{fmt(row.conversions, 'number')}</td>
                  <td style={{ padding: '7px 8px', color: '#9ca3af' }}>{fmt(row.costPerConv, 'currency')}</td>
                  {thisData.roas && <td style={{ padding: '7px 8px', color: '#9ca3af' }}>{fmt(row.roas, 'roas')}</td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {thisData && tab === 'searchterms' && thisData.rows.length > 0 && (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #2d1f50' }}>
                {['Search Term', 'Campaign', 'Impressions', 'Clicks', 'CTR', 'Conversions', 'Cost/Conv'].map((h) => (
                  <th key={h} style={{ textAlign: 'left', padding: '6px 8px', color: '#6b7280', fontWeight: 500 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {thisData.rows.sort((a, b) => b.conversions - a.conversions).slice(0, 20).map((row, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #1f1540' }}>
                  <td style={{ padding: '7px 8px', color: '#e5e7eb', maxWidth: '220px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.searchTerm}</td>
                  <td style={{ padding: '7px 8px', color: '#6b7280', maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.campaign}</td>
                  <td style={{ padding: '7px 8px', color: '#9ca3af' }}>{fmt(row.impressions, 'number')}</td>
                  <td style={{ padding: '7px 8px', color: '#9ca3af' }}>{fmt(row.clicks, 'number')}</td>
                  <td style={{ padding: '7px 8px', color: '#9ca3af' }}>{fmt(row.ctr, 'percent')}</td>
                  <td style={{ padding: '7px 8px', color: '#9ca3af' }}>{fmt(row.conversions, 'number')}</td>
                  <td style={{ padding: '7px 8px', color: '#9ca3af' }}>{fmt(row.costPerConv, 'currency')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
