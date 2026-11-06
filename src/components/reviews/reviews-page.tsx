"use client";

import { useCallback, useEffect, useState } from "react";
import {
  PublicReviewsModeration,
  type PublicReviewsInternalStats,
} from "@/components/reviews/public-reviews-moderation";
import { useToast } from "@/components/ui/toast";
import { getReviewsDashboard } from "@/modules/reviews/service";
import type { StaffReviewScore } from "@/types/review";

export function ReviewsPageView() {
  const { toast } = useToast();
  const [internal, setInternal] = useState<PublicReviewsInternalStats>({
    internalCount: 0,
    positiveCount: 0,
    averageScore: null,
    pendingRequests: 0,
  });
  const [staffScores, setStaffScores] = useState<StaffReviewScore[]>([]);

  const refresh = useCallback(async () => {
    try {
      const res = await getReviewsDashboard({ status: "ALL" });
      setInternal({
        internalCount: res.kpis.recordedCount,
        positiveCount: res.kpis.positiveCount,
        averageScore: res.kpis.averageScore,
        pendingRequests: res.kpis.pendingToSend + res.kpis.awaitingRecord,
      });
      setStaffScores(res.staffScores ?? []);
    } catch {
      toast("Impossible de charger les indicateurs internes.", "error");
    }
  }, [toast]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return (
    <PublicReviewsModeration internal={internal} staffScores={staffScores} />
  );
}
