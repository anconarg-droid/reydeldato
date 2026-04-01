-- =============================================================================
-- Seed idempotente: taxonomía interna (docs/taxonomia-categorias-subcategorias.md)
--
-- AUDITORÍA DE ESQUEMA (repo Supabase / migraciones consolidadas)
-- ---------------------------------------------------------------------------
-- public.categorias
--   - id uuid PK DEFAULT gen_random_uuid()
--   - nombre text NOT NULL, slug text NOT NULL
--   - UNIQUE(slug)  → constraint típico: uq_categorias_slug
--   - Opcional (20260330000000): es_fallback_interno boolean
--
-- public.subcategorias
--   - id uuid PK, categoria_id uuid NOT NULL FK → categorias(id)
--   - nombre text NOT NULL, slug text NOT NULL
--   - En migraciones históricas del repo: UNIQUE(slug) global (uq_subcategorias_slug)
--   - Si tu base real añadió compuestos: UNIQUE(categoria_id, slug) y
--     UNIQUE(categoria_id, nombre), este bloque 2 usa ON CONFLICT (categoria_id, slug).
--     Si al ejecutar ves "no unique constraint matching", sustituye la cláusula por:
--     ON CONFLICT (slug) DO NOTHING;
--
-- public.keyword_to_subcategory_map
--   - subcategoria_id uuid NOT NULL FK → subcategorias(id)
--   - UNIQUE(normalized_keyword)  → uq_keyword_to_subcategory_normalized
--   - Columnas extra opcionales: usage_count, source_type (defaults al INSERT)
--
-- REGLAS DEL SEED
--   - Sin CREATE TABLE, sin DROP, sin TRUNCATE, sin cambio de tipos.
--   - Solo INSERT ... ON CONFLICT (omitir duplicados o actualizar mapa por keyword).
--
-- CONTEO ESPERADO (tras ejecutar en BD vacía de estas filas; doc taxonomía v1)
--   - categorías nuevas insertadas: 16
--   - subcategorías nuevas insertadas: 137
--   - filas keyword (canon por slug de subcategoría): 137
-- =============================================================================

-- -----------------------------------------------------------------------------
-- BLOQUE 1 — Categorías internas (16)
-- -----------------------------------------------------------------------------
INSERT INTO public.categorias (nombre, slug)
VALUES
  ('Alimentación', 'alimentacion'),
  ('Gastronomía y eventos', 'gastronomia_eventos'),
  ('Hogar y construcción', 'hogar_construccion'),
  ('Reparaciones y mantención', 'reparaciones_mantencion'),
  ('Automotriz y transporte', 'automotriz_transporte'),
  ('Comercio y tiendas', 'comercio_tiendas'),
  ('Belleza y estética', 'belleza_estetica'),
  ('Salud y bienestar', 'salud_bienestar'),
  ('Educación y clases', 'educacion_clases'),
  ('Mascotas', 'mascotas'),
  ('Tecnología', 'tecnologia'),
  ('Servicios profesionales', 'servicios_profesionales'),
  ('Finanzas y seguros', 'finanzas_seguros'),
  ('Deportes y recreación', 'deportes_recreacion'),
  ('Arte y cultura', 'arte_cultura'),
  ('Otros', 'otros')
ON CONFLICT (slug) DO NOTHING;

-- Marcar "Otros" como fallback interno si la columna existe (migración v1 oficial).
UPDATE public.categorias
SET es_fallback_interno = true
WHERE slug = 'otros'
  AND EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'categorias'
      AND column_name = 'es_fallback_interno'
  );

-- -----------------------------------------------------------------------------
-- BLOQUE 2 — Subcategorías (137)
-- -----------------------------------------------------------------------------
INSERT INTO public.subcategorias (categoria_id, nombre, slug)
SELECT c.id, v.nombre, v.slug
FROM public.categorias c
JOIN (VALUES
  ('alimentacion', 'Almacén y minimarket', 'almacen_minimarket'),
  ('alimentacion', 'Verdulería y frutas', 'verduleria_frutas'),
  ('alimentacion', 'Carnicería', 'carniceria'),
  ('alimentacion', 'Panadería', 'panaderia'),
  ('alimentacion', 'Pastelería y repostería', 'pasteleria_reposteria'),
  ('alimentacion', 'Comida casera y colaciones', 'comida_casera_colaciones'),
  ('alimentacion', 'Empanadas', 'empanadas'),
  ('alimentacion', 'Pizzas', 'pizzas'),
  ('alimentacion', 'Comida rápida y sándwich', 'comida_rapida_sandwich'),
  ('alimentacion', 'Comida internacional', 'comida_internacional'),
  ('alimentacion', 'Cafeterías', 'cafeterias'),
  ('alimentacion', 'Productos gourmet', 'productos_gourmet'),
  ('gastronomia_eventos', 'Banquetería y catering', 'banqueteria_catering'),
  ('gastronomia_eventos', 'Tortas para eventos', 'tortas_eventos'),
  ('gastronomia_eventos', 'Coctelería y bar', 'cocteleria_bar_eventos'),
  ('gastronomia_eventos', 'Salones y centros de eventos', 'salones_eventos'),
  ('gastronomia_eventos', 'Arriendo de equipos', 'arriendo_equipo_eventos'),
  ('gastronomia_eventos', 'Animación infantil', 'animacion_infantil'),
  ('gastronomia_eventos', 'DJ y música para eventos', 'dj_musica_eventos'),
  ('gastronomia_eventos', 'Música en vivo', 'musica_en_vivo'),
  ('gastronomia_eventos', 'Decoración de eventos', 'decoracion_eventos'),
  ('gastronomia_eventos', 'Food trucks', 'food_trucks'),
  ('gastronomia_eventos', 'Organización de eventos', 'organizacion_eventos'),
  ('hogar_construccion', 'Construcción', 'construccion'),
  ('hogar_construccion', 'Maestro constructor', 'maestro_constructor'),
  ('hogar_construccion', 'Remodelaciones', 'remodelaciones'),
  ('hogar_construccion', 'Carpintería', 'carpinteria'),
  ('hogar_construccion', 'Pintura', 'pintura'),
  ('hogar_construccion', 'Cerámica y pisos', 'ceramica_pisos'),
  ('hogar_construccion', 'Techumbre', 'techumbre'),
  ('hogar_construccion', 'Venta de materiales', 'venta_materiales_construccion'),
  ('hogar_construccion', 'Ferretería', 'ferreteria'),
  ('hogar_construccion', 'Paisajismo y jardinería', 'paisajismo_jardineria'),
  ('reparaciones_mantencion', 'Gasfiter', 'gasfiter'),
  ('reparaciones_mantencion', 'Electricista', 'electricista'),
  ('reparaciones_mantencion', 'Cerrajería', 'cerrajeria'),
  ('reparaciones_mantencion', 'Reparación de electrodomésticos', 'reparacion_electrodomesticos'),
  ('reparaciones_mantencion', 'Reparación de lavadoras', 'reparacion_lavadoras'),
  ('reparaciones_mantencion', 'Reparación de refrigeradores', 'reparacion_refrigeradores'),
  ('reparaciones_mantencion', 'Climatización', 'climatizacion'),
  ('reparaciones_mantencion', 'Multiservicios a domicilio', 'multiservicios_domicilio'),
  ('reparaciones_mantencion', 'Mantención de edificios', 'mantencion_edificios'),
  ('reparaciones_mantencion', 'Fumigación y plagas', 'fumigacion_plagas'),
  ('automotriz_transporte', 'Taller mecánico', 'taller_mecanico'),
  ('automotriz_transporte', 'Mecánico a domicilio', 'mecanico_domicilio'),
  ('automotriz_transporte', 'Alineación y balanceo', 'alineacion_balanceo'),
  ('automotriz_transporte', 'Vulcanización', 'vulcanizacion'),
  ('automotriz_transporte', 'Electromecánica', 'electromecanica'),
  ('automotriz_transporte', 'Lavado de vehículos', 'lavado_vehiculos'),
  ('automotriz_transporte', 'Detailing automotriz', 'detailing_automotriz'),
  ('automotriz_transporte', 'Fletes', 'fletes'),
  ('automotriz_transporte', 'Mudanzas', 'mudanzas'),
  ('automotriz_transporte', 'Transporte escolar', 'transporte_escolar'),
  ('automotriz_transporte', 'Transporte de personas', 'transporte_personas'),
  ('comercio_tiendas', 'Tienda de ropa', 'tienda_ropa'),
  ('comercio_tiendas', 'Zapatería', 'zapateria'),
  ('comercio_tiendas', 'Tienda de deportes', 'tienda_deportes'),
  ('comercio_tiendas', 'Bazar y regalos', 'bazar_regalos'),
  ('comercio_tiendas', 'Librería y papelería', 'libreria_papeleria'),
  ('comercio_tiendas', 'Perfumería y cosméticos', 'perfumeria_cosmeticos'),
  ('comercio_tiendas', 'Tienda de decoración', 'tienda_decoracion'),
  ('comercio_tiendas', 'Tienda de mascotas', 'tienda_mascotas'),
  ('comercio_tiendas', 'Tienda online', 'tienda_online'),
  ('belleza_estetica', 'Peluquería', 'peluqueria'),
  ('belleza_estetica', 'Barbería', 'barberia'),
  ('belleza_estetica', 'Manicure y pedicure', 'manicure_pedicure'),
  ('belleza_estetica', 'Uñas gel y acrílico', 'unas_gel_acrilico'),
  ('belleza_estetica', 'Estética facial', 'estetica_facial'),
  ('belleza_estetica', 'Depilación', 'depilacion'),
  ('belleza_estetica', 'Maquillaje', 'maquillaje'),
  ('belleza_estetica', 'Pestañas y cejas', 'pestanas_cejas'),
  ('belleza_estetica', 'Spa y masajes', 'spa_masajes'),
  ('belleza_estetica', 'Bronceado', 'bronceado'),
  ('salud_bienestar', 'Consulta médica', 'consulta_medica'),
  ('salud_bienestar', 'Kinesiología', 'kinesiologia'),
  ('salud_bienestar', 'Nutricionista', 'nutricionista'),
  ('salud_bienestar', 'Psicólogo', 'psicologo'),
  ('salud_bienestar', 'Fonoaudiólogo', 'fonoaudiologo'),
  ('salud_bienestar', 'Terapias complementarias', 'terapias_complementarias'),
  ('salud_bienestar', 'Masajes terapéuticos', 'masajes_terapeuticos'),
  ('salud_bienestar', 'Podología', 'podologia'),
  ('salud_bienestar', 'Óptica', 'optica'),
  ('educacion_clases', 'Clases particulares', 'clases_particulares'),
  ('educacion_clases', 'Apoyo escolar', 'apoyo_escolar'),
  ('educacion_clases', 'Preparación PAES', 'preparacion_paes'),
  ('educacion_clases', 'Clases de inglés', 'clases_ingles'),
  ('educacion_clases', 'Talleres de oficios', 'talleres_oficios'),
  ('educacion_clases', 'Talleres artísticos', 'talleres_artisticos'),
  ('educacion_clases', 'Clases de música', 'clases_musica'),
  ('educacion_clases', 'Clases de deporte y danza', 'clases_deporte_danza'),
  ('mascotas', 'Veterinaria', 'veterinaria'),
  ('mascotas', 'Peluquería canina', 'peluqueria_canina'),
  ('mascotas', 'Paseo de perros', 'paseo_perros'),
  ('mascotas', 'Guardería de mascotas', 'guarderia_mascotas'),
  ('mascotas', 'Adiestramiento canino', 'adiestramiento_canino'),
  ('mascotas', 'Tienda de accesorios para mascotas', 'tienda_accesorios_mascotas'),
  ('tecnologia', 'Reparación de computadores', 'reparacion_computadores'),
  ('tecnologia', 'Reparación de celulares', 'reparacion_celulares'),
  ('tecnologia', 'Soporte informático', 'soporte_informatico'),
  ('tecnologia', 'Instalación de redes y WiFi', 'instalacion_redes_wifi'),
  ('tecnologia', 'Cámaras de seguridad', 'camaras_seguridad'),
  ('tecnologia', 'Desarrollo web', 'desarrollo_web'),
  ('tecnologia', 'Desarrollo de apps', 'desarrollo_apps'),
  ('tecnologia', 'Domótica', 'domotica'),
  ('tecnologia', 'Venta de hardware', 'venta_hardware'),
  ('servicios_profesionales', 'Abogado', 'abogado'),
  ('servicios_profesionales', 'Contador y auditor', 'contador_auditor'),
  ('servicios_profesionales', 'Asesoría tributaria', 'asesoria_tributaria'),
  ('servicios_profesionales', 'Consultoría de negocios', 'consultoria_negocios'),
  ('servicios_profesionales', 'Marketing digital', 'marketing_digital'),
  ('servicios_profesionales', 'Diseño gráfico', 'diseno_grafico'),
  ('servicios_profesionales', 'Arquitectura', 'arquitectura'),
  ('servicios_profesionales', 'Ingeniería', 'ingenieria'),
  ('servicios_profesionales', 'RRHH y reclutamiento', 'rrhh_reclutamiento'),
  ('servicios_profesionales', 'Coaching y mentoría', 'coaching_mentoria'),
  ('finanzas_seguros', 'Corredor de seguros', 'corredor_seguros'),
  ('finanzas_seguros', 'Asesoría financiera', 'asesoria_financiera'),
  ('finanzas_seguros', 'Asesoría financiera empresas', 'asesoria_financiera_empresas'),
  ('finanzas_seguros', 'Gestión de créditos', 'gestion_creditos'),
  ('finanzas_seguros', 'Factoring y leasing', 'factoring_leasing'),
  ('finanzas_seguros', 'Previsión y ahorro', 'prevision_ahorro'),
  ('deportes_recreacion', 'Gimnasio', 'gimnasio'),
  ('deportes_recreacion', 'Personal trainer', 'personal_trainer'),
  ('deportes_recreacion', 'Escuela de fútbol', 'escuela_futbol'),
  ('deportes_recreacion', 'Escuela de danza', 'escuela_danza'),
  ('deportes_recreacion', 'Yoga y pilates', 'yoga_pilates'),
  ('deportes_recreacion', 'Turismo aventura', 'turismo_aventura'),
  ('deportes_recreacion', 'Club deportivo', 'club_deportivo'),
  ('arte_cultura', 'Taller de pintura y dibujo', 'taller_pintura_dibujo'),
  ('arte_cultura', 'Taller de artesanía', 'taller_artesania'),
  ('arte_cultura', 'Taller de cerámica', 'taller_ceramica'),
  ('arte_cultura', 'Academia de música', 'academia_musica'),
  ('arte_cultura', 'Academia de teatro', 'academia_teatro'),
  ('arte_cultura', 'Clases de fotografía', 'clases_fotografia'),
  ('otros', 'Servicios varios', 'servicios_varios'),
  ('otros', 'Proyectos especiales', 'proyectos_especiales'),
  ('otros', 'Sin clasificar', 'sin_clasificar')
) AS v(cat_slug, nombre, slug)
  ON c.slug = v.cat_slug
ON CONFLICT (categoria_id, slug) DO NOTHING;

-- -----------------------------------------------------------------------------
-- BLOQUE 3 — keyword_to_subcategory_map (1 fila canónica por subcategoría, 137)
-- normalized_keyword = slug de la subcategoría (clave estable para joins y matching).
-- -----------------------------------------------------------------------------
INSERT INTO public.keyword_to_subcategory_map (
  keyword,
  normalized_keyword,
  subcategoria_id,
  confidence_default,
  activo
)
SELECT
  v.keyword,
  v.sub_slug,
  s.id,
  0.9,
  true
FROM (VALUES
  ('alimentacion', 'almacen_minimarket', 'Almacén y minimarket'),
  ('alimentacion', 'verduleria_frutas', 'Verdulería y frutas'),
  ('alimentacion', 'carniceria', 'Carnicería'),
  ('alimentacion', 'panaderia', 'Panadería'),
  ('alimentacion', 'pasteleria_reposteria', 'Pastelería y repostería'),
  ('alimentacion', 'comida_casera_colaciones', 'Comida casera y colaciones'),
  ('alimentacion', 'empanadas', 'Empanadas'),
  ('alimentacion', 'pizzas', 'Pizzas'),
  ('alimentacion', 'comida_rapida_sandwich', 'Comida rápida y sándwich'),
  ('alimentacion', 'comida_internacional', 'Comida internacional'),
  ('alimentacion', 'cafeterias', 'Cafeterías'),
  ('alimentacion', 'productos_gourmet', 'Productos gourmet'),
  ('gastronomia_eventos', 'banqueteria_catering', 'Banquetería y catering'),
  ('gastronomia_eventos', 'tortas_eventos', 'Tortas para eventos'),
  ('gastronomia_eventos', 'cocteleria_bar_eventos', 'Coctelería y bar'),
  ('gastronomia_eventos', 'salones_eventos', 'Salones y centros de eventos'),
  ('gastronomia_eventos', 'arriendo_equipo_eventos', 'Arriendo de equipos'),
  ('gastronomia_eventos', 'animacion_infantil', 'Animación infantil'),
  ('gastronomia_eventos', 'dj_musica_eventos', 'DJ y música para eventos'),
  ('gastronomia_eventos', 'musica_en_vivo', 'Música en vivo'),
  ('gastronomia_eventos', 'decoracion_eventos', 'Decoración de eventos'),
  ('gastronomia_eventos', 'food_trucks', 'Food trucks'),
  ('gastronomia_eventos', 'organizacion_eventos', 'Organización de eventos'),
  ('hogar_construccion', 'construccion', 'Construcción'),
  ('hogar_construccion', 'maestro_constructor', 'Maestro constructor'),
  ('hogar_construccion', 'remodelaciones', 'Remodelaciones'),
  ('hogar_construccion', 'carpinteria', 'Carpintería'),
  ('hogar_construccion', 'pintura', 'Pintura'),
  ('hogar_construccion', 'ceramica_pisos', 'Cerámica y pisos'),
  ('hogar_construccion', 'techumbre', 'Techumbre'),
  ('hogar_construccion', 'venta_materiales_construccion', 'Venta de materiales'),
  ('hogar_construccion', 'ferreteria', 'Ferretería'),
  ('hogar_construccion', 'paisajismo_jardineria', 'Paisajismo y jardinería'),
  ('reparaciones_mantencion', 'gasfiter', 'Gasfiter'),
  ('reparaciones_mantencion', 'electricista', 'Electricista'),
  ('reparaciones_mantencion', 'cerrajeria', 'Cerrajería'),
  ('reparaciones_mantencion', 'reparacion_electrodomesticos', 'Reparación de electrodomésticos'),
  ('reparaciones_mantencion', 'reparacion_lavadoras', 'Reparación de lavadoras'),
  ('reparaciones_mantencion', 'reparacion_refrigeradores', 'Reparación de refrigeradores'),
  ('reparaciones_mantencion', 'climatizacion', 'Climatización'),
  ('reparaciones_mantencion', 'multiservicios_domicilio', 'Multiservicios a domicilio'),
  ('reparaciones_mantencion', 'mantencion_edificios', 'Mantención de edificios'),
  ('reparaciones_mantencion', 'fumigacion_plagas', 'Fumigación y plagas'),
  ('automotriz_transporte', 'taller_mecanico', 'Taller mecánico'),
  ('automotriz_transporte', 'mecanico_domicilio', 'Mecánico a domicilio'),
  ('automotriz_transporte', 'alineacion_balanceo', 'Alineación y balanceo'),
  ('automotriz_transporte', 'vulcanizacion', 'Vulcanización'),
  ('automotriz_transporte', 'electromecanica', 'Electromecánica'),
  ('automotriz_transporte', 'lavado_vehiculos', 'Lavado de vehículos'),
  ('automotriz_transporte', 'detailing_automotriz', 'Detailing automotriz'),
  ('automotriz_transporte', 'fletes', 'Fletes'),
  ('automotriz_transporte', 'mudanzas', 'Mudanzas'),
  ('automotriz_transporte', 'transporte_escolar', 'Transporte escolar'),
  ('automotriz_transporte', 'transporte_personas', 'Transporte de personas'),
  ('comercio_tiendas', 'tienda_ropa', 'Tienda de ropa'),
  ('comercio_tiendas', 'zapateria', 'Zapatería'),
  ('comercio_tiendas', 'tienda_deportes', 'Tienda de deportes'),
  ('comercio_tiendas', 'bazar_regalos', 'Bazar y regalos'),
  ('comercio_tiendas', 'libreria_papeleria', 'Librería y papelería'),
  ('comercio_tiendas', 'perfumeria_cosmeticos', 'Perfumería y cosméticos'),
  ('comercio_tiendas', 'tienda_decoracion', 'Tienda de decoración'),
  ('comercio_tiendas', 'tienda_mascotas', 'Tienda de mascotas'),
  ('comercio_tiendas', 'tienda_online', 'Tienda online'),
  ('belleza_estetica', 'peluqueria', 'Peluquería'),
  ('belleza_estetica', 'barberia', 'Barbería'),
  ('belleza_estetica', 'manicure_pedicure', 'Manicure y pedicure'),
  ('belleza_estetica', 'unas_gel_acrilico', 'Uñas gel y acrílico'),
  ('belleza_estetica', 'estetica_facial', 'Estética facial'),
  ('belleza_estetica', 'depilacion', 'Depilación'),
  ('belleza_estetica', 'maquillaje', 'Maquillaje'),
  ('belleza_estetica', 'pestanas_cejas', 'Pestañas y cejas'),
  ('belleza_estetica', 'spa_masajes', 'Spa y masajes'),
  ('belleza_estetica', 'bronceado', 'Bronceado'),
  ('salud_bienestar', 'consulta_medica', 'Consulta médica'),
  ('salud_bienestar', 'kinesiologia', 'Kinesiología'),
  ('salud_bienestar', 'nutricionista', 'Nutricionista'),
  ('salud_bienestar', 'psicologo', 'Psicólogo'),
  ('salud_bienestar', 'fonoaudiologo', 'Fonoaudiólogo'),
  ('salud_bienestar', 'terapias_complementarias', 'Terapias complementarias'),
  ('salud_bienestar', 'masajes_terapeuticos', 'Masajes terapéuticos'),
  ('salud_bienestar', 'podologia', 'Podología'),
  ('salud_bienestar', 'optica', 'Óptica'),
  ('educacion_clases', 'clases_particulares', 'Clases particulares'),
  ('educacion_clases', 'apoyo_escolar', 'Apoyo escolar'),
  ('educacion_clases', 'preparacion_paes', 'Preparación PAES'),
  ('educacion_clases', 'clases_ingles', 'Clases de inglés'),
  ('educacion_clases', 'talleres_oficios', 'Talleres de oficios'),
  ('educacion_clases', 'talleres_artisticos', 'Talleres artísticos'),
  ('educacion_clases', 'clases_musica', 'Clases de música'),
  ('educacion_clases', 'clases_deporte_danza', 'Clases de deporte y danza'),
  ('mascotas', 'veterinaria', 'Veterinaria'),
  ('mascotas', 'peluqueria_canina', 'Peluquería canina'),
  ('mascotas', 'paseo_perros', 'Paseo de perros'),
  ('mascotas', 'guarderia_mascotas', 'Guardería de mascotas'),
  ('mascotas', 'adiestramiento_canino', 'Adiestramiento canino'),
  ('mascotas', 'tienda_accesorios_mascotas', 'Tienda de accesorios para mascotas'),
  ('tecnologia', 'reparacion_computadores', 'Reparación de computadores'),
  ('tecnologia', 'reparacion_celulares', 'Reparación de celulares'),
  ('tecnologia', 'soporte_informatico', 'Soporte informático'),
  ('tecnologia', 'instalacion_redes_wifi', 'Instalación de redes y WiFi'),
  ('tecnologia', 'camaras_seguridad', 'Cámaras de seguridad'),
  ('tecnologia', 'desarrollo_web', 'Desarrollo web'),
  ('tecnologia', 'desarrollo_apps', 'Desarrollo de apps'),
  ('tecnologia', 'domotica', 'Domótica'),
  ('tecnologia', 'venta_hardware', 'Venta de hardware'),
  ('servicios_profesionales', 'abogado', 'Abogado'),
  ('servicios_profesionales', 'contador_auditor', 'Contador y auditor'),
  ('servicios_profesionales', 'asesoria_tributaria', 'Asesoría tributaria'),
  ('servicios_profesionales', 'consultoria_negocios', 'Consultoría de negocios'),
  ('servicios_profesionales', 'marketing_digital', 'Marketing digital'),
  ('servicios_profesionales', 'diseno_grafico', 'Diseño gráfico'),
  ('servicios_profesionales', 'arquitectura', 'Arquitectura'),
  ('servicios_profesionales', 'ingenieria', 'Ingeniería'),
  ('servicios_profesionales', 'rrhh_reclutamiento', 'RRHH y reclutamiento'),
  ('servicios_profesionales', 'coaching_mentoria', 'Coaching y mentoría'),
  ('finanzas_seguros', 'corredor_seguros', 'Corredor de seguros'),
  ('finanzas_seguros', 'asesoria_financiera', 'Asesoría financiera'),
  ('finanzas_seguros', 'asesoria_financiera_empresas', 'Asesoría financiera empresas'),
  ('finanzas_seguros', 'gestion_creditos', 'Gestión de créditos'),
  ('finanzas_seguros', 'factoring_leasing', 'Factoring y leasing'),
  ('finanzas_seguros', 'prevision_ahorro', 'Previsión y ahorro'),
  ('deportes_recreacion', 'gimnasio', 'Gimnasio'),
  ('deportes_recreacion', 'personal_trainer', 'Personal trainer'),
  ('deportes_recreacion', 'escuela_futbol', 'Escuela de fútbol'),
  ('deportes_recreacion', 'escuela_danza', 'Escuela de danza'),
  ('deportes_recreacion', 'yoga_pilates', 'Yoga y pilates'),
  ('deportes_recreacion', 'turismo_aventura', 'Turismo aventura'),
  ('deportes_recreacion', 'club_deportivo', 'Club deportivo'),
  ('arte_cultura', 'taller_pintura_dibujo', 'Taller de pintura y dibujo'),
  ('arte_cultura', 'taller_artesania', 'Taller de artesanía'),
  ('arte_cultura', 'taller_ceramica', 'Taller de cerámica'),
  ('arte_cultura', 'academia_musica', 'Academia de música'),
  ('arte_cultura', 'academia_teatro', 'Academia de teatro'),
  ('arte_cultura', 'clases_fotografia', 'Clases de fotografía'),
  ('otros', 'servicios_varios', 'Servicios varios'),
  ('otros', 'proyectos_especiales', 'Proyectos especiales'),
  ('otros', 'sin_clasificar', 'Sin clasificar')
) AS v(cat_slug, sub_slug, keyword)
JOIN public.categorias c ON c.slug = v.cat_slug
JOIN public.subcategorias s ON s.categoria_id = c.id AND s.slug = v.sub_slug
ON CONFLICT (normalized_keyword) DO UPDATE SET
  keyword = EXCLUDED.keyword,
  subcategoria_id = EXCLUDED.subcategoria_id,
  updated_at = now(),
  activo = true;

-- =============================================================================
-- VERIFICACIÓN (ejecutar después del seed; comentar si solo quieres cargar datos)
-- =============================================================================
/*
SELECT
  (SELECT COUNT(*)::int
   FROM public.categorias
   WHERE slug IN (
     'alimentacion', 'gastronomia_eventos', 'hogar_construccion', 'reparaciones_mantencion',
     'automotriz_transporte', 'comercio_tiendas', 'belleza_estetica', 'salud_bienestar',
     'educacion_clases', 'mascotas', 'tecnologia', 'servicios_profesionales',
     'finanzas_seguros', 'deportes_recreacion', 'arte_cultura', 'otros'
   )) AS categorias_taxonomia_doc_esperado_16,
  (SELECT COUNT(DISTINCT s.id)::int
   FROM public.subcategorias s
   JOIN public.categorias c ON c.id = s.categoria_id
   WHERE c.slug IN (
     'alimentacion', 'gastronomia_eventos', 'hogar_construccion', 'reparaciones_mantencion',
     'automotriz_transporte', 'comercio_tiendas', 'belleza_estetica', 'salud_bienestar',
     'educacion_clases', 'mascotas', 'tecnologia', 'servicios_profesionales',
     'finanzas_seguros', 'deportes_recreacion', 'arte_cultura', 'otros'
   )) AS subcategorias_bajo_esas_categorias,
  (SELECT COUNT(DISTINCT s.id)::int
   FROM public.keyword_to_subcategory_map m
   JOIN public.subcategorias s ON s.id = m.subcategoria_id
   JOIN public.categorias c ON c.id = s.categoria_id
   WHERE c.slug IN (
     'alimentacion', 'gastronomia_eventos', 'hogar_construccion', 'reparaciones_mantencion',
     'automotriz_transporte', 'comercio_tiendas', 'belleza_estetica', 'salud_bienestar',
     'educacion_clases', 'mascotas', 'tecnologia', 'servicios_profesionales',
     'finanzas_seguros', 'deportes_recreacion', 'arte_cultura', 'otros'
   )
   AND m.normalized_keyword = s.slug) AS subs_con_mapa_canonico_esperado_137;
*/
-- subcategorias_bajo_esas_categorias: mínimo 137 tras seed; mayor si hubo subs extra bajo los mismos 16 slugs.
-- subs_con_mapa_canonico_esperado_137: debe ser 137 cuando cada sub del seed tiene fila map con normalized_keyword = slug.
-- =============================================================================
