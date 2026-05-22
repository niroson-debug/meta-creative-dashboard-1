import Papa from 'papaparse'

export interface GoogleRow {
  campaign: string
  adGroup: string
  searchTerm: string
  campaignType: string
  impressions: number
  clicks: number
  ctr: number
  avgCpc: number | null
  cost: number
  conversions: number
  convRate: number | null
  costPerConv: number | null
  convValue: number | null
  roas: number | null
  impressionShare: number | null
  lostISBudget: number | null
}

export interface GoogleTotals {
  impressions: number
  clicks: number
  ctr: number
  avgCpc: number | null
  cost: number
  conversions: number
  convRate: number | null
  costPerConv: number | null
  convValue: number | null
  roas: number | null
  impressionShare: number | null
  rows: GoogleRow[]
}

const COL_ALIASES: Record<keyof GoogleRow, string[]> = {
  campaign: ['campaign', 'campaign name'],
  adGroup: ['ad group', 'ad group name'],
  searchTerm: ['search term', 'search query'],
  campaignType: ['campaign type'],
  impressions: ['impressions'],
  clicks: ['clicks'],
  ctr: ['ctr'],
  avgCpc: ['avg. cpc', 'avg cpc', 'average cpc'],
  cost: ['cost', 'spend', 'cost (usd)'],
  conversions: ['conversions', 'conv.'],
  convRate: ['conv. rate', 'conversion rate'],
  costPerConv: ['cost / conv.', 'cost per conv.', 'cost / conversion', 'cost/conv.'],
  convValue: ['conv. value', 'conversion value', 'all conv. value'],
  roas: ['conv. value / cost', 'roas', 'return on ad spend'],
  impressionShare: ['search impr. share', 'search impression share'],
  lostISBudget: ['search lost is (budget)', 'search lost impression share (budget)'],
}

function cleanNum(val: string | undefined): number | null {
  if (!val || val === '--' || val === '-' || val.trim() === '') return null
  const cleaned = val.replace(/[$,%<>]/g, '').replace(/,/g, '').trim()
  const n = parseFloat(cleaned)
  return isNaN(n) ? null : n
}

function resolveHeaders(headers: string[]): Record<string, number> {
  const map: Record<string, number> = {}
  const normalised = headers.map((h) => h.toLowerCase().trim())
  for (const [field, aliases] of Object.entries(COL_ALIASES)) {
    for (const alias of aliases) {
      const idx = normalised.indexOf(alias)
      if (idx !== -1) {
        map[field] = idx
        break
      }
    }
  }
  return map
}

export function parseGoogleCSV(text: string): GoogleTotals {
  const result = Papa.parse<string[]>(text, { skipEmptyLines: true })
  const allRows = result.data as string[][]

  // Find header row — first row containing 'Impressions' (case-insensitive)
  const headerIdx = allRows.findIndex((row) =>
    row.some((cell) => cell.toLowerCase().trim() === 'impressions')
  )
  if (headerIdx === -1) throw new Error('Could not find header row in CSV')

  const headers = allRows[headerIdx]
  const colMap = resolveHeaders(headers)
  const dataRows = allRows.slice(headerIdx + 1)

  const rows: GoogleRow[] = []
  for (const row of dataRows) {
    const get = (field: keyof GoogleRow) =>
      colMap[field] !== undefined ? row[colMap[field]] : undefined

    const campaign = (get('campaign') ?? '').trim()
    // Skip total / summary rows
    if (!campaign || campaign.toLowerCase().startsWith('total') || campaign.toLowerCase() === 'grand total') continue

    rows.push({
      campaign,
      adGroup: (get('adGroup') ?? '').trim(),
      searchTerm: (get('searchTerm') ?? '').trim(),
      campaignType: (get('campaignType') ?? '').trim(),
      impressions: cleanNum(get('impressions') as string) ?? 0,
      clicks: cleanNum(get('clicks') as string) ?? 0,
      ctr: cleanNum(get('ctr') as string) ?? 0,
      avgCpc: cleanNum(get('avgCpc') as string),
      cost: cleanNum(get('cost') as string) ?? 0,
      conversions: cleanNum(get('conversions') as string) ?? 0,
      convRate: cleanNum(get('convRate') as string),
      costPerConv: cleanNum(get('costPerConv') as string),
      convValue: cleanNum(get('convValue') as string),
      roas: cleanNum(get('roas') as string),
      impressionShare: cleanNum(get('impressionShare') as string),
      lostISBudget: cleanNum(get('lostISBudget') as string),
    })
  }

  if (rows.length === 0) throw new Error('No data rows found in CSV')

  const totalImpressions = rows.reduce((s, r) => s + r.impressions, 0)
  const totalClicks = rows.reduce((s, r) => s + r.clicks, 0)
  const totalCost = rows.reduce((s, r) => s + r.cost, 0)
  const totalConversions = rows.reduce((s, r) => s + r.conversions, 0)
  const totalConvValue = rows.reduce((s, r) => s + (r.convValue ?? 0), 0)

  return {
    impressions: totalImpressions,
    clicks: totalClicks,
    ctr: totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0,
    avgCpc: totalClicks > 0 ? totalCost / totalClicks : null,
    cost: totalCost,
    conversions: totalConversions,
    convRate: totalClicks > 0 ? (totalConversions / totalClicks) * 100 : null,
    costPerConv: totalConversions > 0 ? totalCost / totalConversions : null,
    convValue: totalConvValue > 0 ? totalConvValue : null,
    roas: totalCost > 0 && totalConvValue > 0 ? totalConvValue / totalCost : null,
    impressionShare: rows.find((r) => r.impressionShare !== null)?.impressionShare ?? null,
    rows,
  }
}
