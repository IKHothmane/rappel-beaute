const ROWS = [
  {
    time: "09:00",
    name: "Sara",
    service: "Hydrafacial",
    status: "Confirmé",
    tone: "ok" as const,
  },
  {
    time: "10:30",
    name: "Imane",
    service: "Manucure",
    status: "Confirmé",
    tone: "ok" as const,
  },
  {
    time: "12:00",
    name: "Meryem",
    service: "Massage",
    status: "En cours",
    tone: "live" as const,
  },
];

export function DashboardMockup() {
  return (
    <div className="animate-floaty relative w-full max-w-[34rem]">
      <div
        aria-hidden
        className="absolute -inset-8 -z-10 bg-[radial-gradient(ellipse_at_center,_rgba(227,28,95,0.18),_transparent_65%)]"
      />
      <div className="overflow-hidden rounded-xl border border-line bg-white shadow-mock">
        <div className="flex items-center justify-between border-b border-line bg-[#FBF6F7] px-5 py-3.5">
          <div>
            <p className="font-display text-[15px] font-semibold">Institut Royal</p>
            <p className="text-xs text-ink/50">Casablanca · Aujourd’hui</p>
          </div>
          <span className="rounded-md bg-primary-light px-2 py-1 font-mono text-[10px] font-medium tracking-wide text-primary-dark">
            EN DIRECT
          </span>
        </div>

        <div className="grid grid-cols-3 divide-x divide-line border-b border-line">
          <Stat label="RDV" value="24" />
          <Stat label="Confirmés" value="18" />
          <Stat label="Encaissé" value="4 850" suffix="MAD" />
        </div>

        <ul className="divide-y divide-line">
          {ROWS.map((row) => (
            <li key={row.time} className="flex items-center gap-4 px-5 py-3.5">
              <span className="w-12 shrink-0 font-mono text-xs text-ink/45">
                {row.time}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium">{row.name}</span>
                <span className="text-xs text-ink/50">{row.service}</span>
              </span>
              <span
                className={
                  row.tone === "live"
                    ? "rounded-md bg-primary px-2 py-0.5 font-mono text-[10px] font-medium uppercase tracking-wide text-white"
                    : "rounded-md bg-primary-light px-2 py-0.5 font-mono text-[10px] font-medium uppercase tracking-wide text-primary-dark"
                }
              >
                {row.status}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  suffix,
}: {
  label: string;
  value: string;
  suffix?: string;
}) {
  return (
    <div className="px-2 py-3 text-center sm:px-4">
      <p className="font-mono text-base font-semibold tabular-nums tracking-tight sm:text-lg">
        {value}
      </p>
      {suffix ? (
        <p className="font-mono text-[10px] font-medium text-ink/40">{suffix}</p>
      ) : null}
      <p className="mt-0.5 text-[10px] text-ink/45 sm:text-[11px]">{label}</p>
    </div>
  );
}
