"use client";

import { useId, useRef, useState, type FormEvent } from "react";
import { ChevronDown, Info, Star, UserRound } from "lucide-react";
import { LOYALTY_NAME_MAX_LENGTH, LOYALTY_PHONE_MAX_LENGTH, LOYALTY_COMMENT_MAX_LENGTH, validLoyaltyPhone } from "@/lib/loyalty/profile-input";
import { LoyaltyStaffPicker } from "@/components/loyalty/loyalty-staff-picker";

const FOCUS = "focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-[#A83E70]";
const PHONE_CONFLICT_MESSAGE = "Ce numéro est déjà connu de l’institut. Présentez votre carte à l’accueil pour la relier à votre fiche.";
const PHONE_CONFLICT_HELP = "Montrez simplement votre carte à l'accueil, l'équipe la reliera à votre fiche.";
const FIELD = `mt-1 h-12 w-full rounded-xl border border-[#E3C9D6] bg-white px-3 text-base font-normal text-[#43293A] ${FOCUS}`;

export function LoyaltyCardFeedback({
  token,
  organizationName,
  firstName,
  lastName,
  phone,
  onSaved,
  staffOptions = [],
  collectProfile = false,
}: {
  token: string;
  organizationName: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  onSaved?: () => void;
  staffOptions?: { id: string; name: string }[];
  collectProfile?: boolean;
}) {
  const [profileFirstName, setProfileFirstName] = useState(firstName);
  const [profileLastName, setProfileLastName] = useState(lastName);
  const [profilePhone, setProfilePhone] = useState(phone && !phone.startsWith("WL") ? phone : "");
  const [rating, setRating] = useState(0);
  const [staffRatings, setStaffRatings] = useState<Record<string, number>>({});
  const [comment, setComment] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [phoneInvalid, setPhoneInvalid] = useState(false);
  const [phoneConflict, setPhoneConflict] = useState<"profile" | "feedback" | null>(null);
  const [marketingConsent, setMarketingConsent] = useState(false);
  const phoneRef = useRef<HTMLInputElement>(null);
  const phoneErrorId = useId();
  const phoneConflictId = useId();
  const showConsent = collectProfile && profilePhone.trim().length > 0;

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    const profileOnly = (event.nativeEvent as SubmitEvent).submitter?.getAttribute("value") === "profile";
    if (profilePhone.trim() && !validLoyaltyPhone(profilePhone)) {
      setError("Le numéro de téléphone renseigné n’est pas valide.");
      setPhoneInvalid(true);
      setProfileOpen(true);
      requestAnimationFrame(() => phoneRef.current?.focus());
      return;
    }
    setBusy(true);
    setError(null);
    setPhoneInvalid(false);
    setPhoneConflict(null);
    try {
      const res = await fetch(profileOnly ? "/api/public/loyalty-card/profile/" : "/api/public/loyalty-card/feedback/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          firstName: profileFirstName,
          lastName: profileLastName,
          phone: profilePhone,
          ...(showConsent ? { marketingWhatsappConsent: marketingConsent } : {}),
          ...(rating > 0 ? { rating } : {}),
          comment,
          ...(Object.keys(staffRatings).length ? { staffRatings: Object.entries(staffRatings).map(([staffId, score]) => ({ staffId, ...(score > 0 ? { rating: score } : {}) })) } : {}),
        }),
      });
      const body = (await res.json()) as { error?: string; code?: string };
      if (res.status === 409 && body.code === "PHONE_ALREADY_KNOWN") {
        // Rien n'a été créé côté serveur : on garde la saisie (avis compris) et on guide la cliente vers l'accueil.
        setPhoneConflict(profileOnly ? "profile" : "feedback");
        setProfileOpen(true);
        requestAnimationFrame(() => phoneRef.current?.focus());
        return;
      }
      if (!res.ok) throw new Error(body.error || "Envoi impossible.");
      if (profileOnly) { window.location.reload(); return; }
      setDone(true);
      onSaved?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Envoi impossible.");
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <section role="status" className="rounded-2xl border border-[#F0DDE7] bg-white p-4 sm:p-5">
        <p className="text-center text-sm text-[#6B5763]">
          {profileFirstName ? `Merci ${profileFirstName}. ` : "Merci. "}
          {rating > 0 || comment.trim() || Object.keys(staffRatings).length > 0 ? `Votre avis est enregistré et sera lu par ${organizationName}.` : "Votre carte est prête."}
        </p>
        <button type="button" onClick={() => { setComment(""); setRating(0); setStaffRatings({}); setError(null); setDone(false); }} className={`mt-4 min-h-12 w-full rounded-xl border border-[#E7B9CD] bg-[#FFF8FB] px-4 text-sm font-semibold text-[#8F3360] transition hover:bg-[#FCE9F2] ${FOCUS}`}>
          Écrire un autre avis
        </button>
      </section>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {collectProfile ? (
        <section className="rounded-2xl border border-[#F0DDE7] bg-white p-4 sm:p-5">
          <details open={profileOpen} onToggle={(event) => setProfileOpen(event.currentTarget.open)}>
            <summary className={`flex min-h-12 cursor-pointer list-none items-center gap-3 rounded-xl [&::-webkit-details-marker]:hidden ${FOCUS}`}>
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#FCE9F2] text-[#A83E70]">
                <UserRound size={20} aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-base font-extrabold text-[#43293A]">Compléter mon profil</span>
                <span className="block text-sm text-[#6B5763]">Facultatif : pour que l’institut vous reconnaisse.</span>
              </span>
              <ChevronDown size={20} aria-hidden="true" className={`shrink-0 text-[#8F3360] transition-transform motion-reduce:transition-none ${profileOpen ? "rotate-180" : ""}`} />
            </summary>
            <fieldset disabled={busy} className="mt-4 min-w-0 space-y-3 rounded-xl bg-[#FFF8FB] p-3">
              <legend className="sr-only">Vos informations</legend>
              <p className="text-sm text-[#6B5763]">Ajoutez votre prénom et votre numéro, ou passez directement à votre avis. Vous pourrez le faire plus tard.</p>
              {[
                { label: "Prénom", value: profileFirstName, onChange: setProfileFirstName, autoComplete: "given-name", name: "firstName" },
                { label: "Nom", value: profileLastName, onChange: setProfileLastName, autoComplete: "family-name", name: "lastName" },
              ].map((field) => (
                <label key={field.name} className="block text-sm font-semibold text-[#43293A]">
                  {field.label}
                  <input name={field.name} value={field.value} onChange={(event) => field.onChange(event.target.value)} maxLength={LOYALTY_NAME_MAX_LENGTH} autoComplete={field.autoComplete} className={FIELD} />
                </label>
              ))}
              <label className="block text-sm font-semibold text-[#43293A]">
                Téléphone
                <input
                  ref={phoneRef}
                  name="phone"
                  value={profilePhone}
                  onChange={(event) => { setProfilePhone(event.target.value); setPhoneInvalid(false); setPhoneConflict(null); }}
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  maxLength={LOYALTY_PHONE_MAX_LENGTH}
                  aria-invalid={phoneInvalid || undefined}
                  aria-describedby={phoneInvalid ? phoneErrorId : phoneConflict ? phoneConflictId : undefined}
                  className={`${FIELD} ${phoneInvalid ? "!border-red-700" : phoneConflict ? "!border-[#C99016]" : ""}`}
                />
              </label>
              {phoneInvalid && error ? <p id={phoneErrorId} role="alert" className="text-sm font-semibold text-red-700">{error}</p> : null}
              {phoneConflict ? <PhoneConflictNote id={phoneConflictId} /> : null}
              {showConsent ? (
                <label className="flex min-h-12 cursor-pointer items-start gap-3 rounded-xl py-2 text-sm text-[#43293A]">
                  <input
                    type="checkbox"
                    name="marketingWhatsappConsent"
                    checked={marketingConsent}
                    onChange={(event) => setMarketingConsent(event.target.checked)}
                    className={`mt-0.5 h-6 w-6 shrink-0 cursor-pointer rounded accent-[#A83E70] ${FOCUS}`}
                  />
                  <span>J’accepte de recevoir des messages WhatsApp de {organizationName} (offres, rappels). Je peux me désinscrire à tout moment.</span>
                </label>
              ) : null}
              <button type="submit" name="action" value="profile" formNoValidate disabled={busy} className={`min-h-12 w-full rounded-xl border border-[#E7B9CD] bg-white px-3 text-sm font-semibold text-[#8F3360] transition hover:bg-[#FCE9F2] disabled:opacity-50 ${FOCUS}`}>{busy ? "Envoi…" : "Enregistrer mes coordonnées"}</button>
            </fieldset>
          </details>
        </section>
      ) : null}

      <section className="rounded-2xl border border-[#F0DDE7] bg-white p-4 sm:p-5">
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#8A4466]">Votre avis</p>
        <h2 className="mt-1 !font-extrabold !tracking-normal text-lg text-[#43293A]">Donnez votre avis</h2>
        <p className="mt-1 text-sm text-[#6B5763]">
          Laissez un avis pour {organizationName}. Tous les champs sont facultatifs.
        </p>
        <div className="mt-4 space-y-3">
          <label className="block text-sm font-semibold text-[#43293A]">
            Écrivez votre avis
            <textarea name="comment" value={comment} onChange={(event) => setComment(event.target.value)} maxLength={LOYALTY_COMMENT_MAX_LENGTH} rows={4} placeholder="Racontez votre expérience : accueil, prestation, équipe…" className={`mt-2 w-full rounded-xl border border-[#E3C9D6] px-3 py-2 text-base font-normal text-[#43293A] placeholder:text-[#8C7682] ${FOCUS}`} />
          </label>
          <StarRating label="Votre note pour l’institut" value={rating} onChange={setRating} disabled={busy} />
          {staffOptions.length > 0 ? (
            <div className="space-y-3 rounded-2xl border border-[#F0DDE7] bg-[#FFF8FB] p-3 sm:p-4">
              <LoyaltyStaffPicker options={staffOptions} value={Object.keys(staffRatings)} disabled={busy} onChange={(ids) => setStaffRatings((previous) => Object.fromEntries(ids.map((id) => [id, previous[id] ?? 0])))} />
              {staffOptions.filter((staff) => Object.hasOwn(staffRatings, staff.id)).map((staff) => (
                <div key={staff.id} className="rounded-xl border border-[#F0DDE7] bg-white p-3">
                  <StarRating label={`Votre note pour ${staff.name}`} value={staffRatings[staff.id]} onChange={(score) => setStaffRatings((previous) => ({ ...previous, [staff.id]: score }))} disabled={busy} />
                </div>
              ))}
            </div>
          ) : null}
          {phoneConflict === "feedback" && !collectProfile ? <PhoneConflictNote /> : null}
          {phoneConflict === "feedback" && collectProfile ? <p className="text-sm text-[#6B5763]">Votre avis n’a pas encore été envoyé et reste ici : voir le message dans « Compléter mon profil ».</p> : null}
          {error && !phoneInvalid ? <p role="alert" className="text-sm font-semibold text-red-700">{error}</p> : null}
          <button
            type="submit"
            disabled={busy}
            className="min-h-12 w-full rounded-xl bg-[#A83E70] text-sm font-semibold text-white transition hover:bg-[#8F3360] focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-[#3A2533] disabled:opacity-50"
          >
            {busy ? "Envoi…" : "Envoyer mon avis"}
          </button>
        </div>
      </section>
    </form>
  );
}

function PhoneConflictNote({ id }: { id?: string }) {
  return (
    <div id={id} role="status" className="flex items-start gap-3 rounded-xl border border-[#E8C56B] bg-[#FFFBEF] p-3 text-sm text-[#43293A]">
      <Info size={20} aria-hidden="true" className="mt-0.5 shrink-0 text-[#A67A00]" />
      <div className="min-w-0">
        <p className="font-semibold">{PHONE_CONFLICT_MESSAGE}</p>
        <p className="mt-1 text-[#6B5763]">{PHONE_CONFLICT_HELP}</p>
      </div>
    </div>
  );
}

function StarRating({ label, value, onChange, disabled }: { label: string; value: number; onChange: (value: number) => void; disabled: boolean }) {
  const name = useId();
  return (
    <fieldset disabled={disabled}>
      <legend className="text-sm font-semibold text-[#43293A]">{label}</legend>
      <div className="mt-2 flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => <label key={star} className="relative cursor-pointer">
          <input type="radio" name={name} value={star} checked={value === star} onChange={() => onChange(star)} className="peer sr-only" aria-label={`${star} étoile${star > 1 ? "s" : ""}`} />
          <span className="flex h-11 w-11 items-center justify-center rounded-full transition peer-focus-visible:ring-[3px] peer-focus-visible:ring-[#A83E70] peer-focus-visible:ring-offset-2 peer-disabled:opacity-50">
            <Star size={30} strokeWidth={1.5} aria-hidden className={value >= star ? "fill-[#E8B23A] text-[#C99016]" : "fill-transparent text-[#D9BFCB]"} />
          </span>
        </label>)}
        {value > 0 ? <span className="ml-1 text-sm font-semibold text-[#6B5763]">{value}/5</span> : null}
      </div>
    </fieldset>
  );
}
