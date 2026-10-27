"use client";

/** Fichier statique (évite la route Next `/salon-3d/` qui embarque déjà cette iframe). */
const SALON_3D_SRC = "/salon-3d/index.html";

/** Vue plein écran — visite 3D interactive du salon. */
export function Salon3dViewer() {
  return (
    <div className="salon-3d-embed relative flex flex-col overflow-hidden bg-white lg:rounded-2xl lg:border lg:border-line lg:shadow-sm">
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-line bg-white px-4 py-2.5">
        <div>
          <p className="text-sm font-bold text-ink">Plan 3D de l’institut</p>
          <p className="text-xs text-ink/55">
            Visite guidée — accueil, attente, coiffure, onglerie, soins et stock
          </p>
        </div>
        <a
          href={SALON_3D_SRC}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 rounded-lg border border-line bg-[#FBF5F8] px-3 py-1.5 text-xs font-semibold text-ink hover:bg-[#F5EAF0]"
        >
          Ouvrir en plein écran
        </a>
      </div>
      <iframe
        title="Visite 3D du salon"
        src={SALON_3D_SRC}
        className="block min-h-0 w-full flex-1 border-0 bg-[#f8edf1]"
        allow="fullscreen"
        loading="eager"
      />
    </div>
  );
}
