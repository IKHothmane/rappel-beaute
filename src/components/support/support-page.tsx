"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useCallback, useEffect, useState } from "react";
import { AppPageHeader } from "@/components/app/AppUi";
import { useCurrentUser } from "@/components/auth/session-provider";
import { canWriteFeatureLimited } from "@/lib/rbac";
import { useToast } from "@/components/ui/toast";
import {
  listSupportTickets,
  SUPPORT_CATEGORY_LABEL,
  SUPPORT_STATUS_LABEL,
  type SupportTicketListItem,
} from "@/modules/support/service";

function relativeTime(iso: string | null | undefined) {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "À l'instant";
  if (mins < 60) return `Il y a ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `Il y a ${hours} h`;
  const days = Math.floor(hours / 24);
  return `Il y a ${days} j`;
}

function statusClass(status: string) {
  switch (status) {
    case "OPEN":
      return "bg-amber-50 text-amber-800";
    case "IN_PROGRESS":
      return "bg-sky-50 text-sky-800";
    case "WAITING_CUSTOMER":
      return "bg-violet-50 text-violet-800";
    case "RESOLVED":
      return "bg-emerald-50 text-emerald-800";
    case "CLOSED":
      return "bg-ink/5 text-ink/50";
    default:
      return "bg-ink/5 text-ink/50";
  }
}

export function SupportPageView() {
  const { toast } = useToast();
  const user = useCurrentUser();
  const canWrite = canWriteFeatureLimited(user.role, "support");
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<SupportTicketListItem[]>([]);

  const refresh = useCallback(async () => {
    try {
      const res = await listSupportTickets();
      setItems(res.items);
    } catch {
      toast("Impossible de charger les demandes.", "error");
    }
  }, [toast]);

  useEffect(() => {
    setLoading(true);
    refresh().finally(() => setLoading(false));
  }, [refresh]);

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <AppPageHeader
        title="Aide & Support"
        description="Créez une demande et suivez la conversation avec l'équipe Rappel Beauty."
        action={
          canWrite ? (
            <Link href="/support/new/" className="btn-primary">
              Nouvelle demande
            </Link>
          ) : undefined
        }
      />

      {loading ? (
        <p className="text-sm text-ink/45">Chargement…</p>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-line bg-white p-8 text-center">
          <p className="text-sm text-ink/55">Aucune demande pour le moment.</p>
          {canWrite ? (
            <Link href="/support/new/" className="btn-primary mt-4 inline-flex">
              Créer une demande
            </Link>
          ) : null}
        </div>
      ) : (
        <ul className="space-y-3">
          {items.map((t) => (
            <li key={t.id}>
              <Link
                href={`/support/${t.id}/`}
                className="block rounded-2xl border border-line bg-white p-5 transition hover:border-primary/30 hover:bg-[#FBF4F6]"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium text-ink">{t.subject}</p>
                    <p className="mt-1 text-sm text-ink/50">
                      {SUPPORT_CATEGORY_LABEL[t.category]}
                      {t.lastMessagePreview
                        ? ` · ${t.lastMessagePreview}`
                        : null}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-lg px-2 py-1 text-[11px] font-semibold ${statusClass(t.status)}`}
                  >
                    {SUPPORT_STATUS_LABEL[t.status]}
                  </span>
                </div>
                <p className="mt-2 font-mono text-[10px] text-ink/35">
                  {relativeTime(t.lastMessageAt ?? t.updatedAt)}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </motion.div>
  );
}
