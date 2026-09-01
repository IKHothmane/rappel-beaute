"use client";

import { ProductDetailView } from "@/components/inventory/product-detail-view";

type Props = { params: { id: string } };

export default function ProductDetailPage({ params }: Props) {
  return <ProductDetailView productId={params.id} />;
}
