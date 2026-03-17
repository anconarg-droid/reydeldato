# Entregable: Jerarquía visual y lógica de resultados en comuna/subcategoría

## A. Textos exactos que se cambiaron

| Ubicación | Antes | Después |
|-----------|--------|--------|
| **Resumen superior (h2)** | "Encontramos 1 resultado en Padre Hurtado" (ambiguo cuando hay dos bloques) | Si hay locales y cobertura: **"X servicio(s) en [Comuna] · Y que atienden [Comuna]"**. Si solo locales: **"X servicio(s) en [Comuna]"**. Si solo cobertura: **"No encontramos [subcategoría] ubicados en [Comuna]."** + párrafo "Pero estos servicios sí atienden tu comuna." |
| **Bloque 2 (cobertura comuna)** | "Electricistas que atienden Padre Hurtado" / "Negocios de otras comunas que también atienden..." | **"Servicios que atienden [Comuna]"** (siempre el mismo mensaje claro). |
| **Bloques regional / nacional** | "Servicios con cobertura regional" / "Servicios con cobertura nacional" | **"Más servicios que atienden [Comuna]"** (ambos bloques; el foco es que atienden la comuna). |
| **Sin locales pero con cobertura** | Se podía percibir como "no hay resultados" | **"No encontramos [subcategoría] ubicados en [Comuna]."** en el h2 y **"Pero estos servicios sí atienden tu comuna."** en el párrafo siguiente. |

---

## B. Componentes de tarjeta que se modificaron

- **`Card`** dentro de **`PublicSearchResults.tsx`**:
  - **Comuna base (línea 1):** de `text-sm font-semibold text-slate-700` a **`text-base font-semibold text-slate-800`** para darle más peso que a la categoría.
  - **Nombre (línea 2):** se mantiene `text-base font-semibold`.
  - **Categoría (línea 3):** se mantiene **`text-xs text-slate-500`** (tipografía secundaria).
  - **Nuevo badge local:** cuando el negocio está en la comuna buscada (`matchesBase`), se muestra el badge **"En tu comuna"** (fondo verde suave: `bg-emerald-50`, `text-emerald-800`, `border-emerald-200`).
  - **Badge cobertura:** se mantiene **"Atiende [Comuna]"** (azul) para negocios externos que atienden la comuna.

Orden visual en la tarjeta: **📍 Comuna base** → **Nombre** → **Categoría** → **Badge** (En tu comuna / Atiende X) → Descripción.

---

## C. Cómo se distingue visualmente local vs cobertura

| Tipo | Cómo se identifica |
|------|----------------------|
| **Local (en la comuna)** | Comuna base arriba del nombre; badge **"En tu comuna"** en verde (emerald). Sin badge "Atiende X". |
| **Externo con cobertura** | Comuna base (ej. "📍 Peñaflor") arriba del nombre; badge **"Atiende [Comuna buscada]"** en azul (sky). Sin badge "En tu comuna". |

Además, el **bloque 1** tiene borde/fondo verde (emerald) y el **bloque 2** azul (sky), para reforzar "en tu comuna" vs "que atienden tu comuna".

---

## D. Ajuste del contador superior para que no sea engañoso

- **Antes:** Un solo título del tipo "Encontramos 1 resultado en Padre Hurtado" aunque hubiera dos bloques (1 local + 1 que atiende).
- **Ahora:**
  - Si hay **locales y servicios que atienden:** el h2 muestra **"1 servicio en [Comuna] · 1 que atienden [Comuna]"** (o plural según cantidades). No hay un único número global.
  - Si hay **solo locales:** **"X servicio(s) en [Comuna]".**
  - Si hay **solo cobertura (ningún local):** no se usa contador desglosado; el h2 es **"No encontramos [subcategoría] ubicados en [Comuna]."** y debajo el párrafo **"Pero estos servicios sí atienden tu comuna."** Así no se dice "no hay resultados" cuando sí hay tarjetas que atienden la comuna.

La variable **`summaryLine`** solo se usa cuando **hay al menos un resultado local** (`hasExacta`); en el resto de casos se muestran los mensajes explícitos anteriores.

---

## E. Cambios en el layout para evitar espacios vacíos exagerados

- **Grid por cantidad de tarjetas** (en `renderBlock` y en el bloque "Otros resultados relacionados"):
  - **1 tarjeta:** `grid-cols-1 gap-4 max-w-md` (contenedor estrecho, sin filas vacías).
  - **2 tarjetas:** `grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl`.
  - **3 o más:** `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4` (sin max-width para usar el ancho disponible).

Con esto el área de resultados se adapta a 1, 2 o más tarjetas sin quedar un contenedor ancho vacío cuando hay pocos resultados.

---

## Orden de bloques (sin cambio)

1. Negocios ubicados en la comuna  
2. Negocios que atienden la comuna (cobertura explícita)  
3. Más servicios que atienden la comuna (regional)  
4. Más servicios que atienden la comuna (nacional)  
5. Otros resultados relacionados  

Archivo modificado: **`components/search/PublicSearchResults.tsx`**.
