import type { Metadata } from "next";
import { InstituteDirectory } from "@/components/www/institute-directory";
import { listPublicInstitutes } from "@/lib/db/public-directory";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Instituts inscrits",
  description:
    "Trouvez un institut de beauté inscrit sur Rappel Beauty et réservez en ligne.",
};

export default async function InstitutesPage() {
  const institutes = await listPublicInstitutes();
  return <InstituteDirectory institutes={institutes} />;
}
