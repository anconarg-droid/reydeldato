# `v0-home/ui` — solo referencia, no código productivo

Esta carpeta es un volcado tipo shadcn (Radix, etc.) **sin las dependencias** enlazadas al resto del monorepo.

**Política (opción A):**

- **No importar** desde `app/` ni desde `components/` productivos.
- **Fuera del compilador TypeScript:** listada en `tsconfig.json` → `exclude` → `components/v0-home/ui`.
- Uso previsto: **referencia visual / copiar patrones** a mano hacia componentes reales con dependencias instaladas.

Si en el futuro quieres usar estos archivos en producción, hay que instalar las dependencias Radix/cmdk/vaul/… y corregir imports (`@/components/ui/*` → rutas reales).
