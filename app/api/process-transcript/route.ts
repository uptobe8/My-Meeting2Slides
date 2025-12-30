import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

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

    const supabase = await createClient()

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

ORIENTACIÓN:
${contentOrientation}

ESTILO VISUAL:
${visualStyle}

TRANSCRIPCIÓN:
${transcript}
`.trim()

    const apiKey = needEnv("GEMINI_API_KEY")
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${apiKey}`

    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.4, maxOutputTokens: 8192 },
      }),
    })

    if (!r.ok) throw new Error(await r.text())

    const data: any = await r.json()
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text
    if (!text) throw new Error("Gemini no devolvió texto")

    const outline = JSON.parse(text.match(/\{[\s\S]*\}/)?.[0] || "")

    await supabase.from("presentations").update({ outline, status: "outline_created" }).eq("id", presentationId)
    await supabase.from("slides").delete().eq("presentation_id", presentationId)

    const slides = outline.slides.map((s: any) => ({
      presentation_id: presentationId,
      slide_number: s.slideNumber,
      title: s.title,
      description: s.description,
      image_prompt: s.imagePrompt,
    }))

    await supabase.from("slides").insert(slides)

    return NextResponse.json({ success: true })
  } catch (e: any) {
    console.error(e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
