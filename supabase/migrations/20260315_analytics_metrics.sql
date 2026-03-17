-- =============================================================================
-- Rey del Dato: Sistema de métricas (analytics_events, emprendedor_stats, site_stats_daily)
-- Eventos mínimos: page_view_*, search_result_impression, *_click, share_click
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1) Tabla analytics_events: cada evento individual
-- -----------------------------------------------------------------------------
create table if not exists public.analytics_events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null,
  emprendedor_id uuid references public.emprendedores(id) on delete set null,
  session_id text,
  metadata jsonb default '{}',
  created_at timestamptz not null default now()
);

comment on table public.analytics_events is 'Eventos de analytics del sitio (page views, clicks, impresiones).';
comment on column public.analytics_events.event_type is 'Valores: page_view_home, page_view_search, page_view_comuna, page_view_profile, search_result_impression, whatsapp_click, instagram_click, website_click, email_click, share_click';
comment on column public.analytics_events.emprendedor_id is 'Null para eventos de sitio (home, buscar, comuna).';
comment on column public.analytics_events.metadata is 'Ej: slug, comuna_slug, sector_slug, q, etc.';

create index if not exists idx_analytics_events_created_at on public.analytics_events(created_at);
create index if not exists idx_analytics_events_event_type on public.analytics_events(event_type);
create index if not exists idx_analytics_events_emprendedor_id on public.analytics_events(emprendedor_id) where emprendedor_id is not null;
create index if not exists idx_analytics_events_emprendedor_created on public.analytics_events(emprendedor_id, created_at) where emprendedor_id is not null;

-- -----------------------------------------------------------------------------
-- 2) Tabla emprendedor_stats: resumen acumulado por emprendedor
-- -----------------------------------------------------------------------------
create table if not exists public.emprendedor_stats (
  emprendedor_id uuid primary key references public.emprendedores(id) on delete cascade,
  page_view_profile bigint not null default 0,
  search_result_impression bigint not null default 0,
  whatsapp_click bigint not null default 0,
  instagram_click bigint not null default 0,
  website_click bigint not null default 0,
  email_click bigint not null default 0,
  share_click bigint not null default 0,
  updated_at timestamptz not null default now()
);

comment on table public.emprendedor_stats is 'Contadores acumulados por emprendedor (actualizados al registrar eventos).';

create index if not exists idx_emprendedor_stats_updated_at on public.emprendedor_stats(updated_at);

-- -----------------------------------------------------------------------------
-- 3) Tabla site_stats_daily: resumen diario del sitio (por fecha, sin emprendedor)
-- -----------------------------------------------------------------------------
create table if not exists public.site_stats_daily (
  stat_date date not null,
  page_view_home bigint not null default 0,
  page_view_search bigint not null default 0,
  page_view_comuna bigint not null default 0,
  page_view_profile bigint not null default 0,
  search_result_impression bigint not null default 0,
  primary key (stat_date)
);

comment on table public.site_stats_daily is 'Contadores diarios del sitio (page views e impresiones globales).';

-- -----------------------------------------------------------------------------
-- 4) RLS: permitir solo service role para escritura/lectura (la app usa service role)
-- -----------------------------------------------------------------------------
alter table public.analytics_events enable row level security;
alter table public.emprendedor_stats enable row level security;
alter table public.site_stats_daily enable row level security;

create policy "Service role full access analytics_events"
  on public.analytics_events for all using (true) with check (true);

create policy "Service role full access emprendedor_stats"
  on public.emprendedor_stats for all using (true) with check (true);

create policy "Service role full access site_stats_daily"
  on public.site_stats_daily for all using (true) with check (true);

-- Nota: en producción las políticas suelen restringirse por auth.role(); aquí
-- asumimos que la API usa SUPABASE_SERVICE_ROLE_KEY y bypasea RLS.

-- -----------------------------------------------------------------------------
-- 5) Funciones para incremento atómico de resúmenes
-- -----------------------------------------------------------------------------
create or replace function public.increment_emprendedor_stat(
  p_emprendedor_id uuid,
  p_column text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.emprendedor_stats (
    emprendedor_id,
    page_view_profile,
    search_result_impression,
    whatsapp_click,
    instagram_click,
    website_click,
    email_click,
    share_click,
    updated_at
  )
  values (
    p_emprendedor_id,
    case when p_column = 'page_view_profile' then 1 else 0 end,
    case when p_column = 'search_result_impression' then 1 else 0 end,
    case when p_column = 'whatsapp_click' then 1 else 0 end,
    case when p_column = 'instagram_click' then 1 else 0 end,
    case when p_column = 'website_click' then 1 else 0 end,
    case when p_column = 'email_click' then 1 else 0 end,
    case when p_column = 'share_click' then 1 else 0 end,
    now()
  )
  on conflict (emprendedor_id) do update set
    page_view_profile    = emprendedor_stats.page_view_profile    + case when p_column = 'page_view_profile' then 1 else 0 end,
    search_result_impression = emprendedor_stats.search_result_impression + case when p_column = 'search_result_impression' then 1 else 0 end,
    whatsapp_click        = emprendedor_stats.whatsapp_click        + case when p_column = 'whatsapp_click' then 1 else 0 end,
    instagram_click      = emprendedor_stats.instagram_click      + case when p_column = 'instagram_click' then 1 else 0 end,
    website_click        = emprendedor_stats.website_click        + case when p_column = 'website_click' then 1 else 0 end,
    email_click          = emprendedor_stats.email_click          + case when p_column = 'email_click' then 1 else 0 end,
    share_click          = emprendedor_stats.share_click          + case when p_column = 'share_click' then 1 else 0 end,
    updated_at           = now();
end;
$$;

create or replace function public.increment_site_stat_daily(
  p_stat_date date,
  p_column text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.site_stats_daily (
    stat_date,
    page_view_home,
    page_view_search,
    page_view_comuna,
    page_view_profile,
    search_result_impression
  )
  values (
    p_stat_date,
    case when p_column = 'page_view_home' then 1 else 0 end,
    case when p_column = 'page_view_search' then 1 else 0 end,
    case when p_column = 'page_view_comuna' then 1 else 0 end,
    case when p_column = 'page_view_profile' then 1 else 0 end,
    case when p_column = 'search_result_impression' then 1 else 0 end
  )
  on conflict (stat_date) do update set
    page_view_home        = site_stats_daily.page_view_home        + case when p_column = 'page_view_home' then 1 else 0 end,
    page_view_search      = site_stats_daily.page_view_search      + case when p_column = 'page_view_search' then 1 else 0 end,
    page_view_comuna      = site_stats_daily.page_view_comuna      + case when p_column = 'page_view_comuna' then 1 else 0 end,
    page_view_profile     = site_stats_daily.page_view_profile     + case when p_column = 'page_view_profile' then 1 else 0 end,
    search_result_impression = site_stats_daily.search_result_impression + case when p_column = 'search_result_impression' then 1 else 0 end;
end;
$$;
