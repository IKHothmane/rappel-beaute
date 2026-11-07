import { redirect } from "next/navigation";

type Props = {
  searchParams: Promise<{ vue?: string; customerId?: string; appointmentId?: string }>;
};

/** Ancienne adresse : tout est regroupé sur /cash-register/. */
export default async function PaymentsPage({ searchParams }: Props) {
  const sp = await searchParams;
  if (sp.vue === "depenses") {
    redirect("/expenses/");
  }
  const params = new URLSearchParams();
  if (sp.customerId) params.set("customerId", sp.customerId);
  if (sp.appointmentId) params.set("appointmentId", sp.appointmentId);
  const qs = params.toString();
  redirect(qs ? `/cash-register/?${qs}` : "/cash-register/");
}
