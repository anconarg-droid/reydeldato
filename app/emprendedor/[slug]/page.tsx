import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import PortalGallery from "./PortalGallery";
import TrackedActionButton from "./TrackedActionButton";
import ShareFichaButton from "./ShareFichaButton";
import TrackView from "@/components/TrackView";
import BackLink from "@/components/BackLink";
import {
  buildWhatsappUrl,
  buildInstagramUrl,
  buildWebsiteUrl,
  formatWhatsappDisplay,
  formatInstagramDisplay,
  formatWebsiteDisplay,
} from "@/lib/formatPublicLinks";
import { coberturaTexto, coberturaBadge } from "@/lib/cobertura";
import { getProfileState } from "@/lib/profileState";

type Emprendedor = {
  id?: string | number | null;
  slug: string;
  nombre: string;
  descripcion_corta?: string;
  descripcion_larga?: string;

  categoria_id?: string | number | null;
  categoria_nombre?: string;
  categoria_slug?: string;
  subcategorias_nombres_arr?: string[];
  subcategorias_slugs_arr?: string[];

  comuna_base_id?: string | number | null;
  comuna_nombre?: string;
  comuna_slug?: string;
  region_id?: string | number | null;
  region_nombre?: string;
  region_slug?: string;

  cobertura_tipo?: string;
  cobertura_comunas_arr?: string[];
  cobertura_comunas_slugs_arr?: string[];

  modalidades_atencion_arr?: string[];

  foto_principal_url?: string;
  galeria_urls_arr?: string[];

  whatsapp?: string;
  instagram?: string;
  sitio_web?: string;
  email?: string;

  responsable_nombre?: string;
  mostrar_responsable?: boolean;

  direccion?: string;

  estado_publicacion?: string;
  destacado?: boolean;
  updated_at?: string | null;

  // aliases temporales por compatibilidad
  web?: string;
  nivel_cobertura?: string;
  comunas_cobertura_nombres_arr?: string[];
  modalidades_atencion?: string[];
  galeria_urls?: string[];
  comuna_base_nombre?: string;
  comuna_base_slug?: string;

  plan?: string;
  trial_expira?: string | null;
  trial_inicia_at?: string | null;
  trial_expira_at?: string | null;
  created_at?: string | null;
  plan_tipo?: string | null;
  plan_periodicidad?: string | null;
  plan_activo?: boolean | null;
  plan_inicia_at?: string | null;
  plan_expira_at?: string | null;

  // Nueva clasificación V1 (opcionales)
  tipo_actividad?: string | null;
  sector_slug?: string | null;
  tags_slugs?: string[] | null;
  clasificacion_confianza?: number | null;
};

type Similar = {
  nombre: string;
  slug: string;
  categoria_nombre?: string;
  comuna_base_nombre?: string;
  foto_principal_url?: string;
  whatsapp?: string;
  plan_activo?: boolean;
  plan_expira_at?: string | null;
  trial_expira_at?: string | null;
  created_at?: string | null;
};

function s(v: unknown): string {
  if (v === null || v === undefined) return "";
  return String(v).trim();
}

function arr(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v
    .map((x) => (x == null ? "" : String(x).trim()))
    .filter(Boolean);
}

function prettyTagSlug(slug: string): string {
  const base = s(slug).replace(/_/g, " ").trim();
  if (!base) return "";
  const lower = base.toLowerCase();
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}

function normalizeSiteUrl() {
  return (
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, "") ||
    "http://localhost:3000"
  );
}

async function getEmprendedor(slug: string): Promise<Emprendedor | null> {
  const baseUrl = normalizeSiteUrl();

  const res = await fetch(
    `${baseUrl}/api/emprendedor/${encodeURIComponent(slug)}`,
    { cache: "no-store" }
  );

  if (!res.ok) return null;

  const data = await res.json();
  if (!data?.ok || !data?.item) return null;

  return data.item;
}

async function getSimilares(actualSlug: string): Promise<Similar[]> {
  const baseUrl = normalizeSiteUrl();
  const res = await fetch(
    `${baseUrl}/api/emprendedor/${encodeURIComponent(actualSlug)}/similares`,
    { cache: "no-store" }
  );
  if (!res.ok) return [];
  const data = await res.json();
  if (!data?.ok || !Array.isArray(data?.items)) return [];
  return data.items;
}

function buildMailUrl(email: string) {
  const value = s(email);
  return value ? `mailto:${value}` : "";
}

function modalidadesTexto(list?: string[]) {
  if (!list?.length) return "No informada";

  const map: Record<string, string> = {
    local_fisico: "Local físico",
    domicilio: "A domicilio",
    online: "Online",
    presencial: "Presencial",
    fisico: "Físico",
  };

  return list.map((v) => map[v] || v).join(", ");
}

function prettySubcategoriaPath(list?: string[]) {
  if (!list?.length) return "";
  return s(list[0]);
}

function sectorNombreLegible(slug?: string | null): string {
  const key = s(slug).toLowerCase();
  const map: Record<string, string> = {
    alimentacion: "Alimentación",
    hogar_construccion: "Hogar y construcción",
    automotriz: "Automotriz",
    salud_bienestar: "Salud y bienestar",
    belleza_estetica: "Belleza y estética",
    mascotas: "Mascotas",
    eventos: "Eventos",
    educacion_clases: "Educación y clases",
    tecnologia: "Tecnología",
    comercio_tiendas: "Comercio y tiendas",
    transporte_fletes: "Transporte y fletes",
    jardin_agricultura: "Jardín y agricultura",
    profesionales_asesorias: "Profesionales y asesorías",
    turismo_alojamiento: "Turismo y alojamiento",
    otros: "Otros",
  };
  return map[key] || "No informado";
}

function InfoRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "160px 1fr",
        gap: 14,
        fontSize: 15,
        lineHeight: 1.55,
      }}
    >
      <div style={{ fontWeight: 800, color: "#111827" }}>{label}</div>
      <div style={{ color: "#374151" }}>{value || "-"}</div>
    </div>
  );
}

function SimilarCard({ n }: { n: Similar }) {
  const nombre = s(n.nombre);
  const slug = s(n.slug);
  const categoria = s(n.categoria_nombre);
  const comuna = s(n.comuna_base_nombre);
  const hasCategoriaOComuna = !!categoria || !!comuna;
  const categoriaOComunaTexto = [categoria, comuna].filter(Boolean).join(" • ");
  const foto = s(n.foto_principal_url);
  const whatsapp = s(n.whatsapp);
  const hasWhatsapp = whatsapp.length >= 9;

  const profileState = getProfileState(n.created_at ?? null, {
    planActivo: n.plan_activo ?? undefined,
    planExpiraAt: n.plan_expira_at ?? undefined,
    trialExpiraAt: n.trial_expira_at ?? undefined,
    trialExpira: n.trial_expira_at ?? undefined,
  });
  const isFullProfile = profileState.isFullProfile;

  const waMessage = "Hola, vi tu emprendimiento en Rey del Dato y quiero hacer una consulta.";
  const waBase = hasWhatsapp
    ? (whatsapp.startsWith("http") ? whatsapp : `https://wa.me/${whatsapp.replace(/\D/g, "")}`)
    : "";
  const whatsappHref = hasWhatsapp
    ? `${waBase}${waBase.includes("?") ? "&" : "?"}text=${encodeURIComponent(waMessage)}`
    : null;

  const fichaHref = isFullProfile && slug ? `/emprendedor/${encodeURIComponent(slug)}` : null;

  return (
    <div
      className="card-hover-effect shadow-sm"
      style={{
        border: "1px solid #e5e7eb",
        borderRadius: 18,
        overflow: "hidden",
        background: "#fff",
        display: "flex",
        flexDirection: "column",
        height: "100%",
      }}
    >
      {fichaHref ? (
        <a
          href={fichaHref}
          style={{
            textDecoration: "none",
            color: "inherit",
            flex: "1 1 auto",
            minHeight: 0,
          }}
        >
          {foto ? (
            <div style={{ aspectRatio: "16/10", background: "#f1f5f9", overflow: "hidden" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={foto}
                alt=""
                className="card-img-zoom"
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            </div>
          ) : (
            <div
              style={{
                aspectRatio: "16/10",
                background: "#f1f5f9",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 32,
                color: "#cbd5e1",
              }}
            >
              🏪
            </div>
          )}
          <div style={{ padding: 20 }}>
            {hasCategoriaOComuna ? (
              <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 6, fontWeight: 700 }}>
                {categoriaOComunaTexto}
              </div>
            ) : null}
            <div style={{ fontSize: 18, lineHeight: 1.25, fontWeight: 800, color: "#111827" }}>
              {nombre}
            </div>
          </div>
        </a>
      ) : (
        <>
          {foto ? (
            <div style={{ aspectRatio: "16/10", background: "#f1f5f9", overflow: "hidden" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={foto}
                alt=""
                className="card-img-zoom"
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            </div>
          ) : (
            <div
              style={{
                aspectRatio: "16/10",
                background: "#f1f5f9",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 32,
                color: "#cbd5e1",
              }}
            >
              🏪
            </div>
          )}
          <div style={{ padding: 20 }}>
            {hasCategoriaOComuna ? (
              <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 6, fontWeight: 700 }}>
                {categoriaOComunaTexto}
              </div>
            ) : null}
            <div style={{ fontSize: 18, lineHeight: 1.25, fontWeight: 800, color: "#111827" }}>
              {nombre}
            </div>
          </div>
        </>
      )}
      <div style={{ padding: "0 20px 20px", marginTop: "auto", display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
        {whatsappHref && (
          <a
            href={whatsappHref}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "10px 16px",
              borderRadius: 9999,
              background: "#16a34a",
              color: "#fff",
              fontSize: 14,
              fontWeight: 700,
              textDecoration: "none",
            }}
          >
            WhatsApp
          </a>
        )}
        {fichaHref && (
          <a
            href={fichaHref}
            style={{
              display: "inline-flex",
              alignItems: "center",
              padding: "10px 16px",
              borderRadius: 9999,
              border: "1px solid #cbd5e1",
              background: "#fff",
              color: "#334155",
              fontSize: 14,
              fontWeight: 600,
              textDecoration: "none",
            }}
          >
            Ver ficha
          </a>
        )}
      </div>
    </div>
  );
}

export async function generateStaticParams() {
  return [];
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const item = await getEmprendedor(slug);

  if (!item) {
    return {
      title: "Ficha no encontrada | Rey del Dato",
      description: "No encontramos la ficha solicitada.",
    };
  }

  const comuna = s(item.comuna_nombre || item.comuna_base_nombre) || "tu comuna";
  const categoria = s(item.categoria_nombre) || "servicios";
  const title = `${item.nombre} en ${comuna} | Rey del Dato`;
  const description =
    s(item.descripcion_corta) ||
    `${item.nombre}. ${categoria} en ${comuna}. Contacta directo por WhatsApp y revisa su ficha completa.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: item.foto_principal_url ? [item.foto_principal_url] : [],
    },
  };
}

export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const item = await getEmprendedor(slug);

  if (!item) notFound();

  const comunaNombre = item.comuna_nombre || item.comuna_base_nombre || "";
  const comunaSlug = item.comuna_slug || item.comuna_base_slug || "";
  const coberturaTipo = item.cobertura_tipo || item.nivel_cobertura || "";
  const coberturaComunas =
    item.cobertura_comunas_arr || item.comunas_cobertura_nombres_arr || [];
  const modalidades =
    item.modalidades_atencion_arr || item.modalidades_atencion || [];
  const galeria = item.galeria_urls_arr || item.galeria_urls || [];
  const sitioWeb = item.sitio_web || item.web || "";

  const whatsappUrl = buildWhatsappUrl(item.whatsapp || "");
  const instagramUrl = buildInstagramUrl(item.instagram || "");
  const webUrl = buildWebsiteUrl(sitioWeb);
  const mailUrl = buildMailUrl(item.email || "");

  const whatsappText = formatWhatsappDisplay(item.whatsapp || "");
  const instagramText = formatInstagramDisplay(item.instagram || "");
  const webText = formatWebsiteDisplay(sitioWeb);

  const cobertura = coberturaTexto(coberturaTipo, coberturaComunas);
  const modalidadesTextoFinal = modalidadesTexto(modalidades);
  const tieneLocalFisico = modalidades.includes("local_fisico");

  const frase =
    item.descripcion_corta ||
    `${item.categoria_nombre || "Servicio"} en ${comunaNombre || "tu comuna"}`;

  const siteUrl = normalizeSiteUrl();
  const shareUrl = `${siteUrl}/emprendedor/${item.slug}`;

  const subcategorias = arr(item.subcategorias_nombres_arr);
  const subcategoriaSlugs = arr(item.subcategorias_slugs_arr);
  const subcategoriaSlugPrincipal = prettySubcategoriaPath(subcategoriaSlugs);

  const similares = await getSimilares(item.slug);

  const profileState = getProfileState(item.created_at, {
    planActivo: item.plan_activo ?? undefined,
    planExpiraAt: item.plan_expira_at ?? undefined,
    trialExpiraAt: item.trial_expira_at ?? item.trial_expira ?? undefined,
    trialExpira: item.trial_expira ?? undefined,
  });

  const hasPlanOrTrialData =
    (item.trial_expira_at != null && String(item.trial_expira_at).trim() !== "") ||
    (item.trial_expira != null && String(item.trial_expira).trim() !== "") ||
    (item.plan_expira_at != null && String(item.plan_expira_at).trim() !== "");

  // Si no hay datos de plan/trial en BD, mostrar ficha completa (galería y datos) para no mostrar ficha reducida por error
  const isFullProfile = profileState.isFullProfile || !hasPlanOrTrialData;

  if (!isFullProfile && whatsappUrl && hasPlanOrTrialData) {
    const waMessage = "Hola, vi tu emprendimiento en Rey del Dato y quiero hacer una consulta.";
    const waRedirect = `${whatsappUrl}${whatsappUrl.includes("?") ? "&" : "?"}text=${encodeURIComponent(waMessage)}`;
    redirect(waRedirect);
  }

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: item.nombre,
    description: item.descripcion_larga || item.descripcion_corta || frase,
    image: [item.foto_principal_url, ...galeria].filter(Boolean),
    url: shareUrl,
    email: s(item.email) || undefined,
    telephone: s(item.whatsapp) || undefined,
    areaServed: comunaNombre || undefined,
    address:
      tieneLocalFisico && item.direccion
        ? {
            "@type": "PostalAddress",
            streetAddress: item.direccion,
            addressLocality: comunaNombre,
            addressRegion: item.region_nombre || undefined,
            addressCountry: "CL",
          }
        : comunaNombre
        ? {
            "@type": "PostalAddress",
            addressLocality: comunaNombre,
            addressRegion: item.region_nombre || undefined,
            addressCountry: "CL",
          }
        : undefined,
    sameAs: [instagramUrl, webUrl].filter(Boolean),
    knowsAbout: subcategorias.length ? subcategorias : undefined,
  };

  return (
    <main style={{ maxWidth: 1280, margin: "0 auto", padding: "28px 20px 80px" }}>
      <TrackView slug={item.slug} />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div style={{ marginBottom: 8, display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
        <BackLink
          style={{
            fontWeight: 700,
            fontSize: 14,
            textDecoration: "none",
            color: "#2563eb",
          }}
        >
          ← Volver
        </BackLink>
        <ShareFichaButton
          slug={item.slug}
          shareUrl={shareUrl}
          style={{
            display: "inline-flex",
            alignItems: "center",
            padding: "8px 14px",
            borderRadius: 10,
            border: "2px solid #e2e8f0",
            fontWeight: 700,
            fontSize: 13,
            textDecoration: "none",
            color: "#334155",
            background: "#fff",
          }}
        />
      </div>

      <div style={{ fontSize: 14, color: "#6b7280", marginBottom: 20 }}>
        <a href="/" style={{ color: "#2563eb", textDecoration: "none" }}>
          Inicio
        </a>
        {comunaSlug ? (
          <>
            {" / "}
            <a
              href={`/${comunaSlug}`}
              style={{ color: "#2563eb", textDecoration: "none" }}
            >
              {comunaNombre || "Comuna"}
            </a>
          </>
        ) : comunaNombre ? (
          <>{" / "}<span>{comunaNombre}</span></>
        ) : null}
        {(subcategoriaSlugPrincipal && comunaSlug) || s(item.categoria_nombre) ? (
          <>
            {" / "}
            {subcategoriaSlugPrincipal && comunaSlug ? (
              <a
                href={`/${comunaSlug}/${subcategoriaSlugPrincipal}`}
                style={{ color: "#2563eb", textDecoration: "none" }}
              >
                {subcategorias[0] || item.categoria_nombre}
              </a>
            ) : (
              <span>{item.categoria_nombre}</span>
            )}
          </>
        ) : null}
        {" / "}
        {item.nombre}
      </div>

      {!isFullProfile ? (
        <section
          style={{
            border: "1px solid #E5E7EB",
            borderRadius: 16,
            padding: 24,
            marginBottom: 24,
            background: "#fff",
            maxWidth: 560,
          }}
        >
          {item.foto_principal_url ? (
            <div className="card-hover-effect" style={{ marginBottom: 16, borderRadius: 12, overflow: "hidden" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={item.foto_principal_url}
                alt=""
                className="card-img-zoom"
                style={{ width: "100%", height: "auto", display: "block", objectFit: "cover" }}
              />
            </div>
          ) : null}
          <h1
            style={{
              fontSize: 28,
              lineHeight: 1.2,
              margin: "0 0 12px 0",
              fontWeight: 900,
              color: "#111827",
            }}
          >
            {item.nombre}
          </h1>
          {(() => {
            const badge = coberturaBadge(coberturaTipo);
            return (
              <div
                style={{
                  display: "inline-block",
                  marginBottom: 12,
                  padding: "6px 12px",
                  borderRadius: 10,
                  background: "#f3f4f6",
                  border: "1px solid #e5e7eb",
                  fontSize: 13,
                  fontWeight: 700,
                  color: "#374151",
                }}
              >
                {badge.emoji} {badge.label}
              </div>
            );
          })()}
          <p style={{ fontSize: 14, color: "#6b7280", margin: "0 0 16px 0" }}>
            📍 {comunaNombre || "Comuna no informada"}
            {item.region_nombre ? ` • ${item.region_nombre}` : ""}
          </p>
          <p style={{ fontSize: 14, color: "#374151", margin: "0 0 16px 0" }}>
            Contacto directo con el emprendimiento
          </p>
          {whatsappUrl ? (
            <TrackedActionButton
              slug={item.slug}
              type="whatsapp"
              href={whatsappUrl}
              label="Hablar por WhatsApp"
              bg="#16a34a"
            />
          ) : null}
          <div style={{ marginTop: 20, paddingTop: 16, borderTop: "1px solid #e5e7eb" }}>
            <p style={{ fontSize: 15, lineHeight: 1.6, color: "#374151", margin: 0 }}>
              {item.descripcion_corta || "Sin descripción"}
            </p>
          </div>
        </section>
      ) : (
        <>
      <section
        style={{
          display: "grid",
          gridTemplateColumns: "1.2fr 380px",
          gap: 20,
          marginBottom: 30,
          alignItems: "start",
        }}
      >
        <PortalGallery
          fotoPrincipal={item.foto_principal_url || ""}
          galeria={galeria}
        />

        <aside
          style={{
            border: "1px solid #e5e7eb",
            borderRadius: 24,
            padding: 24,
            background: "#fff",
          }}
        >
          <ShareFichaButton
            slug={item.slug}
            shareUrl={shareUrl}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 16,
              padding: "10px 18px",
              borderRadius: 12,
              border: "2px solid #e2e8f0",
              fontWeight: 700,
              fontSize: 14,
              textDecoration: "none",
              color: "#334155",
              background: "#fff",
            }}
          />
          <div style={{ fontWeight: 900, color: "#2563eb", marginBottom: 8 }}>
            📍 {comunaNombre || "Comuna no informada"}
            {item.region_nombre ? ` • ${item.region_nombre}` : ""}
          </div>

          {(() => {
            const badge = coberturaBadge(coberturaTipo);
            return (
              <div
                style={{
                  display: "inline-block",
                  marginBottom: 14,
                  padding: "6px 12px",
                  borderRadius: 10,
                  background: "#eff6ff",
                  border: "1px solid #bfdbfe",
                  fontSize: 13,
                  fontWeight: 800,
                  color: "#1e40af",
                }}
              >
                {badge.emoji} {badge.label}
              </div>
            );
          })()}

          <h1
            style={{
              fontSize: 42,
              lineHeight: 1,
              margin: "0 0 10px 0",
              fontWeight: 900,
              color: "#111827",
            }}
          >
            {item.nombre}
          </h1>

          <p
            style={{
              margin: "0 0 14px 0",
              fontSize: 18,
              lineHeight: 1.6,
              color: "#374151",
            }}
          >
            {frase}
          </p>

          {subcategorias.length > 0 ? (
            <div
              style={{
                display: "flex",
                gap: 8,
                flexWrap: "wrap",
                marginBottom: 14,
              }}
            >
              {subcategorias.map((sub, i) => {
                const slugSub = subcategoriaSlugs[i] || "";
                return (
                  <a
                    key={`${sub}-${i}`}
                    href={slugSub ? `/buscar?subcategoria=${encodeURIComponent(slugSub)}` : "#"}
                    style={{
                      background: "#eff6ff",
                      color: "#1d4ed8",
                      padding: "6px 10px",
                      borderRadius: 8,
                      fontSize: 13,
                      fontWeight: 700,
                      textDecoration: "none",
                    }}
                  >
                    {sub}
                  </a>
                );
              })}
            </div>
          ) : null}

          <a
            href={comunaSlug ? `/${comunaSlug}` : "/"}
            style={{
              display: "inline-block",
              marginBottom: 14,
              fontWeight: 700,
              textDecoration: "none",
              color: "#2563eb",
              fontSize: 14,
            }}
          >
            Ver más negocios en {comunaNombre || "esta comuna"}
          </a>

          {item.mostrar_responsable && item.responsable_nombre ? (
            <p style={{ fontSize: 14, margin: "0 0 12px 0", color: "#374151" }}>
              <strong>Responsable:</strong> {item.responsable_nombre}
            </p>
          ) : null}

          <p style={{ fontSize: 14, margin: "0 0 8px 0", color: "#374151" }}>
            <strong>Forma de atención:</strong> {modalidadesTextoFinal}
          </p>

          <p style={{ fontSize: 14, margin: "0 0 8px 0", color: "#374151" }}>
            <strong>Cobertura:</strong> {cobertura}
          </p>

          {tieneLocalFisico && item.direccion ? (
            <p style={{ fontSize: 14, margin: "0 0 8px 0", color: "#374151" }}>
              <strong>Dirección:</strong> {item.direccion}
            </p>
          ) : null}
        </aside>
      </section>

      <section
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 320px",
          gap: 24,
          alignItems: "start",
        }}
      >
        <div>
          <div
            style={{
              border: "1px solid #e5e7eb",
              borderRadius: 20,
              padding: 22,
              marginBottom: 20,
              background: "#fff",
            }}
          >
            <h2
              style={{
                margin: "0 0 12px 0",
                fontSize: 22,
                fontWeight: 900,
                color: "#111827",
              }}
            >
              Descripción
            </h2>

            <p style={{ lineHeight: 1.75, color: "#374151", margin: 0 }}>
              {item.descripcion_larga || item.descripcion_corta || "Sin descripción"}
            </p>
          </div>

          {tieneLocalFisico && item.direccion ? (
            <section
              style={{
                border: "1px solid #e5e7eb",
                borderRadius: 20,
                padding: 22,
                marginBottom: 20,
                background: "#fff",
              }}
            >
              <h2
                style={{
                  margin: "0 0 8px 0",
                  fontSize: 22,
                  fontWeight: 900,
                  color: "#111827",
                }}
              >
                Ubicación
              </h2>
              <p style={{ fontSize: 14, color: "#374151", margin: "0 0 12px 0" }}>
                {item.direccion}
                {comunaNombre ? `, ${comunaNombre}` : ""}
                {item.region_nombre ? `, ${item.region_nombre}` : ""}
              </p>
              <iframe
                title="Mapa de ubicación"
                width="100%"
                height={280}
                style={{ border: 0, borderRadius: 16, display: "block" }}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                src={`https://www.google.com/maps?q=${encodeURIComponent(
                  `${item.direccion},${comunaNombre || ""},Chile`
                )}&output=embed`}
              />
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(item.direccion)}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "inline-block",
                  marginTop: 12,
                  padding: "10px 16px",
                  borderRadius: 10,
                  fontWeight: 700,
                  fontSize: 14,
                  textDecoration: "none",
                  color: "#fff",
                  background: "#2563eb",
                }}
              >
                Ver en Google Maps
              </a>
            </section>
          ) : null}

        </div>

        <aside
          style={{
            border: "1px solid #e2e8f0",
            borderRadius: 20,
            background: "#f8fafc",
            padding: 20,
            height: "fit-content",
          }}
        >
          <h3
            style={{
              margin: "0 0 10px 0",
              fontSize: 22,
              fontWeight: 900,
              color: "#0f172a",
            }}
          >
            Contacto
          </h3>

          <p
            style={{
              margin: "0 0 14px 0",
              fontSize: 14,
              lineHeight: 1.55,
              color: "#475569",
            }}
          >
            Contacta directamente a este emprendimiento usando sus canales disponibles.
          </p>

          <div style={{ display: "grid", gap: 10, marginBottom: 16 }}>
            {whatsappUrl ? (
              <TrackedActionButton
                slug={item.slug}
                type="whatsapp"
                href={whatsappUrl}
                label="Hablar por WhatsApp"
                bg="#16a34a"
              />
            ) : null}
            {instagramUrl ? (
              <TrackedActionButton
                slug={item.slug}
                type="instagram"
                href={instagramUrl}
                label="Ver Instagram"
                bg="#B84D7A"
              />
            ) : null}
            {webUrl ? (
              <TrackedActionButton
                slug={item.slug}
                type="web"
                href={webUrl}
                label="Visitar sitio web"
                bg="#2563eb"
              />
            ) : null}
            {mailUrl ? (
              <TrackedActionButton
                slug={item.slug}
                type="email"
                href={mailUrl}
                label="Enviar correo"
                bg="#f1f5f9"
                color="#334155"
              />
            ) : null}
          </div>

          <div
            style={{
              display: "grid",
              gap: 10,
              paddingTop: 14,
              borderTop: "1px solid #e2e8f0",
            }}
          >
            {whatsappText ? (
              <div style={contactTextStyle}>
                <strong>WhatsApp:</strong> {whatsappText}
              </div>
            ) : null}

            {instagramUrl && instagramText ? (
              <a
                href={instagramUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={contactLinkStyle}
              >
                {instagramText}
              </a>
            ) : null}

            {webUrl && webText ? (
              <a
                href={webUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={contactLinkStyle}
              >
                {webText}
              </a>
            ) : null}

            {item.email ? (
              <div style={contactTextStyle}>
                <strong>Email:</strong> {item.email}
              </div>
            ) : null}
          </div>
        </aside>
      </section>

      <section style={{ marginTop: 48 }}>
        <h2
          style={{
            margin: "0 0 20px 0",
            fontSize: 24,
            fontWeight: 900,
            color: "#111827",
          }}
        >
          Otros servicios en esta comuna
        </h2>

        {similares.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {similares.slice(0, 6).map((n) => (
              <SimilarCard key={n.slug} n={n} />
            ))}
          </div>
        ) : (
          <p style={{ fontSize: 14, color: "#6b7280", margin: 0 }}>
            No hay otros negocios para mostrar en este momento.
          </p>
        )}
      </section>
        </>
      )}
    </main>
  );
}

const contactTextStyle: React.CSSProperties = {
  fontSize: 14,
  color: "#475569",
  lineHeight: 1.5,
  wordBreak: "break-word",
};

const contactLinkStyle: React.CSSProperties = {
  fontSize: 14,
  color: "#334155",
  fontWeight: 700,
  textDecoration: "none",
  wordBreak: "break-word",
};