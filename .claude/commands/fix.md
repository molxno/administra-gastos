Diagnostica y arregla el problema descrito por el usuario: $ARGUMENTS

Proceso:
1. Reproduce el contexto — lee los archivos relevantes al problema
2. Identifica la causa raíz (no solo el síntoma)
3. Verifica si el fix puede romper otras partes del sistema:
   - ¿Afecta el store de Zustand? → Verifica recalculate()
   - ¿Afecta un motor de cálculo? → Verifica inputs/outputs del engine
   - ¿Afecta un componente? → Verifica props y estado
4. Aplica el fix mínimo necesario
5. Corre `npm run typecheck` para verificar que no introdujo errores
6. Explica qué cambió y por qué

IMPORTANTE: No refactorices código que no está relacionado con el bug.
