-- Columnas para publicación con verificación obligatoria (rubros regulados)
-- motivo_verificacion: razón por la que quedó pendiente (titulo_profesional, patente_alcohol, etc.)

alter table public.emprendedores
  add column if not exists motivo_verificacion text;

comment on column public.emprendedores.motivo_verificacion is 'Razón de verificación cuando la ficha está en revisión (estado_publicacion = en_revision): titulo_profesional, patente_alcohol, autorizacion_sanitaria, verificacion_manual';
