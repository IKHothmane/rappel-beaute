"use client";

import { CustomerDetailView } from "@/components/app/CustomerDetailView";

type Props = { params: { id: string } };

export default function CustomerDetailPage({ params }: Props) {
  return <CustomerDetailView customerId={params.id} />;
}
