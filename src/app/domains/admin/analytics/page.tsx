import type { Metadata } from "next";
import { AdminPageHeader, MiniBars, StatTile } from "@/components/admin/AdminUi";
import { MRR_SERIES, platformStats } from "@/lib/admin-mock";

export const metadata: Metadata = { title: "Analytics" };

export default function AnalyticsPage() {
  const s = platformStats();

  return (
    <>
      <AdminPageHeader
        title="Analytics plateforme"
        description="Pilotage du business SaaS — distinct de l’analytics institut."
      />

      <h2 className="mb-3 font-display text-lg font-semibold">Acquisition</h2>
      <div className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="Nouveaux instituts" value={`+${s.orgsDelta}`} />
        <StatTile label="Activation" value="78 %" />
        <StatTile label="Conversion essai → payant" value="41 %" />
        <StatTile label="Sources" value="Direct / Démo" />
      </div>

      <h2 className="mb-3 font-display text-lg font-semibold">Usage</h2>
      <div className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatTile label="RDV créés" value={s.rdv.toLocaleString("fr-MA")} />
        <StatTile label="Clientes créées" value="12 480" />
        <StatTile label="Services créés" value="3 210" />
        <StatTile label="Utilisateurs actifs" value="289" />
        <StatTile label="Connexions / jour" value="1 120" />
      </div>

      <h2 className="mb-3 font-display text-lg font-semibold">Business</h2>
      <div className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatTile label="MRR" value={`${s.mrr.toLocaleString("fr-MA")} MAD`} />
        <StatTile label="ARR" value={`${s.arr.toLocaleString("fr-MA")} MAD`} />
        <StatTile label="ARPU" value="249 MAD" />
        <StatTile label="Churn" value="2,1 %" />
        <StatTile label="LTV" value="8 900 MAD" />
        <StatTile label="CAC" value="420 MAD" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="ac-card p-5">
          <h3 className="font-display text-lg font-semibold">Formules</h3>
          <ul className="mt-4 space-y-3 text-sm">
            {(["STARTER", "INSTITUT", "PREMIUM"] as const).map((p) => (
              <li key={p} className="flex justify-between">
                <span>
                  {p === "STARTER" ? "Starter" : p === "INSTITUT" ? "Institut" : "Premium"}
                </span>
                <span className="font-mono text-[var(--admin-muted)]">
                  {s.planShare[p]} %
                </span>
              </li>
            ))}
          </ul>
        </section>
        <section className="ac-card p-5">
          <h3 className="font-display text-lg font-semibold">Croissance mensuelle</h3>
          <div className="mt-4">
            <MiniBars
              data={MRR_SERIES.map((p) => p.value)}
              labels={MRR_SERIES.map((p) => p.label)}
            />
          </div>
        </section>
      </div>
    </>
  );
}
