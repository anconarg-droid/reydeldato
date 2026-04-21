/**
 * Une clases CSS (mismo rol que en shadcn). Sin `tailwind-merge`: suficiente para los UI de v0-home.
 */
export function cn(
  ...inputs: (string | number | boolean | null | undefined)[]
): string {
  return inputs.filter(Boolean).join(" ");
}
