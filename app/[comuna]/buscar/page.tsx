// app/[comuna]/buscar/page.tsx
import { redirect } from "next/navigation";

export default function Page({
  params,
  searchParams,
}: {
  params: { comuna: string };
  searchParams: { q?: string; debug?: string };
}) {
  const q = (searchParams.q || "").trim();
  const debug = (searchParams.debug || "").trim();
  const comuna = params.comuna;

  const qs = new URLSearchParams();
  if (q) qs.set("q", q);
  if (comuna) qs.set("comuna", comuna);
  if (debug) qs.set("debug", debug);

  redirect(`/buscar?${qs.toString()}`);
}