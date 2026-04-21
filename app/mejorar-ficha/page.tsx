import { Suspense, type ReactNode } from "react";
import { redirect } from "next/navigation";
import NegocioForm from "@/app/components/panel/NegocioForm";
import { buildMejorarFichaQueryString } from "@/lib/mejorarFichaQuery";
import { getSupabaseAdminFromEnv } from "@/lib/supabaseAdmin";
import { resolvePanelNegocioFromAccessToken } from "@/lib/panelNegocioAccessToken";

export const metadata = {
  title: "Mejorar ficha | Rey del Dato",
  robots: { index: false, follow: false },
};

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function firstParam(v: string | string[] | undefined): string {
  if (v == null) return "";
  if (Array.isArray(v)) {
    const hit = v.find((x) => String(x ?? "").trim());
    return hit != null ? String(hit).trim() : "";
  }
  return String(v).trim();
}

function parseMejorarFichaFocus(
  raw: string | undefined
): "fotos" | "descripcion" | "redes" | null {
  const v = String(raw || "").trim().toLowerCase();
  if (v === "fotos" || v === "descripcion" || v === "redes") return v;
  return null;
}

/**
 * `/mejorar-ficha` — editor de ficha (NegocioForm en modo upgrade).
 * - `borrador=<postulaciones_emprendedores.id>`: postulación en curso / revisión.
 * - `id=<emprendedor id>`: ficha ya creada (mismo editor).
 * - `access_token` o `token`: resuelve postulación o emprendedor sin exponer id en la URL.
 * Sin `borrador` ni `id` ni token válido → compat: `/panel` preservando params.
 */
export default async function MejorarFichaPage({ searchParams }: PageProps) {
  const raw = searchParams ? await searchParams : {};

  const borrador = firstParam(raw.borrador);
  const idEmp = firstParam(raw.id);
  const opaqueAccess = firstParam(raw.access_token) || firstParam(raw.token);

  const entries: Record<string, string | undefined> = {};
  for (const [k, v] of Object.entries(raw)) {
    if (k === "borrador" || k === "id" || k === "access_token" || k === "token")
      continue;
    if (v == null) continue;
    if (Array.isArray(v)) {
      const first = v.find((x) => String(x ?? "").trim());
      if (first != null) entries[k] = String(first).trim();
    } else {
      const t = String(v).trim();
      if (t) entries[k] = t;
    }
  }

  const focus = parseMejorarFichaFocus(entries.focus);
  const bannerRevision = String(entries.revision || "").trim() === "1";

  const shell = (children: ReactNode) => (
    <Suspense
      fallback={
        <main
          style={{
            minHeight: "50vh",
            padding: "48px 20px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <p style={{ margin: 0, fontSize: 17, fontWeight: 700, color: "#0f172a" }}>
            Cargando…
          </p>
        </main>
      }
    >
      <main style={{ maxWidth: 1100, margin: "0 auto", padding: "0" }}>
        {children}
      </main>
    </Suspense>
  );

  if (borrador) {
    return shell(
      <NegocioForm
        postulacionBorradorId={borrador}
        mode="upgrade"
        focus={focus}
        bannerRevision={bannerRevision}
      />
    );
  }

  if (idEmp) {
    return shell(
      <NegocioForm
        id={idEmp}
        mode="upgrade"
        focus={focus}
        bannerRevision={bannerRevision}
      />
    );
  }

  if (opaqueAccess.length >= 8) {
    const admin = getSupabaseAdminFromEnv();
    const resolved = await resolvePanelNegocioFromAccessToken(
      admin,
      opaqueAccess
    );
    if (resolved?.mode === "emprendedor_id") {
      return shell(
        <NegocioForm
          id={resolved.emprendedorId}
          mode="upgrade"
          focus={focus}
          bannerRevision={bannerRevision}
        />
      );
    }
    if (resolved?.mode === "postulacion_solo") {
      const bid = String(resolved.post.id ?? "").trim();
      if (bid) {
        return shell(
          <NegocioForm
            postulacionBorradorId={bid}
            mode="upgrade"
            focus={focus}
            bannerRevision={bannerRevision}
          />
        );
      }
    }
    const back = new URLSearchParams();
    back.set("access_token", opaqueAccess);
    redirect(`/panel?${back.toString()}`);
  }

  const qs = buildMejorarFichaQueryString(entries);
  redirect(`/panel${qs}`);
}
