import { NextRequest, NextResponse } from 'next/server'

const VERTEX_API_KEY = process.env.VERTEX_API_KEY
const VERTEX_MODEL = process.env.VERTEX_MODEL ?? 'gemini-2.5-flash'
const VERTEX_URL = `https://aiplatform.googleapis.com/v1/publishers/google/models/${VERTEX_MODEL}:generateContent?key=${VERTEX_API_KEY}`

export async function POST(req: NextRequest) {
  try {
    const { players, challenge, buildType } = await req.json()

    const buildDesc = buildType === 'lego' ? 'LEGO brick sculpture' : 'drawing'

    const activePlayers = players.filter((p: { photoBase64: string | null }) => p.photoBase64)

    const playerScoreSchema = activePlayers.map((_: unknown, i: number) => {
      const p = activePlayers[i]
      return `"player_${i + 1}": { "playerName": "${p.name}", "playerNumber": ${i + 1}, "score": number(1-10), "scoringReasoning": string, "colorScore": number(1-10), "structureScore": number(1-10), "adherenceScore": number(1-10), "detailScore": number(1-10) }`
    }).join(', ')

    const promptText = `You are the head judge of a high-stakes quick build contest.
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

Here are the builds to judge:`

    const parts: unknown[] = [{ text: promptText }]

    for (let i = 0; i < activePlayers.length; i++) {
      const player = activePlayers[i]
      parts.push({ text: `Player ${i + 1}: ${player.name}` })
      parts.push({
        inlineData: {
          mimeType: 'image/jpeg',
          data: player.photoBase64,
        }
      })
    }

    parts.push({
      text: `Respond ONLY with a JSON object matching this exact shape (no markdown):
{
  "scores": { ${playerScoreSchema} },
  "overallWinner": { "playerName": string, "playerNumber": number, "winnerReasoning": string },
  "winnerAnnouncementScript": string
}`
    })

    const body = {
      contents: [{ role: 'user', parts }],
      generationConfig: { maxOutputTokens: 4096, temperature: 0.7 },
    }

    const res = await fetch(VERTEX_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      const errText = await res.text()
      console.error('Vertex API error:', res.status, errText)
      return NextResponse.json({ success: false, error: 'Judging failed' }, { status: 500 })
    }

    const data = await res.json()

    let raw = ''
    for (const candidate of data.candidates ?? []) {
      const text = (candidate?.content?.parts ?? [])
        .filter((p: { text?: string }) => p.text)
        .map((p: { text: string }) => p.text)
        .join('')
        .trim()
      if (text) { raw = text; break }
    }

    const stripped = raw.replace(/```(?:json)?\n?|\n?```/g, '').trim()
    const match = stripped.match(/\{[\s\S]*\}/)
    if (!match) {
      console.error('Judge raw response (no JSON found):', raw)
      return NextResponse.json({ success: false, error: 'No JSON in response' }, { status: 500 })
    }
    const parsed = JSON.parse(match[0])

    return NextResponse.json({ success: true, result: parsed })
  } catch (err) {
    console.error('Judging error:', err)
    return NextResponse.json({ success: false, error: 'Judging failed' }, { status: 500 })
  }
}
