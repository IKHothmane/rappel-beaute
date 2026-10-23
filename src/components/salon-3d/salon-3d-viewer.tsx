"use client";

/** Vue plein écran du plan 3D institut (données live). */
export function Salon3dViewer() {
  return (
    <div className="flex h-[calc(100dvh-4rem)] flex-col overflow-hidden rounded-2xl border border-line bg-white shadow-sm sm:h-[calc(100dvh-4.5rem)] lg:h-[calc(100dvh-5rem)]">
      <div className="flex items-center justify-between gap-3 border-b border-line bg-white px-4 py-2.5">
        <div>
          <p className="text-sm font-bold text-ink">Plan 3D de l’institut</p>
          <p className="text-xs text-ink/55">Données live — cabines, équipe, attente et stock</p>
        </div>
        <a
          href="/salon-3d.html"
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 rounded-lg border border-line bg-[#FBF5F8] px-3 py-1.5 text-xs font-semibold text-ink hover:bg-[#F5EAF0]"
        >
          Ouvrir en plein écran
        </a>
      </div>
      <iframe
        title="Plan 3D de l’institut"
        src="/salon-3d.html"
        className="h-full w-full flex-1 border-0 bg-white"
        allow="fullscreen"
        loading="eager"
      />
    </div>
  );
}
