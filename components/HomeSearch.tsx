type ComunaOption = {
  slug: string;
  nombre: string;
};

type Props = {
  comunas: ComunaOption[];
};

export default function HomeSearch({ comunas }: Props) {
  return (
    <form
      action="/buscar"
      method="get"
      className="flex flex-col sm:flex-row gap-3 w-full max-w-3xl"
    >
      <input
        type="text"
        name="q"
        placeholder="¿Qué estás buscando?"
        className="flex-1 h-12 px-4 rounded-xl border border-slate-300 bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-slate-400"
      />

      <select
        name="comuna"
        className="h-12 px-3 rounded-xl border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-slate-400 sm:w-56"
      >
        <option value="">Todas las comunas</option>
        {comunas.map((c) => (
          <option key={c.slug} value={c.slug}>
            {c.nombre}
          </option>
        ))}
      </select>

      <button
        type="submit"
        className="h-12 px-5 rounded-xl bg-slate-900 text-white font-semibold hover:bg-slate-800 transition"
      >
        Buscar
      </button>
    </form>
  );
}

