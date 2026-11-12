import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Play, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { JsonLd } from "@/components/www/JsonLd";
import {
  Accordion,
  AccordionSection,
  CheckList,
  FaqAccordion,
  IconCards,
  IconFacts,
  SpaCutout,
  type AccordionItem,
  type FaqEntry,
  type IconItem,
} from "@/components/www/blocks";
import { faqPageJsonLd } from "@/lib/seo";

/* Gabarit « sp- » (showcase-landing.css) partagé par les pages Clientes,
   Stock et WhatsApp. Chaque page importe elle-même la feuille de style. */

export function ShowcaseShell({
  faqs,
  children,
}: {
  faqs: readonly FaqEntry[];
  children: ReactNode;
}) {
  return (
    <div className="sp">
      <JsonLd data={faqPageJsonLd(faqs)} />
      <div className="vt-wrap sp-wrap">{children}</div>
    </div>
  );
}

export function ShowcaseHero({
  titleId,
  badge,
  badgeClassName = "vt-badge sp-badge",
  title,
  lead,
  cta,
  promises,
  children,
}: {
  titleId: string;
  badge: ReactNode;
  badgeClassName?: string;
  title: ReactNode;
  lead: string;
  cta: string;
  promises: readonly string[];
  children: ReactNode;
}) {
  return (
    <section className="sp-hero" aria-labelledby={titleId}>
      <div>
        <span className={badgeClassName}>{badge}</span>
        <h1 id={titleId}>{title}</h1>
        <p className="sp-lead">{lead}</p>
        <div className="sp-actions">
          <Link className="sp-primary" href="/professionnel/">
            {cta}
            <ArrowRight aria-hidden="true" />
          </Link>
          <Link className="sp-ghost" href="/demo/">
            <span className="sp-play">
              <Play aria-hidden="true" fill="currentColor" />
            </span>
            Voir la démo
          </Link>
        </div>
        <CheckList className="sp-promises" items={promises} />
      </div>
      {children}
    </section>
  );
}

export function ShowcaseDetails({
  id,
  title,
  items,
}: {
  id: string;
  title: ReactNode;
  items: readonly AccordionItem[];
}) {
  return (
    <AccordionSection className="sp-details" titleClassName="sp-title" id={id} title={title}>
      <Accordion items={items} />
    </AccordionSection>
  );
}

export function ShowcaseFaq({ id, faqs }: { id: string; faqs: readonly FaqEntry[] }) {
  return (
    <AccordionSection
      className="sp-faq"
      titleClassName="sp-title"
      id={id}
      title={
        <>
          Vos questions, <em>nos réponses</em>
        </>
      }
    >
      <FaqAccordion faqs={faqs} />
    </AccordionSection>
  );
}

/** Page complète « fonctionnalités / avantages / détails / FAQ » (Clientes, Stock). */
export function ShowcaseLanding({
  prefix,
  faqs,
  badge,
  title,
  lead,
  promises,
  device,
  featuresTitle,
  features,
  storyMedia,
  storyKicker,
  checks,
  callout,
  metrics,
  detailsTitle,
  details,
}: {
  prefix: string;
  faqs: readonly FaqEntry[];
  badge: { icon: LucideIcon; label: string };
  title: ReactNode;
  lead: string;
  promises: readonly string[];
  device: { src: string; alt: string; width: number; height: number };
  featuresTitle: ReactNode;
  features: readonly IconItem[];
  storyMedia: ReactNode;
  storyKicker?: string;
  checks: readonly string[];
  callout: { icon: LucideIcon; title: ReactNode; text: string };
  metrics: readonly IconItem[];
  detailsTitle: ReactNode;
  details: readonly AccordionItem[];
}) {
  const BadgeIcon = badge.icon;
  const CalloutIcon = callout.icon;
  const checkList = <CheckList className="sp-checks" items={checks} />;

  return (
    <ShowcaseShell faqs={faqs}>
      <ShowcaseHero
        titleId={`${prefix}-title`}
        badge={
          <>
            <BadgeIcon aria-hidden="true" />
            {badge.label}
          </>
        }
        title={title}
        lead={lead}
        cta="Essayer gratuitement"
        promises={promises}
      >
        <div className="sp-device">
          <div className="sp-device-glow" />
          <Image
            className="sp-laptop"
            src={device.src}
            alt={device.alt}
            width={device.width}
            height={device.height}
            sizes="(max-width: 860px) 100vw, 58vw"
            priority
          />
          <SpaCutout className="sp-bloom" sizes="150px" />
        </div>
      </ShowcaseHero>

      <section className="sp-block" aria-labelledby={`${prefix}-features-title`}>
        <h2 className="sp-title" id={`${prefix}-features-title`}>
          {featuresTitle}
        </h2>
        <div className="sp-features">
          <IconCards
            items={features}
            articleClassName="sp-feature"
            iconClassName="sp-feature-icon"
          />
        </div>
      </section>

      <section className="sp-story" aria-labelledby={`${prefix}-benefits-title`}>
        {storyMedia}
        <div>
          <h2 id={`${prefix}-benefits-title`}>
            Les avantages pour <em>votre institut</em>
          </h2>
          <div className="sp-story-grid">
            {storyKicker ? (
              <div>
                <p className="sp-kicker">{storyKicker}</p>
                {checkList}
              </div>
            ) : (
              checkList
            )}
            <aside className="sp-callout">
              <div className="sp-callout-head">
                <span className="sp-callout-icon">
                  <CalloutIcon aria-hidden="true" />
                </span>
                <h3>{callout.title}</h3>
              </div>
              <p>{callout.text}</p>
              <Link className="sp-primary" href="/professionnel/">
                Commencer maintenant
                <ArrowRight aria-hidden="true" />
              </Link>
            </aside>
          </div>
        </div>
      </section>

      <ul className="sp-metrics">
        <IconFacts items={metrics} iconClassName="sp-metric-icon" />
      </ul>

      <ShowcaseDetails id={`${prefix}-details-title`} title={detailsTitle} items={details} />
      <ShowcaseFaq id={`${prefix}-faq-title`} faqs={faqs} />
    </ShowcaseShell>
  );
}
