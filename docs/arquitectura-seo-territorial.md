# Arquitectura SEO territorial – Rey del Dato

Objetivo: páginas útiles para SEO local, captación de emprendedores y expansión territorial, sin contenido duplicado pobre y con control explícito de indexación.

---

## 1. Rutas soportadas

| Ruta | Descripción | Ejemplo |
|------|-------------|--------|
| **Página de comuna** | Todos los emprendimientos de la comuna | `/talagante` o `/comuna/talagante` |
| **Página de categoría en comuna** | Emprendimientos de esa categoría en la comuna | `/talagante/hogar-y-construccion` |
| **Página de subcategoría en comuna** | Emprendimientos de esa subcategoría en la comuna | `/talagante/gasfiter` |

**Decisión de estructura:** Mantener **una sola convención de URL** para evitar duplicados:

- **Opción recomendada:** `/[comuna_slug]/[segmento_slug]`
  - Sin prefijo `/comuna/`: las URLs quedan cortas y consistentes (`/talagante`, `/talagante/gasfiter`).
  - El segundo segmento se **resuelve** en servidor: primero como subcategoría, si no existe como categoría. Así no hay conflicto si categorías y subcategorías usan slugs distintos (p. ej. categoría `hogar-y-construccion`, subcategoría `gasfiter`).

- **Alternativa:** `/comuna/[comuna_slug]` para la comuna y `/[comuna_slug]/[segmento_slug]` para categoría/subcategoría. Implica dos patrones para “comuna” (raíz vs prefijo); se puede usar si se quiere distinguir explícitamente “página comuna” del resto.

En este documento se asume la opción recomendada: **una sola familia de rutas** `/[comuna_slug]` y `/[comuna_slug]/[segmento_slug]`.

---

## 2. Estructura de archivos en Next.js (App Router)

```
app/
├── [comuna]/
│   ├── page.tsx                    # Página de comuna: /talagante
│   ├── [[...segment]]/
│   │   └── page.tsx                 # Opción A: catch-all para categoria/subcategoria
│   └── [segment]/
│       └── page.tsx                 # Opción B: un solo segmento (recomendado)
│
# Opción B (recomendada): un solo segmento dinámico
# [comuna]/[segment]/page.tsx resuelve:
# - Si segment existe en subcategorias → página subcategoría en comuna
# - Si no, si existe en categorias → página categoría en comuna
# - Si no → 404
```

**Estructura recomendada (sin duplicar comuna en dos rutas):**

```
app/
├── [comuna]/
│   ├── page.tsx                     # GET /[comuna_slug] → página comuna
│   └── [segment]/
│       └── page.tsx                 # GET /[comuna_slug]/[segment_slug] → categoría o subcategoría
```

- **`app/[comuna]/page.tsx`**  
  - Parámetro: `comuna` (slug).  
  - Render: lista de emprendimientos de la comuna o estado de apertura + CTAs.

- **`app/[comuna]/[segment]/page.tsx`**  
  - Parámetros: `comuna`, `segment`.  
  - Resolución:  
    1. Buscar `segment` en `subcategorias` (por slug).  
    2. Si no hay match, buscar en `categorias` (por slug).  
    3. Si no hay match en ninguno → `notFound()`.  
  - Render: resultados por subcategoría o por categoría (agrupados por subcategoría si aplica), o estado de apertura + CTAs si no hay resultados.

**Funciones de datos y metadatos** (implementadas en `lib/seo-territorial/`):

```
lib/
├── supabase/
│   └── server.ts
├── coverage-data.ts                 # Ya existe: cobertura, apertura, rubros
├── seo-territorial/
│   ├── data.ts                      # getComunaBySlug, getSubcategoriaBySlug, getCategoriaBySlug, resolveSegment
│   ├── metadata.ts                  # getBaseUrl, buildCanonical, buildMetadataComuna, buildMetadataSegment, getRobotsForTerritorialPage
│   └── index.ts                     # re-export
```

---

## 3. Funciones de datos necesarias

### 3.1 Catálogo y existencia

| Función | Ubicación | Descripción |
|--------|-----------|-------------|
| `getComunaBySlug(slug)` | `lib/seo-territorial/data.ts` | Comuna por slug; null si no existe. |
| `getSubcategoriaBySlug(slug)` | `lib/seo-territorial/data.ts` | Subcategoría por slug (y opcionalmente categoria_id). |
| `getCategoriaBySlug(slug)` | `lib/seo-territorial/data.ts` | Categoría por slug. |
| `resolveSegment(segmentSlug)` | `lib/seo-territorial/data.ts` | Devuelve `{ type: 'subcategoria', id, slug, nombre, categoria_id? }` o `{ type: 'categoria', id, slug, nombre }` o null. |

### 3.2 Resultados y cobertura

| Función | Descripción |
|--------|-------------|
| `getEmprendimientosComuna(comunaSlug, opts?)` | Emprendimientos publicados en la comuna (con/sin límite, para listado). |
| `getEmprendimientosComunaSubcategoria(comunaSlug, subcategoriaSlug)` | Emprendimientos de la comuna en esa subcategoría (incl. cobertura que atiende la comuna). |
| `getEmprendimientosComunaCategoria(comunaSlug, categoriaSlug)` | Emprendimientos de la comuna en esa categoría (todos los de sus subcategorías). |
| `getCoverageForComuna(comunaSlug)` | Reutilizar `getCoverageData(comunaSlug, regionSlug)` de `lib/coverage-data.ts`: estado apertura, rubros faltantes, totales. |

Las consultas de emprendimientos deben considerar:

- Comuna base del emprendimiento = comuna solicitada, **o**
- Cobertura (comuna en `coverage`/atención) incluye la comuna solicitada.

Orden sugerido: primero con base en la comuna, luego los que atienden la comuna.

### 3.3 Conteos para SEO y noindex

| Función | Uso |
|--------|-----|
| `countEmprendimientosComuna(comunaSlug)` | Decidir si la página comuna tiene “contenido real”. |
| `countEmprendimientosComunaSegment(comunaSlug, segmentSlug, type)` | Conteo por categoría o subcategoría para decidir index/noindex y mensajes. |

Se pueden implementar como variantes ligeras de las funciones de listado (solo COUNT o primera página con límite 1).

---

## 4. Lógica SEO por tipo de página

### 4.1 Página de comuna `/[comuna_slug]`

- **Title:** `Emprendimientos y servicios en {Comuna} | Rey del Dato`
- **Description:** `Encuentra emprendimientos y servicios en {Comuna}. Contacta directo por WhatsApp con negocios de tu comuna.`
- **Canonical:** `{baseUrl}/{comuna_slug}`
- **Contenido:**
  - Si hay emprendimientos: listado (buscador, filtros, resultados) — reutilizar lógica actual de `[comuna]/page.tsx`.
  - Si no hay emprendimientos: estado de apertura (reutilizar datos de `getCoverageData`), rubros faltantes, CTAs “Publicar emprendimiento” y “Recomendar negocio”. No dejar la página vacía.

### 4.2 Página de categoría en comuna `/[comuna_slug]/[categoria_slug]`

- **Title:** `{Categoría} en {Comuna} | Rey del Dato`
- **Description:** `Encuentra {categoría} en {Comuna}. Emprendedores y servicios locales. Contacta por WhatsApp.`
- **Canonical:** `{baseUrl}/{comuna_slug}/{categoria_slug}`
- **Contenido:**
  - Si hay resultados: listado filtrado por categoría (y opcionalmente subcategorías dentro).
  - Si no hay resultados: mismo patrón “apertura”: estado de la comuna, rubros que faltan (en especial los de esta categoría si aplica), CTAs publicar y recomendar.

### 4.3 Página de subcategoría en comuna `/[comuna_slug]/[subcategoria_slug]`

- **Title:** `{Subcategoría} en {Comuna} | Rey del Dato`
- **Description:** `Encuentra {subcategoría} en {Comuna}. Negocios locales. Contacta directo por WhatsApp.`
- **Canonical:** `{baseUrl}/{comuna_slug}/{subcategoria_slug}`
- **Contenido:**
  - Si hay resultados: listado filtrado por subcategoría (misma lógica que hoy en `[comuna]/[subcategoria]/page.tsx`).
  - Si no hay resultados: estado de apertura, rubros faltantes (destacar esta subcategoría), CTAs.

En los tres casos, el **H1** debe ser único y descriptivo (p. ej. “Emprendimientos en {Comuna}”, “{Categoría} en {Comuna}”, “{Subcategoría} en {Comuna}`).

---

## 5. Metadatos dinámicos (title, description, canonical)

### 5.1 Base URL y canonical

- **Base URL:** Una sola función `getBaseUrl()` (o variable de entorno `NEXT_PUBLIC_SITE_URL` con fallback a `VERCEL_URL`), usada en servidor para canonical y og:url.
- **Canonical:** Siempre absoluta: `getBaseUrl() + pathname` (sin query params), para evitar duplicados por parámetros.

### 5.2 Open Graph y Twitter

- **og:title / twitter:title:** Igual que `title` de la página.
- **og:description / twitter:description:** Igual que `description`.
- **og:url / twitter:url:** Canonical.
- **og:type:** `website`.
- **og:locale:** `es_CL` (o el que use el sitio).

### 5.3 Estructura de `metadata` en Next.js

En cada `page.tsx`:

- Exportar `generateMetadata({ params })` que:
  1. Lee `params` (comuna, y si aplica segment).
  2. Obtiene nombres (comuna, categoría o subcategoría) desde las funciones de datos.
  3. Construye title, description, canonical, openGraph, twitter.
  4. Incluye **robots** según el criterio de indexación (ver sección 6).

Ejemplo de firma de helpers en `lib/seo-territorial/metadata.ts`:

- `getBaseUrl(): string`
- `buildCanonical(...pathSegments: string[]): string`
- `buildMetadataComuna(comunaSlug, comunaNombre, options?: { robots? })`
- `buildMetadataSegment(comunaSlug, comunaNombre, segmentNombre, segmentSlug, options?: { robots? })`

Estos helpers devuelven el objeto que `generateMetadata` retorna (o una parte reutilizable).

---

## 6. Criterio para index / noindex

Objetivo: indexar páginas con valor (contenido real o página de activación útil); no indexar páginas vacías o muy pobres.

| Condición | Recomendación | Motivo |
|-----------|----------------|--------|
| Hay emprendimientos en la página (≥ 1) | **index** | Contenido real, útil para búsqueda. |
| No hay emprendimientos pero la comuna existe y mostramos estado de apertura + rubros + CTAs | **index** (opcional) | Página de captación/activación; puede ser útil para búsquedas tipo “emprendimientos en X”. |
| Comuna no existe (slug inválido) | **notFound()** | No generar página. |
| Segmento no es ni categoría ni subcategoría | **notFound()** | No generar página. |
| Página con 0 resultados y sin bloque de apertura (fallback mínimo) | **noindex** | Evitar contenido thin/duplicado. |

Implementación sugerida:

- Definir un helper `getRobotsForTerritorialPage(hasResults: boolean, hasAperturaContent: boolean): Metadata['robots']`.
  - Si `hasResults === true` → index, follow.
  - Si `hasAperturaContent === true` (y no hay resultados) → index, follow (o noindex si se prefiere no indexar “en apertura”).
  - Si ninguna → noindex, nofollow.

Así el sistema queda preparado para ajustar después (por ejemplo noindex para “en apertura” hasta tener más contenido).

---

## 7. Resumen de implementación

1. **Rutas:** Mantener `app/[comuna]/page.tsx` y `app/[comuna]/[segment]/page.tsx`. En `[segment]` resolver primero subcategoría, luego categoría; si no hay match, `notFound()`.
2. **Datos:** Centralizar en `lib/seo-territorial/data.ts` (comuna, resolveSegment, resultados por comuna/categoría/subcategoría, conteos) y reutilizar `lib/coverage-data.ts` para apertura.
3. **Metadatos:** Helpers en `lib/seo-territorial/metadata.ts` (baseUrl, canonical, buildMetadataComuna, buildMetadataSegment) y usarlos en `generateMetadata` de cada página.
4. **Contenido:** Con resultados → listado; sin resultados → bloque de apertura (datos de cobertura) + CTAs. No páginas vacías.
5. **Robots:** `getRobotsForTerritorialPage(hasResults, hasAperturaContent)` y pasarlo a `metadata.robots` en cada página.

Con esto se tiene una arquitectura SEO territorial clara, reutilizable y preparada para indexar o no indexar según contenido real y tipo de página.
