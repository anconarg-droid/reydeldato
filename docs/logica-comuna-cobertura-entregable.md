# Entregable: Lógica comuna + cobertura en Rey del Dato

## Regla central

En Rey del Dato, **buscar en una comuna** significa ver:
- negocios **de** esa comuna (base en la comuna)
- **más** negocios que **atienden** esa comuna (cobertura)

No solo negocios físicamente ubicados ahí.

---

## A. Lógica actual (antes de los cambios)

### Query de resultados (`/api/buscar`)

- Se hacía **una sola consulta** a `emprendedores`: `estado_publicacion = 'publicado'` y **`.limit(500)`**, **sin filtrar por comuna**.
- Los 500 registros eran los primeros 500 publicados (orden por defecto de Supabase), sin garantía de incluir a nadie de la comuna buscada ni con cobertura en esa comuna.
- Luego, **en memoria**, se aplicaban filtros por `sector`, `tipo_actividad`, `subcategoria` (tags/subcategorías).
- El **orden** de resultados ya usaba `resolveBucket` + `bucketRank`: primero "exacta" (base en la comuna), luego "cobertura_comuna", regional, nacional, etc.

### Conteos (sectores/tags por comuna)

- **`/api/buscar/sectores-por-comuna`** y **`/api/buscar/tags-por-comuna-sector`** (y tags-populares) ya traían **todos** los publicados y, en memoria, consideraban "en comuna" con la misma lógica que `resolveBucket`: base en la comuna **o** cobertura que incluye la comuna. Es decir, los conteos ya sumaban **locales + cobertura**.

### Problema en la UI

- En **`PublicSearchResults`** los mensajes y títulos de bloques eran genéricos ("Emprendimientos en X", "Negocios de otras comunas que también atienden X") y no se adaptaban cuando había **subcategoría** (ej. electricista). No se mostraba explícitamente el CASO 2 ("No encontramos electricistas ubicados en Calera de Tango" + bloque "Servicios que atienden Calera de Tango").

---

## B. Qué fallaba exactamente

1. **Query de resultados con comuna**
   - Al pedir resultados para **una comuna** (y opcionalmente subcategoría), la API **no restringía** la consulta a la comuna.
   - Solo se tomaban 500 filas globales y se filtraban por sector/subcategoría en memoria.
   - Si el electricista que **atiende** Calera de Tango no estaba en esos 500, la página quedaba vacía aunque sí hubiera oferta válida para la comuna.

2. **Experiencia en subcategoría**
   - No se mostraba el mensaje claro del CASO 2 ("No encontramos electricistas ubicados en Calera de Tango") ni el bloque diferenciado "Electricistas que atienden Calera de Tango".
   - En CASO 3 (sin resultados) no había enlace claro para volver a "todos los servicios en la comuna".

---

## C. Archivos modificados

| Archivo | Cambios |
|--------|---------|
| **`app/api/buscar/route.ts`** | Filtro por comuna en la query: cuando hay `comuna`, se restringe a filas con **base en la comuna** O **cobertura** que incluya la comuna (`.or(comuna_base_id.eq.<id>, coverage_labels.cs.[...], coverage_keys.cs.[...])`). Se obtiene `comunaId` desde `comunas` y se usa en `buildQuery`. |
| **`app/buscar/BuscarClient.tsx`** | Bloque "Filtros activos" (Comuna + Subcategoría con [×] para quitar subcategoría y volver a `/[comuna]`). Subcategorías en la columna izquierda con estado activo (☑/☐). Se pasa `subcategoriaActiva` a `CategoriasExpandiblesComuna`. |
| **`components/search/PublicSearchResults.tsx`** | Mensajes y títulos por contexto de subcategoría: "Electricistas en X", "Electricistas que atienden X", "No encontramos electricistas ubicados en X". CASO 3: mensaje claro + enlace "Ver todos los servicios en {comuna}" a `/[comuna]`. Helpers `subcategoriaSlugToLabel` y `subcategoriaLabelPlural`. |

---

## D. Nueva lógica de query

### Cuando **hay comuna** en la petición

1. Se normaliza el slug de comuna: `comunaSlugNorm`.
2. Se obtiene el `id` de esa comuna en la tabla `comunas` → `comunaId`.
3. La consulta a `emprendedores` se arma así:
   - Siempre: `estado_publicacion = 'publicado'`.
   - **Filtro por comuna** (`.or()`):
     - `comuna_base_id.eq.<comunaId>` **o**
     - `coverage_labels.cs.["<comunaSlugNorm>"]` **o**
     - `coverage_keys.cs.["<comunaSlugNorm>"]`
   - Luego se aplica `.limit(500)`.

Así, los 500 registros son solo los que **pertenecen a la comuna** (base o cobertura). Después se aplican en memoria sector, tipo_actividad, subcategoría, y el orden con `resolveBucket` + `bucketRank` (exacta → cobertura_comuna → regional → nacional → otros).

### Cuando **no hay comuna**

- No se aplica el `.or()`; se mantiene la consulta global con `.limit(500)` y el resto de la lógica igual.

### Conteos

- **Sin cambios** en la lógica: siguen considerando "en comuna" con `resolveBucket !== "general"` (base + cobertura), por lo que los números de categorías/subcategorías incluyen locales + cobertura. Ejemplo: si no hay electricistas con base en Calera de Tango pero sí 1 con cobertura, el contador muestra "Electricista (1)".

---

## E. Experiencia para volver a la vista general de la comuna

1. **Filtros activos**
   - Arriba de los resultados, en página de comuna (y subcategoría), aparece el bloque "Filtros activos" con:
     - Comuna: [nombre]
     - Subcategoría: [nombre] **[×]**
   - Al hacer clic en **[×]** de la subcategoría se navega a `/[comuna]` (ej. `/calera-de-tango`), quitando el filtro de subcategoría y manteniendo el contexto de comuna.

2. **Columna izquierda (categorías/subcategorías)**
   - Las subcategorías se muestran como filtros con estado visible:
     - **☑** + estilo resaltado = subcategoría activa (la de la URL).
     - **☐** = no activa.
   - Al elegir otra subcategoría se actualiza la URL, el filtro y los resultados, sin cambiar el layout.

3. **CASO 3 (sin resultados)**
   - Mensaje claro de que no hay resultados en esa subcategoría para esa comuna.
   - Enlace **"Ver todos los servicios en {comuna}"** que lleva a `/[comuna]`.

4. **Orden de resultados (sin cambio de lógica)**
   - Se mantiene en todo el sitio:
     1. Negocios ubicados en la comuna buscada
     2. Negocios que atienden la comuna buscada
     3. Otros relacionados (regional, nacional, etc.)
   - Válido para `/[comuna]`, `/[comuna]/[subcategoria]` y búsquedas con texto dentro de la comuna.

---

## Resumen de casos

| Caso | Condición | Comportamiento |
|------|-----------|----------------|
| **1** | Hay locales y/o cobertura | Se muestran bloques ordenados: "X en {comuna}", "X que atienden {comuna}", y opcionalmente regional/nacional/otros. |
| **2** | No hay locales; sí hay cobertura | Mensaje: "No encontramos [subcategoría] ubicados en [comuna]." + bloque "Servicios que atienden [comuna]." + tarjetas de cobertura. |
| **3** | No hay resultados ni locales ni cobertura | Mensaje claro de que no hay resultados en esa subcategoría para esa comuna + enlace "Ver todos los servicios en [comuna]" → `/[comuna]`. |

La comuna buscada es el eje: nunca se muestran páginas vacías cuando existen negocios que atienden la comuna (base o cobertura).
