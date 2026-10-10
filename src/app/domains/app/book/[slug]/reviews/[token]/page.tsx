import type { Metadata } from "next";
import { previewPublicReview } from "@/lib/reviews/public-review";
import { PublicReviewForm } from "@/components/reviews/public-review-form";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Donner mon avis", robots: { index: false, follow: false } };

export default async function PublicReviewTokenPage({
  params,
}: {
  params: Promise<{ slug: string; token: string }>;
}) {
  const { slug, token } = await params;
  const preview = await previewPublicReview(slug, token);

  return (
    <section className="min-h-screen bg-paper py-12">
      <div className="mx-auto max-w-md px-4">
        {preview.ok ? (
          <>
            <p className="text-center text-xs font-bold uppercase tracking-[0.2em] text-primary">
              {preview.organizationName}
            </p>
            <h1 className="mt-3 text-center font-display text-3xl font-light text-ink">Donner mon avis</h1>
            <PublicReviewForm
              slug={slug}
              token={token}
              organizationName={preview.organizationName}
              firstName={preview.firstName}
              serviceName={preview.serviceName}
              alreadySubmitted={preview.alreadySubmitted}
            />
          </>
        ) : (
          <p className="rounded-3xl bg-white p-6 text-center text-sm text-ink/70">
            {preview.code === "TOKEN_EXPIRED"
              ? "Ce lien d'avis a expiré."
              : "Ce lien d'avis n'est pas valable."}
          </p>
        )}
      </div>
    </section>
  );
}
