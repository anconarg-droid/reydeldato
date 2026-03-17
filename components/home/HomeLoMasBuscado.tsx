"use client";

import { TAGS_MAS_BUSCADOS, prettyComunaSlug } from "@/lib/homeConstants";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

export default function HomeLoMasBuscado() {
  const searchParams = useSearchParams();
  const comuna = searchParams.get("comuna") ?? "";
  const comunaLabel = comuna ? prettyComunaSlug(comuna) : "";

  const title = comunaLabel
    ? `Lo más buscado en ${comunaLabel}`
    : "Lo más buscado cerca de ti";

  return (
    <section className="max-w-6xl mx-auto px-4 py-10">
      <h2 className="text-xl font-bold text-slate-900 mb-4">{title}</h2>
      <div className="flex flex-wrap gap-2">
        {TAGS_MAS_BUSCADOS.map((tag) => {
          const params = new URLSearchParams();
          params.set("q", tag);
          if (comuna) params.set("comuna", comuna);
          return (
            <Link
              key={tag}
              href={`/buscar?${params.toString()}`}
              className="px-4 py-2 rounded-full bg-white border border-slate-200 text-slate-800 text-sm font-semibold hover:bg-slate-50 hover:border-sky-200 transition"
            >
              {tag}
            </Link>
          );
        })}
      </div>
    </section>
  );
}
