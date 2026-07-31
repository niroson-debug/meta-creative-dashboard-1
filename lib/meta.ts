const API_VERSION = process.env.META_API_VERSION || 'v21.0'
const BASE_URL = `https://graph.facebook.com/${API_VERSION}`

export interface AdAccount {
  id: string
  name: string
  currency: string
  account_status: number
}

export const ALLOWED_ACCOUNTS: { id: string; name: string; currency: string }[] = [
  { id: 'act_991106963107687', name: 'LKA Vancouver Point Grey', currency: 'CAD' },
  { id: 'act_1464313338310796', name: 'LKA Denver Cherry Creek', currency: 'USD' },
  { id: 'act_682621504335748', name: 'LKA Westfield Century City', currency: 'USD' },
  { id: 'act_664310143434393', name: 'LKA Thousand Oaks', currency: 'USD' },
  { id: 'act_831161869972433', name: 'ECO Protein', currency: 'USD' },
  { id: 'act_3321034041406406', name: 'Vet Treat', currency: 'USD' },
  { id: 'act_213270396934462', name: 'Pro Marketer', currency: 'CAD' },
  { id: 'act_605331587065962', name: 'CompositeDeckDirect', currency: 'CAD' },
  { id: 'act_394636369803929', name: 'StonesDirect', currency: 'CAD' },
  { id: 'act_2086776036052924', name: 'VitaRoot Ad Account', currency: 'CAD' },
]

export interface Creative {
  id: string
  name: string
  thumbnailUrl: string | null
  imageUrl: string | null
  videoId: string | null
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
    `${BASE_URL}/me/adaccounts?fields=name,id,account_status,currency&limit=200&access_token=${token}`
  )
  const data = await res.json()
  if (data.error) throw new Error(data.error.message)

  const liveById = new Map<string, any>((data.data || []).map((a: any) => [a.id, a]))

  return ALLOWED_ACCOUNTS.filter((allowed) => {
    const live = liveById.get(allowed.id)
    return live && live.account_status === 1
  }).map((allowed) => ({
    id: allowed.id,
    name: allowed.name,
    currency: allowed.currency,
    account_status: 1,
  }))
}

function chunkArray<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = []
  for (let i = 0; i < items.length; i += size) chunks.push(items.slice(i, i + size))
  return chunks
}

/**
 * Video ads never carry a flat `creative.image_url` — the only thing on the ad
 * object is the tiny cropped `thumbnail_url`. The video's own `picture` field
 * (fetched via the ad account's advideos edge, since direct video-node reads
 * are permission-restricted) is a meaningfully bigger poster frame. Best-effort:
 * some videos (e.g. boosted organic posts) aren't resolvable this way, so a
 * lookup miss just leaves the caller's existing fallback in place.
 */
async function fetchVideoPictures(accountId: string, token: string, videoIds: string[]): Promise<Map<string, string>> {
  const map = new Map<string, string>()
  const chunks = chunkArray([...new Set(videoIds)], 50)

  await Promise.all(
    chunks.map(async (chunk) => {
      if (chunk.length === 0) return
      const params = new URLSearchParams({
        fields: 'id,picture',
        filtering: JSON.stringify([{ field: 'id', operator: 'IN', value: chunk }]),
        limit: String(chunk.length),
        access_token: token,
      })
      const res = await fetch(`${BASE_URL}/${accountId}/advideos?${params}`)
      const data = await res.json()
      if (data.error) return
      for (const v of data.data || []) if (v.picture) map.set(v.id, v.picture)
    })
  )

  return map
}

/**
 * Carousel ads store each slide's image only as an `image_hash` inside
 * `object_story_spec.link_data.child_attachments` — there is no direct URL on
 * the creative object. Resolve hashes to real (full-resolution) image URLs via
 * the ad account's image library.
 */
async function fetchImageHashUrls(accountId: string, token: string, hashes: string[]): Promise<Map<string, string>> {
  const map = new Map<string, string>()
  const chunks = chunkArray([...new Set(hashes)], 50)

  await Promise.all(
    chunks.map(async (chunk) => {
      if (chunk.length === 0) return
      const params = new URLSearchParams({
        hashes: JSON.stringify(chunk),
        fields: 'hash,url',
        access_token: token,
      })
      const res = await fetch(`${BASE_URL}/${accountId}/adimages?${params}`)
      const data = await res.json()
      if (data.error) return
      for (const img of data.data || []) if (img.url) map.set(img.hash, img.url)
    })
  )

  return map
}

/**
 * Fetches ad + creative metadata (thumbnail, copy, video id) for an explicit
 * list of ad IDs, in chunks. We deliberately look ads up by ID rather than by
 * `effective_status IN [...]` — Meta has many status values beyond
 * ACTIVE/PAUSED/ARCHIVED (e.g. CAMPAIGN_PAUSED, ADSET_PAUSED, WITH_ISSUES),
 * and a status allowlist silently drops creative data for any ad in a status
 * it doesn't cover, even though that ad still has real spend in Insights.
 *
 * Also backfills `creative.image_url` for ads where Meta doesn't provide one
 * directly (videos, carousels) so every downstream consumer of `image_url` /
 * `thumbnail_url` gets the best available image without extra plumbing.
 */
async function fetchAdsByIds(accountId: string, token: string, adIds: string[]): Promise<Map<string, any>> {
  const adsMap = new Map<string, any>()
  const chunks = chunkArray(adIds, 50)

  await Promise.all(
    chunks.map(async (chunk) => {
      if (chunk.length === 0) return
      const params = new URLSearchParams({
        fields:
          'id,name,created_time,effective_status,' +
          'creative{id,thumbnail_url,image_url,video_id,body,title,call_to_action_type,object_story_spec}',
        filtering: JSON.stringify([{ field: 'id', operator: 'IN', value: chunk }]),
        limit: String(chunk.length),
        access_token: token,
      })
      const res = await fetch(`${BASE_URL}/${accountId}/ads?${params}`)
      const data = await res.json()
      if (data.error) throw new Error(data.error.message)
      for (const ad of data.data || []) adsMap.set(ad.id, ad)
    })
  )

  const videoIdsNeeded: string[] = []
  const hashesNeeded: string[] = []
  for (const ad of adsMap.values()) {
    const creative = ad.creative
    if (!creative || creative.image_url) continue

    // Video ads carry a full-res poster image right on the creative's own
    // story spec — reachable with plain ads_read, unlike the video asset
    // itself (which usually needs pages_read_engagement and often lives in a
    // shared cross-account video library anyway). Always prefer this.
    const videoPosterUrl = creative.object_story_spec?.video_data?.image_url
    if (videoPosterUrl) {
      creative.image_url = videoPosterUrl
      continue
    }

    if (creative.video_id) videoIdsNeeded.push(creative.video_id)
    const hash = creative.object_story_spec?.link_data?.child_attachments?.[0]?.image_hash
    if (hash) hashesNeeded.push(hash)
  }

  const [videoPictures, hashUrls] = await Promise.all([
    fetchVideoPictures(accountId, token, videoIdsNeeded),
    fetchImageHashUrls(accountId, token, hashesNeeded),
  ])

  for (const ad of adsMap.values()) {
    const creative = ad.creative
    if (!creative || creative.image_url) continue
    if (creative.video_id && videoPictures.has(creative.video_id)) {
      creative.image_url = videoPictures.get(creative.video_id)
      continue
    }
    const hash = creative.object_story_spec?.link_data?.child_attachments?.[0]?.image_hash
    if (hash && hashUrls.has(hash)) creative.image_url = hashUrls.get(hash)
  }

  return adsMap
}

export async function fetchCreatives(
  token: string,
  accountId: string,
  datePreset: string,
  minSpend: number,
  format: 'all' | 'video' | 'static'
): Promise<Creative[]> {
  const insightsRes = await fetch(
    `${BASE_URL}/${accountId}/insights?` +
      `level=ad&` +
      `fields=ad_id,ad_name,spend,impressions,clicks,cpc,cpm,purchase_roas,actions,` +
      `video_p25_watched_actions,video_p50_watched_actions,video_p75_watched_actions,` +
      `video_p95_watched_actions,video_thruplay_watched_actions&` +
      `date_preset=${datePreset}&` +
      `filtering=[{"field":"spend","operator":"GREATER_THAN","value":"${Math.max(0, minSpend - 1)}"}]&` +
      `sort=["spend_descending"]&` +
      `limit=500&access_token=${token}`
  )
  const insightsData = await insightsRes.json()
  if (insightsData.error) throw new Error(insightsData.error.message)

  const adIds: string[] = (insightsData.data || []).map((i: any) => i.ad_id)
  const adsMap = await fetchAdsByIds(accountId, token, adIds)

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
      thumbnailUrl: creative?.image_url || creative?.thumbnail_url || null,
      imageUrl: creative?.image_url || creative?.thumbnail_url || null,
      videoId: creative?.video_id || null,
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

export type CreativeShift = 'scaling' | 'declining' | 'newly_launched' | 'recently_paused' | 'stable'

export interface CreativeTrend {
  id: string
  name: string
  thumbnailUrl: string | null
  isVideo: boolean
  status: string
  createdTime: string | null
  weeksOnBoard: number
  thisSpend: number
  lastSpend: number
  thisRoas: number
  lastRoas: number
  thisRank: number
  lastRank: number | null
  rankChange: number | null
  spendChangePct: number | null
  roasChangePct: number | null
  shift: CreativeShift
}

async function fetchAdInsightsByAd(
  accountId: string,
  token: string,
  since: string,
  until: string
): Promise<Map<string, { spend: number; roas: number }>> {
  const params = new URLSearchParams({
    level: 'ad',
    fields: 'ad_id,spend,purchase_roas',
    time_range: JSON.stringify({ since, until }),
    limit: '500',
    access_token: token,
  })
  const res = await fetch(`${BASE_URL}/${accountId}/insights?${params}`)
  const data = await res.json()
  if (data.error) throw new Error(data.error.message)

  const map = new Map<string, { spend: number; roas: number }>()
  for (const row of data.data || []) {
    const spend = parseFloat(row.spend || '0')
    const roas = row.purchase_roas?.[0]?.value ? parseFloat(row.purchase_roas[0].value) : 0
    map.set(row.ad_id, { spend, roas })
  }
  return map
}

function weeksSince(dateStr: string | null): number {
  if (!dateStr) return 0
  const created = new Date(dateStr).getTime()
  const now = Date.now()
  return Math.max(1, Math.round((now - created) / (7 * 24 * 60 * 60 * 1000)))
}

function classifyShift(lastSpend: number, thisSpend: number, spendChangePct: number | null): CreativeShift {
  if (lastSpend === 0 && thisSpend > 0) return 'newly_launched'
  if (thisSpend === 0 && lastSpend > 0) return 'recently_paused'
  if (spendChangePct === null) return 'stable'
  if (spendChangePct >= 20) return 'scaling'
  if (spendChangePct <= -20) return 'declining'
  return 'stable'
}

/**
 * Compares per-ad spend/ROAS across two adjacent periods to classify momentum
 * (scaling/declining/newly launched/recently paused) and rank movement,
 * mirroring Motion's Leaderboard "performance shifts" view.
 */
export async function fetchCreativeTrends(
  token: string,
  accountId: string,
  since1: string,
  until1: string,
  since2: string,
  until2: string
): Promise<CreativeTrend[]> {
  const [thisMap, lastMap] = await Promise.all([
    fetchAdInsightsByAd(accountId, token, since1, until1),
    fetchAdInsightsByAd(accountId, token, since2, until2),
  ])

  const adIds = new Set<string>([...thisMap.keys(), ...lastMap.keys()])
  const adsData = await fetchAdsByIds(accountId, token, [...adIds])

  type Row = Omit<CreativeTrend, 'thisRank' | 'lastRank' | 'rankChange'>
  const rows: Row[] = []

  for (const adId of adIds) {
    const ad = adsData.get(adId)
    const thisStats = thisMap.get(adId) || { spend: 0, roas: 0 }
    const lastStats = lastMap.get(adId) || { spend: 0, roas: 0 }
    if (thisStats.spend === 0 && lastStats.spend === 0) continue

    const spendChangePct =
      lastStats.spend > 0 ? ((thisStats.spend - lastStats.spend) / lastStats.spend) * 100 : null
    const roasChangePct =
      lastStats.roas > 0 ? ((thisStats.roas - lastStats.roas) / lastStats.roas) * 100 : null

    rows.push({
      id: adId,
      name: ad?.name || adId,
      thumbnailUrl: ad?.creative?.image_url || ad?.creative?.thumbnail_url || null,
      isVideo: !!ad?.creative?.video_id,
      status: ad?.effective_status || 'UNKNOWN',
      createdTime: ad?.created_time || null,
      weeksOnBoard: weeksSince(ad?.created_time || null),
      thisSpend: thisStats.spend,
      lastSpend: lastStats.spend,
      thisRoas: thisStats.roas,
      lastRoas: lastStats.roas,
      spendChangePct,
      roasChangePct,
      shift: classifyShift(lastStats.spend, thisStats.spend, spendChangePct),
    })
  }

  // Rank by spend within each period (only among creatives that had spend that period)
  const thisRanked = [...rows].filter((r) => r.thisSpend > 0).sort((a, b) => b.thisSpend - a.thisSpend)
  const lastRanked = [...rows].filter((r) => r.lastSpend > 0).sort((a, b) => b.lastSpend - a.lastSpend)
  const thisRankMap = new Map(thisRanked.map((r, i) => [r.id, i + 1]))
  const lastRankMap = new Map(lastRanked.map((r, i) => [r.id, i + 1]))

  const trends: CreativeTrend[] = rows.map((r) => {
    const thisRank = thisRankMap.get(r.id) ?? thisRanked.length + 1
    const lastRank = lastRankMap.get(r.id) ?? null
    return {
      ...r,
      thisRank,
      lastRank,
      rankChange: lastRank !== null ? lastRank - thisRank : null,
    }
  })

  return trends.sort((a, b) => b.thisSpend - a.thisSpend)
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
