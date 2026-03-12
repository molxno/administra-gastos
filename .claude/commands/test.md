Actúa como un agente de testing especializado en React + TypeScript.

Tarea: $ARGUMENTS

## Estrategia de testing para este proyecto

### Motores de cálculo (src/engines/) — PRIORIDAD ALTA
Los engines son funciones puras, ideales para unit tests:
- `financialDiagnosis.ts` → test con distintos perfiles (sin deudas, muy endeudado, equilibrado)
- `debtStrategy.ts` → test avalanche vs snowball, edge cases (0 deudas, 1 deuda, muchas)
- `phaseGenerator.ts` → test que genera fases correctas según situación
- `budgetOptimizer.ts` → test que presupuesto no excede ingresos
- `biweeklyPlanner.ts` → test distribución quincenal suma correctamente
- `goalPlanner.ts` → test secuencial vs paralelo, fechas coherentes
- `emergencyFundCalculator.ts` → test proyección y niveles

### Reglas de negocio — CRÍTICO
- Deudas >1.5%/mes se priorizan antes de ahorro
- Fondo de emergencia después de deuda alta, antes de metas
- Nunca sugerir pagar menos del mínimo
- Colchón de 3-5% del ingreso siempre presente

### Store (src/store/) — PRIORIDAD MEDIA
- Test que recalculate() se dispara en cada mutación
- Test que persist excluye financialState
- Test de rehydration desde localStorage

### Componentes — PRIORIDAD BAJA (solo si se pide)
- Test de rendering sin errores
- Test de interacciones clave (onboarding flow, agregar deuda, etc.)

## Setup de testing
Si no existe configuración de tests:
1. Sugiere instalar Vitest (compatible con Vite) + @testing-library/react
2. Configura vitest en vite.config.ts
3. Crea archivos de test junto a los archivos fuente (colocación)
4. Naming: `*.test.ts` para engines, `*.test.tsx` para componentes

## Formato de tests
```typescript
import { describe, it, expect } from 'vitest'

describe('NombreDelModulo', () => {
  describe('nombreDeLaFuncion', () => {
    it('should [comportamiento esperado] when [condición]', () => {
      // Arrange → Act → Assert
    })
  })
})
```

Siempre corre los tests después de escribirlos para verificar que pasan.
