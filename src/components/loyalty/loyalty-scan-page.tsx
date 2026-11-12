"use client";


export type LoyaltyScanPreview = {
  token: string;
  customerId: string;
  customerName: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  appointmentId: string | null;
  serviceName: string | null;
  amount: number | null;
  visits: number;
  visitsPerReward: number;
  rewardLabel: string;
  card: {
    organizationName: string;
    firstName: string;
    lastName: string;
    visits: number;
    cycle: number;
    visitsPerReward: number;
    remaining: number;
    rewardLabel: string;
    rewardsAvailable: number;
    rewards: {
      id: string;
      name: string;
      status: string;
      earnedAt: string;
      expiresAt: string | null;
      value: number | null;
    }[];
    appointments: { at: string; service: string; staff: string }[];
    sessions: { name: string; used: number; total: number; remaining: number }[];
    cardBackgroundUrl: string | null;
  };
};

type Preview = LoyaltyScanPreview;

function extractToken(value: string) {
  const upper = value.toUpperCase();
  const card = upper.match(/RBLOY_[A-Z2-9]+/);
  if (card) return card[0];
  return upper.trim();
}

