"use client";

import { ResourceDetailView } from "@/components/resources/resource-detail-view";

type Props = { params: { id: string } };

export default function ResourceDetailPage({ params }: Props) {
  return <ResourceDetailView resourceId={params.id} />;
}
