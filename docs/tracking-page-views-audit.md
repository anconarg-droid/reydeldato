# Tracking de visitas generales (page views) – Rey del Dato

## Respuestas a la verificación

### 1. ¿Existe tracking global de page_view para reydeldato.cl?

**Sí**, pero con nombres distintos según la ruta:

- **Home (`/`)**: Se registra **`page_view_home`** (antes `site_visit`) desde el componente `TrackSiteVisit` en `app/page.tsx`. Se dispara **una vez por sesión** (ref para no duplicar).
- **Buscar (`/buscar`)**: Se registra **`page_view_search`** desde `TrackPageView` dentro de `BuscarClient`.
- **Comuna (`/[comuna]`)**: Se registra **`page_view_comuna`** desde `TrackPageView` dentro de `BuscarClient` cuando la página se carga con `initialComuna` (ruta `/[comuna]`).
- **Ficha emprendedor (`/emprendedor/[slug]`)**: Se registra **`vista_ficha`** vía `/api/track-view` (contador + evento) y **`page_view_profile`** vía `/api/event`.

### 2. En qué archivo se dispara

| Ruta | Archivo que dispara el evento |
|------|------------------------------|
| `/` | `app/page.tsx` → `components/TrackSiteVisit.tsx` |
| `/buscar` | `app/buscar/BuscarClient.tsx` → `components/TrackPageView.tsx` |
| `/[comuna]` | `app/[comuna]/page.tsx` (renderiza `BuscarClient` con `initialComuna`) → `BuscarClient.tsx` → `components/TrackPageView.tsx` |
| `/emprendedor/[slug]` | `app/emprendedor/[slug]/page.tsx` → `components/TrackView.tsx` (dispara `track-view` + `page_view_profile` vía `/api/event`) |

### 3. Qué evento se guarda exactamente

| Página | Evento en BD (`tipo_evento`) |
|--------|-----------------------------|
| Home | `page_view_home` |
| Buscar | `page_view_search` |
| Comuna | `page_view_comuna` |
| Ficha emprendedor | `vista_ficha` (track-view) y `page_view_profile` (event) |

Todos se persisten en la misma tabla (ver punto 4).

### 4. En qué tabla de Supabase se guarda

**Tabla:** `public.emprendedor_eventos`

Los eventos de page view no tienen emprendedor asociado; `emprendedor_id` puede ser `null` (p. ej. home, buscar, comuna). En la ficha de emprendedor, `emprendedor_id` se rellena.

### 5. Qué columnas usa

- **emprendedor_id**: UUID, nullable (FK a `emprendedores.id`). Null para page_view_home, page_view_search, page_view_comuna.
- **tipo_evento**: text. Valores: `page_view_home`, `page_view_search`, `page_view_comuna`, `page_view_profile`, `vista_ficha`, `whatsapp_click`, etc.
- **canal**: text. Para estos eventos se usa `"otros"`.
- **metadata**: jsonb. Incluye por ejemplo: `slug`, `comuna_slug`, `session_id`, `q`, etc.
- **created_at**: timestamptz (default `now()`).

### 6. ¿Hoy solo se guardan profile_view y no page_view general?

**No.** Además de la vista de ficha (`vista_ficha` y `page_view_profile`), desde esta implementación también se guardan:

- **page_view_home** en `/`
- **page_view_search** en `/buscar`
- **page_view_comuna** en `/[comuna]`

El diseño unificado incluye los eventos mínimos: `page_view_home`, `page_view_search`, `page_view_comuna`, `page_view_profile`, `whatsapp_click`, `instagram_click`, `website_click`, `email_click`, `share_click`. El evento `share_click` está aceptado en `/api/event`; falta conectar los botones "Compartir ficha" para que lo envíen.

---

## Query SQL para revisar últimos eventos (incl. home)

Ejecutar en el SQL Editor de Supabase para confirmar que la home y el resto de rutas están registrando visitas:

```sql
-- Últimos 200 eventos: tipo, canal, metadata (path/slug/comuna), fecha
SELECT
  id,
  emprendedor_id,
  tipo_evento,
  canal,
  metadata,
  created_at
FROM public.emprendedor_eventos
ORDER BY created_at DESC
LIMIT 200;
```

Para ver solo visitas a la home (reydeldato.cl/):

```sql
-- Solo eventos de página principal (home)
SELECT
  id,
  tipo_evento,
  canal,
  metadata->>'session_id' AS session_id,
  created_at
FROM public.emprendedor_eventos
WHERE tipo_evento = 'page_view_home'
ORDER BY created_at DESC
LIMIT 100;
```

Para un resumen por tipo de evento (últimos 7 días):

```sql
-- Conteo por tipo de evento (últimos 7 días)
SELECT
  tipo_evento,
  COUNT(*) AS total
FROM public.emprendedor_eventos
WHERE created_at >= now() - interval '7 days'
GROUP BY tipo_evento
ORDER BY total DESC;
```

Para comprobar que la home está registrando visitas, revisar que existan filas con `tipo_evento = 'page_view_home'` en la primera o tercera query.
