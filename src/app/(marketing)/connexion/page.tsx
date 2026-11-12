import type { Metadata } from "next";
import { LoginForm } from "@/components/www/LoginForm";
import { LoginScreen } from "@/components/www/LoginScreen";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Connexion Espace Pro",
  description:
    "Connectez-vous à votre espace institut Rappel Beauty avec votre e-mail professionnel et votre mot de passe.",
  robots: { index: false, follow: false },
};

export default function ConnexionPage() {
  return (
    <LoginScreen>
      <LoginForm />
    </LoginScreen>
  );
}
