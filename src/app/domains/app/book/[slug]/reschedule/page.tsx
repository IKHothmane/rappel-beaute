import Link from "next/link";

export default function BookingReschedulePage({
  params,
  searchParams,
}: {
  params: { slug: string };
  searchParams: { id?: string };
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-paper px-6">
      <div className="surface max-w-md p-6 text-center text-sm">
        <h1 className="font-display text-xl font-semibold">Reprogrammation</h1>
        <p className="mt-3 text-ink/60">
          La reprogrammation en ligne arrive bientôt. Vous pouvez créer un nouveau rendez-vous ou contacter
          l&apos;institut.
        </p>
        <Link href={`/book/${params.slug}/`} className="btn-primary mt-6 inline-block">
          Nouvelle réservation
        </Link>
      </div>
    </div>
  );
}
