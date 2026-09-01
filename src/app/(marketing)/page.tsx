import Link from "next/link";
import { DashboardMockup } from "@/components/www/DashboardMockup";
import { PricingSection } from "@/components/www/PricingSection";
import { FEATURES } from "@/lib/site";

export const dynamic = "force-static";

const TRUST = [
  { k: "EXCLUDE", t: "Anti double-réservation", d: "PostgreSQL refuse le chevauchement staff et cabine. Pas seulement l’appli." },
  { k: "JSONB", t: "Journal d’audit", d: "Chaque action sensible garde un avant / après. On sait qui a fait quoi." },
  { k: "RLS", t: "Sécurité multi-tenant", d: "Un institut ne voit jamais les données d’un autre. Isolation en base." },
  { k: "Decimal", t: "Précision financière", d: "Tous les montants en Decimal. Jamais de Float sur la caisse." },
];

const WA_STEPS = [
  { n: "01", t: "Préparez", d: "Le logiciel rédige le message (rappel, confirmation, avis) et le pose dans « À envoyer »." },
  { n: "02", t: "Envoyez", d: "Un clic ouvre wa.me. Vous envoyez vous-même, avec votre numéro d’institut." },
  { n: "03", t: "Marquez", d: "Vous indiquez « envoyé ». Aucun bot, aucun faux « lu » ou « répondu »." },
];

export default function HomePage() {
  return (
    <>
      <section className="relative overflow-hidden border-b border-line">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(227,28,95,0.13),_transparent_42%),radial-gradient(ellipse_at_bottom_left,_rgba(253,234,240,0.9),_transparent_50%),linear-gradient(180deg,#FFFBF9_0%,#FFF6F4_100%)]"
        />
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-grain" />

        <div className="container-rb relative grid items-center gap-12 py-16 md:py-20 lg:grid-cols-[minmax(0,1fr)_minmax(0,34rem)] lg:gap-10 lg:py-24">
          <div className="animate-rise">
            <div className="flex flex-wrap items-center gap-2 rounded-lg border border-line bg-white/80 px-3 py-1.5">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-pulse-dot rounded-full bg-primary" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
              </span>
              <span className="font-mono text-[11px] font-medium uppercase tracking-[0.12em] text-ink/70">
                En direct
              </span>
              <span className="hidden text-[11px] text-ink/45 sm:inline">
                +24 instituts connectés
              </span>
            </div>

            <h1 className="mt-6 font-display text-[2rem] font-bold leading-[1.15] tracking-tight md:text-[48px] md:leading-[1.12]">
              Le logiciel de gestion{" "}
              <span className="text-primary">n°1 des instituts de beauté</span>{" "}
              au Maroc.
            </h1>

            <p className="mt-5 max-w-md text-[15px] leading-relaxed text-ink/65">
              Agenda, clientes, stock, caisse et WhatsApp — pensé pour les
              patronnes, pas pour les DSI. Activation sous 24 h, 14 jours sans
              carte bancaire.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/demo/" className="btn-primary">
                Demander une démo
              </Link>
              <Link href="/essai/" className="btn-ghost">
                Essayer 14 jours
              </Link>
            </div>

            <p className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-ink/55">
              <span>
                <span className="font-mono font-semibold text-ink">4,8/5</span> Google
              </span>
              <span className="hidden h-3 w-px bg-line sm:block" />
              <span>
                <span className="font-mono font-semibold text-ink">+200</span> patronnes
              </span>
            </p>
          </div>

          <div className="flex justify-center lg:justify-end">
            <DashboardMockup />
          </div>
        </div>
      </section>

      <section className="py-20 md:py-28">
        <div className="container-rb">
          <p className="eyebrow">Modules</p>
          <h2 className="mt-3 max-w-xl font-display text-3xl font-semibold tracking-tight md:text-4xl">
            Six piliers pour tenir l’institut.
          </h2>
          <p className="mt-3 max-w-lg text-ink/65">
            Un seul outil. Du premier RDV du matin jusqu’à la clôture de caisse.
          </p>

          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <Link
                key={f.id}
                href={f.href}
                className="surface group p-6 transition hover:border-primary/30"
              >
                <h3 className="font-display text-lg font-semibold group-hover:text-primary">
                  {f.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-ink/65">{f.text}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-line bg-[#FBF4F6] py-20 md:py-28">
        <div className="container-rb">
          <p className="eyebrow">Fondations</p>
          <h2 className="mt-3 max-w-2xl font-display text-3xl font-semibold tracking-tight md:text-4xl">
            Sécurité. Fiabilité. Transparence.
          </h2>
          <p className="mt-3 max-w-lg text-ink/65">
            Ce que la vitrine promet, le moteur le tient — dès la première
            migration.
          </p>
          <div className="mt-12 grid gap-4 sm:grid-cols-2">
            {TRUST.map((item) => (
              <article key={item.k} className="surface p-6">
                <p className="font-mono text-[11px] font-medium tracking-[0.14em] text-primary">
                  {item.k}
                </p>
                <h3 className="mt-2 font-display text-lg font-semibold">{item.t}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink/65">{item.d}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 md:py-28">
        <div className="container-rb">
          <p className="eyebrow">WhatsApp V1.3</p>
          <h2 className="mt-3 max-w-xl font-display text-3xl font-semibold tracking-tight md:text-4xl">
            Préparez. Envoyez. Marquez.
          </h2>
          <p className="mt-3 max-w-lg text-ink/65">
            WhatsApp manuel assisté. <span className="font-medium text-ink">Aucun bot.</span>{" "}
            Le logiciel prépare, l’humaine envoie.
          </p>
          <div className="mt-12 grid gap-4 md:grid-cols-3">
            {WA_STEPS.map((s) => (
              <article key={s.n} className="surface p-6">
                <p className="font-mono text-sm text-primary">{s.n}</p>
                <h3 className="mt-3 font-display text-xl font-semibold">{s.t}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink/65">{s.d}</p>
              </article>
            ))}
          </div>
          <p className="mt-8">
            <Link href="/whatsapp/" className="text-sm font-semibold text-primary hover:text-primary-dark">
              Comment fonctionne WhatsApp manuel →
            </Link>
          </p>
        </div>
      </section>

      <div className="border-t border-line bg-[#FBF4F6]">
        <PricingSection />
      </div>

      <section className="py-20 md:py-28">
        <div className="container-rb">
          <div className="grid gap-8 border-b border-line pb-12 sm:grid-cols-3">
            <div>
              <p className="font-mono text-3xl font-semibold tabular-nums">24</p>
              <p className="mt-1 text-sm text-ink/55">instituts connectés</p>
            </div>
            <div>
              <p className="font-mono text-3xl font-semibold tabular-nums">4,8/5</p>
              <p className="mt-1 text-sm text-ink/55">note Google</p>
            </div>
            <div>
              <p className="font-mono text-3xl font-semibold tabular-nums">+200</p>
              <p className="mt-1 text-sm text-ink/55">patronnes accompagnées</p>
            </div>
          </div>

          <div className="mt-14 max-w-2xl">
            <h2 className="font-display text-3xl font-semibold tracking-tight md:text-4xl">
              Reprenez la main sur votre institut.
            </h2>
            <p className="mt-4 text-ink/65">
              Une démo de 20 minutes, ou une demande d’essai. Activation sous
              24 h, sans carte bancaire.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/demo/" className="btn-primary">
                Demander une démo
              </Link>
              <Link href="/essai/" className="btn-ghost">
                Demande d’essai 14 jours
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
