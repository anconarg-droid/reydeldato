import NegocioForm from "@/app/components/panel/NegocioForm";

export default function NuevoNegocioPage({
  searchParams,
}: {
  searchParams?: Promise<{ id?: string }>;
}) {
  const spPromise = searchParams || Promise.resolve({});

  return (
    <main
      style={{
        maxWidth: 1100,
        margin: "0 auto",
        padding: "32px 20px 80px",
      }}
    >
      <section style={{ marginBottom: 24 }}>
        <h1
          style={{
            margin: "0 0 10px 0",
            fontSize: 42,
            lineHeight: 1.02,
            letterSpacing: "-0.03em",
            fontWeight: 900,
            color: "#111827",
          }}
        >
          Publicar negocio
        </h1>

        <p
          style={{
            margin: 0,
            fontSize: 17,
            lineHeight: 1.6,
            color: "#4b5563",
            maxWidth: 860,
          }}
        >
          Completa la información principal de tu negocio para publicar tu ficha
          en Rey del Dato. Mientras más clara sea tu información, más fácil será
          que te encuentren y te contacten.
        </p>
      </section>

      {/* Resolver searchParams en el servidor y pasar id al formulario */}
      {/* eslint-disable-next-line react/jsx-no-useless-fragment */}
      <AsyncWrapper spPromise={spPromise} />
    </main>
  );
}

async function AsyncWrapper({
  spPromise,
}: {
  spPromise: Promise<{ id?: string }>;
}) {
  const sp = await spPromise;
  const id = sp?.id || "";
  return <NegocioForm id={id} />;
}
