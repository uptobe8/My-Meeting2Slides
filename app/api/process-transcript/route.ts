import { type NextRequest, NextResponse } from "next/server"
import { createOpenAI } from "@ai-sdk/openai"
import { generateText } from "ai"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  try {
    const { presentationId, systemPrompt, contentOrientation, visualStyle, transcript } = await request.json()
    
    const supabase = await createClient()

    // Configurar Groq provider (compatible con OpenAI)
    const groq = createOpenAI({
      baseURL: "https://api.groq.com/openai/v1",
      apiKey: process.env.GROQ_API_KEY || "",
    })

    // Paso 1: Analizar el transcript y crear el outline
    const outlinePrompt = `
${systemPrompt || "Eres un experto en crear presentaciones profesionales."}

Orientación del contenido: ${contentOrientation || "Presentación profesional"}
Estilo visual deseado: ${visualStyle || "Moderno y limpio"}

Basándote en la siguiente transcripción de reunión, crea un outline detallado para una presentación.
Para cada diapositiva incluye:
- Un título claro y conciso
- Descripción detallada del contenido visual (qué imagen debería ilustrar esta diapositiva)
- Puntos clave a mostrar

Devuelve SOLO un JSON válido con este formato exacto, sin texto adicional:

{
  "slides": [
    {
      "slideNumber": 1,
      "title": "Título de la diapositiva",
      "description": "Descripción detallada del contenido visual para generar la imagen",
      "keyPoints": ["punto 1", "punto 2"]
    }
  ]
}

Transcripción:
${transcript}
`

    const { text: outlineText } = await generateText({
      model: groq("llama-3.3-70b-versatile"),
      prompt: outlinePrompt,
    })

    // Parsear el JSON del outline
    let outline
    try {
      // Extraer JSON del texto (puede venir con markdown)
      const jsonMatch = outlineText.match(/\{[\s\S]+\}/)
      if (jsonMatch) {
        outline = JSON.parse(jsonMatch[0])
      } else {
        throw new Error("No se encontró JSON válido")
      }
    } catch (error) {
      console.error("Error parsing outline JSON:", error)
      throw new Error("Error al parsear el outline generado por la IA")
    }

    // Guardar el outline en Supabase
    const { error: outlineError } = await supabase
      .from("presentations")
      .update({ outline })
      .eq("id", presentationId)

    if (outlineError) {
      console.error("Error guardando outline:", outlineError)
      throw outlineError
    }

    // Retornar el outline para continuar con la generación de imágenes
    return NextResponse.json({
      success: true,
      outline,
      message: "Outline generado correctamente",
    })
  } catch (error: any) {
    console.error("Error en process-transcript:", error)
    return NextResponse.json(
      { error: error.message || "Error procesando la transcripción" },
      { status: 500 }
    )
  }
}
