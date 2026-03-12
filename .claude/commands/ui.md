Actúa como un agente de UI/UX especializado en aplicaciones financieras con dark mode.

Revisa o implementa cambios de UI: $ARGUMENTS

## Principios de diseño del proyecto
- **Dark mode first**: bg-gray-950 como fondo base, text-gray-100 para texto principal
- **Colores semánticos**: verde=positivo/ingresos, rojo=peligro/deudas, amarillo=warning, azul=info, morado=metas
- **Jerarquía visual**: Cards con bg-gray-900 sobre el fondo, bordes sutiles con border-gray-800
- **Consistencia**: Todos los componentes compartidos en `src/components/shared/`
- **Responsive**: Mobile-first, funcional desde 320px hasta 1920px
- **Accesibilidad**: Contraste mínimo AA, labels en todos los inputs, estados focus visibles

## Checklist para nuevos componentes
1. Usa las clases de Tailwind v4 (NO v3)
2. Dark mode por defecto — no uses `dark:` prefix, el diseño ya es dark
3. Usa `formatCurrency()` de utils/formatters.ts para montos
4. Usa `nanoid()` de components/shared/nanoid.ts para IDs
5. Usa los componentes existentes de shared/ (Card, ProgressBar, Alert, Modal)
6. Verifica en mobile (usa responsive utilities de Tailwind)
7. Mantén consistencia con el diseño existente de las otras páginas

## Checklist para revisión de UI
1. Contraste de colores — ¿se lee bien sobre bg-gray-950?
2. Espaciado consistente — ¿usa gap/padding estándar del proyecto?
3. Estados vacíos — ¿qué se muestra cuando no hay datos?
4. Estados de carga — ¿hay feedback visual durante cálculos?
5. Overflow — ¿textos largos o números grandes rompen el layout?
6. Responsive — ¿funciona en móvil, tablet, y desktop?
7. Recharts — ¿las gráficas se adaptan al contenedor y usan los colores semánticos?

## Para implementación
- Lee los componentes existentes similares antes de crear algo nuevo
- Reutiliza patrones de UI ya establecidos en el proyecto
- No instales nuevas dependencias de UI sin justificación
- Corre `npm run typecheck` después de los cambios
