"use client";

import { useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  UsersRound,
  CalendarDays,
  ChevronRight,
} from "lucide-react";
import { useCurrentUser } from "@/components/auth/session-provider";
import { canAccessNav } from "@/lib/rbac";
import { StaffPageView } from "@/components/staff/staff-page";
import { PlanningPageView } from "@/components/planning/planning-page";
import { cn } from "@/lib/utils";

type Tab = "staff" | "planning";

const TABS = [
  {
    id: "staff" as const,
    label: "Équipe",
    icon: UsersRound,
    description: "Profils et performances",
    navKey: "staff",
  },
  {
    id: "planning" as const,
    label: "Planning",
    icon: CalendarDays,
    description: "Horaires et disponibilités",
    navKey: "planning",
  },
];

export function TeamWorkspace() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const user = useCurrentUser();

  const canStaff = canAccessNav(user.role, "staff");
  const canPlanning = canAccessNav(user.role, "planning");

  const requestedTab = useMemo<Tab>(() => {
    return searchParams.get("tab") === "planning" ? "planning" : "staff";
  }, [searchParams]);

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

  function setTab(nextTab: Tab) {
    if (nextTab === "staff" && !canStaff) return;
    if (nextTab === "planning" && !canPlanning) return;
    router.replace(nextTab === "staff" ? "/staff/" : "/staff/?tab=planning", { scroll: false });
  }

  if (!canStaff && !canPlanning) {
    return (
      <div className="rounded-2xl border border-[#F0E6EA] bg-white p-8 text-center text-sm text-ink/55 shadow-sm">
        Vous n’avez pas accès à l’équipe ni au planning.
      </div>
    );
  }

  const visibleTabs = TABS.filter((item) =>
    item.id === "staff" ? canStaff : canPlanning,
  );

  return (
    <div className="w-full min-w-0 space-y-5">
      <header className="overflow-hidden rounded-[24px] bg-gradient-to-r from-[#751139] via-[#991747] to-[#C63370] p-6 text-white shadow-lg lg:p-8">
        <div className="flex flex-wrap items-center justify-between gap-5">
          <div>
            <div className="mb-3 flex items-center gap-2 text-xs text-white/70">
              <UsersRound size={15} />
              Gestion des ressources humaines
              <ChevronRight size={13} />
              Équipe & Planning
            </div>
            <h1 className="text-2xl font-bold tracking-tight lg:text-3xl">Équipe & Planning</h1>
            <p className="mt-2 max-w-xl text-sm text-white/80">
              Gérez vos collaboratrices, leurs horaires, leurs absences et leurs performances depuis un
              seul espace.
            </p>
          </div>
          <div className="flex items-center gap-3 rounded-2xl border border-white/20 bg-white/10 px-5 py-4 backdrop-blur">
            <CalendarDays size={23} />
            <div>
              <p className="text-xs text-white/70">Organisation</p>
              <p className="text-sm font-bold">Planning synchronisé</p>
            </div>
          </div>
        </div>
      </header>

      <nav
        aria-label="Navigation Équipe et Planning"
        className="flex flex-wrap gap-2 rounded-2xl border border-[#F0E6EA] bg-white p-2 shadow-sm"
      >
        {visibleTabs.map((item) => {
          const Icon = item.icon;
          const active = tab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex min-w-[170px] flex-1 items-center gap-3 rounded-xl px-5 py-3 text-left transition-all duration-200",
                active ? "bg-[#FCE8F0] text-[#A40D4B]" : "text-[#647084] hover:bg-[#F8F3F5]",
              )}
            >
              <Icon size={20} />
              <div>
                <p className="text-sm font-bold">{item.label}</p>
                <p className="text-[11px] opacity-70">{item.description}</p>
              </div>
            </button>
          );
        })}
      </nav>

      <section>
        {tab === "staff" && canStaff ? <StaffPageView /> : null}
        {tab === "planning" && canPlanning ? <PlanningPageView /> : null}
      </section>
    </div>
  );
}
