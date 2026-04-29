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
  isVideo: boolean
  adCount: number
  spend: number
  impressions: number
  roas: number
  cpc: number
  cpm: number
  hookScore: number | null
  holdScore: number | null
  clickScore: number
  buyScore: number | null
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
        `fields=id,name,creative{id,thumbnail_url,image_url,video_id}&` +
        `filtering=[{"field":"effective_status","operator":"IN","value":["ACTIVE","PAUSED","ARCHIVED"]}]&` +
        `limit=500&access_token=${token}`
    ),
    fetch(
      `${BASE_URL}/${accountId}/insights?` +
        `level=ad&` +
        `fields=ad_id,ad_name,spend,impressions,clicks,cpc,cpm,purchase_roas,actions,` +
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
    const isVideo = !!(ad?.creative?.video_id)

    if (format === 'video' && !isVideo) continue
    if (format === 'static' && isVideo) continue

    const impressions = parseInt(insight.impressions || '0')
    const linkClicks = getActionValue(insight.actions, 'link_click')
    const purchases = getActionValue(insight.actions, 'purchase')
    const video3s = getActionValue(insight.actions, 'video_view')
    const videoThruplay = getActionValue(insight.video_thruplay_watched_actions, 'video_view')

    const roas =
      insight.purchase_roas?.[0]?.value ? parseFloat(insight.purchase_roas[0].value) : 0

    creatives.push({
      id: insight.ad_id,
      name: insight.ad_name,
      thumbnailUrl: ad?.creative?.thumbnail_url || ad?.creative?.image_url || null,
      isVideo,
      adCount: 1,
      spend,
      impressions,
      roas,
      cpc: parseFloat(insight.cpc || '0'),
      cpm: parseFloat(insight.cpm || '0'),
      hookScore:
        isVideo && impressions > 0
          ? Math.min(100, Math.round((video3s / impressions) * 300))
          : null,
      holdScore:
        isVideo && impressions > 0
          ? Math.min(100, Math.round((videoThruplay / impressions) * 500))
          : null,
      clickScore:
        impressions > 0 ? Math.min(100, Math.round((linkClicks / impressions) * 5000)) : 0,
      buyScore:
        linkClicks > 0 && purchases > 0
          ? Math.min(100, Math.round((purchases / linkClicks) * 2000))
          : null,
    })
  }

  return creatives.sort((a, b) => b.spend - a.spend)
}

function getActionValue(actions: any[] | undefined, type: string): number {
  if (!actions) return 0
  const a = actions.find((x) => x.action_type === type)
  return a ? parseInt(a.value || '0') : 0
}
