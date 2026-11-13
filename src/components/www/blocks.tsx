import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Check, Plus, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

/* Briques partagées par les pages de la vitrine : chaque page garde ses
   propres classes CSS, mais le balisage commun n'existe qu'ici. */

export type AccordionItem = {
  id?: string;
  title: string;
  text: string;
  href?: string;
  link?: string;
};
export type FaqEntry = { question: string; answer: string };

/** Liste de `<details>` : titre, texte et lien optionnel vers une autre page. */
export function Accordion({
  items,
  icon: Icon = Plus,
  openFirst = false,
}: {
  items: readonly AccordionItem[];
  icon?: LucideIcon;
  openFirst?: boolean;
}) {
  return (
    <>
      {items.map(({ id, title, text, href, link }, index) => (
        <details id={id} key={id ?? title} open={openFirst && index === 0 ? true : undefined}>
          <summary>
            {title}
            <Icon aria-hidden="true" />
          </summary>
          <p>{text}</p>
          {href && link ? (
            <Link href={href}>
              {link}
              <ArrowRight aria-hidden="true" />
            </Link>
          ) : null}
        </details>
      ))}
    </>
  );
}

/** Même liste, alimentée par des entrées `{ question, answer }`. */
export function FaqAccordion({
  faqs,
  icon,
  openFirst,
}: {
  faqs: readonly FaqEntry[];
  icon?: LucideIcon;
  openFirst?: boolean;
}) {
  return (
    <Accordion
      icon={icon}
      openFirst={openFirst}
      items={faqs.map(({ question, answer }) => ({ title: question, text: answer }))}
    />
  );
}

/** `<section>` + titre + conteneur, autour d'un `Accordion` / `FaqAccordion`. */
export function AccordionSection({
  className,
  id,
  title,
  titleClassName,
  children,
}: {
  className: string;
  id: string;
  title: ReactNode;
  titleClassName?: string;
  children: ReactNode;
}) {
  return (
    <section className={className} aria-labelledby={id}>
      <h2 id={id} className={titleClassName}>
        {title}
      </h2>
      <div>{children}</div>
    </section>
  );
}

/** Liste à puces « coche » : promesses, avantages, éléments inclus. */
export function CheckList({ items, className }: { items: readonly string[]; className?: string }) {
  return (
    <ul className={className}>
      {items.map((text) => (
        <li key={text}>
          <Check aria-hidden="true" />
          {text}
        </li>
      ))}
    </ul>
  );
}

export type IconItem = { icon: LucideIcon; title: string; text: string };

/** Cartes « icône, titre, texte ». `iconClassName` enveloppe l'icône dans un `<span>`. */
export function IconCards({
  items,
  articleClassName,
  iconClassName,
}: {
  items: readonly IconItem[];
  articleClassName?: string;
  iconClassName?: string;
}) {
  return (
    <>
      {items.map(({ icon: Icon, title, text }) => (
        <article className={["vt-icon-card", articleClassName].filter(Boolean).join(" ")} key={title}>
          <div className="vt-card-head">
            {iconClassName ? (
              <span className={iconClassName}>
                <Icon aria-hidden="true" />
              </span>
            ) : (
              <Icon aria-hidden="true" />
            )}
            <h3>{title}</h3>
          </div>
          <p>{text}</p>
        </article>
      ))}
    </>
  );
}

/** Pastilles « icône + titre en gras + précision » (bandeaux de repères). */
export function IconFacts({
  items,
  as: Tag = "li",
  iconClassName,
}: {
  items: readonly IconItem[];
  as?: "li" | "div";
  iconClassName?: string;
}) {
  return (
    <>
      {items.map(({ icon: Icon, title, text }) => (
        <Tag key={title}>
          {iconClassName ? (
            <span className={iconClassName}>
              <Icon aria-hidden="true" />
            </span>
          ) : (
            <Icon aria-hidden="true" />
          )}
          <p>
            <strong>{title}</strong>
            <span>{text}</span>
          </p>
        </Tag>
      ))}
    </>
  );
}

/** Illustration « spa » détourée, réutilisée dans les héros et les bandeaux. */
export function SpaCutout({ className, sizes }: { className?: string; sizes: string }) {
  return (
    <Image
      className={className}
      src="/brand/footer-spa-cutout.webp"
      alt=""
      width={1774}
      height={887}
      sizes={sizes}
    />
  );
}
