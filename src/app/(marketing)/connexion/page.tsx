import type { Metadata } from "next";
import Link from "next/link";
import { LoginForm } from "@/components/www/LoginForm";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "Se connecter",
  description:
    "Connexion à votre espace institut Rappel Beauté. Un e-mail, un mot de passe.",
};

export default function ConnexionPage() {
  return (
    <section className="relative overflow-hidden py-16 md:py-24">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(227,28,95,0.10),_transparent_45%)]"
      />
      <div className="container-rb relative">
        <LoginForm />
        <p className="mx-auto mt-6 max-w-md text-center text-sm text-ink/55">
          Pas encore de compte ?{" "}
          <Link href="/professionnel/" className="font-medium text-primary hover:underline">
            Je suis un professionnel
          </Link>
        </p>
      </div>
    </section>
  );
}
