/**
 * Relances post-prestation : interface masquée pour le moment.
 * Le backend (tâches WhatsApp, analytics) reste actif ; seuls les menus et la
 * page /post-visit/ sont désactivés. Passer à true pour réafficher le module.
 */
export const POST_VISIT_UI_ENABLED = false;

export function isPostVisitUiEnabled(): boolean {
  return POST_VISIT_UI_ENABLED;
}
