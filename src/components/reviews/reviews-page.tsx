"use client";

import { useCallback, useEffect, useState } from "react";
import {
  PublicReviewsModeration,
  type PublicReviewsInternalStats,
} from "@/components/reviews/public-reviews-moderation";
import { useToast } from "@/components/ui/toast";
import { getReviewsDashboard } from "@/modules/reviews/service";

export function ReviewsPageView() {
  const { toast } = useToast();
  const [internal, setInternal] = useState<PublicReviewsInternalStats>({
    internalCount: 0,
    positiveCount: 0,
    averageScore: null,
    pendingRequests: 0,
  });

  const refresh = useCallback(async () => {
    try {
      const res = await getReviewsDashboard({ status: "ALL" });
      setInternal({
        internalCount: res.kpis.recordedCount,
        positiveCount: res.kpis.positiveCount,
        averageScore: res.kpis.averageScore,
        pendingRequests: res.kpis.pendingToSend + res.kpis.awaitingRecord,
      });
    } catch {
      toast("Impossible de charger les indicateurs internes.", "error");
    }
  }, [toast]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return (
    <PublicReviewsModeration
      internal={internal}
      onAskReview={() => {
        toast("Ouvrez une fiche cliente pour demander un avis WhatsApp.", "info");
      }}
    />
  );
}
