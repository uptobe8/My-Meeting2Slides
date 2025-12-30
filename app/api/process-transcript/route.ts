import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

function requireEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var ${name}`);
  return v;
}

export async function POST(req: Request) {
  try {
    const GEMINI_API_KEY = requireEnv("GEMINI_API_KEY");

    const body = await req.json();
    const {
      presentationId,
      systemPrompt,
      contentOrientation,
      visualStyle,
      transcript,
    } = body;

    if (!presentationId || !transcript) {
      return NextResponse.json(
        { error: "presentationId and transcript are required" },
        { status: 400 }
      );
    }

    const supabase = createClient();

    const prompt = `
Eres un experto en crear presentaciones profesionales.
A partir del siguiente transcript, crea un OUTLINE ESTRICTAMENTE EN JSON.

REGLAS OBLIGATORIAS:
- Responde SOLO con JSON válido (sin markdown, sin texto extra).
- La estructura debe ser EXACTAMENTE esta:

{
  "title": "Título de la presentación",
  "slides": [
    {
      "slideNumber": 1,
      "title": "Título slide",
      "description": "Contenido detallado",
      "imagePrompt": "Descripción visual clara para generar una imagen 16:9"
    }
  ]
}

Contexto adicional:
- Prompt de sistema: ${systemPrompt}
- Orientación del contenido: ${contentOrientation}
- Estilo visual: ${visualStyle}

Transcript:
${transcript}
`;

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-pro:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [{ text: prompt }],
            },
          ],
          generationConfig: {
            temperature: 0.3,
          },
        }));

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      throw new Error(`Gemini API error ${geminiRes.status}: ${errText}`);
    }

    const geminiJson = await geminiRes.json();
    const rawText =
      geminiJson?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!rawText) {
      throw new Error("Gemini returned empty response");
    }

    const outline = JSON.parse(rawText);

    // Guardar outline en presentations
    await supabase
      .from("presentations")
      .update({ outline, status: "outlined" })
      .eq("id", presentationId);

    // Insertar slides
    const slides = outline.slides.map((s: any) => ({
      presentation_id: presentationId,
      slide_number: s.slideNumber,
      title: s.title,
      description: s.description,
      image_prompt: s.imagePrompt,
    }));

    await supabase.from("slides").delete().eq("presentation_id", presentationId);
    await supabase.from("slides").insert(slides);

    return NextResponse.json({ ok: true, outline });
  } catch (err: any) {
    console.error("Error en process-transcript:", err);
    return NextResponse.json(
      { error: err.message || "process-transcript failed" },
      { status: 500 }
    );
  }
}
