"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type ExpansionItem = {
  comuna_slug: string;
  comuna_nombre: string;
  region_nombre?: string;
  meta_emprendedores: number;
  total_emprendedores: number;
  total_vecinos: number;
  avance_porcentaje: number;
  estado: string;
};

type UltimoEmp = {
  id: string;
  nombre_emprendimiento?: string;
  categoria_referencial?: string;
  descripcion_corta?: string;
  created_at?: string;
};

function prettyEstado(v: string) {
  if (v === "activa") return "Activa";
  if (v === "lista_para_abrir") return "Lista para abrir";
  if (v === "casi_lista") return "Casi lista";
  if (v === "en_proceso") return "En proceso";
  return "Sin movimiento";
}

export default function ActivarComunaBox({ comuna }: { comuna: string }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [item, setItem] = useState<ExpansionItem | null>(null);
  const [ultimos, setUltimos] = useState<UltimoEmp[]>([]);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        setLoading(true);
        setError("");

        const res = await fetch(`/api/expansion/${comuna}`, {
          cache: "no-store",
        });

        const json = await res.json();

        if (!active) return;

        if (!res.ok || !json?.ok) {
          setError(json?.message || "No se pudo cargar el avance.");
          return;
        }

        setItem(json.item || null);
        setUltimos(Array.isArray(json.ultimos_emprendedores) ? json.ultimos_emprendedores : []);
      } catch {
        if (!active) return;
        setError("No se pudo cargar el avance.");
      } finally {
        if (active) setLoading(false);
      }
    }

    load();

    return () => {
      active = false;
    };
  }, [comuna]);

  const comunaNombre = useMemo(() => {
    return (
      item?.comuna_nombre ||
      comuna
        .replace(/-/g, " ")
        .replace(/\b\w/g, (l) => l.toUpperCase())
    );
  }, [item?.comuna_nombre, comuna]);

  const shareUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/abrir-comuna/${comuna}`
      : `/abrir-comuna/${comuna}`;

  const whatsappHref = `https://wa.me/?text=${encodeURIComponent(
    `Ayúdanos a abrir Rey del Dato en ${comunaNombre}. Si tienes emprendimiento o quieres usarlo cuando abra, inscríbete aquí: ${shareUrl}`
  )}`;

  if (loading) {
    return (
      <div style={boxStyle}>
        <div style={{ fontWeight: 800 }}>Cargando avance de {comunaNombre}...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={boxStyle}>
        <div style={{ color: "#b91c1c", fontWeight: 800 }}>{error}</div>
      </div>
    );
  }

  const inscritos = item?.total_emprendedores || 0;
  const interesados = item?.total_vecinos || 0;
  const meta = item?.meta_emprendedores || 40;
  const progreso = Math.max(0, Math.min(100, item?.avance_porcentaje || 0));
  const faltan = Math.max(meta - inscritos, 0);

  return (
    <div style={boxStyle}>
      <h2 style={titleStyle}>🚀 Rey del Dato aún no está activo en {comunaNombre}</h2>

      <p style={textStyle}>
        Estamos reuniendo emprendimientos y vecinos interesados para abrir esta comuna.
        Cuando alcancemos la meta inicial activaremos el buscador completo para {comunaNombre}.
      </p>

      <div style={{ marginBottom: 12, fontWeight: 800 }}>Avance actual</div>

      <div style={progressTrackStyle}>
        <div style={{ ...progressFillStyle, width: `${progreso}%` }} />
      </div>

      <div style={metricsStyle}>
        {inscritos} emprendimientos registrados · {interesados} vecinos interesados ·{" "}
        {progreso}% completado · faltan {faltan} para abrir
      </div>

      <div style={statusRowStyle}>
        <span>Estado: {prettyEstado(item?.estado || "")}</span>
        {item?.region_nombre ? <span>{item.region_nombre}</span> : null}
      </div>

      <div style={buttonRowStyle}>
        <Link href={`/abrir-comuna/${comuna}`} style={darkBtnStyle}>
          Registrar mi emprendimiento
        </Link>

        <Link href={`/abrir-comuna/${comuna}?tipo=vecino`} style={lightBtnStyle}>
          Avísenme cuando abra
        </Link>

        <a href={whatsappHref} target="_blank" rel="noreferrer" style={greenBtnStyle}>
          Compartir por WhatsApp
        </a>
      </div>

      <div style={{ marginTop: 14 }}>
        <Link href={`/abrir-comuna/${comuna}`} style={linkStyle}>
          Ver página completa de avance →
        </Link>
      </div>

      {ultimos.length > 0 ? (
        <div style={{ marginTop: 22 }}>
          <div style={{ fontWeight: 800, marginBottom: 10 }}>Últimos emprendimientos inscritos</div>

          <div style={{ display: "grid", gap: 10 }}>
            {ultimos.slice(0, 3).map((emp) => (
              <div key={emp.id} style={miniCardStyle}>
                <div style={{ fontWeight: 800, color: "#111827" }}>
                  {emp.nombre_emprendimiento || "Sin nombre"}
                </div>
                <div style={{ fontSize: 14, color: "#4b5563" }}>
                  {emp.categoria_referencial || "Sin categoría"}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

const boxStyle: React.CSSProperties = {
  marginTop: 32,
  borderRadius: 20,
  padding: 24,
  background: "#f8fafc",
  border: "1px solid #e5e7eb",
};

const titleStyle: React.CSSProperties = {
  fontSize: 28,
  fontWeight: 900,
  margin: "0 0 10px",
  color: "#111827",
};

const textStyle: React.CSSProperties = {
  color: "#4b5563",
  maxWidth: 760,
  marginBottom: 18,
  lineHeight: 1.6,
};

const progressTrackStyle: React.CSSProperties = {
  width: "100%",
  height: 14,
  background: "#e5e7eb",
  borderRadius: 999,
  overflow: "hidden",
  marginBottom: 10,
};

const progressFillStyle: React.CSSProperties = {
  background: "#22c55e",
  height: "100%",
};

const metricsStyle: React.CSSProperties = {
  fontSize: 14,
  color: "#4b5563",
  marginBottom: 14,
};

const statusRowStyle: React.CSSProperties = {
  display: "flex",
  gap: 14,
  flexWrap: "wrap",
  fontSize: 14,
  color: "#6b7280",
  marginBottom: 18,
};

const buttonRowStyle: React.CSSProperties = {
  display: "flex",
  gap: 12,
  flexWrap: "wrap",
};

const darkBtnStyle: React.CSSProperties = {
  padding: "12px 20px",
  borderRadius: 12,
  background: "#111827",
  color: "#fff",
  fontWeight: 700,
  textDecoration: "none",
};

const lightBtnStyle: React.CSSProperties = {
  padding: "12px 20px",
  borderRadius: 12,
  background: "#e5e7eb",
  color: "#111827",
  fontWeight: 700,
  textDecoration: "none",
};

const greenBtnStyle: React.CSSProperties = {
  padding: "12px 20px",
  borderRadius: 12,
  background: "#22c55e",
  color: "#fff",
  fontWeight: 700,
  textDecoration: "none",
};

const linkStyle: React.CSSProperties = {
  color: "#2563eb",
  textDecoration: "none",
  fontWeight: 700,
};

const miniCardStyle: React.CSSProperties = {
  border: "1px solid #e5e7eb",
  borderRadius: 12,
  padding: 12,
  background: "#fff",
};