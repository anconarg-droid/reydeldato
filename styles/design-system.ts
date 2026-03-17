/**
 * Sistema de diseño global – Rey del Dato
 * Tokens únicos para colores, radios y espaciado.
 */

export const designSystem = {
  colors: {
    primary: "#0F172A",
    secondary: "#1E293B",
    accent: "#F59E0B",
    success: "#10B981",
    border: "#E5E7EB",
    background: "#FFFFFF",
    muted: "#6B7280",
  },

  radius: {
    card: "12px",
    button: "10px",
  },

  spacing: {
    section: "48px",
    cardPadding: "20px",
  },

  /** Jerarquía tipográfica (nombres para uso en componentes) */
  typography: {
    h1: "text-2xl font-bold tracking-tight sm:text-3xl",
    h2: "text-xl font-bold sm:text-2xl",
    h3: "text-lg font-bold",
    body: "text-base text-gray-600",
    small: "text-sm text-gray-600",
  },
} as const;
