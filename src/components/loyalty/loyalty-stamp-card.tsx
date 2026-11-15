import { CalendarDays, Gift } from "lucide-react";
import { LoyaltyCustomerCard } from "@/components/loyalty/loyalty-customer-card";

type Appointment = { at: string; service: string; staff: string };
type Session = { name: string; used: number; total: number; remaining: number };
type Reward = {
  id: string;
  name: string;
  status: string;
  earnedAt: string;
  expiresAt: string | null;
  value: number | null;
};

type Props = {
  organizationName: string;
  firstName: string;
  lastName: string;
  visits: number;
  cycle: number;
  visitsPerReward: number;
  remaining: number;
  rewardLabel: string;
  rewardsAvailable: number;
  rewards: Reward[];
  qr: string;
  backgroundUrl?: string | null;
  backgroundColor?: string | null;
  programName?: string | null;
  phone?: string | null;
  code?: string | null;
  appointments: Appointment[];
  sessions: Session[];
};

function money(amount: number) {
  return `${amount.toLocaleString("fr-FR")} DH`;
}

function dateTime(iso: string) {
  return new Date(iso).toLocaleString("fr-FR", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const SECTION = "rounded-2xl border border-[#F0DDE7] bg-white p-4 sm:p-5";
const TITLE = "!font-extrabold !tracking-normal text-[length:var(--vt-text-1p125rem)]/[var(--vt-line-1p75rem)] text-[#43293A]";

/** Customer-facing loyalty journey: card, progress, reward, QR and optional appointments/packages. */
export function LoyaltyStampCard({
  organizationName,
  firstName,
  lastName,
  cycle,
  visitsPerReward,
  remaining,
  rewardLabel,
  rewardsAvailable,
  rewards,
  qr,
  backgroundUrl,
  backgroundColor,
  programName,
  phone,
  code,
  appointments,
  sessions,
}: Props) {
  const threshold = Math.max(1, Math.min(20, Math.floor(visitsPerReward || 5)));
  const progress = rewardsAvailable > 0 ? threshold : Math.min(threshold, Math.max(0, cycle));
  const name = `${firstName} ${lastName}`.trim();
  const availableRewards = rewards.filter((reward) => reward.status === "AVAILABLE");

  return (
    <div className="space-y-4">
      <LoyaltyCustomerCard
        organizationName={organizationName}
        programName={programName}
        backgroundUrl={backgroundUrl}
        backgroundColor={backgroundColor}
        progress={progress}
        threshold={threshold}
        remaining={remaining}
        rewardLabel={rewardLabel}
        rewardsAvailable={rewardsAvailable}
        qr={qr}
        code={code}
        holderName={name || firstName}
        holderSubtitle={phone && !phone.startsWith("WL") ? phone : "Carte personnelle"}
      />

      {availableRewards.length > 0 ? (
        <section className="rounded-2xl border-2 border-[#E8C56B] bg-[#FFFBEF] p-4 sm:p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#FCE9F2] text-[#A83E70]">
              <Gift size={20} aria-hidden="true" />
            </div>
            <h2 className={TITLE}>
              {availableRewards.length > 1 ? "Vos récompenses vous attendent" : "Votre récompense vous attend"}
            </h2>
          </div>
          <ul className="mt-3 space-y-2">
            {availableRewards.map((reward) => {
              const daysLeft = reward.expiresAt
                ? Math.max(0, Math.ceil((new Date(reward.expiresAt).getTime() - Date.now()) / 86_400_000))
                : null;
              return (
                <li key={reward.id} className="rounded-xl bg-white p-3">
                  <p className="font-bold text-[#43293A] [overflow-wrap:anywhere]">{reward.name}</p>
                  {reward.value != null ? <p className="mt-1 text-sm text-[#6B5763]">Valeur : {money(reward.value)}</p> : null}
                  {daysLeft != null ? (
                    <p className="mt-1 text-sm font-semibold text-[#8F3360]">
                      {daysLeft === 0 ? "Expire aujourd’hui" : `Expire dans ${daysLeft} jour${daysLeft > 1 ? "s" : ""}`}
                    </p>
                  ) : null}
                </li>
              );
            })}
          </ul>
          <p className="mt-3 text-sm text-[#6B5763]">Présentez votre QR à l’institut pour faire confirmer son utilisation.</p>
        </section>
      ) : null}

      {appointments.length > 0 ? (
        <section className={SECTION}>
          <div className="flex items-center gap-2 text-[#43293A]"><CalendarDays size={18} aria-hidden="true" /><h2 className={TITLE}>Mes prochains rendez-vous</h2></div>
          <ul className="mt-3 space-y-2">
            {appointments.map((appointment) => (
              <li key={`${appointment.at}-${appointment.service}`} className="rounded-xl bg-[#FBF5F8] px-3 py-2 text-sm">
                <p className="font-semibold text-[#43293A] [overflow-wrap:anywhere]">{appointment.service}</p>
                <p className="mt-1 text-[#6B5763]">{dateTime(appointment.at)}{appointment.staff ? ` · ${appointment.staff}` : ""}</p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {sessions.length > 0 ? (
        <section className={SECTION}>
          <h2 className={TITLE}>Mes forfaits</h2>
          <ul className="mt-3 space-y-2">
            {sessions.map((session) => (
              <li key={session.name} className="rounded-xl bg-[#FBF5F8] px-3 py-2 text-sm">
                <p className="font-semibold text-[#43293A] [overflow-wrap:anywhere]">{session.name}</p>
                <p className="mt-1 text-[#6B5763]">{session.remaining} séance{session.remaining > 1 ? "s" : ""} restante{session.remaining > 1 ? "s" : ""} · {session.used}/{session.total}</p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
