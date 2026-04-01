"use client";

import * as React from "react";

/** Sin `next-themes`: deja de romper el build; si más adelante quieres tema oscuro, añade la dependencia. */
export function ThemeProvider({
  children,
}: React.PropsWithChildren<Record<string, unknown>>) {
  return <>{children}</>;
}
