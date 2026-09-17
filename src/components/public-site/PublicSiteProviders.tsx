"use client";

import { PublicCartProvider } from "@/components/public-site/PublicCartContext";
import { PublicSiteShell } from "@/components/public-site/PublicSiteShell";
import type { PublicOrganizationProfile } from "@/types/public-booking";
import type { ReactNode } from "react";

export function PublicSiteProviders({
  org,
  children,
}: {
  org: PublicOrganizationProfile;
  children: ReactNode;
}) {
  return (
    <PublicCartProvider slug={org.slug}>
      <PublicSiteShell org={org}>{children}</PublicSiteShell>
    </PublicCartProvider>
  );
}
