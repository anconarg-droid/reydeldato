import { redirect } from "next/navigation";
import { isOrigenActivacionAbrirComuna } from "@/lib/origenActivacionAbrirComuna";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams?: Promise<{
    comuna?: string;
    q?: string;
    categoria?: string;
    /** P. ej. `abrir-comuna`: se reenvía a `/{comuna}` para no rebotar al landing de activación. */
    origen?: string;
  }>;
};

export default async function BuscarPage({ searchParams }: PageProps) {
  const params = searchParams ? await searchParams : {};
  const categoria = params?.categoria?.trim();
  const comuna = params?.comuna?.trim();
  const q = params?.q?.trim();
  const origen = params?.origen?.trim();

  if (categoria) {
    redirect(`/categoria/${encodeURIComponent(categoria)}`);
  }

  if (comuna && q) {
    redirect(`/${encodeURIComponent(comuna)}?q=${encodeURIComponent(q)}`);
  }

  if (comuna) {
    redirect(`/${encodeURIComponent(comuna)}`);
  }

  if (q) {
    redirect(`/resultados?q=${encodeURIComponent(q)}`);
  }

  redirect("/");
}