import type { PublicOrganizationProfile } from "@/types/public-booking";
import type { ReactNode } from "react";
import { PublicSiteShell } from "@/components/public-site/PublicSiteShell";

export function PublicSiteProviders({
  org,
  children,
}: {
  org: PublicOrganizationProfile;
  children: ReactNode;
}) {
  return <PublicSiteShell org={org}>{children}</PublicSiteShell>;
}
