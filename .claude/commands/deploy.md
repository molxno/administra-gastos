Actúa como un agente de despliegue especializado en Vercel + Vite + React.

Tarea: $ARGUMENTS

## Configuración de Vercel para este proyecto

### Stack de deploy
- **Framework**: Vite (detected automáticamente por Vercel)
- **Build command**: `npm run build` (tsc + vite build)
- **Output directory**: `dist`
- **Node version**: 22 (definido en .nvmrc)
- **Install command**: `npm install`

### Pre-deploy checklist
1. `npm run typecheck` — sin errores de TypeScript
2. `npm run build` — build exitoso sin warnings críticos
3. Verificar que `.gitignore` incluye: node_modules, dist, .env*
4. Verificar que no hay dependencias nativas que fallen en Linux (Vercel usa Linux)
5. Verificar que `lightningcss` está en devDependencies (requerido para Tailwind v4 en Vercel)

### Problemas conocidos con Vercel
- **lightningcss**: Necesita estar explícito en devDependencies porque Vercel usa Linux y los binarios nativos difieren de Windows
- **Node version**: Debe coincidir .nvmrc con la config de Vercel
- **Vite v8**: Si hay problemas, verificar compatibilidad con el entorno de Vercel

### Diagnóstico de fallos de deploy
Si el deploy falla:
1. Revisa el build log de Vercel (`vercel logs` o dashboard)
2. Causas comunes:
   - **Install fails**: Peer dependency conflicts → verificar package.json
   - **Build fails**: TypeScript errors → correr typecheck local
   - **Runtime fails**: Variables de entorno faltantes → verificar Vercel env vars
   - **Native bindings**: lightningcss/esbuild → verificar que están en deps

### Configuraciones recomendadas

#### vercel.json (si se necesita)
```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ],
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "X-Frame-Options", "value": "DENY" },
        { "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" }
      ]
    }
  ]
}
```

#### SPA Routing
React Router necesita que todas las rutas redirijan a index.html. Vercel maneja esto automáticamente para proyectos Vite, pero si hay problemas de 404 en rutas directas, agregar el rewrite de arriba.

### Operaciones
- **Verificar deploy**: Corre build local y reporta si está listo para deploy
- **Diagnosticar fallo**: Analiza logs de error y propone fix
- **Optimizar bundle**: Analiza tamaño del build y sugiere optimizaciones
- **Configurar headers**: Agrega headers de seguridad y caché
