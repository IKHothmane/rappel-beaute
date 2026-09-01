"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Bell,
  Boxes,
  CalendarDays,
  ChevronDown,
  CircleDollarSign,
  ClipboardList,
  FileText,
  Gift,
  LayoutDashboard,
  Megaphone,
  MessageCircle,
  Package,
  Settings,
  ShoppingCart,
  Sparkles,
  Star,
  Users,
  WalletCards,
  X,
  Lock,
} from "lucide-react";
import {
  canAccessNav,
  ROLE_LABEL,
  useCurrentUser,
} from "@/components/auth/session-provider";
import { usePlanFeatures } from "@/components/subscriptions/plan-features-provider";
import { cn } from "@/lib/utils";

type NavItem = {
  label: string;
  href: string;
  icon: typeof LayoutDashboard;
  key: string;
  badge?: string;
};

const sections: { title: string | null; items: NavItem[] }[] = [
  {
    title: null as string | null,
    items: [
      { label: "Tableau de bord", href: "/dashboard/", icon: LayoutDashboard, key: "dashboard" },
      { label: "Agenda", href: "/agenda/", icon: CalendarDays, key: "agenda" },
      { label: "Clientes", href: "/customers/", icon: Users, key: "customers" },
    ],
  },
  {
    title: "Gestion",
    items: [
      { label: "Services", href: "/services/", icon: Sparkles, key: "services" },
      { label: "Employées", href: "/staff/", icon: Users, key: "staff" },
      { label: "Ressources", href: "/resources/", icon: Boxes, key: "resources" },
    ],
  },
  {
    title: "Approvisionnement",
    items: [
      { label: "Produits", href: "/products/", icon: Package, key: "products" },
      { label: "Stock", href: "/stock/", icon: Boxes, key: "stock" },
      { label: "Fournisseurs", href: "/suppliers/", icon: ShoppingCart, key: "suppliers" },
      { label: "Achats", href: "/purchases/", icon: ClipboardList, key: "purchases" },
    ],
  },
  {
    title: "Finance",
    items: [
      { label: "Caisse", href: "/cash-register/", icon: WalletCards, key: "cash-register" },
      { label: "Paiements", href: "/payments/", icon: CircleDollarSign, key: "payments" },
      { label: "Dépenses", href: "/expenses/", icon: CircleDollarSign, key: "expenses" },
      { label: "Commissions", href: "/commissions/", icon: CircleDollarSign, key: "commissions" },
      { label: "Factures", href: "/invoices/", icon: FileText, key: "invoices" },
    ],
  },
  {
    title: "Croissance",
    items: [
      { label: "WhatsApp", href: "/whatsapp/", icon: MessageCircle, key: "whatsapp", badge: "V1" },
      { label: "Réactivation", href: "/reactivation/", icon: Users, key: "reactivation" },
      { label: "Fidélité", href: "/loyalty/", icon: Gift, key: "loyalty" },
      { label: "Promotions", href: "/promotions/", icon: Megaphone, key: "promotions" },
      { label: "Cartes cadeaux", href: "/gift-cards/", icon: Gift, key: "gift-cards" },
      { label: "Marketing", href: "/marketing/", icon: Megaphone, key: "marketing" },
      { label: "Avis", href: "/reviews/", icon: Star, key: "reviews" },
    ],
  },
  {
    title: "Pilotage",
    items: [
      { label: "Analytics", href: "/analytics/", icon: BarChart3, key: "analytics" },
      { label: "Rapports", href: "/reports/", icon: FileText, key: "reports" },
      { label: "Notifications", href: "/notifications/", icon: Bell, key: "notifications" },
      { label: "Paramètres", href: "/settings/", icon: Settings, key: "settings" },
    ],
  },
];

function normalize(pathname: string) {
  return pathname.replace(/^\/domains\/app/, "") || "/";
}

function isActive(pathname: string, href: string) {
  const path = normalize(pathname);
  if (href === "/dashboard/") {
    return path === "/" || path.startsWith("/dashboard");
  }
  return path === href || path.startsWith(href.replace(/\/$/, ""));
}

type SidebarProps = {
  open: boolean;
  onClose: () => void;
};

export function Sidebar({ open, onClose }: SidebarProps) {
  const pathname = usePathname();
  const user = useCurrentUser();
  const role = user.role;
  const { isNavEnabled, loading: planLoading } = usePlanFeatures();

  const filtered = sections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => canAccessNav(role, item.key)),
    }))
    .filter((section) => section.items.length > 0);

  return (
    <>
      <div
        className={cn(
          "fixed inset-0 z-40 bg-ink/30 transition lg:hidden",
          open ? "opacity-100" : "pointer-events-none opacity-0",
        )}
        onClick={onClose}
      />

      <aside
        className={cn(
          "fixed left-0 top-0 z-50 flex h-screen w-[260px] flex-col border-r border-line bg-white transition-transform duration-300 lg:z-40 lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-[72px] items-center justify-between border-b border-line px-5">
          <Link href="/dashboard/" className="flex items-center gap-3" onClick={onClose}>
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-gold font-display text-lg font-bold text-white shadow-soft">
              R
            </div>
            <div>
              <div className="font-display text-lg font-semibold leading-tight">
                {user.orgName}
              </div>
              <div className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-ink/40">
                Institut
              </div>
            </div>
          </Link>
          <button
            type="button"
            className="rounded-xl p-2 text-ink/50 hover:bg-[#FBF4F6] lg:hidden"
            onClick={onClose}
            aria-label="Fermer"
          >
            <X size={18} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-5">
          {filtered.map((section, index) => (
            <div key={index} className="mb-6">
              {section.title ? (
                <div className="mb-2 px-3 font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-ink/35">
                  {section.title}
                </div>
              ) : null}
              <div className="space-y-1">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(pathname, item.href);
                  const planLocked = !planLoading && !isNavEnabled(item.key);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={onClose}
                      className={cn(
                        "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
                        planLocked
                          ? "text-ink/35 hover:bg-[#FBF4F6]"
                          : active
                            ? "bg-primary-light text-primary-dark shadow-sm"
                            : "text-ink/60 hover:bg-[#FBF4F6] hover:text-ink",
                      )}
                    >
                      <Icon
                        size={18}
                        strokeWidth={active && !planLocked ? 2.3 : 1.8}
                        className={cn(
                          "transition-transform duration-200 group-hover:scale-110",
                          planLocked ? "text-ink/25" : active ? "text-primary" : "text-ink/35",
                        )}
                      />
                      <span>{item.label}</span>
                      {planLocked ? (
                        <Lock size={14} className="ml-auto text-ink/30" aria-label="Forfait supérieur requis" />
                      ) : null}
                      {!planLocked && item.badge ? (
                        <span className="ml-auto rounded-full bg-primary-light px-1.5 py-0.5 text-[9px] font-bold text-primary">
                          {item.badge}
                        </span>
                      ) : null}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="border-t border-line p-3">
          <Link
            href="/profile/"
            onClick={onClose}
            className="flex items-center gap-3 rounded-xl bg-[#FBF4F6] p-3 transition hover:bg-primary-light/60"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-primary to-gold font-semibold text-white">
              {user.firstName.charAt(0)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold">
                {user.firstName} {user.lastName}
              </div>
              <div className="text-xs text-ink/45">{ROLE_LABEL[user.role]}</div>
            </div>
            <ChevronDown size={16} className="text-ink/35" />
          </Link>
        </div>
      </aside>
    </>
  );
}
