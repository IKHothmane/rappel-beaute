import { JsonLd } from "@/components/www/JsonLd";
import { faqPageJsonLd } from "@/lib/seo";

export function SeoCloser({
  problem,
  solution,
  useCase,
  faqs,
}: {
  problem: string;
  solution: string;
  useCase: string;
  faqs?: { q: string; a: string }[];
}) {
  return (
    <section className="border-t border-line bg-white">
      <div className="mx-auto max-w-[var(--vt-size-48rem)] space-y-[var(--vt-space-2rem)] px-[var(--vt-space-1rem)] py-[var(--vt-space-3rem)] sm:space-y-[var(--vt-space-3rem)] sm:px-[var(--vt-space-1p5rem)] sm:py-[var(--vt-space-4rem)]">
        <div>
          <h2 className="font-display text-[length:var(--vt-text-1p5rem)]/[var(--vt-line-2rem)] font-light text-ink sm:text-[length:var(--vt-text-1p875rem)]/[var(--vt-line-2p25rem)]">
            Le problème dans l&apos;institut
          </h2>
          <p className="mt-[var(--vt-space-1rem)] text-[length:var(--vt-text-0p875rem)]/[var(--vt-line-1p25rem)] leading-[var(--vt-leading-1p625)] text-ink/70 sm:text-[length:var(--vt-text-1rem)]/[var(--vt-line-1p5rem)]">{problem}</p>
        </div>
        <div>
          <h2 className="font-display text-[length:var(--vt-text-1p5rem)]/[var(--vt-line-2rem)] font-light text-ink sm:text-[length:var(--vt-text-1p875rem)]/[var(--vt-line-2p25rem)]">
            Ce que fait Rappel Beauty
          </h2>
          <p className="mt-[var(--vt-space-1rem)] text-[length:var(--vt-text-0p875rem)]/[var(--vt-line-1p25rem)] leading-[var(--vt-leading-1p625)] text-ink/70 sm:text-[length:var(--vt-text-1rem)]/[var(--vt-line-1p5rem)]">{solution}</p>
        </div>
        <div>
          <h2 className="font-display text-[length:var(--vt-text-1p5rem)]/[var(--vt-line-2rem)] font-light text-ink sm:text-[length:var(--vt-text-1p875rem)]/[var(--vt-line-2p25rem)]">Un cas concret</h2>
          <p className="mt-[var(--vt-space-1rem)] text-[length:var(--vt-text-0p875rem)]/[var(--vt-line-1p25rem)] leading-[var(--vt-leading-1p625)] text-ink/70 sm:text-[length:var(--vt-text-1rem)]/[var(--vt-line-1p5rem)]">{useCase}</p>
        </div>
        {faqs && faqs.length > 0 ? (
          <div>
            <h2 className="font-display text-[length:var(--vt-text-1p5rem)]/[var(--vt-line-2rem)] font-light text-ink sm:text-[length:var(--vt-text-1p875rem)]/[var(--vt-line-2p25rem)]">
              Questions fréquentes
            </h2>
            <div className="mt-[var(--vt-space-1p5rem)] space-y-[var(--vt-space-0p75rem)]">
              {faqs.map((item) => (
                <details key={item.q} className="rounded-xl border border-line bg-paper p-[var(--vt-space-1rem)] sm:p-[var(--vt-space-1p25rem)]">
                  <summary className="cursor-pointer text-[length:var(--vt-text-0p875rem)]/[var(--vt-line-1p25rem)] font-medium text-ink sm:text-[length:var(--vt-text-1rem)]/[var(--vt-line-1p5rem)]">
                    {item.q}
                  </summary>
                  <p className="mt-[var(--vt-space-0p75rem)] text-[length:var(--vt-text-0p875rem)]/[var(--vt-line-1p25rem)] leading-[var(--vt-leading-1p625)] text-ink/65">{item.a}</p>
                </details>
              ))}
            </div>
            <JsonLd
              data={faqPageJsonLd(faqs.map((item) => ({ question: item.q, answer: item.a })))}
            />
          </div>
        ) : null}
      </div>
    </section>
  );
}
