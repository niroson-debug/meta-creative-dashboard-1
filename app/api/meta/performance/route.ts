import { emptyMetrics, type MetricsSnapshot } from '@/lib/metricUtils'

const API_VERSION = process.env.META_API_VERSION || 'v21.0'
const BASE = `https://graph.facebook.com/${API_VERSION}`

const FIELDS = [
  'spend',
  'impressions',
  'cpm',
  'inline_link_click_ctr',
  'actions',
  'action_values',
  'cost_per_action_type',
].join(',')

function getAction(actions: any[] | undefined, type: string): number {
  if (!actions) return 0
  const a = actions.find((x: any) => x.action_type === type)
  return a ? parseFloat(a.value || '0') : 0
}

function parseInsights(data: any[]): MetricsSnapshot {
  if (!data || data.length === 0) return emptyMetrics()
  const d = data[0]

  const spend = parseFloat(d.spend || '0')
  const impressions = parseInt(d.impressions || '0')
  const cpm = parseFloat(d.cpm || '0')
  const ctr = parseFloat(d.inline_link_click_ctr || '0')

  const lpv =
    getAction(d.actions, 'landing_page_view') ||
    getAction(d.actions, 'offsite_conversion.fb_pixel_page_view')
  const atc =
    getAction(d.actions, 'add_to_cart') ||
    getAction(d.actions, 'offsite_conversion.fb_pixel_add_to_cart')
  const checkout =
    getAction(d.actions, 'initiate_checkout') ||
    getAction(d.actions, 'offsite_conversion.fb_pixel_initiate_checkout')
  const purchases =
    getAction(d.actions, 'purchase') ||
    getAction(d.actions, 'offsite_conversion.fb_pixel_purchase')
  const leads =
    getAction(d.actions, 'lead') ||
    getAction(d.actions, 'offsite_conversion.lead')

  const purchaseValue =
    getAction(d.action_values, 'purchase') ||
    getAction(d.action_values, 'offsite_conversion.fb_pixel_purchase')

  const costPerPurchase = purchases > 0 ? spend / purchases : null
  const cpl = leads > 0 ? spend / leads : null
  const roas = spend > 0 && purchaseValue > 0 ? purchaseValue / spend : null
  const aov = purchases > 0 && purchaseValue > 0 ? purchaseValue / purchases : null

  return {
    spend, impressions, cpm, ctr, lpv, atc, checkout,
    purchases, costPerPurchase, purchaseValue, roas, aov, leads, cpl,
  }
}

async function fetchInsights(accountId: string, token: string, since: string, until: string) {
  const params = new URLSearchParams({
    level: 'account',
    fields: FIELDS,
    time_range: JSON.stringify({ since, until }),
    access_token: token,
  })
  const res = await fetch(`${BASE}/${accountId}/insights?${params}`)
  const data = await res.json()
  if (data.error) throw new Error(data.error.message)
  return data.data || []
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const accountId = searchParams.get('accountId')
  const since1 = searchParams.get('since1')
  const until1 = searchParams.get('until1')
  const since2 = searchParams.get('since2')
  const until2 = searchParams.get('until2')

  const token = process.env.META_ACCESS_TOKEN
  if (!token) return Response.json({ error: 'META_ACCESS_TOKEN not configured' }, { status: 500 })
  if (!accountId || !since1 || !until1 || !since2 || !until2)
    return Response.json({ error: 'Missing required params' }, { status: 400 })

  try {
    const [thisWeekData, lastWeekData] = await Promise.all([
      fetchInsights(accountId, token, since1, until1),
      fetchInsights(accountId, token, since2, until2),
    ])
    return Response.json({
      thisWeek: parseInsights(thisWeekData),
      lastWeek: parseInsights(lastWeekData),
    })
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 400 })
  }
}
