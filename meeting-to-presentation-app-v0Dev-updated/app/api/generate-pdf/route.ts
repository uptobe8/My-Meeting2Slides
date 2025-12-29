import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  try {
    const { presentationId } = await request.json()

    const supabase = await createClient()

    // Obtener las diapositivas con sus imágenes
    const { data: slides, error: slidesError } = await supabase
      .from("slides")
      .select("*")
      .eq("presentation_id", presentationId)
      .order("slide_number", { ascending: true })

    if (slidesError || !slides || slides.length === 0) {
      return NextResponse.json({ error: "No se encontraron diapositivas" }, { status: 404 })
    }

    // Crear HTML para el PDF
    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    @page {
      size: 1920px 1080px;
      margin: 0;
    }
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    }
    .slide {
      width: 1920px;
      height: 1080px;
      page-break-after: always;
      position: relative;
      background: #000;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .slide:last-child {
      page-break-after: avoid;
    }
    .slide img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    .slide-fallback {
      width: 100%;
      height: 100%;
      background: linear-gradient(135deg, #000 0%, #1a1a1a 100%);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 80px;
      text-align: center;
    }
    .slide-fallback h1 {
      color: #d2dd00;
      font-size: 64px;
      margin-bottom: 40px;
      font-weight: 700;
    }
    .slide-fallback p {
      color: #fff;
      font-size: 32px;
      line-height: 1.6;
      max-width: 1400px;
    }
    .slide-number {
      position: absolute;
      bottom: 30px;
      right: 40px;
      color: #d2dd00;
      font-size: 24px;
      font-weight: 600;
    }
  </style>
</head>
<body>
  ${slides
    .map(
      (slide) => `
    <div class="slide">
      ${
        slide.image_url && !slide.image_url.includes("placeholder")
          ? `<img src="${slide.image_url}" alt="${slide.title || "Slide"}" />`
          : `<div class="slide-fallback">
          <h1>${slide.title || `Diapositiva ${slide.slide_number}`}</h1>
          <p>${slide.description || ""}</p>
        </div>`
      }
      <span class="slide-number">${slide.slide_number}</span>
    </div>
  `,
    )
    .join("")}
</body>
</html>
`

    // Actualizar estado
    await supabase
      .from("presentations")
      .update({
        status: "completed",
        pdf_url: "generated",
      })
      .eq("id", presentationId)

    return NextResponse.json({
      success: true,
      html: htmlContent,
      slideCount: slides.length,
    })
  } catch (error) {
    console.error("Error generating PDF:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
