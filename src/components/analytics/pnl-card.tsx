import { ArrowDownLeft, ArrowUpRight, Wallet } from "lucide-react";
import type { PnlExpress } from "@/components/analytics/analytics-helpers";
import { formatMad } from "@/modules/analytics/service";
import { cn } from "@/lib/utils";

export function PnlCard({ pnl, loading }: { pnl: PnlExpress; loading: boolean }) {
  const negative = pnl.result < 0;
  const rows = [
    { label: "CA encaissé", value: pnl.net, share: pnl.net === 0 ? 0 : 100, color: "bg-emerald-500", text: "text-emerald-800", bg: "bg-emerald-50/70", sign: "" },
    { label: "Charges directes", value: pnl.expenses, share: pnl.expenseShare, color: "bg-amber-500", text: "text-amber-800", bg: "bg-amber-50/70", sign: "− " },
    { label: "Commissions praticiennes", value: pnl.commissions, share: pnl.commissionShare, color: "bg-violet-500", text: "text-violet-800", bg: "bg-violet-50/70", sign: "− " },
  ];
  return (
    <section className="min-w-0 rounded-2xl border border-[#F0DFE7] bg-white p-4 shadow-sm sm:p-6" aria-label="PnL Express">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3"><div><h3 className="text-xl font-bold text-[#35152A]">PnL Express</h3><p className="mt-1 text-xs text-[#887787]">Compte de résultat simplifié</p></div><span className="rounded-xl bg-[#FFF0F6] p-2.5 text-[#B60050]"><Wallet size={19} aria-hidden /></span></div>
      {loading ? <div role="status" aria-label="Chargement du PnL" className="h-56 animate-pulse rounded-xl bg-[#FBF1F5]" /> : (
        <div className="space-y-3">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            {rows.map((row) => <div key={row.label} className={cn("min-w-0 rounded-xl p-4", row.bg)}><p className={cn("flex items-center gap-2 text-xs font-semibold", row.text)}><span className={cn("h-2 w-2 shrink-0 rounded-full", row.color)} />{row.label}</p><p className={cn("mt-2 break-words text-xl font-extrabold tabular-nums", row.text)}>{row.sign}{formatMad(row.value)}</p><div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/90"><div className={cn("h-full rounded-full", row.color)} style={{ width: `${Math.max(0, Math.min(100, row.share))}%` }} /></div></div>)}
          </div>
          <div className={cn("flex flex-wrap items-center justify-between gap-4 rounded-xl border p-4", negative ? "border-rose-200 bg-rose-50 text-rose-900" : "border-emerald-200 bg-emerald-50 text-emerald-900")}>
            <div className="flex items-center gap-3"><span className={cn("rounded-xl p-2", negative ? "bg-rose-100 text-rose-700" : "bg-emerald-100 text-emerald-700")}>{negative ? <ArrowDownLeft size={21} aria-hidden /> : <ArrowUpRight size={21} aria-hidden />}</span><div><p className="text-[10px] font-bold uppercase tracking-wider">Résultat net</p><p className="mt-1 text-sm font-semibold">Marge d’exploitation nette</p></div></div>
            <div><p className="break-words text-2xl font-extrabold tabular-nums sm:text-3xl">{formatMad(pnl.result)}</p>{pnl.marginRate != null ? <p className="mt-1 text-xs font-semibold">Taux de marge · {pnl.marginRate.toLocaleString("fr-MA")} %</p> : null}</div>
          </div>
        </div>
      )}
    </section>
  );
}
