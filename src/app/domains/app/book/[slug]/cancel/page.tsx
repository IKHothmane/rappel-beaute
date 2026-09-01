import Link from "next/link";

export default function BookingCancelPage({
  params,
  searchParams,
}: {
  params: { slug: string };
  searchParams: { id?: string };
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-paper px-6">
      <div className="surface max-w-md p-6 text-center text-sm">
        <h1 className="font-display text-xl font-semibold">Annulation</h1>
        <p className="mt-3 text-ink/60">
          L&apos;annulation en ligne sera disponible prochainement. Contactez l&apos;institut pour modifier votre
          rendez-vous.
        </p>
        {searchParams.id ? (
          <p className="mt-2 font-mono text-xs text-ink/40">RDV {searchParams.id}</p>
        ) : null}
        <Link href={`/book/${params.slug}/`} className="btn-primary mt-6 inline-block">
          Retour
        </Link>
      </div>
    </div>
  );
}
