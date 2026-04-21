import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import CategoriaCtaSecundariosTrasResultados from "@/components/categoria/CategoriaCtaSecundariosTrasResultados";
import CategoriaIncompletaPanel from "@/components/categoria/CategoriaIncompletaPanel";
import CategoriaCambiarSelect from "@/components/categoria/CategoriaCambiarSelect";
import CategoriaEmprendedoresGridConFiltro from "@/components/categoria/CategoriaEmprendedoresGridConFiltro";
import CategoriaFiltrosBar from "@/components/categoria/CategoriaFiltrosBar";
import ComunaTerritorialBloquesConFiltro from "@/components/search/ComunaTerritorialBloquesConFiltro";
import { categoriaMuestraPanelActivacionConfianza } from "@/lib/categoriaLandingConstants";
import { categoriaMuestraPanelIncompleta } from "@/lib/calcularCompletitudCategoriaComuna";
import { loadCategoriaCompletitudComuna } from "@/lib/loadCategoriaCompletitudComuna";
import { loadComunaAperturaPublicaPorSlug } from "@/lib/loadComunaAperturaPublica";
import { loadCategoriaSubcategoriasConConteo } from "@/lib/loadCategoriaSubcategoriaCounts";
import {
  busquedaComunaPageStackClassName,
  busquedaComunaResultsShellClassName,
} from "@/lib/busquedaComunaLayoutStyles";
import {
  loadCategoriaLandingEmprendedores,
  textoRangoCategoriaLanding,
} from "@/lib/loadCategoriaLandingEmprendedores";
import { loadCategoriaSlugsConEmprendedoresPublicados } from "@/lib/loadCategoriasConPublicados";
import {
  CATEGORIAS_CATALOGO as CATEGORIAS,
  prettyLabelSubcategoria,
} from "@/lib/categoriasCatalogo";
import { createSupabaseServerPublicClient } from "@/lib/supabase/server";

/** `searchParams` + listado por comuna: evita HTML cacheado sin query y grilla RM mezclada. */
export const dynamic = "force-dynamic";

/** Siempre canónico; nunca pasar por /resultados?comuna=… u otra ruta indirecta. */
const CATEGORIAS_INDEX_HREF = "/categorias";

function categoriaQueryHref(
  slug: string,
  q: { comuna?: string; subcategoria?: string; page?: number }
) {
  const sp = new URLSearchParams();
  if (q.comuna) sp.set("comuna", q.comuna);
  if (q.subcategoria) sp.set("subcategoria", q.subcategoria);
  if (q.page != null && q.page > 1) sp.set("page", String(q.page));
  const qs = sp.toString();
  return `/categoria/${encodeURIComponent(slug)}${qs ? `?${qs}` : ""}`;
}

type PageProps = {
  params: Promise<{
    slug: string;
  }>;
  searchParams?: Promise<{ comuna?: string; subcategoria?: string; page?: string }>;
};

export default async function CategoriaPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const sp = searchParams ? await searchParams : {};
  const comunaParam = typeof sp.comuna === "string" ? sp.comuna : undefined;
  const subcategoriaParamRaw =
    typeof sp.subcategoria === "string" ? sp.subcategoria.toLowerCase() : undefined;
  const rawPage = typeof sp.page === "string" ? Number.parseInt(sp.page, 10) : 1;
  const page = Number.isFinite(rawPage) && rawPage >= 1 ? rawPage : 1;

  const categoria = CATEGORIAS.find((c) => c.slug === slug);

  if (!categoria) {
    notFound();
  }

  const slugsCategoriasConPublicados =
    await loadCategoriaSlugsConEmprendedoresPublicados();

  const supabase = createSupabaseServerPublicClient();

  const subcategoriaParam =
    subcategoriaParamRaw &&
    categoria.subcategorias.some((s) => s.toLowerCase() === subcategoriaParamRaw)
      ? subcategoriaParamRaw
      : undefined;

  const subconteos = await loadCategoriaSubcategoriasConConteo(
    categoria.slug,
    categoria.subcategorias,
    comunaParam
  );

  const subopcionesFiltro = subconteos.map((o) => ({
    slug: o.slug,
    count: o.count,
    label: prettyLabelSubcategoria(o.slug),
  }));

  const loadResult = await loadCategoriaLandingEmprendedores(categoria.slug, {
    comunaSlug: comunaParam,
    subcategoriaSlug: subcategoriaParam,
    page,
    categoriaNombreDisplay: categoria.nombre,
    allowedSubSlugs: categoria.subcategorias,
  });

  if (loadResult.page !== page) {
    redirect(
      categoriaQueryHref(categoria.slug, {
        comuna: comunaParam,
        subcategoria: subcategoriaParam,
        page: loadResult.page,
      })
    );
  }

  const {
    items,
    total,
    pageSize,
    zonaLabel,
    comunaSlugResolved,
    comunaNombreResolved,
    comunaGrupos,
  } = loadResult;

  const listadoPorGruposComuna = comunaGrupos != null;
  const nombreComunaDisplay =
    (comunaNombreResolved || zonaLabel || "").trim() || "esta comuna";

  const comunaParamTrim = `${comunaParam ?? ""}`.trim();
  const esVistaPorComunaParam = comunaParamTrim.length > 0;

  let comunaExisteEnDb = false;
  /** Misma regla que `/[comuna]` + `ResultadosClient`: sin directorio operativo → cards sin contacto. */
  let usarCardSimpleCategoriaPorComuna = false;
  if (esVistaPorComunaParam) {
    const slugDir = comunaParamTrim.toLowerCase();
    const { data: comunaRow } = await supabase
      .from("comunas")
      .select("id")
      .eq("slug", slugDir)
      .maybeSingle();
    const comunaId = (comunaRow as { id?: unknown } | null)?.id;
    comunaExisteEnDb = comunaId != null;
    if (comunaExisteEnDb) {
      const [{ data: configRow }, aperturaUi] = await Promise.all([
        supabase.from("comunas_config").select("activa").eq("comuna_id", comunaId).maybeSingle(),
        loadComunaAperturaPublicaPorSlug(slugDir),
      ]);
      const configInactiva = configRow?.activa === false;
      const directorioOperativo =
        !configInactiva && (aperturaUi?.comuna_publica_abierta === true);
      usarCardSimpleCategoriaPorComuna = !directorioOperativo;
    }
  }

  const slugComunaFocal = `${comunaSlugResolved || comunaParam || ""}`.trim().toLowerCase();
  const qComuna = comunaSlugResolved || comunaParam;
  const qSub = subcategoriaParam;
  const slugAbrirComuna = `${qComuna ?? ""}`.trim();

  const servicioHintParaEnlaces =
    subcategoriaParam && prettyLabelSubcategoria(subcategoriaParam)
      ? `${categoria.nombre}: ${prettyLabelSubcategoria(subcategoriaParam)}`
      : categoria.nombre;

  const paramsActivacionPublicar = new URLSearchParams();
  if (slugAbrirComuna) paramsActivacionPublicar.set("comuna", slugAbrirComuna);
  paramsActivacionPublicar.set("servicio", servicioHintParaEnlaces);
  const hrefActivacionPublicar = `/publicar?${paramsActivacionPublicar.toString()}`;

  const paramsActivacionRecomendar = new URLSearchParams();
  if (slugAbrirComuna) paramsActivacionRecomendar.set("comuna", slugAbrirComuna);
  if (nombreComunaDisplay && nombreComunaDisplay !== "esta comuna") {
    paramsActivacionRecomendar.set("comuna_nombre", nombreComunaDisplay);
  }
  paramsActivacionRecomendar.set("servicio", servicioHintParaEnlaces);
  const hrefActivacionRecomendar = `/recomendar?${paramsActivacionRecomendar.toString()}`;

  const hrefActivacionAvance = slugAbrirComuna
    ? `/abrir-comuna/${encodeURIComponent(slugAbrirComuna)}`
    : null;

  const aperturaComunaUi =
    slugComunaFocal && !esVistaPorComunaParam
      ? await loadComunaAperturaPublicaPorSlug(slugComunaFocal)
      : null;

  const slugParaCompletitud =
    esVistaPorComunaParam && comunaExisteEnDb
      ? `${comunaSlugResolved || comunaParamTrim}`.trim().toLowerCase()
      : slugComunaFocal &&
          !esVistaPorComunaParam &&
          aperturaComunaUi?.comuna_publica_abierta === true
        ? slugComunaFocal
        : "";

  const completitudCategoria = slugParaCompletitud
    ? await loadCategoriaCompletitudComuna(slugParaCompletitud, categoria.subcategorias)
    : null;

  const hayResultadosComuna =
    comunaGrupos != null &&
    comunaGrupos.enTuComuna.length + comunaGrupos.atiendenTuComuna.length > 0;

  /** Con `?comuna=`: misma UX en todas las comunas (no depender de directorio “abierto”). */
  const mostrarBloqueCortoComuna =
    esVistaPorComunaParam &&
    comunaExisteEnDb &&
    ((completitudCategoria?.ok === true &&
      categoriaMuestraPanelIncompleta(completitudCategoria)) ||
      !hayResultadosComuna);

  const cintaCategoriaIncompletaComunaAbierta =
    !esVistaPorComunaParam &&
    Boolean(hrefActivacionAvance) &&
    aperturaComunaUi?.comuna_publica_abierta === true &&
    completitudCategoria != null &&
    completitudCategoria.ok &&
    categoriaMuestraPanelIncompleta(completitudCategoria);

  const mostrarCompletandoZona = categoriaMuestraPanelActivacionConfianza(total, {
    slugComunaFocal,
    comuna_publica_abierta: aperturaComunaUi?.comuna_publica_abierta ?? false,
    estado_apertura: aperturaComunaUi?.estado_apertura ?? null,
  });

  /** Vista por comuna: bloque corto unificado; RM sin `?comuna=`: reglas previas. */
  const mostrarCintaSimpleCategoria = esVistaPorComunaParam
    ? mostrarBloqueCortoComuna
    : cintaCategoriaIncompletaComunaAbierta || mostrarCompletandoZona;

  const textoContexto = listadoPorGruposComuna
    ? total <= 0
      ? subcategoriaParam
        ? `No hay resultados en esta subcategoría para ${nombreComunaDisplay}.`
        : `No hay servicios listados en ${nombreComunaDisplay} para esta categoría.`
      : null
    : textoRangoCategoriaLanding(page, pageSize, total, zonaLabel);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const opcionesCambiarCategoria = CATEGORIAS.filter(
    (c) =>
      slugsCategoriasConPublicados.has(c.slug.toLowerCase()) ||
      c.slug === categoria.slug
  ).map((c) => ({
    slug: c.slug,
    nombre: c.nombre,
    emoji: c.emoji,
  }));

  /** Con `?comuna=` el loader siempre incluye `comunaGrupos` (vacío si la API no devuelve filas). */
  const vistaListadoPorComuna = listadoPorGruposComuna;

  const slugDirectorioComuna = `${comunaSlugResolved || comunaParamTrim}`.trim().toLowerCase();
  const hrefTodosEmprendimientosComuna =
    comunaExisteEnDb && slugDirectorioComuna
      ? `/${encodeURIComponent(slugDirectorioComuna)}`
      : null;

  const hayBloqueInformativoAntesResultados = mostrarCintaSimpleCategoria;

  return (
    <main
      className={
        vistaListadoPorComuna
          ? "min-h-screen bg-white text-slate-900"
          : "min-h-screen bg-slate-50 text-slate-900"
      }
    >
      {vistaListadoPorComuna ? (
        <div className={`${busquedaComunaResultsShellClassName} py-6 pb-12`}>
          <div className={busquedaComunaPageStackClassName}>
            <div className="flex flex-wrap gap-3 text-sm">
              <Link href="/" className="font-medium text-sky-700 hover:text-sky-800">
                Inicio
              </Link>
              <span className="text-slate-400">/</span>
              <Link
                href={CATEGORIAS_INDEX_HREF}
                className="font-medium text-sky-700 hover:text-sky-800"
              >
                Categorías
              </Link>
              <span className="text-slate-400">/</span>
              <span className="font-semibold text-slate-900">{categoria.nombre}</span>
            </div>

            <header className="mb-0 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="text-4xl">{categoria.emoji}</div>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <h1 className="min-w-0 flex-1 text-3xl font-black tracking-tight sm:text-4xl">
                  {categoria.nombre}
                </h1>
                <CategoriaCambiarSelect
                  opciones={opcionesCambiarCategoria}
                  categoriaSlugActual={categoria.slug}
                />
              </div>
              <p className="mt-3 max-w-3xl text-slate-600">{categoria.descripcion}</p>

              <CategoriaFiltrosBar
                categoriaSlug={categoria.slug}
                subopciones={subopcionesFiltro}
                initialSubcategoria={subcategoriaParam ?? ""}
                initialComunaSlug={qComuna ?? ""}
                fixedComunaNombre={comunaNombreResolved || null}
              />
            </header>

            <div className="mt-6 space-y-6">
              {mostrarBloqueCortoComuna ? (
                <CategoriaIncompletaPanel
                  comunaLinea={nombreComunaDisplay}
                  hrefAvance={hrefActivacionAvance}
                />
              ) : null}

              <div
                className={
                  hayBloqueInformativoAntesResultados
                    ? "border-t border-slate-200/80 pt-6"
                    : "pt-1"
                }
              >
                {!comunaExisteEnDb && esVistaPorComunaParam ? (
                  <div className="rounded-lg border border-amber-100 bg-amber-50/80 px-4 py-3">
                    <p className="text-sm font-semibold text-slate-900">Comuna no encontrada</p>
                    <p className="mt-1 text-sm text-slate-600">
                      No reconocemos esta comuna en la URL. Revisa el nombre o elige otra comuna en
                      el buscador.
                    </p>
                  </div>
                ) : comunaGrupos.enTuComuna.length + comunaGrupos.atiendenTuComuna.length === 0 ? (
                  mostrarBloqueCortoComuna ? (
                    <div className="space-y-3 text-sm text-slate-600">
                      <p>Aún no hay servicios en esta categoría para esta comuna.</p>
                      <p>
                        Pero la comuna ya tiene emprendimientos registrados que están ayudando a
                        activarla.
                      </p>
                      {hrefTodosEmprendimientosComuna ? (
                        <p className="pt-0.5">
                          <Link
                            href={hrefTodosEmprendimientosComuna}
                            className="inline-flex font-semibold text-sky-700 hover:text-sky-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500 rounded"
                          >
                            Ver todos los emprendimientos disponibles
                          </Link>
                        </p>
                      ) : null}
                      <p className="pt-1 text-slate-700">
                        Sé de los primeros en aparecer en esta categoría en tu comuna.
                      </p>
                    </div>
                  ) : (
                    <p className="text-sm text-slate-600">
                      {subcategoriaParam
                        ? `No hay resultados en esta subcategoría para ${nombreComunaDisplay}.`
                        : "No hay resultados con los filtros seleccionados."}
                    </p>
                  )
                ) : (
                  <ComunaTerritorialBloquesConFiltro
                    enTuComuna={comunaGrupos.enTuComuna}
                    atiendenTuComuna={comunaGrupos.atiendenTuComuna}
                    comunaSlug={comunaSlugResolved}
                    comunaNombre={comunaNombreResolved}
                    nombreComunaDisplay={nombreComunaDisplay}
                    usarCardSimple={usarCardSimpleCategoriaPorComuna}
                  />
                )}
              </div>

              {mostrarBloqueCortoComuna ? (
                <CategoriaCtaSecundariosTrasResultados
                  hrefPublicar={hrefActivacionPublicar}
                  hrefRecomendar={hrefActivacionRecomendar}
                />
              ) : null}
            </div>
          </div>
        </div>
      ) : (
        <div className="mx-auto max-w-7xl px-4 pb-10 pt-10">
          <div className="mb-8 flex flex-wrap gap-3 text-sm">
            <Link href="/" className="font-medium text-sky-700 hover:text-sky-800">
              Inicio
            </Link>
            <span className="text-slate-400">/</span>
            <Link
              href={CATEGORIAS_INDEX_HREF}
              className="font-medium text-sky-700 hover:text-sky-800"
            >
              Categorías
            </Link>
            <span className="text-slate-400">/</span>
            <span className="font-semibold text-slate-900">{categoria.nombre}</span>
          </div>

          <header className="mb-0 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="text-4xl">{categoria.emoji}</div>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <h1 className="min-w-0 flex-1 text-3xl font-black tracking-tight sm:text-4xl">
                {categoria.nombre}
              </h1>
              <CategoriaCambiarSelect
                opciones={opcionesCambiarCategoria}
                categoriaSlugActual={categoria.slug}
              />
            </div>
            <p className="mt-3 max-w-3xl text-slate-600">{categoria.descripcion}</p>

            <CategoriaFiltrosBar
              categoriaSlug={categoria.slug}
              subopciones={subopcionesFiltro}
              initialSubcategoria={subcategoriaParam ?? ""}
              initialComunaSlug={qComuna ?? ""}
              fixedComunaNombre={comunaNombreResolved || null}
            />
          </header>

          <div className="mt-6 space-y-6">
            {mostrarCintaSimpleCategoria ? (
              <CategoriaIncompletaPanel
                comunaLinea={nombreComunaDisplay}
                hrefAvance={hrefActivacionAvance}
              />
            ) : null}

            <section
              className={
                hayBloqueInformativoAntesResultados
                  ? "rounded-2xl border border-slate-200 bg-white px-5 pb-5 pt-6 shadow-sm sm:px-6 sm:pb-6 sm:pt-7"
                  : "rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
              }
            >
              {textoContexto ? (
                <p className="text-base font-semibold text-slate-800">{textoContexto}</p>
              ) : null}

              {!listadoPorGruposComuna ? (
                <div className={textoContexto ? "mt-5" : ""}>
                  <CategoriaEmprendedoresGridConFiltro
                    items={items}
                    comunaSlug={comunaSlugResolved ?? ""}
                    comunaNombre={comunaNombreResolved ?? ""}
                  />
                </div>
              ) : null}

              {totalPages > 1 && !listadoPorGruposComuna ? (
                <nav
                  className="mt-8 flex flex-wrap items-center justify-center gap-2 border-t border-slate-100 pt-6"
                  aria-label="Paginación"
                >
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((num) => {
                    const active = num === page;
                    return (
                      <Link
                        key={num}
                        href={categoriaQueryHref(categoria.slug, {
                          comuna: qComuna,
                          subcategoria: qSub,
                          page: num,
                        })}
                        className={
                          active
                            ? "inline-flex min-w-[2.5rem] items-center justify-center rounded-lg bg-sky-600 px-3 py-2 text-sm font-bold text-white"
                            : "inline-flex min-w-[2.5rem] items-center justify-center rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-800 hover:border-slate-300 hover:bg-slate-100"
                        }
                      >
                        {num}
                      </Link>
                    );
                  })}
                </nav>
              ) : null}
            </section>

            {mostrarCintaSimpleCategoria ? (
              <CategoriaCtaSecundariosTrasResultados
                hrefPublicar={hrefActivacionPublicar}
                hrefRecomendar={hrefActivacionRecomendar}
              />
            ) : null}
          </div>
        </div>
      )}
    </main>
  );
}
