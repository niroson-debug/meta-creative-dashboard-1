import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic()

interface BriefCreative {
  name: string
  headline: string | null
  primaryText: string | null
  description: string | null
  cta: string | null
  isVideo: boolean
  spend: number
  roas: number
  ctr: number
  hookRate: number | null
  holdRate: number | null
}

function buildPrompt(c: BriefCreative): string {
  return `You are a senior direct-response creative strategist for paid social (Meta ads). A winning ad is described below. Study why it's working and generate fresh creative directions to test next — new hooks, new headlines, and a short brief for a new variant.

WINNING AD
- Name: ${c.name}
- Format: ${c.isVideo ? 'Video' : 'Static image'}
- Headline: ${c.headline || '(none)'}
- Primary text: ${c.primaryText || '(none)'}
- Description: ${c.description || '(none)'}
- CTA: ${c.cta || '(none)'}
- Performance: $${c.spend.toFixed(0)} spend, ${c.roas > 0 ? c.roas.toFixed(2) + 'x ROAS' : 'no ROAS data'}, ${c.ctr.toFixed(2)}% CTR${c.hookRate !== null ? `, ${c.hookRate.toFixed(1)}% hook rate` : ''}${c.holdRate !== null ? `, ${c.holdRate.toFixed(1)}% hold rate` : ''}

Respond with ONLY a raw JSON object (no markdown fences, no commentary) in exactly this shape:
{
  "whyItWorks": "1-2 sentence diagnosis of the specific mechanism driving performance (the angle, the proof point, the pattern interrupt, etc.)",
  "hooks": ["5 new opening hook/first-line ideas, each under 15 words, same core angle but different wording or proof point"],
  "headlines": ["4 new headline ideas for a static or video overlay, each under 12 words"],
  "briefs": ["3 short creative briefs (1-2 sentences each) for new ad variants to produce next, each testing a different angle: a new format, a new proof point, or a new audience pain point"]
}`
}

function parseJsonLoose(text: string): any {
  const cleaned = text.trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim()
  return JSON.parse(cleaned)
}

export async function POST(request: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 500 })
  }

  const body = await request.json()
  const creative: BriefCreative = body.creative
  if (!creative || !creative.name) {
    return Response.json({ error: 'creative is required' }, { status: 400 })
  }

  try {
    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      messages: [{ role: 'user', content: buildPrompt(creative) }],
    })
    const text = message.content[0].type === 'text' ? message.content[0].text : ''
    const brief = parseJsonLoose(text)
    return Response.json({ brief })
  } catch (err: any) {
    return Response.json({ error: err.message || 'Failed to generate brief' }, { status: 500 })
  }
}
