# Planes: Perfil completo (mensual / semestral / anual)

Un solo producto: **Perfil completo**. Tres modalidades de pago: mensual, semestral, anual.

**Importante:** Los planes **no alteran el ranking** del buscador. Todos los emprendimientos siguen apareciendo igual en resultados. La diferencia del pago es la **calidad y completitud de la ficha**, no la posición.

---

## Estructura de base recomendada

### Campos en `public.emprendedores`

| Campo | Tipo | Uso |
|-------|------|-----|
| `trial_expira` | `timestamptz` | **Reutilizado.** Hasta cuándo tiene perfil completo (trial o pago). Al publicar: `created_at + 90 días`. Al activar plan pagado: se puede actualizar a `plan_expira_at` para tener una sola fecha de corte. |
| `plan` | `text` | **Mantener** (legacy). Valores: `trial`, `basico`, `premium`. Admin y lógica antigua. |
| `plan_tipo` | `text` | **Nuevo.** Tipo de producto. Valor: `perfil_completo`. Null = sin plan pagado. |
| `plan_periodicidad` | `text` | **Nuevo.** `mensual`, `semestral`, `anual`. Null durante trial o sin plan. |
| `plan_activo` | `boolean` | **Nuevo.** `true` si tiene suscripción pagada vigente (`plan_expira_at > now()`). Default `false`. |
| `plan_inicia_at` | `timestamptz` | **Nuevo.** Inicio del periodo actual (pago). Null en trial. |
| `plan_expira_at` | `timestamptz` | **Nuevo.** Fin del periodo actual. Para pago: fin del periodo contratado. |

### Reutilizar vs nuevos

- **Reutilizar:** `trial_expira` como “perfil completo válido hasta”. Al activar un plan pagado, conviene actualizar `trial_expira = plan_expira_at` para que la lógica actual (“¿trial_expira > now?”) siga siendo la única condición de “tiene perfil completo”.
- **Nuevos:** `plan_tipo`, `plan_periodicidad`, `plan_activo`, `plan_inicia_at`, `plan_expira_at` para el modelo de suscripción y para futura pasarela de pago.

---

## Lógica NUEVO / PERFIL COMPLETO / PERFIL BÁSICO

### NUEVO (primeros 90 días)

- **Condición:** `created_at` dentro de los últimos **90 días**.
- **Efecto:** Ficha completa (trial). Badge “🆕 Nuevo” si < 30 días.

### PERFIL COMPLETO (ficha completa)

Cualquiera de estas situaciones:

1. **Trial vigente:** `trial_expira > now()` (primeros 90 días o fecha extendida).
2. **Plan pagado vigente:** `plan_activo = true` **y** `plan_expira_at > now()`.
3. **Legacy:** `plan` = `activo` o `premium`.

En código: `getProfileState(created_at, plan, trial_expira, { planActivo, planExpiraAt })` → `isFullProfile === true`.

### PERFIL BÁSICO (ficha reducida)

- **Condición:** No es NUEVO (pasaron 90 días) **y** no tiene trial vigente **y** no tiene plan pagado vigente.
- **Efecto:** Solo foto, nombre, comuna, WhatsApp, descripción corta. Sin galería, mapa, web, Instagram, bloques avanzados.

---

## Flujo resumido

1. **Alta:** `plan = 'trial'`, `trial_expira = created_at + 90 días`. Resto de campos de plan en null/false.
2. **Durante trial:** Perfil completo por `trial_expira > now()`.
3. **Tras 90 días sin pagar:** `trial_expira` ya pasó → perfil básico.
4. **Al contratar (futuro):** Se setea `plan_tipo = 'perfil_completo'`, `plan_periodicidad`, `plan_activo = true`, `plan_inicia_at`, `plan_expira_at` y, si se desea una sola fecha de corte, `trial_expira = plan_expira_at`.
5. **Renovación / vencimiento:** Actualizar `plan_expira_at` (y opcionalmente `trial_expira`). Si no renueva, `plan_activo = false` y, si `trial_expira` ya no se actualiza, pasa a perfil básico.

---

## Constantes y tipos (código)

- `lib/planConstants.ts`: `PLAN_TIPO`, `PLAN_PERIODICIDADES`, `DIAS_POR_PERIODICIDAD`, `computePlanExpiraAt`.
- `lib/planEstado.ts`: **`getPlanEstado(input)`** → `'trial' | 'perfil_completo' | 'perfil_basico'`.
- `lib/profileState.ts`: `getProfileState(..., { planActivo, planExpiraAt, trialExpiraAt })` para UI (badges, borde, clickeable); usa `getPlanEstado` por dentro.

---

## Migración e inicialización

1. **Ejecutar:** `supabase/migrations/20260314_planes_perfil_completo.sql`
   - Añade: `plan_tipo`, `plan_periodicidad`, `plan_activo`, `plan_inicia_at`, `plan_expira_at`, `trial_inicia_at`, `trial_expira_at`.
   - Backfill: `trial_inicia_at = created_at`, `trial_expira_at = COALESCE(trial_expira, created_at + 90 days)`.

2. **Vista de ficha:** Si usas `vw_emprendedor_ficha`, incluir en el SELECT: `trial_inicia_at`, `trial_expira_at`, `plan_tipo`, `plan_periodicidad`, `plan_activo`, `plan_inicia_at`, `plan_expira_at`.

## Evitar que vuelva a romperse si una columna no existe

- **`/api/buscar`:** Primero hace el `select` **con** columnas de planes (`trial_inicia_at`, `trial_expira_at`, `plan_*`). Si el error contiene `does not exist`, repite el `select` **sin** esas columnas y mapea esos campos a `null`. Así la búsqueda sigue funcionando antes de aplicar la migración.
- **`/api/publicar`:** Primero intenta el `insert` **con** `trial_inicia_at` y `trial_expira_at`. Si falla por columna inexistente, repite el `insert` sin esos campos (solo `trial_expira`). Así publicar sigue funcionando sin migración.
- Tras aplicar la migración, ambas rutas usan ya el modelo completo sin fallback.
