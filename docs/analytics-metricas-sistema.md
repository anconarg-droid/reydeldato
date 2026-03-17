# Sistema de métricas – Rey del Dato

## A. Tablas existentes vs nuevas

| Tabla | Estado | Uso |
|-------|--------|-----|
| **emprendedor_eventos** | Existía antes | Antes: todos los eventos. **Ya no se escribe** desde el nuevo flujo; las lecturas del panel/estadísticas pasan a `analytics_events` y `emprendedor_stats`. |
| **emprendedores** (vistas_ficha, click_*) | Existía | Se siguen actualizando desde `track-click` y `track-view` por compatibilidad; el panel y estadísticas leen de `emprendedor_stats`. |
| **analytics_events** | **Nueva** (migración 20260315) | Cada evento individual (page views, clicks, impresiones, share). |
| **emprendedor_stats** | **Nueva** (migración 20260315) | Resumen acumulado por emprendedor. |
| **site_stats_daily** | **Nueva** (migración 20260315) | Resumen diario del sitio (por fecha). |

No existían tablas con nombre `analytics_events`, `emprendedor_stats` ni `site_stats_daily` antes de esta migración.

---

## B. Qué está implementado hoy

- **Eventos mínimos** aceptados y guardados en `analytics_events`:  
  `page_view_home`, `page_view_search`, `page_view_comuna`, `page_view_profile`, `search_result_impression`, `whatsapp_click`, `instagram_click`, `website_click`, `email_click`, `share_click`.
- **Un solo flujo de registro**:  
  - Inserción en `analytics_events`.  
  - Actualización atómica de `emprendedor_stats` (por evento y emprendedor).  
  - Actualización atómica de `site_stats_daily` (por día y tipo de evento).
- **Rutas que escriben en el nuevo sistema**:
  - `POST /api/event` → `recordEvent()` → `analytics_events` + resúmenes.
  - `POST /api/analytics` → mismo flujo (recomendado para nuevos usos).
  - `POST /api/track-view` → `recordEvent("page_view_profile")`.
  - `POST /api/track-click` → actualiza `emprendedores` + `recordEvent(whatsapp_click | instagram_click | website_click | email_click)`.
  - `POST /api/track-impression` → actualiza `emprendedores.impresiones_busqueda` + `recordEvent("search_result_impression")` por slug.
- **Panel y estadísticas** leen de `emprendedor_stats` y, para actividad reciente, de `analytics_events`.

---

## C. Qué faltaba crear o migrar

- **Creado**:
  - Tablas `analytics_events`, `emprendedor_stats`, `site_stats_daily` (migración `20260315_analytics_metrics.sql`).
  - Funciones SQL `increment_emprendedor_stat`, `increment_site_stat_daily`.
  - `lib/analytics/recordEvent.ts` (registro unificado + actualización de resúmenes).
  - `POST /api/analytics` y refactor de `POST /api/event` para usar `recordEvent`.
  - Refactor de `track-view`, `track-click`, `track-impression` para escribir en el nuevo sistema.
  - Botón "Compartir ficha" con evento `share_click` (`ShareFichaButton`).
- **Migración de datos**: opcional. Los datos antiguos siguen en `emprendedor_eventos`; el panel y las estadísticas usan ya `emprendedor_stats` y `analytics_events`. Si se quiere histórico en las nuevas tablas, se puede hacer un script que lea `emprendedor_eventos` y rellene `analytics_events` y luego recalcule `emprendedor_stats` y `site_stats_daily` (no incluido en esta migración).

---

## D. Migración SQL exacta

Archivo: **`supabase/migrations/20260315_analytics_metrics.sql`**.

Incluye:

1. **Crear `analytics_events`**: `id`, `event_type`, `emprendedor_id`, `session_id`, `metadata`, `created_at`; índices y comentarios.
2. **Crear `emprendedor_stats`**: PK `emprendedor_id`, columnas `page_view_profile`, `search_result_impression`, `whatsapp_click`, `instagram_click`, `website_click`, `email_click`, `share_click`, `updated_at`.
3. **Crear `site_stats_daily`**: PK `stat_date`, columnas `page_view_home`, `page_view_search`, `page_view_comuna`, `page_view_profile`, `search_result_impression`.
4. **RLS** con políticas de acceso total (la app usa service role).
5. **Funciones** `increment_emprendedor_stat(p_emprendedor_id, p_column)` e `increment_site_stat_daily(p_stat_date, p_column)` para incremento atómico.

Ejecutar en Supabase (SQL Editor o CLI): el contenido de ese archivo.

---

## E. Dónde se dispara cada evento

| Evento | Dónde se dispara |
|--------|-------------------|
| **page_view_home** | `app/page.tsx` → `TrackSiteVisit` → `POST /api/event` con `event_type: "page_view_home"`. |
| **page_view_search** | `app/buscar/BuscarClient.tsx` → `TrackPageView` con `eventType="page_view_search"` (sin `initialComuna`) → `POST /api/event`. |
| **page_view_comuna** | `app/[comuna]/page.tsx` (renderiza `BuscarClient` con `initialComuna`) → `TrackPageView` con `eventType="page_view_comuna"` → `POST /api/event`. |
| **page_view_profile** | `app/emprendedor/[slug]/page.tsx` → `TrackView` → `POST /api/track-view` (que llama a `recordEvent("page_view_profile")`). |
| **search_result_impression** | `components/search/PublicSearchResults.tsx` → `TrackImpressions` → `POST /api/track-impression` (por cada slug en resultados). |
| **whatsapp_click** | Ficha: `TrackedActionButton` type="whatsapp" → `POST /api/track-click`. Tarjetas de búsqueda: `PublicSearchResults` (enlace WhatsApp) → `POST /api/event` con `event_type: "whatsapp_click"`. |
| **instagram_click** | Ficha: `TrackedActionButton` type="instagram" → `POST /api/track-click`. |
| **website_click** | Ficha: `TrackedActionButton` type="web" → `POST /api/track-click`. |
| **email_click** | Ficha: `TrackedActionButton` type="email" → `POST /api/track-click`. |
| **share_click** | Ficha: `ShareFichaButton` (dos ubicaciones en `app/emprendedor/[slug]/page.tsx`) → `POST /api/analytics` con `event_type: "share_click"`. |

---

## F. Resumen de correcciones al tracking

- **Page views**: Home, búsqueda, comuna y ficha registran en `analytics_events` y actualizan `site_stats_daily` (y `emprendedor_stats` solo `page_view_profile`).
- **Clicks** (WhatsApp, Instagram, Web, Email): Siguen yendo por `POST /api/track-click`; además se llama a `recordEvent` con el `event_type` correspondiente, actualizando `emprendedor_stats` y escribiendo en `analytics_events`.
- **Share**: Los botones "Compartir ficha" usan `ShareFichaButton` y envían `share_click` a `/api/analytics`, actualizando `emprendedor_stats` y `analytics_events`.
- **Impresiones**: `track-impression` sigue actualizando `emprendedores.impresiones_busqueda` y además registra `search_result_impression` por slug vía `recordEvent`, actualizando `emprendedor_stats` y `site_stats_daily`.
- **Panel** y **estadísticas por emprendedor** leen totales de `emprendedor_stats` y actividad reciente de `analytics_events`.

Todo el registro de eventos pasa por `recordEvent()`, que centraliza: insert en `analytics_events` + incremento en `emprendedor_stats` (si aplica) + incremento en `site_stats_daily` (por día).
