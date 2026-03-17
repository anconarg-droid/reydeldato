# Diccionario de keywords v1 – Rey del Dato

Semilla de **~2.000 keywords** chilenas mapeadas a subcategorías oficiales, organizadas en 10 bloques para carga progresiva en Supabase.

## Objetivo

Construir el diccionario grande por bloques hasta **8.500 keywords**. Esta v1 entrega 2.000 iniciales.

## Requisitos

- Migraciones de taxonomía aplicadas (categorías, subcategorías, `keyword_to_subcategory_map` con `UNIQUE(normalized_keyword)`).
- Orden recomendado: ejecutar después de `20260330000000_taxonomia_v1_oficial.sql`.

## Bloques

| Archivo | Bloque | Subcategorías cubiertas |
|---------|--------|-------------------------|
| `01_hogar_construccion.sql` | Hogar y construcción | gasfiter, electricista, muebles_a_medida, albañilería, pintura, carpintería, limpieza_hogar, jardinería, instalación gas, techumbre, vidriería, cerrajería, tapicería, climatización, mudanzas_fletes, luminarias, revestimientos, drywall, piso_flotante, herrería, soldadura, demolición, aislación, impermeabilización |
| `02_automotriz.sql` | Automotriz | vulcanización, neumáticos, mecánico, fletes, lubricentro, lavado_autos, electricidad_automotriz, carrocería_pintura, grúa_remolque, mantencion_flota, venta_vehiculos, auto_electrico, lavado_vehiculos |
| `03_comida.sql` | Comida | panadería, pastelería, empanadas, comida_casera, pizzas, café, sandwichería, carnicería, verdulería, cevichería, rotisería, pollería, sushi, comida china, pescados_mariscos, productos_organicos, comida_vegana, chocolatería, heladería, catering, restaurant, fuente_soda, bar_tragos |
| `04_belleza.sql` | Belleza | peluquería, barbería, manicure, estética_facial, spa_masajes, depilación, maquillaje |
| `05_mascotas.sql` | Mascotas | veterinaria, peluquería_canina, pensión_guarderia, tienda_mascotas, adiestramiento, transporte_mascotas |
| `06_comercio_barrio.sql` | Comercio de barrio | ferretería, minimarket, supermercado, ropa_moda, calzado, librería, juguetería, bazar, floreria, bicicletas, electrónica, artículos_deportivos, bebidas_licores, lácteos_quesos |
| `07_tecnologia.sql` | Tecnología | reparación_celulares, reparación_computadores, reparación_notebooks, instalación_redes, desarrollo_software, impresión_diseño, antenas_television |
| `08_salud.sql` | Salud | odontología, kinesiología, nutrición, psicología, fonoaudiología, óptica, farmacia, podología, terapia_ocupacional, enfermería_domicilio, medicina_general, terapias_alternativas |
| `09_educacion.sql` | Educación | clases, reforzamiento_escolar, capacitación_empresarial, cursos_tecnicos, cursos_online, idiomas, música, guitarra_instrumentos, preuniversitario, computación, danza, arte_manualidades, talleres_creativos |
| `10_eventos.sql` | Eventos | salón_eventos, salón_fiestas, organizacion_eventos, catering, pastelería_eventos, animación_fiestas, animación_infantil, dj_sonido, decoración_eventos, bar_tragos, carro_comida, food_truck, paseos_turismo, camping |

## Formato de cada keyword

- **keyword**: texto tal como lo escribe o dice el usuario (ej. "gasfitería", "pan amasado").
- **normalized_keyword**: forma slug para matching (minúsculas, sin acentos, espacios/guiones → guión). Debe ser **única** en la tabla.
- **subcategoria_id**: resuelto en el SQL por `JOIN subcategorias s ON s.slug = v.sub_slug`.
- **confidence_default**: 0.7–1.0 según precisión del término.
- **activo**: `true`.

## Evitar duplicados

Cada archivo usa:

```sql
ON CONFLICT (normalized_keyword) DO UPDATE SET
  keyword = EXCLUDED.keyword,
  subcategoria_id = EXCLUDED.subcategoria_id,
  confidence_default = EXCLUDED.confidence_default,
  updated_at = now();
```

Así puedes cargar el mismo bloque más de una vez o cargar bloques en cualquier orden sin duplicar filas por `normalized_keyword`.

## Cómo cargar en Supabase

### Opción 1: Todos los bloques en orden (bash)

Desde la raíz del proyecto:

```bash
cd supabase/seeds/keywords_v1
for f in 01_hogar_construccion.sql 02_automotriz.sql 03_comida.sql 04_belleza.sql 05_mascotas.sql 06_comercio_barrio.sql 07_tecnologia.sql 08_salud.sql 09_educacion.sql 10_eventos.sql; do
  psql "$DATABASE_URL" -f "$f"
done
```

### Opción 2: Un solo bloque

```bash
psql "$DATABASE_URL" -f supabase/seeds/keywords_v1/01_hogar_construccion.sql
```

### Opción 3: Supabase CLI (link a proyecto)

```bash
supabase db execute -f supabase/seeds/keywords_v1/01_hogar_construccion.sql
```

Sustituir `DATABASE_URL` por tu connection string (o usar el que da el dashboard de Supabase).

## Próximos pasos (hacia 8.500)

1. Revisar cobertura por subcategoría y sumar sinónimos/variantes por bloque.
2. Agregar nuevos archivos por bloque (ej. `01_hogar_construccion_2.sql`) o ampliar los existentes.
3. Mantener siempre `ON CONFLICT (normalized_keyword) DO UPDATE` y normalización consistente con `classifyBusiness.ts` (toSlugForm).
