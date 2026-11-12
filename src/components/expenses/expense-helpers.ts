import { EXPENSE_STATUS_LABEL } from "@/modules/expenses/service";
import type { ExpenseCategory, ExpenseListItem } from "@/types/expense";

export type ExpenseTab = "recorded" | "void";
export type ExpensePeriod = "all" | "today" | "month";

export const EXPENSE_PAGE_SIZE = 8;

export function expenseShortId(id: string) {
  return id.slice(-6).toUpperCase();
}

export function formatExpenseDate(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function formatExpenseTime(iso: string) {
  return new Date(iso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

export function formatExpenseDateTime(iso: string) {
  return new Date(iso).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function periodRange(period: ExpensePeriod): { from?: string; to?: string } {
  if (period === "all") return {};
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  if (period === "today") {
    const d = `${yyyy}-${mm}-${dd}`;
    return { from: d, to: d };
  }
  const from = `${yyyy}-${mm}-01`;
  const last = new Date(yyyy, now.getMonth() + 1, 0).getDate();
  return { from, to: `${yyyy}-${mm}-${String(last).padStart(2, "0")}` };
}

export function periodLabel(period: ExpensePeriod) {
  const now = new Date();
  const month = now.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
  const today = now.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
  if (period === "today") return `Aujourd’hui (${today})`;
  if (period === "month") return `Ce mois (${month})`;
  return "Toutes les dates";
}

export function expenseStatusChip(status: ExpenseListItem["status"]) {
  if (status === "VOID") {
    return { label: EXPENSE_STATUS_LABEL.VOID, className: "bg-[#FFDAD6] text-[#93000A]" };
  }
  return { label: "Enregistrée", className: "bg-emerald-100 text-emerald-800" };
}

export function categoryChipClass(category: ExpenseCategory) {
  switch (category) {
    case "MARKETING":
      return "bg-rose-100 text-rose-800";
    case "RENT":
    case "ELECTRICITY":
    case "WATER":
      return "bg-slate-100 text-slate-800";
    case "MAINTENANCE":
      return "bg-amber-100 text-amber-900";
    case "OFFICE":
      return "bg-pink-100 text-pink-800";
    case "INTERNET":
      return "bg-sky-100 text-sky-800";
    case "PRODUCT_PURCHASE":
      return "bg-amber-100 text-amber-900";
    case "SALARY":
      return "bg-violet-100 text-violet-800";
    case "TRANSPORT":
      return "bg-[#FFEFF8] text-ink";
    default:
      return "bg-[#FCE9F4] text-ink";
  }
}

export function categoryBarClass(category: ExpenseCategory) {
  switch (category) {
    case "MARKETING":
      return "bg-primary";
    case "RENT":
    case "ELECTRICITY":
    case "WATER":
      return "bg-slate-500";
    case "MAINTENANCE":
      return "bg-amber-600";
    case "OFFICE":
      return "bg-pink-400";
    case "INTERNET":
      return "bg-sky-500";
    case "PRODUCT_PURCHASE":
      return "bg-[#FCCA66]";
    case "SALARY":
      return "bg-violet-500";
    case "TRANSPORT":
      return "bg-[#7B5900]";
    default:
      return "bg-[#E4BDC2]";
  }
}

export function staffOptions(rows: ExpenseListItem[]) {
  return [...new Set(rows.map((e) => e.createdByName).filter((n): n is string => Boolean(n)))].sort(
    (a, b) => a.localeCompare(b, "fr"),
  );
}

