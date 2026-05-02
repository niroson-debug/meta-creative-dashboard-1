const API_VERSION = process.env.META_API_VERSION || 'v21.0'

export async function GET(request: Request) {
  const token = process.env.META_ACCESS_TOKEN
  if (!token) return Response.json({ error: 'No token' }, { status: 500 })

  const { searchParams } = new URL(request.url)
  const videoId = searchParams.get('videoId')
  if (!videoId) return Response.json({ error: 'videoId required' }, { status: 400 })

  const res = await fetch(
    `https://graph.facebook.com/${API_VERSION}/${videoId}?fields=source&access_token=${token}`
  )
  const data = await res.json()

  if (data.error) return Response.json({ error: data.error.message }, { status: 400 })
  return Response.json({ url: data.source || null })
}
