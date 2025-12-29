"use client"

export function AppHeader() {
  return (
    <header className="relative overflow-hidden bg-foreground text-background py-8 px-4">
      {/* Decorative Elements */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-accent/20 rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 w-24 h-24 bg-accent/10 rounded-full blur-2xl" />

      <div className="relative max-w-2xl mx-auto">
        {/* Logo/Icon */}
        <div className="flex items-center gap-4 mb-4">
          <div className="relative">
            <div className="w-14 h-14 bg-accent rounded-xl flex items-center justify-center shadow-lg shadow-accent/30">
              <svg className="w-8 h-8 text-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2"
                />
              </svg>
            </div>
            {/* Animated dot */}
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-accent rounded-full animate-pulse" />
          </div>

          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Meeting<span className="text-accent">2</span>Slides
            </h1>
            <p className="text-sm text-background/70">Transcripciones a presentaciones con IA</p>
          </div>
        </div>

        {/* Tagline */}
        <div className="mt-4 p-4 bg-background/5 rounded-xl border border-background/10">
          <p className="text-sm text-background/80 leading-relaxed">
            Transforma tus reuniones en presentaciones profesionales. Sube la transcripción y obtén un PDF listo para
            compartir.
          </p>
        </div>
      </div>
    </header>
  )
}
