import { fetchCreativeTrends } from '@/lib/meta'

export async function GET(request: Request) {
  const token = process.env.META_ACCESS_TOKEN
  if (!token) {
    return Response.json({ error: 'META_ACCESS_TOKEN not configured' }, { status: 500 })
  }

  const { searchParams } = new URL(request.url)
  const accountId = searchParams.get('accountId')
  const since1 = searchParams.get('since1')
  const until1 = searchParams.get('until1')
  const since2 = searchParams.get('since2')
  const until2 = searchParams.get('until2')

  if (!accountId || !since1 || !until1 || !since2 || !until2) {
    return Response.json({ error: 'Missing required params' }, { status: 400 })
  }

  try {
    const trends = await fetchCreativeTrends(token, accountId, since1, until1, since2, until2)
    return Response.json({ trends })
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 400 })
  }
}
