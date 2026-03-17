-- =============================================================================
-- Publicar: borradores y autosave (estado borrador, form_completo, vista admin)
-- =============================================================================

-- 1) Columnas en emprendedores (si no existen)
alter table public.emprendedores
  add column if not exists form_completo boolean not null default false,
  add column if not exists ultimo_avance timestamptz,
  add column if not exists origen_registro text;

comment on column public.emprendedores.form_completo is 'True cuando el formulario fue enviado completo (estado pasa a pendiente_revision o similar).';
comment on column public.emprendedores.ultimo_avance is 'Última vez que se guardó el borrador (autosave).';
comment on column public.emprendedores.origen_registro is 'Origen del alta: form_publicar, panel, etc.';

-- estado ya existe; debe aceptar el valor 'borrador' para borradores.
-- estado_publicacion: si tiene check, añadir 'borrador' para filas en borrador; o no setear estado_publicacion en el insert de borrador.

-- 2) Vista para admin: solo registros en borrador
create or replace view public.emprendedores_borrador as
select
  id,
  slug,
  nombre,
  email,
  whatsapp,
  comuna_base_id,
  sector_slug,
  categoria_id,
  estado,
  form_completo,
  ultimo_avance,
  origen_registro,
  created_at
from public.emprendedores
where estado = 'borrador';

comment on view public.emprendedores_borrador is 'Registros creados desde el formulario público que aún están en borrador (no enviados).';

-- 3) RLS para la vista (lectura como emprendedores; la vista no es insertable/actualizable)
alter view public.emprendedores_borrador set (security_invoker = false);
