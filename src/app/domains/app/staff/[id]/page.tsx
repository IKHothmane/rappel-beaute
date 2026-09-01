"use client";

import { StaffDetailView } from "@/components/staff/staff-detail-view";

type Props = { params: { id: string } };

export default function StaffDetailPage({ params }: Props) {
  return <StaffDetailView staffId={params.id} />;
}
