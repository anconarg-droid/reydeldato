import PanelClient from "./PanelClient";
import PanelEnlaceVencidoClient from "./PanelEnlaceVencidoClient";
import { columnaYValorBusquedaEmprendedor } from "@/lib/emprendedorLookupParam";
import { createSupabaseServerPublicClient } from "@/lib/supabase/server";
import { getSupabaseAdminFromEnv } from "@/lib/supabaseAdmin";
import { loadEmprendedorPorTokenValido } from "@/lib/revisarMagicLink";
import { loadPostulacionEmprendedorPorAccessTokenValido } from "@/lib/panelNegocioAccessToken";
import { redirect } from "next/navigation";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{
    slug?: string;
    id?: string;
    pago?: string;
    token?: string;
    /** Mismo uso que `token`: acceso opaco guardado en `postulaciones_emprendedores` o `emprendedores`. */
    access_token?: string;
    focus?: string;
  }>;
}) {
  const params = await searchParams;
  const slug = String(params.slug || "").trim();
  const idParam = String(params.id || "").trim();
  const opaqueToken = String(params.token || params.access_token || "").trim();
  const focus = String(params.focus || "").trim();
  const pago = String(params.pago || "").trim().toLowerCase();
  let emprendedorId = idParam;
  let accessTokenForClient: string | null = null;
  const supabase = createSupabaseServerPublicClient();

  if (opaqueToken) {
    if (process.env.DEBUG_PANEL_TOKEN === "1") {
      // eslint-disable-next-line no-console
      console.log("[panel/page] resolviendo token", {
        token_len: opaqueToken.length,
        token_preview: `${opaqueToken.slice(0, 4)}…${opaqueToken.slice(-4)}`,
      });
    }
    const admin = getSupabaseAdminFromEnv();
    const empRow = await loadEmprendedorPorTokenValido(admin, opaqueToken);
    const postRow = empRow
      ? null
      : await loadPostulacionEmprendedorPorAccessTokenValido(admin, opaqueToken);

    if (!empRow && !postRow) {
      return (
        <main className="w-full max-w-2xl mx-auto px-4 sm:px-6 py-10 space-y-4">
          <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <h1 className="text-xl font-extrabold text-gray-900">
              Tu enlace venció
            </h1>
            <p className="mt-2 text-sm text-gray-600">
              Ingresá el correo con el que registraste tu emprendimiento y te enviamos
              un acceso nuevo.
            </p>
            <div className="mt-6">
              <PanelEnlaceVencidoClient />
            </div>
          </section>
        </main>
      );
    }

    accessTokenForClient = opaqueToken;
    emprendedorId = "";

    if (process.env.DEBUG_PANEL_TOKEN === "1") {
      // eslint-disable-next-line no-console
      console.log("[panel/page] token válido (emprendedor o postulación)", {
        via: empRow ? "emprendedores" : "postulaciones_emprendedores",
      });
    }
  }

  if (!emprendedorId && slug) {
    const b = columnaYValorBusquedaEmprendedor("", slug);
    if (b) {
      const { data: emp } = await supabase
        .from("vw_emprendedores_publico")
        .select("id")
        .eq(b.columna, b.valor)
        .maybeSingle();
      emprendedorId =
        emp && typeof (emp as { id?: unknown }).id === "string"
          ? (emp as { id: string }).id
          : "";
    }
  }

  const tieneOpaqueEnParams = Boolean(opaqueToken);
  if (idParam && !emprendedorId && !tieneOpaqueEnParams) {
    const qs = new URLSearchParams();
    qs.set("id", idParam);
    if (focus) qs.set("focus", focus);
    redirect(`/publicar?${qs.toString()}`);
  }

  return (
    <main className="w-full">
      <PanelClient
        id={emprendedorId}
        slug={slug}
        accessToken={accessTokenForClient}
        mejorarFichaFocus={focus || null}
        esPremium={false}
        pagoResult={
          pago === "exito" ? "exito" : pago === "fallo" ? "fallo" : null
        }
      />
    </main>
  );
}
