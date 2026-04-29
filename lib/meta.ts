const API_VERSION = process.env.META_API_VERSION || 'v21.0'
const BASE_URL = `https://graph.facebook.com/${API_VERSION}`

export interface AdAccount {
  id: string
  name: string
  currency: string
  account_status: number
}

export interface Creative {
  id: string
  name: string
  thumbnailUrl: string | null
  imageUrl: string | null
  isVideo: boolean
  adCount: number
  spend: number
  impressions: number
  roas: number
  cpc: number
  cpm: number
  // Ad copy
  headline: string | null
  primaryText: string | null
  cta: string | null
  description: string | null
  // Scores (0–100)
  hookScore: number | null
  holdScore: number | null
  clickScore: number
  buyScore: number | null
  // Raw rates (actual %)
  hookRate: number | null
  holdRate: number | null
  ctr: number
  cvr: number | null
  // Video retention curve [hook, p25, p50, p75, p95] as % of impressions
  videoRetention: number[] | null
}

export async function fetchAdAccounts(token: string): Promise<AdAccount[]> {
  const res = await fetch(
    `${BASE_URL}/me/adaccounts?fields=name,id,account_status,currency&limit=50&access_token=${token}`
  )
  const data = await res.json()
  if (data.error) throw new Error(data.error.message)
  return (data.data || []).filter((a: AdAccount) => a.account_status === 1)
}

export async function fetchCreatives(
  token: string,
  accountId: string,
  datePreset: string,
  minSpend: number,
  format: 'all' | 'video' | 'static'
): Promise<Creative[]> {
  const [adsRes, insightsRes] = await Promise.all([
    fetch(
      `${BASE_URL}/${accountId}/ads?` +
        `fields=id,name,creative{id,thumbnail_url,image_url,video_id,body,title,call_to_action_type}&` +
        `filtering=[{"field":"effective_status","operator":"IN","value":["ACTIVE","PAUSED","ARCHIVED"]}]&` +
        `limit=500&access_token=${token}`
    ),
    fetch(
      `${BASE_URL}/${accountId}/insights?` +
        `level=ad&` +
        `fields=ad_id,ad_name,spend,impressions,clicks,cpc,cpm,purchase_roas,actions,` +
        `video_p25_watched_actions,video_p50_watched_actions,video_p75_watched_actions,` +
        `video_p95_watched_actions,video_thruplay_watched_actions&` +
        `date_preset=${datePreset}&` +
        `filtering=[{"field":"spend","operator":"GREATER_THAN","value":"${Math.max(0, minSpend - 1)}"}]&` +
        `sort=["spend_descending"]&` +
        `limit=500&access_token=${token}`
    ),
  ])

  const [adsData, insightsData] = await Promise.all([adsRes.json(), insightsRes.json()])

  if (adsData.error) throw new Error(adsData.error.message)
  if (insightsData.error) throw new Error(insightsData.error.message)

  const adsMap = new Map<string, any>()
  for (const ad of adsData.data || []) adsMap.set(ad.id, ad)

  const creatives: Creative[] = []

  for (const insight of insightsData.data || []) {
    const spend = parseFloat(insight.spend || '0')
    if (spend < minSpend) continue

    const ad = adsMap.get(insight.ad_id)
    const creative = ad?.creative
    const isVideo = !!(creative?.video_id)

    if (format === 'video' && !isVideo) continue
    if (format === 'static' && isVideo) continue

    const impressions = parseInt(insight.impressions || '0')
    const linkClicks = getActionValue(insight.actions, 'link_click')
    const purchases = getActionValue(insight.actions, 'purchase')
    const video3s = getActionValue(insight.actions, 'video_view')
    const videoP25 = getActionValue(insight.video_p25_watched_actions, 'video_view')
    const videoP50 = getActionValue(insight.video_p50_watched_actions, 'video_view')
    const videoP75 = getActionValue(insight.video_p75_watched_actions, 'video_view')
    const videoP95 = getActionValue(insight.video_p95_watched_actions, 'video_view')
    const videoThruplay = getActionValue(insight.video_thruplay_watched_actions, 'video_view')

    const roas =
      insight.purchase_roas?.[0]?.value ? parseFloat(insight.purchase_roas[0].value) : 0

    const hookRate = impressions > 0 ? (video3s / impressions) * 100 : null
    const holdRate = impressions > 0 ? (videoThruplay / impressions) * 100 : null
    const ctr = impressions > 0 ? (linkClicks / impressions) * 100 : 0
    const cvr = linkClicks > 0 && purchases > 0 ? (purchases / linkClicks) * 100 : null

    const videoRetention =
      isVideo && impressions > 0
        ? [
            pct(video3s, impressions),
            pct(videoP25, impressions),
            pct(videoP50, impressions),
            pct(videoP75, impressions),
            pct(videoP95, impressions),
          ]
        : null

    // Normalise CTA label
    const ctaRaw = creative?.call_to_action_type as string | undefined
    const ctaLabel = ctaRaw
      ? ctaRaw.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
      : null

    creatives.push({
      id: insight.ad_id,
      name: insight.ad_name,
      thumbnailUrl: creative?.thumbnail_url || creative?.image_url || null,
      imageUrl: creative?.image_url || creative?.thumbnail_url || null,
      isVideo,
      adCount: 1,
      spend,
      impressions,
      roas,
      cpc: parseFloat(insight.cpc || '0'),
      cpm: parseFloat(insight.cpm || '0'),
      headline: creative?.title || null,
      primaryText: creative?.body || null,
      cta: ctaLabel,
      description: creative?.link_description || null,
      hookScore: hookRate !== null ? Math.min(100, Math.round(hookRate * 3)) : null,
      holdScore: holdRate !== null ? Math.min(100, Math.round(holdRate * 5)) : null,
      clickScore: Math.min(100, Math.round(ctr * 50)),
      buyScore: cvr !== null ? Math.min(100, Math.round(cvr * 20)) : null,
      hookRate,
      holdRate,
      ctr,
      cvr,
      videoRetention,
    })
  }

  return creatives.sort((a, b) => b.spend - a.spend)
}

function getActionValue(actions: any[] | undefined, type: string): number {
  if (!actions) return 0
  const a = actions.find((x) => x.action_type === type)
  return a ? parseInt(a.value || '0') : 0
}

function pct(value: number, total: number): number {
  if (total === 0) return 0
  return Math.round((value / total) * 1000) / 10
}
