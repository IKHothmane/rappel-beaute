
export type VisitCardRow = {
  id: string;
  customerId: string;
  customerName: string;
  phone: string | null;
  publicToken?: string;
  visits: number;
  visitsPerReward: number;
  createdAt: string;
  lastActivityAt?: string;
  cardCode?: string;
  promoCode?: string | null;
};

function displayPhone(phone: string | null) {
  if (!phone || phone.startsWith("WL")) return "Sans téléphone";
  return phone;
}

