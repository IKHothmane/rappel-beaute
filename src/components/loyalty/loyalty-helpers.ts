import type {
  LoyaltyAccountSummary,
  LoyaltyBirthdayItem,
  LoyaltyJournalItem,
  LoyaltyKpis,
  LoyaltyLevel,
  LoyaltyProgramConfig,
  LoyaltyRewardItem,
  LoyaltyTxnType,
} from "@/types/loyalty";
import { LOYALTY_LEVEL_LABEL, LOYALTY_TXN_LABEL } from "@/types/loyalty";

export const BIRTHDAY_BONUS_PTS = 200;

export type LoyaltyFilter = "all" | "VIP" | "GOLD" | "SILVER" | "BRONZE" | "ready";

export const EMPTY_LOYALTY_KPIS: LoyaltyKpis = {
  membersCount: 0,
  membersThisMonth: 0,
  pointsDistributed: 0,
  pointsRedeemed: 0,
  pointsActive: 0,
  rewardsUsed: 0,
  rewardsReady: 0,
  active30d: 0,
  memberRevenue: 0,
  memberAvgTicket: 0,
  activePackages: 0,
  levelCounts: { BRONZE: 0, SILVER: 0, GOLD: 0, VIP: 0 },
};

export function memberInitials(name: string) {
  const parts = name.trim().split(/\s+/);
  const a = parts[0]?.charAt(0) ?? "";
  const b = parts.length > 1 ? (parts[parts.length - 1]?.charAt(0) ?? "") : "";
  return `${a}${b}`.toUpperCase() || "?";
}

export function maskPhone(phone: string | null | undefined) {
  if (!phone) return "—";
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 6) return phone;
  const last = digits.slice(-3);
  const prefix = digits.startsWith("212") ? "+212" : digits.startsWith("0") ? "0" : "+";
  return `${prefix} ${digits.slice(-9, -6) || "***"}-***${last}`;
}

export function memberRef(name: string, customerId: string) {
  const token = name
    .replace(/[^A-Za-zÀ-ÿ]/g, "")
    .slice(0, 4)
    .toUpperCase()
    .padEnd(4, "X");
  return `LOY-${token}-${customerId.slice(-4).toUpperCase()}`;
}

export function firstNameOf(name: string) {
  return name.trim().split(/\s+/)[0] ?? name;
}

export function waMeHref(phone: string | null | undefined, firstName: string, text?: string) {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 8) return null;
  const intl = digits.startsWith("212") ? digits : digits.replace(/^0/, "212");
  const msg = encodeURIComponent(text ?? `Bonjour ${firstName} 👋`);
  return `https://wa.me/${intl}?text=${msg}`;
}

export function formatPts(n: number) {
  return `${n.toLocaleString("fr-MA")} pts`;
}

export function formatShortDate(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Africa/Casablanca",
  });
}

export function formatJournalStamp(iso: string) {
  return new Date(iso).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZone: "Africa/Casablanca",
  });
}

export function formatRelativeVisit(iso: string | null | undefined) {
  if (!iso) return "Aucune visite enregistrée";
  const day = new Date(iso).toLocaleDateString("en-CA", { timeZone: "Africa/Casablanca" });
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Africa/Casablanca" });
  const d0 = Date.parse(`${day}T00:00:00`);
  const d1 = Date.parse(`${today}T00:00:00`);
  const diff = Math.round((d1 - d0) / 86_400_000);
  if (diff === 0) return "Aujourd’hui";
  if (diff === 1) return "Hier";
  if (diff > 1 && diff < 30) return `Il y a ${diff} j`;
  return formatShortDate(iso);
}

export function txnLabel(type: LoyaltyTxnType) {
  return LOYALTY_TXN_LABEL[type] ?? type;
}

export function rewardTypeLabel(type: LoyaltyRewardItem["type"]) {
  if (type === "DISCOUNT_FIXED") return "Remise MAD";
  if (type === "DISCOUNT_PERCENT") return "Remise %";
  return "Soin offert";
}

export function rewardChip(reward: LoyaltyRewardItem) {
  if (reward.type === "DISCOUNT_FIXED" && reward.value != null) {
    return `-${reward.value.toLocaleString("fr-MA")} MAD`;
  }
  if (reward.type === "DISCOUNT_PERCENT" && reward.value != null) {
    return `-${reward.value} %`;
  }
  return reward.name;
}

export function cheapestActiveReward(rewards: LoyaltyRewardItem[]) {
  return rewards
    .filter((r) => r.active)
    .slice()
    .sort((a, b) => a.pointsCost - b.pointsCost)[0] ?? null;
}

export function readyReward(member: LoyaltyAccountSummary, rewards: LoyaltyRewardItem[]) {
  return (
    rewards
      .filter((r) => r.active && r.pointsCost <= member.balance)
      .sort((a, b) => a.pointsCost - b.pointsCost)[0] ?? null
  );
}

export function nextUnlock(member: LoyaltyAccountSummary, rewards: LoyaltyRewardItem[]) {
  return (
    rewards
      .filter((r) => r.active && r.pointsCost > member.balance)
      .sort((a, b) => a.pointsCost - b.pointsCost)[0] ?? null
  );
}

export function nextLevelTarget(
  lifetime: number,
  program: LoyaltyProgramConfig,
): { label: string | null; min: number; remaining: number; progress: number } {
  if (lifetime >= program.vipMin) {
    return { label: null, min: program.vipMin, remaining: 0, progress: 100 };
  }
  if (lifetime >= program.goldMin) {
    const span = Math.max(1, program.vipMin - program.goldMin);
    const done = lifetime - program.goldMin;
    return {
      label: LOYALTY_LEVEL_LABEL.VIP,
      min: program.vipMin,
      remaining: Math.max(0, program.vipMin - lifetime),
      progress: Math.min(100, Math.round((done / span) * 100)),
    };
  }
  if (lifetime >= program.silverMin) {
    const span = Math.max(1, program.goldMin - program.silverMin);
    const done = lifetime - program.silverMin;
    return {
      label: LOYALTY_LEVEL_LABEL.GOLD,
      min: program.goldMin,
      remaining: Math.max(0, program.goldMin - lifetime),
      progress: Math.min(100, Math.round((done / span) * 100)),
    };
  }
  const span = Math.max(1, program.silverMin - program.bronzeMin);
  const done = lifetime - program.bronzeMin;
  return {
    label: LOYALTY_LEVEL_LABEL.SILVER,
    min: program.silverMin,
    remaining: Math.max(0, program.silverMin - lifetime),
    progress: Math.min(100, Math.round((done / span) * 100)),
  };
}

export function levelRange(level: LoyaltyLevel, program: LoyaltyProgramConfig) {
  if (level === "BRONZE") return `${program.bronzeMin} – ${Math.max(0, program.silverMin - 1)} pts`;
  if (level === "SILVER") return `${program.silverMin} – ${Math.max(0, program.goldMin - 1)} pts`;
  if (level === "GOLD") return `${program.goldMin} – ${Math.max(0, program.vipMin - 1)} pts`;
  return `${program.vipMin}+ pts`;
}

export function filterMembers(
  ranking: LoyaltyAccountSummary[],
  tab: LoyaltyFilter,
  search: string,
  rewards: LoyaltyRewardItem[],
) {
  const q = search.trim().toLowerCase();
  const cheapest = cheapestActiveReward(rewards);
  return ranking.filter((m) => {
    if (tab === "VIP" || tab === "GOLD" || tab === "SILVER" || tab === "BRONZE") {
      if (m.level !== tab) return false;
    }
    if (tab === "ready") {
      if (!cheapest || m.balance < cheapest.pointsCost) return false;
    }
    if (!q) return true;
    return (
      m.customerName.toLowerCase().includes(q) ||
      (m.phone ?? "").toLowerCase().includes(q) ||
      m.customerId.toLowerCase().includes(q) ||
      memberRef(m.customerName, m.customerId).toLowerCase().includes(q)
    );
  });
}

export function birthdaysThisWeek(items: LoyaltyBirthdayItem[]) {
  const todayStr = new Date().toLocaleDateString("en-CA", { timeZone: "Africa/Casablanca" });
  const today = new Date(`${todayStr}T00:00:00`);
  const end = new Date(today);
  end.setDate(end.getDate() + 6);
  return items
    .map((item) => {
      const birth = new Date(item.birthDate);
      const month = birth.getUTCMonth();
      const day = birth.getUTCDate();
      const thisYear = new Date(today.getFullYear(), month, day);
      const diff = Math.round((thisYear.getTime() - today.getTime()) / 86_400_000);
      return { ...item, daysUntil: diff, occursOn: thisYear };
    })
    .filter((item) => item.daysUntil >= 0 && item.daysUntil <= 6)
    .sort((a, b) => a.daysUntil - b.daysUntil);
}

export function birthdayWhenLabel(daysUntil: number) {
  if (daysUntil === 0) return "Aujourd’hui";
  if (daysUntil === 1) return "Demain";
  return `J-${daysUntil}`;
}

export function posSimulation(member: LoyaltyAccountSummary, reward: LoyaltyRewardItem | null) {
  const base = member.lastServicePrice ?? 0;
  if (!reward || base <= 0) return null;
  let discount = 0;
  if (reward.type === "DISCOUNT_PERCENT" && reward.value != null) {
    discount = Math.round(base * (reward.value / 100) * 100) / 100;
  } else if (reward.type === "DISCOUNT_FIXED" && reward.value != null) {
    discount = Math.min(base, reward.value);
  } else if (reward.type === "FREE_SERVICE") {
    discount = base;
  }
  const net = Math.max(0, Math.round((base - discount) * 100) / 100);
  const debit = reward.pointsCost;
  const earn = Math.round(net);
  return {
    base,
    discount,
    net,
    debit,
    earn,
    newBalance: member.balance - debit + earn,
    serviceName: member.lastServiceName ?? "Dernier soin",
  };
}

export function loyaltyInsight(
  kpis: LoyaltyKpis | null,
  ranking: LoyaltyAccountSummary[],
  program: LoyaltyProgramConfig | null,
) {
  if (!kpis || !program) {
    return {
      headline: "Programme fidélité",
      body: "Les soldes et récompenses apparaîtront dès les premiers encaissements POS.",
      rec: "Créez une première récompense, puis relancez les clientes via WhatsApp.",
    };
  }
  const vipGold = kpis.levelCounts.GOLD + kpis.levelCounts.VIP;
  const share = kpis.membersCount > 0 ? Math.round((vipGold / kpis.membersCount) * 100) : 0;
  const nearGold = ranking.filter(
    (m) => m.level === "SILVER" && m.lifetimePoints >= program.goldMin - 150 && m.lifetimePoints < program.goldMin,
  ).length;
  return {
    headline: "Lecture des comptes fidélité",
    body:
      kpis.membersCount === 0
        ? "Aucun compte fidélité actif pour l’instant."
        : `${kpis.membersCount} cliente${kpis.membersCount > 1 ? "s" : ""} au programme. Gold + VIP : ${vipGold} (${share} %). ${kpis.rewardsReady} solde${kpis.rewardsReady > 1 ? "s" : ""} suffisant${kpis.rewardsReady > 1 ? "s" : ""} pour une récompense.`,
    rec:
      nearGold > 0
        ? `Relancer les ${nearGold} cliente${nearGold > 1 ? "s" : ""} Silver à moins de 150 pts de Gold — via WhatsApp ou la fiche cliente.`
        : kpis.rewardsReady > 0
          ? `${kpis.rewardsReady} coupon${kpis.rewardsReady > 1 ? "s" : ""} prêt${kpis.rewardsReady > 1 ? "s" : ""} : proposer l’utilisation au prochain passage POS.`
          : "Le ratio MAD / point se règle dans Configurer le programme.",
  };
}

export function exportLoyaltyCsv(rows: LoyaltyAccountSummary[]) {
  const header = ["Cliente", "Téléphone", "Palier", "Solde", "Cumul", "Dernière visite", "Réf."];
  const lines = rows.map((m) =>
    [
      m.customerName,
      m.phone ?? "",
      LOYALTY_LEVEL_LABEL[m.level] ?? m.level,
      String(m.balance),
      String(m.lifetimePoints),
      m.lastVisitAt ?? "",
      memberRef(m.customerName, m.customerId),
    ]
      .map((v) => `"${String(v).replace(/"/g, '""')}"`)
      .join(";"),
  );
  const blob = new Blob([[header.join(";"), ...lines].join("\n")], {
    type: "text/csv;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `fidelite-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function journalKind(row: LoyaltyJournalItem) {
  if (row.reason) return row.reason;
  if (row.paymentId) return `Encaissement ${row.paymentId.slice(-6)}`;
  return txnLabel(row.type);
}

export { LOYALTY_LEVEL_LABEL };
