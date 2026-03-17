import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

function s(v: unknown) {
  return String(v ?? "").trim();
}

function prettySlug(slug: string) {
  return slug
    .split("-")
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(" ");
}

async function getData(slug: string) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const [{ data: resumen }, { data: ultimosEmp }, { data: ultimosVec }] =
    await Promise.all([
      supabase
        .from("vw_comunas_por_abrir")
        .select("*")
        .eq("comuna_slug", slug)
        .maybeSingle(),

      supabase
        .from("comunas_pre_registro_emprendedores")
        .select("nombre_emprendimiento,categoria_referencial,created_at")
        .eq("comuna_slug", slug)
        .order("created_at", { ascending: false })
        .limit(5),

      supabase
        .from("comunas_pre_registro_vecinos")
        .select("created_at")
        .eq("comuna_slug", slug)
        .order("created_at", { ascending: false })
        .limit(5),
    ]);

  return {
    resumen,
    ultimosEmp: ultimosEmp || [],
    ultimosVec: ultimosVec || [],
  };
}

export default async function AbrirComunaPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const comunaNombre = prettySlug(slug);

  const { resumen, ultimosEmp } = await getData(slug);

  const totalEmprendedores = resumen?.total_emprendedores || 0;
  const totalVecinos = resumen?.total_vecinos || 0;
  const avance = Number(resumen?.avance_porcentaje || 0);
  const faltan = Number(resumen?.faltan_emprendedores_meta || 40);
  const shareUrl =
    `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/abrir-comuna/${slug}`;

  return (
    <main style={{ maxWidth: 1000, margin: "0 auto", padding: "36px 20px 60px" }}>
      <h1 style={{ fontSize: 42, fontWeight: 900, margin: "0 0 8px" }}>
        Ayúdanos a abrir Rey del Dato en {comunaNombre}
      </h1>

      <p style={{ fontSize: 17, color: "#4b5563", lineHeight: 1.6, marginBottom: 28 }}>
        Estamos activando comunas una por una. Cuando reunamos suficientes
        emprendimientos e interés local, abrimos {comunaNombre}.
      </p>

      <section style={cardStyle}>
        <div style={statsGridStyle}>
          <div style={statBoxStyle}>
            <div style={statNumberStyle}>{totalEmprendedores}</div>
            <div style={statLabelStyle}>Emprendimientos registrados</div>
          </div>

          <div style={statBoxStyle}>
            <div style={statNumberStyle}>{totalVecinos}</div>
            <div style={statLabelStyle}>Vecinos interesados</div>
          </div>

          <div style={statBoxStyle}>
            <div style={statNumberStyle}>{avance}%</div>
            <div style={statLabelStyle}>Avance estimado</div>
          </div>

          <div style={statBoxStyle}>
            <div style={statNumberStyle}>{faltan}</div>
            <div style={statLabelStyle}>Faltan para la meta</div>
          </div>
        </div>

        <div style={{ marginTop: 20 }}>
          <div style={progressTrackStyle}>
            <div
              style={{
                ...progressFillStyle,
                width: `${Math.max(0, Math.min(100, avance))}%`,
              }}
            />
          </div>
        </div>
      </section>

      <section style={twoColStyle}>
        <div style={cardStyle}>
          <h2 style={sectionTitleStyle}>¿Tienes un emprendimiento en {comunaNombre}?</h2>
          <p style={sectionTextStyle}>
            Déjanos tus datos y te avisaremos cuando abramos la comuna.
          </p>

          <form id="form-emprendedor" style={formStyle}>
            <input type="hidden" name="comuna_slug" value={slug} />
            <input type="hidden" name="comuna_nombre" value={comunaNombre} />

            <input name="nombre_contacto" placeholder="Tu nombre" style={inputStyle} />
            <input name="nombre_emprendimiento" placeholder="Nombre del emprendimiento" style={inputStyle} />
            <input name="categoria_referencial" placeholder="¿A qué te dedicas?" style={inputStyle} />
            <textarea name="descripcion_corta" placeholder="Descripción corta" style={textareaStyle} />
            <input name="whatsapp" placeholder="WhatsApp" style={inputStyle} />
            <input name="instagram" placeholder="Instagram (opcional)" style={inputStyle} />
            <input name="email" placeholder="Email (opcional)" style={inputStyle} />

            <button type="button" style={buttonStyle}>
              Registrar mi emprendimiento
            </button>
          </form>
        </div>

        <div style={cardStyle}>
          <h2 style={sectionTitleStyle}>¿Quieres usar Rey del Dato en {comunaNombre}?</h2>
          <p style={sectionTextStyle}>
            Déjanos tu WhatsApp o correo y te avisaremos cuando la comuna esté activa.
          </p>

          <form id="form-vecino" style={formStyle}>
            <input type="hidden" name="comuna_slug" value={slug} />
            <input type="hidden" name="comuna_nombre" value={comunaNombre} />
            <input name="contacto" placeholder="WhatsApp o correo" style={inputStyle} />

            <button type="button" style={buttonStyle}>
              Avísenme cuando abra
            </button>
          </form>

          <div style={{ marginTop: 28 }}>
            <h3 style={{ fontSize: 20, fontWeight: 900, marginBottom: 10 }}>
              Comparte este link para mover la comuna más rápido
            </h3>

            <div style={shareBoxStyle}>{shareUrl}</div>

            <a
              href={`https://wa.me/?text=${encodeURIComponent(
                `Rey del Dato se está activando en ${comunaNombre}. Si tienes emprendimiento o quieres usarlo cuando abra, inscríbete aquí: ${shareUrl}`
              )}`}
              target="_blank"
              rel="noreferrer"
              style={buttonSecondaryStyle}
            >
              Compartir por WhatsApp
            </a>
          </div>
        </div>
      </section>

      <section style={cardStyle}>
        <h2 style={sectionTitleStyle}>Últimos emprendimientos inscritos en {comunaNombre}</h2>

        {ultimosEmp.length === 0 ? (
          <p style={sectionTextStyle}>Aún no hay emprendimientos registrados en esta comuna.</p>
        ) : (
          <div style={{ display: "grid", gap: 12 }}>
            {ultimosEmp.map((item: any, i: number) => (
              <div key={`${item.nombre_emprendimiento}-${i}`} style={lastItemStyle}>
                <div style={{ fontWeight: 800, color: "#111827" }}>
                  {item.nombre_emprendimiento}
                </div>
                <div style={{ color: "#6b7280", fontSize: 14 }}>
                  {s(item.categoria_referencial) || "Sin categoría referencial"}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

const cardStyle: React.CSSProperties = {
  border: "1px solid #e5e7eb",
  borderRadius: 22,
  padding: 22,
  background: "#fff",
  marginBottom: 24,
};

const statsGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(4, minmax(0,1fr))",
  gap: 14,
};

const statBoxStyle: React.CSSProperties = {
  border: "1px solid #eef2f7",
  borderRadius: 18,
  padding: 16,
  background: "#f9fafb",
};

const statNumberStyle: React.CSSProperties = {
  fontSize: 32,
  fontWeight: 900,
  color: "#111827",
  lineHeight: 1,
};

const statLabelStyle: React.CSSProperties = {
  marginTop: 8,
  fontSize: 14,
  color: "#6b7280",
};

const progressTrackStyle: React.CSSProperties = {
  width: "100%",
  height: 14,
  borderRadius: 999,
  background: "#e5e7eb",
  overflow: "hidden",
};

const progressFillStyle: React.CSSProperties = {
  height: "100%",
  borderRadius: 999,
  background: "#111827",
};

const twoColStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 20,
};

const sectionTitleStyle: React.CSSProperties = {
  fontSize: 26,
  fontWeight: 900,
  margin: "0 0 8px",
  color: "#111827",
};

const sectionTextStyle: React.CSSProperties = {
  fontSize: 15,
  lineHeight: 1.6,
  color: "#4b5563",
  marginBottom: 18,
};

const formStyle: React.CSSProperties = {
  display: "grid",
  gap: 12,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  height: 48,
  borderRadius: 14,
  border: "1px solid #d1d5db",
  padding: "0 14px",
  fontSize: 15,
};

const textareaStyle: React.CSSProperties = {
  width: "100%",
  minHeight: 100,
  borderRadius: 14,
  border: "1px solid #d1d5db",
  padding: "12px 14px",
  fontSize: 15,
  resize: "vertical",
};

const buttonStyle: React.CSSProperties = {
  height: 48,
  borderRadius: 14,
  border: "none",
  background: "#111827",
  color: "#fff",
  fontWeight: 800,
  cursor: "pointer",
};

const buttonSecondaryStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  marginTop: 14,
  minHeight: 46,
  padding: "0 18px",
  borderRadius: 12,
  background: "#25D366",
  color: "#fff",
  textDecoration: "none",
  fontWeight: 800,
};

const shareBoxStyle: React.CSSProperties = {
  border: "1px solid #d1d5db",
  borderRadius: 12,
  padding: 12,
  background: "#f9fafb",
  fontSize: 14,
  color: "#374151",
  wordBreak: "break-all",
};

const lastItemStyle: React.CSSProperties = {
  border: "1px solid #eef2f7",
  borderRadius: 14,
  padding: 14,
  background: "#fff",
};