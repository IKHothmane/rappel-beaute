import type { Metadata } from "next";
import Link from "next/link";
import { TrialFeedbackForm } from "@/components/www/TrialFeedbackForm";
import { verifyTrialFeedbackToken } from "@/lib/subscriptions/trial-feedback";
import { SITE } from "@/lib/site";
import "./avis-essai.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Votre avis sur Rappel Beauty",
  description: "Donnez votre avis sur Rappel Beauty après votre essai gratuit.",
  robots: { index: false, follow: false },
};

export default function TrialFeedbackPage({ searchParams }: { searchParams: { t?: string | string[] } }) {
  const token = Array.isArray(searchParams.t) ? searchParams.t[0] : searchParams.t;
  const subject = verifyTrialFeedbackToken(token);

  return (
    <section className="tf">
      <div className="tf-card">
        {subject && token ? (
          <>
            <p className="tf-eyebrow">{subject.orgName || "Votre institut"}</p>
            <h1>Merci d’avoir essayé Rappel Beauty</h1>
            <p className="tf-lead">
              Votre avis nous aide à améliorer la plateforme. Dites-nous ce qui vous a plu et ce que nous pouvons faire
              mieux : une minute suffit.
            </p>
            <TrialFeedbackForm token={token} />
          </>
        ) : (
          <>
            <h1>Ce lien n’est plus valable</h1>
            <p className="tf-lead">
              Utilisez le lien « Donner mon avis » de l’e-mail reçu à la fin de votre essai, ou écrivez-nous à{" "}
              <a href={`mailto:${SITE.email}`}>{SITE.email}</a>.
            </p>
            <Link className="tf-link" href="/">Retour à l’accueil</Link>
          </>
        )}
      </div>
    </section>
  );
}
