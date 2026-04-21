"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  validateOptionalPublicEmail,
  validateRequiredPublicEmail,
} from "@/lib/validateEmail";
import {
  PUBLICAR_BORRADOR_PATH,
  publicarBorradorByIdPath,
} from "@/lib/publicarApi";
import { getRegionShort } from "@/utils/regionShort";
import { normalizeAndValidateChileWhatsappStrict } from "@/utils/phone";
import {
  DESCRIPCION_CORTA_MAX,
  DESCRIPCION_CORTA_MIN,
  normalizeDescripcionCorta,
  normalizeDescripcionLarga,
  primeraValidacionDescripcion,
  validateDescripcionCortaPublicacion,
  validateDescripcionLarga,
} from "@/lib/descripcionProductoForm";
import { modalidadesAtencionInputsToDbUnique } from "@/lib/modalidadesAtencion";
import {
  normalizeKeywordsUsuarioFromDbValue,
  readKeywordsUsuarioPreferJson,
  parseKeywordsUsuarioInputToTextArray,
} from "@/lib/keywordsUsuarioPostulacion";
import PasoInformacionBasica from "./PasoInformacionBasica";
import { INITIAL_FORM as PUBLICAR_INITIAL_FORM, type FormData } from "./PublicarClient";
import {
  basicsFormFromPanelNegocioItem,
  panelNegocioPutBodyBasics,
  type BasicsFormFromPanel,
} from "@/lib/publicarEdicionBasicaPanel";

type Comuna = {
  id: string;
  nombre: string;
  slug: string;
  region_id?: string | null;
  region_nombre?: string | null;
  display_name?: string | null;
};

type Region = {
  id: string;
  nombre: string;
  slug: string;
};

type Props = {
  comunas: Comuna[];
  regiones: Region[];
  /** `id` en la URL o desde el servidor; se valida o se reemplaza por un borrador nuevo. */
  initialPostulacionId?: string | null;
  /** Si true, no hace `router.replace` a `/publicar?id=` (formulario embebido en la home). */
  embedOnHome?: boolean;
  /** Edición de datos básicos de ficha publicada (GET/PUT `/api/panel/negocio`). */
  initialEdicionBasicaEmprendedorId?: string | null;
  initialEdicionBasicaAccessToken?: string | null;
};

type BootstrapPhase = "loading" | "ready" | "error";

function numberArraysEqual(a: number[], b: number[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((x, i) => x === b[i]);
}

type SimpleForm = {
  nombre: string;
  email: string;
  whatsapp: string;
  descripcionNegocio: string;
  descripcionLarga: string;
  keywordsUsuario: string;
  comunaBase: string;
  coberturaTipo: string;
  comunasCobertura: string[];
  regionesCobertura: string[];
  modalidades: string[];
  aceptaTerminosPrivacidad: boolean;
};

const INITIAL_FORM: SimpleForm = {
  nombre: "",
  email: "",
  whatsapp: "",
  descripcionNegocio: "",
  descripcionLarga: "",
  keywordsUsuario: "",
  comunaBase: "",
  coberturaTipo: "",
  comunasCobertura: [],
  regionesCobertura: [],
  modalidades: [],
  aceptaTerminosPrivacidad: false,
};

function stringArraysEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((x, i) => x === b[i]);
}

function cloneSimpleForm(f: SimpleForm): SimpleForm {
  return {
    ...f,
    comunasCobertura: [...f.comunasCobertura],
    regionesCobertura: [...f.regionesCobertura],
    modalidades: [...f.modalidades],
  };
}

function keywordsUsuarioFromSnapshot(sn: Record<string, unknown>): string {
  const fromRow = readKeywordsUsuarioPreferJson(sn);
  if (fromRow.length) return fromRow.join(", ");
  const v = sn.palabras_clave;
  if (Array.isArray(v)) return normalizeKeywordsUsuarioFromDbValue(v).join(", ");
  if (typeof v === "string") return v.trim();
  return "";
}

function simpleFormEqual(a: SimpleForm, b: SimpleForm): boolean {
  return (
    a.nombre === b.nombre &&
    a.email === b.email &&
    a.whatsapp === b.whatsapp &&
    a.descripcionNegocio === b.descripcionNegocio &&
    a.descripcionLarga === b.descripcionLarga &&
    a.keywordsUsuario === b.keywordsUsuario &&
    a.comunaBase === b.comunaBase &&
    a.coberturaTipo === b.coberturaTipo &&
    stringArraysEqual(a.comunasCobertura, b.comunasCobertura) &&
    stringArraysEqual(a.regionesCobertura, b.regionesCobertura) &&
    stringArraysEqual(a.modalidades, b.modalidades) &&
    a.aceptaTerminosPrivacidad === b.aceptaTerminosPrivacidad
  );
}

function normalizeSearchText(value: string) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function buildComunaIdMap(comunas: Comuna[]) {
  const bySlug = new Map<string, number>();
  for (const comuna of comunas) {
    const idNum = Number(comuna.id);
    if (comuna.slug && Number.isInteger(idNum)) {
      bySlug.set(comuna.slug, idNum);
    }
  }
  return bySlug;
}

function s(v: unknown): string {
  if (v == null) return "";
  return String(v).trim();
}

const BASICS_PANEL_DEBUG =
  typeof process !== "undefined" &&
  process.env.NEXT_PUBLIC_PUBLICAR_BASICS_DEBUG === "1";

const COBERTURA_LOOP_DEBUG =
  typeof process !== "undefined" &&
  process.env.NEXT_PUBLIC_PUBLICAR_COBERTURA_LOOP_DEBUG === "1";

/** Logs cobertura/comunas (toggle, normalize, autosave): `NEXT_PUBLIC_PUBLICAR_COBERTURA_LOOP_DEBUG=1`. */
function logCoberturaBasics(phase: string, payload: Record<string, unknown>) {
  if (!COBERTURA_LOOP_DEBUG) return;
  // eslint-disable-next-line no-console
  console.log("[publicar-ed-basica-cobertura]", phase, payload);
}

/** Logs temporales: `NEXT_PUBLIC_PUBLICAR_BASICS_DEBUG=1` en `.env.local`. */
function logBasicsPanelDebug(
  phase: string,
  item: Record<string, unknown> | null,
  mapped?: SimpleForm
) {
  if (!BASICS_PANEL_DEBUG) return;
  // eslint-disable-next-line no-console
  console.log("[basics-panel]", phase, {
    raw: item
      ? {
          comunaBaseSlug: item.comunaBaseSlug,
          coberturaTipo: item.coberturaTipo,
          comunasCoberturaSlugs: item.comunasCoberturaSlugs,
          regionesCoberturaSlugs: item.regionesCoberturaSlugs,
          keywords_usuario_json: item.keywords_usuario_json,
          keywords_usuario: item.keywords_usuario,
          palabras_clave: item.palabras_clave,
        }
      : null,
    mapped: mapped
      ? {
          keywordsUsuario: mapped.keywordsUsuario,
          comunaBase: mapped.comunaBase,
          coberturaTipo: mapped.coberturaTipo,
          comunasCobertura: mapped.comunasCobertura,
          regionesCobertura: mapped.regionesCobertura,
        }
      : null,
  });
}

function asStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.map((x) => s(x)).filter(Boolean);
}

type DraftSnapshot = {
  id: string;
  estado: string;
  nombre_emprendimiento?: string | null;
  email?: string | null;
  whatsapp_principal?: string | null;
  frase_negocio?: string | null;
  comuna_base_id?: string | number | null;
  comuna_base_slug?: string | null;
  cobertura_tipo?: string | null;
  comunas_cobertura?: unknown;
  regiones_cobertura?: unknown;
  modalidades_atencion?: unknown;
  categoria_id?: string | null;
  subcategorias_ids?: unknown;
  foto_principal_url?: string | null;
  instagram?: string | null;
  sitio_web?: string | null;
  descripcion_libre?: string | null;
  galeria_urls?: string[] | null;
  direccion?: string | null;
  direccion_referencia?: string | null;
  keywords_usuario?: unknown;
  palabras_clave?: unknown;
};

type FetchDraftOutcome =
  | { kind: "ok"; snapshot: DraftSnapshot }
  | { kind: "not_found" }
  | { kind: "fail"; message: string };

/** Lee borrador existente para hidratar formulario y detectar fase (borrador vs revisión). */
async function fetchDraftById(id: string): Promise<FetchDraftOutcome> {
  try {
    const res = await fetch(publicarBorradorByIdPath(id), { method: "GET" });
    let data: Record<string, unknown> = {};
    try {
      data = (await res.json()) as Record<string, unknown>;
    } catch {
      data = {};
    }
    if (res.status === 404) return { kind: "not_found" };
    if (!res.ok || data?.ok !== true) {
      const message =
        s(data.message) ||
        s(data.error) ||
        (res.status === 503
          ? "Servicio temporalmente no disponible. Revisá la configuración del servidor."
          : "No se pudo cargar el borrador.");
      return { kind: "fail", message };
    }
    return { kind: "ok", snapshot: data as unknown as DraftSnapshot };
  } catch (e) {
    if (e instanceof Error && isLikelyNetworkFailure(e)) {
      return {
        kind: "fail",
        message:
          "No pudimos cargar el borrador. Revisá tu conexión e intentá de nuevo.",
      };
    }
    return {
      kind: "fail",
      message: "No se pudo cargar el borrador. Intentá de nuevo más tarde.",
    };
  }
}

function isLikelyNetworkFailure(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  const m = err.message.toLowerCase();
  return (
    m.includes("failed to fetch") ||
    m.includes("networkerror") ||
    m.includes("load failed") ||
    m.includes("network request failed")
  );
}

async function createPostulacionBorradorVacio(): Promise<string> {
  try {
    const res = await fetch(PUBLICAR_BORRADOR_PATH, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    let data: Record<string, unknown> = {};
    try {
      data = (await res.json()) as Record<string, unknown>;
    } catch {
      data = {};
    }
    if (!res.ok || !data?.ok || data?.id == null) {
      let msg =
        s(data.error) ||
        s(data.message) ||
        "No se pudo crear el borrador. Intenta de nuevo más tarde.";
      if (
        process.env.NODE_ENV === "development" &&
        data.db_error != null &&
        String(data.db_error).trim() !== ""
      ) {
        msg = `${msg} (${String(data.db_error)})`;
      }
      throw new Error(msg);
    }
    return String(data.id);
  } catch (e) {
    if (e instanceof Error && isLikelyNetworkFailure(e)) {
      throw new Error(
        "No pudimos crear el borrador. Revisá tu conexión e intentá de nuevo."
      );
    }
    throw e instanceof Error
      ? e
      : new Error("No se pudo crear el borrador. Intenta de nuevo más tarde.");
  }
}

export default function PublicarSimpleClient({
  comunas,
  regiones,
  initialPostulacionId = null,
  embedOnHome = false,
  initialEdicionBasicaEmprendedorId = null,
  initialEdicionBasicaAccessToken = null,
}: Props) {
  const mainShellStyle: CSSProperties = embedOnHome
    ? { minHeight: "auto", background: "transparent" }
    : { minHeight: "100vh", background: "#f8fafc" };

  const contentSectionStyle: CSSProperties = embedOnHome
    ? { maxWidth: 1180, margin: "0 auto", padding: "12px 8px 24px" }
    : { maxWidth: 1180, margin: "0 auto", padding: "28px 20px 56px" };

  const narrowErrorStyle: CSSProperties = embedOnHome
    ? { maxWidth: 640, margin: "0 auto", padding: "16px 12px 24px" }
    : { maxWidth: 640, margin: "0 auto", padding: "28px 20px 56px" };

  const router = useRouter();
  const searchParams = useSearchParams();
  const comunaIdMapRef = useRef(buildComunaIdMap(comunas));
  const [form, setForm] = useState<SimpleForm>(INITIAL_FORM);
  /** Snapshot del formulario tras init o último autosave OK; autosave solo si el usuario se desvió de esto. */
  const [autosaveBaseline, setAutosaveBaseline] = useState<SimpleForm>(() =>
    cloneSimpleForm(INITIAL_FORM)
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState("");
  const [saving, setSaving] = useState(false);
  const [draftId, setDraftId] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [bootstrapPhase, setBootstrapPhase] = useState<BootstrapPhase>("loading");
  const [bootstrapError, setBootstrapError] = useState("");
  /** Fuerza re-ejecución del bootstrap si el autosave recibe 404 (borrador borrado / id inválido). */
  const [bootstrapRetryNonce, setBootstrapRetryNonce] = useState(0);
  /**
   * Tras crear borrador, `router.replace` puede ir un render detrás de `useSearchParams`.
   * Mientras tanto priorizamos este id para no volver a PATCH-e el uuid viejo (404 → POST en bucle).
   */
  const [pendingCandidateId, setPendingCandidateId] = useState<string | null>(null);
  const [empBasicsNavId, setEmpBasicsNavId] = useState<string | null>(null);

  const [comunaBaseQuery, setComunaBaseQuery] = useState("");
  const [comunaBaseOpen, setComunaBaseOpen] = useState(false);
  const comunaBaseBlurRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cobertura (varias comunas): buscador + autocomplete para agregar comunas manualmente.
  const [coberturaComunaQuery, setCoberturaComunaQuery] = useState("");
  const [coberturaComunaOpen, setCoberturaComunaOpen] = useState(false);
  const coberturaComunaBlurRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cobertura (varias regiones): control simple para agregar una región extra.
  const [regionAddSlug, setRegionAddSlug] = useState("");

  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const draftIdRef = useRef<string | null>(null);
  /** Evita repetir PATCH/POST cuando `draftIdCandidate` no cambió de verdad (p. ej. re-renders). */
  const bootstrappedKeyRef = useRef<string | null>(null);
  /** Como máximo un ciclo automático de “404 → nuevo borrador” por sesión de bootstrap estable. */
  const draftAutoRecover404Ref = useRef(0);
  /** Log “autosave skipped on first render” una vez por corrida de bootstrap hasta `ready`. */
  const hasLoggedAutosaveSkipRef = useRef(false);
  /** Edición básica de emprendedor ya publicado: no usar flujo de borrador. */
  const empBasicsModeRef = useRef(false);
  const empBasicsItemRef = useRef<Record<string, unknown>>({});
  const empBasicsIdRef = useRef<string | null>(null);

  /** `pendingCandidateId` gana sobre el resto. */
  const idEnUrl = s(searchParams.get("id"));
  const effectiveUrlId = idEnUrl;
  const fromServer = s(initialPostulacionId);
  const draftIdCandidate =
    pendingCandidateId || effectiveUrlId || fromServer;

  const panelBasicsBootstrapKey = useMemo(() => {
    const ei = s(initialEdicionBasicaEmprendedorId);
    if (ei) return `panel-basics:${ei}`;
    const t = s(initialEdicionBasicaAccessToken);
    if (t.length >= 8) return `panel-basics:at:${t}`;
    return "";
  }, [initialEdicionBasicaEmprendedorId, initialEdicionBasicaAccessToken]);

  const comunaSlugById = useMemo(() => {
    const m = new Map<string, string>();
    for (const c of comunas) {
      const id = s(c.id);
      const slug = s(c.slug);
      if (id && slug) m.set(id, slug);
    }
    return m;
  }, [comunas]);

  const isFormDirty = useMemo(
    () => !simpleFormEqual(form, autosaveBaseline),
    [form, autosaveBaseline]
  );

  const mejorarFichaVolverHref = useMemo(() => {
    const qs = new URLSearchParams();
    const idNav = empBasicsNavId || s(searchParams.get("id"));
    if (idNav) qs.set("id", idNav);
    const at =
      s(searchParams.get("access_token")) || s(searchParams.get("token"));
    if (at) qs.set("access_token", at);
    const rt = s(searchParams.get("refresh_token"));
    if (rt) qs.set("refresh_token", rt);
    const com = s(searchParams.get("comuna"));
    if (com) qs.set("comuna", com);
    const srv = s(searchParams.get("servicio"));
    if (srv) qs.set("servicio", srv);
    const origen = s(searchParams.get("origen"));
    if (origen) qs.set("origen", origen);
    const qsStr = qs.toString();
    return qsStr ? `/mejorar-ficha?${qsStr}` : "/mejorar-ficha";
  }, [empBasicsNavId, searchParams]);

  useEffect(() => {
    draftIdRef.current = draftId;
  }, [draftId]);

  useEffect(() => {
    if (pendingCandidateId && idEnUrl === pendingCandidateId) {
      setPendingCandidateId(null);
    }
  }, [idEnUrl, pendingCandidateId]);

  useEffect(() => {
    if (form.coberturaTipo !== "varias_comunas") return;
    if (!form.comunaBase) return;
    const normalized = normalizeComunasCoberturaForBase(
      form.comunaBase,
      form.comunasCobertura
    );
    const willWrite = !stringArraysEqual(normalized, form.comunasCobertura);
    logCoberturaBasics("normalize-comunas-effect", {
      coberturaTipo: form.coberturaTipo,
      comunaBase: form.comunaBase,
      comunasBefore: [...form.comunasCobertura],
      comunasNormalized: [...normalized],
      comunasCatalogLen: comunas.length,
      willWrite,
    });
    if (!willWrite) return;
    setField("comunasCobertura", normalized);
  }, [form.coberturaTipo, form.comunaBase, form.comunasCobertura, comunas]);

  useEffect(() => {
    let cancelled = false;

    const candidate = draftIdCandidate;
    const key = panelBasicsBootstrapKey || candidate || "__empty__";

    if (bootstrappedKeyRef.current === key && key !== "__empty__") {
      if (empBasicsModeRef.current) {
        draftAutoRecover404Ref.current = 0;
        setBootstrapPhase("ready");
        return;
      }
      if (draftIdRef.current !== candidate && candidate) {
        draftIdRef.current = candidate;
        setDraftId(candidate);
      } else if (!candidate) {
        draftIdRef.current = null;
        setDraftId(null);
      }
      draftAutoRecover404Ref.current = 0;
      setBootstrapPhase("ready");
      return;
    }

    async function bootstrap() {
      hasLoggedAutosaveSkipRef.current = false;
      setBootstrapPhase("loading");
      setBootstrapError("");

      try {
        const empIdProp = s(initialEdicionBasicaEmprendedorId);
        const empTokProp = s(initialEdicionBasicaAccessToken);
        if (empIdProp || empTokProp.length >= 8) {
          empBasicsModeRef.current = true;
          const url = empIdProp
            ? `/api/panel/negocio?id=${encodeURIComponent(empIdProp)}`
            : `/api/panel/negocio?access_token=${encodeURIComponent(empTokProp)}`;
          const res = await fetch(url, { cache: "no-store" });
          let json: Record<string, unknown> = {};
          try {
            json = (await res.json()) as Record<string, unknown>;
          } catch {
            json = {};
          }
          if (cancelled) return;
          if (!res.ok || json?.ok !== true || !json?.item) {
            empBasicsModeRef.current = false;
            empBasicsIdRef.current = null;
            empBasicsItemRef.current = {};
            bootstrappedKeyRef.current = null;
            setBootstrapError(
              s(json.message) ||
                s(json.error) ||
                "No se pudo cargar tu ficha para editar los datos básicos."
            );
            setBootstrapPhase("error");
            return;
          }
          const item = json.item as Record<string, unknown>;
          empBasicsItemRef.current = item;
          const resolvedEmpId = s(item.id);
          empBasicsIdRef.current = resolvedEmpId || null;
          if (resolvedEmpId) setEmpBasicsNavId(resolvedEmpId);
          const loadedForm = basicsFormFromPanelNegocioItem(item) as SimpleForm;
          logBasicsPanelDebug("bootstrap-get", item, loadedForm);
          bootstrappedKeyRef.current = panelBasicsBootstrapKey;
          draftIdRef.current = null;
          setDraftId(null);
          draftAutoRecover404Ref.current = 0;
          setForm(loadedForm);
          setAutosaveBaseline(cloneSimpleForm(loadedForm));
          setServerError("");
          setBootstrapPhase("ready");
          return;
        }

        empBasicsModeRef.current = false;
        empBasicsIdRef.current = null;
        empBasicsItemRef.current = {};

        if (candidate) {
          const outcome = await fetchDraftById(candidate);
          if (cancelled) return;
          if (outcome.kind === "fail") {
            bootstrappedKeyRef.current = null;
            draftIdRef.current = null;
            setDraftId(null);
            setPendingCandidateId(null);
            setBootstrapError(outcome.message);
            setBootstrapPhase("error");
            return;
          }
          if (outcome.kind === "ok") {
            const snapshot = outcome.snapshot;
            const comunaBaseSlug =
              s(snapshot.comuna_base_slug) ||
              comunaSlugById.get(s((snapshot as Record<string, unknown>).comuna_base_id)) ||
              "";
            const sn = snapshot as unknown as Record<string, unknown>;
            const loadedForm: SimpleForm = {
              nombre: s(snapshot.nombre_emprendimiento),
              email: s(snapshot.email).toLowerCase(),
              whatsapp: s(snapshot.whatsapp_principal),
              descripcionNegocio: s(snapshot.frase_negocio),
              descripcionLarga: s(snapshot.descripcion_libre),
              keywordsUsuario: keywordsUsuarioFromSnapshot(sn),
              comunaBase: comunaBaseSlug,
              coberturaTipo: s(snapshot.cobertura_tipo),
              comunasCobertura: asStringArray(snapshot.comunas_cobertura),
              regionesCobertura: asStringArray(snapshot.regiones_cobertura),
              modalidades: modalidadesAtencionInputsToDbUnique(
                asStringArray(snapshot.modalidades_atencion)
              ),
              aceptaTerminosPrivacidad: false,
            };
            bootstrappedKeyRef.current = candidate;
            draftIdRef.current = candidate;
            setDraftId(candidate);
            draftAutoRecover404Ref.current = 0;
            setForm(loadedForm);
            setAutosaveBaseline(cloneSimpleForm(loadedForm));
            if (!embedOnHome && effectiveUrlId !== candidate) {
              const qsKeep = new URLSearchParams();
              qsKeep.set("id", candidate);
              const kCom = s(searchParams.get("comuna"));
              const kSrv = s(searchParams.get("servicio"));
              if (kCom) qsKeep.set("comuna", kCom);
              if (kSrv) qsKeep.set("servicio", kSrv);
              router.replace(`/publicar?${qsKeep.toString()}`, { scroll: false });
            }
            setServerError("");
            setBootstrapPhase("ready");
            return;
          }
          /* not_found: seguir y crear borrador nuevo (misma URL con id inválido o borrado). */
        }

        const newId = await createPostulacionBorradorVacio();
        if (cancelled) return;
        bootstrappedKeyRef.current = newId;
        setPendingCandidateId(newId);
        draftIdRef.current = newId;
        setDraftId(newId);
        draftAutoRecover404Ref.current = 0;
        const hintComuna = s(searchParams.get("comuna")).toLowerCase();
        const hintServicio = s(searchParams.get("servicio"));
        const comunaMatch = comunas.find((c) => s(c.slug).toLowerCase() === hintComuna);
        const nextForm = cloneSimpleForm(INITIAL_FORM);
        if (comunaMatch?.slug) {
          nextForm.comunaBase = comunaMatch.slug;
        }
        if (hintServicio) {
          nextForm.keywordsUsuario = hintServicio;
        }
        setAutosaveBaseline(cloneSimpleForm(INITIAL_FORM));
        setForm(nextForm);
        if (!embedOnHome && effectiveUrlId !== newId) {
          const qsKeep = new URLSearchParams();
          qsKeep.set("id", newId);
          const kCom = s(searchParams.get("comuna"));
          const kSrv = s(searchParams.get("servicio"));
          if (kCom) qsKeep.set("comuna", kCom);
          if (kSrv) qsKeep.set("servicio", kSrv);
          router.replace(`/publicar?${qsKeep.toString()}`, { scroll: false });
        }
        setServerError("");
        setBootstrapPhase("ready");
      } catch (e) {
        if (cancelled) return;
        bootstrappedKeyRef.current = null;
        draftIdRef.current = null;
        setDraftId(null);
        setPendingCandidateId(null);
        setBootstrapError(
          e instanceof Error ? e.message : "No se pudo crear el borrador."
        );
        setBootstrapPhase("error");
      }
    }

    void bootstrap();
    return () => {
      cancelled = true;
    };
    /* router estable; no incluir en deps (re-disparaba bootstrap). */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    draftIdCandidate,
    bootstrapRetryNonce,
    comunaSlugById,
    embedOnHome,
    panelBasicsBootstrapKey,
    initialEdicionBasicaEmprendedorId,
    initialEdicionBasicaAccessToken,
  ]);

  useEffect(() => {
    setHydrated(true);
  }, []);

  const comunaBaseObj = useMemo(() => {
    return comunas.find((c) => c.slug === form.comunaBase) || null;
  }, [comunas, form.comunaBase]);

  const comunaBaseSugerencias = useMemo(() => {
    const q = normalizeSearchText(comunaBaseQuery || "");
    const source = comunas
      .map((c) => ({
        ...c,
        nombreNorm: normalizeSearchText(c.nombre),
        regionNorm: normalizeSearchText(c.region_nombre || ""),
        slugNorm: normalizeSearchText(String(c.slug || "").replace(/-/g, " ")),
        label: `${c.nombre} — ${c.region_nombre || "Sin región"}`,
      }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));

    if (!q) return source.slice(0, 20);

    return source
      .filter(
        (c) =>
          c.nombreNorm.includes(q) ||
          c.regionNorm.includes(q) ||
          c.slugNorm.includes(q)
      )
      .sort((a, b) => {
        const aStarts = a.nombreNorm.startsWith(q) ? 1 : 0;
        const bStarts = b.nombreNorm.startsWith(q) ? 1 : 0;
        if (aStarts !== bStarts) return bStarts - aStarts;
        return a.nombre.localeCompare(b.nombre, "es");
      })
      .slice(0, 20);
  }, [comunas, comunaBaseQuery]);

  const comunasCoberturaDisponibles = useMemo(() => {
    if (!comunaBaseObj?.region_id) return [];
    return comunas
      .filter(
        (c) =>
          c.region_id === comunaBaseObj.region_id &&
          c.slug !== form.comunaBase
      )
      .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
  }, [comunas, comunaBaseObj, form.comunaBase]);

  const comunasCoberturaSeleccionadas = useMemo(() => {
    const bySlug = new Map(comunas.map((c) => [c.slug, c]));
    return form.comunasCobertura
      .map((slug) => bySlug.get(slug))
      .filter((x): x is (typeof comunas)[number] => Boolean(x));
  }, [comunas, form.comunasCobertura]);

  const comunasCoberturaAutocomplete = useMemo(() => {
    const selectedSet = new Set(form.comunasCobertura);
    const q = normalizeSearchText(coberturaComunaQuery || "");

    const source = comunasCoberturaDisponibles
      .filter((c) => !selectedSet.has(c.slug))
      .map((c) => ({
        ...c,
        nombreNorm: normalizeSearchText(c.nombre),
        regionNorm: normalizeSearchText(c.region_nombre || ""),
        slugNorm: normalizeSearchText(String(c.slug || "")).replace(/-/g, " "),
        label: `${c.nombre} — ${getRegionShort(c.region_nombre) || "Sin región"}`,
      }));

    if (!q) return source.slice(0, 12);

    return source
      .filter(
        (c) =>
          c.nombreNorm.includes(q) ||
          c.regionNorm.includes(q) ||
          c.slugNorm.includes(q)
      )
      .slice(0, 12);
  }, [
    comunasCoberturaDisponibles,
    coberturaComunaQuery,
    form.comunasCobertura,
    comunas,
  ]);

  const regionBaseSlug = useMemo(() => {
    if (!comunaBaseObj?.region_id) return null;
    return regiones.find((r) => String(r.id) === String(comunaBaseObj.region_id))
      ?.slug ?? null;
  }, [regiones, comunaBaseObj?.region_id]);

  const regionesCoberturaDisponibles = useMemo(() => {
    const ordered = [...regiones].sort((a, b) =>
      a.nombre.localeCompare(b.nombre, "es")
    );
    if (!regionBaseSlug) return ordered;
    const base = ordered.find((r) => r.slug === regionBaseSlug);
    if (!base) return ordered;
    return [base, ...ordered.filter((r) => r.slug !== regionBaseSlug)];
  }, [regiones, regionBaseSlug]);

  const regionesCoberturaSeleccionadas = useMemo(() => {
    const bySlug = new Map(regiones.map((r) => [r.slug, r]));
    return form.regionesCobertura
      .map((slug) => bySlug.get(slug))
      .filter((x): x is (typeof regiones)[number] => Boolean(x));
  }, [regiones, form.regionesCobertura]);

  const regionesCoberturaAgregables = useMemo(() => {
    const selectedSet = new Set(form.regionesCobertura);
    return regionesCoberturaDisponibles.filter((r) => !selectedSet.has(r.slug));
  }, [regionesCoberturaDisponibles, form.regionesCobertura]);

  function normalizeComunasCoberturaForBase(
    baseSlug: string,
    current: string[]
  ): string[] {
    const baseSlugClean = String(baseSlug || "").trim();
    const baseSlugNorm = normalizeSearchText(baseSlugClean);

    const bySlug = new Map(comunas.map((c) => [String(c.slug || ""), c] as const));
    const byNorm = new Map(
      comunas
        .map((c) => {
          const slug = String(c.slug || "");
          const norm = normalizeSearchText(slug.replace(/-/g, " "));
          return [norm, c] as const;
        })
        .filter(([k]) => Boolean(k))
    );

    const baseComuna =
      (baseSlugClean ? bySlug.get(baseSlugClean) : undefined) ||
      (baseSlugNorm ? byNorm.get(baseSlugNorm) : undefined) ||
      null;
    const baseRegionId =
      baseComuna?.region_id != null ? String(baseComuna.region_id).trim() : "";
    const baseResolvedSlug = baseComuna?.slug ? String(baseComuna.slug).trim() : baseSlugClean;

    // Dedupe + limpieza sin depender de DB (evita borrados “misteriosos”).
    const seen = new Set<string>();
    const cleaned: string[] = [];
    for (const raw of Array.isArray(current) ? current : []) {
      const s = String(raw || "").trim();
      if (!s) continue;
      if (baseSlugClean && s === baseSlugClean) continue;
      const k = normalizeSearchText(s.replace(/-/g, " "));
      if (!k) continue;
      if (seen.has(k)) continue;
      seen.add(k);
      cleaned.push(s);
    }

    // Si no logramos resolver región de la base, NO filtramos por región aún.
    if (!baseRegionId) {
      return baseResolvedSlug ? [baseResolvedSlug, ...cleaned] : [...cleaned];
    }

    const validExtras: string[] = [];
    for (const slug of cleaned) {
      const sClean = String(slug || "").trim();
      const sNorm = normalizeSearchText(sClean.replace(/-/g, " "));
      const c =
        bySlug.get(sClean) || (sNorm ? byNorm.get(sNorm) : undefined) || null;
      // Si no podemos resolverla, la mantenemos (no podemos validar región).
      if (!c) {
        validExtras.push(sClean);
        continue;
      }
      const rid = c.region_id != null ? String(c.region_id).trim() : "";
      if (rid && rid === baseRegionId) {
        validExtras.push(String(c.slug).trim());
      }
    }

    return baseResolvedSlug ? [baseResolvedSlug, ...validExtras] : [...validExtras];
  }

  const descripcionValida =
    validateDescripcionCortaPublicacion(
      normalizeDescripcionCorta(form.descripcionNegocio),
    ).length === 0;
  const emailStrict = validateRequiredPublicEmail(form.email);
  const emailNormalizado = emailStrict.ok ? emailStrict.normalized : form.email.trim().toLowerCase();
  const emailValido = emailStrict.ok;
  const whatsappCheck = normalizeAndValidateChileWhatsappStrict(form.whatsapp);
  const whatsappNormalizado = whatsappCheck.normalized;
  const whatsappValido = whatsappCheck.ok;
  const nombreValido = form.nombre.trim().length >= 3;
  const comunaValida = !!form.comunaBase;
  const coberturaValida = !!form.coberturaTipo;
  /** Paso 1 no pide modalidades; el backend acepta borrador sin ellas. */
  const modalidadesValidas = true;
  const comunasExtraValidas =
    form.coberturaTipo !== "varias_comunas" ||
    (form.comunasCobertura.length >= 2 &&
      !!form.comunaBase &&
      form.comunasCobertura.includes(form.comunaBase));
  const regionesExtraValidas =
    form.coberturaTipo !== "varias_regiones" ||
    (form.regionesCobertura.length >= 1 && !!form.comunaBase.trim());

  const formForPaso = useMemo<FormData>(
    () => ({
      ...PUBLICAR_INITIAL_FORM,
      nombre: form.nombre,
      email: form.email,
      whatsapp: form.whatsapp,
      descripcionNegocio: form.descripcionNegocio,
      descripcionLarga: form.descripcionLarga,
      keywordsUsuario: form.keywordsUsuario,
      comunaBase: form.comunaBase,
      coberturaTipo: form.coberturaTipo,
      comunasCobertura: form.comunasCobertura,
      regionesCobertura: form.regionesCobertura,
      modalidades: form.modalidades,
      aceptaTerminosPrivacidad: form.aceptaTerminosPrivacidad,
    }),
    [form]
  );

  function setPasoField<K extends keyof FormData>(key: K, value: FormData[K]) {
    switch (key) {
      case "nombre":
        setField("nombre", value as string);
        return;
      case "whatsapp":
        setField("whatsapp", value as string);
        return;
      case "email":
        setField("email", value as string);
        return;
      case "descripcionNegocio":
        setField("descripcionNegocio", value as string);
        return;
      case "descripcionLarga":
        setField("descripcionLarga", value as string);
        return;
      case "keywordsUsuario":
        setField("keywordsUsuario", value as string);
        return;
      case "comunaBase":
        setField("comunaBase", value as string);
        return;
      case "coberturaTipo":
        setField("coberturaTipo", value as string);
        return;
      case "comunasCobertura":
        setField("comunasCobertura", value as string[]);
        return;
      case "regionesCobertura":
        setField("regionesCobertura", value as string[]);
        return;
      case "modalidades":
        setField("modalidades", value as string[]);
        return;
      case "aceptaTerminosPrivacidad":
        setField("aceptaTerminosPrivacidad", value as boolean);
        return;
      default:
        return;
    }
  }

  function setField<K extends keyof SimpleForm>(key: K, value: SimpleForm[K]) {
    setForm((prev) => {
      if (
        COBERTURA_LOOP_DEBUG &&
        (key === "comunasCobertura" || key === "coberturaTipo")
      ) {
        logCoberturaBasics("setField-cobertura", {
          key,
          comunasBefore: [...prev.comunasCobertura],
          coberturaTipoBefore: prev.coberturaTipo,
          comunaBase: prev.comunaBase,
          nextValue: value,
        });
      }
      return { ...prev, [key]: value };
    });
  }

  function toggleArrayValue(
    key: "modalidades" | "comunasCobertura" | "regionesCobertura",
    value: string
  ) {
    setForm((prev) => {
      const current = prev[key];
      const exists = current.includes(value);
      const next = exists
        ? current.filter((x) => x !== value)
        : [...current, value];
      if (key === "comunasCobertura") {
        logCoberturaBasics("toggle-comuna-chip", {
          slug: value,
          removed: exists,
          comunasBefore: [...current],
          comunasAfter: [...next],
          coberturaTipo: prev.coberturaTipo,
          comunaBase: prev.comunaBase,
        });
      }
      return {
        ...prev,
        [key]: next,
      };
    });
  }

  function validateForm() {
    const nextErrors: Record<string, string> = {};

    if (!nombreValido) {
      nextErrors.nombre = "Ingresa el nombre del emprendimiento.";
    }

    if (!emailStrict.ok) {
      nextErrors.email = emailStrict.message;
    }

    if (!whatsappValido) {
      nextErrors.whatsapp =
        "Ingresa un WhatsApp válido de Chile (ej: 9XXXXXXXX o +569XXXXXXXX)";
    }

    if (!descripcionValida) {
      const cortaErrs = validateDescripcionCortaPublicacion(
        normalizeDescripcionCorta(form.descripcionNegocio),
      );
      nextErrors.descripcionNegocio =
        primeraValidacionDescripcion(cortaErrs) ??
        `Revisá el resumen para búsquedas (máx. ${DESCRIPCION_CORTA_MAX} caracteres — sé claro y directo).`;
    }

    const largaNormValidate = normalizeDescripcionLarga(form.descripcionLarga);
    const largaErrsValidate = validateDescripcionLarga(largaNormValidate);
    const largaMsgValidate = primeraValidacionDescripcion(largaErrsValidate);
    if (largaMsgValidate) {
      nextErrors.descripcionLarga = largaMsgValidate;
    }

    if (!comunaValida) {
      nextErrors.comunaBase = "Selecciona una comuna de la lista.";
    }

    if (!coberturaValida) {
      nextErrors.coberturaTipo = "Selecciona la cobertura.";
    }

    if (form.coberturaTipo === "varias_comunas") {
      const base = form.comunaBase.trim();
      const arr = form.comunasCobertura;
      const hasBase = base && arr.includes(base);
      if (!hasBase) {
        nextErrors.comunasCobertura =
          "Tu comuna de origen debe estar entre las comunas seleccionadas.";
      } else if (arr.length < 2) {
        nextErrors.comunasCobertura =
          "Debes seleccionar al menos otra comuna además de la base.";
      }
    }

    if (
      form.coberturaTipo === "varias_regiones" &&
      !form.comunaBase.trim()
    ) {
      nextErrors.comunaBase =
        "Selecciona la comuna base para definir tu región de cobertura.";
    }

    if (form.coberturaTipo === "varias_regiones") {
      if (!form.regionesCobertura.length) {
        nextErrors.regionesCobertura =
          "Selecciona al menos una región donde atiendes.";
      }
    }

    if (!form.aceptaTerminosPrivacidad) {
      nextErrors.aceptaTerminosPrivacidad =
        "Debes aceptar los Términos y Condiciones y la Política de Privacidad para continuar.";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  /** El borrador se crea al cargar la página; aquí solo devolvemos el id activo. */
  async function ensureDraftExists(): Promise<string | null> {
    return draftIdRef.current;
  }

  /** Evita pisar foto/galería/keywords con snapshot viejo antes de armar el PUT de edición básica. */
  const refreshEmpBasicsSnapshot = useCallback(async () => {
    const empId = empBasicsIdRef.current?.trim();
    const tok =
      s(searchParams.get("access_token")) || s(searchParams.get("token"));
    const url = empId
      ? `/api/panel/negocio?id=${encodeURIComponent(empId)}`
      : tok.length >= 8
        ? `/api/panel/negocio?access_token=${encodeURIComponent(tok)}`
        : "";
    if (!url) return;
    try {
      const res = await fetch(url, { cache: "no-store" });
      const json = (await res.json()) as Record<string, unknown>;
      if (!res.ok || json?.ok !== true || !json?.item) return;
      const it = json.item as Record<string, unknown>;
      empBasicsItemRef.current = it;
      const rid = s(it.id);
      if (rid) empBasicsIdRef.current = rid;
      const mappedSnap = basicsFormFromPanelNegocioItem(it) as SimpleForm;
      logBasicsPanelDebug("refresh-snapshot", it, mappedSnap);
      logCoberturaBasics("refresh-snapshot-get", {
        comunasCobertura: mappedSnap.comunasCobertura,
        coberturaTipo: mappedSnap.coberturaTipo,
        comunaBase: mappedSnap.comunaBase,
      });
    } catch {
      /* ignore */
    }
  }, [searchParams]);

  const autosave = useCallback(async () => {
    const empId = empBasicsIdRef.current;
    if (empId && empBasicsModeRef.current) {
      if (bootstrappedKeyRef.current !== panelBasicsBootstrapKey) return;
      await refreshEmpBasicsSnapshot();
      const snap = empBasicsItemRef.current;
      if (!snap || typeof snap !== "object") return;
      const body = panelNegocioPutBodyBasics(form as BasicsFormFromPanel, snap);
      try {
        const res = await fetch(
          `/api/panel/negocio?id=${encodeURIComponent(empId)}`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          }
        );
        let data: Record<string, unknown> = {};
        try {
          data = (await res.json()) as Record<string, unknown>;
        } catch {
          data = {};
        }
        if (!res.ok || data?.ok !== true) {
          setServerError(
            s(data.message) ||
              s(data.error) ||
              "Ocurrió un error al guardar."
          );
        } else {
          setServerError("");
          await refreshEmpBasicsSnapshot();
          const snapAfter = empBasicsItemRef.current;
          const reapplied =
            snapAfter && typeof snapAfter === "object"
              ? (basicsFormFromPanelNegocioItem(snapAfter) as SimpleForm)
              : null;
          logBasicsPanelDebug("post-autosave-refetch", snapAfter, reapplied ?? undefined);
          logCoberturaBasics("post-autosave-skip-form-reapply", {
            reason:
              "PUT ya persistió el formulario; el GET del panel puede mezclar pivote publicado y reinyectar comunas (loop visual). Solo actualizamos snapshot + baseline local.",
            formComunasCobertura: [...form.comunasCobertura],
            snapshotComunasIfAny: reapplied?.comunasCobertura ?? null,
            coberturaTipo: form.coberturaTipo,
            comunaBase: form.comunaBase,
          });
          /** No `setForm(reapplied)`: evita loop comunas ↔ GET (p. ej. San Bernardo). */
          setAutosaveBaseline(cloneSimpleForm(form));
        }
      } catch (error) {
        console.error("[publicar] autosave panel:", error);
        if (isLikelyNetworkFailure(error)) {
          setServerError("No pudimos guardar. Revisá tu conexión.");
        } else {
          setServerError(
            error instanceof Error ? error.message : "Error al guardar."
          );
        }
      }
      return;
    }

    const currentDraftId = await ensureDraftExists();
    if (!currentDraftId) return;
    /* No PATCH con id desconocido o no validado aún (evita 404 en ráfaga). */
    if (bootstrappedKeyRef.current !== currentDraftId) return;

    const payload: Record<string, unknown> = {};

    if (form.nombre.trim()) payload.nombre_emprendimiento = form.nombre.trim();
    const emailAutosave = validateOptionalPublicEmail(form.email);
    if (emailAutosave.ok && emailAutosave.normalized) {
      payload.email = emailAutosave.normalized;
    }
    if (whatsappValido) payload.whatsapp_principal = whatsappNormalizado;
    payload.frase_negocio = normalizeDescripcionCorta(form.descripcionNegocio);
    payload.descripcion_libre = normalizeDescripcionLarga(form.descripcionLarga);

    const comunaBaseId = comunaIdMapRef.current.get(form.comunaBase);
    if (comunaBaseId) payload.comuna_base_id = comunaBaseId;

    const baseSlug = form.comunaBase.trim();
    if (form.coberturaTipo) {
      payload.cobertura_tipo = form.coberturaTipo;
      if (form.coberturaTipo === "varias_regiones") {
        let regs = [...form.regionesCobertura];
        if (regs.length === 0 && regionBaseSlug) regs = [regionBaseSlug];
        payload.regiones_cobertura = regs;
        payload.comunas_cobertura = [];
      } else {
        if (form.comunasCobertura.length) {
          payload.comunas_cobertura = form.comunasCobertura;
        }
        if (form.regionesCobertura.length) {
          payload.regiones_cobertura = form.regionesCobertura;
        }
      }
    } else if (baseSlug) {
      /* Sin tipo elegido: no dejar `varias_comunas` viejo en servidor (evita 400 al guardar). */
      payload.cobertura_tipo = "solo_mi_comuna";
      payload.comunas_cobertura = [baseSlug];
      payload.regiones_cobertura = [];
    }
    const modalidadesPayload = modalidadesAtencionInputsToDbUnique(form.modalidades);
    if (modalidadesPayload.length) payload.modalidades_atencion = modalidadesPayload;
    payload.keywords_usuario = parseKeywordsUsuarioInputToTextArray(form.keywordsUsuario);
    if (process.env.NEXT_PUBLIC_PUBLICAR_LOCAL_DEBUG === "1") {
      // eslint-disable-next-line no-console
      console.log("[publicar-local-debug][autosave]", {
        draft_id: currentDraftId,
        modalidades_form_state: form.modalidades,
        modalidades_payload: modalidadesPayload,
        toggles: {
          local_fisico: modalidadesPayload.includes("local_fisico"),
          delivery: modalidadesPayload.includes("delivery"),
          domicilio: modalidadesPayload.includes("domicilio"),
          online: modalidadesPayload.includes("online"),
          presencial_terreno: modalidadesPayload.includes("presencial_terreno"),
        },
      });
    }
    try {
      const res = await fetch(publicarBorradorByIdPath(currentDraftId), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      let data: Record<string, unknown> = {};
      try {
        data = (await res.json()) as Record<string, unknown>;
      } catch {
        data = {};
      }

      if (!res.ok) {
        if (res.status === 404) {
          if (draftAutoRecover404Ref.current >= 1) {
            setServerError(
              "No pudimos recuperar el borrador. Recargá la página."
            );
            return;
          }
          draftAutoRecover404Ref.current += 1;
          bootstrappedKeyRef.current = null;
          draftIdRef.current = null;
          setDraftId(null);
          setPendingCandidateId(null);
          setBootstrapError("");
          setServerError("");
          setBootstrapPhase("loading");
          setBootstrapRetryNonce((n) => n + 1);
          return;
        }
        setServerError(
          s(data.message) ||
            s(data.error) ||
            "Ocurrió un error al guardar."
        );
      } else {
        setServerError("");
        setAutosaveBaseline(cloneSimpleForm(form));
      }
    } catch (error) {
      console.error("[publicar] autosave:", error);
      if (isLikelyNetworkFailure(error)) {
        setServerError("No pudimos guardar. Revisá tu conexión.");
      } else {
        setServerError(
          error instanceof Error ? error.message : "Error al guardar."
        );
      }
    }
  }, [
    form,
    emailNormalizado,
    whatsappValido,
    whatsappNormalizado,
    regionBaseSlug,
    panelBasicsBootstrapKey,
    refreshEmpBasicsSnapshot,
  ]);

  useEffect(() => {
    setServerError("");
  }, [form.coberturaTipo]);

  useEffect(() => {
    if (bootstrapPhase !== "ready") return;

    if (!isFormDirty) {
      if (!hasLoggedAutosaveSkipRef.current) {
        hasLoggedAutosaveSkipRef.current = true;
      }
      if (autosaveTimerRef.current) {
        clearTimeout(autosaveTimerRef.current);
        autosaveTimerRef.current = null;
      }
      return;
    }

    hasLoggedAutosaveSkipRef.current = true;

    if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    autosaveTimerRef.current = setTimeout(() => {
      void autosave();
    }, 900);

    return () => {
      if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    };
  }, [autosave, bootstrapPhase, isFormDirty]);

  async function submitForm() {
    if (saving) return;

    setServerError("");

    if (!validateForm()) return;

    try {
      setSaving(true);

      if (empBasicsModeRef.current && empBasicsIdRef.current) {
        const empId = empBasicsIdRef.current;
        await refreshEmpBasicsSnapshot();
        const snap = empBasicsItemRef.current;
        if (!empId || !snap || typeof snap !== "object") {
          setServerError("No se pudo identificar tu ficha.");
          return;
        }
        const largaNorm = normalizeDescripcionLarga(form.descripcionLarga);
        const largaErrs = validateDescripcionLarga(largaNorm);
        const largaMsg = primeraValidacionDescripcion(largaErrs);
        if (largaMsg) {
          setServerError(largaMsg);
          return;
        }
        const body = panelNegocioPutBodyBasics(form as BasicsFormFromPanel, snap);
        const res = await fetch(
          `/api/panel/negocio?id=${encodeURIComponent(empId)}`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          }
        );
        let data: Record<string, unknown> = {};
        try {
          data = (await res.json()) as Record<string, unknown>;
        } catch {
          data = {};
        }
        if (!res.ok || data?.ok !== true) {
          setServerError(
            s(data.message) ||
              s(data.error) ||
              "No se pudieron guardar los cambios."
          );
          return;
        }
        await refreshEmpBasicsSnapshot();
        const snapSubmit = empBasicsItemRef.current;
        if (snapSubmit && typeof snapSubmit === "object") {
          logBasicsPanelDebug(
            "post-submit-refetch",
            snapSubmit,
            basicsFormFromPanelNegocioItem(snapSubmit) as SimpleForm
          );
        }
        router.replace(mejorarFichaVolverHref, { scroll: false });
        return;
      }

      const currentDraftId = await ensureDraftExists();
      if (!currentDraftId) {
        setServerError("No se pudo crear el borrador antes de enviar la postulación.");
        return;
      }
      if (bootstrappedKeyRef.current !== currentDraftId) {
        setServerError("Esperá un momento a que cargue el borrador.");
        return;
      }

      const comunaBaseId = comunaIdMapRef.current.get(form.comunaBase) ?? null;
      const cortaNorm = normalizeDescripcionCorta(form.descripcionNegocio);
      const largaNorm = normalizeDescripcionLarga(form.descripcionLarga);
      const largaErrs2 = validateDescripcionLarga(largaNorm);
      const largaMsg2 = primeraValidacionDescripcion(largaErrs2);
      if (largaMsg2) {
        setServerError(largaMsg2);
        return;
      }

      const baseSlugSubmit = form.comunaBase.trim();
      const regionesParaEnvio =
        form.coberturaTipo === "varias_regiones"
          ? form.regionesCobertura.length > 0
            ? form.regionesCobertura
            : regionBaseSlug
              ? [regionBaseSlug]
              : []
          : form.regionesCobertura;
      const coberturaPayload =
        form.coberturaTipo
          ? form.coberturaTipo === "varias_regiones"
            ? {
                cobertura_tipo: "varias_regiones",
                comunas_cobertura: [] as string[],
                regiones_cobertura: regionesParaEnvio,
              }
            : {
                cobertura_tipo: form.coberturaTipo,
                comunas_cobertura: form.comunasCobertura,
                regiones_cobertura: form.regionesCobertura,
              }
          : baseSlugSubmit
            ? {
                cobertura_tipo: "solo_mi_comuna",
                comunas_cobertura: [baseSlugSubmit],
                regiones_cobertura: [] as string[],
              }
            : {
                cobertura_tipo: form.coberturaTipo,
                comunas_cobertura: form.comunasCobertura,
                regiones_cobertura: form.regionesCobertura,
              };

      const patchPayload: Record<string, unknown> = {
        paso_actual: 1,
        estado: "pendiente_revision",

        nombre_emprendimiento: form.nombre.trim(),
        email: emailNormalizado,
        whatsapp_principal: whatsappNormalizado,

        frase_negocio: cortaNorm,
        descripcion_libre: largaNorm,

        comuna_base_id: comunaBaseId,
        ...coberturaPayload,
        ...(modalidadesAtencionInputsToDbUnique(form.modalidades).length > 0
          ? { modalidades_atencion: modalidadesAtencionInputsToDbUnique(form.modalidades) }
          : {}),
        keywords_usuario: parseKeywordsUsuarioInputToTextArray(form.keywordsUsuario),
      };

      const patchRes = await fetch(publicarBorradorByIdPath(currentDraftId), {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(patchPayload),
      });

      const patchText = await patchRes.text();
      let patchData: Record<string, unknown> = {};
      try {
        if (patchText) patchData = JSON.parse(patchText) as Record<string, unknown>;
      } catch {
        patchData = {};
      }
      console.log("[publicar-submit] PATCH status", patchRes.status);
      console.log("[publicar-submit] PATCH body", patchData);

      if (patchRes.status === 404) {
        if (draftAutoRecover404Ref.current >= 1) {
          setServerError(
            "No pudimos recuperar el borrador. Recargá la página."
          );
          return;
        }
        draftAutoRecover404Ref.current += 1;
        bootstrappedKeyRef.current = null;
        draftIdRef.current = null;
        setDraftId(null);
        setPendingCandidateId(null);
        setBootstrapPhase("loading");
        setBootstrapRetryNonce((n) => n + 1);
        setServerError("");
        return;
      }

      if (!patchRes.ok || !patchData?.ok) {
        setServerError(
          s(patchData.message) ||
            s(patchData.error) ||
            "No se pudo actualizar la postulación."
        );
        return;
      }

      const enviarRes = await fetch("/api/publicar", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          draft_id: currentDraftId,
          email: emailNormalizado,
          acepta_terminos_privacidad: form.aceptaTerminosPrivacidad,
        }),
      });

      const enviarText = await enviarRes.text();
      let enviarData: Record<string, unknown> = {};
      try {
        if (enviarText) enviarData = JSON.parse(enviarText) as Record<string, unknown>;
      } catch {
        enviarData = {};
      }

      console.log("[publicar-submit] POST /api/publicar status", enviarRes.status);
      console.log("[publicar-submit] POST raw (preview)", enviarText.slice(0, 800));
      console.log("[publicar-submit] POST response", enviarData);

      const draftFromApi = s(enviarData.draft_id);
      const postulacionOk =
        enviarRes.ok &&
        (enviarData.ok === true ||
          s(String(enviarData.ok)).toLowerCase() === "true" ||
          s(enviarData.estado).toLowerCase() === "pendiente_revision" ||
          (Boolean(draftFromApi) && draftFromApi === currentDraftId));

      if (!postulacionOk) {
        console.warn(
          "[publicar-submit] POST no considerado exitoso; no navega.",
          "okRes",
          enviarRes.ok,
          "parsed",
          enviarData
        );
        setServerError(
          s(enviarData.message) ||
            s(enviarData.error) ||
            "No se pudo enviar la postulación."
        );
        return;
      }

      const draftNav = draftFromApi || currentDraftId;
      const qsAfter = new URLSearchParams();
      qsAfter.set("borrador", draftNav);
      qsAfter.set("revision", "1");
      const kComSend = s(searchParams.get("comuna"));
      const kSrvSend = s(searchParams.get("servicio"));
      if (kComSend) qsAfter.set("comuna", kComSend);
      if (kSrvSend) qsAfter.set("servicio", kSrvSend);
      const nextUrl = `/mejorar-ficha?${qsAfter.toString()}`;
      console.log("[publicar-submit] draftId para navegar", draftNav);
      console.log("[publicar-submit] nextUrl", nextUrl);
      router.replace(nextUrl, { scroll: false });
    } catch (_error) {
      console.error("[publicar-submit] excepción", _error);
      setServerError("Ocurrió un error al enviar la postulación.");
    } finally {
      setSaving(false);
    }
  }

  if (!hydrated) {
    return (
      <main style={mainShellStyle}>
        {!embedOnHome ? (
          <header
            style={{
              borderBottom: "1px solid #e5e7eb",
              background: "#fff",
            }}
          >
            <div
              style={{
                maxWidth: 1180,
                margin: "0 auto",
                padding: "14px 20px",
              }}
            >
              <Link
                href="/"
                style={{
                  display: "inline-block",
                  fontSize: 14,
                  fontWeight: 600,
                  color: "#0f766e",
                  textDecoration: "none",
                  marginBottom: 10,
                }}
              >
                ← Volver al inicio
              </Link>
              <div style={{ display: "none" }} />
            </div>
          </header>
        ) : null}
        <section style={contentSectionStyle} />
      </main>
    );
  }

  if (bootstrapPhase === "error") {
    return (
      <main style={mainShellStyle}>
        <section style={narrowErrorStyle}>
          <div style={errorBoxStyle}>{bootstrapError}</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 4 }}>
            <button
              type="button"
              onClick={() => window.location.reload()}
              style={retryBootstrapBtnStyle}
            >
              Reintentar
            </button>
            <Link
              href="/"
              style={{
                ...retryBootstrapBtnStyle,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                background: "#fff",
                color: "#0f172a",
                border: "2px solid #e5e7eb",
                textDecoration: "none",
              }}
            >
              Volver al inicio
            </Link>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main style={mainShellStyle}>
      {!embedOnHome ? (
        <header
          style={{
            borderBottom: "1px solid #e5e7eb",
            background: "#fff",
          }}
        >
          <div
            style={{
              maxWidth: 1180,
              margin: "0 auto",
              padding: "14px 20px",
            }}
          >
            <Link
              href="/"
              style={{
                display: "inline-block",
                fontSize: 14,
                fontWeight: 600,
                color: "#0f766e",
                textDecoration: "none",
                marginBottom: 10,
              }}
            >
              ← Volver al inicio
            </Link>
            <div
              style={{
                fontSize: 24,
                fontWeight: 900,
                color: "#111827",
              }}
            >
              Rey del Dato
            </div>
          </div>
        </header>
      ) : null}

      <section style={contentSectionStyle}>
        {panelBasicsBootstrapKey ? (
          <div style={{ marginBottom: 18 }}>
            <Link
              href={mejorarFichaVolverHref}
              style={{
                display: "inline-block",
                fontSize: 14,
                fontWeight: 600,
                color: "#0f766e",
                textDecoration: "none",
              }}
            >
              ← Volver a mejorar ficha
            </Link>
          </div>
        ) : null}
        {hydrated && bootstrapPhase === "loading" ? (
          <div
            style={{
              marginBottom: 16,
              background: "#eff6ff",
              border: "1px solid #bfdbfe",
              color: "#1d4ed8",
              padding: 14,
              borderRadius: 14,
              fontWeight: 700,
            }}
          >
            Cargando...
          </div>
        ) : null}

        {bootstrapPhase === "ready" ? (
          <>
            <PasoInformacionBasica
              form={formForPaso}
              errors={errors}
              setField={setPasoField}
              submitForm={() => void submitForm()}
              comunas={comunas}
              regiones={regiones}
              showIntro={false}
              omitDescripcionLarga
              showLegalAcceptance
            />
          </>
        ) : null}

        {serverError ? (
          <div
            style={{
              marginTop: 18,
              background: "#fef2f2",
              border: "1px solid #fecaca",
              color: "#991b1b",
              padding: "12px 14px",
              borderRadius: 12,
              fontWeight: 600,
              fontSize: 14,
              lineHeight: 1.45,
            }}
          >
            {serverError}
          </div>
        ) : null}

      </section>
    </main>
  );

}

const heroSimpleStyle: React.CSSProperties = {
  marginBottom: 24,
  textAlign: "center",
};

const heroBadgeStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  padding: "8px 12px",
  borderRadius: 9999,
  background: "#dbeafe",
  color: "#1d4ed8",
  fontSize: 12,
  fontWeight: 800,
  marginBottom: 14,
};

const heroTitleCompactStyle: React.CSSProperties = {
  margin: "0 0 10px",
  fontSize: 32,
  fontWeight: 900,
  lineHeight: 1.1,
  letterSpacing: "-0.03em",
  color: "#0f172a",
};

const heroSubStyle: React.CSSProperties = {
  margin: 0,
  fontSize: 16,
  lineHeight: 1.55,
  color: "#64748b",
};

const successHeroStyle: React.CSSProperties = {
  background:
    "linear-gradient(135deg, rgba(22,101,52,1) 0%, rgba(34,197,94,1) 100%)",
  borderRadius: 28,
  padding: "28px 28px 30px",
  color: "#fff",
  marginBottom: 22,
  boxShadow: "0 12px 32px rgba(34,197,94,0.18)",
  textAlign: "center",
};

const successBadgeStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  padding: "8px 12px",
  borderRadius: 9999,
  background: "rgba(255,255,255,0.16)",
  fontSize: 12,
  fontWeight: 800,
  marginBottom: 14,
};

const successHeroTitleStyle: React.CSSProperties = {
  margin: "0 0 10px",
  fontSize: 28,
  fontWeight: 900,
  lineHeight: 1.15,
  letterSpacing: "-0.02em",
};

const heroTextStyle: React.CSSProperties = {
  margin: 0,
  fontSize: 16,
  lineHeight: 1.6,
  color: "rgba(255,255,255,0.92)",
};

const successPageSectionStyle: React.CSSProperties = {
  maxWidth: 1000,
  margin: "0 auto",
  padding: "28px 18px 48px",
};

const activationNivelCardStyle: React.CSSProperties = {
  background: "#fff",
  border: "1px solid #e2e8f0",
  borderRadius: 20,
  padding: "22px 22px 8px",
  marginBottom: 18,
  boxShadow: "0 4px 16px rgba(15,23,42,0.05)",
};

const activationNivelHeaderStyle: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
  marginBottom: 8,
};

const activationNivelTitleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: 20,
  fontWeight: 900,
  color: "#0f172a",
  lineHeight: 1.25,
};

const activationNivelScoreStyle: React.CSSProperties = {
  fontSize: 14,
  fontWeight: 800,
  color: "#64748b",
};

const activationNivelLeadStyle: React.CSSProperties = {
  margin: "0 0 14px",
  fontSize: 15,
  lineHeight: 1.55,
  color: "#475569",
};

const activationChecklistUlStyle: React.CSSProperties = {
  listStyle: "none",
  margin: 0,
  padding: 0,
};

const activationChecklistLiStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 12,
  alignItems: "stretch",
  padding: "12px 0",
  borderBottom: "1px solid #f1f5f9",
};

const activationChecklistRowHeaderStyle: React.CSSProperties = {
  display: "flex",
  gap: 12,
  alignItems: "flex-start",
  width: "100%",
};

const successChecklistEditBtnStyle: React.CSSProperties = {
  flexShrink: 0,
  alignSelf: "flex-start",
  marginTop: 2,
  padding: "8px 14px",
  borderRadius: 10,
  border: "1px solid #cbd5e1",
  background: "#fff",
  fontSize: 13,
  fontWeight: 800,
  color: "#0f172a",
  cursor: "pointer",
};

const successChecklistEditorWrapStyle: React.CSSProperties = {
  paddingLeft: 42,
  paddingBottom: 4,
};

function activationCheckIconStyle(ok: boolean): React.CSSProperties {
  return {
    flexShrink: 0,
    width: 30,
    height: 30,
    borderRadius: 999,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 900,
    fontSize: 14,
    background: ok ? "#dcfce7" : "#f1f5f9",
    color: ok ? "#166534" : "#94a3b8",
  };
}

function activationCheckLabelStyle(ok: boolean): React.CSSProperties {
  return {
    fontWeight: 800,
    fontSize: 15,
    color: ok ? "#0f172a" : "#64748b",
  };
}

const activationCheckBenefitStyle: React.CSSProperties = {
  fontSize: 13,
  color: "#64748b",
  marginTop: 3,
  lineHeight: 1.45,
};

const successActivationGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) minmax(280px, 340px)",
  gap: 22,
  alignItems: "start",
};

const activationLeftColStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 18,
  minWidth: 0,
};

const activationRightColStyle: React.CSSProperties = {
  minWidth: 0,
};

const previewSocialRowStyle: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: 8,
  marginBottom: 12,
};

const previewSocialChipStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 800,
  color: "#1d4ed8",
  background: "#eff6ff",
  padding: "4px 10px",
  borderRadius: 999,
};

const extrasStatusRowStyle: React.CSSProperties = {
  minHeight: 22,
  marginBottom: 12,
  fontSize: 13,
  fontWeight: 700,
};

const extrasStatusSavingStyle: React.CSSProperties = {
  color: "#1d4ed8",
};

const extrasStatusOkStyle: React.CSSProperties = {
  color: "#166534",
};

const extrasFieldStyle: React.CSSProperties = {
  marginBottom: 14,
};

const extrasLabelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 13,
  fontWeight: 800,
  marginBottom: 6,
  color: "#334155",
};

const extrasInputStyle: React.CSSProperties = {
  width: "100%",
  minHeight: 46,
  borderRadius: 12,
  border: "1px solid #cbd5e1",
  padding: "0 12px",
  fontSize: 15,
};

const extrasTextareaStyle: React.CSSProperties = {
  width: "100%",
  borderRadius: 12,
  border: "1px solid #cbd5e1",
  padding: 12,
  fontSize: 15,
  resize: "vertical",
  lineHeight: 1.5,
};

const errorBoxStyle: React.CSSProperties = {
  marginBottom: 16,
  background: "#fef2f2",
  border: "1px solid #fecaca",
  color: "#991b1b",
  padding: 16,
  borderRadius: 14,
  fontWeight: 700,
  lineHeight: 1.5,
};

const retryBootstrapBtnStyle: React.CSSProperties = {
  padding: "10px 18px",
  borderRadius: 12,
  border: "1px solid #cbd5e1",
  background: "#fff",
  fontWeight: 700,
  cursor: "pointer",
  fontFamily: "inherit",
};

const cardStyle: React.CSSProperties = {
  background: "#fff",
  border: "1px solid #e5e7eb",
  borderRadius: 24,
  padding: 22,
  marginBottom: 18,
  boxShadow: "0 4px 14px rgba(15,23,42,0.04)",
};

const cardHeaderStyle: React.CSSProperties = {
  marginBottom: 18,
};

const cardTitleStyle: React.CSSProperties = {
  margin: "0 0 6px",
  fontSize: 20,
  fontWeight: 900,
  color: "#0f172a",
};

const cardSubtitleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: 14,
  lineHeight: 1.5,
  color: "#64748b",
};

const ctaCardStyle: React.CSSProperties = {
  background: "#fff",
  border: "2px solid #1e3a8a",
  borderRadius: 24,
  padding: 22,
  boxShadow: "0 8px 24px rgba(30,58,138,0.12)",
};

const ctaHintStyle: React.CSSProperties = {
  margin: "14px 0 0",
  fontSize: 13,
  color: "#64748b",
  lineHeight: 1.5,
  textAlign: "center",
};

const fieldGroupStyle: React.CSSProperties = {
  marginBottom: 18,
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 14,
  fontWeight: 900,
  marginBottom: 8,
  color: "#111827",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  minHeight: 52,
  borderRadius: 14,
  border: "1px solid #d1d5db",
  padding: "0 16px",
  fontSize: 15,
  color: "#111827",
  background: "#fff",
};

const textareaStyle: React.CSSProperties = {
  width: "100%",
  minHeight: 140,
  borderRadius: 14,
  border: "1px solid #d1d5db",
  padding: "14px 16px",
  fontSize: 15,
  color: "#111827",
  background: "#fff",
  resize: "vertical",
  lineHeight: 1.55,
};

const helpStyle: React.CSSProperties = {
  marginTop: 8,
  fontSize: 13,
  color: "#64748b",
  lineHeight: 1.5,
};

const errorTextStyle: React.CSSProperties = {
  marginTop: 8,
  fontSize: 13,
  color: "#b91c1c",
  fontWeight: 700,
  lineHeight: 1.45,
};

const counterOkStyle: React.CSSProperties = {
  marginTop: 8,
  fontSize: 12,
  color: "#166534",
  fontWeight: 800,
};

const counterWarnStyle: React.CSSProperties = {
  marginTop: 8,
  fontSize: 12,
  color: "#b91c1c",
  fontWeight: 800,
};

const dropdownStyle: React.CSSProperties = {
  position: "absolute",
  top: "100%",
  left: 0,
  right: 0,
  marginTop: 4,
  maxHeight: 280,
  overflowY: "auto",
  background: "#fff",
  border: "1px solid #d1d5db",
  borderRadius: 14,
  boxShadow: "0 10px 24px rgba(15,23,42,0.12)",
  zIndex: 50,
};

const dropdownEmptyStyle: React.CSSProperties = {
  padding: "12px 14px",
  fontSize: 14,
  color: "#6b7280",
};

const dropdownItemStyle: React.CSSProperties = {
  display: "block",
  width: "100%",
  textAlign: "left",
  padding: "12px 14px",
  fontSize: 14,
  border: "none",
  background: "none",
  cursor: "pointer",
  color: "#111827",
  borderBottom: "1px solid #f3f4f6",
};

const emptyBoxStyle: React.CSSProperties = {
  border: "1px dashed #d1d5db",
  borderRadius: 14,
  padding: 14,
  color: "#6b7280",
  fontSize: 14,
  background: "#f9fafb",
};

const chipsWrapStyle: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: 10,
};

const chipTagSelectedStyle: React.CSSProperties = {
  minHeight: 38,
  padding: "0 12px",
  borderRadius: 9999,
  border: "1px solid #93c5fd",
  background: "#dbeafe",
  color: "#1d4ed8",
  fontWeight: 900,
  fontSize: 14,
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
};

const chipTagBaseStyle: React.CSSProperties = {
  ...chipTagSelectedStyle,
  border: "1px solid #2563eb",
  background: "#bfdbfe",
  color: "#1e3a8a",
};

const chipBaseBadgeStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 900,
  letterSpacing: "0.02em",
  textTransform: "uppercase",
  padding: "3px 7px",
  borderRadius: 9999,
  background: "#1e3a8a",
  color: "#fff",
};

const chipRemoveXButtonStyle: React.CSSProperties = {
  width: 20,
  height: 20,
  borderRadius: 9999,
  border: "none",
  background: "#bfdbfe",
  color: "#1e3a8a",
  fontWeight: 900,
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 0,
  lineHeight: 1,
};

const emptyChipNoteStyle: React.CSSProperties = {
  fontSize: 13,
  color: "#6b7280",
  fontWeight: 700,
};

function chipButtonStyle(active: boolean): React.CSSProperties {
  return {
    minHeight: 40,
    padding: "0 14px",
    borderRadius: 9999,
    border: active ? "1px solid #93c5fd" : "1px solid #d1d5db",
    background: active ? "#dbeafe" : "#fff",
    color: active ? "#1d4ed8" : "#111827",
    fontWeight: 800,
    fontSize: 14,
    cursor: "pointer",
  };
}

const regionsGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
  gap: 12,
};

function regionCardStyle(active: boolean, suggested: boolean): React.CSSProperties {
  return {
    width: "100%",
    minHeight: 78,
    padding: "12px 14px",
    borderRadius: 16,
    border: active
      ? "2px solid #2563eb"
      : suggested
        ? "1px solid #93c5fd"
        : "1px solid #d1d5db",
    background: active ? "#dbeafe" : suggested ? "#eff6ff" : "#fff",
    color: "#111827",
    textAlign: "left",
    cursor: "pointer",
  };
}

const regionBadgeStyle: React.CSSProperties = {
  marginTop: 6,
  fontSize: 12,
  fontWeight: 700,
  color: "#1d4ed8",
};

const modesGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr",
  gap: 12,
};

function modeCardStyle(active: boolean): React.CSSProperties {
  return {
    width: "100%",
    textAlign: "left",
    borderRadius: 18,
    border: active ? "2px solid #2563eb" : "1px solid #d1d5db",
    background: active ? "#eff6ff" : "#fff",
    padding: "16px",
    cursor: "pointer",
  };
}

const modeTitleStyle: React.CSSProperties = {
  fontSize: 15,
  fontWeight: 900,
  color: "#0f172a",
  marginBottom: 6,
};

const modeTextStyle: React.CSSProperties = {
  fontSize: 13,
  lineHeight: 1.5,
  color: "#64748b",
};

const primaryActionStyle: React.CSSProperties = {
  width: "100%",
  minHeight: 54,
  borderRadius: 16,
  border: "none",
  background: "#1e3a8a",
  color: "#fff",
  fontWeight: 900,
  fontSize: 16,
  cursor: "pointer",
  boxShadow: "0 10px 22px rgba(30,58,138,0.18)",
};

const secondaryActionStyle: React.CSSProperties = {
  minHeight: 48,
  padding: "0 18px",
  borderRadius: 14,
  border: "1px solid #cbd5e1",
  background: "#fff",
  color: "#0f172a",
  fontWeight: 800,
  cursor: "pointer",
};

const previewCardStyle: React.CSSProperties = {
  border: "1px solid #e5e7eb",
  borderRadius: 22,
  overflow: "hidden",
  background: "#fff",
  boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
};

const previewFotoAreaStyle: React.CSSProperties = {
  position: "relative",
  aspectRatio: "4 / 3",
  background: "linear-gradient(135deg, #e2e8f0 0%, #f1f5f9 100%)",
  minHeight: 200,
};

const previewUploadingOverlayStyle: React.CSSProperties = {
  position: "absolute",
  inset: 0,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "rgba(255,255,255,0.88)",
  fontWeight: 800,
  fontSize: 15,
  color: "#1e3a8a",
  zIndex: 2,
};

const successPreviewImgStyle: React.CSSProperties = {
  width: "100%",
  height: "100%",
  objectFit: "cover",
  display: "block",
  minHeight: 200,
};

const previewEmptyUploadStyle: React.CSSProperties = {
  height: "100%",
  minHeight: 200,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: 10,
  padding: 24,
  color: "#64748b",
};

const previewEmptyUploadTextStyle: React.CSSProperties = {
  margin: 0,
  fontSize: 14,
  fontWeight: 700,
  textAlign: "center",
  maxWidth: 260,
  lineHeight: 1.45,
};

const subirFotoCtaStyle: React.CSSProperties = {
  marginTop: 4,
  padding: "12px 22px",
  borderRadius: 14,
  border: "none",
  background: "#1e3a8a",
  color: "#fff",
  fontWeight: 900,
  fontSize: 15,
  boxShadow: "0 8px 20px rgba(30,58,138,0.25)",
};

const successFotoFlashStyle: React.CSSProperties = {
  background: "#ecfdf5",
  borderBottom: "1px solid #a7f3d0",
  color: "#065f46",
  padding: "10px 16px",
  fontSize: 14,
  fontWeight: 800,
  textAlign: "center",
};

const successFotoErrorStyle: React.CSSProperties = {
  background: "#fef2f2",
  borderBottom: "1px solid #fecaca",
  color: "#991b1b",
  padding: "10px 16px",
  fontSize: 13,
  fontWeight: 700,
  textAlign: "center",
};

const previewComunaStyle: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 800,
  color: "#2563eb",
  marginBottom: 8,
};

const previewTitleStyle: React.CSSProperties = {
  margin: "0 0 8px",
  fontSize: 22,
  lineHeight: 1.1,
  fontWeight: 900,
  color: "#111827",
};

const previewDescStyle: React.CSSProperties = {
  margin: "0 0 12px",
  color: "#4b5563",
  lineHeight: 1.6,
  fontSize: 14,
};

const previewButtonsRowStyle: React.CSSProperties = {
  display: "flex",
  gap: 10,
  flexWrap: "wrap",
};

const previewPrimaryBtnStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: 38,
  padding: "0 14px",
  borderRadius: 12,
  background: "#111827",
  color: "#fff",
  fontWeight: 800,
  fontSize: 13,
};

const previewGreenBtnStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: 38,
  padding: "0 14px",
  borderRadius: 12,
  background: "#22c55e",
  color: "#fff",
  fontWeight: 800,
  fontSize: 13,
};

const upgradeCardStyle: React.CSSProperties = {
  background: "#fff",
  border: "1px solid #e5e7eb",
  borderRadius: 28,
  padding: 24,
  boxShadow: "0 6px 18px rgba(15,23,42,0.04)",
};

const upgradeTitleStyle: React.CSSProperties = {
  margin: "0 0 10px",
  fontSize: 24,
  fontWeight: 900,
  lineHeight: 1.05,
  color: "#0f172a",
};

const upgradeTextStyle: React.CSSProperties = {
  margin: "0 0 16px",
  fontSize: 15,
  lineHeight: 1.65,
  color: "#4b5563",
};

const nextPendingBoxStyle: React.CSSProperties = {
  marginBottom: 16,
  padding: "12px 14px",
  borderRadius: 14,
  border: "1px solid #fde68a",
  background: "#fffbeb",
};

const nextPendingTitleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: 15,
  fontWeight: 900,
  color: "#92400e",
};

const nextPendingItemStyle: React.CSSProperties = {
  margin: "6px 0 0",
  fontSize: 14,
  fontWeight: 700,
  color: "#78350f",
};

const benefitsBoxStyle: React.CSSProperties = {
  display: "grid",
  gap: 10,
  marginBottom: 20,
  background: "#f8fafc",
  border: "1px solid #e5e7eb",
  borderRadius: 18,
  padding: 16,
};

const benefitItemStyle: React.CSSProperties = {
  fontSize: 14,
  lineHeight: 1.5,
  color: "#0f172a",
  fontWeight: 700,
};

const checklistBoxStyle: React.CSSProperties = {
  background: "#fff7ed",
  border: "1px solid #fdba74",
  borderRadius: 16,
  padding: 14,
};

const checklistTitleStyle: React.CSSProperties = {
  fontSize: 14,
  fontWeight: 900,
  color: "#9a3412",
  marginBottom: 8,
};

const checklistListStyle: React.CSSProperties = {
  margin: 0,
  paddingLeft: 18,
  fontSize: 13,
  lineHeight: 1.65,
  color: "#7c2d12",
};

const checklistOkStyle: React.CSSProperties = {
  fontSize: 14,
  fontWeight: 800,
  color: "#166534",
  textAlign: "center",
  padding: "8px 0",
};
