/**
 * Diff enriquecido para moderación: listas (±), imágenes sin URLs crudas, campos críticos.
 */
import {
  etiquetaModalidadAtencion,
  modalidadesAtencionInputsToDbUnique,
} from "@/lib/modalidadesAtencion";
import {
  readKeywordsUsuarioFromPostulacionRow,
  readKeywordsUsuarioPreferJson,
} from "@/lib/keywordsUsuarioPostulacion";

export type AdminRevisionFieldDisplay =
  | { type: "unchanged"; text: string }
  | { type: "scalar"; antes: string; ahora: string }
  | { type: "list"; removed: string[]; added: string[] }
  | { type: "foto_principal"; variant: "single"; url: string | null }
  | { type: "foto_principal"; variant: "compare"; antesUrl: string | null; ahoraUrl: string | null }
  | { type: "galeria"; variant: "unchanged"; urls: string[] }
  | { type: "galeria"; variant: "diff"; removed: string[]; added: string[]; kept: string[] };

export type AdminRevisionFieldRow = {
  key: string;
  label: string;
  changed: boolean;
  /** Categoría, galería, WhatsApp: disparan alerta superior si cambian */
  critical: boolean;
  /** Antes tenía valor y ahora queda vacío */
  isDeletion: boolean;
  display: AdminRevisionFieldDisplay;
};

export type AdminRevisionBuildResult = {
  fields: AdminRevisionFieldRow[];
  /** Etiquetas de campos con cambios (para resumen) */
  resumenCambios: string[];
  /** Algún campo crítico cambió */
  tieneCambiosCriticos: boolean;
};

function s(v: unknown): string {
  if (v === null || v === undefined) return "";
  return String(v).trim();
}

function isEmptyText(t: string): boolean {
  return !t || t === "—";
}

function toStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.map((x) => s(x)).filter(Boolean);
}

/** Comparación estable sin duplicados visuales */
function normalizeListItem(x: string): string {
  return s(x).toLowerCase();
}

function listDiff(beforeRaw: string[], afterRaw: string[]): { removed: string[]; added: string[] } {
  const before = beforeRaw.map((x) => s(x)).filter(Boolean);
  const after = afterRaw.map((x) => s(x)).filter(Boolean);
  const beforeSet = new Map<string, string>();
  for (const b of before) {
    beforeSet.set(normalizeListItem(b), b);
  }
  const afterSet = new Map<string, string>();
  for (const a of after) {
    afterSet.set(normalizeListItem(a), a);
  }
  const removed: string[] = [];
  for (const [k, v] of beforeSet) {
    if (!afterSet.has(k)) removed.push(v);
  }
  const added: string[] = [];
  for (const [k, v] of afterSet) {
    if (!beforeSet.has(k)) added.push(v);
  }
  return { removed, added };
}

/** URLs que siguen en ambas versiones (orden del borrador / después). */
function galleryKeptUrls(beforeRaw: string[], afterRaw: string[]): string[] {
  const before = beforeRaw.map((x) => s(x)).filter(Boolean);
  const after = afterRaw.map((x) => s(x)).filter(Boolean);
  const beforeKeys = new Set(before.map(normalizeListItem));
  const kept: string[] = [];
  const seen = new Set<string>();
  for (const u of after) {
    const k = normalizeListItem(u);
    if (beforeKeys.has(k) && !seen.has(k)) {
      seen.add(k);
      kept.push(u);
    }
  }
  return kept;
}

function listsEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const sa = [...a].map(normalizeListItem).sort();
  const sb = [...b].map(normalizeListItem).sort();
  return sa.every((v, i) => v === sb[i]);
}

export type AdminRevisionBuildContext = {
  post: Record<string, unknown>;
  emp: Record<string, unknown> | null;
  empModalidades: string[];
  empGaleriaUrls: string[];
  postCategoriaNombre?: string | null;
  empCategoriaNombre?: string | null;
  postComunaNombre?: string | null;
  empComunaNombre?: string | null;
  /** Texto multilínea: cada local con comuna, dirección y referencia (postulación). */
  postLocalesDetalle?: string | null;
  /** Igual que post, desde `emprendedor_locales` + nombres de comuna. */
  empLocalesDetalle?: string | null;
};

const CRITICAL_KEYS = new Set([
  "categoria",
  "galeria_urls",
  "whatsapp_principal",
  "whatsapp_secundario",
]);

export function buildAdminRevisionDiff(ctx: AdminRevisionBuildContext): AdminRevisionBuildResult {
  const {
    post,
    emp,
    empModalidades,
    empGaleriaUrls,
    postCategoriaNombre,
    empCategoriaNombre,
    postComunaNombre,
    empComunaNombre,
    postLocalesDetalle,
    empLocalesDetalle,
  } = ctx;

  const postNombre = s(post.nombre_emprendimiento) || s(post.nombre);
  const empNombre = emp ? s(emp.nombre_emprendimiento) || s(emp.nombre) : "";

  const postWhatsapp = s(post.whatsapp_principal) || s(post.whatsapp);
  const empWhatsapp = emp ? s(emp.whatsapp_principal) || s(emp.whatsapp) : "";

  const postWeb = s(post.sitio_web) || s(post.web);
  const empWeb = emp ? s(emp.sitio_web) || s(emp.web) : "";

  const postGaleriaArr = toStringArray(post.galeria_urls).slice(0, 16);
  const empGaleriaArr = [...empGaleriaUrls].map((x) => s(x)).filter(Boolean).slice(0, 16);

  const toModalidadLabel = (raw: string): string => {
    const lab = etiquetaModalidadAtencion(raw);
    return lab || s(raw);
  };

  /** Misma normalización que BD/pivot; el diff es sobre valores canónicos, no etiquetas mezcladas. */
  const postModsCanon = modalidadesAtencionInputsToDbUnique(
    toStringArray(post.modalidades_atencion)
  );
  const empModsCanon = modalidadesAtencionInputsToDbUnique([...empModalidades]);

  const postComunasArr = toStringArray(post.comunas_cobertura);
  const empComunasArr = toStringArray(emp?.comunas_cobertura);

  const postRegionesArr = toStringArray(post.regiones_cobertura);
  const empRegionesArr = toStringArray(emp?.regiones_cobertura);

  const postCatLabel =
    s(postCategoriaNombre) || (s(post.categoria_id) ? s(post.categoria_id) : "");
  const empCatLabel =
    s(empCategoriaNombre) || (emp && s(emp.categoria_id) ? s(emp.categoria_id) : "");

  const postComunaLabel =
    s(postComunaNombre) || (s(post.comuna_base_id) ? s(post.comuna_base_id) : "");
  const empComunaLabel =
    s(empComunaNombre) || (emp && s(emp.comuna_id) ? s(emp.comuna_id) : "");

  const postLocalesDetalleText = s(postLocalesDetalle ?? "") || "—";
  const empLocalesDetalleText = emp ? s(empLocalesDetalle ?? "") || "—" : "—";

  const postKwList = readKeywordsUsuarioFromPostulacionRow(post as Record<string, unknown>);
  const postKwText = postKwList.join(", ") || "—";
  const empKwList = emp ? readKeywordsUsuarioPreferJson(emp as Record<string, unknown>) : [];
  const empKwText = empKwList.join(", ") || "—";

  const postFotoUrl = s(post.foto_principal_url);
  const empFotoUrl = emp ? s(emp.foto_principal_url) : "";

  type Def =
    | {
        key: string;
        label: string;
        critical: boolean;
        kind: "scalar";
        antes: string;
        ahora: string;
      }
    | {
        key: string;
        label: string;
        critical: boolean;
        kind: "list";
        antes: string[];
        ahora: string[];
      }
    | {
        key: string;
        label: string;
        critical: boolean;
        kind: "foto_principal";
        antesUrl: string | null;
        ahoraUrl: string | null;
      }
    | {
        key: string;
        label: string;
        critical: boolean;
        kind: "galeria";
        antes: string[];
        ahora: string[];
      };

  const defs: Def[] = [
    {
      key: "nombre",
      label: "Nombre del emprendimiento",
      critical: false,
      kind: "scalar",
      antes: emp ? (empNombre || "—") : "—",
      ahora: postNombre || "—",
    },
    {
      key: "frase_negocio",
      label: "Frase / descripción corta",
      critical: false,
      kind: "scalar",
      antes: emp ? s(emp.frase_negocio) || "—" : "—",
      ahora: s(post.frase_negocio) || "—",
    },
    {
      key: "descripcion_libre",
      label: "Descripción",
      critical: false,
      kind: "scalar",
      antes: emp ? s(emp.descripcion_libre) || "—" : "—",
      ahora: s(post.descripcion_libre) || "—",
    },
    {
      key: "keywords_usuario",
      label: "Palabras clave del postulante",
      critical: false,
      kind: "scalar",
      antes: empKwText,
      ahora: postKwText,
    },
    {
      key: "email",
      label: "Email",
      critical: false,
      kind: "scalar",
      antes: emp ? s(emp.email) || "—" : "—",
      ahora: s(post.email) || "—",
    },
    {
      key: "whatsapp_principal",
      label: "WhatsApp principal",
      critical: true,
      kind: "scalar",
      antes: emp ? empWhatsapp || "—" : "—",
      ahora: postWhatsapp || "—",
    },
    {
      key: "whatsapp_secundario",
      label: "WhatsApp secundario",
      critical: true,
      kind: "scalar",
      antes: emp ? s(emp.whatsapp_secundario) || "—" : "—",
      ahora: s(post.whatsapp_secundario) || "—",
    },
    {
      key: "instagram",
      label: "Instagram",
      critical: false,
      kind: "scalar",
      antes: emp ? s(emp.instagram) || "—" : "—",
      ahora: s(post.instagram) || "—",
    },
    {
      key: "sitio_web",
      label: "Sitio web",
      critical: false,
      kind: "scalar",
      antes: emp ? empWeb || "—" : "—",
      ahora: postWeb || "—",
    },
    {
      key: "nombre_responsable",
      label: "Nombre responsable",
      critical: false,
      kind: "scalar",
      antes: emp ? s(emp.nombre_responsable) || "—" : "—",
      ahora: s(post.nombre_responsable) || "—",
    },
    {
      key: "mostrar_responsable_publico",
      label: "Mostrar responsable público",
      critical: false,
      kind: "scalar",
      antes: emp ? (emp.mostrar_responsable_publico === true ? "Sí" : "No") : "—",
      ahora: post.mostrar_responsable_publico === true ? "Sí" : "No",
    },
    {
      key: "foto_principal_url",
      label: "Foto principal",
      critical: false,
      kind: "foto_principal",
      antesUrl: empFotoUrl || null,
      ahoraUrl: postFotoUrl || null,
    },
    {
      key: "galeria_urls",
      label: "Galería",
      critical: true,
      kind: "galeria",
      antes: empGaleriaArr,
      ahora: postGaleriaArr,
    },
    {
      key: "cobertura_tipo",
      label: "Tipo de cobertura",
      critical: false,
      kind: "scalar",
      antes: emp ? s(emp.cobertura_tipo) || "—" : "—",
      ahora: s(post.cobertura_tipo) || "—",
    },
    {
      key: "comunas_cobertura",
      label: "Comunas de cobertura",
      critical: false,
      kind: "list",
      antes: empComunasArr,
      ahora: postComunasArr,
    },
    {
      key: "regiones_cobertura",
      label: "Regiones de cobertura",
      critical: false,
      kind: "list",
      antes: empRegionesArr,
      ahora: postRegionesArr,
    },
    {
      key: "comuna_base",
      label: "Comuna base",
      critical: false,
      kind: "scalar",
      antes: emp ? empComunaLabel || "—" : "—",
      ahora: postComunaLabel || "—",
    },
    {
      key: "categoria",
      label: "Categoría",
      critical: true,
      kind: "scalar",
      antes: emp ? empCatLabel || "—" : "—",
      ahora: postCatLabel || "—",
    },
    {
      key: "modalidades_atencion",
      label: "Modalidades de atención",
      critical: false,
      kind: "list",
      antes: empModsCanon,
      ahora: postModsCanon,
    },
    {
      key: "locales_fisicos_detalle",
      label: "Locales físicos (detalle)",
      critical: false,
      kind: "scalar",
      antes: empLocalesDetalleText,
      ahora: postLocalesDetalleText,
    },
    {
      key: "direccion",
      label: "Dirección (texto)",
      critical: false,
      kind: "scalar",
      antes: emp ? s(emp.direccion) || "—" : "—",
      ahora: s(post.direccion) || "—",
    },
    {
      key: "direccion_referencia",
      label: "Referencia dirección",
      critical: false,
      kind: "scalar",
      antes: emp ? s(emp.direccion_referencia) || "—" : "—",
      ahora: s(post.direccion_referencia) || "—",
    },
  ];

  const fields: AdminRevisionFieldRow[] = [];
  const resumenCambios: string[] = [];
  let tieneCambiosCriticos = false;

  for (const d of defs) {
    const critical = CRITICAL_KEYS.has(d.key) || d.critical;

    if (!emp) {
      if (d.kind === "scalar") {
        if (isEmptyText(d.ahora)) continue;
        fields.push({
          key: d.key,
          label: d.label,
          changed: true,
          critical,
          isDeletion: false,
          display: { type: "scalar", antes: "—", ahora: d.ahora },
        });
        resumenCambios.push(d.label);
        if (critical) tieneCambiosCriticos = true;
      } else if (d.kind === "list") {
        if (d.ahora.length === 0) continue;
        fields.push({
          key: d.key,
          label: d.label,
          changed: true,
          critical,
          isDeletion: false,
          display: { type: "list", removed: [], added: d.ahora },
        });
        resumenCambios.push(d.label);
      } else if (d.kind === "foto_principal") {
        if (!d.ahoraUrl) continue;
        fields.push({
          key: d.key,
          label: d.label,
          changed: true,
          critical: false,
          isDeletion: false,
          display: {
            type: "foto_principal",
            variant: "compare",
            antesUrl: null,
            ahoraUrl: d.ahoraUrl,
          },
        });
        resumenCambios.push(d.label);
      } else if (d.kind === "galeria") {
        if (d.ahora.length === 0) continue;
        fields.push({
          key: d.key,
          label: d.label,
          changed: true,
          critical: true,
          isDeletion: false,
          display: {
            type: "galeria",
            variant: "diff",
            removed: [],
            added: d.ahora,
            kept: [],
          },
        });
        resumenCambios.push(d.label);
        tieneCambiosCriticos = true;
      }
      continue;
    }

    let changed = false;
    let isDeletion = false;
    let display: AdminRevisionFieldDisplay;

    if (d.kind === "scalar") {
      const antes = d.antes;
      const ahora = d.ahora;
      changed = antes.trim() !== ahora.trim();
      isDeletion = changed && !isEmptyText(antes) && isEmptyText(ahora);
      display = changed
        ? { type: "scalar", antes, ahora }
        : { type: "unchanged", text: antes };
    } else if (d.kind === "list") {
      changed = !listsEqual(d.antes, d.ahora);
      const { removed, added } = listDiff(d.antes, d.ahora);
      isDeletion = removed.length > 0 && added.length === 0;
      if (d.key === "modalidades_atencion") {
        const removedL = removed.map(toModalidadLabel);
        const addedL = added.map(toModalidadLabel);
        display = changed
          ? { type: "list", removed: removedL, added: addedL }
          : {
              type: "unchanged",
              text: d.antes.length ? d.antes.map(toModalidadLabel).join(", ") : "—",
            };
      } else {
        display = changed
          ? { type: "list", removed, added }
          : { type: "unchanged", text: d.antes.length ? d.antes.join(", ") : "—" };
      }
    } else if (d.kind === "foto_principal") {
      const bu = d.antesUrl;
      const au = d.ahoraUrl;
      changed = s(bu || "") !== s(au || "");
      isDeletion = changed && !!s(bu || "") && !s(au || "");
      display = changed
        ? { type: "foto_principal", variant: "compare", antesUrl: bu, ahoraUrl: au }
        : { type: "foto_principal", variant: "single", url: bu || null };
    } else {
      const { removed, added } = listDiff(d.antes, d.ahora);
      const kept = galleryKeptUrls(d.antes, d.ahora);
      changed = removed.length > 0 || added.length > 0;
      isDeletion = removed.length > 0 && added.length === 0;
      display = changed
        ? { type: "galeria", variant: "diff", removed, added, kept }
        : {
            type: "galeria",
            variant: "unchanged",
            urls: d.ahora.length ? d.ahora : d.antes,
          };
    }

    fields.push({
      key: d.key,
      label: d.label,
      changed,
      critical,
      isDeletion,
      display,
    });

    if (changed) {
      resumenCambios.push(d.label);
      if (critical) tieneCambiosCriticos = true;
    }
  }

  return { fields, resumenCambios, tieneCambiosCriticos };
}

