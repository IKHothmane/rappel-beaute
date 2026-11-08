"use client";

import { useId, useState, type FormEvent } from "react";
import { Star } from "lucide-react";
import { LOYALTY_NAME_MAX_LENGTH, LOYALTY_PHONE_MAX_LENGTH, LOYALTY_COMMENT_MAX_LENGTH, validLoyaltyPhone } from "@/lib/loyalty/profile-input";
import { LoyaltyStaffPicker } from "@/components/loyalty/loyalty-staff-picker";

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

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    const profileOnly = (event.nativeEvent as SubmitEvent).submitter?.getAttribute("value") === "profile";
    if (profilePhone.trim() && !validLoyaltyPhone(profilePhone)) {
      setError("Le numéro de téléphone renseigné n’est pas valide.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(profileOnly ? "/api/public/loyalty-card/profile/" : "/api/public/loyalty-card/feedback/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          firstName: profileFirstName,
          lastName: profileLastName,
          phone: profilePhone,
          ...(rating > 0 ? { rating } : {}),
          comment,
          ...(Object.keys(staffRatings).length ? { staffRatings: Object.entries(staffRatings).map(([staffId, score]) => ({ staffId, ...(score > 0 ? { rating: score } : {}) })) } : {}),
        }),
      });
      const body = (await res.json()) as { error?: string };
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
      <section className="rounded-2xl border border-[#F0DDE7] bg-white p-4 sm:p-5">
        <p className="text-center text-sm text-[#806B77]">
          {profileFirstName ? `Merci ${profileFirstName}. ` : "Merci. "}
          {rating > 0 || comment.trim() || Object.keys(staffRatings).length > 0 ? `Votre avis est enregistré et sera lu par ${organizationName}.` : "Votre carte est prête."}
        </p>
        <button type="button" onClick={() => { setComment(""); setRating(0); setStaffRatings({}); setError(null); setDone(false); }} className="mt-4 min-h-11 w-full rounded-xl border border-[#E7B9CD] bg-[#FFF8FB] px-4 text-sm font-semibold text-[#A83E70] transition hover:bg-[#FCE9F2]">
          Écrire un autre avis
        </button>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-[#F0DDE7] bg-white p-4 sm:p-5">
      <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#9A5273]">Votre avis</p>
      <h2 className="mt-1 text-lg font-extrabold text-[#43293A]">Donnez votre avis</h2>
      <p className="mt-1 text-sm text-[#806B77]">
        Laissez un avis pour {organizationName}. Tous les champs sont facultatifs.
      </p>
      <form onSubmit={onSubmit} className="mt-4 space-y-3">
        {collectProfile ? (
          <fieldset disabled={busy} className="space-y-3 rounded-xl bg-[#FFF8FB] p-3">
            <legend className="text-sm font-semibold text-[#43293A]">Vos informations</legend>
            <p className="text-xs text-[#806B77]">Vous pouvez compléter vos coordonnées ou envoyer votre avis directement.</p>
            {[
              { label: "Prénom", value: profileFirstName, onChange: setProfileFirstName, autoComplete: "given-name" },
              { label: "Nom", value: profileLastName, onChange: setProfileLastName, autoComplete: "family-name" },
            ].map((field) => <label key={field.label} className="block text-sm font-semibold text-[#43293A]">{field.label}<input value={field.value} onChange={(event) => field.onChange(event.target.value)} maxLength={LOYALTY_NAME_MAX_LENGTH} autoComplete={field.autoComplete} className="mt-1 h-11 w-full rounded-xl border border-[#F0DDE7] bg-white px-3 font-normal" /></label>)}
            <label className="block text-sm font-semibold text-[#43293A]">Téléphone<input value={profilePhone} onChange={(event) => setProfilePhone(event.target.value)} type="tel" autoComplete="tel" maxLength={LOYALTY_PHONE_MAX_LENGTH} className="mt-1 h-11 w-full rounded-xl border border-[#F0DDE7] bg-white px-3 font-normal" /></label>
            <button type="submit" name="action" value="profile" formNoValidate disabled={busy} className="min-h-11 w-full rounded-xl border border-[#E7B9CD] bg-white px-3 text-sm font-semibold text-[#A83E70] disabled:opacity-50">Enregistrer ma carte sans avis</button>
          </fieldset>
        ) : null}
        <label className="block text-sm font-semibold text-[#43293A]">
          Écrivez votre avis
          <textarea value={comment} onChange={(event) => setComment(event.target.value)} maxLength={LOYALTY_COMMENT_MAX_LENGTH} rows={4} placeholder="Racontez votre expérience : accueil, prestation, équipe…" className="mt-2 w-full rounded-xl border border-[#F0DDE7] px-3 py-2 text-sm font-normal outline-none focus:border-[#A83E70]" />
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
        {error ? <p role="alert" className="text-sm text-red-700">{error}</p> : null}
        <button
          type="submit"
          disabled={busy}
          className="h-11 w-full rounded-xl bg-[#A83E70] text-sm font-semibold text-white disabled:opacity-50"
        >
          {busy ? "Envoi…" : "Envoyer mon avis"}
        </button>
      </form>
    </section>
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
          <span className="flex h-11 w-11 items-center justify-center rounded-full transition peer-focus-visible:ring-2 peer-focus-visible:ring-[#A83E70] peer-disabled:opacity-50">
            <Star size={30} strokeWidth={1.5} aria-hidden className={value >= star ? "fill-[#E8B23A] text-[#C99016]" : "fill-transparent text-[#D9BFCB]"} />
          </span>
        </label>)}
        {value > 0 ? <span className="ml-1 text-sm font-semibold text-[#806B77]">{value}/5</span> : null}
      </div>
    </fieldset>
  );
}
