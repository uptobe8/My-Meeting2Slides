"use client"

import type React from "react"

import { useMemo, useRef, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { ProgressChecklist } from "@/components/progress-checklist"

interface TaskStatus {
  id: string
  label: string
  status: "pending" | "in-progress" | "completed" | "error"
}

const INITIAL_TASKS: TaskStatus[] = [
  { id: "analyze", label: "Procesando transcripción con IA", status: "pending" },
  { id: "outline", label: "Creando outline de presentación", status: "pending" },
  { id: "images", label: "Generando imágenes", status: "pending" },
  { id: "pdf", label: "Compilando PDF", status: "pending" },
]

export function PresentationForm() {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [systemPrompt, setSystemPrompt] = useState("")
  const [contentOrientation, setContentOrientation] = useState("")
  const [visualStyle, setVisualStyle] = useState("")
  const [transcript, setTranscript] = useState("")

  const [tasks, setTasks] = useState<TaskStatus[]>(INITIAL_TASKS)
  const [isProcessing, setIsProcessing] = useState(false)

  const [savedPrompt, setSavedPrompt] = useState(false)
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)

  const canSubmit = useMemo(() => transcript.trim().length > 0 && !isProcessing, [transcript, isProcessing])

  const updateTaskStatus = (taskId: string, status: TaskStatus["status"]) => {
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status } : t)))
  }

  const resetRunState = () => {
    setTasks(INITIAL_TASKS)
    setPdfUrl(null)
    setSavedPrompt(false)
  }

  const handleFileUpload = async (file: File) => {
    const reader = new FileReader()
    reader.onload = () => {
      const text = String(reader.result ?? "")
      setTranscript(text)
    }
    reader.onerror = () => alert("Error leyendo archivo")

    // Para este MVP: leer todo como texto
    reader.readAsText(file)
  }

  const saveSystemPrompt = async () => {
    try {
      const supabase = createClient()
      // MVP: guarda uno solo (borra anteriores)
      await supabase.from("system_prompts").delete().neq("id", "00000000-0000-0000-0000-000000000000")
      const { error } = await supabase.from("system_prompts").insert({ prompt: systemPrompt })
      if (error) throw error
      setSavedPrompt(true)
      setTimeout(() => setSavedPrompt(false), 1500)
    } catch {
      alert("No se pudo guardar el prompt")
    }
  }

  const loadSystemPrompt = async () => {
    try {
      const supabase = createClient()
      const { data, error } = await supabase.from("system_prompts").select("prompt").order("created_at", { ascending: false }).limit(1)
      if (error) throw error
      if (data?.[0]?.prompt) setSystemPrompt(data[0].prompt)
    } catch {
      alert("No se pudo cargar el prompt guardado")
    }
  }

  const handleCreatePresentation = async () => {
    if (!transcript.trim()) {
      alert("Por favor, añade una transcripción")
      return
    }

    // Estado inicial de run (IMPORTANTE para que el checklist se vea SIEMPRE)
    resetRunState()
    setIsProcessing(true)

    try {
      const supabase = createClient()

      // 1) Crear presentación en BD (necesitamos presentationId)
      updateTaskStatus("analyze", "in-progress")

      const { data: presentation, error: createError } = await supabase
        .from("presentations")
        .insert({
          system_prompt: systemPrompt,
          content_orientation: contentOrientation,
          visual_style: visualStyle,
          transcript,
          status: "processing",
        })
        .select()
        .single()

      if (createError || !presentation?.id) {
        throw new Error("Error al crear presentación")
      }

      // 2) Procesar transcript -> outline + slides
      const processResponse = await fetch("/api/process-transcript", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          presentationId: presentation.id,
          systemPrompt,
          contentOrientation,
          visualStyle,
          transcript,
        }),
      })

      if (!processResponse.ok) {
        const err = await processResponse.text().catch(() => "")
        throw new Error(`Error al procesar transcripción: ${err}`)
      }

      updateTaskStatus("analyze", "completed")
      updateTaskStatus("outline", "completed")

      // 3) Generar imágenes
      updateTaskStatus("images", "in-progress")

      const imagesResponse = await fetch("/api/generate-images", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          presentationId: presentation.id,
          visualStyle,
        }),
      })

      if (!imagesResponse.ok) {
        const err = await imagesResponse.text().catch(() => "")
        throw new Error(`Error al generar imágenes: ${err}`)
      }

      updateTaskStatus("images", "completed")

      // 4) Generar PDF REAL (server-side) -> devuelve pdfUrl
      updateTaskStatus("pdf", "in-progress")

      const pdfResponse = await fetch("/api/generate-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ presentationId: presentation.id }),
      })

      if (!pdfResponse.ok) {
        const err = await pdfResponse.text().catch(() => "")
        throw new Error(`Error al generar PDF: ${err}`)
      }

      const pdfData = (await pdfResponse.json()) as { pdfUrl?: string }
      if (!pdfData?.pdfUrl) throw new Error("El backend no devolvió pdfUrl")

      setPdfUrl(pdfData.pdfUrl)
      updateTaskStatus("pdf", "completed")
    } catch (e) {
      // Marca la tarea en curso como error (si la hay)
      setTasks((prev) => prev.map((t) => (t.status === "in-progress" ? { ...t, status: "error" } : t)))
      alert((e as Error)?.message ?? "Error inesperado")
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card className="border-2 border-accent/20 bg-card">
        <CardContent className="pt-6 space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="system-prompt" className="text-lg font-semibold text-foreground">
              Prompt de Sistema
            </Label>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={loadSystemPrompt} className="text-xs bg-transparent">
                Cargar guardado
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={saveSystemPrompt}
                className="text-xs bg-accent text-accent-foreground hover:bg-accent/90"
              >
                {savedPrompt ? "Guardado!" : "Guardar"}
              </Button>
            </div>
          </div>

          <Textarea
            id="system-prompt"
            placeholder="Define cómo quieres que la IA procese tus transcripciones, siempre limpias, con datos y en estilo elegante..."
            value={systemPrompt}
            onChange={(e) => setSystemPrompt(e.target.value)}
            className="min-h-[100px] bg-background border-border"
          />
        </CardContent>
      </Card>

      <Card className="border-2 border-accent/20 bg-card">
        <CardContent className="pt-6 space-y-4">
          <Label htmlFor="content-orientation" className="text-lg font-semibold text-foreground">
            Orientación del Contenido
          </Label>
          <Textarea
            id="content-orientation"
            placeholder="Describe la orientación específica de esta presentación... Ej: Es una propuesta comercial para un cliente, enfatiza su problema y nuestra solución con detalle..."
            value={contentOrientation}
            onChange={(e) => setContentOrientation(e.target.value)}
            className="min-h-[80px] bg-background border-border"
          />
        </CardContent>
      </Card>

      <Card className="border-2 border-accent/20 bg-card">
        <CardContent className="pt-6 space-y-4">
          <Label htmlFor="visual-style" className="text-lg font-semibold text-foreground">
            Estilo Visual
          </Label>
          <Textarea
            id="visual-style"
            placeholder="Describe el estilo gráfico deseado... Ej: Minimalista, con bastantes gráficos, colores blanco y naranja como refuerzo..."
            value={visualStyle}
            onChange={(e) => setVisualStyle(e.target.value)}
            className="min-h-[80px] bg-background border-border"
          />
        </CardContent>
      </Card>

      <Card className="border-2 border-accent/20 bg-card">
        <CardContent className="pt-6 space-y-4">
          <Label className="text-lg font-semibold text-foreground">Transcripción</Label>

          <div className="flex flex-col gap-3">
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept=".txt,.doc,.docx,.pdf"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) void handleFileUpload(file)
              }}
            />

            <Button
              type="button"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              className="bg-transparent justify-start"
            >
              Subir archivo (TXT/DOC/DOCX/PDF)
            </Button>

            <Textarea
              placeholder="Pega aquí el contenido de tu transcripción..."
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              className="min-h-[180px] bg-background border-border"
            />
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <Button
          onClick={handleCreatePresentation}
          disabled={!canSubmit}
          className="w-full bg-accent text-accent-foreground hover:bg-accent/90"
        >
          {isProcessing ? "Creando presentación..." : "Crear Presentación"}
        </Button>

        <ProgressChecklist tasks={tasks} />

        {pdfUrl && (
          <a
            href={pdfUrl}
            target="_blank"
            rel="noreferrer"
            className="block w-full rounded-md bg-foreground px-4 py-3 text-center text-background font-semibold hover:opacity-90"
          >
            Descargar PDF
          </a>
        )}
      </div>
    </div>
  )
}
