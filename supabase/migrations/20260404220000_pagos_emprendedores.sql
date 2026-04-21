-- Pagos Webpay Plus (Transbank) por emprendedor; estado comercial sigue en public.emprendedores.

CREATE TABLE IF NOT EXISTS public.pagos_emprendedores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  emprendedor_id uuid NOT NULL REFERENCES public.emprendedores (id) ON DELETE CASCADE,
  plan_codigo text NOT NULL CHECK (plan_codigo IN ('basico', 'semestral', 'anual')),
  monto integer NOT NULL,
  moneda text NOT NULL DEFAULT 'CLP',
  estado text NOT NULL CHECK (estado IN ('pendiente', 'pagado', 'fallido', 'anulado')),
  provider text NOT NULL DEFAULT 'transbank',
  buy_order text NOT NULL UNIQUE,
  session_id text NOT NULL,
  token_ws text,
  authorization_code text,
  transaction_date timestamptz,
  raw_response jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pagos_emprendedores_emprendedor_id
  ON public.pagos_emprendedores (emprendedor_id);

CREATE INDEX IF NOT EXISTS idx_pagos_emprendedores_estado
  ON public.pagos_emprendedores (estado);

CREATE INDEX IF NOT EXISTS idx_pagos_emprendedores_created_at_desc
  ON public.pagos_emprendedores (created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS idx_pagos_emprendedores_token_ws_unique
  ON public.pagos_emprendedores (token_ws)
  WHERE token_ws IS NOT NULL;

COMMENT ON TABLE public.pagos_emprendedores IS
  'Transacciones Webpay Plus; plan activo en emprendedores al aprobar pago.';
