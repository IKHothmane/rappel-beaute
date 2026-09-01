"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AppPageHeader } from "@/components/app/AppUi";
import { PLAN_FEATURE_LABELS, type PlanFeatureKey, type SubscriptionDto, type UsageDto } from "@/types/subscription";

export default function SubscriptionSettingsPage() {
  const [sub, setSub] = useState<SubscriptionDto | null>(null);
  const [usage, setUsage] = useState<UsageDto | null>(null);
  const [features, setFeatures] = useState<{ key: PlanFeatureKey; label: string; enabled: boolean }[]>([]);

  useEffect(() => {
    Promise.all([
      fetch("/api/subscription/", { credentials: "include" }).then((r) => r.json()),
      fetch("/api/subscription/usage/", { credentials: "include" }).then((r) => r.json()),
      fetch("/api/subscription/features/", { credentials: "include" }).then((r) => r.json()),
    ]).then(([s, u, f]) => {
      setSub(s.subscription ?? null);
      setUsage(u.usage ?? null);
      setFeatures(f.features ?? []);
    });
  }, []);

  if (!sub) {
    return <p className="text-sm text-ink/60">Chargement de votre abonnement…</p>;
  }

  function pct(used: number, max: number | null) {
    if (max == null || max === 0) return 0;
    return Math.min(100, Math.round((used / max) * 100));
  }

  return (
    <>
      <AppPageHeader
        title="Votre abonnement"
        description="Formule, limites et fonctionnalités incluses."
      />

      <section className="surface mb-6 p-6">
        <p className="font-mono text-xs uppercase tracking-widest text-primary">{sub.planName}</p>
        <p className="mt-2 font-display text-3xl font-semibold">
          {sub.priceSnapshot.toLocaleString("fr-MA")} {sub.currencySnapshot} / mois
        </p>
        <p className="mt-1 text-sm text-ink/60">
          Statut : {sub.status} · Renouvellement le{" "}
          {new Date(sub.currentPeriodEnd).toLocaleDateString("fr-FR")}
        </p>
        {sub.trialEndsAt ? (
          <p className="mt-1 text-sm text-amber-700">
            Essai jusqu&apos;au {new Date(sub.trialEndsAt).toLocaleDateString("fr-FR")}
          </p>
        ) : null}
      </section>

      {usage ? (
        <div className="mb-6 grid gap-4 sm:grid-cols-2">
          <UsageBar
            label="Rendez-vous"
            used={usage.appointments.used}
            max={usage.appointments.max}
          />
          <UsageBar label="Employées" used={usage.staff.used} max={usage.staff.max} />
          <UsageBar label="Clientes" used={usage.customers.used} max={usage.customers.max} />
          <UsageBar label="Ressources" used={usage.resources.used} max={usage.resources.max} />
        </div>
      ) : null}

      <section className="surface p-6">
        <h2 className="font-display text-lg font-semibold">Fonctionnalités incluses</h2>
        <ul className="mt-4 grid gap-2 sm:grid-cols-2">
          {features.map((f) => (
            <li key={f.key} className={`text-sm ${f.enabled ? "text-ink" : "text-ink/35"}`}>
              {f.enabled ? "✓" : "○"} {f.label}
            </li>
          ))}
        </ul>
        <p className="mt-6 text-sm text-ink/60">
          Besoin de plus de capacité ?{" "}
          <Link href="mailto:contact@rappelbeaute.ma" className="font-semibold text-primary">
            Contactez-nous
          </Link>
        </p>
      </section>
    </>
  );
}

function UsageBar({
  label,
  used,
  max,
}: {
  label: string;
  used: number;
  max: number | null;
}) {
  const unlimited = max == null;
  const pct = unlimited ? 0 : Math.min(100, Math.round((used / max) * 100));
  return (
    <div className="surface p-4">
      <div className="flex justify-between text-sm">
        <span className="font-medium">{label}</span>
        <span className="font-mono tabular-nums text-ink/60">
          {used} / {unlimited ? "∞" : max}
        </span>
      </div>
      {!unlimited ? (
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-primary-light">
          <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
        </div>
      ) : null}
    </div>
  );
}
