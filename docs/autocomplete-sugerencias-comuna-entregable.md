# Entregable: Sugerencias del buscador en página de comuna

## A. Cómo se resolvía hoy una sugerencia del buscador

- El **API** `/api/autocomplete` devuelve sugerencias con un campo **`url`** ya construido:
  - **intent** (ej. "Gasfiter"): `url: /buscar?q=gasfiter`
  - **intent_comuna** (ej. "Gasfiter en Padre Hurtado"): `url: /buscar?q=gasfiter&comuna=padre-hurtado`
  - **comuna**: `url: /buscar?comuna=...`
  - **sector**: `url: /buscar?sector=hogar_construccion`
- En **BuscarClient**, al elegir una sugerencia (clic o Enter) se hacía siempre **`router.push(suggestion.url)`**.
- Por tanto, desde una comuna (ej. `/padre-hurtado`) al elegir "Gasfiter" o "Gasfiter en Padre Hurtado" se navegaba a **`/buscar?q=gasfiter`** o **`/buscar?q=gasfiter&comuna=padre-hurtado`**, es decir, **búsqueda por texto (y comuna en query)**, no a la ruta estructurada de subcategoría.

---

## B. Por qué terminaba en una URL incorrecta

- El autocomplete está pensado para **/buscar**: las URLs que arma el API son siempre **`/buscar?q=...`** o **`/buscar?q=...&comuna=...`** (y sector/comuna sueltos).
- En la **página de comuna** el modelo correcto es **`/[comuna]/[subcategoría]`** (ej. `/padre-hurtado/gasfiter`). Usar `suggestion.url` sin más hacía que:
  - Se mezclara **texto libre** (`q=gasfiter`) con **sector** (`sector=hogar_construccion`) en `/buscar`,
  - No se activara la **subcategoría** en el panel izquierdo,
  - No se respetara la **lógica de contadores** ni la navegación por comuna/subcategoría.

Es decir: la sugerencia representaba una **subcategoría conocida** (intent / intent_comuna), pero la URL seguía siendo de búsqueda libre en `/buscar`.

---

## C. Archivos que manejan autocomplete y selección

| Archivo | Rol |
|--------|-----|
| **`app/api/autocomplete/route.ts`** | Construye las sugerencias (intent, intent_comuna, comuna, sector) y asigna **`url`** pensada para `/buscar` (query params). No se modificó: la corrección se hace en el cliente. |
| **`app/buscar/BuscarClient.tsx`** | Llama a `/api/autocomplete`, muestra el dropdown y maneja la **selección** (clic en sugerencia y Enter). Aquí se añadió **`resolveSuggestionUrl`** y se usa en **onSelect** y en el **handler de Enter** para derivar la URL correcta cuando el contexto es una comuna. |
| **`components/SearchAutocompleteDropdown.tsx`** | Solo muestra la lista y llama **`onSelect(suggestion)`**; no construye URLs. Sin cambios. |

---

## D. Nueva regla de resolución

- **Subcategoría estructurada → ruta estructurada**
  - Si la sugerencia es **`type: "intent"`** (ej. "Gasfiter") y hay **comuna** en contexto → navegar a **`/[comuna]/[value]`** (ej. `/padre-hurtado/gasfiter`).
  - Si la sugerencia es **`type: "intent_comuna"`** (ej. "Gasfiter en Calera De Tango") → navegar a **`/[suggestion.comuna]/[suggestion.value]`** (ej. `/calera-de-tango/gasfiter`).
- **Texto libre / resto → búsqueda libre**
  - Cualquier otra sugerencia (**comuna** sola, **sector**, o si no hay comuna en contexto) → se usa **`suggestion.url`** (comportamiento anterior: `/buscar?q=...`, `/buscar?sector=...`, etc.).

Implementación en **BuscarClient**: función **`resolveSuggestionUrl(suggestion)`** que, según `suggestion.type` y la `comuna` actual, devuelve la URL estructurada o `suggestion.url`. Esa URL es la que se usa en **onSelect** del dropdown y en la tecla **Enter** sobre una sugerencia destacada.

Resultado: desde `/padre-hurtado`, elegir "Gasfiter" o "Gasfiter en Padre Hurtado" lleva a `/padre-hurtado/gasfiter`; elegir "Gasfiter en Calera De Tango" lleva a `/calera-de-tango/gasfiter`. Las demás sugerencias siguen yendo a la búsqueda libre con la URL que devuelve el API.
