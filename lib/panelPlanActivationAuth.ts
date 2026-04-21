/**
 * Mutaciones de plan desde el panel (activar / desactivar).
 * En producción exige `PANEL_PLAN_ACTIVATION_SECRET` en header `x-panel-plan-secret`.
 * Sin variable en desarrollo, se permite sin header (solo local).
 */
export function panelPlanMutationAllowed(req: Request): boolean {
  const secret = process.env.PANEL_PLAN_ACTIVATION_SECRET?.trim();
  if (secret) {
    return req.headers.get("x-panel-plan-secret") === secret;
  }
  return process.env.NODE_ENV !== "production";
}
