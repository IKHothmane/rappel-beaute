import { statusCount } from "@/components/analytics/analytics-helpers";
import { APPOINTMENT_STATUS_LABEL, APPOINTMENT_STATUS_STYLE } from "@/modules/appointments/constants";
import type { AppointmentStatus } from "@/types/appointment";
import type { AppointmentAnalytics } from "@/types/analytics";

export function AppointmentStatusSummary({
  appointments,
  loading,
}: {
  appointments: AppointmentAnalytics | null;
  loading: boolean;
}) {
  return (
    <div className="mt-4 grid grid-cols-2 gap-2 text-[12px]">
      {Object.entries(APPOINTMENT_STATUS_LABEL).map(([status, label]) => (
        <div key={status} className="rounded-xl border border-[#F0E3EA] bg-[#FFFBFD] p-2.5">
          <p className="flex items-center gap-1.5 text-[11px] text-[#887787]"><span aria-hidden className={`h-1.5 w-1.5 shrink-0 rounded-full ${APPOINTMENT_STATUS_STYLE[status as AppointmentStatus].dot}`} />{label}</p>
          <p className="mt-1 font-bold tabular-nums text-[#43303D]">
            {loading || !appointments ? "—" : statusCount(appointments, status)}
            {!loading && status === "NO_SHOW" && appointments?.noShow.rate != null
              ? ` (${appointments.noShow.rate.toLocaleString("fr-MA")} %)`
              : ""}
          </p>
        </div>
      ))}
    </div>
  );
}
