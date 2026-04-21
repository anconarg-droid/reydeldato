# QA Webpay Plus (integración real con túnel público)

Requisitos: migraciones aplicadas, `APP_BASE_URL` = URL pública del túnel (misma que abre el navegador), `TRANSBANK_ENVIRONMENT=integration` (o producción con credenciales reales), Supabase con `pagos_emprendedores`.

## Checklist end-to-end

1. **Túnel**  
   - [ ] Exponer el dev server (p. ej. ngrok / Cloudflare Tunnel) y copiar la URL `https://….`  
   - [ ] `APP_BASE_URL=https://….` (sin barra final) en `.env.local`; reiniciar `next dev`.

2. **Create**  
   - [ ] Desde `/panel/planes?id=<uuid>` elegir plan y **Activar mi ficha completa**.  
   - [ ] Redirección a formulario Webpay (POST con `token_ws`).  
   - [ ] En BD: fila `pagos_emprendedores` en `pendiente` → luego `token_ws` y respuesta create en `raw_response`.

3. **Pay**  
   - [ ] Pagar con tarjeta de **integración** Transbank (documentación oficial).  
   - [ ] Completar flujo hasta que Transbank redirija al comercio.

4. **Return**  
   - [ ] Navegador aterriza en `POST /api/pagos/retorno` y luego redirect a `/panel?id=…&pago=exito` o fallo en planes/panel.  
   - [ ] Pago pasa a `pagado` (o `fallido` si rechazado).  
   - [ ] Sin errores 5xx en logs del servidor.

5. **Panel actualizado**  
   - [ ] Tras éxito: banner “Pago aprobado” / ficha completa reflejada en API (`/api/panel/negocio` → comercial).  
   - [ ] `emprendedores.plan_activo`, `plan_expira_at`, `plan_periodicidad` coherentes con el plan comprado.

6. **Idempotencia retorno**  
   - [ ] Repetir POST a `/api/pagos/retorno` con el mismo `token_ws` (solo prueba técnica): no duplica extensión de plan; sigue `pagado` y redirect razonable.

7. **Reintento admin** (solo si hubo `plan_activation_error`)  
   - [ ] `POST /api/admin/pagos/reintentar-activacion` con `pagoId` y header secreto en prod.  
   - [ ] `raw_response.retry_attempted_at`, `retry_result`, `retry_error` presentes según resultado.

## Notas

- Sin túnel, Transbank no puede llamar a `APP_BASE_URL/api/pagos/retorno` desde internet.  
- En producción usar HTTPS y credenciales `production` + comercio real.
