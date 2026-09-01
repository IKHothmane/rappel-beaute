"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AdminPageHeader } from "@/components/admin/AdminUi";
import { CITIES } from "@/lib/site";
import { createOrganizationApi } from "@/modules/admin/client";
import type { SubscriptionPlan } from "@/types/platform";

export default function NewOrganizationPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{
    name: string;
    owner: string;
    plan: string;
    orgId: string;
    activationUrl: string;
  } | null>(null);

  const [form, setForm] = useState({
    name: "",
    slug: "",
    phone: "",
    email: "",
    city: "Casablanca",
    address: "",
    ownerFirst: "",
    ownerLast: "",
    ownerEmail: "",
    ownerPhone: "",
    plan: "INSTITUT" as SubscriptionPlan,
  });

  function slugify(name: string) {
    return name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  }

  async function submit() {
    setLoading(true);
    setError(null);
    try {
      const result = await createOrganizationApi({
        name: form.name,
        slug: form.slug || slugify(form.name),
        phone: form.phone,
        email: form.email,
        city: form.city,
        address: form.address || null,
        owner: {
          firstName: form.ownerFirst,
          lastName: form.ownerLast,
          email: form.ownerEmail,
          phone: form.ownerPhone || null,
        },
        plan: form.plan,
      });
      setDone({
        name: form.name,
        owner: `${form.ownerFirst} ${form.ownerLast}`.trim(),
        plan: form.plan,
        orgId: result.organizationId,
        activationUrl: result.activationUrl,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div className="mx-auto max-w-lg ac-card p-8">
        <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--admin-ok)]">
          Institut créé
        </p>
        <h1 className="mt-3 font-display text-2xl font-semibold">Succès</h1>
        <dl className="mt-6 space-y-2 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-[var(--admin-muted)]">Institut</dt>
            <dd className="font-medium">{done.name}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-[var(--admin-muted)]">Propriétaire</dt>
            <dd className="font-medium">{done.owner}</dd>
          </div>
        </dl>
        <p className="mt-4 text-xs text-[var(--admin-muted)]">
          Envoyez ce lien d&apos;activation au propriétaire (mot de passe choisi par lui/elle) :
        </p>
        <p className="mt-2 break-all rounded bg-[#FBF4F6] p-2 font-mono text-[10px]">{done.activationUrl}</p>
        <div className="mt-8 flex flex-col gap-2">
          <Link href={`/organizations/${done.orgId}/`} className="ac-btn text-center">
            Ouvrir l&apos;institut
          </Link>
          <button
            type="button"
            className="ac-btn-ghost"
            onClick={() => navigator.clipboard?.writeText(done.activationUrl)}
          >
            Copier le lien d&apos;activation
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <AdminPageHeader
        title="Créer un institut"
        description={`Étape ${step} sur 3 — transaction atomique côté serveur.`}
      />

      {error ? <p className="mb-4 text-sm text-red-600">{error}</p> : null}

      <div className="mx-auto max-w-xl space-y-4 ac-card p-6 sm:p-8">
        {step === 1 ? (
          <>
            <h2 className="font-display text-lg font-semibold">1 — Institut</h2>
            <Field label="Nom *" value={form.name} onChange={(v) => setForm({ ...form, name: v, slug: slugify(v) })} />
            <Field label="Slug *" value={form.slug} onChange={(v) => setForm({ ...form, slug: v })} />
            <Field label="Téléphone *" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} />
            <Field label="E-mail *" value={form.email} onChange={(v) => setForm({ ...form, email: v })} type="email" />
            <label className="block text-sm">
              <span className="mb-1.5 block text-[var(--admin-muted)]">Ville</span>
              <select
                className="ac-input"
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
              >
                {CITIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </label>
            <Field label="Adresse" value={form.address} onChange={(v) => setForm({ ...form, address: v })} />
          </>
        ) : null}

        {step === 2 ? (
          <>
            <h2 className="font-display text-lg font-semibold">2 — Propriétaire</h2>
            <Field label="Prénom *" value={form.ownerFirst} onChange={(v) => setForm({ ...form, ownerFirst: v })} />
            <Field label="Nom *" value={form.ownerLast} onChange={(v) => setForm({ ...form, ownerLast: v })} />
            <Field label="E-mail *" value={form.ownerEmail} onChange={(v) => setForm({ ...form, ownerEmail: v })} type="email" />
            <Field label="Téléphone" value={form.ownerPhone} onChange={(v) => setForm({ ...form, ownerPhone: v })} />
            <p className="text-xs text-[var(--admin-muted)]">
              Aucun mot de passe temporaire — un lien d&apos;activation sera généré.
            </p>
          </>
        ) : null}

        {step === 3 ? (
          <>
            <h2 className="font-display text-lg font-semibold">3 — Abonnement</h2>
            {(["STARTER", "INSTITUT", "PREMIUM"] as const).map((p) => (
              <label key={p} className="flex items-center gap-3 rounded-lg border border-[var(--admin-line)] p-3 text-sm">
                <input
                  type="radio"
                  name="plan"
                  checked={form.plan === p}
                  onChange={() => setForm({ ...form, plan: p })}
                />
                {p === "STARTER" ? "Starter — 299 MAD" : p === "INSTITUT" ? "Institut — 499 MAD" : "Premium — 899 MAD"}
              </label>
            ))}
          </>
        ) : null}

        <div className="flex flex-wrap gap-2 pt-2">
          {step > 1 ? (
            <button type="button" className="ac-btn-ghost" onClick={() => setStep((s) => s - 1)}>
              Retour
            </button>
          ) : null}
          {step < 3 ? (
            <button type="button" className="ac-btn" onClick={() => setStep((s) => s + 1)}>
              Continuer
            </button>
          ) : (
            <button type="button" className="ac-btn" disabled={loading} onClick={submit}>
              {loading ? "Création…" : "Créer l'institut"}
            </button>
          )}
        </div>
      </div>
    </>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <label className="block text-sm">
      <span className="mb-1.5 block text-[var(--admin-muted)]">{label}</span>
      <input type={type} required className="ac-input" value={value} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}
