# Decisiones de producto

Registro breve de acuerdos que afectan UX, ranking o copy. El detalle normativo está en `docs/reglas-producto.md` y en `lib/productRules.ts`.

## 2026-04-01

Se define:

- No ordenar los resultados por “perfil completo”.
- Cards del mismo tamaño en grilla; variación solo por contenido y CTAs.
- Diferencia básica / completa acotada a contenido y acciones visibles.
- Etiqueta **Nuevo**: hasta **15 días** desde `created_at` (ventana de **15 × 24 h** en ms), solo si `publicado`; no influye en ranking; no depende de `updated_at`.
- Ubicación en formato `📍 Comuna · RM` (u otra abreviatura / nombre según región).
- Badge de cobertura: `Atiende {comuna}` cuando base ≠ comuna buscada (por slugs).

**Motivo:** justicia percibida en el ranking, claridad territorial y consistencia entre buscador, API y cards.
