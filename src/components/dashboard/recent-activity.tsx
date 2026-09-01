"use client";

import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { NOTIFS } from "@/lib/app-mock";
import { cn } from "@/lib/utils";

const toneDot = {
  red: "bg-red-500",
  yellow: "bg-amber-400",
  green: "bg-emerald-500",
};

export function RecentActivity() {
  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Activité récente</CardTitle>
          <p className="mt-1 text-sm text-ink/45">Dernières alertes de l&apos;institut</p>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 pt-0">
        {NOTIFS.map((n, index) => (
          <motion.div
            key={n.text}
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 + index * 0.05 }}
            className="flex items-center gap-3 rounded-xl border border-line/80 px-3 py-2.5"
          >
            <span className={cn("h-2 w-2 rounded-full", toneDot[n.tone])} />
            <p className="text-sm text-ink/75">{n.text}</p>
          </motion.div>
        ))}
      </CardContent>
    </Card>
  );
}
