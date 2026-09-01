"use client";

import { PurchaseDetailView } from "@/components/procurement/purchase-detail-view";

type Props = { params: { id: string } };

export default function PurchaseDetailPage({ params }: Props) {
  return <PurchaseDetailView purchaseId={params.id} />;
}
