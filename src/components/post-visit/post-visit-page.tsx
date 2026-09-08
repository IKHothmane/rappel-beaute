"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { AppPageHeader } from "@/components/app/AppUi";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import {
  listPostVisit,
  skipPostVisit,
  syncPostVisitApi,
} from "@/modules/post-visit/service";
import type { PostVisitKpis, PostVisitListItem } from "@/types/post-visit";

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function PostVisitPageView() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<PostVisitListItem[]>([]);
  const [kpis, setKpis] = useState<PostVisitKpis | null>(null);
  const [preview, setPreview] = useState<PostVisitListItem | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await listPostVisit();
      setItems(res.data);
      setKpis(res.kpis);
    } catch {
      toast("Impossible de charger les relances post-prestation.", "error");
    }
  }, [toast]);

  useEffect(() => {
    setLoading(true);
    refresh().finally(() => setLoading(false));
  }, [refresh]);

  async function handleSync() {
    const r = await syncPostVisitApi();
    if (!r.ok) {
      toast(r.error, "error");
      return;
    }
    toast("Synchronisation terminée.", "success");
    await refresh();
  }

  async function handleSkip(appointmentId: string) {
    const r = await skipPostVisit(appointmentId);
    if (!r.ok) {
      toast(r.error, "error");
      return;
    }
    toast("Relance ignorée.", "success");
    await refresh();
  }

  return (
    <>
      <AppPageHeader
        title="Relances post-prestation"
        description="Rappel après une prestation terminée — distinct de la réactivation (inactivité)."
        action={
          <Button type="button" variant="secondary" onClick={handleSync}>
            Synchroniser
          </Button>
        }
      />

      {kpis ? (
        <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            ["Éligibles / planifiées", kpis.eligible],
            ["À préparer", kpis.prepared],
            ["Envoyées", kpis.sent],
            ["À venir", kpis.upcoming],
          ].map(([label, value]) => (
            <div key={String(label)} className="surface px-4 py-3">
              <p className="font-mono text-[10px] uppercase tracking-widest text-ink/40">{label}</p>
              <p className="mt-1 font-display text-xl font-semibold">{value}</p>
            </div>
          ))}
        </div>
      ) : null}

      <p className="mb-3 text-xs text-ink/50">
        ≠ Réactivation : ici le délai part du RDV COMPLETED +{" "}
        <code className="rounded bg-ink/[0.04] px-1">recommendedReturnDays</code>. CTA vers le booking
        public avec <code className="rounded bg-ink/[0.04] px-1">source=post_visit</code>.
      </p>

      {loading ? (
        <p className="text-sm text-ink/50">Chargement…</p>
      ) : items.length === 0 ? (
        <div className="surface p-6 text-sm text-ink/55">
          Aucune relance pour le moment. Terminez un RDV et attendez le délai de retour du service.
        </div>
      ) : (
        <div className="surface overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-line text-xs uppercase tracking-wide text-ink/45">
              <tr>
                <th className="px-4 py-3 font-medium">Cliente</th>
                <th className="px-4 py-3 font-medium">Service</th>
                <th className="px-4 py-3 font-medium">Dernière visite</th>
                <th className="px-4 py-3 font-medium">Relance prévue</th>
                <th className="px-4 py-3 font-medium">Statut</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((row) => (
                <tr key={row.appointmentId} className="border-b border-line/70 last:border-0">
                  <td className="px-4 py-3 font-medium">{row.customerName}</td>
                  <td className="px-4 py-3">{row.serviceName}</td>
                  <td className="px-4 py-3 font-mono text-xs">{fmtDate(row.lastVisitAt)}</td>
                  <td className="px-4 py-3 font-mono text-xs">{fmtDate(row.recommendedAt)}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-ink/[0.04] px-2 py-0.5 text-xs">
                      {row.statusLabel}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1.5">
                      <button
                        type="button"
                        className="btn-ghost px-2 py-1 text-xs"
                        onClick={() => setPreview(row)}
                      >
                        Prévisualiser
                      </button>
                      {row.waLink ? (
                        <a
                          href={row.waLink}
                          target="_blank"
                          rel="noreferrer"
                          className="btn-ghost px-2 py-1 text-xs"
                        >
                          Préparer WhatsApp
                        </a>
                      ) : null}
                      <Link
                        href={`/customers/${row.customerId}/`}
                        className="btn-ghost px-2 py-1 text-xs"
                      >
                        Ouvrir cliente
                      </Link>
                      {row.status === "PENDING" ? (
                        <button
                          type="button"
                          className="btn-ghost px-2 py-1 text-xs text-ink/50"
                          onClick={() => handleSkip(row.appointmentId)}
                        >
                          Ignorer
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {preview ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-4 sm:items-center">
          <div className="surface max-h-[80vh] w-full max-w-lg overflow-y-auto p-5">
            <p className="font-medium">Aperçu message — {preview.customerName}</p>
            <pre className="mt-3 whitespace-pre-wrap rounded-xl bg-ink/[0.03] p-4 text-sm">
              {preview.messagePreview ?? "(aucun message)"}
            </pre>
            <p className="mt-2 break-all text-xs text-ink/45">{preview.bookingUrl}</p>
            <div className="mt-4 flex justify-end gap-2">
              {preview.waLink ? (
                <a href={preview.waLink} target="_blank" rel="noreferrer" className="btn-primary">
                  Ouvrir wa.me
                </a>
              ) : null}
              <Button type="button" variant="secondary" onClick={() => setPreview(null)}>
                Fermer
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
