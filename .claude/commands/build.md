Ejecuta el pipeline completo de build del proyecto:

1. Corre `npm run typecheck` para verificar tipos TypeScript
2. Si hay errores de tipos, analízalos y sugiere fixes concretos
3. Si los tipos pasan, corre `npm run build` para build de producción
4. Reporta el resultado: tamaño del bundle, warnings, y errores si los hay
5. Si el build falla, diagnostica la causa raíz y propón la solución

Formato del reporte:
- ✅/❌ TypeScript check
- ✅/❌ Vite build
- Tamaño total del bundle
- Warnings relevantes (ignorar los triviales)
