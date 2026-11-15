"use client";

import type { ReactNode } from "react";
import { AlertTriangle, ArrowRight, Info } from "lucide-react";
import { visitCycle } from "@/lib/loyalty/card-code";
import { cn } from "@/lib/utils";
import { LOYALTY_LEVEL_LABEL } from "@/types/loyalty";
import type { LoyaltyMergePreview, LoyaltyMergeSide } from "@/modules/loyalty/service";

const MOVED_LABELS: Record<string, string> = {
  Appointment: "Rendez-vous",
  Payment: "Paiements",
  Invoice: "Factures",
  PosSale: "Ventes",
  CustomerNote: "Notes",
  Package: "Forfaits",
  LoyaltyEvent: "Passages",
  LoyaltyVisitReward: "Récompenses",
  GoogleWalletMessage: "Messages Wallet",
  PromotionUsage: "Promotions utilisées",
  WhatsAppTask: "Tâches WhatsApp",
  ReactivationSnooze: "Relances reportées",
  WaitingListEntry: "Liste d’attente",
  ReviewRequest: "Demandes d’avis",
  Review: "Avis",
  CustomerPushDelivery: "Notifications envoyées",
  AssistantCustomerSession: "Sessions assistant",
  AssistantAction: "Actions assistant",
  "GiftCard.buyer": "Cartes cadeaux achetées",
  "GiftCard.beneficiary": "Cartes cadeaux reçues",
  LoyaltyTransaction: "Mouvements de points",
  Promotion: "Promotions",
  LoyaltyRedemption: "Récompenses utilisées",
};

const STAYING_LABELS: Record<string, string> = {
  NotificationPreference: "Préférences de notification",
  CampaignRecipient: "Destinataires de campagne",
  PushAccessGrant: "Autorisations de notification",
  LoyaltyAccount: "Compte de points",
  LoyaltyCard: "Carte de fidélité",
};

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: "Active",
  ARCHIVED: "Archivée",
  VIP: "VIP",
  INACTIVE: "Inactive",
  PROSPECT: "Prospect",
};

const CARD_MODE_TEXT: Record<LoyaltyMergePreview["result"]["cardMode"], string> = {
  ALIAS: "La carte de la fiche anonyme reste utilisable : son QR et son code mènent à la fiche existante.",
  ATTACHED: "La carte de la fiche anonyme est rattachée à la fiche existante, qui n’en avait pas.",
  NONE: "Aucune carte n’est rattachée par cette fusion.",
};

function formatDate(iso: string | null | undefined) {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric", timeZone: "Africa/Casablanca" });
}

function formatMoney(value: number | string) {
  const n = Number(value);
  return `${(Number.isFinite(n) ? n : 0).toLocaleString("fr-FR")} MAD`;
}

function plural(n: number, one: string, many: string) {
  return `${n.toLocaleString("fr-FR")} ${n > 1 ? many : one}`;
}

function fullName(side: { firstName: string; lastName: string }) {
  return `${side.firstName} ${side.lastName}`.trim() || "Sans nom";
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-[#F4EDF0] py-2 last:border-b-0">
      <dt className="shrink-0 text-xs font-semibold text-[#765E6B]">{label}</dt>
      <dd className="min-w-0 break-words text-right text-sm font-semibold text-[#30202C]">{children}</dd>
    </div>
  );
}

function SideCard({
  title,
  badge,
  tone,
  children,
  headingId,
}: {
  title: string;
  badge: string;
  tone: "keep" | "absorb";
  children: ReactNode;
  headingId: string;
}) {
  return (
    <section
      aria-labelledby={headingId}
      className={cn(
        "min-w-0 rounded-2xl border p-4",
        tone === "keep" ? "border-[#CFE9DB] bg-[#F6FCF9]" : "border-[#F0DDE6] bg-[#FFF9FB]",
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 id={headingId} className="text-sm font-bold text-[#30202C]">
          {title}
        </h3>
        <span
          className={cn(
            "rounded-full px-2.5 py-1 text-[11px] font-bold",
            tone === "keep" ? "bg-emerald-100 text-emerald-800" : "bg-[#FCE9F4] text-[#981C52]",
          )}
        >
          {badge}
        </span>
      </div>
      <dl className="mt-2">{children}</dl>
    </section>
  );
}

function cycleText(visits: number, perReward: number) {
  return perReward > 0 ? `${visitCycle(visits, perReward)} / ${perReward} dans le cycle` : "—";
}

function TargetRows({ side, perReward }: { side: LoyaltyMergeSide; perReward: number }) {
  const level = side.level ? (LOYALTY_LEVEL_LABEL as Record<string, string>)[side.level] ?? side.level : null;
  return (
    <>
      <Row label="Nom">{fullName(side)}</Row>
      <Row label="Téléphone">{side.phone}</Row>
      <Row label="E-mail">{side.email || "—"}</Row>
      <Row label="Statut">
        {side.archived ? "Archivée" : STATUS_LABELS[side.status] ?? side.status}
      </Row>
      <Row label="Créée le">{formatDate(side.createdAt)}</Row>
      <Row label="Rendez-vous">
        {plural(side.appointmentsCount, "rendez-vous", "rendez-vous")}
        {side.lastAppointmentAt ? ` · dernier le ${formatDate(side.lastAppointmentAt)}` : ""}
      </Row>
      <Row label="Ventes">
        {plural(side.salesCount, "vente", "ventes")} · {formatMoney(side.salesTotal)}
      </Row>
      <Row label="Passages">
        {plural(side.visits, "passage", "passages")} · {cycleText(side.visits, perReward)}
      </Row>
      <Row label="Récompenses disponibles">{side.rewardsAvailable}</Row>
      <Row label="Forfaits actifs">{side.activePackages}</Row>
      <Row label="Points">
        {side.balance.toLocaleString("fr-FR")} pts{level ? ` · ${level}` : ""}
      </Row>
      <Row label="Cartes">
        {plural(side.cardsCount, "carte", "cartes")}
        {side.cardCode ? ` · code ${side.cardCode}` : ""}
      </Row>
      <Row label="Passe Wallet installé">{side.walletInstalled ? "Oui" : "Non"}</Row>
    </>
  );
}

function SourceRows({ side, createdAt, perReward }: { side: LoyaltyMergePreview["source"]; createdAt: string; perReward: number }) {
  return (
    <>
      <Row label="Code carte">{side.cardCode ?? "—"}</Row>
      <Row label="Créée le">{formatDate(createdAt)}</Row>
      <Row label="Passages">
        {plural(side.visits, "passage", "passages")} · {cycleText(side.visits, perReward)}
      </Row>
      <Row label="Récompenses disponibles">{side.rewardsAvailable}</Row>
      <Row label="Rendez-vous">{side.appointmentsCount}</Row>
      <Row label="Notes">{side.notesCount}</Row>
      <Row label="Passe Wallet installé">{side.walletInstalled ? "Oui" : "Non"}</Row>
    </>
  );
}

export function LoyaltyMergeSummary({ preview }: { preview: LoyaltyMergePreview }) {
  const { source, target, result, alerts } = preview;
  const moved = Object.entries(result.moved).filter(([, n]) => n > 0);
  const cumulativeText = result.cumulativeReward
    ? "Oui : le cumul franchit un palier, une récompense est créée."
    : result.cumulativeRewardReason === "STACK_BLOCKED"
      ? "Non : une récompense est déjà disponible (cumul désactivé)."
      : result.cumulativeRewardReason === "PROGRAM_INACTIVE"
        ? "Non : le programme est inactif."
        : "Non";

  return (
    <div className="space-y-4">
      {alerts.length > 0 ? (
        <section aria-labelledby="merge-alerts-title" className="rounded-2xl border border-amber-300 bg-amber-50 p-4">
          <h3 id="merge-alerts-title" className="flex items-center gap-2 text-sm font-bold text-amber-900">
            <AlertTriangle size={18} aria-hidden className="shrink-0" />
            À vérifier avant de fusionner
          </h3>
          <ul className="mt-2 space-y-1.5 text-sm text-amber-900">
            {alerts.map((alert) => (
              <li key={alert.code} className="flex gap-2">
                <span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-600" />
                <span className="min-w-0 break-words">{alert.message}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2">
        <SideCard headingId="merge-target-title" title="Fiche existante" badge="Conservée" tone="keep">
          <TargetRows side={target} perReward={result.visitsPerReward} />
        </SideCard>
        <SideCard headingId="merge-source-title" title="Fiche anonyme" badge="Absorbée" tone="absorb">
          <SourceRows side={source} createdAt={source.cardCreatedAt ?? source.createdAt} perReward={result.visitsPerReward} />
        </SideCard>
      </div>

      <section aria-labelledby="merge-result-title" className="rounded-2xl border border-[#E7B9CD] bg-[#FFF1F7] p-4">
        <h3 id="merge-result-title" className="flex items-center gap-2 text-sm font-bold text-[#981C52]">
          <ArrowRight size={18} aria-hidden className="shrink-0" />
          Après la fusion
        </h3>
        <dl className="mt-2">
          <Row label="Passages cumulés">
            {plural(result.totalVisits, "passage", "passages")} · {cycleText(result.totalVisits, result.visitsPerReward)}
          </Row>
          <Row label="Récompense créée par le cumul">{cumulativeText}</Row>
          <Row label="Points transférés">{result.pointsTransferred.toLocaleString("fr-FR")} pts</Row>
          <Row label="Carte">{CARD_MODE_TEXT[result.cardMode]}</Row>
        </dl>

        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div className="min-w-0">
            <h4 className="text-xs font-bold uppercase tracking-wide text-[#765E6B]">Éléments déplacés</h4>
            {moved.length === 0 ? (
              <p className="mt-1 text-sm text-[#654254]">Aucun élément à déplacer.</p>
            ) : (
              <ul className="mt-1 space-y-1 text-sm text-[#30202C]">
                {moved.map(([key, count]) => (
                  <li key={key} className="flex justify-between gap-3">
                    <span className="min-w-0 break-words">{MOVED_LABELS[key] ?? key}</span>
                    <span className="font-semibold">{count}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="min-w-0">
            <h4 className="text-xs font-bold uppercase tracking-wide text-[#765E6B]">Reste sur la fiche absorbée</h4>
            {result.staying.length === 0 ? (
              <p className="mt-1 text-sm text-[#654254]">Rien.</p>
            ) : (
              <ul className="mt-1 space-y-1.5 text-sm text-[#30202C]">
                {result.staying.map((item) => (
                  <li key={item.item} className="min-w-0">
                    <span className="font-semibold">
                      {STAYING_LABELS[item.item] ?? item.item}
                      {item.count > 1 ? ` (${item.count})` : ""}
                    </span>
                    <span className="block break-words text-xs text-[#654254]">{item.reason}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
        <p className="mt-3 flex gap-2 text-xs text-[#654254]">
          <Info size={14} aria-hidden className="mt-0.5 shrink-0" />
          <span>Cette action ne peut pas être annulée depuis cet écran : vérifiez bien l’identité avant de fusionner.</span>
        </p>
      </section>
    </div>
  );
}
