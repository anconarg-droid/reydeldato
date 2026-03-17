# Rey del Dato — Marketplace local

## Qué es Rey del Dato

**Rey del Dato** es un marketplace/directorio local para mostrar:

- emprendimientos  
- oficios  
- servicios  
- tiendas  
- ventas locales  
- atención presencial, online o en local físico  

No depende de que el emprendedor diga “vendo”, “arriendo” o “presto servicios”.  
El sistema parte desde **qué hace**, **dónde está** y **a quién atiende**.

La lógica central del producto es **territorial**:

1. **Primero** aparece lo más local (negocios ubicados en la comuna buscada).  
2. **Después** lo que atiende esa comuna (cobertura desde otras comunas).  
3. **Luego** cobertura más amplia (regional, nacional).

Ese es el corazón del proyecto.

---

## Objetivo del sistema

El sistema debe permitir:

### Público
- Buscar por texto libre  
- Elegir comuna  
- Ver resultados relevantes  
- Entrar a fichas públicas  
- Contactar directo por WhatsApp, Instagram o web  

### Emprendedor
- Crear o editar su ficha  
- Subir foto principal y galería  
- Ver métricas de vistas y clics  

### Admin
- Aprobar o rechazar fichas  
- Revisar datos  
- Activar o desactivar publicaciones  
- Controlar calidad del contenido  

---

## Stack recomendado

### Frontend
- **Next.js**  
- **TypeScript**  
- **Tailwind CSS**  

### Base de datos y backend
- **Supabase**  
  - Postgres  
  - Auth  
  - Storage  
  - RLS  
  - Edge Functions si luego hace falta  

### Búsqueda
- **Algolia**  
  - Autocomplete  
  - Búsqueda rápida  
  - Filtros  
  - Ranking inicial  
  - El ranking final más delicado puede reforzarse en tu lógica, no solo en Algolia  

### Hosting
- **Vercel**  

---

## Arquitectura general

### Supabase = fuente de verdad

Todo lo importante vive en Supabase:

- emprendedores  
- categorías  
- subcategorías  
- comunas  
- coberturas  
- usuarios  
- métricas  
- estados de aprobación  

### Algolia = motor de búsqueda

Algolia no manda sobre el negocio. Solo sirve para:

- Buscar rápido  
- Sugerir resultados  
- Devolver coincidencias  

La lógica final de visibilidad (qué se muestra, en qué orden, quién está publicado) la define tu sistema.

---

## Alineación técnica (este proyecto)

| Regla | Dónde se cumple |
|-------|------------------|
| Supabase = fuente de verdad | Escritura solo en Supabase (`/api/publicar`, `/api/panel/negocios`, admin). Algolia solo se alimenta por reindex. |
| Algolia solo para búsqueda | `/api/search`, `/api/suggest/q`; reindex desde vistas Supabase. |
| Una categoría principal por emprendedor | `publicar`: una `categoria_slug`; subcategorías validadas con `categoria_id` en `/api/publicar`. |
| Múltiples subcategorías dentro de esa categoría | Tabla puente `emprendedor_subcategorias`; validación “subcategorías que no pertenecen a la categoría” en publicar. |
| Comuna base obligatoria | Validación en `/api/publicar` (comuna_base_slug) y en flujo de alta. |
| Ranking: 1 comuna exacta, 2 atiende comuna, 3 regional, 4 nacional | `/api/buscar`: buckets `exacta` → `cobertura_comuna` → `varias_regiones` → `nacional`. `/api/search`: tiers `base` → `cobertura` → `regional` → `nacional`. |

Valores de cobertura en código: `solo_mi_comuna`, `varias_comunas`, `varias_regiones`, `nacional`. Equivalencias con la doc: `solo_comuna` ≈ `solo_mi_comuna`, `regional` ≈ `varias_regiones`.

---

## 5. Entidades principales en Supabase

### Tabla `emprendedores`

Campos sugeridos:

- `id`
- `user_id`
- `slug`
- `nombre`
- `responsable_nombre`
- `responsable_visible` (boolean)
- `email`
- `whatsapp`
- `instagram`
- `website`
- `direccion`
- `descripcion_corta`
- `descripcion_larga`
- `comuna_id`
- `modalidades_atencion` (jsonb o array)
- `tipo_cobertura`
- `foto_principal_url`
- `estado`
- `activo`
- `created_at`
- `updated_at`

**Notas:**  
`nombre`, `email`, `whatsapp`, `descripcion_corta`, `comuna_id`, `tipo_cobertura` obligatorios. `responsable_nombre` obligatorio internamente, aunque se pueda ocultar (`responsable_visible`).

---

### Tabla `categorias`

- `id`
- `slug`
- `nombre`
- `orden`
- `activo`

---

### Tabla `subcategorias`

- `id`
- `categoria_id`
- `slug`
- `nombre`
- `orden`
- `activo`

---

### Tabla puente `emprendedor_subcategorias`

- `id`
- `emprendedor_id`
- `subcategoria_id`

Permite: **una categoría principal por emprendedor** y **múltiples subcategorías**, solo dentro de esa categoría.

---

### Tabla `comunas`

- `id`
- `slug`
- `nombre`
- `region_id`
- `activo`

---

### Tabla `regiones`

- `id`
- `slug`
- `nombre`
- `pais_id`

---

### Tabla `paises`

- `id`
- `slug`
- `nombre`

---

### Tabla `emprendedor_cobertura_comunas`

Solo para casos donde atiende **varias comunas** específicas.

- `id`
- `emprendedor_id`
- `comuna_id`

---

### Tabla `emprendedor_galeria`

- `id`
- `emprendedor_id`
- `image_url`
- `orden`

---

### Tabla `visitas_emprendedor`

- `id`
- `emprendedor_id`
- `source`
- `created_at`

---

### Tabla `clicks_emprendedor`

- `id`
- `emprendedor_id`
- `tipo_click` (ej.: `whatsapp`, `instagram`, `website`, `telefono`)
- `created_at`

---

### Tabla `solicitudes_publicacion`

Para separar borrador de publicación real (opcional).

- `id`
- `user_id`
- `payload`
- `estado`
- `comentario_admin`
- `created_at`
- `updated_at`

---

## 6. Estados recomendados

En `emprendedores.estado`:

- `borrador`
- `pendiente_revision`
- `aprobado`
- `rechazado`
- `suspendido`

Y además **`activo`** = `true` / `false`.

**Visibilidad (ejemplo):**

| estado            | activo | visible |
|-------------------|--------|--------|
| aprobado          | true   | sí     |
| aprobado          | false  | no     |
| pendiente_revision| —      | no     |
| rechazado         | —      | no     |
| borrador          | —      | no     |
| suspendido        | —      | no     |

Resumen: **solo `aprobado` + `activo = true`** es visible.

---

## 7. Cobertura del negocio

Campo **`tipo_cobertura`** con valores controlados:

- `solo_comuna` — atiende solo su comuna.
- `varias_comunas` — atiende su comuna más otras comunas concretas.
- `regional` — una o más regiones.
- `nacional` — todo el país.

Además:

- **`comuna_base_id`** = comuna donde está el negocio (obligatoria).
- **Tabla `emprendedor_cobertura_comunas`** — solo cuando `tipo_cobertura = varias_comunas`: filas por cada comuna que atiende además de la base.

---

## 8. Modalidad de atención

Campo **`modalidades_atencion`** como array o jsonb, con valores controlados:

- `local_fisico` — tiene local, tienda u oficina.
- `online` — atiende por internet.
- `presencial` — va al domicilio del cliente o atiende fuera de un local fijo.

Un negocio puede tener **varias** modalidades a la vez.

---

## 9. Qué debe ir a Algolia

No mandes todo. Solo lo **público** y útil para búsqueda.

**Índice sugerido:** `emprendedores_publicos`

**Campos sugeridos:**

- `objectID` (= id del emprendedor)
- `slug`
- `nombre`
- `descripcion_corta`
- `categoria_nombre`
- `categoria_slug`
- `subcategorias_nombres`
- `subcategorias_slugs`
- `comuna_nombre`
- `comuna_slug`
- `region_nombre`
- `tipo_cobertura`
- `cobertura_comunas_slugs`
- `foto_principal_url`
- `whatsapp`
- `instagram`
- `website`
- `keywords`
- `search_text`
- `prioridad_base`
- `activo`

### Campo `search_text`

Texto consolidado para búsqueda, armado a partir de:

- nombre  
- descripción corta  
- categoría  
- subcategorías  
- keywords  
- comuna  

Así Algolia indexa un solo campo de texto para coincidencias rápidas.

---

## 10. Qué no debe ir a Algolia

**No mandar:**

- Mail interno  
- Responsable (cuando está oculto)  
- Datos administrativos  
- Estados internos  
- Observaciones de moderación  
- Service data  
- Métricas sensibles  

Algolia solo debe tener lo necesario para buscar y mostrar resultados públicos.

---

## 11. Lógica de búsqueda

### Input del usuario

Dos entradas principales:

**1. Texto libre**

Ejemplos: `mueble`, `mecánico`, `gasfiter`, `abogado`, `humitas`, `peluquería canina`.

**2. Comuna**

Elegida desde selector o autocomplete aparte (no mezclada con el texto).

---

## 12. Ranking oficial del producto

**Esta es la regla clave.**

Si el usuario busca una comuna **X**:

| Prioridad | Quién aparece |
|-----------|----------------|
| **1** | Negocios cuya **comuna base** es exactamente la comuna buscada (X). |
| **2** | Negocios que **atienden esa comuna** dentro de múltiples comunas. |
| **3** | Negocios con **cobertura regional**. |
| **4** | Negocios con **cobertura nacional**. |

**Esto no se debe romper nunca.** Cualquier cambio en búsqueda o en Algolia debe respetar este orden.

---

## 13. Cómo implementar el ranking

### Opción correcta

Usar **Algolia** para traer resultados candidatos y luego aplicar un **ranking territorial propio** en tu backend o en el cliente.

**Ejemplo de score interno (territorial):**

| Tipo | Score |
|------|-------|
| Comuna exacta (base = comuna buscada) | 100 |
| Cobertura específica de esa comuna | 80 |
| Regional | 50 |
| Nacional | 20 |

Luego se combina con la **coincidencia textual** de Algolia.

### Fórmula conceptual

```
score_final = score_texto + score_territorial + bonus_calidad
```

Donde **bonus_calidad** puede considerar:

- Ficha completa  
- Foto principal  
- Descripción útil  

Pero **sin favorecer publicidad injustamente**: el bonus debe reflejar calidad de la ficha, no pago o promoción.

---

## 14. Home ideal

### Bloque superior

**Buscador principal** con:

- Input de **texto libre** (con sugerencias si se desea).
- **Selector de comuna** (autocomplete o lista).
- **Botón Buscar**.

El texto libre puede tener sugerencias; la **comuna debe quedar separada y clara**, no mezclada con el texto.

### Debajo del buscador

En vez de llenar la pantalla con demasiadas subcategorías:

- Mostrar **categorías principales**.
- **Acceso limpio** a explorar por categoría.
- Eventualmente **algunas subcategorías destacadas**, no todas.

Demasiadas subcategorías en home ensucian la pantalla; priorizar claridad y pocas opciones bien visibles.

---

## 15. Rutas recomendadas en Next.js

### Públicas

- `/` — Home
- `/buscar` — Búsqueda (texto + comuna)
- `/categoria/[slug]` — Listado por categoría
- `/comuna/[slug]` — Listado por comuna
- `/negocio/[slug]` — Ficha del emprendedor (o `/emprendedor/[slug]`)

### Emprendedor autenticado

- `/panel` — Panel del emprendedor
- `/panel/mi-ficha` — Editar mi ficha
- `/panel/estadisticas` — Ver métricas
- `/panel/galeria` — Gestionar galería

### Admin

- `/admin` — Dashboard admin
- `/admin/emprendedores` — Listado de emprendedores
- `/admin/revision/[id]` — Revisar ficha (aprobar/rechazar)
- `/admin/categorias` — Gestionar categorías

---

## 16. Flujo público de búsqueda

**Home:** usuario escribe “mecánico” y comuna “Maipú”.

**Sistema:** consulta Algolia → obtiene candidatos → aplica ranking territorial → muestra resultados ordenados.

**Resultado:** cada tarjeta muestra: foto principal, nombre, descripción corta, comuna, categoría principal, subcategorías resumidas, accesos de contacto.

---

## 17. Ficha pública de emprendedor

Debe incluir: foto principal, galería, nombre del negocio, descripción corta, descripción larga, comuna, cobertura, modalidades de atención, categoría principal, subcategorías, WhatsApp, Instagram, web, dirección (si corresponde).

**Tracking:** al entrar → registrar vista; al hacer clic → registrar click según tipo (WhatsApp, Instagram, web, etc.).

---

## 18. Panel del emprendedor

Debe permitir: editar datos básicos, cambiar foto principal, subir galería, elegir categoría, elegir subcategorías válidas, definir comuna, definir cobertura, definir modalidades, ver estado de aprobación, ver estadísticas.

---

## 19. Panel admin

Debe permitir: ver fichas pendientes, revisar calidad del contenido, aprobar, rechazar con comentario, suspender, activar/desactivar, editar si hace falta, revisar métricas generales.

---

## 20. Seguridad con Supabase

**Auth:** cada emprendedor tiene usuario; solo puede editar sus propios registros.

**RLS — Reglas mínimas:**

- **Público:** solo puede leer emprendedores aprobados y activos, datos públicos.
- **Usuario autenticado:** puede leer y editar solo su ficha.
- **Admin:** puede leer y modificar todo.

---

## 21. Storage

Usar **Supabase Storage** para: foto principal, galería.

**Buckets sugeridos:** `emprendedores-main`, `emprendedores-gallery`.

**Reglas:** usuario sube solo sus archivos; público puede leer solo los aprobados (o URLs firmadas si se quiere más control).

---

## 22. Vista pública recomendada

Crear una vista tipo **`public_emprendedores_search`** que consolide: info del emprendedor, categoría principal, subcategorías, comuna, región, comunas de cobertura, foto principal.

Ideal para: búsquedas, indexación a Algolia, endpoints públicos.

---

## 23. Script de indexación a Algolia

**Archivo ejemplo:** `scripts/reindex-algolia.ts`

**Función:** consulta `public_emprendedores_search`, trae solo aprobados y activos, mapea campos, envía a Algolia.

**Cuándo correrlo:** manualmente al inicio; luego cada vez que apruebas o editas una ficha relevante.

**Mejor práctica:** funciones reutilizables: `indexEntrepreneur(id)`, `removeEntrepreneurFromIndex(id)`.

---

## 24. Endpoints API recomendados

**Públicos:** `GET /api/search`, `GET /api/emprendedores/[slug]`, `GET /api/categorias`, `GET /api/comunas`

**Privados (panel):** `POST /api/panel/emprendedor`, `PUT /api/panel/emprendedor`, `POST /api/panel/galeria`, `GET /api/panel/estadisticas`

**Admin:** `POST /api/admin/aprobar`, `POST /api/admin/rechazar`, `POST /api/admin/suspender`

---

## 25. Estructura recomendada del código

```
lib/
  supabase/
  algolia/
  ranking/
  validators/
  formatters/
```

Ejemplos: `lib/algolia/search.ts`, `lib/algolia/index.ts`, `lib/ranking/territorial.ts`, `lib/supabase/publicQueries.ts`, `lib/supabase/adminQueries.ts`. Ordena el proyecto y evita lógica mezclada.

---

## 26. Lógica de categorías

**Regla oficial:** una categoría principal, múltiples subcategorías, **solo dentro de esa categoría principal**. Validar en frontend y backend.

**No permitir:** una subcategoría de otra categoría distinta.

---

## 27. SEO mínimo

Cada ficha pública: **title** con nombre + comuna, **meta description** con descripción corta, **slug** limpio, **Open Graph** básico.

Ejemplo: *“Gasfitería López en Maipú | Rey del Dato”*.

---

## 28. Analítica mínima desde el día uno

**Métricas mínimas:** vistas ficha, clic en WhatsApp, clic en Instagram, clic en web.

**Dashboard emprendedor:** vistas últimos 7 días, clics últimos 7 días, total mensual.

---

## 29. Regla de negocio importante

No favorecer desproporcionadamente a quienes pagan publicidad. La base orgánica debe seguir siendo justa; publicidad, si existe después, debe ir claramente marcada; no romper el orden local natural.

---

## 30. Roadmap realista de implementación

| Fase | Contenido |
|------|-----------|
| **1 — Base sólida** | Cerrar esquema Supabase, tablas y relaciones, vista pública consolidada, storage, RLS. |
| **2 — Búsqueda** | Integrar Algolia, script de indexación, buscador home, página de resultados, ranking territorial. |
| **3 — Fichas y panel** | Ficha pública, panel emprendedor, subida de imágenes, edición de datos, estadísticas básicas. |
| **4 — Admin** | Revisión, aprobación, rechazo, suspensión, reindexación automática. |
| **5 — Optimización** | SEO, performance, tracking mejorado, mejoras UX, escalabilidad. |

---

## 1. Inscripción del emprendedor

### Obligatorios
- **Nombre del emprendimiento**
- **Nombre del responsable** (para validación interna)
- **Email**, **WhatsApp**, **descripción corta**, **foto principal**, **comuna base**, **cobertura**, **modalidades**, **categoría** y **al menos una subcategoría**

### Opcional: visibilidad del responsable
- El emprendedor elige si **mostrar o no** su nombre en la ficha pública.
- Si marca “No mostrar mi nombre públicamente”, el nombre del responsable no aparece en la página del emprendimiento.

### Clasificación
- **Una categoría principal** (ej. Gasfitería, Electricidad).
- **Varias subcategorías** (mínimo 1, máximo 6) dentro de esa categoría.

### Cómo atiende (modalidades)
- **Local físico**: tiene tienda/oficina/taller.
- **Atención presencial**: va al domicilio del cliente (a domicilio).
- **Online**: por internet, redes o videollamada.
- Puede elegir **una o varias** modalidades.

---

## 2. Cobertura de servicios

La **comuna base** es donde está ubicado el negocio (o desde donde trabaja). Ya queda guardada al elegirla.

Opciones de cobertura:

| Opción | Descripción | Qué se guarda / muestra |
|--------|-------------|--------------------------|
| **Solo mi comuna** | Atiende únicamente en la comuna base. | Solo esa comuna. |
| **Varias comunas** | Atiende en la comuna base + otras comunas. | Comuna base fija; se muestran **todas las comunas de la misma región** y el emprendedor elige **mínimo una o más**. |
| **Una o más regiones** | Atiende en regiones distintas a la de la comuna base. | Puede tener base en Providencia (RM) y elegir solo Región de Valparaíso, etc. Una o varias regiones. |
| **Todo Chile** | Cobertura nacional. | Se guarda cobertura a nivel nacional. |

Para búsquedas y filtros se usan:
- Comuna base.
- Lista de comunas de cobertura (si aplica).
- Lista de regiones de cobertura (si aplica).
- Nivel: `solo_mi_comuna` | `varias_comunas` | `varias_regiones` | `nacional`.

---

## 3. Buscador inteligente (orden de resultados)

Cuando alguien busca, por ejemplo, **“gasfiter en Calera de Tango”**, los resultados se muestran en este orden:

1. **En tu comuna**  
   Emprendimientos cuya **comuna base** es la buscada (ej. Calera de Tango).

2. **Atienden tu comuna**  
   Emprendimientos con **base en otra comuna** pero que tienen **cobertura** en la comuna buscada (ej. varias comunas donde está Calera de Tango).

3. **Cobertura regional**  
   Emprendimientos con cobertura en **una o más regiones** que incluyan la zona (nivel `varias_regiones`).

4. **Cobertura nacional**  
   Emprendimientos que atienden **todo Chile** (nivel `nacional`).

5. **Resultados generales**  
   Resto que coincida con el texto de búsqueda pero sin coincidencia clara de comuna/cobertura.

Implementación:
- **API:** `app/api/buscar/route.ts` — orden por “bucket” (exacta → cobertura_comuna → varias_regiones → nacional → general) y por puntuación de texto.
- **Front:** `app/buscar/BuscarClient.tsx` — agrupa por bucket y muestra las secciones en ese orden.

---

## 4. Archivos clave

| Qué | Dónde |
|-----|--------|
| Inscripción (flujo completo) | `app/publicar/` (PublicarClient, pasos por paso) |
| Datos básicos + responsable visible/oculto | `app/publicar/PasoInformacionBasica.tsx` |
| Categoría y subcategorías | `app/publicar/PasoClasificacion.tsx` |
| Comuna base, cobertura, modalidades | `app/publicar/PasoUbicacionCobertura.tsx` |
| Lógica de búsqueda (orden por comuna/cobertura) | `app/api/buscar/route.ts` |
| UI de resultados por bloques | `app/buscar/BuscarClient.tsx` |
| Ficha del emprendedor (mostrar/ocultar responsable) | `app/emprendedor/[slug]/page.tsx` (usa `mostrar_responsable`) |
| Guardar emprendedor en BD | `app/api/publicar/route.ts` |

---

## 5. Pruebas

```bash
npm test
```

- **lib/busqueda.test.ts**: `classifyTier` (base, cobertura, regional, nacional) y orden de resultados por comuna.
- **lib/cobertura.test.ts**: `coberturaTexto` y `coberturaBadge` para etiquetas de la ficha.

Modo watch: `npm run test:watch`.

## 6. Próximos pasos posibles

- Ajustar copy en home y buscar para reforzar marketplace de servicios por comuna.
- Tests E2E (Playwright) para flujo de publicar y buscar.
