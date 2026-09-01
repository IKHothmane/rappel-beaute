"use client";

import { useState } from "react";
import { AdminPageHeader } from "@/components/admin/AdminUi";

const SECTIONS = ["Général", "Formules", "Sécurité", "Notifications", "Maintenance"] as const;

export default function SettingsPage() {
  const [section, setSection] = useState<(typeof SECTIONS)[number]>("Général");
  const [saved, setSaved] = useState(false);

  return (
    <>
      <AdminPageHeader
        title="Paramètres plateforme"
        description="Configuration globale Rappel Beauté."
      />

      <div className="mb-6 flex flex-wrap gap-2">
        {SECTIONS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setSection(s)}
            className={`rounded-lg px-3 py-1.5 text-sm ${
              section === s
                ? "bg-[var(--admin-accent-dim)] text-[var(--admin-accent)]"
                : "border border-[var(--admin-line)] text-[var(--admin-muted)]"
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      <form
        className="mx-auto max-w-xl space-y-4 ac-card p-6"
        onSubmit={(e) => {
          e.preventDefault();
          setSaved(true);
        }}
      >
        {section === "Général" ? (
          <>
            <Field label="Nom plateforme" defaultValue="Rappel Beauté" />
            <Field label="E-mail support" defaultValue="support@rappelbeaute.ma" />
            <Field label="Téléphone" defaultValue="+212 5 22 00 00 00" />
            <Field label="Devise" defaultValue="MAD" />
            <Field label="Fuseau horaire" defaultValue="Africa/Casablanca" />
          </>
        ) : null}
        {section === "Formules" ? (
          <ul className="space-y-2 text-sm">
            <li className="rounded-lg border border-[var(--admin-line)] p-3">Starter — 299 MAD · 150 RDV</li>
            <li className="rounded-lg border border-[var(--admin-line)] p-3">Institut — 499 MAD · 300 RDV</li>
            <li className="rounded-lg border border-[var(--admin-line)] p-3">Premium — 899 MAD · illimité</li>
            <li className="rounded-lg border border-[var(--admin-line)] p-3 text-[var(--admin-muted)]">
              Enterprise — sur devis (hors V1)
            </li>
          </ul>
        ) : null}
        {section === "Sécurité" ? (
          <>
            <Field label="Durée de session (minutes)" defaultValue="60" />
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" defaultChecked /> 2FA obligatoire (admin)
            </label>
            <Field label="Limite de requêtes / min" defaultValue="120" />
            <Field label="Tentatives de connexion max" defaultValue="5" />
          </>
        ) : null}
        {section === "Notifications" ? (
          <>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" defaultChecked /> E-mail</label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" defaultChecked /> Système</label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" defaultChecked /> Paiement</label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" defaultChecked /> Sécurité</label>
          </>
        ) : null}
        {section === "Maintenance" ? (
          <>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" /> Mode maintenance
            </label>
            <label className="block text-sm">
              <span className="mb-1.5 block text-[var(--admin-muted)]">Message</span>
              <textarea
                className="ac-input"
                rows={3}
                defaultValue="Maintenance planifiée. Retour sous peu."
              />
            </label>
          </>
        ) : null}

        <button type="submit" className="ac-btn">
          Enregistrer (démonstration)
        </button>
        {saved ? (
          <p className="text-sm text-[var(--admin-muted)]">Enregistré en simulation.</p>
        ) : null}
      </form>
    </>
  );
}

function Field({ label, defaultValue }: { label: string; defaultValue?: string }) {
  return (
    <label className="block text-sm">
      <span className="mb-1.5 block text-[var(--admin-muted)]">{label}</span>
      <input className="ac-input" defaultValue={defaultValue} />
    </label>
  );
}
