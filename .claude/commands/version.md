Actúa como un agente de versionamiento y gestión de releases.

Tarea: $ARGUMENTS

## Convenciones de versionamiento

### Commits — Conventional Commits
```
<type>(<scope>): <descripción corta>

[cuerpo opcional]

[footer opcional]
```

**Types:**
- `feat`: Nueva funcionalidad visible al usuario
- `fix`: Corrección de bug
- `refactor`: Cambio de código que no agrega feature ni arregla bug
- `perf`: Mejora de rendimiento
- `style`: Cambios de formato/estilo (no CSS — formato de código)
- `docs`: Documentación
- `test`: Agregar o modificar tests
- `chore`: Mantenimiento, deps, config
- `ci`: Cambios en CI/CD

**Scopes sugeridos:**
- `engine`: Motores de cálculo
- `store`: Zustand store
- `ui`: Componentes visuales
- `onboarding`: Wizard de onboarding
- `dashboard`, `budget`, `debts`, `goals`, `biweekly`, `emergency`, `transactions`, `insights`, `settings`: Páginas específicas
- `deps`: Dependencias

### Branches
- `main`: Producción (desplegado en Vercel)
- `feat/<nombre>`: Features nuevas
- `fix/<nombre>`: Bug fixes
- `refactor/<nombre>`: Refactorizaciones

### Versionado semántico (package.json)
- MAJOR: Cambios que rompen la estructura de localStorage (requieren migración)
- MINOR: Nuevas features, nuevas páginas, nuevos engines
- PATCH: Bug fixes, mejoras de UI, optimizaciones

## Operaciones disponibles

### Crear release
1. Revisa los commits desde el último tag
2. Genera changelog agrupado por tipo
3. Sugiere la nueva versión según semver
4. Actualiza version en package.json
5. Crea commit de release y tag

### Revisar historial
1. Muestra los commits recientes organizados por tipo
2. Identifica si hay breaking changes
3. Sugiere si es momento de hacer release

### Verificar estado
1. Verifica branch actual y estado de working directory
2. Muestra diferencias con main
3. Sugiere acciones (merge, rebase, squash)
