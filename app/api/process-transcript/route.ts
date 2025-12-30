// app/api/process-transcript/route.ts
import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

function needEnv(name: string) {
  const v = process.env[name]
  if (!v) throw new Error(`Missing env var: ${name}`)
  return v
}

function safeJsonParse(text: string) {
  try {
    return JSON.parse(text)
  } catch {
    const m = text.match(/\{[\s\S]*\}/)
    if (!m) throw new Error("Gemini no devolvió JSON válido")
    return JSON.parse(m[0])
  }
}

export async function POST(req: Request) {
  try {
    const { presentationId, systemPrompt, contentOrientation, visualStyle, transcript } = await req.json()

    if (!presentationId) return NextResponse.json({ error: "presentationId requerido" }, { status: 400 })
    if (!transcript || !String(transcript).trim()) {
      return NextResponse.json({ error: "transcript requerido" }, { status: 400 })
    }

    const supabase = await createClient()

    const sys = systemPrompt?.trim() || "Eres un experto en crear presentaciones profesionales."
    const orientation = contentOrientation?.trim() || "Propuesta comercial"
    const style = visualStyle?.trim() || "Minimalista, profesional, blanco y naranja, con gráficos"

    const prompt = `
DEVUELVE SOLO JSON VÁLIDO. SIN MARKDOWN. SIN TEXTO EXTRA.

ESQUEMA:
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

REGLAS:
- 8 a 14 diapositivas.
- description: texto breve de slide, profesional.
- imagePrompt: instrucción visual acorde al estilo; evita texto legible en la imagen.

PROMPT SISTEMA:
${sys}

ORIENTACIÓN:
${orientation}

ESTILO VISUAL:
${style}

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

    if (!r.ok) {
      const t = await r.text().catch(() => "")
      throw new Error(`Gemini error: ${r.status} ${t}`)
    }

    const data: any = await r.json()
    const text =
      data?.candidates?.[0]?.content?.parts?.map((p: any) => p?.text).filter(Boolean).join("") || ""

    const outline = safeJsonParse(text)

    await supabase.from("presentations").update({ outline, status: "outline_created" }).eq("id", presentationId)

    await supabase.from("slides").delete().eq("presentation_id", presentationId)

    const slides = (outline.slides || []).map((s: any) => ({
      presentation_id: presentationId,
      slide_number: Number(s.slideNumber),
      title: String(s.title ?? ""),
      description: String(s.description ?? ""),
      image_prompt: String(s.imagePrompt ?? ""),
      image_url: null,
    }))

    if (!slides.length) throw new Error("Outline sin slides")

    const { error: insErr } = await supabase.from("slides").insert(slides)
    if (insErr) throw new Error("Error insertando slides")

    await supabase.from("presentations").update({ status: "slides_saved" }).eq("id", presentationId)

    return NextResponse.json({ success: true, outline, slideCount: slides.length })
  } catch (e: any) {
    console.error("process-transcript error:", e)
    return NextResponse.json({ error: e?.message || "Error procesando transcripción" }, { status: 500 })
  }
}
