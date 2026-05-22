import Anthropic from '@anthropic-ai/sdk'
import { fmt, delta, deltaLabel, type MetricsSnapshot } from '@/lib/metricUtils'
import type { GoogleTotals } from '@/lib/googleCSV'

const client = new Anthropic()

function metaBlock(label: string, m: MetricsSnapshot, prev: MetricsSnapshot): string {
  const d = (cur: number | null, pre: number | null) => {
    const pct = delta(cur, pre)
    return pct !== null ? ` (${deltaLabel(pct)} WoW)` : ''
  }
  const isLeadGen = m.leads > 0
  const isConversion = m.purchases > 0

  let lines = [
    `Spend: ${fmt(m.spend, 'currency')}${d(m.spend, prev.spend)}`,
    `Impressions: ${fmt(m.impressions, 'number')}${d(m.impressions, prev.impressions)}`,
    `CPM: ${fmt(m.cpm, 'currency')}${d(m.cpm, prev.cpm)}`,
    `CTR: ${fmt(m.ctr, 'percent')}${d(m.ctr, prev.ctr)}`,
    `Landing Page Views: ${fmt(m.lpv, 'number')}${d(m.lpv, prev.lpv)}`,
  ]
  if (isConversion) {
    lines = lines.concat([
      `Add to Cart: ${fmt(m.atc, 'number')}${d(m.atc, prev.atc)}`,
      `Checkout Initiated: ${fmt(m.checkout, 'number')}${d(m.checkout, prev.checkout)}`,
      `Purchases: ${fmt(m.purchases, 'number')}${d(m.purchases, prev.purchases)}`,
      `Cost/Purchase: ${fmt(m.costPerPurchase, 'currency')}${d(m.costPerPurchase, prev.costPerPurchase)}`,
      `Purchase Value: ${fmt(m.purchaseValue, 'currency')}${d(m.purchaseValue, prev.purchaseValue)}`,
      `ROAS: ${fmt(m.roas, 'roas')}${d(m.roas, prev.roas)}`,
      `AOV: ${fmt(m.aov, 'currency')}${d(m.aov, prev.aov)}`,
    ])
  }
  if (isLeadGen) {
    lines = lines.concat([
      `Leads: ${fmt(m.leads, 'number')}${d(m.leads, prev.leads)}`,
      `CPL: ${fmt(m.cpl, 'currency')}${d(m.cpl, prev.cpl)}`,
    ])
  }
  return `${label}:\n${lines.map((l) => `  ${l}`).join('\n')}`
}

function googleBlock(label: string, g: GoogleTotals, prev: GoogleTotals | null): string {
  const d = (cur: number | null, pre: number | null) => {
    const pct = delta(cur, pre)
    return prev && pct !== null ? ` (${deltaLabel(pct)} WoW)` : ''
  }
  const lines = [
    `Spend: ${fmt(g.cost, 'currency')}${d(g.cost, prev?.cost ?? null)}`,
    `Impressions: ${fmt(g.impressions, 'number')}${d(g.impressions, prev?.impressions ?? null)}`,
    `Clicks: ${fmt(g.clicks, 'number')}${d(g.clicks, prev?.clicks ?? null)}`,
    `CTR: ${fmt(g.ctr, 'percent')}${d(g.ctr, prev?.ctr ?? null)}`,
    `Avg CPC: ${fmt(g.avgCpc, 'currency')}${d(g.avgCpc, prev?.avgCpc ?? null)}`,
    `Conversions: ${fmt(g.conversions, 'number')}${d(g.conversions, prev?.conversions ?? null)}`,
    `Cost/Conv: ${fmt(g.costPerConv, 'currency')}${d(g.costPerConv, prev?.costPerConv ?? null)}`,
    ...(g.convValue ? [`Conv Value: ${fmt(g.convValue, 'currency')}${d(g.convValue, prev?.convValue ?? null)}`] : []),
    ...(g.roas ? [`ROAS: ${fmt(g.roas, 'roas')}${d(g.roas, prev?.roas ?? null)}`] : []),
  ]
  return `${label}:\n${lines.map((l) => `  ${l}`).join('\n')}`
}

function buildPrompt(
  metaThis: MetricsSnapshot,
  metaPrev: MetricsSnapshot,
  googleThis: GoogleTotals | null,
  googlePrev: GoogleTotals | null,
  topCreatives: { name: string; spend: number; roas: number; ctr: number }[]
): string {
  const creativeLines = topCreatives
    .slice(0, 5)
    .map((c, i) => `  ${i + 1}. "${c.name}" — $${c.spend.toFixed(0)} spend, ${c.roas.toFixed(2)}x ROAS, ${c.ctr.toFixed(2)}% CTR`)
    .join('\n')

  return `You are a senior performance marketing strategist writing a weekly client report.

Your task is to write concise, client-facing strategic commentary. Do NOT just describe what the numbers say — the client can see those. Instead, interpret what the numbers MEAN strategically: what's working, what's a red flag, and what should happen next.

${metaBlock('META (This Week vs Last Week)', metaThis, metaPrev)}
${googleThis ? '\n' + googleBlock('GOOGLE (This Week vs Last Week)', googleThis, googlePrev) : ''}
${topCreatives.length > 0 ? `\nTop Creatives (by spend):\n${creativeLines}` : ''}

Write your commentary with this structure:
**Overall Performance**
- 3-4 bullets with 🟢/🔴/🟡 flags

**Creative Insights**
- 2-3 bullets on creative patterns and what they signal

**Strategic Recommendations**
- 2-3 specific, actionable next steps

Rules:
- 🟢 = positive signal or win
- 🔴 = red flag, needs immediate attention
- 🟡 = watch closely, not urgent yet
- Be specific — reference actual metrics when making a point
- Recommend concrete actions (e.g. "scale budget on X", "pause Y creative", "test Z")
- Keep total length under 250 words
- Do not use filler phrases like "it's great to see" or "this is encouraging"`
}

export async function POST(request: Request) {
  const body = await request.json()
  const { metaThis, metaPrev, googleThis, googlePrev, topCreatives } = body

  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 500 })
  }

  try {
    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      messages: [{ role: 'user', content: buildPrompt(metaThis, metaPrev, googleThis, googlePrev, topCreatives ?? []) }],
    })
    const text = message.content[0].type === 'text' ? message.content[0].text : ''
    return Response.json({ commentary: text })
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}
