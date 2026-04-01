# `buscar_emprendedores_por_cobertura_v4` y columnas de plan

La función RPC **`buscar_emprendedores_por_cobertura_v4`** vive en Supabase (no está versionada en este repo).

Para que **`es_ficha_completa`** pueda calcularse **solo desde la respuesta del RPC**, el `SELECT` / tipo de retorno de la función debería incluir al menos:

- `plan_activo` (boolean)
- `plan_expira_at` (timestamptz)
- `trial_expira_at` (timestamptz)
- (opcional) `trial_expira` si aún usas la columna legacy

Hasta que eso exista en SQL, la página **`app/[comuna]/page.tsx`** hace un **`select`** puntual a **`public.emprendedores`** por los `id` devueltos por el RPC y fusiona esos campos antes de calcular `es_ficha_completa` y `estado_ficha`.
