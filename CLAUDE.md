# CLAUDE.md — Tutor Financiero Personal

## Proyecto
App web de finanzas personales que actúa como tutor financiero senior. Analiza, diagnostica, planifica y guía al usuario hacia la libertad financiera con números específicos, no consejos genéricos.

## Stack
- **React 18** + TypeScript (strict) + Vite v8
- **Tailwind CSS v4** via `@tailwindcss/vite` — NO hay `tailwind.config`, se usa `@import "tailwindcss"` en CSS
- **Zustand v5** con persist middleware → localStorage key: `tutor-financiero-store`
- **Recharts v3** para gráficas
- **React Router v7** para rutas

## Comandos
```bash
npm run dev            # Servidor de desarrollo (Vite)
npm run build          # TypeScript check + build producción
npm run typecheck      # Solo TypeScript check
npm run preview        # Preview del build
npm run test           # Correr todos los tests
npm run test:watch     # Tests en modo watch (desarrollo)
npm run test:coverage  # Tests con reporte de cobertura
npm run test:ci        # Tests + cobertura + verbose (CI)
npm run precommit      # typecheck + test:coverage (lo que corre el hook)
```

## Testing
- **Framework**: Vitest v4 (integrado con Vite)
- **Coverage**: @vitest/coverage-v8, umbral mínimo **80%** en statements, branches, functions y lines
- **Scope de cobertura**: `src/engines/**/*.ts` y `src/utils/**/*.ts`
- **Naming**: `*.test.ts` para lógica, `*.test.tsx` para componentes
- **Colocación**: Tests junto a los archivos fuente
- **Pre-commit hook**: Bloquea commits si typecheck falla o cobertura < 80%

## Gitflow

### Ramas
- `main` — Producción. Desplegado automáticamente en Vercel. **NO push directo.**
- `dev` — Desarrollo/integración. Todas las features se integran aquí primero.
- `feat/<nombre>` — Features nuevas (desde `dev`)
- `fix/<nombre>` — Bug fixes (desde `dev`)
- `refactor/<nombre>` — Refactorizaciones (desde `dev`)
- `hotfix/<nombre>` — Fixes urgentes para producción (desde `main`, merge a `main` Y `dev`)

### Flujo de trabajo
```
feat/mi-feature ──PR──▶ dev ──PR──▶ main (producción)
fix/mi-fix      ──PR──▶ dev ──PR──▶ main
hotfix/urgente  ──PR──▶ main + dev (solo emergencias)
```

1. **Crear rama**: `git checkout -b feat/mi-feature dev`
2. **Commits**: Usar Conventional Commits (validado por hook)
3. **Push**: `git push -u origin feat/mi-feature`
4. **PR a dev**: Crear PR, esperar review, merge
5. **Release**: Cuando dev está estable, PR de `dev → main`

### Conventional Commits (obligatorio)
```
<type>(<scope>): <descripción>
```
- **Types**: `feat`, `fix`, `refactor`, `perf`, `style`, `docs`, `test`, `chore`, `ci`
- **Scopes**: `engine`, `store`, `ui`, `onboarding`, `dashboard`, `budget`, `debts`, `goals`, `biweekly`, `emergency`, `transactions`, `insights`, `settings`, `deps`
- Hook en `.githooks/commit-msg` valida automáticamente
- Hook en `.githooks/pre-push` bloquea push directo a main

### Setup hooks (para nuevos clones)
```bash
git config core.hooksPath .githooks
```

## Arquitectura

### Directorio
```
src/
├── store/types.ts              # TODOS los tipos TypeScript
├── store/useFinancialStore.ts  # Zustand store central
├── engines/                    # 7 motores de cálculo (funciones puras)
├── components/
│   ├── layout/                 # Sidebar, Header, Layout
│   ├── onboarding/             # Wizard de 4 pasos
│   └── shared/                 # Card, ProgressBar, Alert, Modal, etc.
├── pages/                      # 9 páginas de la app
├── utils/                      # formatters.ts, constants.ts
├── App.tsx                     # Router + routing
├── main.tsx                    # Entry point
└── index.css                   # Tailwind + estilos globales
```

### Flujo de datos
1. Usuario llena datos en **Onboarding** (o edita en cualquier página)
2. Cada mutación llama `recalculate()` automáticamente
3. `recalculate()` ejecuta los 7 motores y actualiza `financialState`
4. Todas las páginas leen de `financialState` — nunca calculan directo

### Motores de cálculo (`src/engines/`)
| Archivo | Qué hace |
|---|---|
| `financialDiagnosis.ts` | Health score 0-100, alertas, recomendaciones con impacto numérico |
| `debtStrategy.ts` | Avalanche/Snowball, amortización completa, ahorro en intereses |
| `phaseGenerator.ts` | Genera fases automáticas según situación financiera |
| `budgetOptimizer.ts` | Presupuesto por fase actual y por categoría |
| `biweeklyPlanner.ts` | Distribución quincenal con checklist |
| `goalPlanner.ts` | Secuencial/paralelo, fechas estimadas |
| `emergencyFundCalculator.ts` | Proyección a 24 meses, niveles del fondo |

### Páginas y rutas
| Ruta | Componente | Qué muestra |
|---|---|---|
| `/` | Dashboard | Health score, fases, alertas, gráficas |
| `/presupuesto` | Budget | Distribución por categoría/fase |
| `/deudas` | Debts | Inventario, amortización, estrategia |
| `/metas` | Goals | Metas con progreso y fechas |
| `/quincenal` | BiweeklyPlan | Checklist por quincena |
| `/emergencia` | EmergencyFund | Termómetro, proyección |
| `/transacciones` | Transactions | Registro con filtros |
| `/insights` | Insights | Diagnóstico completo del tutor |
| `/configuracion` | Settings | Perfil, estrategias, reset |

## Reglas de negocio
- Deudas alto interés (>1.5%/mes) **SIEMPRE** se priorizan antes de ahorro para metas
- Fondo de emergencia se construye **DESPUÉS** de deuda de alto costo, **ANTES** de metas
- Deudas bajo interés (<0.5%/mes) se pueden pagar en paralelo con ahorro
- Siempre dejar colchón 3-5% del ingreso
- **NUNCA** sugerir pagar menos del mínimo de una deuda

## Convenciones de código
- Dark mode por defecto (bg-gray-950, text-gray-100)
- Colores semánticos: verde=positivo, rojo=peligro, amarillo=warning, azul=info, morado=metas
- Montos siempre formateados con `formatCurrency()` de `utils/formatters.ts`
- IDs generados con `nanoid()` de `components/shared/nanoid.ts`
- Recharts formatter: usar `(value: unknown) => [fmt(Number(value)), '']`
- Todo componente de UI compartido vive en `components/shared/`
- Español como idioma de la UI, locale configurable por usuario

## Comandos Claude Code (slash commands)

### Desarrollo
| Comando | Qué hace |
|---|---|
| `/project:dev` | Prepara entorno y levanta servidor de desarrollo |
| `/project:build` | Pipeline completo: typecheck + build producción |
| `/project:typecheck` | Verificación de tipos con diagnóstico detallado |
| `/project:fix <descripción>` | Diagnostica y arregla un bug específico |
| `/project:refactor <objetivo>` | Refactoriza código manteniendo interfaces |

### Agentes especializados
| Comando | Rol | Qué hace |
|---|---|---|
| `/project:security` | Agente de Seguridad | Auditoría: XSS, datos sensibles, deps, validación financiera |
| `/project:debug <problema>` | Agente de Debug | Diagnóstico sistemático: hipótesis, verificación, causa raíz |
| `/project:ui <tarea>` | Agente de UI | Revisión/implementación con design system del proyecto |
| `/project:test <tarea>` | Agente de Tests | Estrategia de testing, setup Vitest, escritura de tests |
| `/project:version <tarea>` | Agente de Versionamiento | Conventional commits, semver, releases, changelog |
| `/project:architecture <tarea>` | Agente de Arquitectura | Revisión estructural, flujo de datos, cambios a engines/store |
| `/project:deploy <tarea>` | Agente de Deploy | Vercel: pre-deploy checks, diagnóstico de fallos, optimización |

## Flujo de trabajo recomendado

### Antes de commitear
```bash
npm run typecheck    # Verificar tipos
npm run build        # Verificar build completo
```

### Antes de deploy
1. `/project:security` — auditoría rápida
2. `/project:build` — verificar build limpio
3. `/project:deploy verificar` — pre-deploy checklist

### Para nuevas features
1. `/project:architecture <plan>` — validar diseño
2. Implementar el código
3. `/project:test <feature>` — escribir tests
4. `/project:ui revisar` — verificar UI
5. `/project:version` — commit con conventional commits

## Gotchas
- Tailwind v4 usa `@import "tailwindcss"` — NO `@tailwind base/components/utilities`
- `@tailwindcss/vite` se configura en vite.config.ts como plugin, no hay postcss.config
- Zustand persist usa `partialize` para excluir `financialState` (se recalcula)
- `onRehydrateStorage` dispara `recalculate()` tras cargar de localStorage
- lightningcss debe estar explícito en devDependencies para Vercel (Linux binaries)
- Node >=20 requerido — version pinneada en `.nvmrc`
- Vercel necesita rewrite `/(.*) → /index.html` para SPA routing si hay 404 en rutas directas
- **Pre-commit hook** corre typecheck + tests con cobertura — commits bloqueados si < 80%
- Git hooks viven en `.githooks/` — nuevos clones necesitan `git config core.hooksPath .githooks`
- Vitest config está dentro de `vite.config.ts` (no archivo separado)
