-- =============================================================================
-- Vista: public_emprendedores_search
-- =============================================================================
-- Consolida solo datos PÚBLICOS del emprendedor para:
--   - Búsquedas (API, listados)
--   - Indexación a Algolia
--   - Endpoints públicos
--
-- No incluye: email interno, responsable (si está oculto), datos admin, métricas.
-- =============================================================================

CREATE OR REPLACE VIEW public_emprendedores_search AS
SELECT
  -- ----------------------------------------
  -- Identificación
  -- ----------------------------------------
  e.id,
  e.slug,
  e.nombre,

  -- ----------------------------------------
  -- Datos públicos de contenido
  -- ----------------------------------------
  e.descripcion_corta,
  e.descripcion_larga,
  e.foto_principal_url,

  -- ----------------------------------------
  -- Links públicos (contacto)
  -- ----------------------------------------
  e.whatsapp,
  e.instagram,
  COALESCE(e.sitio_web, e.web) AS web,

  -- ----------------------------------------
  -- Categoría principal (una por emprendedor)
  -- ----------------------------------------
  cat.id          AS categoria_id,
  cat.nombre      AS categoria_nombre,
  cat.slug        AS categoria_slug,

  -- ----------------------------------------
  -- Subcategorías (varias, solo de esa categoría)
  -- Arrays para búsqueda y filtros.
  -- ----------------------------------------
  (
    SELECT array_agg(s.nombre ORDER BY s.nombre)
    FROM emprendedor_subcategorias es
    JOIN subcategorias s ON s.id = es.subcategoria_id
    WHERE es.emprendedor_id = e.id
  ) AS subcategorias_nombres_arr,

  (
    SELECT array_agg(s.slug ORDER BY s.slug)
    FROM emprendedor_subcategorias es
    JOIN subcategorias s ON s.id = es.subcategoria_id
    WHERE es.emprendedor_id = e.id
  ) AS subcategorias_slugs_arr,

  -- ----------------------------------------
  -- Comuna base (obligatoria en el modelo)
  -- ----------------------------------------
  cb.id           AS comuna_base_id,
  cb.nombre       AS comuna_base_nombre,
  cb.slug         AS comuna_base_slug,

  -- ----------------------------------------
  -- Región (de la comuna base)
  -- ----------------------------------------
  reg.id          AS region_id,
  reg.nombre      AS region_nombre,
  reg.slug        AS region_slug,

  -- ----------------------------------------
  -- Cobertura
  -- nivel: solo_mi_comuna | varias_comunas | regional | nacional
  -- Arrays de comunas/regiones cuando aplica.
  -- ----------------------------------------
  e.nivel_cobertura,
  e.coverage_keys,
  e.coverage_labels,

  (
    SELECT array_agg(c.nombre ORDER BY c.nombre)
    FROM emprendedor_comunas_cobertura ecc
    JOIN comunas c ON c.id = ecc.comuna_id
    WHERE ecc.emprendedor_id = e.id
  ) AS comunas_cobertura_nombres_arr,

  (
    SELECT array_agg(c.slug ORDER BY c.slug)
    FROM emprendedor_comunas_cobertura ecc
    JOIN comunas c ON c.id = ecc.comuna_id
    WHERE ecc.emprendedor_id = e.id
  ) AS comunas_cobertura_slugs_arr,

  (
    SELECT array_agg(r.nombre ORDER BY r.nombre)
    FROM emprendedor_regiones_cobertura erb
    JOIN regiones r ON r.id = erb.region_id
    WHERE erb.emprendedor_id = e.id
  ) AS regiones_cobertura_nombres_arr,

  (
    SELECT array_agg(r.slug ORDER BY r.slug)
    FROM emprendedor_regiones_cobertura erb
    JOIN regiones r ON r.id = erb.region_id
    WHERE erb.emprendedor_id = e.id
  ) AS regiones_cobertura_slugs_arr,

  -- ----------------------------------------
  -- Visibilidad (para filtrar en app o reindex)
  -- ----------------------------------------
  e.estado_publicacion,
  COALESCE(e.activo, true) AS activo,

  -- ----------------------------------------
  -- Texto consolidado para búsqueda (Algolia / search)
  -- nombre + descripción + categoría + subcategorías + comuna + keywords
  -- ----------------------------------------
  trim(
    concat_ws(
      ' ',
      e.nombre,
      e.descripcion_corta,
      e.descripcion_larga,
      cat.nombre,
      (
        SELECT string_agg(s.nombre, ' ' ORDER BY s.nombre)
        FROM emprendedor_subcategorias es
        JOIN subcategorias s ON s.id = es.subcategoria_id
        WHERE es.emprendedor_id = e.id
      ),
      cb.nombre,
      CASE WHEN e.keywords IS NOT NULL THEN array_to_string(e.keywords, ' ') ELSE '' END
    )
  ) AS search_text

FROM emprendedores e
LEFT JOIN categorias cat   ON cat.id = e.categoria_id
LEFT JOIN comunas cb       ON cb.id = e.comuna_base_id
LEFT JOIN regiones reg     ON reg.id = cb.region_id;

-- =============================================================================
-- Uso recomendado
-- =============================================================================
-- Para búsqueda pública o reindex a Algolia, filtrar solo visibles:
--
--   SELECT * FROM public_emprendedores_search
--   WHERE estado_publicacion = 'publicado'
--     AND (activo IS NOT DISTINCT FROM true);
--
-- =============================================================================
-- Notas de esquema
-- =============================================================================
-- Si tu tabla emprendedores usa nombres distintos, ajusta:
--   - sitio_web / web          -> uno de los dos o ambos
--   - coverage_keys / coverage_labels -> si usas otro modelo de cobertura
--   - keywords                  -> puede ser text[] o jsonb; array_to_string si es array
--   - activo                   -> si no existe, quita COALESCE(activo, true)
--
-- Tablas de relación que deben existir:
--   - emprendedor_subcategorias (emprendedor_id, subcategoria_id)
--   - emprendedor_comunas_cobertura (emprendedor_id, comuna_id)
--   - emprendedor_regiones_cobertura (emprendedor_id, region_id)
-- =============================================================================
