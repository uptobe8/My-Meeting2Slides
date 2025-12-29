import { AppHeader } from "@/components/app-header"
import { PresentationForm } from "@/components/presentation-form"

export default function Home() {
  return (
    <main className="min-h-screen bg-background">
      <AppHeader />

      <div className="max-w-2xl mx-auto px-4 py-8">
        <PresentationForm />
      </div>

      {/* Footer */}
      <footer className="mt-12 pb-8 text-center">
        <p className="text-xs text-muted-foreground">Powered by AI — Convierte reuniones en presentaciones</p>
      </footer>
    </main>
  )
}
