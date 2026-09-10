"use client";

import { useCallback, useEffect, useState } from "react";
import { useCurrentUser } from "@/components/auth/session-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, Textarea } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { canSendWhatsapp, canWriteFeatureLimited } from "@/lib/rbac";
import { commitAIWhatsAppDraft, generateAIMessage } from "@/modules/ai/service";
import { listCustomers } from "@/modules/customers/service";
import {
  AI_MESSAGE_KIND_LABEL,
  AI_MESSAGE_KINDS,
  AI_MESSAGE_LANGUAGE_LABEL,
  AI_MESSAGE_TONE_LABEL,
  type AIGenerateMessageResult,
  type AIMessageKind,
  type AIMessageLanguage,
  type AIMessageTone,
} from "@/types/ai";
import type { CustomerListItem } from "@/types/customer";
import type { WhatsAppTaskItem } from "@/types/whatsapp";

type Props = {
  customerId?: string;
  customerLabel?: string;
  onTaskCreated?: (task: WhatsAppTaskItem) => void;
};

export function AIMessageComposer({ customerId: lockedCustomerId, customerLabel, onTaskCreated }: Props) {
  const { toast } = useToast();
  const user = useCurrentUser();
  const canGenerate = canWriteFeatureLimited(user.role, "ai");
  const canOpenWa = canSendWhatsapp(user.role);

  const [kind, setKind] = useState<AIMessageKind>("reactivation");
  const [tone, setTone] = useState<AIMessageTone>("warm");
  const [language, setLanguage] = useState<AIMessageLanguage>("fr");
  const [promotion, setPromotion] = useState("");
  const [objective, setObjective] = useState("");
  const [search, setSearch] = useState("");
  const [hits, setHits] = useState<CustomerListItem[]>([]);
  const [customerId, setCustomerId] = useState(lockedCustomerId ?? "");
  const [customerName, setCustomerName] = useState(customerLabel ?? "");
  const [loading, setLoading] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [result, setResult] = useState<AIGenerateMessageResult | null>(null);
  const [selected, setSelected] = useState(0);
  const [draft, setDraft] = useState("");

  useEffect(() => {
    if (lockedCustomerId) {
      setCustomerId(lockedCustomerId);
      if (customerLabel) setCustomerName(customerLabel);
    }
  }, [lockedCustomerId, customerLabel]);

  useEffect(() => {
    if (lockedCustomerId || search.trim().length < 2) {
      setHits([]);
      return;
    }
    const t = setTimeout(() => {
      void listCustomers({ page: 1, limit: 8, search: search.trim() })
        .then((res) => setHits(res.data ?? []))
        .catch(() => setHits([]));
    }, 280);
    return () => clearTimeout(t);
  }, [search, lockedCustomerId]);

  const generate = useCallback(async () => {
    if (!canGenerate) return;
    setLoading(true);
    try {
      const data = await generateAIMessage({
        kind,
        tone,
        language,
        promotion: promotion.trim() || null,
        objective: objective.trim() || undefined,
        customerId: customerId || null,
        variantCount: 3,
        channel: "whatsapp",
      });
      setResult(data);
      setSelected(0);
      setDraft(data.variants[0] ?? "");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Génération impossible.", "error");
    } finally {
      setLoading(false);
    }
  }, [canGenerate, kind, tone, language, promotion, objective, customerId, toast]);

  /**
   * Prépare la tâche WhatsApp puis ouvre wa.me (envoi manuel).
   * Aucun appel API Meta.
   */
  async function confirmAndOpenWhatsApp() {
    if (!canOpenWa || !customerId || !draft.trim()) return;
    setCommitting(true);
    try {
      const { task } = await commitAIWhatsAppDraft({
        customerId,
        message: draft.trim(),
        kind,
      });
      toast("Message préparé. WhatsApp s'ouvre — validez l'envoi vous-même.", "success");
      onTaskCreated?.(task);
      if (task.waLink) {
        window.open(task.waLink, "_blank", "noopener,noreferrer");
      }
    } catch (e) {
      toast(e instanceof Error ? e.message : "Impossible de préparer WhatsApp.", "error");
    } finally {
      setCommitting(false);
    }
  }

  if (!canGenerate) {
    return (
      <p className="text-sm text-ink/50">Votre rôle ne permet pas de générer des messages IA.</p>
    );
  }

  const p = result?.personalization;
  const dir = language === "ar" ? "rtl" : "ltr";

  return (
    <div className="space-y-4">
      <p className="text-xs text-ink/45">
        L&apos;IA rédige un brouillon à partir des données de la cliente (prénom, dernier
        service, dernière visite). Vous relisez, vous modifiez, puis vous ouvrez WhatsApp.
        Rien n&apos;est envoyé tout seul.
      </p>

      <div className="grid gap-3 sm:grid-cols-3">
        <label className="block">
          <span className="mb-1 block text-xs text-ink/50">Type</span>
          <Select value={kind} onChange={(e) => setKind(e.target.value as AIMessageKind)}>
            {AI_MESSAGE_KINDS.map((k) => (
              <option key={k} value={k}>
                {AI_MESSAGE_KIND_LABEL[k]}
              </option>
            ))}
          </Select>
        </label>
        <label className="block">
          <span className="mb-1 block text-xs text-ink/50">Ton</span>
          <Select value={tone} onChange={(e) => setTone(e.target.value as AIMessageTone)}>
            {(Object.keys(AI_MESSAGE_TONE_LABEL) as AIMessageTone[]).map((t) => (
              <option key={t} value={t}>
                {AI_MESSAGE_TONE_LABEL[t]}
              </option>
            ))}
          </Select>
        </label>
        <label className="block">
          <span className="mb-1 block text-xs text-ink/50">Langue</span>
          <Select
            value={language}
            onChange={(e) => setLanguage(e.target.value as AIMessageLanguage)}
          >
            <option value="fr">🇫🇷 {AI_MESSAGE_LANGUAGE_LABEL.fr}</option>
            <option value="darija">🇲🇦 {AI_MESSAGE_LANGUAGE_LABEL.darija}</option>
            <option value="ar">🇸🇦 {AI_MESSAGE_LANGUAGE_LABEL.ar}</option>
          </Select>
        </label>
      </div>

      {!lockedCustomerId ? (
        <label className="block">
          <span className="mb-1 block text-xs text-ink/50">Cliente</span>
          <Input
            value={customerId ? customerName : search}
            placeholder="Rechercher prénom ou téléphone…"
            onChange={(e) => {
              setCustomerId("");
              setCustomerName("");
              setSearch(e.target.value);
            }}
          />
          {hits.length > 0 && !customerId ? (
            <ul className="mt-1 overflow-hidden rounded-xl border border-line bg-white text-sm">
              {hits.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    className="w-full px-3 py-2 text-left hover:bg-ink/[0.03]"
                    onClick={() => {
                      setCustomerId(c.id);
                      setCustomerName(`${c.firstName} ${c.lastName}`.trim());
                      setSearch("");
                      setHits([]);
                    }}
                  >
                    {c.firstName} {c.lastName}
                    <span className="ml-2 text-xs text-ink/40">{c.phone}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </label>
      ) : (
        <p className="text-sm text-ink/60">
          Destinataire : <span className="font-medium text-ink">{customerName}</span>
        </p>
      )}

      <label className="block">
        <span className="mb-1 block text-xs text-ink/50">Offre / code (optionnel)</span>
        <Input
          value={promotion}
          onChange={(e) => setPromotion(e.target.value)}
          placeholder="ex. -20 % ou code PRINTEMPS"
        />
      </label>

      <label className="block">
        <span className="mb-1 block text-xs text-ink/50">Consigne libre (optionnel)</span>
        <Input
          value={objective}
          onChange={(e) => setObjective(e.target.value)}
          placeholder="ex. proposer le mercredi matin"
        />
      </label>

      <Button disabled={loading} onClick={() => void generate()}>
        {loading ? "Génération…" : "Générer 3 versions"}
      </Button>

      {result ? (
        <div className="space-y-3">
          {p ? (
            <p className="text-xs text-ink/45">
              Faits utilisées : {p.firstName}
              {p.lastService ? ` · dernier service ${p.lastService}` : ""}
              {p.lastVisitDate ? ` · dernière visite ${p.lastVisitDate}` : ""}
              {p.recommendedService ? ` · recommandé ${p.recommendedService}` : ""}
            </p>
          ) : null}

          <div className="flex flex-wrap gap-2">
            {result.variants.map((_, i) => (
              <button
                key={i}
                type="button"
                className={`rounded-lg px-3 py-1.5 text-xs ${
                  selected === i ? "bg-ink text-white" : "bg-ink/[0.06] text-ink/70"
                }`}
                onClick={() => {
                  setSelected(i);
                  setDraft(result.variants[i] ?? "");
                }}
              >
                Version {i + 1}
              </button>
            ))}
          </div>

          <Textarea
            dir={dir}
            className="min-h-[160px] font-normal"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
          />

          <p className="text-xs text-ink/40">{result.disclaimer}</p>

          {canOpenWa && customerId ? (
            <div className="flex flex-wrap items-center gap-2 pt-2">
              <Button
                disabled={committing || !draft.trim()}
                onClick={() => void confirmAndOpenWhatsApp()}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {committing ? "Préparation…" : "Ouvrir WhatsApp"}
              </Button>
            </div>
          ) : canOpenWa && !customerId ? (
            <p className="text-xs text-amber-700">
              Choisissez une cliente pour créer la tâche WhatsApp après validation.
            </p>
          ) : (
            <p className="text-xs text-ink/45">
              Vous pouvez copier le texte. L&apos;ouverture WhatsApp n&apos;est pas autorisée pour
              votre rôle.
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
}
