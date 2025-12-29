# Meeting2Slides

Transforma reuniones en presentaciones profesionales con IA.

## ✅ Estado del Proyecto

### Funcionando
- ✅ Frontend completo (diseño negro/amarillo/blanco)
- ✅ Formulario con 4 campos (System Prompt, Content Orientation, Visual Style, Transcript)
- ✅ Diseño responsive con glassmorphism
- ✅ API endpoints creados (/api/process-transcript, /api/generate-pdf)
- ✅ Integración con Anthropic Claude y OpenAI
- ✅ Base de datos Supabase
- ✅ Deployment en Vercel

### Pendiente de Configuración
- ⚠️ **Variables de entorno reales en Vercel**

## 🔑 Configuración Requerida

Para que la aplicación funcione completamente, necesitas configurar las siguientes variables de entorno en Vercel:

### 1. Supabase
- `NEXT_PUBLIC_SUPABASE_URL`: Tu URL de proyecto Supabase
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Tu Anon Key de Supabase

**Cómo obtenerlas:**
1. Ve a https://supabase.com/dashboard
2. Selecciona tu proyecto
3. Settings > API
4. Copia Project URL y anon/public key

### 2. API de IA
- `OPENAI_API_KEY`: Tu API key de OpenAI (opcional)
- `GEMINI_API_KEY`: Tu API key de Google Gemini (opcional)

**Nota:** Solo necesitas una de las dos API keys. El código usa Anthropic Claude por defecto.

### 3. Cómo Configurar en Vercel

1. Ve a https://vercel.com/costaricagoprovideos1-3324s-projects/my-meeting2-slides/settings/environment-variables
2. Edita cada variable con los valores reales
3. Haz un nuevo deployment para aplicar los cambios

## 🚀 Deployment

La aplicación está desplegada en:
- **Producción:** https://my-meeting2-slides.vercel.app/

## 📝 Uso

1. Rellena los 3 campos del formulario:
   - **Prompt de Sistema:** Instrucciones para la IA
   - **Orientación del Contenido:** Contexto de la presentación
   - **Estilo Visual:** Descripción del diseño deseado

2. Pega o sube la transcripción de la reunión

3. Click en "Crear Presentación"

4. La IA generará una presentación profesional en PDF

## 🛠️ Stack Tecnológico

- **Frontend:** Next.js 14, React, TypeScript, Tailwind CSS
- **Backend:** Next.js API Routes
- **IA:** Anthropic Claude Sonnet 4
- **Base de Datos:** Supabase
- **Deployment:** Vercel

##
