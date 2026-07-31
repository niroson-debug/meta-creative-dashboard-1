const API_VERSION = process.env.META_API_VERSION || 'v21.0'
const BASE = `https://graph.facebook.com/${API_VERSION}`

export async function GET(request: Request) {
  const token = process.env.META_ACCESS_TOKEN
  if (!token) return Response.json({ error: 'No token' }, { status: 500 })

  const { searchParams } = new URL(request.url)
  const videoId = searchParams.get('videoId')
  const accountId = searchParams.get('accountId')
  if (!videoId) return Response.json({ error: 'videoId required' }, { status: 400 })
  if (!accountId) return Response.json({ error: 'accountId required' }, { status: 400 })

  // Direct /{video-id} reads are permission-restricted for this app's token,
  // but the same fields are reachable via the owning ad account's advideos
  // edge — as long as the video actually lives in that account's asset
  // library (shared/cross-account video assets won't resolve here).
  const params = new URLSearchParams({
    fields: 'id,source',
    filtering: JSON.stringify([{ field: 'id', operator: 'IN', value: [videoId] }]),
    limit: '1',
    access_token: token,
  })
  const res = await fetch(`${BASE}/${accountId}/advideos?${params}`)
  const data = await res.json()

  if (data.error) return Response.json({ error: data.error.message }, { status: 400 })
  const video = (data.data || [])[0]
  return Response.json({ url: video?.source || null })
}
