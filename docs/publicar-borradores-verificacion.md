# Verificación: formulario "Publica tu emprendimiento" y borradores

## 1. ¿Se guardan registros parciales hoy?

**No.** El formulario de `/publicar` **no** guarda nada en base de datos hasta que el usuario envía el formulario completo. Todo el estado vive solo en React (`PublicarClient`: `form`, `setForm`). Al enviar, se llama una sola vez a `POST /api/publicar` con el payload completo; la API valida todo y hace un único `INSERT` en `emprendedores`. Si el usuario cierra la pestaña o abandona a mitad de camino, no queda ningún registro.

---

## 2. ¿Existe autosave o borradores?

**No.** No hay:
- Creación de registro al entrar al formulario.
- Guardado automático al completar nombre, whatsapp, comuna o rubro.
- Recuperación de un borrador por sesión o por enlace.

El único "Guardar borrador" que aparece en el código está en **`app/components/panel/NegocioForm.tsx`** (formulario del **panel** de negocios), no en el flujo público "Publica tu emprendimiento".

---

## 3. Columnas en `emprendedores`

- **`estado`**: **Sí existe.** Se usa en admin: `estado = 'pendiente_revision'` (pendientes) y `estado = 'aprobado'` (sitemap, etc.). No se usa en el flujo de `/api/publicar`; ahí solo se setea `estado_publicacion` (publicado / pendiente_verificacion). Para borradores hay que usar también `estado = 'borrador'`.
- **`estado_publicacion`**: Existe; valores conocidos: publicado, pendiente_verificacion, rechazado.
- **`form_completo`**: **No existe** en el esquema actual. Hay que agregarla.
- **`ultimo_avance`**: **No existe.** Hay que agregarla (p. ej. `timestamptz` para última actualización del borrador).
- **`origen_registro`**: **No existe.** Hay que agregarla (p. ej. `'form_publicar'`, `'panel'`, etc.).

---

## 4. Vista `emprendedores_borrador`

**No existe.** Hay que crearla como vista (o vista materializada) que filtre `WHERE estado = 'borrador'` para uso en admin.

---

## 5. Resumen: qué hay que implementar

| Requisito | Estado actual | Acción |
|-----------|---------------|--------|
| Al entrar al formulario, crear registro con `estado = borrador` | No existe | Implementar: llamar API que cree fila en `emprendedores` con estado borrador y opcionalmente `origen_registro = 'form_publicar'`. |
| Autosave al completar nombre, whatsapp, comuna, rubro | No existe | Implementar: PATCH a ese borrador cuando cambien esos campos. |
| Si abandona: `estado = borrador`, `form_completo = false` | N/A (hoy no hay registro) | Queda implícito al usar solo creación + autosave hasta el envío final. |
| Al enviar formulario completo: `estado = pendiente_revision`, `form_completo = true` | No existe | Modificar `POST /api/publicar` para que, si recibe `draft_id`, actualice ese registro y setee estado y form_completo. |
| Columnas `estado`, `form_completo`, `ultimo_avance`, `origen_registro` | `estado` existe; el resto no | Migración: añadir `form_completo`, `ultimo_avance`, `origen_registro`; asegurar que `estado` admita `'borrador'`. |
| Vista admin `emprendedores_borrador` | No existe | Crear en migración: `SELECT * FROM emprendedores WHERE estado = 'borrador'` (o columnas necesarias). |

---

## 6. Archivos relevantes

- **Formulario público**: `app/publicar/PublicarClient.tsx`, pasos en `app/publicar/Paso*.tsx`.
- **API de envío**: `app/api/publicar/route.ts` (INSERT o UPDATE si viene `draft_id`).
- **Admin pendientes**: `app/api/admin/pendientes/route.ts` (filtra por `estado = 'pendiente_revision'`).
- **Panel “Guardar borrador”**: `app/components/panel/NegocioForm.tsx` (flujo distinto al de publicar).
