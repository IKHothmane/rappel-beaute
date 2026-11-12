import Link from "next/link";

export function PageHero({
  eyebrow,
  title,
  text,
}: {
  eyebrow: string;
  title: string;
  text: string;
}) {
  return (
    <section className="relative overflow-hidden border-b border-line bg-[radial-gradient(ellipse_at_top_left,_rgba(227,28,95,0.10),_transparent_50%),linear-gradient(180deg,#FFFBF9_0%,#FDEAF0_100%)]">
      <div className="pointer-events-none absolute inset-[var(--vt-size-0rem)] bg-grain opacity-70" />
      <div className="container-rb vt-enter relative py-[var(--vt-space-3rem)] md:py-[var(--vt-space-3p5rem)]">
        <p className="eyebrow">{eyebrow}</p>
        <h1 className="mt-[var(--vt-space-0p75rem)] max-w-[var(--vt-size-48rem)] font-display text-[length:var(--vt-fs-h1)] leading-[var(--vt-lh-h1)] font-semibold tracking-tight">
          {title}
        </h1>
        <p className="mt-[var(--vt-space-1rem)] max-w-[var(--vt-size-36rem)] text-[length:var(--vt-text-1rem)]/[var(--vt-line-1p5rem)] leading-[var(--vt-leading-1p625)] text-ink/70">{text}</p>
        <div className="mt-[var(--vt-space-2rem)] flex flex-wrap gap-[var(--vt-space-0p75rem)]">
          <Link href="/demo/" className="btn-primary transition hover:scale-[1.02]">
            Demander une démo
          </Link>
          <Link href="/professionnel/" className="btn-ghost transition hover:scale-[1.02]">
            Demande d’essai
          </Link>
        </div>
      </div>
    </section>
  );
}
