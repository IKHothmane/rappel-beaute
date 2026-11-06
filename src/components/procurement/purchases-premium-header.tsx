"use client";

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
    <div className="grid grid-cols-2 gap-3 xl:grid-cols-6">
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
  const colors = {
    pink: "bg-[#FFF0F5] text-[#A50F4A]",
    green: "bg-[#EAF8EF] text-[#16834B]",
    orange: "bg-[#FFF4E6] text-[#B77612]",
    red: "bg-[#FFF0F1] text-[#C42B4A]",
    purple: "bg-[#F4EDFF] text-[#7434B4]",
  };
  const accents = {
    pink: "border-l-[#AD1451]",
    green: "border-l-[#16834B]",
    orange: "border-l-[#B77612]",
    red: "border-l-[#C42B4A]",
    purple: "border-l-[#7434B4]",
  };

  return (
    <div
      className={cn(
        "flex min-h-[108px] items-center gap-3 rounded-[20px] border border-[#F0DDE4] border-l-4 bg-white p-4 shadow-[0_6px_20px_rgba(72,20,43,0.05)]",
        accents[tone],
        alert && "ring-2 ring-[#C42B4A]/15",
      )}
    >
      <span className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl", colors[tone])}>
        <Icon size={20} />
      </span>
      <div className="min-w-0">
        <p className="text-[11px] font-medium text-[#775B6A]">{label}</p>
        <p className="mt-0.5 break-words text-xl font-extrabold text-[#43182D]">{value}</p>
        <p className="mt-0.5 text-[10px] text-[#9A7F8C]">{hint}</p>
      </div>
    </div>
  );
}
