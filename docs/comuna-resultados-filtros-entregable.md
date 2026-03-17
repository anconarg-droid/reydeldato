# Entregable: Lógica de resultados y filtros en página de comuna

## A. Lógica actual de /[comuna] (antes)

- Con comuna, la API `/api/buscar` hacía **varias consultas** y las unía por `id`:
  - Negocios con **base en la comuna** (`comuna_base_id = comunaId`).
  - Negocios cuya **cobertura incluye la comuna** (`coverage_labels` o `coverage_keys` contienen el slug de la comuna).
- **No** se incluían explícitamente negocios con:
  - `nivel_cobertura = 'varias_regiones'` (regional).
  - `nivel_cobertura = 'nacional'` (nacional).
- El orden en memoria seguía siendo: exacta → cobertura_comuna → varias_regiones → nacional (según `resolveBucket` + `bucketRank`), pero al no traer regional/nacional en la query, en la práctica solo se veían base + “atienden la comuna”. El total “Encontramos X resultados” era solo esos dos grupos.

---

## B. Lógica actual de contadores (antes y ahora)

- **`/api/buscar/sectores-por-comuna`** y **`/api/buscar/tags-por-comuna-sector`** (y tags-populares por comuna):
  - Traen emprendedores publicados (por sector cuando aplica).
  - En memoria aplican **la misma regla territorial** que `resolveBucket`: consideran “en comuna” a quien tiene bucket distinto de `"general"`.
  - Es decir, cuentan:
    1. Base en la comuna  
    2. Cobertura que incluye la comuna  
    3. **Cobertura regional** (`nivel_cobertura = 'varias_regiones'`)  
    4. **Cobertura nacional** (`nivel_cobertura = 'nacional'`).
- Por tanto, los contadores ya consideraban los cuatro niveles; la diferencia estaba en la query de **resultados**, que no incluía regional ni nacional.

---

## C. Por qué los números no coincidían con los resultados

1. **Conteo vs resultados**
   - Contadores: incluían base + atienden comuna + **regional + nacional** (misma lógica que `resolveBucket`).
   - Resultados: solo traían base + atienden comuna (sin queries por `nivel_cobertura`).
   - Ejemplo: “Electricista (1)” podía ser un nacional; el contador lo contaba, pero la API de resultados no lo traía → 0 resultados en la lista.

2. **Subcategoría activa y panel izquierdo**
   - Al elegir una subcategoría (ej. Electricista), la categoría padre no se abría automáticamente ni se mantenía abierta.
   - No había forma de saber “a qué categoría pertenece esta subcategoría” en el cliente, así que el panel no reflejaba de forma persistente el filtro activo (categoría abierta + subcategoría marcada).

---

## D. Archivos modificados

| Archivo | Cambio |
|--------|--------|
| **`app/api/buscar/route.ts`** | Con comuna, se añadieron consultas para incluir **regional** y **nacional**: `nivel_cobertura = 'varias_regiones'` y `nivel_cobertura = 'nacional'`. Con subcategoría se añadieron las variantes que combinan ese nivel con `tags_slugs` / `subcategorias_slugs` (para que contadores y resultados sigan alineados). |
| **`app/api/buscar/sector-por-tag/route.ts`** | **Nuevo.** GET `?tag=...` devuelve `{ sector_slug }` (categoría padre de la subcategoría), consultando un emprendedor publicado que tenga ese tag en `tags_slugs` o `subcategorias_slugs`. |
| **`app/buscar/BuscarClient.tsx`** | Cuando hay **subcategoría activa** (ej. `/calera-de-tango/electricista`): se llama a `sector-por-tag` para obtener la categoría padre, se deja esa categoría **abierta** (`expandedSlug`) y se cargan sus subcategorías (tags) si no estaban cargadas, para que se vea la subcategoría activa marcada (☑) sin “desaparecer” del panel. |

No se modificaron los endpoints de conteo (sectores-por-comuna, tags-por-comuna-sector, tags-populares): ya usaban la misma lógica territorial; solo se alineó la query de resultados con esa lógica.

---

## E. Nueva lógica de resultados

Para una **comuna** buscada, la API considera “válidos” y trae (merge por `id`, hasta 500):

1. **Base en la comuna:** `comuna_base_id = id` de la comuna.
2. **Atienden la comuna:** `coverage_labels` o `coverage_keys` contienen el slug de la comuna.
3. **Regional:** `nivel_cobertura = 'varias_regiones'`.
4. **Nacional:** `nivel_cobertura = 'nacional'`.

Si además hay **subcategoría** (ej. `electricista`), cada uno de esos “ramos” se filtra también por esa subcategoría (`tags_slugs` o `subcategorias_slugs` contienen el slug), de modo que los resultados por subcategoría sigan la misma regla (base + atienden + regional + nacional) y coincidan con el contador.

Orden en respuesta (sin cambio):

1. Base en la comuna  
2. Atienden la comuna  
3. Regional  
4. Nacional  

Así, “Encontramos X resultados” y la lista usan la misma definición de “válido para la comuna” que los contadores de la columna izquierda.

---

## F. Persistencia visual del filtro en la columna izquierda

- **Categoría abierta:** Si hay una subcategoría activa en la URL (ej. `/calera-de-tango/electricista`), al cargar la página se llama a `GET /api/buscar/sector-por-tag?tag=electricista`. Con el `sector_slug` devuelto (ej. `hogar_construccion`) se asigna **expandedSlug** a ese sector, de modo que la categoría padre (ej. “Hogar y construcción”) **permanece abierta**.
- **Subcategoría activa:** Dentro de esa categoría, la subcategoría que coincide con la URL se muestra con **☑** y estilo activo (ej. “✓ Electricista (1)”); el resto con ☐.
- **Carga de tags:** Si al abrir por subcategoría activa ese sector aún no tiene tags cargados, se pide `tags-por-comuna-sector` para ese sector y se rellenan, para que la lista (con la activa marcada) sea visible sin que el usuario tenga que abrir la categoría a mano.
- **Filtros activos:** Sigue el bloque “Filtros activos” con Comuna y Subcategoría [×]; al hacer clic en [×] se navega a `/[comuna]` y la columna izquierda deja de tener subcategoría activa (el ref se resetea cuando no hay subcategoriaActiva).

Con esto, la columna izquierda refleja de forma estable qué categoría está abierta y qué subcategoría está seleccionada, y los resultados y contadores quedan alineados con la misma lógica territorial (base + atienden + regional + nacional).
