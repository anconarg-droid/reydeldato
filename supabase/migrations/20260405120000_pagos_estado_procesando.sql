-- Estado `procesando` para exclusión mutua breve en retorno Webpay (pendiente → procesando → pagado|fallido).

ALTER TABLE public.pagos_emprendedores
  DROP CONSTRAINT IF EXISTS pagos_emprendedores_estado_check;

ALTER TABLE public.pagos_emprendedores
  ADD CONSTRAINT pagos_emprendedores_estado_check
  CHECK (estado IN ('pendiente', 'procesando', 'pagado', 'fallido', 'anulado'));
