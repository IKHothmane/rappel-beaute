import { BookingPageView } from "@/components/booking/booking-page";
import { parseBookingQrQuery } from "@/lib/booking-qr";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ service?: string; staff?: string; source?: string }>;
};

export default async function PublicBookingRoutePage({ params, searchParams }: Props) {
  const { slug } = await params;
  const sp = await searchParams;
  const qr = parseBookingQrQuery(sp);

  return (
    <BookingPageView
      slug={slug}
      initialServiceRef={qr.service ?? sp.service ?? null}
      initialStaffRef={qr.staff ?? sp.staff ?? null}
      attributionSource={qr.source ?? sp.source ?? null}
    />
  );
}
