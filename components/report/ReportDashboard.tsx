'use client'

import { useState, useEffect } from 'react'
import type { AdAccount } from '@/lib/meta'
import type { MetricsSnapshot } from '@/lib/metricUtils'
import type { GoogleTotals } from '@/lib/googleCSV'
import type { Creative } from '@/lib/meta'
import ReportSidebar from './ReportSidebar'
import MetaPerformance from './MetaPerformance'
import GooglePerformance from './GooglePerformance'
import CreativePerformance from './CreativePerformance'
import CommentaryPanel from './CommentaryPanel'
import { emptyMetrics } from '@/lib/metricUtils'

function SectionCard({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ background: '#130c22', border: '1px solid #2d1f50', borderRadius: '14px', padding: '24px' }}>
      {children}
    </div>
  )
}

export default function ReportDashboard() {
  const [accounts, setAccounts] = useState<AdAccount[]>([])
  const [selectedAccount, setSelectedAccount] = useState<AdAccount | null>(null)
  const [isLoadingAccounts, setIsLoadingAccounts] = useState(true)

  // Accumulated data for commentary
  const [metaThis, setMetaThis] = useState<MetricsSnapshot>(emptyMetrics())
  const [metaPrev, setMetaPrev] = useState<MetricsSnapshot>(emptyMetrics())
  const [googleThis, setGoogleThis] = useState<GoogleTotals | null>(null)
  const [googlePrev, setGooglePrev] = useState<GoogleTotals | null>(null)
  const [creatives, setCreatives] = useState<Creative[]>([])

  useEffect(() => {
    setIsLoadingAccounts(true)
    fetch('/api/meta/accounts')
      .then((r) => r.json())
      .then((data) => {
        if (data.error) return
        setAccounts(data.accounts)
        if (data.accounts.length > 0) setSelectedAccount(data.accounts[0])
      })
      .catch(() => {})
      .finally(() => setIsLoadingAccounts(false))
  }, [])

  function handlePrint() {
    window.print()
  }

  return (
    <div className="flex h-full overflow-hidden">
      <ReportSidebar
        accounts={accounts}
        selectedAccount={selectedAccount}
        onSelectAccount={setSelectedAccount}
        isLoadingAccounts={isLoadingAccounts}
      />

      <div style={{ flex: 1, overflowY: 'auto', background: '#0d0918' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 28px', borderBottom: '1px solid #2d1f50', background: '#130c22', position: 'sticky', top: 0, zIndex: 10 }}>
          <div>
            <h1 style={{ color: '#f5f3ff', fontSize: '15px', fontWeight: 600 }}>
              {selectedAccount?.name ?? 'Performance Report'}
            </h1>
            <p style={{ color: '#6b7280', fontSize: '11px', marginTop: '1px' }}>Weekly · Meta + Google</p>
          </div>
          <button
            onClick={handlePrint}
            style={{ padding: '7px 14px', borderRadius: '8px', background: '#1a1230', border: '1px solid #2d1f50', color: '#9ca3af', fontSize: '11px', cursor: 'pointer', fontWeight: 500 }}
          >
            ⎙ Export / Print
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '1200px' }}>
          <SectionCard>
            <MetaPerformance
              account={selectedAccount}
              onDataChange={(tw, lw) => { setMetaThis(tw); setMetaPrev(lw) }}
            />
          </SectionCard>

          <SectionCard>
            <GooglePerformance
              onDataChange={(tw, lw) => { setGoogleThis(tw); setGooglePrev(lw) }}
            />
          </SectionCard>

          <SectionCard>
            <CreativePerformance
              account={selectedAccount}
              onCreativesChange={(c) => setCreatives(c)}
            />
          </SectionCard>

          <SectionCard>
            <CommentaryPanel
              metaThis={metaThis}
              metaPrev={metaPrev}
              googleThis={googleThis}
              googlePrev={googlePrev}
              topCreatives={creatives}
            />
          </SectionCard>
        </div>
      </div>

      <style>{`
        @media print {
          aside { display: none !important; }
          button { display: none !important; }
          * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `}</style>
    </div>
  )
}
