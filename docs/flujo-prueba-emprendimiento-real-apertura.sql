-- =============================================================================
-- Flujo para probar un emprendimiento real y validar vw_conteo_comuna_rubro
-- Usar UUIDs reales: comuna_base_id y subcategoria_id son UUID, no texto.
-- Ejecutar en Supabase SQL Editor (paso a paso o el script único al final).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- PASO 1: Obtener un id real de comuna (UUID)
-- -----------------------------------------------------------------------------
-- Opción A: por slug de comuna
SELECT id AS comuna_id, slug AS comuna_slug, nombre AS comuna_nombre
FROM public.comunas
WHERE slug = 'talagante'   -- cambiar por la comuna que quieras
LIMIT 1;

-- Opción B: cualquier comuna
-- SELECT id AS comuna_id, slug, nombre FROM public.comunas LIMIT 1;

-- Copiar el valor de "comuna_id" (UUID) para usarlo en el INSERT del paso 2,
-- o usar el paso 2 con subconsulta (recomendado).

-- -----------------------------------------------------------------------------
-- PASO 2: Insertar emprendedor usando ese UUID en comuna_base_id
-- -----------------------------------------------------------------------------
-- Reemplaza 'talagante' por el slug de la comuna que quieras.
-- El slug del emprendimiento debe ser único; aquí usamos uno con timestamp.
INSERT INTO public.emprendedores (
  slug,
  nombre,
  descripcion_corta,
  descripcion_larga,
  categoria_id,
  comuna_base_id,
  direccion,
  nivel_cobertura,
  cobertura,
  coverage_keys,
  coverage_labels,
  modalidades_atencion,
  whatsapp,
  instagram,
  sitio_web,
  web,
  email,
  responsable_nombre,
  mostrar_responsable,
  keywords,
  tipo_actividad,
  sector_slug,
  tags_slugs,
  keywords_clasificacion,
  clasificacion_confianza,
  clasificacion_fuente,
  foto_principal_url,
  galeria_urls,
  estado,
  estado_publicacion,
  form_completo,
  activo
)
SELECT
  'panaderia-prueba-' || to_char(now(), 'YYYYMMDDHH24MISS'),
  'Panadería de prueba',
  'Emprendimiento de prueba para validar conteo por rubro.',
  NULL,
  NULL,
  c.id,   -- UUID real de la comuna
  NULL,
  'solo_mi_comuna',
  'solo_mi_comuna',
  ARRAY[c.slug],
  ARRAY[c.nombre],
  ARRAY[]::text[],
  '+56912345678',
  NULL,
  NULL,
  NULL,
  'test@ejemplo.com',
  'Responsable prueba',
  true,
  ARRAY[]::text[],
  'servicio',
  'alimentacion',
  ARRAY['panaderia'],
  NULL,
  NULL,
  NULL,
  '',
  ARRAY[]::text[],
  'pendiente_revision',
  'publicado',
  true,
  true
FROM public.comunas c
WHERE c.slug = 'talagante'   -- cambiar por tu comuna
LIMIT 1
RETURNING id AS emprendedor_id, slug, nombre, comuna_base_id;

-- Copiar el "emprendedor_id" (UUID) que devuelve el RETURNING para el paso 4.

-- -----------------------------------------------------------------------------
-- PASO 3: Obtener el id real de la subcategoría panadería (UUID)
-- -----------------------------------------------------------------------------
SELECT id AS subcategoria_id, slug AS subcategoria_slug, nombre
FROM public.subcategorias
WHERE slug = 'panaderia'
LIMIT 1;

-- Si no existe 'panaderia', listar subcategorías disponibles:
-- SELECT id, slug, nombre FROM public.subcategorias ORDER BY slug LIMIT 20;

-- -----------------------------------------------------------------------------
-- PASO 4: Insertar en emprendedor_subcategorias (UUID emprendedor + UUID subcategoría)
-- -----------------------------------------------------------------------------
-- Reemplaza 'AQUI_UUID_EMP' por el emprendedor_id del paso 2.
-- La subcategoría se puede poner por subquery para no copiar UUID.
INSERT INTO public.emprendedor_subcategorias (emprendedor_id, subcategoria_id)
SELECT
  'AQUI_UUID_EMP'::uuid,
  s.id
FROM public.subcategorias s
WHERE s.slug = 'panaderia'
LIMIT 1;

-- Versión alternativa: si acabas de ejecutar el paso 2 y tienes el emprendedor_id,
-- sustituye en la línea de arriba 'AQUI_UUID_EMP' por ese UUID (ej: 'a1b2c3d4-e5f6-...').

-- -----------------------------------------------------------------------------
-- PASO 5: Validar que aparece en vw_conteo_comuna_rubro
-- -----------------------------------------------------------------------------
-- Por comuna (ajusta el slug si usaste otra comuna)
SELECT *
FROM public.vw_conteo_comuna_rubro
WHERE comuna_slug = 'talagante'
  AND subcategoria_slug = 'panaderia';

-- Ver todas las filas de esa comuna
SELECT * FROM public.vw_conteo_comuna_rubro WHERE comuna_slug = 'talagante';

-- Ver la comuna en la vista final de apertura
SELECT comuna_slug, comuna_nombre, total_contado_apertura, meta_apertura, estado_apertura, rubros_detalle
FROM public.vw_comunas_por_abrir
WHERE comuna_slug = 'talagante';


-- =============================================================================
-- SCRIPT ÚNICO (opcional): ejecutar todo en una sola vez
-- Crea el emprendedor y la relación con panadería, luego valida.
-- Cambia 'talagante' por el slug de la comuna que quieras.
-- =============================================================================
/*
DO $$
DECLARE
  v_comuna_id   uuid;
  v_subcat_id   uuid;
  v_emp_id      uuid;
  v_comuna_slug text := 'talagante';
BEGIN
  SELECT id INTO v_comuna_id FROM public.comunas WHERE slug = v_comuna_slug LIMIT 1;
  IF v_comuna_id IS NULL THEN
    RAISE EXCEPTION 'Comuna con slug % no encontrada.', v_comuna_slug;
  END IF;

  SELECT id INTO v_subcat_id FROM public.subcategorias WHERE slug = 'panaderia' LIMIT 1;
  IF v_subcat_id IS NULL THEN
    RAISE EXCEPTION 'Subcategoría panaderia no encontrada.';
  END IF;

  INSERT INTO public.emprendedores (
    slug, nombre, descripcion_corta, descripcion_larga, categoria_id, comuna_base_id,
    direccion, nivel_cobertura, cobertura, coverage_keys, coverage_labels,
    modalidades_atencion, whatsapp, instagram, sitio_web, web, email,
    responsable_nombre, mostrar_responsable, keywords, tipo_actividad, sector_slug,
    tags_slugs, keywords_clasificacion, clasificacion_confianza, clasificacion_fuente,
    foto_principal_url, galeria_urls, estado, estado_publicacion, form_completo, activo
  )
  VALUES (
    'panaderia-prueba-' || to_char(now(), 'YYYYMMDDHH24MISS'),
    'Panadería de prueba',
    'Emprendimiento de prueba.',
    NULL, NULL, v_comuna_id, NULL, 'solo_mi_comuna', 'solo_mi_comuna',
    ARRAY[v_comuna_slug], ARRAY[''], ARRAY[]::text[], '+56912345678', NULL, NULL, NULL, 'test@ejemplo.com',
    'Responsable', true, ARRAY[]::text[], 'servicio', 'alimentacion', ARRAY['panaderia'],
    NULL, NULL, NULL, '', ARRAY[]::text[], 'pendiente_revision', 'publicado', true, true
  )
  RETURNING id INTO v_emp_id;

  INSERT INTO public.emprendedor_subcategorias (emprendedor_id, subcategoria_id)
  VALUES (v_emp_id, v_subcat_id);

  RAISE NOTICE 'Emprendedor creado: id %, comuna %, subcategoría panaderia. Valida con: SELECT * FROM vw_conteo_comuna_rubro WHERE comuna_slug = ''%'';', v_emp_id, v_comuna_slug, v_comuna_slug;
END $$;
*/
