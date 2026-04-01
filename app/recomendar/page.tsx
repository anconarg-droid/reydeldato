import Link from "next/link";
import HomeRecomienda from "@/components/home/HomeRecomienda";

export const metadata = {
  title: "Recomendar emprendimiento | Rey del Dato",
  description:
    "Sugiere un negocio local para invitarlo a publicar en Rey del Dato.",
};

export default function RecomendarPage() {
  return (
    <main className="min-h-screen bg-white text-slate-900">
      <div className="max-w-6xl mx-auto px-4 py-6">
        <Link href="/" className="text-sm text-slate-600 hover:text-slate-900 font-medium">
          ← Volver al inicio
        </Link>
        <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
          Rey del Dato
        </p>
        <h1 className="mt-1 text-2xl font-bold text-slate-900">Recomendar emprendimiento</h1>
      </div>
      <HomeRecomienda />
    </main>
  );
}
