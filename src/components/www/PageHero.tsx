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
      <div className="pointer-events-none absolute inset-0 bg-grain opacity-70" />
      <div className="container-rb vt-enter relative py-12 md:py-14">
        <p className="eyebrow">{eyebrow}</p>
        <h1 className="mt-3 max-w-3xl font-display text-3xl font-semibold tracking-tight sm:text-4xl md:text-[2.75rem] md:leading-tight">
          {title}
        </h1>
        <p className="mt-4 max-w-xl text-base leading-relaxed text-ink/70">{text}</p>
        <div className="mt-8 flex flex-wrap gap-3">
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
