"use client";

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useState,
  type KeyboardEvent,
} from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  ArrowRight,
  Building2,
  CalendarDays,
  CreditCard,
  KeyRound,
  LogOut,
  Shield,
  UserRound,
} from "lucide-react";
import { ROLE_LABEL, useCurrentUser, useSession } from "@/components/auth/session-provider";
import { InstituteWebsiteField } from "@/components/settings/institute-website-field";
import { InstituteAddressField } from "@/components/settings/institute-address-field";
import { InstituteWhatsappField } from "@/components/settings/institute-whatsapp-field";
import { InstituteLogoField } from "@/components/settings/institute-logo-field";
import type { AppRole } from "@/lib/rbac";
import { cn } from "@/lib/utils";
import { listOrgUsers } from "@/modules/users/service";
import type { OrgUserListItem } from "@/lib/db/users";
import type { SubscriptionDto } from "@/types/subscription";

const TABS = [
  { id: "profil", label: "Mon profil", icon: UserRound },
  { id: "institut", label: "Institut", icon: Building2 },
  { id: "roles", label: "Permissions & rôles", icon: Shield },
  { id: "agenda", label: "Agenda & réservations", icon: CalendarDays },
  { id: "saas", label: "Abonnement", icon: CreditCard },
] as const;

type TabId = (typeof TABS)[number]["id"];

const ROLE_SCOPE: Record<AppRole, { perimeter: string; cash: string }> = {
  OWNER: { perimeter: "Paramètres, équipe, finance, exports", cash: "Total" },
  MANAGER: { perimeter: "Planning, caisse, équipes, remises", cash: "Validation" },
  STAFF: { perimeter: "Agenda et fiches", cash: "Lecture" },
  CASHIER: { perimeter: "RDV, encaissement, reçus", cash: "Encaissement" },
  ACCOUNTANT: { perimeter: "Lecture finance et exports", cash: "Audit" },
};

function isTabId(value: string | null): value is TabId {
  return TABS.some((tab) => tab.id === value);
}

export function SettingsPageView() {
  const user = useCurrentUser();
  const { logout } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const baseId = useId();

  const tabFromUrl = searchParams.get("tab");
  const active: TabId = isTabId(tabFromUrl) ? tabFromUrl : "profil";

  const [users, setUsers] = useState<OrgUserListItem[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [usersError, setUsersError] = useState<string | null>(null);
  const [sub, setSub] = useState<SubscriptionDto | null>(null);
  const [subLoading, setSubLoading] = useState(true);
  const [subError, setSubError] = useState<string | null>(null);

  const setTab = useCallback(
    (id: TabId) => {
      const params = new URLSearchParams(searchParams.toString());
      if (id === "profil") params.delete("tab");
      else params.set("tab", id);
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  useEffect(() => {
    if (tabFromUrl && !isTabId(tabFromUrl)) {
      setTab("profil");
    }
  }, [tabFromUrl, setTab]);

  useEffect(() => {
    let cancelled = false;
    setUsersLoading(true);
    setUsersError(null);
    listOrgUsers()
      .then((items) => {
        if (!cancelled) setUsers(items);
      })
      .catch(() => {
        if (!cancelled) {
          setUsers([]);
          setUsersError("Impossible de charger les utilisateurs.");
        }
      })
      .finally(() => {
        if (!cancelled) setUsersLoading(false);
      });

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

  const roleCounts = useMemo(() => {
    const counts = {
      OWNER: 0,
      MANAGER: 0,
      STAFF: 0,
      CASHIER: 0,
      ACCOUNTANT: 0,
    } as Record<AppRole, number>;
    for (const u of users) {
      if (u.status === "ACTIVE") counts[u.role] += 1;
    }
    return counts;
  }, [users]);

  const activeUsersCount = users.filter((u) => u.status === "ACTIVE").length;
  const initials = `${user.firstName[0] ?? ""}${user.lastName[0] ?? ""}`.toUpperCase() || "U";
  const canEditInstitute = user.role === "OWNER";
  const canManageUsers = user.role === "OWNER" || user.role === "MANAGER";

  function onTabKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const index = TABS.findIndex((tab) => tab.id === active);
    if (index < 0) return;

    let next = index;
    if (event.key === "ArrowDown" || event.key === "ArrowRight") {
      event.preventDefault();
      next = (index + 1) % TABS.length;
    } else if (event.key === "ArrowUp" || event.key === "ArrowLeft") {
      event.preventDefault();
      next = (index - 1 + TABS.length) % TABS.length;
    } else if (event.key === "Home") {
      event.preventDefault();
      next = 0;
    } else if (event.key === "End") {
      event.preventDefault();
      next = TABS.length - 1;
    } else {
      return;
    }

    setTab(TABS[next]!.id);
    const btn = document.getElementById(`${baseId}-tab-${TABS[next]!.id}`);
    btn?.focus();
  }

  const activeMeta = TABS.find((tab) => tab.id === active)!;

  return (
    <div className="min-w-0 space-y-5 pb-10 text-[#261524]">
      <header className="rounded-[22px] border border-[#F0E0E9] bg-gradient-to-br from-white via-[#FFF9FC] to-[#FFF5F7] p-5 shadow-[0_8px_30px_rgba(75,24,47,0.05)] sm:p-7">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#B60050]">
          Configuration
        </p>
        <h1 className="mt-2 text-[28px] font-extrabold tracking-tight text-[#341629] lg:text-[36px]">
          Paramètres de l’institut
        </h1>
        <p className="mt-2 max-w-2xl text-[15px] text-[#887787]">
          Profil, identité de l’institut, permissions et abonnement — une section à la fois.
        </p>
      </header>

      <div className="grid items-start gap-5 lg:grid-cols-12 lg:gap-6">
        <aside className="min-w-0 lg:sticky lg:top-4 lg:col-span-3 lg:self-start">
          <nav
            className="rounded-[20px] border border-[#F0E5EC] bg-white p-2 shadow-[0_8px_30px_rgba(75,24,47,0.05)] sm:p-3"
            role="tablist"
            aria-orientation="vertical"
            aria-label="Sections des paramètres"
            onKeyDown={onTabKeyDown}
          >
            <p className="mb-1 hidden px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-[#887787] lg:block">
              Rubriques
            </p>
            <div className="flex gap-2 overflow-x-auto pb-0.5 lg:flex-col lg:gap-1 lg:overflow-visible">
              {TABS.map((tab) => {
                const selected = active === tab.id;
                return (
                  <button
                    key={tab.id}
                    id={`${baseId}-tab-${tab.id}`}
                    type="button"
                    role="tab"
                    aria-selected={selected}
                    aria-controls={`${baseId}-panel-${tab.id}`}
                    tabIndex={selected ? 0 : -1}
                    onClick={() => setTab(tab.id)}
                    className={cn(
                      "inline-flex shrink-0 items-center gap-2 rounded-full px-3.5 py-2 text-[12px] font-semibold transition lg:w-full lg:rounded-xl lg:px-3 lg:py-2.5 lg:text-left lg:text-[14px]",
                      selected
                        ? "bg-[#B60050] text-white shadow-sm lg:bg-[#FCE7F1] lg:text-[#B60050]"
                        : "bg-[#FFF5F9] text-[#655362] ring-1 ring-[#F0E5EC] hover:bg-[#FFF0F6] lg:bg-transparent lg:ring-0 lg:hover:bg-[#FFF5F9]",
                    )}
                  >
                    <tab.icon size={16} className="lg:h-[18px] lg:w-[18px]" aria-hidden />
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </nav>
        </aside>

        <div className="min-w-0 lg:col-span-9">
          <section
            id={`${baseId}-panel-${active}`}
            role="tabpanel"
            aria-labelledby={`${baseId}-tab-${active}`}
            className="rounded-[20px] border border-[#F0E5EC] bg-white p-5 shadow-[0_8px_30px_rgba(75,24,47,0.05)] sm:p-6"
          >
            <div className="mb-5 flex items-center gap-3 border-b border-[#F6EAF0] pb-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#FCE7F1] text-[#B60050]">
                <activeMeta.icon size={22} aria-hidden />
              </div>
              <div>
                <h2 className="text-lg font-bold text-[#301A2A]">{activeMeta.label}</h2>
                <p className="text-sm text-[#887787]">
                  {active === "profil" && "Compte connecté et accès"}
                  {active === "institut" && "Identité affichée dans l’application"}
                  {active === "roles" &&
                    (usersLoading
                      ? "Chargement des effectifs…"
                      : `${activeUsersCount} compte${activeUsersCount > 1 ? "s" : ""} actif${activeUsersCount > 1 ? "s" : ""}`)}
                  {active === "agenda" && "Site web de l’institut"}
                  {active === "saas" && "Formule et renouvellement"}
                </p>
              </div>
            </div>

            {active === "profil" ? (
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
                  <ReadonlyField label="E-mail" value={user.email} />
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
            ) : null}

            {active === "institut" ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <InstituteLogoField name={user.orgName} canEdit={canEditInstitute} />
                <InstituteAddressField canEdit={canEditInstitute} />
                <InstituteWhatsappField canEdit={canEditInstitute} />
                <ReadonlyField label="Enseigne" value={user.orgName || "—"} />
                <ReadonlyField label="Identifiant public" value={user.orgSlug || "—"} />
                {!canEditInstitute ? (
                  <p className="sm:col-span-2 text-sm text-[#887787]">
                    Seul le propriétaire peut modifier l’identité de l’institut.
                  </p>
                ) : null}
              </div>
            ) : null}

            {active === "roles" ? (
              <div className="space-y-4">
                <div className="rounded-xl bg-[#FFF5F9] p-3 text-[13px] text-[#655362]">
                  Les rôles Employée et Caisse n’ont pas accès aux marges, au grand livre ni à
                  l’abonnement.
                </div>

                {usersError ? (
                  <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
                    {usersError}
                  </p>
                ) : null}

                {usersLoading ? (
                  <div className="space-y-2" aria-busy="true">
                    <div className="h-10 animate-pulse rounded-xl bg-[#FCE7F1]" />
                    <div className="h-24 animate-pulse rounded-xl bg-[#FCE7F1]" />
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-xl ring-1 ring-[#F0E5EC]">
                    <table className="w-full min-w-[520px] text-left text-[13px]">
                      <thead>
                        <tr className="bg-[#FCE7F1] text-[11px] font-bold uppercase tracking-wider text-[#887787]">
                          <th className="px-3 py-3">Rôle</th>
                          <th className="px-3 py-3">Effectif</th>
                          <th className="px-3 py-3">Périmètre</th>
                          <th className="px-3 py-3">Caisse</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(Object.keys(ROLE_SCOPE) as AppRole[]).map((role) => (
                          <tr key={role} className="border-t border-[#F6EAF0]">
                            <td className="px-3 py-3 font-semibold text-[#261524]">
                              {ROLE_LABEL[role]}
                            </td>
                            <td className="px-3 py-3">{roleCounts[role]}</td>
                            <td className="px-3 py-3 text-[#887787]">{ROLE_SCOPE[role].perimeter}</td>
                            <td className="px-3 py-3 font-semibold text-[#75133D]">
                              {ROLE_SCOPE[role].cash}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {canManageUsers ? (
                  <Link
                    href="/settings/users/"
                    className="inline-flex items-center gap-2 rounded-xl bg-[#75133D] px-4 py-3 text-sm font-bold text-white transition hover:bg-[#5c0f30]"
                  >
                    Gérer les utilisateurs
                    <ArrowRight size={16} aria-hidden />
                  </Link>
                ) : null}
              </div>
            ) : null}

            {active === "agenda" ? (
              <div className="max-w-2xl space-y-3">
                <InstituteWebsiteField canEdit={canEditInstitute} />
                {!canEditInstitute ? (
                  <p className="text-sm text-[#887787]">
                    Seul le propriétaire peut modifier le site web public.
                  </p>
                ) : null}
              </div>
            ) : null}

            {active === "saas" ? (
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
                        {sub.status === "ACTIVE" || sub.status === "TRIAL"
                          ? "Actif"
                          : sub.status}
                      </span>
                    </div>
                    <p className="mt-4 text-[13px] text-white/75">
                      Renouvellement le{" "}
                      {new Date(sub.currentPeriodEnd).toLocaleDateString("fr-FR")}
                      {sub.trialEndsAt
                        ? ` · essai jusqu’au ${new Date(sub.trialEndsAt).toLocaleDateString("fr-FR")}`
                        : ""}
                    </p>
                    {user.role === "OWNER" ? (
                      <Link
                        href="/settings/subscription/"
                        className="mt-5 inline-flex items-center gap-2 rounded-xl bg-white/15 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/25"
                      >
                        Voir les détails
                        <ArrowRight size={15} aria-hidden />
                      </Link>
                    ) : null}
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
            ) : null}
          </section>
        </div>
      </div>
    </div>
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
