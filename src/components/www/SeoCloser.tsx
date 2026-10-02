import { JsonLd } from "@/components/www/JsonLd";

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
      <div className="mx-auto max-w-3xl space-y-12 px-4 py-14 sm:px-6 sm:py-20">
        <div>
          <h2 className="font-display text-2xl font-light text-ink sm:text-3xl">
            Le problème dans l&apos;institut
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-ink/70 sm:text-base">{problem}</p>
        </div>
        <div>
          <h2 className="font-display text-2xl font-light text-ink sm:text-3xl">
            Ce que fait Rappel Beauty
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-ink/70 sm:text-base">{solution}</p>
        </div>
        <div>
          <h2 className="font-display text-2xl font-light text-ink sm:text-3xl">Un cas concret</h2>
          <p className="mt-4 text-sm leading-relaxed text-ink/70 sm:text-base">{useCase}</p>
        </div>
        {faqs && faqs.length > 0 ? (
          <div>
            <h2 className="font-display text-2xl font-light text-ink sm:text-3xl">
              Questions fréquentes
            </h2>
            <div className="mt-6 space-y-3">
              {faqs.map((item) => (
                <details key={item.q} className="rounded-xl border border-line bg-paper p-4 sm:p-5">
                  <summary className="cursor-pointer text-sm font-medium text-ink sm:text-base">
                    {item.q}
                  </summary>
                  <p className="mt-3 text-sm leading-relaxed text-ink/65">{item.a}</p>
                </details>
              ))}
            </div>
            <JsonLd
              data={{
                "@context": "https://schema.org",
                "@type": "FAQPage",
                mainEntity: faqs.map((item) => ({
                  "@type": "Question",
                  name: item.q,
                  acceptedAnswer: { "@type": "Answer", text: item.a },
                })),
              }}
            />
          </div>
        ) : null}
      </div>
    </section>
  );
}
