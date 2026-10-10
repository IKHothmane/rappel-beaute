import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PublicReviewReport } from "@/components/reviews/public-review-report";
import { listPublishedReviews } from "@/lib/reviews/public-review";
import { resolveOrganizationBySlug } from "@/lib/db/public-booking";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Avis", robots: { index: false, follow: false } };

export default async function PublicReviewsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const org = await resolveOrganizationBySlug(slug);
  if (!org) notFound();
  const data = await listPublishedReviews(slug);

  return (
    <section className="min-h-screen bg-paper py-12">
      <div className="mx-auto max-w-lg px-4">
        <p className="text-center text-xs font-bold uppercase tracking-[0.2em] text-primary">{org.name}</p>
        <h1 className="mt-3 text-center font-display text-3xl font-light text-ink">Avis</h1>
        <ul className="mt-8 space-y-3">
          {data.reviews.length === 0 ? (
            <li className="rounded-2xl bg-white p-5 text-center text-sm text-ink/60">Aucun avis publié pour le moment.</li>
          ) : (
            data.reviews.map((review) => (
              <li key={review.id} className="rounded-2xl bg-white p-5 shadow-sm">
                <p className="text-sm font-semibold text-ink">
                  {review.firstName} · {review.rating}/5
                </p>
                <p className="mt-1 text-xs text-ink/50">
                  {review.serviceName} · {new Date(review.createdAt).toLocaleDateString("fr-FR")}
                </p>
                <p className="mt-3 text-sm text-ink/80">{review.comment}</p>
                <PublicReviewReport slug={slug} reviewId={review.id} />
              </li>
            ))
          )}
        </ul>
        <p className="mt-6 text-center">
          <Link href={`/book/${slug}/`} className="text-sm font-semibold text-primary">
            Retour à l&apos;institut
          </Link>
        </p>
      </div>
    </section>
  );
}
