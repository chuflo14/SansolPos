# Manual de Despliegue: SansolPos

## Plataforma: Vercel

El proyecto **SansolPos** fue estructurado para aprovechar el Edge Computing y el SSR nativo que proporciona Next.js. El camino recomendado para despliegue es **Vercel**.

## Requisitos Previos (Variables de Entorno)
El entorno de producción requerirá las siguientes variables (`.env.production`):
```bash
NEXT_PUBLIC_SUPABASE_URL=https://yjgtfrmolpjfcuzrcaum.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_...
# SUPABASE_SERVICE_ROLE_KEY= (Para Webhooks si fuera necesario en el servidor)
```

## Pasos de Despliegue Continúo
1. **GitHub**: Haga commit y push de sus cambios a la rama `main` en `https://github.com/chuflo14/SansolPos.git`.
2. **Dashboard Vercel**: 
   - Diríjase a Vercel y seleccione "Add New Project".
   - Importe el repositorio **SansolPos** vinculado a su cuenta GitHub `chuflo14`.
   - Vercel auto-configurará el "Framework Preset" como **Next.js**.
3. **Pestaña Environment Variables**: Pegue las dos variables críticas indicadas arriba.
4. **Deploy**: Haga clic en *Deploy*. Vercel instalará las dependencias de Node, construirá el caché (Turbopack/Webpack) y lanzará funciones Serverless.

Cualquier push subsiguiente hacia `main` se desplegará automáticamente.

## Base de Datos en Producción (Supabase)
La base de datos actual `yjgtfrmolpjfcuzrcaum` está lista en producción. Asegúrese de que:
- Las políticas de Row Level Security (RLS) estén estrictas. A nadie le debería faltar la verificación `user_in_store(store_id)`.
- Realice copias de seguridad de Supabase semanalmente.
