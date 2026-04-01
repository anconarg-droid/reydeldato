-- RPC v2: soporta búsqueda (p_q) y devuelve bloque_visible.

DROP FUNCTION IF EXISTS public.buscar_emprendedores_por_comuna(text);
DROP FUNCTION IF EXISTS public.buscar_emprendedores_por_comuna(text, text);

CREATE OR REPLACE FUNCTION public.buscar_emprendedores_por_comuna(
  p_comuna_slug text,
  p_q text default null
)
returns table (
  id uuid,
  nombre_emprendimiento text,
  slug text,
  comuna_id int,
  comuna_slug text,
  comuna_nombre text,
  cobertura_tipo text,
  frase_negocio text,
  foto_principal_url text,
  whatsapp_principal text,
  prioridad int,
  bloque_visible text
)
language sql
as $$
  with comuna_target as (
    select
      c.id as comuna_id,
      c.slug as comuna_slug,
      c.nombre as comuna_nombre,
      r.slug as region_slug
    from public.comunas c
    join public.regiones r on r.id = c.region_id
    where c.slug = p_comuna_slug
  ),
  base as (
    select
      e.id,
      e.nombre_emprendimiento,
      e.slug,
      e.comuna_id::int as comuna_id,
      cb.slug as comuna_slug,
      cb.nombre as comuna_nombre,
      e.cobertura_tipo::text as cobertura_tipo,
      e.frase_negocio,
      e.foto_principal_url,
      e.whatsapp_principal,

      case
        when e.comuna_id = ct.comuna_id and e.cobertura_tipo = 'solo_comuna' then 1
        when e.comuna_id = ct.comuna_id and e.cobertura_tipo = 'varias_comunas' then 2
        when e.comuna_id = ct.comuna_id and e.cobertura_tipo = 'varias_regiones' then 3
        when e.comuna_id = ct.comuna_id and e.cobertura_tipo = 'nacional' then 4

        when e.cobertura_tipo = 'varias_comunas'
          and ct.comuna_slug = any(coalesce(e.comunas_cobertura, '{}'::text[])) then 5

        when e.cobertura_tipo = 'varias_regiones'
          and ct.region_slug = any(coalesce(e.regiones_cobertura, '{}'::text[])) then 6

        when e.cobertura_tipo = 'nacional' then 7
        else 8
      end as prioridad

    from public.emprendedores e
    join public.comunas cb on cb.id = e.comuna_id
    cross join comuna_target ct
    where
      p_q is null
      or p_q = ''
      or lower(coalesce(e.nombre_emprendimiento, '')) like '%' || lower(p_q) || '%'
      or lower(coalesce(e.frase_negocio, '')) like '%' || lower(p_q) || '%'
  )
  select
    b.id,
    b.nombre_emprendimiento,
    b.slug,
    b.comuna_id,
    b.comuna_slug,
    b.comuna_nombre,
    b.cobertura_tipo,
    b.frase_negocio,
    b.foto_principal_url,
    b.whatsapp_principal,
    b.prioridad,
    case
      when p_q is not null and p_q <> '' and b.prioridad between 1 and 4 then 'de_tu_comuna'
      when p_q is not null and p_q <> '' and b.prioridad between 5 and 7 then 'atienden_tu_comuna'
      else 'lista_general'
    end as bloque_visible
  from base b
  where b.prioridad < 8
  order by
    case
      when p_q is not null and p_q <> '' and b.prioridad between 1 and 4 then 1
      when p_q is not null and p_q <> '' and b.prioridad between 5 and 7 then 2
      else 1
    end,
    b.prioridad asc,
    md5(
      coalesce(b.id::text, '') ||
      floor(extract(epoch from now()) / 300)::text
    );
$$;

COMMENT ON FUNCTION public.buscar_emprendedores_por_comuna(text, text) IS
  'Lista emprendedores para una comuna (slug), con búsqueda opcional (p_q), prioridad de cobertura y bloque_visible; usado por /api/buscar.';

GRANT EXECUTE ON FUNCTION public.buscar_emprendedores_por_comuna(text, text) TO anon, authenticated, service_role;
