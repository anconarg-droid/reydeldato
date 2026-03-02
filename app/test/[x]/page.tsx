export default async function Page({
  params,
}: {
  params: Promise<{ x: string }>;
}) {
  const { x } = await params;

  return (
    <div style={{ padding: 40 }}>
      <h1>TEST DINÁMICO</h1>
      <p>
        x: <b>{x}</b>
      </p>
      <pre>{JSON.stringify({ x }, null, 2)}</pre>
    </div>
  );
}