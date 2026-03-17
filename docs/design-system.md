# Sistema visual – Rey del Dato

Base visual reutilizable para mantener coherencia en todo el sitio. Aplicado primero en `/cobertura`.

## 1. Tokens (CSS)

Definidos en `app/globals.css` bajo `:root`:

### Colores
- **CTA principal:** `--rdd-primary` (slate-900)
- **Progreso / éxito:** `--rdd-progress` (emerald-500)
- **En apertura / aviso:** `--rdd-estado-en-apertura` (amber)
- **Sin cobertura:** `--rdd-estado-sin-cobertura` (slate-500)
- **Cards:** `--rdd-card-bg`, `--rdd-card-border`
- **Texto:** `--rdd-text`, `--rdd-text-muted`, `--rdd-label`

### Espaciado
- `--rdd-space-section`: separación entre secciones (3rem)
- `--rdd-space-card` / `--rdd-space-card-lg`: padding de cards
- `--rdd-gap-buttons`, `--rdd-gap-grid`

### Radios y sombras
- `--rdd-radius-card`, `--rdd-radius-button`, `--rdd-radius-progress`
- `--rdd-shadow-card`, `--rdd-shadow-card-hover`

## 2. Componentes UI (`components/ui/`)

| Componente | Uso |
|------------|-----|
| **PageContainer** | Contenedor principal de página (max-width + padding). |
| **SectionCard** | Bloque con borde, fondo y sombra. Variante `panel` para fondo slate-50. |
| **SectionHeader** | Título de sección + opcional label, subtitle. |
| **MetricCard** | Card de métricas (título, líneas de texto, barra de progreso). |
| **ProgressBar** | Barra de progreso. Variantes: `progress` (verde), `warning` (ámbar), `muted` (gris). |
| **BadgeEstado** | Badge para estado: activa, en_apertura, sin_cobertura. |
| **ActionButtonsRow** | Fila de botones (primary, secondary, accent). |
| **ComunaCard** | Tarjeta de comuna: nombre, progreso, “X de Y emprendimientos”, CTAs. |
| **EmptyStateBlock** | Bloque para estado vacío (título + descripción). |

## 3. Jerarquía tipográfica

- **Título principal (H1):** `text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-slate-900`
- **Título de sección (H2):** `text-2xl sm:text-3xl font-bold text-slate-900`
- **Título de card (H3):** `text-lg font-bold text-slate-900` o `text-xl font-bold`
- **Label:** `text-xs font-medium uppercase tracking-wide text-slate-500`
- **Cuerpo:** `text-slate-600`, `text-base` o `text-sm`
- **Métricas grandes:** `text-2xl font-extrabold tabular-nums text-slate-900`

## 4. Uso en /cobertura

La página de cobertura usa:

- **PageContainer** para el contenido principal.
- **EmptyStateBlock** para el hero cuando no hay comuna seleccionada.
- **SectionCard** en CityHero, TerritorialExpansion, ClosestToOpenRanking, CityRanking, InviteBusinessSection, RecommendedActionSection, CategoriesNeeded, ComunaComparison.
- **SectionHeader** en secciones con título y subtítulo.
- **MetricCard** en RegionSummary.
- **ProgressBar** en barras de avance (hero, tarjetas, ranking).
- **ComunaCard** en CitySection (comunas más cerca de abrir, otras comunas).
- **ActionButtonsRow** en CityHero y dentro de ComunaCard.

Para nuevas páginas o bloques, reutilizar estos componentes y las clases indicadas para mantener el mismo producto visual.
