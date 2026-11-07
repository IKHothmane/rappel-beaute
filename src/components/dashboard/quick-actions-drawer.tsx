"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Box,
  CalendarPlus,
  CircleUserRound,
  Megaphone,
  PackagePlus,
  Receipt,
  Wallet,
  X,
  Zap,
} from "lucide-react";
import { useCurrentUser } from "@/components/auth/session-provider";
import { isSalon3dEnabledForOrg } from "@/lib/salon-3d/access";
import { cn } from "@/lib/utils";

const ACTIONS = [
  { href: "/agenda/", label: "+ Rendez-vous", icon: CalendarPlus, key: "agenda" },
  { href: "/salon-3d/", label: "Voir le plan 3D", icon: Box, key: "salon-3d" },
  { href: "/customers/", label: "+ Nouvelle cliente", icon: CircleUserRound, key: "customers" },
  { href: "/cash-register/", label: "+ Encaissement", icon: Wallet, key: "cash-register" },
  { href: "/expenses/", label: "+ Dépense", icon: Receipt, key: "expenses" },
  { href: "/inventory/", label: "+ Produit / Stock", icon: PackagePlus, key: "inventory" },
  { href: "/whatsapp/", label: "Campagne WhatsApp", icon: Megaphone, key: "whatsapp" },
] as const;

export function QuickActionsDrawer({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const user = useCurrentUser();
  const actions = ACTIONS.filter(
    (action) => action.key !== "salon-3d" || isSalon3dEnabledForOrg(user.orgSlug),
  );

  return (
    <aside
      className={cn(
        "fixed bottom-6 right-4 z-40 w-[min(100%-2rem,24rem)] rounded-2xl border border-gold/30 bg-institut p-4 text-white shadow-[0_16px_40px_rgba(23,16,24,0.35)] transition-all duration-300 sm:right-6",
        open
          ? "translate-y-0 opacity-100"
          : "pointer-events-none translate-y-8 opacity-0",
      )}
    >
      <div className="flex items-center justify-between border-b border-white/10 pb-2">
        <div className="flex items-center gap-1.5">
          <Zap size={18} className="text-gold" />
          <span className="text-xs font-bold uppercase tracking-wide text-gold">
            Actions éclair
          </span>
        </div>
        <button
          type="button"
          className="rounded-lg p-1 text-white/50 hover:text-white"
          onClick={() => onOpenChange(false)}
          aria-label="Fermer les actions rapides"
        >
          <X size={16} />
        </button>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-1.5">
        {actions.map((action) => (
          <Link
            key={action.href}
            href={action.href}
            className="flex h-10 items-center gap-1.5 rounded-lg bg-white/10 px-2 text-xs font-semibold text-white transition hover:bg-primary"
          >
            <action.icon size={15} className="shrink-0 text-gold" />
            <span className="truncate">{action.label}</span>
          </Link>
        ))}
      </div>
    </aside>
  );
}

export function useQuickActions() {
  const [open, setOpen] = useState(false);
  return { open, setOpen };
}
