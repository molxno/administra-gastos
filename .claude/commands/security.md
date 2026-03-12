Actúa como un agente de seguridad especializado en aplicaciones web React/TypeScript.

Realiza una auditoría de seguridad del proyecto Tutor Financiero:

## Checklist de seguridad

### 1. Datos sensibles en cliente
- Busca datos financieros que no deberían estar en localStorage sin sanitizar
- Verifica que `tutor-financiero-store` no almacena datos que deberían estar cifrados
- Busca tokens, API keys, o secretos hardcodeados en el código fuente
- Revisa `.env` files y verifica que `.gitignore` los excluye

### 2. XSS y sanitización
- Busca uso de `dangerouslySetInnerHTML` — si existe, verifica que el input está sanitizado
- Verifica que inputs de usuario (montos, nombres, notas) se sanitizan antes de renderizar
- Busca `eval()`, `Function()`, `document.write()`, o inyección de scripts

### 3. Dependencias
- Corre `npm audit` para buscar vulnerabilidades conocidas
- Revisa las dependencias en package.json por versiones con CVEs conocidos
- Verifica que no hay dependencias innecesarias que amplíen la superficie de ataque

### 4. Validación de datos financieros
- Verifica que los engines validan inputs numéricos (no NaN, no Infinity, no negativos donde no aplica)
- Busca divisiones por cero potenciales en los motores de cálculo
- Verifica que los montos se manejan con precisión adecuada (no floating point issues en dinero)

### 5. Configuración de build
- Verifica que source maps no se incluyen en producción
- Revisa vite.config.ts por configuraciones inseguras
- Verifica headers de seguridad recomendados para el deploy

## Formato de reporte
Para cada hallazgo:
- 🔴 Crítico / 🟡 Medio / 🟢 Info
- Archivo y línea
- Descripción del riesgo
- Solución recomendada con código

Al final, da un score de seguridad 0-100 y las top 3 prioridades a resolver.
