-- Tabla para guardar el prompt de sistema del usuario
CREATE TABLE IF NOT EXISTS system_prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla para guardar las presentaciones generadas
CREATE TABLE IF NOT EXISTS presentations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  system_prompt TEXT,
  content_orientation TEXT,
  visual_style TEXT,
  transcript TEXT NOT NULL,
  outline JSONB,
  pdf_url TEXT,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla para guardar las diapositivas individuales
CREATE TABLE IF NOT EXISTS slides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  presentation_id UUID NOT NULL REFERENCES presentations(id) ON DELETE CASCADE,
  slide_number INTEGER NOT NULL,
  title TEXT,
  description TEXT NOT NULL,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_slides_presentation_id ON slides(presentation_id);
CREATE INDEX IF NOT EXISTS idx_slides_slide_number ON slides(presentation_id, slide_number);

-- Habilitar RLS pero permitir acceso público (sin autenticación requerida)
ALTER TABLE system_prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE presentations ENABLE ROW LEVEL SECURITY;
ALTER TABLE slides ENABLE ROW LEVEL SECURITY;

-- Políticas públicas para permitir todas las operaciones
CREATE POLICY "Allow all operations on system_prompts" ON system_prompts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on presentations" ON presentations FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on slides" ON slides FOR ALL USING (true) WITH CHECK (true);
