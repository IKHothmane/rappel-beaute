import type { Metadata } from "next";
import { LoginForm } from "@/components/www/LoginForm";
import { LoginScreen } from "@/components/www/LoginScreen";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "Connexion",
  description: "Connexion unique Rappel Beauté. Le serveur détermine votre espace.",
  robots: { index: false, follow: false },
};

export default function LoginPage() {
  return (
    <LoginScreen>
      <LoginForm />
    </LoginScreen>
  );
}
