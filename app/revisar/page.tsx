import { redirect } from "next/navigation";
import { buildMejorarFichaQueryString } from "@/lib/mejorarFichaQuery";

export const metadata = {
  title: "Editar ficha | Rey del Dato",
  robots: { index: false, follow: false },
};

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function RevisarPage({ searchParams }: PageProps) {
  const raw = searchParams ? await searchParams : {};
  const entries: Record<string, string | undefined> = {};

  for (const [k, v] of Object.entries(raw)) {
    if (v == null) continue;
    if (Array.isArray(v)) {
      const first = v.find((x) => String(x ?? "").trim());
      if (first != null) entries[k] = String(first).trim();
    } else {
      const t = String(v).trim();
      if (t) entries[k] = t;
    }
  }

  const qs = buildMejorarFichaQueryString(entries);
  redirect(`/panel${qs}`);
}
