"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Bell,
  Boxes,
  CalendarDays,
  ChartColumn,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  ClipboardList,
  FileText,
  Gift,
  LayoutDashboard,
  Lock,
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
} from "lucide-react";
import {
  ROLE_LABEL,
  useCurrentUser,
} from "@/components/auth/session-provider";
import { usePlanFeatures } from "@/components/subscriptions/plan-features-provider";
import { BrandLogo } from "@/components/www/BrandLogo";
import { cn } from "@/lib/utils";

type NavItem = {
  label: string;
  href: string;
  icon: typeof LayoutDashboard;
  key: string;
};

const sections: { title: string | null; items: NavItem[] }[] = [
  {
    title: null,
    items: [
      { label: "Tableau de bord", href: "/dashboard/", icon: LayoutDashboard, key: "dashboard" },
      { label: "Agenda", href: "/agenda/", icon: CalendarDays, key: "agenda" },
      { label: "Planning Équipe", href: "/planning/", icon: ClipboardList, key: "planning" },
      { label: "Assistant IA", href: "/ai/", icon: Sparkles, key: "ai" },
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
      { label: "POS Produits", href: "/pos/", icon: ShoppingCart, key: "pos" },
      { label: "Paiements", href: "/payments/", icon: CircleDollarSign, key: "payments" },
      { label: "Dépenses", href: "/expenses/", icon: CircleDollarSign, key: "expenses" },
      { label: "Commissions", href: "/commissions/", icon: CircleDollarSign, key: "commissions" },
      { label: "Factures", href: "/invoices/", icon: FileText, key: "invoices" },
    ],
  },
  {
    title: "Croissance",
    items: [
      { label: "Liste d'attente", href: "/waiting-list/", icon: Users, key: "waiting-list" },
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
      { label: "Rapports", href: "/reports/", icon: ChartColumn, key: "reports" },
      { label: "Notifications", href: "/notifications/", icon: Bell, key: "notifications" },
      { label: "Aide & Support", href: "/support/", icon: MessageCircle, key: "support" },
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

type OwnerSidebarProps = {
  open: boolean;
  onClose: () => void;
  collapsed: boolean;
  onCollapsedChange: (collapsed: boolean) => void;
};

export default function OwnerSidebar({
  open,
  onClose,
  collapsed,
  onCollapsedChange,
}: OwnerSidebarProps) {
  const pathname = usePathname();
  const user = useCurrentUser();
  const { isNavEnabled, loading: planLoading } = usePlanFeatures();

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
          "fixed left-0 top-0 z-50 flex h-screen flex-col border-r border-line bg-white transition-[width,transform] duration-300 lg:z-40 lg:translate-x-0",
          collapsed ? "lg:w-[76px]" : "lg:w-[280px]",
          "w-[280px]",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div
          className={cn(
            "flex h-[72px] items-center border-b border-line",
            collapsed ? "justify-center gap-1 px-2" : "justify-between gap-2 px-5",
          )}
        >
          <Link
            href="/dashboard/"
            className={cn("flex min-w-0 items-center gap-2.5", collapsed && "lg:hidden")}
            onClick={onClose}
          >
            <BrandLogo href={null} height={40} className="max-h-10 shrink-0" />
            <div className="min-w-0">
              <div className="truncate font-display text-sm font-semibold leading-tight">
                {user.orgName}
              </div>
              <div className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-ink/40">
                Propriétaire
              </div>
            </div>
          </Link>
          <button
            type="button"
            className="hidden shrink-0 rounded-xl p-2 text-ink/50 transition hover:bg-[#FBF4F6] hover:text-ink lg:inline-flex"
            onClick={() => onCollapsedChange(!collapsed)}
            aria-label={collapsed ? "Développer le menu" : "Réduire le menu"}
          >
            {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
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
          {sections.map((section, index) => (
            <div key={index} className="mb-6">
              {section.title && !collapsed ? (
                <div className="mb-2 px-3 font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-ink/35">
                  {section.title}
                </div>
              ) : null}
              {section.title && collapsed ? (
                <div className="mb-2 hidden h-px bg-line lg:block" aria-hidden />
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
                      title={collapsed ? item.label : undefined}
                      className={cn(
                        "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
                        collapsed && "lg:justify-center lg:px-0",
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
                          "shrink-0 transition-transform duration-200 group-hover:scale-110",
                          planLocked ? "text-ink/25" : active ? "text-primary" : "text-ink/35",
                        )}
                      />
                      <span className={cn(collapsed && "lg:hidden")}>{item.label}</span>
                      {planLocked ? (
                        <Lock
                          size={14}
                          className={cn("ml-auto text-ink/30", collapsed && "lg:hidden")}
                          aria-label="Forfait supérieur requis"
                        />
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
            title={collapsed ? `${user.firstName} ${user.lastName}` : undefined}
            className={cn(
              "flex items-center gap-3 rounded-xl bg-[#FBF4F6] p-3 transition hover:bg-primary-light/60",
              collapsed && "lg:justify-center lg:px-2",
            )}
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-gold font-semibold text-white">
              {user.firstName.charAt(0)}
            </div>
            <div className={cn("min-w-0 flex-1", collapsed && "lg:hidden")}>
              <div className="truncate text-sm font-semibold">
                {user.firstName} {user.lastName}
              </div>
              <div className="text-xs text-ink/45">{ROLE_LABEL[user.role]}</div>
            </div>
          </Link>
        </div>
      </aside>
    </>
  );
}
