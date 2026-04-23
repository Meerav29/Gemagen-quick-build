import { NextRequest, NextResponse } from 'next/server'

const VERTEX_API_KEY = process.env.VERTEX_API_KEY
const TTS_URL = `https://aiplatform.googleapis.com/v1/publishers/google/models/gemini-2.5-flash-preview-tts:generateContent?key=${VERTEX_API_KEY}`

export async function POST(req: NextRequest) {
  try {
    const { text } = await req.json()
    if (!text) return NextResponse.json({ error: 'No text provided' }, { status: 400 })

    const body = {
      contents: [{ role: 'user', parts: [{ text }] }],
      generationConfig: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Puck' },
          },
        },
      },
    }

    const res = await fetch(TTS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      const err = await res.text()
      console.error('Gemini TTS error:', res.status, err)
      return NextResponse.json({ error: 'TTS failed' }, { status: 500 })
    }

    const data = await res.json()
    const audioData = data?.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data
    const mimeType = data?.candidates?.[0]?.content?.parts?.[0]?.inlineData?.mimeType ?? 'audio/L16;codec=pcm;rate=24000'

    if (!audioData) {
      return NextResponse.json({ error: 'No audio in response' }, { status: 500 })
    }

    return NextResponse.json({ audio: audioData, mimeType })
  } catch (err) {
    console.error('TTS route error:', err)
    return NextResponse.json({ error: 'TTS failed' }, { status: 500 })
  }
}
