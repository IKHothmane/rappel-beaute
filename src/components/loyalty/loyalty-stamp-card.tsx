import type { CSSProperties } from "react";
import { CalendarDays, Check, Gift, Sparkles } from "lucide-react";

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

/** Customer-facing loyalty journey: card, progress, reward, QR and optional appointments/packages. */
export function LoyaltyStampCard({
  organizationName,
  firstName,
  lastName,
  visits,
  cycle,
  visitsPerReward,
  remaining,
  rewardLabel,
  rewardsAvailable,
  rewards,
  qr,
  backgroundUrl,
  appointments,
  sessions,
}: Props) {
  const threshold = Math.max(1, Math.min(20, Math.floor(visitsPerReward || 10)));
  const progress = rewardsAvailable > 0 ? threshold : Math.min(threshold, Math.max(0, cycle));
  const percentage = Math.round((progress / threshold) * 100);
  const name = `${firstName} ${lastName}`.trim();
  const availableRewards = rewards.filter((reward) => reward.status === "AVAILABLE");
  const heroStyle: CSSProperties = backgroundUrl
    ? {
        backgroundImage: `linear-gradient(135deg, rgba(42, 18, 31, .86), rgba(135, 30, 75, .76)), url("${backgroundUrl}")`,
        backgroundPosition: "center",
        backgroundSize: "cover",
      }
    : { background: "linear-gradient(135deg, #301A28 0%, #5D2340 55%, #B8326B 100%)" };

  return (
    <div className="space-y-4">
      <section className="overflow-hidden rounded-3xl border border-[#F0DDE7] bg-white shadow-sm">
        <div className="p-4 sm:p-5">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#9A5273]">Ma fidélité</p>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-[#43293A] sm:text-3xl">
            {organizationName}
          </h1>
          <p className="mt-1 text-sm text-[#806B77]">Votre fidélité mérite une récompense.</p>
        </div>

        <div className="mx-4 mb-4 rounded-2xl p-5 text-white shadow-md sm:mx-5 sm:mb-5" style={heroStyle}>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/70">Carte de fidélité</p>
              <p className="mt-2 truncate text-xl font-extrabold">{name || firstName}</p>
              <p className="mt-1 text-sm text-white/70">{organizationName}</p>
            </div>
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/15 bg-white/10">
              <Sparkles size={20} aria-hidden="true" />
            </span>
          </div>
          <div className="mt-5 flex items-end justify-between gap-3">
            <div>
              <p className="text-3xl font-black tabular-nums">{progress}/{visitsPerReward}</p>
              <p className="mt-1 text-xs text-white/75">Passages pour votre récompense</p>
            </div>
            <p className="text-right text-xs font-semibold text-[#FFE1EC]">
              {rewardsAvailable > 0
                ? "Récompense disponible"
                : `${Math.max(0, remaining)} passage${remaining > 1 ? "s" : ""} restant${remaining > 1 ? "s" : ""}`}
            </p>
          </div>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/20" role="progressbar" aria-label="Progression fidélité" aria-valuemin={0} aria-valuemax={visitsPerReward} aria-valuenow={progress}>
            <div className="h-full rounded-full bg-[#FFC5DA] transition-all" style={{ width: `${percentage}%` }} />
          </div>
        </div>

        <div className="px-4 pb-4 sm:px-5 sm:pb-5">
          <div className="grid grid-cols-5 gap-2 sm:gap-3" aria-label={`${progress} passages validés sur ${visitsPerReward}`}>
            {Array.from({ length: threshold }, (_, index) => {
              const stamped = index < progress;
              return (
                <div
                  key={index}
                  className={`flex aspect-square items-center justify-center rounded-full border text-sm font-bold ${
                    stamped
                      ? "border-[#BD4E82] bg-[#BD4E82] text-white shadow-sm"
                      : "border-[#EAD9E2] bg-[#FBF5F8] text-[#BFA8B5]"
                  }`}
                  aria-label={`Passage ${index + 1}${stamped ? " validé" : " à valider"}`}
                >
                  {stamped ? <Check size={18} aria-hidden="true" /> : index + 1}
                </div>
              );
            })}
          </div>
          <div className="mt-4 flex items-center justify-between gap-3 text-sm">
            <span className="font-semibold text-[#43293A]">{visits} passage{visits > 1 ? "s" : ""} validé{visits > 1 ? "s" : ""} au total</span>
            <span className="text-[#806B77]">{percentage}% du cycle</span>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-[#F0DDE7] bg-white p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#FCE9F2] text-[#A83E70]">
            <Gift size={20} aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#9A5273]">Prochaine récompense</p>
            <h2 className="mt-1 text-lg font-extrabold text-[#43293A]">
              {rewardsAvailable > 0 ? "Votre récompense vous attend" : rewardLabel}
            </h2>
            <p className="mt-1 text-sm text-[#806B77]">
              {rewardsAvailable > 0
                ? "Présentez votre carte à l’institut pour faire confirmer son utilisation."
                : `Encore ${remaining} passage${remaining > 1 ? "s" : ""} avant de profiter de votre récompense.`}
            </p>
          </div>
        </div>
        {availableRewards.map((reward) => {
          const daysLeft = reward.expiresAt
            ? Math.max(0, Math.ceil((new Date(reward.expiresAt).getTime() - Date.now()) / 86_400_000))
            : null;
          return (
            <div key={reward.id} className="mt-3 rounded-xl bg-[#FFF4F8] p-3">
              <p className="font-bold text-[#43293A]">{reward.name}</p>
              {reward.value != null ? <p className="mt-1 text-sm text-[#806B77]">Valeur : {money(reward.value)}</p> : null}
              {daysLeft != null ? <p className="mt-1 text-xs text-[#806B77]">{daysLeft === 0 ? "Expire aujourd’hui" : `Expire dans ${daysLeft} jour${daysLeft > 1 ? "s" : ""}`}</p> : null}
            </div>
          );
        })}
      </section>

      <section className="rounded-2xl border border-[#F0DDE7] bg-white p-4 text-center sm:p-5">
        <h2 className="text-lg font-bold text-[#43293A]">Présenter ma carte à l’institut</h2>
        <p className="mt-1 text-sm text-[#806B77]">Montrez ce QR code à l’équipe pour retrouver votre carte et valider votre passage.</p>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={qr} alt="QR code personnel de la carte de fidélité" width={220} height={220} className="mx-auto mt-4 h-48 w-48 rounded-xl border border-[#F0DDE7] p-2" />
      </section>

      {appointments.length > 0 ? (
        <section className="rounded-2xl border border-[#F0DDE7] bg-white p-4 sm:p-5">
          <div className="flex items-center gap-2 text-[#43293A]"><CalendarDays size={18} aria-hidden="true" /><h2 className="font-bold">Mes prochains rendez-vous</h2></div>
          <ul className="mt-3 space-y-2">
            {appointments.map((appointment) => (
              <li key={`${appointment.at}-${appointment.service}`} className="rounded-xl bg-[#FBF5F8] px-3 py-2 text-sm">
                <p className="font-semibold text-[#43293A]">{appointment.service}</p>
                <p className="mt-1 text-[#806B77]">{dateTime(appointment.at)}{appointment.staff ? ` · ${appointment.staff}` : ""}</p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {sessions.length > 0 ? (
        <section className="rounded-2xl border border-[#F0DDE7] bg-white p-4 sm:p-5">
          <h2 className="font-bold text-[#43293A]">Mes forfaits</h2>
          <ul className="mt-3 space-y-2">
            {sessions.map((session) => (
              <li key={session.name} className="rounded-xl bg-[#FBF5F8] px-3 py-2 text-sm">
                <p className="font-semibold text-[#43293A]">{session.name}</p>
                <p className="mt-1 text-[#806B77]">{session.remaining} séance{session.remaining > 1 ? "s" : ""} restante{session.remaining > 1 ? "s" : ""} · {session.used}/{session.total}</p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
