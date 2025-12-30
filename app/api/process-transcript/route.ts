import { NextResponse } from "next/server"
import { groq } from "@ai-sdk/groq"
import { generateText } from "ai"

function needEnv(name: string) {
  const v = process.env[name]
  if (!v) throw new Error(`Missing env var: ${name}`)
  return v
}

export async function POST(req: Request) {
  try {
    const { presentationId, systemPrompt, contentOrientation, visualStyle, transcript } = await req.json()

    if (!presentationId || !transcript) {
      return NextResponse.json({ error: "presentationId y transcript requeridos" }, { status: 400 })
    }

    const prompt = `
DEVUELVE SOLO JSON VÁLIDO. SIN MARKDOWN.

FORMATO:
{
  "title": string,
  "slides": [
    {
      "slideNumber": number,
      "title": string,
      "description": string,
      "imagePrompt": string
    }
  ]
}

PROMPT SISTEMA:
${systemPrompt}

ORIENTACIÓN: ${contentOrientation || 'técnico'}
ESTILO VISUAL: ${visualStyle || 'profesional'}

TRANSCRIPCIÓN:
${transcript}

Genera una presentación de 8-10 slides.
`

    const { text: generatedText } = await generateText({
      model: groq("llama-3.3-70b-versatile"),
      prompt,
      temperature: 0.7,
      maxTokens: 4096,
    })

    // Clean JSON response
    let cleanText = generatedText.trim()
    cleanText = cleanText.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```$/i, '')

    const presentation = JSON.parse(cleanText)

    console.log('Presentation generated:', presentation)

    return NextResponse.json({
      status: 'completed',
      presentationId,
      presentation
    })
  } catch (error: any) {
    console.error('Error en process-transcript:', error)
    return NextResponse.json({ error: error.message || 'Error procesando transcripción' }, { status: 500 })
  }
}
