# Reglas de producto — Rey del Dato

Documento de referencia para listados, cards y estados de ficha. La implementación canónica vive en `lib/productRules.ts` (ver también `lib/estadoFicha.ts` para filas Supabase y reglas históricas de naming `basica` / `mejorada`).

## 1. Orden de resultados

- Primero: **En tu comuna** (bloque `de_tu_comuna`).
- Segundo: **Atienden tu comuna** (bloque `atienden_tu_comuna`).
- Dentro de cada bloque:
  - No ordenar por pago.
  - No priorizar perfiles completos.
  - Orden rotativo cada 5 minutos (determinístico por ventana de tiempo).

## 2. Tipos de perfil

### Perfil básico

Muestra:

- Nombre
- Descripción corta
- Rubro (solo si existe en datos)
- Comuna base y región (formato ubicación)
- Botón WhatsApp
- Botón secundario: **Solo WhatsApp** (`getTextoCardBasica()`)

No muestra:

- Botón ver ficha ampliada
- Galería en la card
- Detalles profundos en la card

### Perfil completo

Muestra:

- Nombre, descripción, rubro (si aplica)
- Comuna base y región
- Badge **Perfil completo**
- Botón WhatsApp
- Botón **Más detalles** (`getTextoCardCompleta()`)

Criterio de “completo” en producto (resumen): suscripción vigente —plan (`planActivo` y, si existe `planExpiraAt`, fecha futura) o trial (`trialActivo` o `trialExpiraAt` futuro)— **y** foto principal **y** al menos Instagram o sitio web. Detalle: `lib/productRules.ts` → `isPerfilCompleto`. Los listados actuales siguen usando `lib/estadoFicha.ts` + `tieneFichaCompleta` hasta unificar en un solo sitio.

## 3. Ubicación

Formato de una línea:

`📍 {comuna} · {región_abreviada}`

Ejemplo: `📍 Maipú · RM`

Implementación: `formatComunaRegion()` (abreviatura vía `getRegionShort` cuando hay nombre de región; slug de región como respaldo).

## 4. Cobertura

Si el emprendimiento **no** tiene su base en la comuna buscada pero **sí** atiende esa comuna, mostrar badge de texto:

`Atiende {nombre_comuna_buscada}`

Lógica de cuándo mostrar (comparación por slugs): `getBadgeCobertura()`.

## 5. Etiqueta “Nuevo”

- Visible solo si `estado_publicacion === 'publicado'`.
- Visible solo si existe `created_at` y la antigüedad es **≤ 15 días** medidos como **15 × 24 h en milisegundos** desde el instante de creación hasta “ahora” (misma regla en front y back vía `isNuevo()`).
- No afecta ranking.
- No se reactiva por ediciones posteriores (solo `created_at`).

## 6. Cards

- Todas las cards de un mismo listado comparten la misma estructura y alturas reservadas (imagen, bloques, CTAs).
- La diferencia básica / completa es contenido y acciones, no el layout base de la grilla.

## 7. Placeholder de imagen

Si no hay imagen válida:

```text
SIN FOTO
Este negocio no ha subido imágenes
```
