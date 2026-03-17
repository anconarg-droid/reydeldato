# Diagnóstico y script de prueba – apertura de comunas

## 1. Diagnóstico de columnas obligatorias de `public.emprendedores`

La tabla `emprendedores` no se crea en las migraciones de este repo (se asume existente). Para obtener el estado **real** de tu base en Supabase, ejecuta en el SQL Editor:

```sql
SELECT
  column_name AS columna,
  data_type AS tipo,
  is_nullable AS nullable,
  column_default AS tiene_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'emprendedores'
ORDER BY ordinal_position;
```

Interpretación:
- **nullable = 'NO'** → obligatorio en el INSERT (o debe tener default).
- **tiene_default** no vacío → se puede omitir en el INSERT.

### Resumen inferido desde migraciones y código (repo)

| Columna | Origen | NOT NULL (inferido) | Default (inferido) |
|--------|--------|----------------------|--------------------|
| id | tabla base | sí (PK) | gen_random_uuid() |
| slug | vista + app | sí (error reportado) | — |
| nombre | vista + app | probable | — |
| descripcion_corta | vista + borrador | nullable en borrador | — |
| descripcion_larga | vista + borrador | null en borrador | — |
| categoria_id | vista + borrador | null en borrador | — |
| comuna_base_id | vista + FK | sí (FK) | — |
| direccion | borrador | null | — |
| nivel_cobertura | vista + app | sí (error reportado) | — |
| cobertura | app | — | — |
| coverage_keys | vista + app | — | — |
| coverage_labels | vista + app | — | — |
| modalidades_atencion | app | [] en borrador | — |
| whatsapp, instagram, sitio_web, web, email | vista + borrador | — | — |
| responsable_nombre, mostrar_responsable | app | — | — |
| keywords | vista + app | [] en borrador | — |
| tipo_actividad | migración + app | check venta/servicio/arriendo | — |
| sector_slug | migración + vista | FK sectores(slug) | — |
| tags_slugs, keywords_clasificacion, clasificacion_confianza, clasificacion_fuente | migración + app | — | — |
| foto_principal_url, galeria_urls | vista + borrador | — | — |
| estado | borrador + vista | — | — |
| estado_publicacion | vista (filtro publicado) | — | — |
| form_completo | migración 20260316 | NOT NULL | default false |
| ultimo_avance, origen_registro | migración 20260316 | nullable | — |
| motivo_verificacion | migración 20260313 | nullable | — |
| plan_tipo, plan_periodicidad, plan_activo, plan_inicia_at, plan_expira_at | migración 20260314 | nullable | — |
| trial_inicia_at, trial_expira_at | migración 20260314 | nullable | — |
| activo | vista (COALESCE(e.activo, true)) | — | — |

Si al insertar obtienes **"columna X no existe"**, es que tu tabla no tiene esa columna (p. ej. `activo` en algunos proyectos). Quita esa columna del INSERT en el script.

---

## 2. INSERT mínimo válido (campos que el script usa)

El script único (abajo) rellena todos los campos que usan las rutas de publicar/borrador y las migraciones, con valores que:

- Respetan NOT NULL: `slug`, `nombre`, `comuna_base_id`, `nivel_cobertura`, `cobertura`, `estado`, `estado_publicacion`, `form_completo`.
- Usan FKs válidas: `comuna_base_id` desde `comunas`, `sector_slug` desde `sectores` (ej. `alimentacion`).
- Respetan checks: `tipo_actividad` en `('venta','servicio','arriendo')`.
- No usan columnas que no existan en tu tabla (ej. si no tienes `activo`, no la incluyas).

---

## 3. Consultas de validación (después del script)

Ejecutar con la comuna que hayas usado en el script (ej. `talagante`):

**A. Conteo por comuna y rubro**
```sql
SELECT * FROM public.vw_conteo_comuna_rubro
WHERE comuna_slug = 'talagante';
```

**B. Conteo con límite por rubro**
```sql
SELECT * FROM public.vw_conteo_comuna_rubro_contado
WHERE comuna_slug = 'talagante';
```

**C. Vista final de apertura**
```sql
SELECT * FROM public.vw_comunas_por_abrir
WHERE comuna_slug = 'talagante';
```

---

## 4. Por qué fallaban los inserts antes y por qué este script funciona

- **Antes:**  
  - Se usaban literales como `'ID_COMUNA'` en un campo UUID (`comuna_base_id`).  
  - Faltaban columnas NOT NULL (`slug`, `nivel_cobertura`, etc.).  
  - Se rellenaban columnas que en tu proyecto no existen (ej. `activo`).

- **Ahora:**  
  - `comuna_base_id` y `subcategoria_id` se obtienen con `SELECT ... FROM comunas` / `FROM subcategorias`, por lo que siempre son UUIDs reales.  
  - El INSERT rellena todos los campos que el repo y las migraciones usan, con tipos y valores válidos.  
  - Si tu tabla no tiene alguna columna (p. ej. `activo`), en el script está indicado qué bloque comentar o quitar para que no falle.

---

## 5. Uso del script único

1. Abre Supabase → SQL Editor.
2. Pega y ejecuta el contenido del archivo `scripts/insert-emprendimiento-prueba-apertura.sql` (solo el bloque `DO $$ ... END $$;`).
3. Revisa el mensaje `NOTICE` con el `id` del emprendedor creado.
4. Ejecuta las tres consultas de validación de la sección 3 (cambia `talagante` si usaste otra comuna).

Si aparece un error de tipo **"columna X no existe"**, abre el script, localiza la columna `X` en el `INSERT` y coméntala o bórrala.
