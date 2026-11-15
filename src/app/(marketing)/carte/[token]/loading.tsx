/** Squelette de la carte : mêmes dimensions que la page, pour éviter tout décalage à l'affichage. */
export default function LoyaltyCardLoading() {
  const block = "animate-pulse rounded-2xl bg-[#F5DDE8] motion-reduce:animate-none";
  return (
    <div className="min-h-screen bg-vt-surface py-[var(--vt-space-1p5rem)] sm:py-[var(--vt-space-2p5rem)]">
      <div role="status" aria-live="polite" className="mx-auto max-w-[var(--vt-size-28rem)] space-y-[var(--vt-space-1rem)] px-[var(--vt-space-1rem)]">
        <span className="sr-only">Chargement de votre carte…</span>
        <div aria-hidden="true" className="space-y-4">
          <div className="h-[39rem] animate-pulse rounded-3xl bg-[#6B2744]/80 motion-reduce:animate-none" />
          <div className={`${block} h-36`} />
          <div className={`${block} h-48`} />
        </div>
      </div>
    </div>
  );
}
