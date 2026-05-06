-- Pagos genéricos (MVP): Webpay vive en `pagos_emprendedores`; esta tabla habilita método manual (transferencia).
-- No activa plan automáticamente: solo admin cambia estado a `aprobado` y el backend activa el plan reutilizando lógica existente.

CREATE TABLE IF NOT EXISTS public.pagos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  emprendedor_id uuid NOT NULL REFERENCES public.emprendedores (id) ON DELETE CASCADE,
  plan_codigo text NOT NULL CHECK (plan_codigo IN ('basico', 'semestral', 'anual')),
  metodo_pago text NOT NULL CHECK (metodo_pago IN ('webpay', 'transferencia')),
  proveedor text NOT NULL CHECK (proveedor IN ('transbank', 'manual')),
  referencia_pago text NOT NULL UNIQUE,
  estado text NOT NULL CHECK (estado IN ('pendiente', 'en_revision', 'aprobado', 'rechazado', 'expirado')),
  monto integer NOT NULL,
  moneda text NOT NULL DEFAULT 'CLP',
  comprobante_url text,
  observaciones text,
  created_at timestamptz NOT NULL DEFAULT now(),
  paid_at timestamptz,
  validated_at timestamptz,
  validated_by text
);

CREATE INDEX IF NOT EXISTS idx_pagos_emprendedor_id
  ON public.pagos (emprendedor_id);

CREATE INDEX IF NOT EXISTS idx_pagos_estado
  ON public.pagos (estado);

CREATE INDEX IF NOT EXISTS idx_pagos_created_at_desc
  ON public.pagos (created_at DESC);

COMMENT ON TABLE public.pagos IS
  'Pagos genéricos (MVP transferencia/manual). Webpay: ver pagos_emprendedores.';

