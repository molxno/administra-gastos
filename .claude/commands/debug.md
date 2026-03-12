Actúa como un agente de debugging experto en React + Zustand + TypeScript.

Diagnostica el problema: $ARGUMENTS

## Metodología de debug

### 1. Recopilar contexto
- Lee los archivos relevantes al problema reportado
- Identifica el flujo de datos: Componente → Store → Engine → Store → Componente
- Verifica el estado del store (qué campos están involucrados)

### 2. Hipótesis y verificación
- Formula las 3 hipótesis más probables ordenadas por probabilidad
- Para cada hipótesis, identifica qué verificar
- Descarta hipótesis sistemáticamente

### 3. Puntos comunes de fallo en este proyecto
- **Store no recalcula**: ¿Se llama `recalculate()` después de la mutación?
- **Datos stale en localStorage**: ¿La estructura del store cambió pero localStorage tiene la versión vieja?
- **Engine recibe undefined**: ¿El onboarding no completó todos los campos requeridos?
- **Tipo incorrecto**: ¿Se pasa string donde se espera number? (común en inputs de formulario)
- **Recharts NaN**: ¿El formatter recibe un valor que no es number?
- **React Router**: ¿La ruta está registrada en App.tsx?
- **Tailwind v4**: ¿Se usa sintaxis de v3 que no funciona en v4?

### 4. Diagnóstico
- Identifica la causa raíz exacta (archivo, línea, condición)
- Explica POR QUÉ ocurre, no solo DÓNDE
- Propón el fix mínimo necesario
- Verifica que el fix no rompe otros flujos

### 5. Verificación
- Corre `npm run typecheck` para asegurar que el fix compila
- Si el fix toca un engine, verifica con datos de ejemplo que el output es correcto
- Lista los archivos modificados y el impacto del cambio

NO apliques el fix sin explicar primero el diagnóstico al usuario.
