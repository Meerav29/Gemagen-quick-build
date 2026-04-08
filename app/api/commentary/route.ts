import { NextRequest, NextResponse } from 'next/server'

const VERTEX_API_KEY = process.env.VERTEX_API_KEY
const VERTEX_MODEL = process.env.VERTEX_MODEL ?? 'gemini-2.5-flash'
const VERTEX_URL = `https://aiplatform.googleapis.com/v1/publishers/google/models/${VERTEX_MODEL}:generateContent?key=${VERTEX_API_KEY}`

export async function POST(req: NextRequest) {
  try {
    const { players, challenge, buildType, previousComments } = await req.json()

    const buildDesc = buildType === 'lego' ? 'LEGO brick sculpture' : 'drawing'
    const persona = buildType === 'lego'
      ? 'witty, enthusiastic game show commentator who loves LEGO'
      : 'playful art critic who takes drawings very seriously (maybe too seriously)'

    const promptText = `You are a ${persona} at a high-stakes quick build contest.
Players have ${buildType === 'lego' ? '90' : '60'} seconds to build a "${challenge}" as a ${buildDesc}.

They are judged on: Creative Use of Color, Structural Integrity, Adherence to the Brief, and Detail & Complexity.

Make ONE short, specific comment (2-3 sentences max) about ONE player's build progress.
- Call the player by name
- Reference something SPECIFIC and VISUAL you can see in their photo
- Be ${persona} — entertaining for a live audience
- Keep it SHORT — this will be read aloud

Previous comments (avoid repeating these angles):
${previousComments.slice(-4).join('\n') || 'None yet'}

Here are the current builds:`

    // Build parts array: opening prompt, then interleaved player name + image
    const parts: unknown[] = [{ text: promptText }]

    for (const player of players) {
      if (player.photoBase64 && player.name) {
        parts.push({ text: `Player: ${player.name}` })
        parts.push({
          inlineData: {
            mimeType: 'image/jpeg',
            data: player.photoBase64,
          }
        })
      }
    }

    parts.push({
      text: 'Respond ONLY with a JSON object: {"playerName": "string", "commentary": "string"}. No markdown, no extra text.'
    })

    const body = {
      contents: [{ role: 'user', parts }],
      generationConfig: { maxOutputTokens: 1024, temperature: 0.9 },
    }

    const res = await fetch(VERTEX_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      const errText = await res.text()
      console.error('Vertex API error:', res.status, errText)
      return NextResponse.json({ success: false, error: 'Commentary failed' }, { status: 500 })
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

    // Strip markdown fences, then extract the first {...} block
    const stripped = raw.replace(/```(?:json)?\n?|\n?```/g, '').trim()
    const match = stripped.match(/\{[\s\S]*\}/)
    if (!match) {
      console.error('Commentary raw response (no JSON found):', raw)
      return NextResponse.json({ success: false, error: 'No JSON in response' }, { status: 500 })
    }
    const parsed = JSON.parse(match[0])

    return NextResponse.json({ success: true, ...parsed })
  } catch (err) {
    console.error('Commentary error:', err)
    return NextResponse.json({ success: false, error: 'Commentary failed' }, { status: 500 })
  }
}
