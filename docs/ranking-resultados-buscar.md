# Ranking de resultados de búsqueda (comuna)

## Criterios (sin usar clics/visitas como principal)

- **Bloque 1** (negocios en la comuna buscada): perfiles completos primero → rotación estable → ligera prioridad a nuevos.
- **Bloque 2** (negocios que atienden la comuna): distancia geográfica → perfiles completos → rotación leve; clics solo como desempate dentro del mismo grupo.

## Implementación

- **`lib/rankingBuscar.ts`**
  - `getDaySeed()`: seed por día para que el orden no cambie en cada refresh.
  - `stableRotationKey(id, seed)`: orden estable entre negocios (mismo día → mismo orden).
  - `isFullProfile(item)`: plan activo o trial vigente.
  - `distanceRank(comunaBase, comunaBuscada)`: orden de cercanía; usa `RANKING_DISTANCE_ORDER` (orden explícito por comuna) o `COMUNAS_CERCANAS` (vecinos primero).

- **`app/api/buscar/route.ts`**
  - Tras asignar bucket (exacta, cobertura_comuna, regional, nacional):
    - **Exacta:** (1) perfil completo, (2) clave de rotación estable, (3) `created_at` (más nuevos primero). Si filtro "Nuevos", se prioriza `created_at` dentro del bloque.
    - **Resto:** (1) `distanceRank` (más cerca primero), (2) perfil completo, (3) rotación estable, (4) impresiones (menos mostrados primero, solo desempate), (5) calidad, (6) nombre.

## Orden de distancia (ejemplo Calera de Tango)

En `RANKING_DISTANCE_ORDER["calera-de-tango"]`:

1. San Bernardo  
2. Talagante  
3. Padre Hurtado  
4. Maipú  
5. Peñaflor  
6. Santiago  

Luego el resto (más lejanos u otras regiones). Para otras comunas se usa el mismo mapa o el fallback por comunas vecinas (`COMUNAS_CERCANAS`).

## Rotación estable

- Seed = día (UTC). Mismo día → mismo orden para los mismos negocios.
- No se usa sesión de usuario en el backend; la estabilidad es por período (día).
- Para rotación por semana, puede cambiarse `getDaySeed()` a un seed semanal.
