"use client";

import { SupplierDetailView } from "@/components/procurement/supplier-detail-view";

type Props = { params: { id: string } };

export default function SupplierDetailPage({ params }: Props) {
  return <SupplierDetailView supplierId={params.id} />;
}
