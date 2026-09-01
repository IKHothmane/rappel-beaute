import Link from "next/link";
import { resolveOrganizationBySlug } from "@/lib/db/public-booking";
import { getAppointmentById } from "@/lib/db/appointments";
import { formatBookingDate, formatBookingTime, formatMad } from "@/modules/public-booking/service";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ id?: string }>;
};

export default async function BookingConfirmationPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { id } = await searchParams;
  const org = await resolveOrganizationBySlug(slug);

  if (!org || !id) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-paper px-6 text-center text-sm">
        Confirmation introuvable.
      </div>
    );
  }

  const apt = await getAppointmentById(id, org.id);

  return (
    <div className="min-h-screen bg-paper px-4 py-10">
      <div className="mx-auto max-w-md surface p-6 text-center">
        <p className="text-3xl">✅</p>
        <h1 className="mt-2 font-display text-2xl font-semibold">Rendez-vous confirmé</h1>
        {apt ? (
          <>
            <p className="mt-4 text-sm">
              {apt.serviceName} avec {apt.staffName}
            </p>
            <p className="text-sm font-medium">
              {formatBookingDate(apt.startAt)} à {formatBookingTime(apt.startAt)}
            </p>
            <p className="font-mono text-sm text-ink/55">{formatMad(apt.price)}</p>
            <p className="mt-2 text-xs text-ink/45">{org.name}</p>
          </>
        ) : (
          <p className="mt-4 text-sm text-ink/60">Référence : {id}</p>
        )}
        <div className="mt-6 flex flex-col gap-2 text-sm">
          <Link href={`/book/${slug}/reschedule/?id=${id}`} className="text-primary">
            Reprogrammer
          </Link>
          <Link href={`/book/${slug}/cancel/?id=${id}`} className="text-red-600">
            Annuler
          </Link>
          <Link href={`/book/${slug}/`} className="text-ink/45">
            Nouvelle réservation
          </Link>
        </div>
      </div>
    </div>
  );
}
