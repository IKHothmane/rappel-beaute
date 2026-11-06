"use client";

import { useState } from "react";
import { Globe } from "lucide-react";
import { useToast } from "@/components/ui/toast";

export function WebsiteRequestCard({ canRequest }: { canRequest: boolean }) {
  const { toast } = useToast();
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  async function submit() {
    setSending(true);
    try {
      const res = await fetch("/api/settings/website-request/", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error || "Envoi impossible.");
      setMessage("");
      toast("Demande envoyée. Nous vous recontacterons par e-mail.", "success");
    } catch (error) {
      toast(error instanceof Error ? error.message : "Envoi impossible.", "error");
    } finally {
      setSending(false);
    }
  }

  return (
    <section className="rounded-[20px] border border-[#EFD9E1] bg-white p-5 shadow-sm sm:p-6">
      <div className="mb-5 flex items-center gap-3 border-b border-[#F6EAF0] pb-4">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#FCE7F1] text-[#B60050]">
          <Globe size={22} aria-hidden />
        </div>
        <div>
          <h2 className="text-lg font-bold text-[#301A2A]">Site web</h2>
          <p className="text-sm text-[#887787]">
            Demandez la création d’un site pour votre institut
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <p className="text-sm leading-6 text-[#655362]">
          Vous n’avez pas encore de site ? Envoyez-nous une demande : nous la recevons par e-mail
          et vous recontactons pour la création.
        </p>

        <label className="block space-y-1.5">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#887787]">
            Précisions (facultatif)
          </span>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            disabled={!canRequest || sending}
            maxLength={2000}
            rows={4}
            placeholder="Ex. style souhaité, pages à prévoir, couleurs, exemples…"
            className="w-full rounded-xl border border-[#F0E4EA] bg-[#FFF5F9] px-4 py-3 text-sm outline-none transition focus:border-[#C95483] focus:bg-white disabled:opacity-60"
          />
        </label>

        {canRequest ? (
          <button
            type="button"
            disabled={sending}
            onClick={() => void submit()}
            className="inline-flex h-11 items-center justify-center rounded-xl bg-[#A40E49] px-5 text-sm font-bold text-white shadow-md transition hover:bg-[#801035] disabled:opacity-50"
          >
            {sending ? "Envoi…" : "Demander la création d’un site web"}
          </button>
        ) : (
          <p className="text-sm text-[#887787]">
            Seul le propriétaire peut envoyer cette demande.
          </p>
        )}
      </div>
    </section>
  );
}
