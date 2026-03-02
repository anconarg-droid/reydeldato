import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-3xl font-black">No encontramos este emprendedor</h1>
      <p className="mt-3 opacity-80">
        Puede que el enlace esté mal escrito o que aún no esté publicado.
      </p>

      <div className="mt-6 flex flex-wrap gap-2">
        <Link href="/" className="rounded-xl border px-4 py-2 font-black hover:bg-gray-50">
          Ir al inicio
        </Link>
        <Link
          href="/publicar"
          className="rounded-xl border px-4 py-2 font-black hover:bg-gray-50"
        >
          Publicar mi negocio
        </Link>
      </div>
    </div>
  );
}