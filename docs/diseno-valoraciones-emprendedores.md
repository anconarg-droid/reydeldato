# Diseño técnico — Valoraciones con estrellas (Rey del Dato)

## Nota importante (estado)

- **Requiere migración de base de datos** (tablas nuevas + índices + funciones auxiliares).
- **No se activa en el MVP inmediato**: este documento es solo diseño.
- **No afecta ranking ni orden territorial**: no se usa para ordenar resultados ni para rotación/ranking actuales.
- **Se implementará solo después de validar contactos reales** (p. ej. evidencia de interacción real vía WhatsApp).

---

## Objetivo de producto

Incorporar valoraciones con estrellas (1–5) para emprendedores, **evitando abuso** y sin romper el comportamiento actual de búsqueda/ranking.

---

## Reglas de producto (actualizadas)

1. **No permitir valoraciones abiertas anónimas** (no “cualquiera puede votar sin prueba”).
2. Un usuario solo puede valorar si tuvo interacción previa con el emprendimiento.
3. **Interacción válida inicial (única por ahora)**:
   - **click en WhatsApp**
4. Un usuario puede tener **solo 1 valoración por emprendimiento**.
5. Puede **editar** su valoración (upsert), no duplicarla.
6. No usar promedio simple como score principal.
7. Usar score ponderado tipo IMDb para evitar que un negocio con 1 voto quede arriba.
8. No usar valoraciones todavía para ranking territorial.
9. No favorecer pagados por rating.
10. No romper búsqueda actual.

---

## Enfoque técnico (MVP de valoraciones, con anti-abuso)

Como **no hay login garantizado**, el sistema usa una identidad “viewer” (cookie estable) emitida y validada **server-side**.

- **`viewer_id`**: identificador estable (UUID) persistido en cookie **firmada** (o alternativa equivalente).
- Se permiten writes **solo desde backend** (API routes), usando Supabase service role.
- **Prerequisito**: existencia de una interacción previa registrada de tipo `click_whatsapp` para el mismo `viewer_id` y `emprendedor_id`.

---

## Modelo de datos (propuesto)

### 1) Interacciones: `public.emprendedor_interacciones`

Evidencia mínima para habilitar valoración.

- `tipo` soportado por ahora:
  - `click_whatsapp`

### 2) Valoraciones: `public.emprendedor_valoraciones`

- 1 fila por `(emprendedor_id, viewer_id)` con `estrellas` (1..5)
- Editable (update) sin duplicar.

---

## Migración SQL propuesta (Supabase / Postgres)

```sql
-- 1) Interacciones mínimas (prerrequisito para poder valorar)
create table if not exists public.emprendedor_interacciones (
  id bigserial primary key,
  emprendedor_id uuid not null references public.emprendedores(id) on delete cascade,
  viewer_id uuid not null, -- id anónimo estable (cookie)
  tipo text not null check (tipo in ('click_whatsapp')),
  created_at timestamptz not null default now()
);

create index if not exists emprendedor_interacciones_lookup
  on public.emprendedor_interacciones (emprendedor_id, viewer_id, tipo, created_at desc);

-- 2) Valoración (1 por viewer por emprendedor, editable)
create table if not exists public.emprendedor_valoraciones (
  id bigserial primary key,
  emprendedor_id uuid not null references public.emprendedores(id) on delete cascade,
  viewer_id uuid not null, -- debe ser el mismo viewer_id usado en interacciones
  estrellas smallint not null check (estrellas between 1 and 5),
  comentario text null, -- NO habilitar aún en UI (ver sección "Qué NO implementar todavía")
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists emprendedor_valoraciones_unique
  on public.emprendedor_valoraciones (emprendedor_id, viewer_id);

create index if not exists emprendedor_valoraciones_by_emprendedor
  on public.emprendedor_valoraciones (emprendedor_id, created_at desc);

-- 3) Updated_at
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists trg_valoraciones_updated_at on public.emprendedor_valoraciones;
create trigger trg_valoraciones_updated_at
before update on public.emprendedor_valoraciones
for each row execute function public.set_updated_at();
```

---

## RLS / permisos (recomendado para este MVP)

Como el requisito de “interacción real” se valida server-side y no queremos writes “abiertos”:

1. **Habilitar RLS**.
2. **Denegar acceso directo** a tablas crudas para `anon`/`authenticated`.
3. Hacer writes/reads vía API routes con service role.

```sql
alter table public.emprendedor_interacciones enable row level security;
alter table public.emprendedor_valoraciones enable row level security;

revoke all on public.emprendedor_interacciones from anon, authenticated;
revoke all on public.emprendedor_valoraciones from anon, authenticated;
```

---

## Endpoints recomendados (Next.js + Vercel)

### POST `/api/emprendedor/[slug]/rating`

**Propósito**: crear o editar una valoración (upsert).

**Validaciones server-side**:
- Resolver `emprendedor_id` por `slug`.
- Obtener `viewer_id` desde cookie firmada (o crearla si no existe).
- Verificar prerequisito:
  - existe `emprendedor_interacciones` para `(viewer_id, emprendedor_id, tipo='click_whatsapp')`
  - opcional: dentro de una ventana de tiempo (ej. 30 días).

**Escritura**:
- Upsert en `emprendedor_valoraciones` por unique `(emprendedor_id, viewer_id)`.

### GET `/api/emprendedor/[slug]/rating-summary`

**Propósito**: entregar resumen para UI pública:
- Conteo de votos \(v\)
- Promedio simple \(R\) (solo informativo)
- Score ponderado \(WR\) (principal para mostrar)
- Distribución 1..5 (opcional)

---

## Score ponderado (tipo IMDb)

No usar promedio simple como score principal.

Definiciones:
- \(R\): promedio de estrellas del emprendedor
- \(v\): cantidad de votos del emprendedor
- \(C\): promedio global del sitio (misma métrica, sobre todas las valoraciones)
- \(m\): umbral mínimo (ej. 5 o 10)

\[
WR = \frac{v}{v+m}R + \frac{m}{v+m}C
\]

Recomendación inicial:
- \(m = 10\) (ajustable)
- \(C\) global del sitio (no segmentar por comuna/categoría todavía)

---

## UI mínima sugerida

En la ficha pública `/emprendedor/[slug]`:

- Mostrar:
  - Estrellas promedio (informativo) + conteo: “4.6 (23)”
  - Score ponderado (si se decide mostrarlo explícitamente) o usarlo internamente para “calificación”
- CTA:
  - “Valorar este emprendimiento”
- Estado si no cumple prerequisito:
  - “Para valorar, primero contáctalo por WhatsApp.”

Formulario:
- Selector 1–5 estrellas
- Botón “Guardar” / “Actualizar”

---

## Riesgos de abuso y mitigaciones

- **Bots / scripts**:
  - Writes solo server-side
  - Rate limit por IP/UA + por emprendedor
- **Multi-voto cambiando cookie**:
  - Prerrequisito “click WhatsApp” (más costoso de simular)
  - Ventana de tiempo para interacción válida (ej. 30 días)
  - Límites por IP: “máx N ratings por día”
- **Brigading**:
  - Detección de picos (observabilidad/alertas)
  - No usar para ranking por ahora

---

## Qué NO implementar todavía

- No usar ratings para ranking/orden en búsqueda o ranking territorial.
- No reviews con texto, fotos, ni respuestas públicas (moderación costosa).
- No badges “Top”, “Mejor evaluado”, “Tendencia”, etc.
- No segmentar \(C\) y \(m\) por comuna/categoría.
- No exponer tablas crudas públicamente (solo resumen agregado).

