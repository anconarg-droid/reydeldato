-- Clasificación V1: sectores, tags, tags_sugeridos y campos en emprendedores

begin;

-- ============================
-- TABLA: sectores
-- ============================

create table if not exists public.sectores (
  slug text primary key,
  nombre text not null,
  descripcion text,
  orden integer,
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================
-- TABLA: tags
-- ============================

create table if not exists public.tags (
  slug text primary key,
  nombre text not null,
  sector_slug text not null references public.sectores(slug) on update cascade,
  descripcion text,
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_tags_sector_slug on public.tags(sector_slug);

-- ============================
-- TABLA: tags_sugeridos
-- ============================

create extension if not exists "pgcrypto";

create table if not exists public.tags_sugeridos (
  id uuid primary key default gen_random_uuid(),
  propuesto_nombre text not null,
  propuesto_slug text not null,
  sector_slug text not null references public.sectores(slug) on update cascade,
  tipo_actividad text not null,
  emprendedor_id uuid,
  descripcion_contexto text,
  estado text not null default 'pendiente',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.tags_sugeridos
  add constraint if not exists tags_sugeridos_estado_check
  check (estado in ('pendiente', 'aprobado', 'rechazado'));

alter table public.tags_sugeridos
  add constraint if not exists tags_sugeridos_tipo_actividad_check
  check (tipo_actividad in ('venta', 'servicio', 'arriendo'));

-- FK a emprendedores (asumiendo tabla existente con id uuid)
alter table public.tags_sugeridos
  add constraint if not exists tags_sugeridos_emprendedor_fk
  foreign key (emprendedor_id) references public.emprendedores(id) on delete set null;

create index if not exists idx_tags_sugeridos_estado on public.tags_sugeridos(estado);

-- ============================
-- CAMPOS NUEVOS EN emprendedores
-- ============================

alter table public.emprendedores
  add column if not exists tipo_actividad text,
  add column if not exists sector_slug text references public.sectores(slug) on update cascade,
  add column if not exists tags_slugs text[],
  add column if not exists keywords_clasificacion text[],
  add column if not exists clasificacion_confianza numeric,
  add column if not exists clasificacion_fuente text;

alter table public.emprendedores
  add constraint if not exists emprendedores_tipo_actividad_check
  check (tipo_actividad is null or tipo_actividad in ('venta', 'servicio', 'arriendo'));

create index if not exists idx_emprendedores_sector_slug on public.emprendedores(sector_slug);
create index if not exists idx_emprendedores_tipo_actividad on public.emprendedores(tipo_actividad);

-- ============================
-- SEED INICIAL: sectores
-- ============================

insert into public.sectores (slug, nombre, orden, activo)
values
  ('alimentacion', 'Alimentación', 1, true),
  ('hogar_construccion', 'Hogar y construcción', 2, true),
  ('automotriz', 'Automotriz', 3, true),
  ('salud_bienestar', 'Salud y bienestar', 4, true),
  ('belleza_estetica', 'Belleza y estética', 5, true),
  ('mascotas', 'Mascotas', 6, true),
  ('eventos', 'Eventos', 7, true),
  ('educacion_clases', 'Educación y clases', 8, true),
  ('tecnologia', 'Tecnología', 9, true),
  ('comercio_tiendas', 'Comercio y tiendas', 10, true),
  ('transporte_fletes', 'Transporte y fletes', 11, true),
  ('jardin_agricultura', 'Jardín y agricultura', 12, true),
  ('profesionales_asesorias', 'Profesionales y asesorías', 13, true),
  ('turismo_alojamiento', 'Turismo y alojamiento', 14, true),
  ('otros', 'Otros', 15, true)
on conflict (slug) do update set
  nombre = excluded.nombre,
  orden = excluded.orden,
  activo = excluded.activo,
  updated_at = now();

-- ============================
-- SEED INICIAL: tags clave
-- ============================

insert into public.tags (slug, nombre, sector_slug, activo)
values
  -- Hogar y construcción
  ('gasfiter', 'Gasfíter', 'hogar_construccion', true),
  ('electricista', 'Electricista', 'hogar_construccion', true),
  ('maestro_carpintero', 'Maestro carpintero', 'hogar_construccion', true),
  ('pintor', 'Pintor', 'hogar_construccion', true),
  ('cerrajero', 'Cerrajero', 'hogar_construccion', true),

  -- Alimentación
  ('panaderia', 'Panadería', 'alimentacion', true),
  ('pasteleria', 'Pastelería', 'alimentacion', true),
  ('comida_a_domicilio', 'Comida a domicilio', 'alimentacion', true),

  -- Automotriz
  ('taller_mecanico', 'Taller mecánico', 'automotriz', true),
  ('lavado_auto', 'Lavado de autos', 'automotriz', true),

  -- Mascotas
  ('veterinaria', 'Veterinaria', 'mascotas', true),
  ('peluqueria_canina', 'Peluquería canina', 'mascotas', true),

  -- Belleza y estética
  ('peluqueria', 'Peluquería', 'belleza_estetica', true),
  ('manicure', 'Manicure', 'belleza_estetica', true),

  -- Educación y clases
  ('clases_matematicas', 'Clases de matemáticas', 'educacion_clases', true),
  ('clases_idiomas', 'Clases de idiomas', 'educacion_clases', true),

  -- Transporte y fletes
  ('fletes', 'Fletes', 'transporte_fletes', true),
  ('mudanzas', 'Mudanzas', 'transporte_fletes', true),

  -- Profesionales y asesorías
  ('abogado', 'Abogado', 'profesionales_asesorias', true),
  ('contador', 'Contador', 'profesionales_asesorias', true),

  -- Turismo y alojamiento
  ('alojamiento_cabana', 'Alojamiento en cabañas', 'turismo_alojamiento', true),
  ('hostal', 'Hostal', 'turismo_alojamiento', true)
on conflict (slug) do update set
  nombre = excluded.nombre,
  sector_slug = excluded.sector_slug,
  activo = excluded.activo,
  updated_at = now();

commit;

