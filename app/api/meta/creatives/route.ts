import { fetchCreatives, TokenExpiredError } from '@/lib/meta'

export async function GET(request: Request) {
  const token = process.env.META_ACCESS_TOKEN
  if (!token) {
    return Response.json({ error: 'META_ACCESS_TOKEN not configured' }, { status: 500 })
  }

  const { searchParams } = new URL(request.url)
  const accountId = searchParams.get('accountId')
  const datePreset = searchParams.get('datePreset') || 'last_14d'
  const minSpend = parseFloat(searchParams.get('minSpend') || '0')
  const format = (searchParams.get('format') || 'all') as 'all' | 'video' | 'static'

  if (!accountId) {
    return Response.json({ error: 'accountId is required' }, { status: 400 })
  }

  try {
    const creatives = await fetchCreatives(token, accountId, datePreset, minSpend, format)
    return Response.json({ creatives })
  } catch (err: any) {
    if (err instanceof TokenExpiredError) {
      return Response.json({ error: 'TOKEN_EXPIRED' }, { status: 401 })
    }
    return Response.json({ error: err.message }, { status: 400 })
  }
}
