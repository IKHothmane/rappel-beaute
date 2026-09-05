"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { listNotifications } from "@/modules/notifications/service";
import type { NotificationItem } from "@/types/notifications";
import { cn } from "@/lib/utils";

function toneFor(severity: NotificationItem["severity"]) {
  if (severity === "CRITICAL") return "bg-red-500";
  if (severity === "WARNING") return "bg-amber-400";
  if (severity === "SUCCESS") return "bg-emerald-500";
  return "bg-sky-400";
}

export function RecentActivity() {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await listNotifications({ limit: 6 });
        if (!cancelled) setItems(res.data);
      } catch {
        if (!cancelled) setItems([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Activité récente</CardTitle>
          <p className="mt-1 text-sm text-ink/45">Dernières alertes de l&apos;institut</p>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 pt-0">
        {loading ? (
          <p className="text-sm text-ink/45">Chargement…</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-ink/45">Aucune activité récente.</p>
        ) : (
          items.map((n, index) => (
            <motion.div
              key={n.id}
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 + index * 0.05 }}
              className="flex items-center gap-3 rounded-xl border border-line/80 px-3 py-2.5"
            >
              <span className={cn("h-2 w-2 shrink-0 rounded-full", toneFor(n.severity))} />
              <p className="text-sm text-ink/75">{n.title || n.message}</p>
            </motion.div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
