import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  ChartNoAxesCombined,
  Check,
  Diamond,
  Eye,
  Heart,
  Info,
  ShieldCheck,
  Target,
  Users,
} from "lucide-react";
import { IconCards, SpaCutout } from "@/components/www/blocks";
import { marketingPageMetadata } from "@/lib/seo";
import { PUBLIC_OFFER } from "@/lib/site";
import "./a-propos.css";

export const dynamic = "force-static";

export const metadata: Metadata = marketingPageMetadata({
  title: "À propos de Rappel Beauty · Logiciel institut de beauté au Maroc",
  description:
    "Découvrez Rappel Beauty : un logiciel pensé pour simplifier le quotidien des instituts de beauté au Maroc. Notre mission, notre vision et les valeurs qui guident le produit.",
  canonical: "/a-propos/",
});

const PILLARS = [
  { icon: CalendarDays, title: "Pensé pour", text: "le Maroc" },
  { icon: Heart, title: "Adapté", text: "aux instituts" },
  { icon: Users, title: "Une équipe", text: "à votre écoute" },
];
const VALUES = [
  { icon: Diamond, title: "Simplicité", text: "Une solution intuitive, facile à prendre en main." },
  {
    icon: ShieldCheck,
    title: "Fiabilité",
    text: "Des informations claires pour suivre votre activité.",
  },
  { icon: Users, title: "Proximité", text: "Un accompagnement en français, à votre écoute." },
  {
    icon: ChartNoAxesCombined,
    title: "Performance",
    text: "Des fonctionnalités concrètes pour piloter votre croissance.",
  },
];

export default function AProposPage() {
  return (
    <div className="ap">
      <div className="vt-wrap ap-wrap">
        <section className="ap-hero" aria-labelledby="about-title">
          <div className="ap-hero-copy">
            <span className="ap-badge">
              <Info aria-hidden="true" />À propos
            </span>
            <h1 id="about-title">
              L’histoire de
              <br />
              Rappel <em>Beauty</em>
            </h1>
            <p className="ap-lead">
              Un logiciel pensé pour les instituts de beauté, salons et centres d’esthétique au
              Maroc, afin de simplifier la gestion quotidienne et d’offrir une meilleure expérience
              à vos clientes.
            </p>
            <div className="ap-pillars">
              {PILLARS.map(({ icon: Icon, title, text }) => (
                <div className="ap-pillar" key={title}>
                  <span className="ap-icon">
                    <Icon aria-hidden="true" />
                  </span>
                  <p>
                    <strong>{title}</strong>
                    <br />
                    {text}
                  </p>
                </div>
              ))}
            </div>
          </div>
          <div className="ap-reception-frame">
            <Image
              src="/brand/reception-salon.png"
              alt="Réception de salon Rappel Beauty en 3D"
              width={1568}
              height={1003}
              sizes="(max-width: 760px) 100vw, 55vw"
              className="ap-reception"
              priority
            />
          </div>
        </section>

        <section
          id="notre-histoire"
          className="ap-purpose"
          aria-label="Notre mission et notre vision"
        >
          <div className="ap-professional">
            <div className="ap-portrait-frame">
              <Image
                src="/brand/rappels-beaute.png"
                alt="Professionnelle Rappel Beauty sur tablette, avec des illustrations de rappels et de rendez-vous"
                width={1536}
                height={1024}
                sizes="(max-width: 760px) 100vw, 45vw"
              />
            </div>
          </div>
          <div className="ap-purpose-copy">
            <article>
              <span className="ap-icon">
                <Target aria-hidden="true" />
              </span>
              <div>
                <h2>
                  Notre <em>mission</em>
                </h2>
                <p>
                  Aider les professionnels de la beauté à gagner du temps, organiser leur activité
                  et développer leur clientèle grâce à une solution simple, complète et accessible.
                </p>
              </div>
            </article>
            <article>
              <span className="ap-icon">
                <Eye aria-hidden="true" />
              </span>
              <div>
                <h2>
                  Notre <em>vision</em>
                </h2>
                <p>
                  Faire de Rappel Beauty une référence de la gestion des instituts de beauté au
                  Maroc, avec des outils modernes, fiables et adaptés à votre quotidien.
                </p>
              </div>
            </article>
          </div>
        </section>

        <section className="ap-values" aria-labelledby="about-values-title">
          <div className="ap-values-heading">
            <span className="ap-eyebrow">Nos valeurs</span>
            <h2 id="about-values-title">
              Ce qui nous guide <em>au quotidien</em>
            </h2>
          </div>
          <div className="ap-values-grid">
            <IconCards items={VALUES} />
          </div>
        </section>

        <section id="demande-demo" className="ap-cta" aria-labelledby="about-cta-title">
          <SpaCutout className="ap-cta-spa" sizes="220px" />
          <div>
            <h2 id="about-cta-title">Rejoignez les instituts qui font confiance à Rappel Beauty</h2>
            <p>
              <Check aria-hidden="true" />
              Sans carte bancaire, sans engagement.
            </p>
          </div>
          <Link href="/professionnel/">
            Essai gratuit {PUBLIC_OFFER.trialDays} jours
            <ArrowRight aria-hidden="true" />
          </Link>
        </section>
      </div>
    </div>
  );
}
