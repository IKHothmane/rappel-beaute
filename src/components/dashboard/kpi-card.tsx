"use client";
import { MetricCard } from "@/components/ui/metric-card";

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
  return <MetricCard title={title} value={value} icon={<Icon />} hint={description} delta={change} negative={positive === false}></MetricCard>;
}
