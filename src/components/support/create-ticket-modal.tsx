"use client";

import { Send } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { PremiumSidePanel } from "@/components/ui/premium-side-panel";
import {
  CREATE_CATEGORIES,
  SUPPORT_CATEGORY_LABEL,
  type CreateModalMode,
} from "@/components/support/support-helpers";
import type { SupportTicketCategory } from "@/lib/db/support-tickets";
import { cn } from "@/lib/utils";

type Priority = "LOW" | "NORMAL" | "HIGH" | "URGENT";

export type CreateTicketInput = {
  subject: string;
  category: SupportTicketCategory;
  message: string;
  priority: string;
};

const TICKET_PRIORITIES: { value: Priority; label: string; hint: string }[] = [
  { value: "LOW", label: "Faible", hint: "Sans urgence" },
  { value: "NORMAL", label: "Normale", hint: "Réponse sous 24 h" },
  { value: "HIGH", label: "Haute", hint: "Gêne le travail" },
  { value: "URGENT", label: "Urgente", hint: "Activité bloquée" },
];

const BUG_IMPACTS: { value: Priority; label: string; hint: string }[] = [
  { value: "NORMAL", label: "Gênant", hint: "Contournable" },
  { value: "HIGH", label: "Bloquant", hint: "Je ne peux pas travailler" },
  { value: "URGENT", label: "Critique", hint: "Données ou paiements touchés" },
];

const BUG_AREAS = [
  "Agenda et rendez-vous",
  "Caisse, paiements et factures",
  "Clientes",
  "Stock et produits",
  "WhatsApp et notifications",
  "Promotions et fidélité",
  "Connexion et compte",
  "Autre",
];

const FIELD =
  "rounded-lg bg-surface-container-low px-3 text-[13px] text-on-surface focus:outline-none focus:ring-2 focus:ring-primary";
const LABEL = "text-[11px] font-bold uppercase tracking-wide text-on-surface";

function PriorityPicker({
  legend,
  value,
  options,
  onChange,
}: {
  legend: string;
  value: Priority;
  options: { value: Priority; label: string; hint: string }[];
  onChange: (value: Priority) => void;
}) {
  return (
    <fieldset className="flex flex-col gap-1.5">
      <legend className={LABEL}>{legend}</legend>
      <div role="radiogroup" aria-label={legend} className={cn("grid gap-2", options.length === 3 ? "grid-cols-3" : "grid-cols-2 sm:grid-cols-4")}>
        {options.map((o) => {
          const active = o.value === value;
          return (
            <button
              key={o.value}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onChange(o.value)}
              className={cn(
                "flex flex-col items-start rounded-lg border px-3 py-2 text-left transition",
                active
                  ? "border-primary bg-primary-container/30 text-on-surface"
                  : "border-transparent bg-surface-container-low text-on-surface-variant hover:bg-surface-container",
              )}
            >
              <span className="text-[13px] font-bold">{o.label}</span>
              <span className="text-[11px] leading-tight opacity-75">{o.hint}</span>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

function Counter({ value, max }: { value: string; max: number }) {
  return (
    <span className={cn("self-end text-[11px] tabular-nums", value.length > max * 0.9 ? "text-error" : "text-on-surface-variant")}>
      {value.length}/{max}
    </span>
  );
}

export function CreateTicketModal({
  orgName,
  mode,
  creating,
  onClose,
  onCreate,
}: {
  orgName: string;
  mode: CreateModalMode;
  creating: boolean;
  onClose: () => void;
  onCreate: (input: CreateTicketInput) => Promise<void>;
}) {
  const isBug = mode === "bug";
  const formId = useId();
  const firstFieldRef = useRef<HTMLInputElement>(null);

  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState<SupportTicketCategory>("TECHNICAL");
  const [priority, setPriority] = useState<Priority>("NORMAL");
  const [message, setMessage] = useState("");
  // Signalement d'anomalie : champs guidés, assemblés en un seul message.
  const [area, setArea] = useState(BUG_AREAS[0]);
  const [steps, setSteps] = useState("");
  const [expected, setExpected] = useState("");
  const [actual, setActual] = useState("");

  useEffect(() => {
    // Le panneau est monté dans un portail : on laisse le temps à l'animation d'entrée avant de donner le focus.
    const timer = window.setTimeout(() => firstFieldRef.current?.focus(), 150);
    return () => window.clearTimeout(timer);
  }, []);

  const composedMessage = isBug
    ? [
        `Zone concernée : ${area}`,
        `Étapes pour reproduire :\n${steps.trim()}`,
        expected.trim() ? `Résultat attendu :\n${expected.trim()}` : "",
        `Résultat obtenu :\n${actual.trim()}`,
      ]
        .filter(Boolean)
        .join("\n\n")
    : message.trim();

  const valid = subject.trim().length > 0 && (isBug ? steps.trim() && actual.trim() : message.trim());

  const title = isBug ? "Signaler une anomalie technique" : "Ouvrir un nouveau ticket d'assistance";
  const description = isBug
    ? `${orgName} · Plus c'est précis, plus vite nous corrigeons`
    : `${orgName} · Réponse de l'équipe sous 24 h ouvrées`;

  return (
    <PremiumSidePanel
      open
      onClose={() => {
        if (!creating) onClose();
      }}
      title={title}
      description={description}
      footer={
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={creating}
            className="rounded-lg px-4 py-2.5 text-sm font-bold text-on-surface-variant hover:bg-surface-container disabled:opacity-50"
          >
            Annuler
          </button>
          <button
            type="submit"
            form={formId}
            disabled={creating || !valid}
            className="flex items-center gap-2 rounded-lg bg-primary-container px-6 py-2.5 text-sm font-bold text-on-primary-container shadow-sm hover:bg-primary disabled:opacity-50"
          >
            <Send className="h-[18px] w-[18px]" aria-hidden="true" />
            {creating ? "Envoi…" : isBug ? "Envoyer le signalement" : "Créer le ticket"}
          </button>
        </div>
      }
    >
        <form
          id={formId}
          className="flex flex-col gap-4"
          onSubmit={async (event) => {
            event.preventDefault();
            if (!valid || creating) return;
            await onCreate({
              subject: subject.trim(),
              category: isBug ? "BUG" : category,
              message: composedMessage,
              priority,
            });
          }}
        >
          <label className="flex flex-col gap-1">
            <span className={LABEL}>Sujet *</span>
            <input
              ref={firstFieldRef}
              required
              maxLength={200}
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder={
                isBug ? "Ex. : Le bouton Encaisser ne répond plus" : "Ex. : Question sur ma facture de novembre"
              }
              className={cn(FIELD, "h-11")}
            />
          </label>

          {isBug ? (
            <>
              <label className="flex flex-col gap-1">
                <span className={LABEL}>Zone concernée *</span>
                <select value={area} onChange={(e) => setArea(e.target.value)} className={cn(FIELD, "h-11 cursor-pointer")}>
                  {BUG_AREAS.map((a) => (
                    <option key={a} value={a}>
                      {a}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1">
                <span className={LABEL}>Étapes pour reproduire *</span>
                <textarea
                  required
                  rows={3}
                  maxLength={1200}
                  value={steps}
                  onChange={(e) => setSteps(e.target.value)}
                  placeholder={"1. Ouvrir l'agenda\n2. Cliquer sur un rendez-vous\n3. Appuyer sur Encaisser"}
                  className={cn(FIELD, "p-3")}
                />
                <Counter value={steps} max={1200} />
              </label>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <label className="flex flex-col gap-1">
                  <span className={LABEL}>Résultat attendu</span>
                  <textarea
                    rows={3}
                    maxLength={1200}
                    value={expected}
                    onChange={(e) => setExpected(e.target.value)}
                    placeholder="Ce que vous pensiez voir"
                    className={cn(FIELD, "p-3")}
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className={LABEL}>Résultat obtenu *</span>
                  <textarea
                    required
                    rows={3}
                    maxLength={1200}
                    value={actual}
                    onChange={(e) => setActual(e.target.value)}
                    placeholder="Ce qui s'est réellement passé, message d'erreur éventuel"
                    className={cn(FIELD, "p-3")}
                  />
                </label>
              </div>
              <PriorityPicker legend="Impact *" value={priority} options={BUG_IMPACTS} onChange={setPriority} />
            </>
          ) : (
            <>
              <label className="flex flex-col gap-1">
                <span className={LABEL}>Catégorie *</span>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as SupportTicketCategory)}
                  className={cn(FIELD, "h-11 cursor-pointer")}
                >
                  {CREATE_CATEGORIES.filter((c) => c !== "BUG").map((c) => (
                    <option key={c} value={c}>
                      {SUPPORT_CATEGORY_LABEL[c]}
                    </option>
                  ))}
                </select>
              </label>
              <PriorityPicker legend="Priorité *" value={priority} options={TICKET_PRIORITIES} onChange={setPriority} />
              <label className="flex flex-col gap-1">
                <span className={LABEL}>Description *</span>
                <textarea
                  required
                  maxLength={5000}
                  rows={5}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Décrivez la situation, les étapes déjà tentées et l'impact sur votre activité…"
                  className={cn(FIELD, "p-3")}
                />
                <Counter value={message} max={5000} />
              </label>
            </>
          )}

        </form>
    </PremiumSidePanel>
  );
}
