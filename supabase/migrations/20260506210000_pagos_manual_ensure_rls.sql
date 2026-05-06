-- `public.pagos`: transferencias manuales (crear/comprobante/estado + admin). Webpay Transbank → `pagos_emprendedores`.
-- Idempotente: crea tabla si no existe; añade columnas que falten; RLS sin políticas → solo service_role / postgres (bypass o superuser).

CREATE TABLE IF NOT EXISTS public.pagos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  emprendedor_id uuid NOT NULL REFERENCES public.emprendedores (id) ON DELETE CASCADE,
  plan_codigo text NOT NULL CHECK (plan_codigo IN ('basico', 'semestral', 'anual')),
  metodo_pago text NOT NULL CHECK (metodo_pago IN ('webpay', 'transferencia')),
  proveedor text NOT NULL CHECK (proveedor IN ('transbank', 'manual')),
  referencia_pago text NOT NULL,
  estado text NOT NULL DEFAULT 'pendiente' CHECK (
    estado IN ('pendiente', 'en_revision', 'aprobado', 'rechazado', 'expirado')
  ),
  monto integer NOT NULL CHECK (monto > 0),
  moneda text NOT NULL DEFAULT 'CLP',
  comprobante_url text,
  observaciones text,
  access_token text,
  created_at timestamptz NOT NULL DEFAULT now(),
  paid_at timestamptz,
  validated_at timestamptz,
  validated_by text
);

ALTER TABLE public.pagos ADD COLUMN IF NOT EXISTS access_token text;
ALTER TABLE public.pagos ADD COLUMN IF NOT EXISTS comprobante_url text;
ALTER TABLE public.pagos ADD COLUMN IF NOT EXISTS observaciones text;
ALTER TABLE public.pagos ADD COLUMN IF NOT EXISTS paid_at timestamptz;
ALTER TABLE public.pagos ADD COLUMN IF NOT EXISTS validated_at timestamptz;
ALTER TABLE public.pagos ADD COLUMN IF NOT EXISTS validated_by text;

ALTER TABLE public.pagos
  ALTER COLUMN estado SET DEFAULT 'pendiente';

DO $$
BEGIN
  ALTER TABLE public.pagos ADD CONSTRAINT pagos_referencia_pago_unique UNIQUE (referencia_pago);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_pagos_emprendedor_id
  ON public.pagos (emprendedor_id);

CREATE INDEX IF NOT EXISTS idx_pagos_estado
  ON public.pagos (estado);

CREATE INDEX IF NOT EXISTS idx_pagos_created_at_desc
  ON public.pagos (created_at DESC);

COMMENT ON TABLE public.pagos IS
  'Pagos manuales (transferencia) y admin. Webpay: public.pagos_emprendedores.';

ALTER TABLE public.pagos ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.pagos FROM anon;
REVOKE ALL ON TABLE public.pagos FROM authenticated;
GRANT ALL ON TABLE public.pagos TO postgres;
GRANT ALL ON TABLE public.pagos TO service_role;
