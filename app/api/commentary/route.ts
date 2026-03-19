import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  try {
    const { players, challenge, buildType, previousComments } = await req.json()

    // Build the message content with all player images
    const content: Anthropic.MessageParam['content'] = []

    const buildDesc = buildType === 'lego' ? 'LEGO brick sculpture' : 'drawing'
    const persona = buildType === 'lego'
      ? 'witty, enthusiastic game show commentator who loves LEGO'
      : 'playful art critic who takes drawings very seriously (maybe too seriously)'

    let prompt = `You are a ${persona} at a high-stakes quick build contest.
Players have ${buildType === 'lego' ? '90' : '60'} seconds to build a "${challenge}" as a ${buildDesc}.

They are judged on: Creative Use of Color, Structural Integrity, Adherence to the Brief, and Detail & Complexity.

Make ONE short, specific comment (2-3 sentences max) about ONE player's build progress. 
- Call the player by name
- Reference something SPECIFIC and VISUAL you can see in their photo
- Be ${persona} — entertaining for a live audience
- Keep it SHORT — this will be read aloud

Previous comments (avoid repeating these angles):
${previousComments.slice(-4).join('\n') || 'None yet'}

Here are the current builds:\n`

    content.push({ type: 'text', text: prompt })

    // Add each player's photo
    for (const player of players) {
      if (player.photoBase64 && player.name) {
        content.push({
          type: 'text',
          text: `Player: ${player.name}`
        })
        content.push({
          type: 'image',
          source: {
            type: 'base64',
            media_type: 'image/jpeg',
            data: player.photoBase64,
          }
        })
      }
    }

    content.push({
      type: 'text',
      text: 'Respond ONLY with a JSON object: {"playerName": "string", "commentary": "string"}. No markdown, no extra text.'
    })

    const response = await client.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 256,
      messages: [{ role: 'user', content }],
    })

    const raw = response.content[0].type === 'text' ? response.content[0].text : ''
    const cleaned = raw.replace(/```json\n?|\n?```/g, '').trim()
    const parsed = JSON.parse(cleaned)

    return NextResponse.json({ success: true, ...parsed })
  } catch (err) {
    console.error('Commentary error:', err)
    return NextResponse.json({ success: false, error: 'Commentary failed' }, { status: 500 })
  }
}
