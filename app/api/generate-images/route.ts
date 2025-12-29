import { type NextRequest, NextResponse } from "next/server"
import { experimental_generateImage as generateImage } from "ai"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  try {
    const { presentationId, visualStyle } = await request.json()

    const supabase = await createClient()

    // Obtener las diapositivas de la presentación
    const { data: slides, error: slidesError } = await supabase
      .from("slides")
      .select("*")
      .eq("presentation_id", presentationId)
      .order("slide_number", { ascending: true })

    if (slidesError || !slides) {
      return NextResponse.json({ error: "Error al obtener diapositivas" }, { status: 500 })
    }

    const generatedImages: { slideId: string; imageUrl: string; slideNumber: number }[] = []

    // Generar imagen para cada diapositiva
    for (const slide of slides) {
      const imagePrompt = `Create a professional presentation slide image. 
Style: ${visualStyle || "Modern, clean, professional with lime green (#d2dd00), black and white colors"}
Title: ${slide.title}
Content: ${slide.description}
The image should be suitable for a business presentation, with clear visual hierarchy, 
infographic elements, and a sophisticated editorial design. 
Use lime green (#d2dd00) as accent color, black for text/elements, white for background areas.
Aspect ratio: 16:9, presentation slide format.`

      try {
        const { image } = await generateImage({
          model: "fal/flux/schnell",
          prompt: imagePrompt,
          size: "1792x1024",
        })

        // Convertir la imagen a base64 y guardar en Supabase Storage
        const imageBuffer = Buffer.from(image.base64, "base64")
        const fileName = `presentation_${presentationId}/slide_${slide.slide_number}.png`

        const { error: uploadError } = await supabase.storage.from("presentations").upload(fileName, imageBuffer, {
          contentType: "image/png",
          upsert: true,
        })

        if (uploadError) {
          console.error("Error uploading image:", uploadError)
          // Si falla el storage, guardar la URL base64 directamente
          const base64Url = `data:image/png;base64,${image.base64}`

          await supabase.from("slides").update({ image_url: base64Url }).eq("id", slide.id)

          generatedImages.push({
            slideId: slide.id,
            imageUrl: base64Url,
            slideNumber: slide.slide_number,
          })
        } else {
          // Obtener URL pública
          const { data: urlData } = supabase.storage.from("presentations").getPublicUrl(fileName)

          await supabase.from("slides").update({ image_url: urlData.publicUrl }).eq("id", slide.id)

          generatedImages.push({
            slideId: slide.id,
            imageUrl: urlData.publicUrl,
            slideNumber: slide.slide_number,
          })
        }
      } catch (imageError) {
        console.error(`Error generating image for slide ${slide.slide_number}:`, imageError)
        // Crear una imagen placeholder si falla
        const placeholderUrl = `/placeholder.svg?height=1024&width=1792&query=${encodeURIComponent(slide.title || "Slide")}`

        await supabase.from("slides").update({ image_url: placeholderUrl }).eq("id", slide.id)

        generatedImages.push({
          slideId: slide.id,
          imageUrl: placeholderUrl,
          slideNumber: slide.slide_number,
        })
      }
    }

    // Actualizar estado de la presentación
    await supabase.from("presentations").update({ status: "images_generated" }).eq("id", presentationId)

    return NextResponse.json({
      success: true,
      images: generatedImages,
    })
  } catch (error) {
    console.error("Error generating images:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
