"use client";
import { MetricCard } from "@/components/ui/metric-card";

import {
  CheckCircle2,
  Hourglass,
  PackageCheck,
  ShoppingCart,
  Truck,
  Wallet,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  purchaseCount: number;
  draftCount: number;
  orderedCount: number;
  receivedCount: number;
  awaitingReceipt: number;
  monthTotal: string | null;
};

export function PurchasesPremiumHeader({
  purchaseCount,
  draftCount,
  orderedCount,
  receivedCount,
  awaitingReceipt,
  monthTotal,
}: Props) {
  return (
    <div className="grid grid-cols-2 gap-3 xl:grid-cols-6 rb-metric-row">
      <StatCard
        label="Total commandes"
        value={String(purchaseCount)}
        hint="Journal complet"
        icon={ShoppingCart}
        tone="pink"
      />
      <StatCard
        label="Brouillons"
        value={String(draftCount)}
        hint="Pas encore envoyés"
        icon={Hourglass}
        tone="orange"
      />
      <StatCard
        label="Commandes en cours"
        value={String(orderedCount)}
        hint="Chez le fournisseur"
        icon={Truck}
        tone="purple"
      />
      <StatCard
        label="Reçues"
        value={String(receivedCount)}
        hint="Stock incrémenté"
        icon={CheckCircle2}
        tone="green"
      />
      <StatCard
        label="Achats ce mois"
        value={monthTotal ?? "—"}
        hint="Montant cumulé"
        icon={Wallet}
        tone="pink"
      />
      <StatCard
        label="À réceptionner"
        value={String(awaitingReceipt)}
        hint="Commandes ou partielles"
        icon={PackageCheck}
        tone="red"
        alert={awaitingReceipt > 0}
      />
    </div>
  );
}

function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone,
  alert,
}: {
  label: string;
  value: string;
  hint: string;
  icon: typeof ShoppingCart;
  tone: "pink" | "green" | "orange" | "red" | "purple";
  alert?: boolean;
}) {
  return <MetricCard title={label} value={value} icon={<Icon />} hint={hint} alert={alert}></MetricCard>;
}
