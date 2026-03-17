-- Tabla de alias de intención para el buscador.
-- Mapear frases de usuario -> tag_slug de clasificación.

CREATE TABLE IF NOT EXISTS search_alias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  alias text NOT NULL,      -- frase tal como la guardamos (idealmente ya normalizada)
  tag_slug text NOT NULL,   -- slug de tag/clasificación, ej: 'mecanico', 'gasfiter'
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Alias únicos (normalizados) para evitar duplicados.
CREATE UNIQUE INDEX IF NOT EXISTS uq_search_alias_alias
  ON search_alias (alias);

