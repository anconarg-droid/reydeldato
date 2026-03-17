-- =============================================================================
-- Rey del Dato: Actividad por comuna (vistas, compartidos, invitaciones, contribuidores)
-- Para el contador "Personas ayudando a abrir esta comuna"
-- =============================================================================

create table if not exists public.commune_activity (
  id uuid primary key default gen_random_uuid(),
  commune_slug text not null unique,
  views integer not null default 0,
  shares integer not null default 0,
  invites integer not null default 0,
  contributors integer not null default 0,
  updated_at timestamptz not null default now()
);

comment on table public.commune_activity is 'Contadores de actividad por comuna: vistas de página, compartidos WhatsApp, invitaciones, emprendimientos publicados.';
comment on column public.commune_activity.commune_slug is 'Slug de la comuna (ej: maipu, talagante).';
comment on column public.commune_activity.views is 'Veces que se abrió la página de cobertura de esta comuna.';
comment on column public.commune_activity.shares is 'Veces que se pulsó Compartir en WhatsApp.';
comment on column public.commune_activity.invites is 'Veces que se pulsó Invitar emprendedores.';
comment on column public.commune_activity.contributors is 'Emprendimientos publicados en esta comuna (incrementado al publicar).';

create index if not exists idx_commune_activity_slug on public.commune_activity(commune_slug);

-- RLS: permitir lectura pública; escritura solo vía service role (API/server)
alter table public.commune_activity enable row level security;

create policy "Allow public read on commune_activity"
  on public.commune_activity for select
  using (true);

-- Función: insertar fila si no existe e incrementar un campo (evita race conditions).
-- Orden de parámetros (p_field, p_slug) para coincidir con PostgREST/schema cache.
create or replace function public.increment_commune_activity(
  p_field text,
  p_slug text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_slug is null or p_slug = '' then
    return;
  end if;
  insert into public.commune_activity (commune_slug, views, shares, invites, contributors, updated_at)
  values (lower(trim(p_slug)), 0, 0, 0, 0, now())
  on conflict (commune_slug) do update set
    views = case when p_field = 'views' then commune_activity.views + 1 else commune_activity.views end,
    shares = case when p_field = 'shares' then commune_activity.shares + 1 else commune_activity.shares end,
    invites = case when p_field = 'invites' then commune_activity.invites + 1 else commune_activity.invites end,
    contributors = case when p_field = 'contributors' then commune_activity.contributors + 1 else commune_activity.contributors end,
    updated_at = now();
end;
$$;

comment on function public.increment_commune_activity is 'Crea la fila si no existe e incrementa el campo indicado (views, shares, invites, contributors).';

grant execute on function public.increment_commune_activity(text, text) to service_role;
grant execute on function public.increment_commune_activity(text, text) to anon;
grant execute on function public.increment_commune_activity(text, text) to authenticated;
