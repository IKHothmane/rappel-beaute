"use client";

import { useState } from "react";
import { CITIES } from "@/lib/site";

type LeadKind = "DEMO" | "ESSAI";

type Props = {
  kind: LeadKind;
  defaultPlan?: string;
  notice?: string;
};

export function LeadForm({ kind, defaultPlan = "", notice }: Props) {
  const [sent, setSent] = useState(false);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSent(true);
  }

  if (sent) {
    return (
      <div className="surface p-8">
        <p className="eyebrow">{kind === "DEMO" ? "Démo" : "Essai"}</p>
        <h2 className="mt-3 font-display text-2xl font-semibold">Demande bien reçue.</h2>
        <p className="mt-3 text-sm leading-relaxed text-ink/70">
          {kind === "ESSAI"
            ? "Votre accès sera activé sous 24 h. Aucune carte bancaire n’est demandée."
            : "Nous vous contactons pour caler 20 minutes de démonstration."}
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="surface grid gap-4 p-6 sm:p-8">
      {notice ? (
        <p className="rounded-lg bg-primary-light px-3 py-2 text-sm text-primary-dark">
          {notice}
        </p>
      ) : null}

      <Field label="Votre nom" name="name" required />
      <Field label="Nom de l’institut" name="institut" required />

      <label className="block text-sm">
        <span className="mb-1.5 block font-medium">Ville</span>
        <select
          name="ville"
          required
          defaultValue=""
          className="w-full rounded-lg border border-line bg-white px-3 py-2.5 text-sm outline-none focus:border-primary"
        >
          <option value="" disabled>
            Choisir
          </option>
          {CITIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </label>

      <Field label="Téléphone" name="phone" type="tel" required />
      <Field label="E-mail" name="email" type="email" required />

      {kind === "ESSAI" ? (
        <label className="block text-sm">
          <span className="mb-1.5 block font-medium">Plan souhaité</span>
          <select
            name="plan"
            defaultValue={defaultPlan || "institut"}
            className="w-full rounded-lg border border-line bg-white px-3 py-2.5 text-sm outline-none focus:border-primary"
          >
            <option value="starter">Starter — 299 MAD · 150 RDV</option>
            <option value="institut">Institut — 499 MAD · 300 RDV</option>
            <option value="premium">Premium — 899 MAD · illimité</option>
          </select>
        </label>
      ) : null}

      <label className="block text-sm">
        <span className="mb-1.5 block font-medium">Message</span>
        <textarea
          name="message"
          rows={4}
          className="w-full resize-y rounded-lg border border-line bg-white px-3 py-2.5 text-sm outline-none focus:border-primary"
          placeholder={
            kind === "ESSAI"
              ? "Nombre de cabines, équipe, besoin prioritaire…"
              : "Quand êtes-vous disponible pour une démo ?"
          }
        />
      </label>

      <button type="submit" className="btn-primary mt-2 w-full sm:w-auto">
        {kind === "DEMO" ? "Envoyer la demande de démo" : "Demander l’activation"}
      </button>
      <p className="text-xs text-ink/45">
        Aucune donnée métier n’est lue ici. Formulaire vitrine uniquement.
      </p>
    </form>
  );
}

function Field({
  label,
  name,
  type = "text",
  required,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="block text-sm">
      <span className="mb-1.5 block font-medium">{label}</span>
      <input
        name={name}
        type={type}
        required={required}
        className="w-full rounded-lg border border-line bg-white px-3 py-2.5 text-sm outline-none focus:border-primary"
      />
    </label>
  );
}
