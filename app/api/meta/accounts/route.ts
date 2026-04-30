import { fetchAdAccounts } from '@/lib/meta'

export async function GET() {
  const token = process.env.META_ACCESS_TOKEN
  if (!token) {
    return Response.json({ error: 'META_ACCESS_TOKEN not configured' }, { status: 500 })
  }
  try {
    const accounts = await fetchAdAccounts(token)
    return Response.json({ accounts })
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 400 })
  }
}
