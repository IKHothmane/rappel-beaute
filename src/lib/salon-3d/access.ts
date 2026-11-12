/** Plan 3D : désactivé pour le moment (réactiver via SALON_3D_ENABLED). */
const SALON_3D_ENABLED = false;

const SALON_3D_ALLOWED_SLUGS = ["institut-royal"] as const;

export function isSalon3dEnabledForOrg(
  orgSlug: string | null | undefined,
): boolean {
  if (!SALON_3D_ENABLED) return false;
  if (!orgSlug) return false;
  return (SALON_3D_ALLOWED_SLUGS as readonly string[]).includes(orgSlug);
}
