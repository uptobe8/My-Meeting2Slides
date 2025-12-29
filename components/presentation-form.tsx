"use client"

import type React from "react"

import { useState, useRef } from "react"
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

export function PresentationForm() {
  const [systemPrompt, setSystemPrompt] = useState("")
  const [contentOrientation, setContentOrientation] = useState("")
  const [visualStyle, setVisualStyle] = useState("")
  const [transcript, setTranscript] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)
  const [pdfHtml, setPdfHtml] = useState<string | null>(null)
  const [savedPrompt, setSavedPrompt] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [tasks, setTasks] = useState<TaskStatus[]>([
    { id: "analyze", label: "Analizando transcripción con IA", status: "pending" },
    { id: "outline", label: "Creando estructura de diapositivas", status: "pending" },
    { id: "save", label: "Guardando en base de datos", status: "pending" },
    { id: "images", label: "Generando imágenes de diapositivas", status: "pending" },
    { id: "pdf", label: "Compilando presentación final", status: "pending" },
  ])

  const updateTaskStatus = (taskId: string, status: TaskStatus["status"]) => {
    setTasks((prev) => prev.map((task) => (task.id === taskId ? { ...task, status } : task)))
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const content = event.target?.result as string
      setTranscript(content)
    }

    if (file.name.endsWith(".txt")) {
      reader.readAsText(file)
    } else if (file.name.endsWith(".docx") || file.name.endsWith(".doc")) {
      // Para archivos Word, intentar leer como texto
      reader.readAsText(file)
    } else {
      reader.readAsText(file)
    }
  }

  const saveSystemPrompt = async () => {
    const supabase = createClient()

    // Primero eliminar prompts anteriores
    await supabase.from("system_prompts").delete().neq("id", "00000000-0000-0000-0000-000000000000")

    // Guardar el nuevo prompt
    const { error } = await supabase.from("system_prompts").insert({
      prompt: systemPrompt,
    })

    if (!error) {
      setSavedPrompt(true)
      setTimeout(() => setSavedPrompt(false), 2000)
    }
  }

  const loadSystemPrompt = async () => {
    const supabase = createClient()
    const { data } = await supabase
      .from("system_prompts")
      .select("prompt")
      .order("created_at", { ascending: false })
      .limit(1)
      .single()

    if (data) {
      setSystemPrompt(data.prompt)
    }
  }

  const handleCreatePresentation = async () => {
    if (!transcript.trim()) {
      alert("Por favor, añade una transcripción")
      return
    }

    setIsProcessing(true)
    setPdfHtml(null)

    // Reset tasks
    setTasks((prev) => prev.map((task) => ({ ...task, status: "pending" })))

    try {
      const supabase = createClient()

      // Crear registro de presentación
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

      if (createError || !presentation) {
        throw new Error("Error al crear presentación")
      }

      // Paso 1: Procesar transcript y crear outline
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
        throw new Error("Error al procesar transcripción")
      }

      updateTaskStatus("analyze", "completed")
      updateTaskStatus("outline", "completed")
      updateTaskStatus("save", "completed")

      // Paso 2: Generar imágenes
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
        throw new Error("Error al generar imágenes")
      }

      updateTaskStatus("images", "completed")

      // Paso 3: Generar PDF
      updateTaskStatus("pdf", "in-progress")

      const pdfResponse = await fetch("/api/generate-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          presentationId: presentation.id,
        }),
      })

      if (!pdfResponse.ok) {
        throw new Error("Error al generar PDF")
      }

      const pdfData = await pdfResponse.json()
      setPdfHtml(pdfData.html)

      updateTaskStatus("pdf", "completed")
    } catch (error) {
      console.error("Error:", error)
      // Marcar tarea actual como error
      setTasks((prev) => prev.map((task) => (task.status === "in-progress" ? { ...task, status: "error" } : task)))
    } finally {
      setIsProcessing(false)
    }
  }

  const downloadPdf = () => {
    if (!pdfHtml) return

    // Crear una nueva ventana con el contenido HTML
    const printWindow = window.open("", "_blank")
    if (printWindow) {
      printWindow.document.write(pdfHtml)
      printWindow.document.close()

      // Esperar a que las imágenes carguen y luego imprimir
      setTimeout(() => {
        printWindow.print()
      }, 2000)
    }
  }

  return (
    <div className="space-y-6">
      {/* System Prompt Section */}
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
            placeholder="Define cómo quieres que la IA procese tus transcripciones. Ej: Creas presentaciones a partir de transcripciones, siempre limpias, con datos y en estilo elegante..."
            value={systemPrompt}
            onChange={(e) => setSystemPrompt(e.target.value)}
            className="min-h-[100px] bg-background border-border"
          />
        </CardContent>
      </Card>

      {/* Content Orientation */}
      <Card className="border-2 border-accent/20 bg-card">
        <CardContent className="pt-6 space-y-4">
          <Label htmlFor="content-orientation" className="text-lg font-semibold text-foreground">
            Orientación del Contenido
          </Label>
          <Textarea
            id="content-orientation"
            placeholder="Describe la orientación específica de esta presentación. Ej: Es una propuesta comercial para un cliente, enfatiza su problema y nuestra solución con detalle..."
            value={contentOrientation}
            onChange={(e) => setContentOrientation(e.target.value)}
            className="min-h-[80px] bg-background border-border"
          />
        </CardContent>
      </Card>

      {/* Visual Style */}
      <Card className="border-2 border-accent/20 bg-card">
        <CardContent className="pt-6 space-y-4">
          <Label htmlFor="visual-style" className="text-lg font-semibold text-foreground">
            Estilo Visual
          </Label>
          <Textarea
            id="visual-style"
            placeholder="Describe el estilo gráfico deseado. Ej: Estilo infográfico editorial con gráficos creativos, colores negro, blanco y amarillo lima como acento..."
            value={visualStyle}
            onChange={(e) => setVisualStyle(e.target.value)}
            className="min-h-[80px] bg-background border-border"
          />
        </CardContent>
      </Card>

      {/* Transcript Upload */}
      <Card className="border-2 border-accent/20 bg-card">
        <CardContent className="pt-6 space-y-4">
          <Label className="text-lg font-semibold text-foreground">Transcripción de la Reunión</Label>

          <div className="flex flex-col gap-4">
            <div
              className="border-2 border-dashed border-accent/40 rounded-lg p-8 text-center cursor-pointer hover:border-accent transition-colors bg-background"
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".txt,.doc,.docx,.pdf"
                onChange={handleFileUpload}
                className="hidden"
              />
              <div className="space-y-2">
                <div className="w-16 h-16 mx-auto bg-accent/20 rounded-full flex items-center justify-center">
                  <svg className="w-8 h-8 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                    />
                  </svg>
                </div>
                <p className="text-muted-foreground">Haz clic para subir tu archivo</p>
                <p className="text-xs text-muted-foreground">TXT, DOC, DOCX o PDF</p>
              </div>
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">o pega el texto</span>
              </div>
            </div>

            <Textarea
              placeholder="Pega aquí el contenido de tu transcripción..."
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              className="min-h-[150px] bg-background border-border"
            />
          </div>
        </CardContent>
      </Card>

      {/* Progress Checklist */}
      {isProcessing && <ProgressChecklist tasks={tasks} />}

      {/* Action Buttons */}
      <div className="flex flex-col gap-4">
        <Button
          onClick={handleCreatePresentation}
          disabled={isProcessing || !transcript.trim()}
          className="w-full h-14 text-lg font-bold bg-accent text-accent-foreground hover:bg-accent/90 disabled:opacity-50"
        >
          {isProcessing ? (
            <span className="flex items-center gap-2">
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="none"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              Creando presentación...
            </span>
          ) : (
            "Crear Presentación"
          )}
        </Button>

        {pdfHtml && (
          <Button
            onClick={downloadPdf}
            className="w-full h-14 text-lg font-bold bg-foreground text-background hover:bg-foreground/90"
          >
            <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
              />
            </svg>
            Descargar Presentación
          </Button>
        )}
      </div>
    </div>
  )
}
