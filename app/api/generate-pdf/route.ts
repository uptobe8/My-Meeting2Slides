import { NextResponse } from "next/server"
import { PDFDocument } from "pdf-lib"
import { createClient } from "@/lib/supabase/server"

async function fetchBytes(url: string): Promise<Uint8Array> {
  if (url.startsWith("data:image")) {
    const b64 = url.split(",")[1] ?? ""
    return Uint8Array.from(Buffer.from(b64, "base64"))
  }
  const res = await fetch(url)
  if (!res.ok) throw new Error(`No se pudo descargar imagen: ${res.status}`)
  const buf = await res.arrayBuffer()
  return new Uint8Array(buf)
}

export async function POST(request: Request) {
  try {
    const { presentationId } = await request.json()
    if (!presentationId) {
      return NextResponse.json({ error: "presentationId requerido" }, { status: 400 })
    }

    const supabase = await createClient()

    const { data: slides, error: slidesError } = await supabase
      .from("slides")
      .select("*")
      .eq("presentation_id", presentationId)
      .order("slide_number", { ascending: true })

    if (slidesError || !slides?.length) {
      return NextResponse.json({ error: "No hay diapositivas para generar PDF" }, { status: 500 })
    }

    const PAGE_W = 1280
    const PAGE_H = 720

    const pdf = await PDFDocument.create()

    for (const slide of slides) {
      const page = pdf.addPage([PAGE_W, PAGE_H])

      if (slide.image_url) {
        const imgBytes = await fetchBytes(slide.image_url)
        let embedded
        try {
          embedded = await pdf.embedPng(imgBytes)
        } catch {
          embedded = await pdf.embedJpg(imgBytes)
        }
        page.drawImage(embedded, { x: 0, y: 0, width: PAGE_W, height: PAGE_H })
      }
    }

    const pdfBytes = await pdf.save()

    const pdfPath = `presentation_${presentationId}/deck.pdf`
    const { error: uploadError } = await supabase.storage.from("presentations").upload(pdfPath, pdfBytes, {
      contentType: "application/pdf",
      upsert: true,
    })

    if (uploadError) {
      return NextResponse.json({ error: "Error subiendo PDF a Storage" }, { status: 500 })
    }

    const { data: urlData } = supabase.storage.from("presentations").getPublicUrl(pdfPath)
    const pdfUrl = urlData.publicUrl

    await supabase
      .from("presentations")
      .update({ pdf_url: pdfUrl, status: "completed" })
      .eq("id", presentationId)

    return NextResponse.json({ success: true, pdfUrl })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message ?? "Error interno" }, { status: 500 })
  }
}
