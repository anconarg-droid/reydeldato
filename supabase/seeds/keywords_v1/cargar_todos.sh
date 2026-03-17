#!/usr/bin/env bash
# Carga todos los bloques de keywords v1 en Supabase.
# Uso: DATABASE_URL="postgresql://..." ./cargar_todos.sh
# O desde raíz del repo: cd supabase/seeds/keywords_v1 && ./cargar_todos.sh

set -e
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$DIR"

if [ -z "$DATABASE_URL" ]; then
  echo "Falta DATABASE_URL. Ejemplo:"
  echo '  export DATABASE_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT].supabase.co:5432/postgres"'
  echo "  $0"
  exit 1
fi

for f in 01_hogar_construccion.sql 02_automotriz.sql 03_comida.sql 04_belleza.sql 05_mascotas.sql 06_comercio_barrio.sql 07_tecnologia.sql 08_salud.sql 09_educacion.sql 10_eventos.sql; do
  echo "Cargando $f..."
  psql "$DATABASE_URL" -f "$f"
done
echo "Listo: 10 bloques cargados."
