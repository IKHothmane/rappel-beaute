import type { Metadata } from "next";
import { VerifyEmail } from "@/components/auth/VerifyEmail";

export const metadata: Metadata = {
  title: "Confirmer mon e-mail",
  robots: { index: false, follow: false },
};

// Le jeton vient de l'adresse du lien : rien n'est lu ni consommé côté serveur (voir VerifyEmail).
export default function VerifyEmailPage() {
  return <VerifyEmail />;
}
