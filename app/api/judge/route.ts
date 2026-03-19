import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  try {
    const { players, challenge, buildType } = await req.json()

    const content: Anthropic.MessageParam['content'] = []

    const buildDesc = buildType === 'lego' ? 'LEGO brick sculpture' : 'drawing'

    const prompt = `You are the head judge of a high-stakes quick build contest.
Players had limited time to build "${challenge}" as a ${buildDesc}.

Evaluate each player's build on a scale of 1–10 across these criteria:
- colorScore: Creative Use of Color
- structureScore: Structural Integrity / Overall Form
- adherenceScore: Adherence to the Brief ("${challenge}")
- detailScore: Detail & Complexity

Then pick ONE overall winner.

Also write a dramatic "winnerAnnouncementScript" (3–5 sentences) that:
- Briefly mentions something specific about EACH contestant's build
- Builds tension and suspense
- Keeps the winner ambiguous until the VERY LAST WORD
- Ends with: "...and the winner is... [NAME]!"

Here are the builds to judge:\n`

    content.push({ type: 'text', text: prompt })

    const activePlayers = players.filter((p: { photoBase64: string | null }) => p.photoBase64)

    for (let i = 0; i < activePlayers.length; i++) {
      const player = activePlayers[i]
      content.push({ type: 'text', text: `Player ${i + 1}: ${player.name}` })
      content.push({
        type: 'image',
        source: {
          type: 'base64',
          media_type: 'image/jpeg',
          data: player.photoBase64,
        }
      })
    }

    // Build dynamic schema description
    const playerScoreSchema = activePlayers.map((_: unknown, i: number) => {
      const p = activePlayers[i]
      return `"player_${i + 1}": { "playerName": "${p.name}", "playerNumber": ${i + 1}, "score": number(1-10), "scoringReasoning": string, "colorScore": number(1-10), "structureScore": number(1-10), "adherenceScore": number(1-10), "detailScore": number(1-10) }`
    }).join(', ')

    content.push({
      type: 'text',
      text: `Respond ONLY with a JSON object matching this exact shape (no markdown):
{
  "scores": { ${playerScoreSchema} },
  "overallWinner": { "playerName": string, "playerNumber": number, "winnerReasoning": string },
  "winnerAnnouncementScript": string
}`
    })

    const response = await client.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 1500,
      messages: [{ role: 'user', content }],
    })

    const raw = response.content[0].type === 'text' ? response.content[0].text : ''
    const cleaned = raw.replace(/```json\n?|\n?```/g, '').trim()
    const parsed = JSON.parse(cleaned)

    return NextResponse.json({ success: true, result: parsed })
  } catch (err) {
    console.error('Judging error:', err)
    return NextResponse.json({ success: false, error: 'Judging failed' }, { status: 500 })
  }
}
