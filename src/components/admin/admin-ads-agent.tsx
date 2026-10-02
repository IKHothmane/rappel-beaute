"use client";

import { useEffect, useState } from "react";
import { AdminPageHeader, StatTile } from "@/components/admin/AdminUi";
import type { AdsAgentMode } from "@/modules/ads/ads-rules.service";
import type { AdsConfigRow, AdsDecisionRow } from "@/modules/ads/ads-store";

type Dashboard = {
  config: AdsConfigRow;
  connection: { connected: boolean; customerId: string | null };
  metrics: {
    campaigns: {
      id: string;
      externalId: string;
      name: string;
      status: "ACTIVE" | "PAUSED" | "UNKNOWN";
      dailyBudgetDh: number;
      todaySpendDh: number;
      monthSpendDh: number;
      clicks: number;
      googleConversions: number;
    }[];
    todaySpendDh: number;
    monthSpendDh: number;
    clicks: number;
    signupsToday: number;
    signupsMonth: number;
    activeTrials: number;
    subscriptions: number;
    costPerSignup: number | null;
    costPerSubscription: number | null;
  };
  decisions: AdsDecisionRow[];
};

const MODE_LABEL: Record<AdsAgentMode, string> = {
  OBSERVE: "Observation",
  LIMITED: "Automatique limité",
  OPTIMIZE: "Automatique limité",
};

export function AdminAdsAgentView() {
  const [data, setData] = useState<Dashboard | null>(null);
  const [form, setForm] = useState<AdsConfigRow | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  async function load() {
    const res = await fetch("/api/admin/ads/", { credentials: "include" });
    const body = await res.json();
    if (!res.ok) throw new Error(body.error ?? "Chargement impossible");
    setData(body);
    setForm(body.config);
  }

  useEffect(() => {
    load().catch((e) => setError(e instanceof Error ? e.message : "Erreur"));
  }, []);

  async function save(patch: Partial<AdsConfigRow>, emergency = false) {
    setBusy(emergency ? "emergency" : "save");
    setError(null);
    try {
      const res = await fetch("/api/admin/ads/", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patch, emergency }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Enregistrement impossible");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setBusy(null);
    }
  }

  async function analyze(sync: boolean) {
    setBusy(sync ? "sync" : "analyze");
    setError(null);
    try {
      const res = await fetch("/api/admin/ads/analyze/", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sync }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Analyse impossible");
      setData(body);
      setForm(body.config);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setBusy(null);
    }
  }

  async function campaignAction(externalId: string, action: "PAUSE" | "ACTIVATE") {
    setBusy(externalId);
    setError(null);
    try {
      const res = await fetch("/api/admin/ads/campaigns/", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ externalId, action }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Action impossible");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setBusy(null);
    }
  }

  if (!data || !form) {
    return (
      <AdminPageHeader
        title="Meta Ads · Agent IA"
        description={error ?? "Chargement de l'agent d'acquisition."}
      />
    );
  }

  const active = form.agentEnabled;
  return (
    <>
      <AdminPageHeader
        title="Meta Ads · Agent IA"
        description="Outil interne d'acquisition. Les instituts ne voient pas cette page. L'agent applique uniquement les règles ci-dessous."
        action={
          <div className="flex flex-col gap-2 sm:flex-row">
            {!active ? (
              <button
                type="button"
                className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                disabled={busy !== null}
                onClick={() => save({ agentEnabled: true, mode: "OBSERVE" })}
              >
                Activer le mode observation
              </button>
            ) : null}
            <button
              type="button"
              className="rounded-full border border-red-300 bg-white px-4 py-2 text-sm font-semibold text-red-700 disabled:opacity-60"
              disabled={busy !== null}
              onClick={() => save({ agentEnabled: false }, true)}
            >
              {busy === "emergency" ? "Arrêt…" : "Pause d'urgence"}
            </button>
          </div>
        }
      />

      {error ? (
        <p className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>
      ) : null}

      <section className="ac-card mb-6 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm font-semibold text-ink">
            <span className={`mr-2 inline-block h-2.5 w-2.5 rounded-full ${active ? "bg-emerald-500" : "bg-ink/30"}`} />
            {active ? MODE_LABEL[form.mode === "OPTIMIZE" ? "LIMITED" : form.mode] : "Pausé"}
          </p>
          <p className="text-sm text-ink/60">
            {data.connection.connected
              ? `Compte Meta Ads ${data.connection.customerId} · Facebook et Instagram`
              : "Meta Ads non connecté : 0 dépense, aucune campagne inventée."}
          </p>
        </div>
        <fieldset className="mt-4 grid gap-2 text-sm">
          <legend className="mb-1 font-semibold text-ink">Mode</legend>
          <ModeChoice
            name="ads-mode"
            checked={!active}
            label="Désactivé"
            hint="Aucune action automatique."
            onSelect={() => save({ agentEnabled: false }, true)}
          />
          <ModeChoice
            name="ads-mode"
            checked={active && form.mode === "OBSERVE"}
            label="Observation"
            hint="Lecture, analyse, journal et audit. Aucune écriture Meta Ads."
            onSelect={() => save({ agentEnabled: true, mode: "OBSERVE" })}
          />
          <ModeChoice
            name="ads-mode"
            checked={active && form.mode !== "OBSERVE"}
            label="Automatique limité"
            hint="Pause, baisse de budget, hausse plafonnée. À n'activer qu'après validation des chiffres réels."
            onSelect={() => save({ agentEnabled: true, mode: "LIMITED" })}
          />
        </fieldset>
      </section>

      <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          label="Budget aujourd'hui"
          value={`${dh(data.metrics.todaySpendDh)} / ${dh(form.maxDailyBudgetDh)}`}
        />
        <StatTile label="Dépenses du mois" value={dh(data.metrics.monthSpendDh)} hint={`Plafond ${dh(form.maxMonthlyBudgetDh)}`} />
        <StatTile label="Clics" value={String(data.metrics.clicks)} />
        <StatTile label="Inscriptions du mois" value={String(data.metrics.signupsMonth)} hint={`${data.metrics.signupsToday} aujourd'hui`} />
        <StatTile label="Essais actifs" value={String(data.metrics.activeTrials)} />
        <StatTile label="Abonnements payés" value={String(data.metrics.subscriptions)} />
        <StatTile label="Coût / inscription" value={data.metrics.costPerSignup == null ? "—" : dh(data.metrics.costPerSignup)} />
        <StatTile label="Coût / abonnement" value={data.metrics.costPerSubscription == null ? "—" : dh(data.metrics.costPerSubscription)} />
      </div>

      <section className="ac-card mb-6 p-5">
        <div className="flex flex-wrap gap-2">
          <button type="button" className="rounded-full border border-line px-4 py-2 text-sm font-semibold" disabled={busy !== null} onClick={() => analyze(true)}>
            {busy === "sync" ? "Synchronisation…" : "Synchroniser et analyser"}
          </button>
          <button type="button" className="rounded-full border border-line px-4 py-2 text-sm font-semibold" disabled={busy !== null} onClick={() => analyze(false)}>
            {busy === "analyze" ? "Analyse…" : "Analyser les données déjà reçues"}
          </button>
        </div>
        <p className="mt-3 text-xs leading-relaxed text-ink/55">
          Avec une seule campagne, le coût par inscription utilise les instituts créés aujourd&apos;hui dans Rappel Beauty.
          Avec plusieurs campagnes, les règles utilisent les conversions renvoyées par Meta Ads. Les écritures restent bloquées tant que les chiffres réels ne sont pas validés.
        </p>
      </section>

      <section className="mb-6 overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="font-mono text-[10px] uppercase tracking-wide text-ink/40">
            <tr>
              <th className="py-2 pr-3">Campagne</th>
              <th className="py-2 pr-3">Statut</th>
              <th className="py-2 pr-3">Budget / jour</th>
              <th className="py-2 pr-3">Dépense jour</th>
              <th className="py-2 pr-3">Conversions Meta</th>
              <th className="py-2">Action</th>
            </tr>
          </thead>
          <tbody>
            {data.metrics.campaigns.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-6 text-ink/55">
                  Aucune campagne. La synchronisation reste vide tant que le compte Meta Ads n&apos;est pas autorisé.
                </td>
              </tr>
            ) : (
              data.metrics.campaigns.map((campaign) => (
                <tr key={campaign.id} className="border-t border-line">
                  <td className="py-3 pr-3">{campaign.name}</td>
                  <td className="py-3 pr-3">{campaign.status === "ACTIVE" ? "Active" : campaign.status === "PAUSED" ? "En pause" : "Inconnu"}</td>
                  <td className="py-3 pr-3">{dh(campaign.dailyBudgetDh)}</td>
                  <td className="py-3 pr-3">{dh(campaign.todaySpendDh)}</td>
                  <td className="py-3 pr-3">{campaign.googleConversions}</td>
                  <td className="py-3">
                    {campaign.status === "ACTIVE" ? (
                      <button type="button" className="text-sm font-semibold text-primary" disabled={busy !== null} onClick={() => campaignAction(campaign.externalId, "PAUSE")}>
                        Pause
                      </button>
                    ) : (
                      <button type="button" className="text-sm font-semibold text-primary" disabled={busy !== null} onClick={() => campaignAction(campaign.externalId, "ACTIVATE")}>
                        Activer
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>

      <form
        className="ac-card mb-6 grid gap-4 p-5 sm:grid-cols-2"
        onSubmit={(event) => {
          event.preventDefault();
          void save(form);
        }}
      >
        <h2 className="font-display text-xl text-ink sm:col-span-2">Règles de sécurité</h2>
        <p className="text-sm text-ink/60 sm:col-span-2">
          Une demande de hausse, même de 50 %, est ramenée au pourcentage maximum. La création de campagne et la modification des enchères restent bloquées.
        </p>
        <NumberField label="Budget maximum / jour (DH)" value={form.maxDailyBudgetDh} onChange={(maxDailyBudgetDh) => setForm({ ...form, maxDailyBudgetDh })} />
        <NumberField label="Budget maximum / mois (DH)" value={form.maxMonthlyBudgetDh} onChange={(maxMonthlyBudgetDh) => setForm({ ...form, maxMonthlyBudgetDh })} />
        <NumberField label="Augmentation maximale (%)" value={form.maxIncreasePercent} onChange={(maxIncreasePercent) => setForm({ ...form, maxIncreasePercent })} />
        <NumberField label="Diminution maximale (%)" value={form.maxDecreasePercent} onChange={(maxDecreasePercent) => setForm({ ...form, maxDecreasePercent })} />
        <NumberField label="Coût maximum / inscription (DH)" value={form.maxCostPerSignupDh} onChange={(maxCostPerSignupDh) => setForm({ ...form, maxCostPerSignupDh })} />
        <div className="grid gap-2 sm:col-span-2 sm:grid-cols-2">
          <Check label="Surveiller les dépenses" checked={form.watchSpend} onChange={(watchSpend) => setForm({ ...form, watchSpend })} />
          <Check label="Surveiller les conversions" checked={form.watchConversions} onChange={(watchConversions) => setForm({ ...form, watchConversions })} />
          <Check label="Pause si budget dépassé" checked={form.pauseOnBudget} onChange={(pauseOnBudget) => setForm({ ...form, pauseOnBudget })} />
          <Check label="Pause ou baisse si coût trop élevé" checked={form.pauseOnHighCost} onChange={(pauseOnHighCost) => setForm({ ...form, pauseOnHighCost })} />
          <Check label="Réactiver si les conditions redeviennent bonnes" checked={form.reactivateWhenOk} onChange={(reactivateWhenOk) => setForm({ ...form, reactivateWhenOk })} />
          <Check label="Optimiser progressivement le budget" checked={form.optimizeBudget} onChange={(optimizeBudget) => setForm({ ...form, optimizeBudget })} />
          <Check label="Pause automatique" checked={form.autoPause} onChange={(autoPause) => setForm({ ...form, autoPause })} />
          <Check label="Réactivation automatique" checked={form.autoReactivate} onChange={(autoReactivate) => setForm({ ...form, autoReactivate })} />
        </div>
        <div className="grid gap-2 sm:col-span-2 sm:grid-cols-2">
          <Check label="Création de campagne bloquée" checked disabled onChange={() => undefined} />
          <Check label="Modification des enchères bloquée" checked disabled onChange={() => undefined} />
        </div>
        <button type="submit" className="w-fit rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white disabled:opacity-60" disabled={busy !== null}>
          Enregistrer les règles
        </button>
      </form>

      <section>
        <h2 className="mb-3 font-display text-xl text-ink">Journal</h2>
        <ol className="space-y-3">
          {data.decisions.length === 0 ? (
            <li className="text-sm text-ink/55">Aucune décision pour le moment.</li>
          ) : (
            data.decisions.map((item) => <JournalEntry key={item.id} item={item} />)
          )}
        </ol>
      </section>
    </>
  );
}

function ModeChoice({
  name,
  checked,
  label,
  hint,
  onSelect,
}: {
  name: string;
  checked: boolean;
  label: string;
  hint: string;
  onSelect: () => void;
}) {
  return (
    <label className="flex items-start gap-2 rounded-xl border border-line px-3 py-2">
      <input className="mt-1" type="radio" name={name} checked={checked} onChange={onSelect} />
      <span>
        <span className="font-semibold text-ink">{label}</span>
        <span className="mt-0.5 block text-xs text-ink/55">{hint}</span>
      </span>
    </label>
  );
}

function JournalEntry({ item }: { item: AdsDecisionRow }) {
  const metrics = item.metrics;
  const mode = text(metrics?.mode) || "Observation";
  const decision = text(metrics?.decision) || item.summary;
  const motive = text(metrics?.motive) || item.reason;
  const meta = text(metrics?.metaAds) || text(metrics?.googleAds);
  const spend = num(metrics?.todaySpendDh);
  const signups = num(metrics?.signups);
  const cpa = metrics?.cpa == null ? null : num(metrics.cpa);
  const cpaLimit = num(metrics?.cpaLimit);
  const dailyLimit = num(metrics?.dailyLimit);
  return (
    <li className="ac-card px-4 py-3 text-sm">
      <p className="font-mono text-[11px] text-ink/45">
        {new Date(item.createdAt).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })}
      </p>
      <p className="mt-1 font-semibold text-ink">Agent Ads IA</p>
      <p className="text-ink/70">Mode : {mode}</p>
      {metrics ? (
        <p className="mt-2 text-ink/80">
          Dépenses : {dh(spend)}
          <br />
          Inscriptions : {signups}
          <br />
          CPA : {cpa == null ? "—" : dh(cpa)}
          <br />
          Limite CPA : {dh(cpaLimit)}
          <br />
          Limite journalière : {dh(dailyLimit)}
        </p>
      ) : null}
      <p className="mt-2 text-ink">
        Décision :
        <br />
        {decision}
      </p>
      <p className="mt-2 text-ink/70">
        Motif :
        <br />
        {motive}
      </p>
      {meta ? (
        <p className="mt-2 text-ink">
          Meta Ads :
          <br />
          {meta}
        </p>
      ) : null}
    </li>
  );
}

function text(value: unknown) {
  return typeof value === "string" ? value : "";
}

function num(value: unknown) {
  return typeof value === "number" ? value : Number(value ?? 0);
}

function dh(value: number) {
  return `${value.toLocaleString("fr-FR", { maximumFractionDigits: 2 })} DH`;
}

function NumberField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="text-sm">
      {label}
      <input
        type="number"
        min={0}
        className="mt-1 w-full rounded-xl border border-line bg-white px-3 py-2"
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  );
}

function Check({
  label,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <label className="flex items-start gap-2 text-sm text-ink">
      <input
        type="checkbox"
        className="mt-1"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
      />
      {label}
    </label>
  );
}
