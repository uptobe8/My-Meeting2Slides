import { NextResponse } from "next/server"

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

    const apiKey = needEnv('GEMINI_API_KEY')

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

    // Use Gemini REST API directly (v1 stable API)
    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro-latest:generateContent?key=' + apiKey, {      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 4096,
        }
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Gemini API Error:', errorText)
      throw new Error(`Gemini API error: ${response.status} - ${errorText}`)
    }

    const data = await response.json()
    const generatedText = data.candidates[0].content.parts[0].text

    // Clean JSON response
    let cleanText = generatedText.trim()
    cleanText = cleanText.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '')
    
    const presentation = JSON.parse(cleanText)

    console.log('Presentation generated:', presentation)

    return NextResponse.json({
      status: 'completed',
      presentationId,
      presentation
    })

  } catch (error: any) {
    console.error('Error en process-transcript:', error)
    return NextResponse.json(
      { error: error.message || 'Error procesando transcripción' },
      { status: 500 }
    )
  }
}
