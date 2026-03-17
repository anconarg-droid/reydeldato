# Taxonomía para clasificación interna

La taxonomía (categorías, subcategorías y diccionario de keywords) es **solo para uso interno**. El usuario no elige categoría ni subcategoría manualmente; el sistema clasifica con texto libre + IA + diccionario.

## Estructura

1. **Categorías principales** (~16)  
   Tabla `public.categorias`: `id`, `nombre`, `slug`.  
   Ejemplos: alimentación, hogar_construccion, vehiculos_transporte, salud_belleza, etc.

2. **Subcategorías oficiales** (200–300)  
   Tabla `public.subcategorias`: `id`, `categoria_id`, `nombre`, `slug`.  
   Cada subcategoría pertenece a una categoría.

3. **Diccionario keyword → subcategoría**  
   Tabla `public.keyword_to_subcategory_map`: `keyword`, `normalized_keyword`, `subcategoria_id`, `confidence_default`, `activo`.  
   Mapea palabras reales (y sinónimos) a una subcategoría.

## Ejemplos de mapeo

| keyword   | subcategoria     |
|----------|-------------------|
| vulca    | vulcanizacion     |
| plomero  | gasfiter          |
| melamina | muebles_a_medida  |
| panadero | panaderia         |
| tortas   | pasteleria        |

## Flujo de clasificación automática

1. Entrada: `descripcion_negocio` + `keywords_usuario` + `nombre_emprendimiento`.
2. La IA (opcional) extrae más términos de la descripción.
3. Se combinan términos (usuario primero, luego IA) y se normalizan a forma slug.
4. Se consulta `keyword_to_subcategory_map` (y, si aplica, similitud por slug en `subcategorias`).
5. Se asigna `subcategoria_principal_id` (y relaciones en `emprendedor_subcategorias`).

**No se usa** `frase_negocio` para clasificación.

## Carga inicial

Migración: `supabase/migrations/20260328000000_taxonomia_categorias_subcategorias.sql`

- Crea `categorias` si no existe.
- Inserta 16 categorías (ON CONFLICT DO NOTHING).
- Inserta subcategorías de ejemplo (~40) por categoría (ON CONFLICT slug DO NOTHING).
- Inserta filas en `keyword_to_subcategory_map` (vulca, plomero, melamina y otros sinónimos; ON CONFLICT keyword DO UPDATE).

**Orden recomendado:** ejecutar después de `20260326000000_motor_clasificacion_ia_completo.sql` (para que existan `subcategorias` y `keyword_to_subcategory_map`).

## Ampliar la taxonomía

- **Más subcategorías:** añadir `INSERT INTO public.subcategorias (categoria_id, nombre, slug) SELECT id, 'Nombre', 'slug' FROM public.categorias WHERE slug = 'categoria_slug' LIMIT 1 ON CONFLICT (slug) DO NOTHING;` (o un script/CSV que haga estos inserts).
- **Más keywords:** añadir en `keyword_to_subcategory_map` con `keyword`, `normalized_keyword` (slug del término), `subcategoria_id` (id de la subcategoría objetivo), `confidence_default` (ej. 0.85), `activo = true`.  
  Para resolver `subcategoria_id` por slug: `SELECT id FROM public.subcategorias WHERE slug = 'slug_subcategoria' LIMIT 1`.

## Normalización de keywords

En código (`lib/classifyBusiness.ts`) los términos se normalizan a slug: minúsculas, sin acentos, espacios/guiones reemplazados por `-`. En `keyword_to_subcategory_map`, `normalized_keyword` debe usar esa misma forma para que el match funcione (p. ej. `muebles-a-medida` para la subcategoría `muebles_a_medida`).
