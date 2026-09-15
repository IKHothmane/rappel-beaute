import type {
  CreateGiftCardInput,
  CreatePromotionInput,
  GiftCardJournalItem,
  GiftCardKpis,
  GiftCardListItem,
  PromotionKpis,
  PromotionListItem,
  PromotionStatus,
} from "@/types/promo";
import {
  GIFT_CARD_STATUS_LABEL,
  GIFT_CARD_TXN_LABEL,
  PROMOTION_STATUS_LABEL,
  PROMOTION_TYPE_LABEL,
} from "@/types/promo";

const fetchOpts = { credentials: "include" as const, cache: "no-store" as const };

async function parseJson<T>(res: Response): Promise<T> {
  const data = await res.json();
  if (!res.ok) {
    throw new Error(
      typeof data === "object" && data && "error" in data
        ? String((data as { error: string }).error)
        : "Erreur réseau",
    );
  }
  return data as T;
}

export async function listPromotions(params?: {
  status?: string;
  search?: string;
  limit?: number;
}): Promise<{
  data: PromotionListItem[];
  kpis: PromotionKpis;
}> {
  const q = new URLSearchParams();
  if (params?.status) q.set("status", params.status);
  if (params?.search) q.set("search", params.search);
  if (params?.limit) q.set("limit", String(params.limit));
  const res = await fetch(`/api/promotions/?${q}`, fetchOpts);
  return parseJson(res);
}

export async function createPromotion(input: CreatePromotionInput) {
  const res = await fetch("/api/promotions/", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const data = await res.json();
  if (!res.ok) return { ok: false as const, error: data.error ?? "Erreur" };
  return { ok: true as const, promotion: data as PromotionListItem };
}

export async function setPromotionStatus(id: string, status: PromotionStatus) {
  const res = await fetch("/api/promotions/", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "setStatus", id, status }),
  });
  const data = await res.json();
  if (!res.ok) return { ok: false as const, error: data.error ?? "Erreur" };
  return { ok: true as const, promotion: data as PromotionListItem };
}

export async function listGiftCards(params?: {
  status?: string;
  search?: string;
  limit?: number;
}): Promise<{ data: GiftCardListItem[]; kpis: GiftCardKpis; journal: GiftCardJournalItem[] }> {
  const q = new URLSearchParams();
  if (params?.status) q.set("status", params.status);
  if (params?.search) q.set("search", params.search);
  q.set("limit", String(params?.limit ?? 200));
  const res = await fetch(`/api/gift-cards/?${q}`, fetchOpts);
  return parseJson(res);
}

export async function createGiftCard(input: CreateGiftCardInput) {
  const res = await fetch("/api/gift-cards/", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const data = await res.json();
  if (!res.ok) return { ok: false as const, error: data.error ?? "Erreur" };
  return { ok: true as const, card: data as GiftCardListItem };
}

export async function cancelGiftCard(id: string) {
  const res = await fetch("/api/gift-cards/", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "cancel", id }),
  });
  const data = await res.json();
  if (!res.ok) return { ok: false as const, error: data.error ?? "Erreur" };
  return { ok: true as const, card: data as GiftCardListItem };
}

export function formatMad(n: number): string {
  return `${n.toLocaleString("fr-MA", { maximumFractionDigits: 2 })} MAD`;
}

export {
  PROMOTION_TYPE_LABEL,
  PROMOTION_STATUS_LABEL,
  GIFT_CARD_STATUS_LABEL,
  GIFT_CARD_TXN_LABEL,
};
