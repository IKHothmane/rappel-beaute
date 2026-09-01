"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  AdminPageHeader,
  PlanBadge,
  StatTile,
  StatusBadge,
} from "@/components/admin/AdminUi";
import { PLAN_LABEL } from "@/types/platform";
import { fetchAdminDashboard, fetchAdminSession } from "@/modules/admin/client";

function mad(n: number) {
  return `${n.toLocaleString("fr-MA")} MAD`;
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<Awaited<ReturnType<typeof fetchAdminDashboard>> | null>(null);
  const [firstName, setFirstName] = useState("");

  useEffect(() => {
    fetchAdminSession().then((u) => {
      if (u && "firstName" in u) setFirstName(String(u.firstName));
    });
    fetchAdminDashboard().then(setStats).catch(console.error);
  }, []);

  const s = stats?.stats;

  return (
    <>
      <AdminPageHeader
        title={firstName ? `Bonjour, ${firstName}` : "Tableau de bord"}
        description="Activité plateforme en temps réel."
        action={
          <Link href="/organizations/new/" className="ac-btn">
            + Créer un institut
          </Link>
        }
      />

      {s ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <StatTile label="Instituts" value={String(s.orgs)} hint={`${s.orgsActive} actifs`} />
          <StatTile label="Actifs" value={String(s.orgsActive)} hint={`+${s.orgsDelta} ce mois`} />
          <StatTile label="Utilisateurs" value={String(s.users)} hint={`+${s.usersDelta} ce mois`} />
          <StatTile label="MRR" value={mad(s.mrr)} />
          <StatTile label="ARR" value={mad(s.arr)} />
          <StatTile label="Abonnements" value={`${s.activeSubs} actifs`} />
        </div>
      ) : (
        <p className="text-sm text-[var(--admin-muted)]">Chargement…</p>
      )}

      {stats?.audit?.length ? (
        <section className="ac-card mt-6">
          <div className="flex items-center justify-between border-b border-[var(--admin-line)] px-5 py-4">
            <h2 className="font-display text-lg font-semibold">Activité récente</h2>
            <Link href="/audit/" className="text-sm text-[var(--admin-accent)]">
              Audit
            </Link>
          </div>
          <ul className="divide-y divide-[var(--admin-line)]">
            {(stats.audit as { action: string; createdAt: string }[]).slice(0, 8).map((a, i) => (
              <li key={i} className="px-5 py-3.5 text-sm">
                <span className="font-mono text-xs text-[var(--admin-muted)]">
                  {new Date(a.createdAt).toLocaleString("fr-FR")}
                </span>
                <span className="ml-2">{a.action.replace(/_/g, " ")}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <p className="mt-6 text-xs text-[var(--admin-muted)]">
        Formules : {(["STARTER", "INSTITUT", "PREMIUM"] as const).map((p) => PLAN_LABEL[p]).join(" · ")}
      </p>
    </>
  );
}
