"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  Building2,
  CalendarDays,
  CreditCard,
  KeyRound,
  LogOut,
  Shield,
  UserRound,
} from "lucide-react";
import { ROLE_LABEL, useCurrentUser, useSession } from "@/components/auth/session-provider";
import { BookingQrPanel } from "@/components/settings/booking-qr-panel";
import { InstituteWebsiteField } from "@/components/settings/institute-website-field";
import { InstituteLogoField } from "@/components/settings/institute-logo-field";
import type { AppRole } from "@/lib/rbac";
import { cn } from "@/lib/utils";
import { listOrgUsers } from "@/modules/users/service";
import type { OrgUserListItem } from "@/lib/db/users";
import type { SubscriptionDto } from "@/types/subscription";

const SECTIONS = [
  { id: "profil", label: "Mon profil", icon: UserRound },
  { id: "institut", label: "Institut", icon: Building2 },
  { id: "roles", label: "Permissions & rôles", icon: Shield },
  { id: "agenda", label: "Agenda & réservations", icon: CalendarDays },
  { id: "saas", label: "Abonnement", icon: CreditCard },
] as const;

const ROLE_SCOPE: Record<AppRole, { perimeter: string; cash: string }> = {
  OWNER: { perimeter: "Paramètres, équipe, finance, exports", cash: "Total" },
  MANAGER: { perimeter: "Planning, caisse, équipes, remises", cash: "Validation" },
  STAFF: { perimeter: "Agenda et fiches", cash: "Lecture" },
  CASHIER: { perimeter: "RDV, encaissement, reçus", cash: "Encaissement" },
  ACCOUNTANT: { perimeter: "Lecture finance et exports", cash: "Audit" },
};

export function SettingsPageView() {
  const user = useCurrentUser();
  const { logout } = useSession();
  const [active, setActive] = useState<string>("profil");
  const [users, setUsers] = useState<OrgUserListItem[]>([]);
  const [sub, setSub] = useState<SubscriptionDto | null>(null);

  useEffect(() => {
    listOrgUsers()
      .then(setUsers)
      .catch(() => setUsers([]));
    fetch("/api/subscription/", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setSub(d.subscription ?? null))
      .catch(() => setSub(null));
  }, []);

  function go(id: string) {
    setActive(id);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  const roleCounts = useMemo(() => {
    const counts = { OWNER: 0, MANAGER: 0, STAFF: 0, CASHIER: 0, ACCOUNTANT: 0 } as Record<AppRole, number>;
    for (const u of users) {
      if (u.status === "ACTIVE") counts[u.role] += 1;
    }
    return counts;
  }, [users]);

  const initials = `${user.firstName[0] ?? ""}${user.lastName[0] ?? ""}`.toUpperCase() || "U";

  return (
    <div className="space-y-5 pb-10">
      <header className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <h1 className="text-[28px] font-bold leading-9 tracking-tight lg:text-[40px] lg:leading-[48px]">
            Paramètres de l’institut
          </h1>
          <p className="mt-1 max-w-2xl text-[15px] text-ink/55">
            Profil, équipe, QR de réservation et abonnement.
          </p>
        </div>
      </header>

      <nav className="flex gap-2 overflow-x-auto pb-1 lg:hidden">
        {SECTIONS.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => go(s.id)}
            className={cn(
              "inline-flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[12px] font-semibold",
              active === s.id ? "bg-primary text-white shadow-sm" : "bg-[#F0DDE9] text-ink/70",
            )}
          >
            <s.icon size={14} />
            {s.label}
          </button>
        ))}
      </nav>

      <div className="grid items-start gap-6 lg:grid-cols-12">
        <aside className="sticky top-4 hidden lg:col-span-3 lg:block">
          <div className="space-y-1 rounded-xl bg-white p-3 shadow-sm">
            <p className="px-2 py-1 text-[11px] font-bold uppercase tracking-wider text-ink/40">
              Rubriques
            </p>
            {SECTIONS.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => go(s.id)}
                className={cn(
                  "flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-[14px] font-semibold",
                  active === s.id
                    ? "bg-[#FCE9F4] text-primary shadow-sm"
                    : "text-ink/55 hover:bg-[#FFEFF8] hover:text-ink",
                )}
              >
                <s.icon size={18} />
                {s.label}
              </button>
            ))}
          </div>
        </aside>

        <div className="space-y-5 lg:col-span-9">
          <SectionCard
            id="profil"
            icon={<UserRound size={22} />}
            title="Mon profil"
            subtitle="Compte connecté et accès"
          >
            <div className="grid gap-4 md:grid-cols-12 md:items-center">
              <div className="flex flex-col items-center gap-2 rounded-xl bg-[#FFEFF8] p-4 text-center md:col-span-4">
                <span className="flex h-20 w-20 items-center justify-center rounded-full bg-primary text-[22px] font-bold text-white">
                  {initials}
                </span>
                <p className="text-[16px] font-bold">
                  {user.firstName} {user.lastName}
                </p>
                <p className="text-[12px] text-ink/50">{ROLE_LABEL[user.role]}</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 md:col-span-8">
                <ReadonlyField label="Nom complet" value={`${user.firstName} ${user.lastName}`.trim()} />
                <ReadonlyField label="E-mail" value={user.email} />
                <ReadonlyField label="Rôle" value={ROLE_LABEL[user.role]} />
                <div>
                  <p className="mb-1 text-[11px] font-bold uppercase tracking-wider text-ink/45">
                    Sécurité
                  </p>
                  <Link
                    href="/changer-mot-de-passe/"
                    className="flex h-12 items-center justify-center gap-2 rounded-lg bg-[#FCE9F4] text-[14px] font-semibold"
                  >
                    <KeyRound size={16} />
                    Changer le mot de passe
                  </Link>
                  <button
                    type="button"
                    onClick={() => void logout()}
                    className="mt-2 flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-[#FFEFF8] text-[14px] font-semibold"
                  >
                    <LogOut size={16} />
                    Se déconnecter
                  </button>
                </div>
              </div>
            </div>
          </SectionCard>

          <SectionCard
            id="institut"
            icon={<Building2 size={22} />}
            title="Institut"
            subtitle="Identité affichée dans l’application"
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <InstituteLogoField name={user.orgName} canEdit={user.role === "OWNER"} />
              <ReadonlyField label="Enseigne" value={user.orgName || "—"} />
              <ReadonlyField label="Identifiant public" value={user.orgSlug || "—"} />
            </div>
          </SectionCard>

          <SectionCard
            id="roles"
            icon={<Shield size={22} />}
            title="Utilisateurs & permissions"
            subtitle={`${users.filter((u) => u.status === "ACTIVE").length} compte${users.filter((u) => u.status === "ACTIVE").length > 1 ? "s" : ""} actif${users.filter((u) => u.status === "ACTIVE").length > 1 ? "s" : ""}`}
          >
            <div className="mb-3 rounded-lg bg-[#FFEFF8] p-3 text-[13px] text-ink/65">
              Les rôles Employée et Caisse n’ont pas accès aux marges, au grand livre ni à
              l’abonnement.
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[13px]">
                <thead>
                  <tr className="bg-[#FCE9F4] text-[11px] font-bold uppercase tracking-wider text-ink/50">
                    <th className="rounded-l-lg px-3 py-2.5">Rôle</th>
                    <th className="px-3 py-2.5">Effectif</th>
                    <th className="px-3 py-2.5">Périmètre</th>
                    <th className="rounded-r-lg px-3 py-2.5">Caisse</th>
                  </tr>
                </thead>
                <tbody>
                  {(Object.keys(ROLE_SCOPE) as AppRole[]).map((role) => (
                    <tr key={role} className="border-b border-[#FFEFF8] last:border-0">
                      <td className="px-3 py-3 font-semibold">{ROLE_LABEL[role]}</td>
                      <td className="px-3 py-3">{roleCounts[role]}</td>
                      <td className="px-3 py-3 text-ink/60">{ROLE_SCOPE[role].perimeter}</td>
                      <td className="px-3 py-3 font-semibold text-[#7B5900]">{ROLE_SCOPE[role].cash}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </SectionCard>

          <SectionCard
            id="agenda"
            icon={<CalendarDays size={22} />}
            title="Agenda & réservations"
            subtitle="QR de réservation en ligne"
          >
            <BookingQrPanel />
            <InstituteWebsiteField canEdit={user.role === "OWNER"} />
          </SectionCard>

          <SectionCard
            id="saas"
            icon={<CreditCard size={22} />}
            title="Abonnement"
            subtitle="Formule et renouvellement"
            dark
          >
            {sub ? (
              <div className="space-y-4">
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-widest text-[#F0BF5C]">
                      {sub.planName}
                    </p>
                    <p className="mt-1 text-[28px] font-bold text-white">
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
                <p className="text-[13px] text-white/70">
                  Renouvellement le {new Date(sub.currentPeriodEnd).toLocaleDateString("fr-FR")}
                  {sub.trialEndsAt
                    ? ` · essai jusqu’au ${new Date(sub.trialEndsAt).toLocaleDateString("fr-FR")}`
                    : ""}
                </p>
              </div>
            ) : (
              <p className="text-[13px] text-white/70">Chargement de l’abonnement…</p>
            )}
          </SectionCard>
        </div>
      </div>
    </div>
  );
}

function SectionCard({
  id,
  icon,
  title,
  subtitle,
  children,
  dark,
}: {
  id: string;
  icon: ReactNode;
  title: string;
  subtitle: string;
  children: ReactNode;
  dark?: boolean;
}) {
  return (
    <section
      id={id}
      className={cn(
        "scroll-mt-24 space-y-5 rounded-xl p-4 shadow-sm sm:p-6",
        dark ? "bg-[#382D36] text-[#FEECF7]" : "bg-white",
      )}
    >
      <div className="flex items-center gap-3">
        <div
          className={cn(
            "flex h-10 w-10 items-center justify-center rounded-lg",
            dark ? "bg-white/10 text-[#FCCA66]" : "bg-[#FCE9F4] text-primary",
          )}
        >
          {icon}
        </div>
        <div>
          <h2 className={cn("text-[18px] font-bold", dark ? "text-white" : "text-ink")}>{title}</h2>
          <p className={cn("text-[13px]", dark ? "text-white/60" : "text-ink/50")}>{subtitle}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

function ReadonlyField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="mb-1 text-[11px] font-bold uppercase tracking-wider text-ink/45">{label}</p>
      <div className="rounded-lg bg-[#FFEFF8] px-4 py-3 text-[15px]">{value || "—"}</div>
    </div>
  );
}
