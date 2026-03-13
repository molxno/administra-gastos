# Tutor Financiero Personal

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Tests](https://img.shields.io/badge/tests-passing-brightgreen.svg)](#testing)
[![Coverage](https://img.shields.io/badge/coverage-%E2%89%A580%25-brightgreen.svg)](#testing)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-blue.svg)](tsconfig.json)

App web de finanzas personales que actúa como un **tutor financiero senior**. No es un simple tracker de gastos — es un sistema inteligente que analiza tu situación, diagnostica problemas, genera planes automáticos y te guía paso a paso hacia la libertad financiera con **números específicos, no consejos genéricos**.

> 100% client-side. Tus datos nunca salen de tu navegador.

---

## Características

| Feature | Descripción |
|---|---|
| Diagnóstico financiero | Puntaje de salud 0-100, alertas, fortalezas y debilidades |
| Estrategia de deuda | Avalanche o Snowball con amortización completa y ahorro en intereses |
| Fases automáticas | Roadmap personalizado: deuda → fondo emergencia → metas → libertad |
| Plan quincenal | Checklist por quincena con distribución óptima de pagos |
| Metas financieras | Modo secuencial o paralelo con fechas estimadas |
| Fondo de emergencia | Proyección a 24 meses con niveles y termómetro visual |
| Presupuesto por fase | El presupuesto cambia dinámicamente según tu fase actual |
| Insights del tutor | Recomendaciones con impacto numérico calculado |

## Demo

Abre la app → el wizard de onboarding te guía por la configuración inicial → el dashboard muestra tu diagnóstico completo.

---

## Tech Stack

| Tecnología | Versión | Uso |
|---|---|---|
| React | 18 | UI components |
| TypeScript | 5 (strict) | Type safety |
| Vite | 6 | Build tool + dev server |
| Tailwind CSS | 4 | Estilos (dark mode first) |
| Zustand | 5 | Estado global + persistencia localStorage |
| Recharts | 3 | Gráficas interactivas |
| React Router | 7 | Client-side routing |
| Vitest | 4 | Testing + coverage |

## Arquitectura

```
src/
├── engines/           # 7 motores de cálculo (funciones puras, 95%+ coverage)
│   ├── financialDiagnosis.ts    # Health score, alertas, recomendaciones
│   ├── debtStrategy.ts          # Avalanche/Snowball + amortización
│   ├── phaseGenerator.ts        # Genera fases automáticas
│   ├── budgetOptimizer.ts       # Presupuesto por fase y categoría
│   ├── biweeklyPlanner.ts       # Distribución quincenal
│   ├── goalPlanner.ts           # Metas secuencial/paralelo
│   └── emergencyFundCalculator.ts  # Proyección fondo emergencia
├── store/             # Zustand store central + tipos TypeScript
├── components/        # UI: layout, onboarding wizard, shared components
├── pages/             # 9 páginas de la app
└── utils/             # Formatters, constantes
```

**Flujo de datos (unidireccional):**
```
UI Input → Store Action → recalculate() → 7 Engines → financialState → UI Render
```

Cada mutación dispara `recalculate()` que ejecuta los 7 motores y actualiza el estado. Las páginas solo leen de `financialState`, nunca calculan directo.

---

## Inicio rápido

### Prerequisitos

- Node.js 22.x (ver versión exacta en [.nvmrc](.nvmrc))
- npm

### Instalación

```bash
# 1. Clonar el repo
git clone https://github.com/molxno/administra-gastos.git
cd administra-gastos

# 2. Instalar dependencias
npm install

# 3. Configurar git hooks (IMPORTANTE)
git config core.hooksPath .githooks

# 4. Iniciar servidor de desarrollo
npm run dev
```

Abre `http://localhost:5173`

### Scripts disponibles

```bash
npm run dev            # Servidor de desarrollo (Vite)
npm run build          # TypeScript check + build producción
npm run typecheck      # Solo verificación de tipos
npm run preview        # Preview del build de producción
npm run test           # Correr todos los tests
npm run test:watch     # Tests en modo watch (desarrollo)
npm run test:coverage  # Tests con reporte de cobertura
npm run precommit      # Lo que corre el pre-commit hook
```

---

## Testing

- **Framework:** Vitest v4 (integrado con Vite)
- **Coverage:** @vitest/coverage-v8
- **Umbral mínimo:** 80% en statements, branches, functions y lines
- **113 tests** cubriendo los 7 engines + utils

```bash
npm run test:coverage
```

```
-------------------|---------|----------|---------|---------|
File               | % Stmts | % Branch | % Funcs | % Lines |
-------------------|---------|----------|---------|---------|
All files          |   94.97 |    90.76 |   97.46 |   94.89 |
-------------------|---------|----------|---------|---------|
```

El pre-commit hook bloquea commits si la cobertura cae por debajo del 80%.

---

## Gitflow

Este proyecto usa un flujo de ramas estricto para mantener `main` estable.

### Ramas

| Rama | Propósito | Protección |
|---|---|---|
| `main` | Producción (deploy Vercel) | Protegida. Solo vía PR desde `dev`. Requiere review. |
| `dev` | Integración/desarrollo | Protegida. Solo vía PR desde feature branches. |
| `feat/<nombre>` | Features nuevas | Creada desde `dev` |
| `fix/<nombre>` | Bug fixes | Creada desde `dev` |
| `refactor/<nombre>` | Refactorizaciones | Creada desde `dev` |
| `hotfix/<nombre>` | Fixes urgentes producción | Creada desde `main`, merge a `main` Y `dev` |

### Flujo de trabajo

```
feat/mi-feature ──PR──▶ dev ──PR──▶ main (producción)
fix/mi-fix      ──PR──▶ dev ──PR──▶ main
hotfix/urgente  ──PR──▶ main + dev (solo emergencias)
```

**Para contribuir:**

```bash
# 1. Crear rama desde dev
git checkout dev
git pull origin dev
git checkout -b feat/mi-feature

# 2. Hacer cambios y commits (Conventional Commits obligatorio)
git commit -m "feat(engine): add inflation adjustment"

# 3. Push y crear PR
git push -u origin feat/mi-feature
# Crear PR hacia dev en GitHub
```

### Conventional Commits (obligatorio)

Todos los commits deben seguir el formato:

```
<type>(<scope>): <descripcion>
```

**Types:** `feat`, `fix`, `refactor`, `perf`, `style`, `docs`, `test`, `chore`, `ci`

**Scopes:** `engine`, `store`, `ui`, `onboarding`, `dashboard`, `budget`, `debts`, `goals`, `biweekly`, `emergency`, `transactions`, `insights`, `settings`, `deps`

El hook `commit-msg` valida esto automáticamente. Commits que no cumplan el formato serán rechazados.

### Git Hooks

Los hooks viven en `.githooks/` y se activan con:

```bash
git config core.hooksPath .githooks
```

| Hook | Qué hace |
|---|---|
| `pre-commit` | Corre typecheck + tests con cobertura >= 80% |
| `commit-msg` | Valida formato Conventional Commits |
| `pre-push` | Bloquea push directo a `main` |

---

## Contribuir

Lee [CONTRIBUTING.md](CONTRIBUTING.md) para la guía completa.

**TL;DR:**

1. Fork el repo
2. Crea una rama desde `dev`: `git checkout -b feat/mi-feature dev`
3. Configura hooks: `git config core.hooksPath .githooks`
4. Haz tus cambios con Conventional Commits
5. Asegura que `npm run precommit` pasa (typecheck + tests + 80% coverage)
6. Crea un PR hacia `dev`
7. Espera review de un maintainer

### Reglas de negocio (respeta estas invariantes)

- Deudas alto interés (>1.5%/mes) **SIEMPRE** se priorizan antes de ahorro para metas
- Fondo de emergencia se construye **DESPUÉS** de deuda de alto costo, **ANTES** de metas
- **NUNCA** sugerir pagar menos del mínimo de una deuda
- Siempre dejar colchón 3-5% del ingreso
- Engines son funciones puras — sin side effects, sin acceso al store

---

## Estructura del proyecto

```
.
├── .claude/            # Claude Code config: commands y settings
│   └── commands/       # 12 slash commands (agentes especializados)
├── .githooks/          # Git hooks (CC validation, coverage gate, push protection)
├── .github/            # Issue templates, PR template
├── src/
│   ├── engines/        # 7 motores de cálculo + tests
│   ├── store/          # Zustand store + tipos TypeScript
│   ├── components/     # UI components
│   ├── pages/          # 9 páginas
│   └── utils/          # Helpers + tests
├── CLAUDE.md           # Instrucciones para Claude Code
├── CONTRIBUTING.md     # Guía de contribución
└── LICENSE             # MIT License
```

---

## Roadmap

- [ ] PWA + offline support
- [ ] Export/import de datos (JSON)
- [ ] Gráficas de progreso histórico
- [ ] Soporte multi-moneda
- [ ] Modo comparación de estrategias (avalanche vs snowball side-by-side)
- [ ] Notificaciones de pagos próximos
- [ ] i18n (English)

---

## Licencia

Este proyecto está bajo la [Licencia MIT](LICENSE). Eres libre de usar, modificar y distribuir este software.

---

## Créditos

Construido con React, TypeScript, y mucho café.

Si este proyecto te ayuda con tus finanzas, considera darle una estrella en GitHub.
