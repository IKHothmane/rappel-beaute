"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { CalendarDays, Plus, UsersRound } from "lucide-react";
import { useCurrentUser } from "@/components/auth/session-provider";
import { canAccessNav, canWriteStaff } from "@/lib/rbac";
import { TeamPremiumPage } from "@/components/staff/team-premium-page";
import { PlanningPageView } from "@/components/planning/planning-page";
import { cn } from "@/lib/utils";
import "./team-workspace.css";

type Tab = "staff" | "planning";

const TABS = [
  {
    id: "staff" as const,
    label: "Équipe",
    subtitle: "Profils et performances",
    icon: UsersRound,
  },
  {
    id: "planning" as const,
    label: "Planning",
    subtitle: "Horaires et disponibilités",
    icon: CalendarDays,
  },
];

export function TeamWorkspace() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const user = useCurrentUser();

  const canStaff = canAccessNav(user.role, "staff");
  const canPlanning = canAccessNav(user.role, "planning");
  const canWrite = canWriteStaff(user.role);
  const [createSignal, setCreateSignal] = useState(0);

  const requestedTab = useMemo<Tab>(
    () => (searchParams.get("tab") === "planning" ? "planning" : "staff"),
    [searchParams],
  );

  const tab = useMemo<Tab>(() => {
    if (requestedTab === "planning" && canPlanning) return "planning";
    if (requestedTab === "staff" && canStaff) return "staff";
    if (canStaff) return "staff";
    if (canPlanning) return "planning";
    return "staff";
  }, [requestedTab, canStaff, canPlanning]);

  useEffect(() => {
    if (!canStaff && !canPlanning) return;
    if (tab === requestedTab) return;
    router.replace(tab === "staff" ? "/staff/" : "/staff/?tab=planning", { scroll: false });
  }, [tab, requestedTab, canStaff, canPlanning, router]);

  function changeTab(next: Tab) {
    if (next === "staff" && !canStaff) return;
    if (next === "planning" && !canPlanning) return;
    router.replace(next === "staff" ? "/staff/" : "/staff/?tab=planning", { scroll: false });
  }

  if (!canStaff && !canPlanning) {
    return (
      <div className="rounded-2xl bg-white p-8 text-center text-sm text-ink/55">
        Vous n&apos;avez pas accès à cette page.
      </div>
    );
  }

  const visibleTabs = TABS.filter((item) =>
    item.id === "staff" ? canStaff : canPlanning,
  );

  return (
    <main className="rb-team-workspace">
      <header className="rb-team-hero">
        <div className="rb-team-hero-glow" aria-hidden />

        <div className="rb-team-hero-content">
          <h1>Équipe &amp; Planning</h1>
          <p>
            Gérez vos collaboratrices, leurs horaires, leurs absences et leurs performances depuis un
            seul espace.
          </p>
        </div>

        <div className="rb-team-hero-actions">
          {canWrite && canStaff ? (
            <button
              type="button"
              className="rb-team-hero-btn rb-team-hero-btn-primary"
              onClick={() => {
                if (tab !== "staff") changeTab("staff");
                setCreateSignal((n) => n + 1);
              }}
            >
              <Plus size={17} aria-hidden />
              Ajouter un employé
            </button>
          ) : null}
          {canPlanning ? (
            <Link
              href="/staff/?tab=planning"
              className="rb-team-hero-btn rb-team-hero-btn-secondary"
            >
              <CalendarDays size={17} aria-hidden />
              Planning général
            </Link>
          ) : null}
        </div>
      </header>

      <nav
        className="rb-team-tabs"
        data-count={visibleTabs.length}
        aria-label="Navigation Équipe et Planning"
      >
        {visibleTabs.map((item) => {
          const Icon = item.icon;
          const active = tab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => changeTab(item.id)}
              aria-current={active ? "page" : undefined}
              className={cn("rb-team-tab", active && "rb-team-tab-active")}
            >
              <span className="rb-team-tab-icon">
                <Icon size={21} aria-hidden />
              </span>
              <span className="rb-team-tab-text">
                <strong>{item.label}</strong>
                <small>{item.subtitle}</small>
              </span>
              {active ? <span className="rb-team-tab-indicator" /> : null}
            </button>
          );
        })}
      </nav>

      <section className="rb-team-content">
        {tab === "staff" && canStaff ? <TeamPremiumPage createSignal={createSignal} /> : null}
        {tab === "planning" && canPlanning ? <PlanningPageView /> : null}
      </section>
    </main>
  );
}
