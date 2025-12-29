import { type NextRequest, NextResponse } from "next/server"
import { generateText } from "ai"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  try {
    const { presentationId, systemPrompt, contentOrientation, visualStyle, transcript } = await request.json()

    const supabase = await createClient()

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
model: "openai/gpt-4o",      prompt: outlinePrompt,
    })

    // Parsear el JSON del outline
    let outline
    try {
      // Extraer JSON del texto (puede venir con markdown)
      const jsonMatch = outlineText.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        outline = JSON.parse(jsonMatch[0])
      } else {
        throw new Error("No se encontró JSON válido")
      }
    } catch {
      console.error("Error parsing outline:", outlineText)
      return NextResponse.json({ error: "Error al parsear el outline" }, { status: 500 })
    }

    // Guardar el outline en la presentación
    const { error: updateError } = await supabase
      .from("presentations")
      .update({ outline, status: "outline_created" })
      .eq("id", presentationId)

    if (updateError) {
      console.error("Error updating presentation:", updateError)
      return NextResponse.json({ error: "Error al guardar outline" }, { status: 500 })
    }

    // Guardar cada diapositiva en la base de datos
    const slidesData = outline.slides.map((slide: { slideNumber: number; title: string; description: string }) => ({
      presentation_id: presentationId,
      slide_number: slide.slideNumber,
      title: slide.title,
      description: slide.description,
    }))

    const { error: slidesError } = await supabase.from("slides").insert(slidesData)

    if (slidesError) {
      console.error("Error inserting slides:", slidesError)
      return NextResponse.json({ error: "Error al guardar diapositivas" }, { status: 500 })
    }

    // Actualizar estado
    await supabase.from("presentations").update({ status: "slides_saved" }).eq("id", presentationId)

    return NextResponse.json({
      success: true,
      outline,
      slideCount: outline.slides.length,
    })
  } catch (error) {
    console.error("Error processing transcript:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
