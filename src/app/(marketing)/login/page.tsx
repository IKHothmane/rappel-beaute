import type { Metadata } from "next";
import { LoginForm } from "@/components/www/LoginForm";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "Connexion",
  description: "Connexion unique Rappel Beauté. Le serveur détermine votre espace.",
};

export default function LoginPage() {
  return (
    <section className="relative overflow-hidden py-16 md:py-24">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(227,28,95,0.10),_transparent_45%)]"
      />
      <div className="container-rb relative">
        <LoginForm />
      </div>
    </section>
  );
}
