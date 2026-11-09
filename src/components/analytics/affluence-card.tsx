import { CalendarDays, Clock3 } from "lucide-react";
import { AppointmentStatusSummary } from "@/components/analytics/appointment-status-summary";
import { weekdayAffluence, hourlyAffluence } from "@/components/analytics/analytics-helpers";
import type { AppointmentAnalytics } from "@/types/analytics";
import { cn } from "@/lib/utils";

export function AffluenceCard({ appointments, occupation, loading }: {
  appointments: AppointmentAnalytics | null;
  occupation: number | null;
  loading: boolean;
}) {
  const days = weekdayAffluence(appointments);
  const hours = hourlyAffluence(appointments);
  const peak = days.reduce<(typeof days)[number] | null>((best, day) => day.count > (best?.count ?? 0) ? day : best, null);
  const peakHour = hours.reduce<(typeof hours)[number] | null>((best, hour) => hour.count > (best?.count ?? 0) ? hour : best, null);
  const maxCount = Math.max(1, ...days.map((day) => day.count));

  return (
    <section className="min-w-0 rounded-2xl border border-[#F0DFE7] bg-white p-4 shadow-sm sm:p-6" aria-label="Affluence et remplissage">
      <div className="flex items-start justify-between gap-3">
        <div><h3 className="text-lg font-bold text-[#35152A]">Affluence &amp; Remplissage</h3><p className="mt-1 text-xs text-[#887787]">Rythme des rendez-vous sur la période</p></div>
        <span className="rounded-xl bg-[#FFF0F6] p-2.5 text-[#B60050]"><CalendarDays size={19} aria-hidden /></span>
      </div>
      {loading ? <div role="status" aria-label="Chargement de l’affluence" className="mt-5 h-72 animate-pulse rounded-xl bg-[#FBF1F5]" /> : (
        <>
          <div className="mt-5 grid grid-cols-2 gap-2">
            <div className="rounded-xl border border-[#F0DFE7] bg-[#FFF7FA] p-3"><p className="text-[11px] text-[#887787]">Remplissage moyen</p><p className="mt-1 text-2xl font-extrabold tabular-nums text-[#B60050]">{occupation != null ? `${occupation.toLocaleString("fr-MA")} %` : "—"}</p></div>
            <div className="rounded-xl border border-[#E9E2F5] bg-[#F8F5FD] p-3"><p className="text-[11px] text-[#887787]">Jour le plus fréquenté</p><p className="mt-1 truncate text-base font-bold capitalize text-[#7552A3]">{peak?.label ?? "—"}</p><p className="text-[11px] text-[#887787]">{peak ? `${peak.count.toLocaleString("fr-MA")} RDV` : "Aucun rendez-vous"}</p></div>
          </div>
          {days.some((day) => day.count > 0) ? (
            <div className="mt-5 space-y-3">
              <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-wide text-[#887787]"><span>Rendez-vous par jour</span><span>Remplissage</span></div>
              {days.map((day) => (
                <div key={day.weekday} className="flex items-center gap-2" title={`${day.label} : ${day.count} rendez-vous, remplissage ${day.rate != null ? `${day.rate} %` : "non disponible"}`}>
                  <span className="w-8 shrink-0 text-xs font-semibold capitalize text-[#655362]">{day.label.slice(0, 3)}</span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-[#F5EAF0]"><div className={cn("h-full rounded-full", day.weekday === peak?.weekday ? "bg-[#B60050]" : "bg-[#E4A6C1]")} style={{ width: `${day.count / maxCount * 100}%` }} /></div>
                  <span className="w-6 text-right text-xs font-bold tabular-nums text-[#43303D]">{day.count}</span>
                  <span className="w-12 text-right text-[11px] tabular-nums text-[#887787]">{day.rate != null ? `${day.rate.toLocaleString("fr-MA", { maximumFractionDigits: 0 })} %` : "—"}</span>
                </div>
              ))}
            </div>
          ) : <p className="mt-5 rounded-xl border border-dashed border-[#EBD9E2] bg-[#FFFAFC] p-4 text-center text-xs leading-5 text-[#887787]">Les tendances apparaîtront dès les premiers rendez-vous sur cette période.</p>}
          <div className="mt-5 border-t border-[#F2E7ED] pt-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><p className="flex items-center gap-1.5 text-xs font-semibold text-[#655362]"><Clock3 size={14} aria-hidden />Par heure</p>{peakHour ? <span className="text-[10px] font-semibold text-[#B60050]">Pic à {peakHour.hour} h · {peakHour.count} RDV</span> : null}</div>
            <div className="grid grid-cols-8 gap-1">
              {hours.map((hour) => <div key={hour.hour} title={`${hour.hour} h : ${hour.count} rendez-vous`} className={cn("rounded-lg px-0.5 py-2 text-center", !hour.count ? "bg-[#F7F3F5] text-[#887787]" : hour.heightPct >= 70 ? "bg-[#B60050] text-white" : hour.heightPct >= 35 ? "bg-[#F2CADD] text-[#75133D]" : "bg-[#FCEBF3] text-[#984166]")}><p className="text-[9px]">{hour.hour} h</p><p className="mt-0.5 text-[11px] font-bold tabular-nums">{hour.count}</p></div>)}
            </div>
            <div className="mt-2 flex items-center justify-end gap-1.5 text-[9px] text-[#887787]"><span>Calme</span><span className="h-2 w-3 rounded-sm bg-[#F7F3F5]" /><span className="h-2 w-3 rounded-sm bg-[#F2CADD]" /><span className="h-2 w-3 rounded-sm bg-[#B60050]" /><span>Fréquenté</span></div>
          </div>
        </>
      )}
      <div className="mt-4 border-t border-[#F2E7ED] pt-4"><h4 className="text-xs font-semibold text-[#655362]">Statuts des rendez-vous</h4><AppointmentStatusSummary appointments={appointments} loading={loading} /></div>
    </section>
  );
}
