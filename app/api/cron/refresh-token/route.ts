import { NextRequest } from 'next/server'

const META_API_VERSION = process.env.META_API_VERSION || 'v21.0'

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const currentToken = process.env.META_ACCESS_TOKEN
  const appId = process.env.META_APP_ID
  const appSecret = process.env.META_APP_SECRET
  const vercelToken = process.env.VERCEL_TOKEN
  const projectId = process.env.VERCEL_PROJECT_ID
  const deployHook = process.env.VERCEL_DEPLOY_HOOK

  if (!currentToken || !appId || !appSecret || !vercelToken || !projectId) {
    return Response.json({ error: 'Missing env vars: META_APP_ID, META_APP_SECRET, VERCEL_TOKEN, VERCEL_PROJECT_ID' }, { status: 500 })
  }

  // Step 1: Exchange current token for a new 60-day long-lived token
  const metaRes = await fetch(
    `https://graph.facebook.com/${META_API_VERSION}/oauth/access_token?` +
      `grant_type=fb_exchange_token&` +
      `client_id=${appId}&` +
      `client_secret=${appSecret}&` +
      `fb_exchange_token=${currentToken}`
  )
  const metaData = await metaRes.json()
  if (metaData.error) {
    return Response.json({ error: `Meta token exchange failed: ${metaData.error.message}` }, { status: 500 })
  }
  const newToken: string = metaData.access_token

  // Step 2: Find the META_ACCESS_TOKEN env var ID in Vercel
  const envListRes = await fetch(`https://api.vercel.com/v9/projects/${projectId}/env`, {
    headers: { Authorization: `Bearer ${vercelToken}` },
  })
  const envListData = await envListRes.json()
  const envVar = (envListData.envs ?? []).find((e: any) => e.key === 'META_ACCESS_TOKEN')
  if (!envVar) {
    return Response.json({ error: 'META_ACCESS_TOKEN not found in Vercel project env vars' }, { status: 500 })
  }

  // Step 3: Update the env var value in Vercel
  const updateRes = await fetch(`https://api.vercel.com/v9/projects/${projectId}/env/${envVar.id}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${vercelToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ value: newToken }),
  })
  if (!updateRes.ok) {
    const err = await updateRes.json()
    return Response.json({ error: `Vercel env update failed: ${JSON.stringify(err)}` }, { status: 500 })
  }

  // Step 4: Trigger a new deployment so the updated token is picked up
  if (deployHook) {
    await fetch(deployHook, { method: 'POST' })
  }

  return Response.json({
    success: true,
    message: 'Token refreshed successfully. New deployment triggered.',
    expiresInSeconds: metaData.expires_in,
  })
}
