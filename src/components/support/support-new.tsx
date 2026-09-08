"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useState } from "react";
import { AppPageHeader } from "@/components/app/AppUi";
import { useToast } from "@/components/ui/toast";
import {
  createSupportTicket,
  SUPPORT_CATEGORY_LABEL,
} from "@/modules/support/service";
import type { SupportTicketCategory } from "@/lib/db/support-tickets";

const CATEGORIES = Object.keys(SUPPORT_CATEGORY_LABEL) as SupportTicketCategory[];

export function SupportNewView() {
  const router = useRouter();
  const { toast } = useToast();
  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState<SupportTicketCategory>("TECHNICAL");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await createSupportTicket({ subject, category, message });
      toast("Demande envoyée.", "success");
      router.push(`/support/${res.ticket.id}/`);
    } catch (err) {
      toast(err instanceof Error ? err.message : "Envoi impossible.", "error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <AppPageHeader
        title="Nouvelle demande"
        description="Décrivez votre problème — l'équipe support vous répondra ici."
        action={
          <Link href="/support/" className="btn-ghost">
            Retour
          </Link>
        }
      />

      <form
        onSubmit={onSubmit}
        className="mx-auto max-w-xl space-y-4 rounded-2xl border border-line bg-white p-6"
      >
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium">Sujet</span>
          <input
            className="input w-full"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            maxLength={200}
            required
            placeholder="Ex. Problème avec WhatsApp"
          />
        </label>

        <label className="block">
          <span className="mb-1.5 block text-sm font-medium">Catégorie</span>
          <select
            className="input w-full"
            value={category}
            onChange={(e) => setCategory(e.target.value as SupportTicketCategory)}
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {SUPPORT_CATEGORY_LABEL[c]}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-1.5 block text-sm font-medium">Message</span>
          <textarea
            className="input min-h-[140px] w-full"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            maxLength={5000}
            required
            placeholder="Décrivez le problème, les étapes pour le reproduire…"
          />
        </label>

        <button type="submit" className="btn-primary w-full" disabled={submitting}>
          {submitting ? "Envoi…" : "Envoyer la demande"}
        </button>
      </form>
    </motion.div>
  );
}
