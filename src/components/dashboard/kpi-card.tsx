"use client";

import { motion } from "framer-motion";
import { ArrowDownRight, ArrowUpRight, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type KpiCardProps = {
  title: string;
  value: string;
  /** null / undefined → tiret, jamais de chiffre de démo */
  change?: string | null;
  description: string;
  icon: LucideIcon;
  positive?: boolean | null;
  delay?: number;
};

export function KpiCard({
  title,
  value,
  change,
  description,
  icon: Icon,
  positive = true,
  delay = 0,
}: KpiCardProps) {
  const showChange = change != null && change !== "";
  const neutral = positive == null || change === "—" || !showChange;

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.28, delay }}
      className="group rounded-2xl border border-line bg-white p-5 shadow-soft transition-shadow hover:shadow-[0_18px_40px_rgba(227,28,95,0.08)]"
    >
      <div className="flex items-start justify-between">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-light text-primary transition-transform duration-300 group-hover:scale-110">
          <Icon size={21} />
        </div>
        {showChange ? (
          <div
            className={cn(
              "flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold",
              neutral
                ? "bg-ink/5 text-ink/50"
                : positive
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-red-50 text-red-600",
            )}
          >
            {neutral ? null : positive ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
            {change}
          </div>
        ) : null}
      </div>

      <div className="mt-5">
        <p className="text-sm text-ink/50">{title}</p>
        <p className="mt-1 font-mono text-2xl font-bold tracking-tight text-ink">{value}</p>
        <p className="mt-1 text-xs text-ink/40">{description}</p>
      </div>
    </motion.div>
  );
}
