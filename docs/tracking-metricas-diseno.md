# Diseño: Sistema de tracking y métricas (Rey del Dato)

## Objetivo
Medir actividad de la plataforma y por emprendimiento, **sin** que estas métricas alteren el ranking justo de búsqueda (solo informativas).

---

## 1. Archivos a tocar

| Área | Archivo | Cambio |
|------|---------|--------|
| **SQL** | Tabla existente: `public.emprendedor_eventos` | Ver estructura en documentación / migraciones |
| **API** | `app/api/event/route.ts` | POST unificado para registrar eventos en `emprendedor_eventos` |
| **API** | `app/api/track-impression/route.ts` | Además de actualizar `impresiones_busqueda`, insertar evento `search_result_impression` en `emprendedor_eventos` (opcional comuna_slug, sector_slug, q) |
| **API** | `app/api/track-view/route.ts` | Además de lo actual, insertar `vista_ficha` en `emprendedor_eventos` |
| **API** | `app/api/track-click/route.ts` | Además de lo actual, insertar `click` con canal en `emprendedor_eventos` |
| **API** | `app/api/track-search/route.ts` | Además de `busquedas_log`, insertar `search_performed` en `emprendedor_eventos` |
| **API** | `app/api/emprendedor/[slug]/estadisticas/route.ts` | Leer conteos desde `emprendedor_eventos` (y mantener histórico desde `emprendedores` si se desea) |
| **Cliente** | `components/TrackImpressions.tsx` | Enviar `comuna_slug`, `sector_slug`, `q` en el body para que el backend los guarde en eventos |
| **Cliente** | `components/TrackView.tsx` | Opcional: enviar `session_id` (desde hook/context) |
| **Cliente** | `components/search/PublicSearchResults.tsx` | Registrar `card_click` al hacer clic en el enlace a la ficha (onClick en el Link) |
| **Cliente** | `app/page.tsx` o layout | Componente cliente que envíe `site_visit` una vez por sesión (ej. con `TrackSiteVisit`) |
| **Utilidad** | `lib/sessionId.ts` | Hook o utilidad para obtener/crear `session_id` (localStorage) y pasarlo a los eventos |

---

## 2. Tabla(s) a crear

### `emprendedor_eventos` (tabla existente)
Una sola tabla para todos los eventos de tracking.

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | uuid | PK, `gen_random_uuid()` |
| `emprendedor_id` | uuid | Nullable, FK a `emprendedores.id` |
| `tipo_evento` | text | Ver lista de eventos abajo (site_visit, search_performed, vista_ficha, search_result_impression, card_click, click, etc.) |
| `canal` | text | Ej. "busqueda", "otros", "whatsapp", "instagram", "web", "email" |
| `metadata` | jsonb | Nullable: slug, comuna_slug, sector_slug, q, session_id, total_resultados, etc. |
| `created_at` | timestamptz | Default `now()` |

**Nota:** Se mantiene la actualización de `emprendedores.impresiones_busqueda` en `track-impression` para el ranking justo; `emprendedor_eventos` no se usa para ordenar resultados.

---

## 3. Eventos a registrar

| event_type | Nivel | Dónde se dispara |
|------------|--------|-------------------|
| `site_visit` | Plataforma | Home/layout (una vez por sesión) |
| `search_performed` | Plataforma | Tras ejecutar búsqueda (TrackSearch) |
| `profile_view` | Emprendimiento | Vista de ficha (TrackView) |
| `search_result_impression` | Emprendimiento | Cada slug mostrado en resultados (track-impression) |
| `card_click` | Emprendimiento | Clic en tarjeta / "Ver ficha" en resultados |
| `whatsapp_click` | Emprendimiento | Botón WhatsApp en ficha |
| `instagram_click` | Emprendimiento | Botón Instagram en ficha |
| `website_click` | Emprendimiento | Botón web en ficha |
| `email_click` | Emprendimiento | Botón email en ficha |

---

## 4. Identificación de sesión

- **En el cliente:** UUID generado y guardado en `localStorage` (clave ej. `rdd_session_id`). Si no existe, se crea al cargar la app y se reutiliza en la misma pestaña/visita.
- **En cada request:** El cliente envía `session_id` en el body cuando llama a `/api/event`, `/api/track-impression`, `/api/track-view`, `/api/track-click`, `/api/track-search` (según corresponda).
- **En el servidor:** Se guarda en `emprendedor_eventos.metadata.session_id`. No se usa para ranking ni para identificar usuarios de forma fiable (solo para agrupar eventos de una misma “visita” de forma aproximada).

---

## 5. Métricas que verá el emprendedor (panel)

Basado en `emprendedor_eventos` filtrado por `emprendedor_id` (y opcionalmente por rango de fechas):

| Métrica | event_type(s) | Descripción |
|---------|----------------|-------------|
| Veces que apareció en resultados | `search_result_impression` | Conteo por emprendedor |
| Veces que entraron a su ficha | `profile_view` | Vistas de perfil |
| Clics en tarjeta (desde resultados) | `card_click` | Clics que llevaron a la ficha desde búsqueda |
| Clics en WhatsApp | `whatsapp_click` | |
| Clics en Instagram | `instagram_click` | |
| Clics en sitio web | `website_click` | |
| Clics en email | `email_click` | |

Agrupaciones útiles: **histórico total**, **últimos 7 días**, **últimos 30 días** (como en la API de estadísticas actual).

---

## 6. Cómo consultar métricas por emprendimiento

La API `GET /api/emprendedor/[slug]/estadisticas` ya devuelve `historico`, `ultimos7` y `ultimos30` leyendo de `emprendedor_eventos` (y columnas de `emprendedores` para histórico de vistas/clics).

Ejemplo SQL directo (conteos por tipo para un emprendedor en últimos 30 días):

```sql
SELECT tipo_evento, canal, COUNT(*) AS total
FROM emprendedor_eventos
WHERE emprendedor_id = $1
  AND created_at >= now() - interval '30 days'
GROUP BY tipo_evento, canal;
```

Por slug (resolviendo primero el id):

```sql
SELECT e.tipo_evento, e.canal, COUNT(*) AS total
FROM emprendedor_eventos e
JOIN emprendedores emp ON emp.id = e.emprendedor_id
WHERE emp.slug = $1
  AND e.created_at >= now() - interval '30 days'
GROUP BY e.tipo_evento, e.canal;
```
