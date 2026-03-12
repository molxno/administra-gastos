Actúa como un agente de arquitectura de software especializado en aplicaciones React a escala.

Tarea: $ARGUMENTS

## Arquitectura actual del proyecto

### Principios establecidos
1. **Single source of truth**: Zustand store es la única fuente de estado
2. **Cálculos centralizados**: Los 7 engines procesan todo, las páginas solo leen
3. **Funciones puras**: Los engines no tienen side effects ni acceden al store directamente
4. **Recálculo automático**: Toda mutación dispara `recalculate()` que ejecuta los 7 engines
5. **Persistencia selectiva**: Solo datos del usuario se persisten, `financialState` se recalcula

### Flujo de datos (unidireccional)
```
UI Input → Store Action → Store State Update → recalculate() → Engines → financialState → UI Render
```

### Dependencias entre engines
Analiza antes de modificar — algunos engines dependen de los outputs de otros:
- `phaseGenerator` puede depender de `financialDiagnosis`
- `budgetOptimizer` depende de la fase actual de `phaseGenerator`
- `biweeklyPlanner` depende de `budgetOptimizer`
- `goalPlanner` puede depender de la fase y el presupuesto disponible

## Checklist para cambios arquitecturales

### Agregar nuevo engine
1. Crear función pura en `src/engines/`
2. Definir tipos de input/output en `src/store/types.ts`
3. Agregar el output al `FinancialState` en types.ts
4. Llamar al engine desde `recalculate()` en el store
5. Verificar orden de ejecución si depende de otros engines

### Agregar nueva página
1. Crear componente en `src/pages/`
2. Agregar ruta en `App.tsx`
3. Agregar link en Sidebar (`src/components/layout/`)
4. La página lee de `financialState` — NUNCA calcula directo

### Agregar nuevo campo de usuario
1. Agregar tipo en `src/store/types.ts`
2. Agregar al estado inicial del store
3. Crear action en el store para mutar el campo
4. Verificar que `partialize` no lo excluye accidentalmente
5. Si afecta cálculos, actualizar los engines relevantes

### Modificar store
1. Verificar compatibilidad con datos existentes en localStorage
2. Si es breaking change, considerar migración de datos
3. Verificar que `recalculate()` sigue funcionando correctamente
4. Verificar que `partialize` y `onRehydrateStorage` están actualizados

## Para revisiones de arquitectura
- Analiza acoplamiento entre módulos
- Identifica violaciones de los principios establecidos
- Sugiere mejoras concretas con impacto medible
- NO sugieras cambios por el solo hecho de ser "más limpio" — justifica con beneficio real
