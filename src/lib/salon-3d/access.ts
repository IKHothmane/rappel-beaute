/** Plan 3D : preview limitée à Institut Royal pour le moment. */
export const SALON_3D_ALLOWED_SLUGS = ["institut-royal"] as const;

export function isSalon3dEnabledForOrg(
  orgSlug: string | null | undefined,
): boolean {
  if (!orgSlug) return false;
  return (SALON_3D_ALLOWED_SLUGS as readonly string[]).includes(orgSlug);
}
