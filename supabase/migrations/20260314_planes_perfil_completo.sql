-- =============================================================================
-- Sistema de planes: Perfil completo (trial 90 días + planes pagados)
-- No altera el ranking del buscador; solo la completitud de la ficha.
-- Requerido para que /api/buscar y tarjetas calculen trial / perfil_completo / perfil_basico.
-- =============================================================================

-- 1) Campos de plan pagado (perfil_completo mensual/semestral/anual)
alter table public.emprendedores
  add column if not exists plan_tipo text,
  add column if not exists plan_periodicidad text,
  add column if not exists plan_activo boolean default false,
  add column if not exists plan_inicia_at timestamptz,
  add column if not exists plan_expira_at timestamptz;

-- 2) Campos de trial (90 días desde alta)
alter table public.emprendedores
  add column if not exists trial_inicia_at timestamptz,
  add column if not exists trial_expira_at timestamptz;

comment on column public.emprendedores.plan_tipo is 'Tipo de plan: perfil_completo. Null = sin plan pagado.';
comment on column public.emprendedores.plan_periodicidad is 'Periodicidad: mensual, semestral, anual. Null en trial o sin plan.';
comment on column public.emprendedores.plan_activo is 'True si tiene suscripción pagada vigente (plan_expira_at > now).';
comment on column public.emprendedores.plan_inicia_at is 'Inicio del periodo pagado actual.';
comment on column public.emprendedores.plan_expira_at is 'Fin del periodo pagado actual.';
comment on column public.emprendedores.trial_inicia_at is 'Inicio del trial (normalmente = created_at).';
comment on column public.emprendedores.trial_expira_at is 'Fin del trial (created_at + 90 días). Durante trial tiene perfil completo.';

-- 3) Inicializar datos existentes
-- trial_inicia_at = created_at; trial_expira_at = trial_expira si existe, si no created_at + 90 días
update public.emprendedores e
set
  trial_inicia_at = coalesce(e.trial_inicia_at, e.created_at),
  trial_expira_at = coalesce(e.trial_expira_at, e.trial_expira, e.created_at + interval '90 days')
where e.trial_inicia_at is null or e.trial_expira_at is null;

-- 4) Índice para vencimientos de plan
create index if not exists idx_emprendedores_plan_expira_at
  on public.emprendedores (plan_expira_at)
  where plan_expira_at is not null and plan_activo = true;
