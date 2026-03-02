import { notFound } from "next/navigation";
import Link from "next/link";
import { getIndexEmprendedores } from "@/lib/algolia";

type Emprendedor = {
  objectID?: string;
  id?: string;

  slug?: string;
  nombre?: string;

  categoria_nombre?: string;
  categoria_slug?: string;

  comuna_base_nombre?: string;
  comuna_base_slug?: string;

  descripcion_corta?: string;
  descripcion_larga?: string;

  whatsapp?: string; // ideal: "569XXXXXXXX"
  telefono?: string;
  email?: string;

  direccion?: string;

  nivel_cobertura?: "solo_mi_comuna" | "varias_comunas" | "varias_regiones" | "nacional";
  cobertura_comunas_nombres?: string[] | null;
  cobertura_comunas_slugs?: string[] | null;

  region_nombres?: string[] | null;

  fotos?: string[] | null; // URLs públicas
  destacado?: boolean;
  verificado?: boolean;

  created_at?: string;
};

function cleanPhoneToWa(phone?: string) {
  if (!phone) return null;
  const digits = phone.replace(/[^\d]/g, "");
  if (!digits) return null;
  // si viene sin código país, asumimos Chile y agregamos 56 si parece celular
  if (digits.startsWith("56")) return digits;
  if (digits.length === 9) return `56${digits}`;
  return digits;
}

function coverageLabel(e: Emprendedor) {
  const base = e?.comuna_base_nombre ? `De ${e.comuna_base_nombre}` : "De tu comuna";
  const cov = e?.nivel_cobertura;

  if (cov === "solo_mi_comuna") return `${base} · Atiende solo su comuna`;
  if (cov === "varias_comunas") return `${base} · Atiende varias comunas`;
  if (cov === "varias_regiones") return `${base} · Atiende varias regiones`;
  if (cov === "nacional") return `${base} · Cobertura nacional`;
  return base;
}

async function getEmprendedorBySlug(slug: string): Promise<Emprendedor | null> {
  const index = getIndexEmprendedores();

  // OJO: para que esto funcione, slug debe estar en "Attributes for faceting" en Algolia
  // (filterOnly(slug) recomendado)
  const res = await index.search("", {
    hitsPerPage: 1,
    facetFilters: [[`slug:${slug}`]],
  });

  return (res.hits?.[0] as any) ?? null;
}

export default async function EmprendedorPage({
  params,
}: {
  params: { slug: string };
}) {
  const slug = (params?.slug ?? "").trim();
  if (!slug) notFound();

  const e = await getEmprendedorBySlug(slug);
  if (!e) notFound();

  const wa = cleanPhoneToWa(e.whatsapp || e.telefono || "");
  const waHref = wa ? `https://wa.me/${wa}` : null;

  const fotos = Array.isArray(e.fotos) ? e.fotos.filter(Boolean) : [];
  const hero = fotos?.[0] ?? null;
  const gallery = fotos?.slice(1, 7) ?? [];

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-3xl font-black tracking-tight">
              {e.nombre || "Emprendedor"}
            </h1>

            {e.verificado ? (
              <span className="rounded-full border px-3 py-1 text-sm font-bold">
                ✔ Verificado
              </span>
            ) : null}

            {e.destacado ? (
              <span className="rounded-full border px-3 py-1 text-sm font-bold">
                ⭐ Destacado
              </span>
            ) : null}
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm opacity-80">
            <span className="rounded-full border px-3 py-1 font-semibold">
              {e.categoria_nombre || "Servicio"}
            </span>
            <span className="rounded-full border px-3 py-1 font-semibold">
              {e.comuna_base_nombre || "Comuna"}
            </span>
            <span className="rounded-full border px-3 py-1 font-semibold">
              {coverageLabel(e)}
            </span>
          </div>

          {e.descripcion_corta ? (
            <p className="mt-4 text-base opacity-90">{e.descripcion_corta}</p>
          ) : null}
        </div>

        {/* WhatsApp */}
        <div className="w-full md:w-[320px]">
          <div className="rounded-2xl border bg-white p-4 shadow-sm">
            <div className="text-sm font-bold opacity-80">Contacto</div>

            {waHref ? (
              <a
                href={waHref}
                target="_blank"
                rel="noreferrer"
                className="mt-3 block rounded-xl border px-4 py-3 text-center font-black hover:bg-gray-50"
              >
                💬 WhatsApp
              </a>
            ) : (
              <div className="mt-3 rounded-xl border px-4 py-3 text-sm opacity-75">
                Aún no hay WhatsApp publicado.
              </div>
            )}

            <div className="mt-3 text-xs opacity-70">
              Consejo: mientras más fotos y datos tenga tu ficha, más confianza genera.
            </div>

            <Link
              href="/publicar"
              className="mt-3 block rounded-xl border px-4 py-3 text-center font-black hover:bg-gray-50"
            >
              Publicar mi negocio
            </Link>
          </div>
        </div>
      </div>

      {/* Hero */}
      <div className="mt-8 overflow-hidden rounded-2xl border bg-white">
        {hero ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={hero}
            alt={e.nombre || "Foto principal"}
            className="h-[260px] w-full object-cover md:h-[360px]"
          />
        ) : (
          <div className="flex h-[220px] items-center justify-center opacity-70">
            Sin foto principal (aquí va la mejor foto del negocio)
          </div>
        )}
      </div>

      {/* Galería */}
      {gallery.length ? (
        <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3">
          {gallery.map((url, i) => (
            <div key={url + i} className="overflow-hidden rounded-2xl border bg-white">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt={`Foto ${i + 2}`} className="h-40 w-full object-cover" />
            </div>
          ))}
        </div>
      ) : null}

      {/* Info + Descripción larga */}
      <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <h2 className="text-lg font-black">Información</h2>

          <div className="mt-4 space-y-2 text-sm">
            <div className="flex items-start gap-2">
              <span className="opacity-70">📍</span>
              <div>
                <div className="font-bold">Comuna base</div>
                <div className="opacity-80">{e.comuna_base_nombre || "—"}</div>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <span className="opacity-70">🧭</span>
              <div>
                <div className="font-bold">Cobertura</div>
                <div className="opacity-80">
                  {e.nivel_cobertura === "solo_mi_comuna" ? "Solo su comuna" : null}
                  {e.nivel_cobertura === "varias_comunas" ? "Varias comunas" : null}
                  {e.nivel_cobertura === "varias_regiones" ? "Varias regiones" : null}
                  {e.nivel_cobertura === "nacional" ? "Nacional" : null}
                  {!e.nivel_cobertura ? "—" : null}
                </div>

                {e.nivel_cobertura === "varias_comunas" &&
                e.cobertura_comunas_nombres?.length ? (
                  <div className="mt-2 text-xs opacity-75">
                    Comunas: {e.cobertura_comunas_nombres.join(", ")}
                  </div>
                ) : null}

                {e.nivel_cobertura === "varias_regiones" && e.region_nombres?.length ? (
                  <div className="mt-2 text-xs opacity-75">
                    Regiones: {e.region_nombres.join(", ")}
                  </div>
                ) : null}
              </div>
            </div>

            {e.direccion ? (
              <div className="flex items-start gap-2">
                <span className="opacity-70">🏠</span>
                <div>
                  <div className="font-bold">Dirección</div>
                  <div className="opacity-80">{e.direccion}</div>
                </div>
              </div>
            ) : null}
          </div>
        </div>

        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <h2 className="text-lg font-black">Sobre este negocio</h2>

          {e.descripcion_larga ? (
            <p className="mt-4 whitespace-pre-line text-sm opacity-90">
              {e.descripcion_larga}
            </p>
          ) : (
            <div className="mt-4 text-sm opacity-70">
              Aún no hay descripción larga. (Esto es clave para convertir visitas en WhatsApp.)
            </div>
          )}

          <div className="mt-6 rounded-xl border bg-gray-50 p-4">
            <div className="text-sm font-black">¿Eres emprendedor?</div>
            <div className="mt-1 text-sm opacity-80">
              Publica tu negocio y aparece cuando la gente busque en tu comuna.
            </div>
            <Link
              href="/publicar"
              className="mt-3 inline-block rounded-xl border bg-white px-4 py-2 font-black hover:bg-gray-50"
            >
              Publicar mi negocio
            </Link>
          </div>
        </div>
      </div>

      {/* Footer acciones */}
      <div className="mt-8 flex flex-wrap gap-2">
        <Link href="/" className="rounded-xl border px-4 py-2 font-bold hover:bg-gray-50">
          ← Volver al inicio
        </Link>
        <Link
          href="/publicar"
          className="rounded-xl border px-4 py-2 font-bold hover:bg-gray-50"
        >
          + Publicar
        </Link>
      </div>
    </div>
  );
}