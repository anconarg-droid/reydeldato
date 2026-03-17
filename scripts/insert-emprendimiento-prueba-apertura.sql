-- =============================================================================
-- Insertar emprendimiento de prueba + subcategoría (comuna talagante, panaderia)
-- Requiere categoria_id en emprendedores por trigger check_emprendedor_subcategoria_match().
-- Se obtiene categoria_id desde la subcategoría elegida (panaderia).
-- =============================================================================
DO $$
DECLARE
  v_comuna_id     uuid;
  v_comuna_slug   text;
  v_comuna_nom    text;
  v_subcat_id     uuid;
  v_categoria_id  uuid;
  v_emp_id        uuid;
  v_slug          text := 'panaderia-prueba-' || to_char(now(), 'YYYYMMDDHH24MISS');
BEGIN
  -- 1) Buscar subcategoría slug = 'panaderia' y obtener id + categoria_id
  --    (subcategorias tiene categoria_id; si no, usar join con categorias)
  SELECT s.id, s.categoria_id
  INTO v_subcat_id, v_categoria_id
  FROM public.subcategorias s
  WHERE s.slug = 'panaderia'
  LIMIT 1;

  IF v_subcat_id IS NULL THEN
    RAISE EXCEPTION 'Subcategoría con slug panaderia no encontrada en public.subcategorias';
  END IF;

  IF v_categoria_id IS NULL THEN
    RAISE EXCEPTION 'Subcategoría panaderia no tiene categoria_id asignado';
  END IF;

  -- 2) UUID de la comuna 'talagante'
  SELECT c.id, c.slug, c.nombre
  INTO v_comuna_id, v_comuna_slug, v_comuna_nom
  FROM public.comunas c
  WHERE c.slug = 'talagante'
  LIMIT 1;

  IF v_comuna_id IS NULL THEN
    RAISE EXCEPTION 'Comuna con slug talagante no encontrada en public.comunas';
  END IF;

  -- 3) INSERT en emprendedores (incluye categoria_id para el trigger)
  INSERT INTO public.emprendedores (
    nombre,
    slug,
    comuna_base_id,
    nivel_cobertura,
    categoria_id,
    estado_publicacion,
    coverage_keys,
    coverage_labels
  ) VALUES (
    'Panadería de prueba',
    v_slug,
    v_comuna_id,
    'solo_mi_comuna',
    v_categoria_id,
    'publicado',
    ARRAY[v_comuna_slug],
    ARRAY[v_comuna_nom]
  )
  RETURNING id INTO v_emp_id;

  -- 4) Relación emprendedor <-> subcategoría
  INSERT INTO public.emprendedor_subcategorias (emprendedor_id, subcategoria_id)
  VALUES (v_emp_id, v_subcat_id);

  -- 5) Devolver id, categoria_id y subcategoria_id
  RAISE NOTICE 'Emprendimiento creado: id = %, categoria_id = %, subcategoria_id = %',
    v_emp_id, v_categoria_id, v_subcat_id;
END $$;
