"use client";

import { useEffect, type ReactNode } from "react";
import { initPosthogClient } from "@/lib/posthog";

/**
 * Monta PostHog solo en el cliente y ejecuta init una vez por carga de página.
 * El layout raíz envuelve la app para que pageviews y autocapture apliquen globalmente.
 */
export default function PostHogProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    initPosthogClient();
  }, []);

  return children;
}
