-- MVP recomendación post-contacto: clics WhatsApp por viewer anónimo + respuesta única por viewer/emprendedor

create table if not exists public.viewer_whatsapp_clicks (
  id uuid primary key default gen_random_uuid(),
  emprendedor_id uuid not null references public.emprendedores (id) on delete cascade,
  viewer_id text not null,
  origen text not null check (origen in ('ficha', 'card')),
  created_at timestamptz not null default now()
);

comment on table public.viewer_whatsapp_clicks is 'Clics en WhatsApp atribuidos a viewer anónimo (cookie/localStorage); origen ficha o card.';

create index if not exists idx_viewer_whatsapp_clicks_emp_viewer_created
  on public.viewer_whatsapp_clicks (emprendedor_id, viewer_id, created_at desc);

create table if not exists public.emprendedor_recomendaciones (
  id uuid primary key default gen_random_uuid(),
  emprendedor_id uuid not null references public.emprendedores (id) on delete cascade,
  viewer_id text not null,
  interaccion_id uuid null references public.viewer_whatsapp_clicks (id) on delete set null,
  respuesta text not null check (respuesta in ('recomienda', 'no_recomienda')),
  created_at timestamptz not null default now(),
  unique (emprendedor_id, viewer_id)
);

comment on table public.emprendedor_recomendaciones is 'Recomendación post-contacto; una fila por viewer y emprendedor; no se muestra públicamente en el MVP.';

create index if not exists idx_emprendedor_recomendaciones_emp on public.emprendedor_recomendaciones (emprendedor_id);

alter table public.viewer_whatsapp_clicks enable row level security;
alter table public.emprendedor_recomendaciones enable row level security;

create policy "Service role full access viewer_whatsapp_clicks"
  on public.viewer_whatsapp_clicks for all using (true) with check (true);

create policy "Service role full access emprendedor_recomendaciones"
  on public.emprendedor_recomendaciones for all using (true) with check (true);
