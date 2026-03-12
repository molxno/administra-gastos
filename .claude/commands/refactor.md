Refactoriza el código indicado: $ARGUMENTS

Principios:
1. Lee TODO el contexto antes de tocar nada — entiende las dependencias
2. Mantén la misma interfaz pública (exports, props, tipos) a menos que el usuario pida cambiarla
3. Verifica que los 7 motores de cálculo siguen recibiendo los mismos inputs
4. Asegura que el store sigue llamando recalculate() correctamente
5. Corre `npm run typecheck` después de cada cambio significativo

Reglas:
- NO cambies nombres de exports sin actualizar todos los imports
- NO muevas archivos sin actualizar todas las referencias
- NO agregues abstracciones innecesarias — menos código > más código
- Mantén las funciones de los engines como funciones puras
- Si el refactor toca types.ts, verifica TODOS los archivos que importan de ahí
