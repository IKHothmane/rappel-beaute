import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Salon3dViewer } from "@/components/salon-3d/salon-3d-viewer";
import { getSession } from "@/lib/auth/session";
import { isAppSession } from "@/lib/auth/types";
import { isSalon3dEnabledForOrg } from "@/lib/salon-3d/access";

export const metadata: Metadata = {
  title: "Plan 3D",
};

export default async function Salon3dPage() {
  const session = await getSession();
  const orgSlug = session && isAppSession(session) ? session.orgSlug : null;
  if (!isSalon3dEnabledForOrg(orgSlug)) {
    redirect("/dashboard/");
  }
  return <Salon3dViewer />;
}
