"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  Building2,
  CreditCard,
  KeyRound,
  LogOut,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import { ROLE_LABEL, useCurrentUser, useSession } from "@/components/auth/session-provider";
import { InstituteLogoField } from "@/components/settings/institute-logo-field";
import { InstituteSettingsForm } from "@/components/settings/institute-settings-form";
import { WebsiteRequestCard } from "@/components/settings/website-request-card";
import type { SubscriptionDto } from "@/types/subscription";

export function SettingsPageView() {
  const user = useCurrentUser();
  const { logout } = useSession();

  const [sub, setSub] = useState<SubscriptionDto | null>(null);
  const [subLoading, setSubLoading] = useState(true);
  const [subError, setSubError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setSubLoading(true);
    setSubError(null);
    fetch("/api/subscription/", { credentials: "include" })
      .then(async (r) => {
        const data = (await r.json()) as { subscription?: SubscriptionDto | null; error?: string };
        if (!r.ok) throw new Error(data.error || "Abonnement indisponible.");
        if (!cancelled) setSub(data.subscription ?? null);
      })
      .catch((err) => {
        if (!cancelled) {
          setSub(null);
          setSubError(err instanceof Error ? err.message : "Abonnement indisponible.");
        }
      })
      .finally(() => {
        if (!cancelled) setSubLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const initials = `${user.firstName[0] ?? ""}${user.lastName[0] ?? ""}`.toUpperCase() || "U";
  const canEditInstitute = user.role === "OWNER";

  return (
    <div className="min-w-0 space-y-5 pb-10 text-[#261524]">
      <header
        className="relative flex min-h-[96px] items-center overflow-hidden rounded-[20px] border border-[#EFD9E1] bg-[#F9E8E7] px-5 py-4 shadow-sm sm:min-h-[108px] sm:px-7"
        style={{
          backgroundImage:
            'linear-gradient(90deg,rgba(255,247,247,.92) 0%,rgba(255,239,239,.55) 42%,rgba(255,239,239,.15) 100%),url("/marketing/hero-background.png")',
          backgroundPosition: "center",
          backgroundSize: "cover",
        }}
      >
        <div className="relative z-10 min-w-0">
          <h1 className="font-serif text-2xl font-bold tracking-tight text-[#58152F] sm:text-3xl">
            Paramètres
          </h1>
          <p className="mt-1 max-w-lg text-sm leading-5 text-[#654254]">
            Profil, identité de l’institut et abonnement.
          </p>
        </div>
      </header>

      <div className="space-y-5">
        <SettingsCard icon={UserRound} title="Mon profil" subtitle="Compte connecté et accès">
          <div className="grid gap-5 md:grid-cols-12 md:items-start">
            <div className="flex flex-col items-center gap-2 rounded-2xl bg-[#FFF5F9] p-5 text-center md:col-span-4">
              <span
                className="flex h-20 w-20 items-center justify-center rounded-full bg-[#B60050] text-[22px] font-bold text-white"
                aria-hidden
              >
                {initials}
              </span>
              <p className="text-[16px] font-bold text-[#261524]">
                {user.firstName} {user.lastName}
              </p>
              <p className="text-[12px] text-[#887787]">{ROLE_LABEL[user.role]}</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 md:col-span-8">
              <ReadonlyField
                label="Nom complet"
                value={`${user.firstName} ${user.lastName}`.trim()}
              />
              <ReadonlyField label={user.email ? "E-mail" : "WhatsApp"} value={user.email || user.loginPhone || "—"} />
              <ReadonlyField label="Rôle" value={ROLE_LABEL[user.role]} />
              <div className="space-y-2">
                <p className="text-[11px] font-bold uppercase tracking-wider text-[#887787]">
                  Sécurité
                </p>
                <Link
                  href="/changer-mot-de-passe/"
                  className="flex h-12 items-center justify-center gap-2 rounded-xl bg-[#FCE7F1] text-[14px] font-semibold text-[#75133D] transition hover:bg-[#F7D1E2]"
                >
                  <KeyRound size={16} aria-hidden />
                  Changer le mot de passe
                </Link>
                <button
                  type="button"
                  onClick={() => void logout()}
                  className="flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-[#F0E5EC] bg-white text-[14px] font-semibold text-[#655362] transition hover:bg-[#FFF5F9]"
                >
                  <LogOut size={16} aria-hidden />
                  Se déconnecter
                </button>
              </div>
            </div>
          </div>
        </SettingsCard>

        <SettingsCard
          icon={Building2}
          title="Institut"
          subtitle="Identité affichée dans l’application"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <InstituteLogoField name={user.orgName} canEdit={canEditInstitute} />
            <ReadonlyField label="Enseigne" value={user.orgName || "—"} />
            <ReadonlyField label="Identifiant public" value={user.orgSlug || "—"} />
            <InstituteSettingsForm canEdit={canEditInstitute} />
          </div>
        </SettingsCard>

        <WebsiteRequestCard canRequest={canEditInstitute} />

        <SettingsCard icon={CreditCard} title="Abonnement" subtitle="Formule et renouvellement">
          <div className="space-y-4">
            {subLoading ? (
              <div className="space-y-3" aria-busy="true">
                <div className="h-8 w-40 animate-pulse rounded-lg bg-[#FCE7F1]" />
                <div className="h-16 w-64 animate-pulse rounded-lg bg-[#FCE7F1]" />
                <div className="h-4 w-72 animate-pulse rounded-lg bg-[#FCE7F1]" />
              </div>
            ) : subError ? (
              <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
                {subError}
              </p>
            ) : sub ? (
              <div className="overflow-hidden rounded-2xl bg-[#75133D] p-5 text-white sm:p-6">
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-widest text-[#F0BF5C]">
                      {sub.planName}
                    </p>
                    <p className="mt-1 text-[28px] font-bold">
                      {sub.priceSnapshot.toLocaleString("fr-MA")}{" "}
                      <span className="text-[16px] text-[#F0BF5C]">
                        {sub.currencySnapshot} / mois
                      </span>
                    </p>
                  </div>
                  <span className="rounded-full bg-[#FCCA66] px-3 py-1 text-[11px] font-extrabold text-[#261900]">
                    {sub.status === "ACTIVE" || sub.status === "TRIAL" ? "Actif" : sub.status}
                  </span>
                </div>
                <p className="mt-4 text-[13px] text-white/75">
                  Renouvellement le{" "}
                  {new Date(sub.currentPeriodEnd).toLocaleDateString("fr-FR")}
                  {sub.trialEndsAt
                    ? ` · essai jusqu’au ${new Date(sub.trialEndsAt).toLocaleDateString("fr-FR")}`
                    : ""}
                </p>
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-[#EAD5E0] bg-[#FFF9FB] px-4 py-8 text-center">
                <p className="text-sm font-semibold text-[#4A2F3E]">Aucun abonnement trouvé</p>
                <p className="mt-1 text-xs text-[#8A7482]">
                  Les informations s’afficheront dès qu’une formule sera liée à l’institut.
                </p>
              </div>
            )}
          </div>
        </SettingsCard>
      </div>
    </div>
  );
}

function SettingsCard({
  icon: Icon,
  title,
  subtitle,
  children,
}: {
  icon: LucideIcon;
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-[20px] border border-[#EFD9E1] bg-white p-5 shadow-sm sm:p-6">
      <div className="mb-5 flex items-center gap-3 border-b border-[#F6EAF0] pb-4">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#FCE7F1] text-[#B60050]">
          <Icon size={22} aria-hidden />
        </div>
        <div>
          <h2 className="text-lg font-bold text-[#301A2A]">{title}</h2>
          <p className="text-sm text-[#887787]">{subtitle}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

function ReadonlyField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-[#887787]">{label}</p>
      <div className="rounded-xl bg-[#FFF5F9] px-4 py-3 text-[15px] text-[#261524]">
        {value || "—"}
      </div>
    </div>
  );
}
