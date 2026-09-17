import type { Metadata } from "next";
import { LoginForm } from "@/components/www/LoginForm";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "Connexion Espace Pro",
  description:
    "Connexion à votre espace institut Rappel Beauté. Un e-mail, un mot de passe.",
};

const BG_IMG =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuBSrIxf3esU3BPmabqXE0cgSVsJ4aLvcitvoh1_boJRv4DESrA7xW3ngAJcOcSrtyqzDi9-45ZPN-d52M1yxntjlHCG3oEpZQXlLtMMvrbt1FuvaZPapAzOvVnr2WFm-2mywpA2Me-any_uWSM8P1SBf73alPqZF03ShUPHeJNSoE_WEMnYbQi1tbR0GTStwtOr37llIc4mAlZ_ChT4uDu6SvALVTAqWKp-cK9oMNBg07IksAS7nTiIaQ";

export default function ConnexionPage() {
  return (
    <section className="relative flex min-h-[calc(100vh-8rem)] items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
      <div className="absolute inset-0 -z-10 overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          alt=""
          className="h-full w-full object-cover object-center"
          src={BG_IMG}
        />
        {/* Voile léger uniquement pour la lisibilité du formulaire — pas de blur ni filtre image */}
        <div className="absolute inset-0 bg-white/35" />
      </div>

      <div className="z-10 my-4 w-full max-w-lg">
        <LoginForm />
      </div>
    </section>
  );
}
