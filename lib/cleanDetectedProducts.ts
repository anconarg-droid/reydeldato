export function cleanDetectedProducts(products: string[]): string[] {
  if (!products || products.length === 0) return [];

  const normalized = products.map((p) => p.toLowerCase().trim());

  const unique = Array.from(new Set(normalized));

  const filteredPlural = unique.filter((p) => {
    const singular = p.endsWith("s") ? p.slice(0, -1) : null;
    if (singular && unique.includes(singular)) {
      return p.endsWith("s");
    }
    return true;
  });

  const final = filteredPlural.filter(
    (p) => !filteredPlural.some((other) => other !== p && other.includes(p))
  );

  return final;
}
