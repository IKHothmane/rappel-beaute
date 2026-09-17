"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { slugifyLabel } from "@/lib/booking-qr";
import {
  formatDuration,
  formatMad,
  getPublicAvailableDates,
  getPublicOrganization,
  getPublicServices,
  getPublicSlots,
  getPublicStaff,
  submitPublicBooking,
} from "@/modules/public-booking/service";
import type {
  PublicBookingResult,
  PublicOrganizationProfile,
  PublicServiceItem,
  PublicStaffItem,
} from "@/types/public-booking";

type Step = "service" | "staff" | "date" | "slot" | "info" | "confirm" | "done";

type Props = {
  slug: string;
  initialServiceRef?: string | null;
  initialStaffRef?: string | null;
  attributionSource?: string | null;
};

function matchService(services: PublicServiceItem[], ref: string | null | undefined) {
  if (!ref?.trim()) return null;
  const needle = ref.trim().toLowerCase();
  return (
    services.find((s) => s.id.toLowerCase() === needle) ??
    services.find((s) => slugifyLabel(s.name) === needle) ??
    null
  );
}

function matchStaff(staff: PublicStaffItem[], ref: string | null | undefined) {
  if (!ref?.trim()) return null;
  const needle = ref.trim().toLowerCase();
  return (
    staff.find((s) => s.id.toLowerCase() === needle) ??
    staff.find((s) => slugifyLabel(s.displayName.split(" ")[0] ?? "") === needle) ??
    staff.find((s) => slugifyLabel(s.displayName) === needle) ??
    null
  );
}

export function BookingPageView({
  slug,
  initialServiceRef,
  initialStaffRef,
  attributionSource,
}: Props) {
  const router = useRouter();
  const viewTracked = useRef(false);
  const qrPrefillDone = useRef(false);

  const [step, setStep] = useState<Step>("service");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [org, setOrg] = useState<PublicOrganizationProfile | null>(null);
  const [services, setServices] = useState<PublicServiceItem[]>([]);
  const [staff, setStaff] = useState<PublicStaffItem[]>([]);
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [slots, setSlots] = useState<{ time: string; available: boolean }[]>([]);
  const [result, setResult] = useState<PublicBookingResult | null>(null);

  const [serviceId, setServiceId] = useState("");
  const [staffId, setStaffId] = useState<string | null>("any");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [marketingOptIn, setMarketingOptIn] = useState(false);

  const selectedService = useMemo(
    () => services.find((s) => s.id === serviceId),
    [services, serviceId],
  );

  const refreshBase = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [o, s] = await Promise.all([
        getPublicOrganization(slug),
        getPublicServices(slug),
      ]);
      setOrg(o);
      setServices(s);
    } catch {
      setError("Institut introuvable ou indisponible.");
      setOrg(null);
      setServices([]);
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    void refreshBase();
  }, [refreshBase]);

  useEffect(() => {
    if (!org || viewTracked.current) return;
    if (attributionSource !== "qr") return;
    viewTracked.current = true;
    void fetch(`/api/public/${encodeURIComponent(slug)}/events/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        eventType: "VIEW",
        source: "qr",
        service: initialServiceRef || undefined,
        staff: initialStaffRef || undefined,
      }),
    }).catch(() => undefined);
  }, [org, slug, attributionSource, initialServiceRef, initialStaffRef]);

  useEffect(() => {
    if (!services.length || qrPrefillDone.current) return;
    qrPrefillDone.current = true;
    const matched = matchService(services, initialServiceRef);
    if (matched) {
      setServiceId(matched.id);
      setStep("staff");
      return;
    }
    if (initialServiceRef) {
      setError("Ce service n’est plus disponible. Choisissez une autre prestation.");
    }
  }, [services, initialServiceRef]);

  useEffect(() => {
    if (!serviceId) return;
    getPublicStaff(slug, serviceId, date || undefined)
      .then((list) => {
        setStaff(list);
        if (initialStaffRef && staffId === "any") {
          const hit = matchStaff(list, initialStaffRef);
          if (hit?.available) {
            setStaffId(hit.id);
            setStep("date");
          }
        }
      })
      .catch(() => setStaff([]));
  }, [slug, serviceId, date, initialStaffRef, staffId]);

  useEffect(() => {
    if (!serviceId || !date) return;
    const from = date.slice(0, 8) + "01";
    const d = new Date(`${date}T12:00:00+01:00`);
    const last = new Date(d.getFullYear(), d.getMonth() + 1, 0);
    const to = last.toISOString().slice(0, 10);
    getPublicAvailableDates(slug, {
      serviceId,
      from,
      to,
      staffId: staffId === "any" ? null : staffId,
    })
      .then(setAvailableDates)
      .catch(() => setAvailableDates([]));
  }, [slug, serviceId, staffId, date]);

  useEffect(() => {
    if (!serviceId || !date) return;
    getPublicSlots(slug, {
      serviceId,
      date,
      staffId: staffId === "any" ? null : staffId,
    })
      .then(setSlots)
      .catch(() => setSlots([]));
  }, [slug, serviceId, date, staffId]);

  async function handleConfirm() {
    if (!selectedService || !date || !time) return;
    setSubmitting(true);
    setError(null);
    try {
      const booking = await submitPublicBooking(slug, {
        serviceId,
        staffId: staffId === "any" ? null : staffId,
        date,
        time,
        customer: {
          firstName,
          lastName,
          phone,
          email: email || null,
          marketingOptIn,
        },
        notes: notes || null,
        attributionSource: attributionSource?.trim() || null,
      });
      setResult(booking);
      setStep("done");
      router.replace(`/book/${slug}/confirmation/?id=${booking.appointmentId}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur lors de la réservation.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading && !org) {
    return <p className="py-16 text-center text-sm text-ink/50">Chargement…</p>;
  }

  if (!org) {
    return (
      <p className="py-16 text-center text-sm text-ink/60">
        {error ?? "Institut introuvable."}
      </p>
    );
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-8 sm:px-6">
      <p className="text-[11px] font-bold uppercase tracking-wider text-primary">
        Réservation
      </p>
      <h1 className="mt-1 font-serif text-2xl font-semibold sm:text-3xl">
        Prendre rendez-vous
      </h1>
      <p className="mt-1 text-sm text-ink/55">{org.name}</p>

      {error ? (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {selectedService && step !== "service" ? (
        <div className="mt-4 rounded-xl bg-white p-3 text-sm shadow-sm ring-1 ring-[#E4BDC2]/35">
          <p className="font-semibold">{selectedService.name}</p>
          <p className="text-ink/55">
            {formatMad(selectedService.price)} · {formatDuration(selectedService.durationMin)}
          </p>
        </div>
      ) : null}

      <div className="mt-6">
        {step === "service" ? (
          <>
            <h2 className="mb-4 font-semibold">Choisissez votre prestation</h2>
            <ul className="space-y-3">
              {services.map((s) => (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => setServiceId(s.id)}
                    className={`w-full rounded-xl border p-4 text-left text-sm transition ${
                      serviceId === s.id
                        ? "border-primary bg-primary/5"
                        : "border-line bg-white"
                    }`}
                  >
                    <div className="flex justify-between gap-2">
                      <span className="font-medium">{s.name}</span>
                      <span className="shrink-0 font-mono text-ink/55">
                        {formatMad(s.price)}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-ink/45">
                      {formatDuration(s.durationMin)}
                    </p>
                  </button>
                </li>
              ))}
            </ul>
            <NavButtons onNext={() => setStep("staff")} disabled={!serviceId} />
          </>
        ) : null}

        {step === "staff" ? (
          <>
            <h2 className="mb-4 font-semibold">Choisissez votre professionnelle</h2>
            <ul className="space-y-2">
              <li>
                <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-line bg-white p-4 text-sm">
                  <input
                    type="radio"
                    name="staff"
                    checked={staffId === "any"}
                    onChange={() => setStaffId("any")}
                  />
                  <span>Pas de préférence</span>
                </label>
              </li>
              {staff.map((s) => (
                <li key={s.id}>
                  <label
                    className={`flex cursor-pointer items-center gap-3 rounded-xl border p-4 text-sm ${
                      staffId === s.id ? "border-primary bg-primary/5" : "border-line bg-white"
                    } ${!s.available ? "opacity-50" : ""}`}
                  >
                    <input
                      type="radio"
                      name="staff"
                      checked={staffId === s.id}
                      disabled={!s.available}
                      onChange={() => setStaffId(s.id)}
                    />
                    <span>
                      {s.displayName}
                      <span className="block text-xs text-ink/45">
                        {s.available ? "Disponible" : "Indisponible"}
                      </span>
                    </span>
                  </label>
                </li>
              ))}
            </ul>
            <NavButtons onBack={() => setStep("service")} onNext={() => setStep("date")} />
          </>
        ) : null}

        {step === "date" ? (
          <>
            <h2 className="mb-4 font-semibold">Choisissez une date</h2>
            <input
              type="date"
              value={date}
              min={new Date().toISOString().slice(0, 10)}
              onChange={(e) => {
                setDate(e.target.value);
                setTime("");
              }}
              className="w-full rounded-xl border border-line bg-white px-4 py-3 text-sm"
            />
            {date && !availableDates.includes(date) ? (
              <p className="mt-2 text-xs text-amber-600">
                Aucun créneau ce jour — essayez une autre date.
              </p>
            ) : null}
            <NavButtons
              onBack={() => setStep("staff")}
              onNext={() => setStep("slot")}
              disabled={!date}
            />
          </>
        ) : null}

        {step === "slot" ? (
          <>
            <h2 className="mb-4 font-semibold">Créneaux disponibles</h2>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {slots
                .filter((s) => s.available)
                .map((s) => (
                  <button
                    key={s.time}
                    type="button"
                    onClick={() => setTime(s.time)}
                    className={`rounded-lg border py-2.5 font-mono text-sm ${
                      time === s.time
                        ? "border-primary bg-primary text-white"
                        : "border-line bg-white"
                    }`}
                  >
                    {s.time}
                  </button>
                ))}
            </div>
            {!slots.some((s) => s.available) ? (
              <p className="mt-3 text-sm text-ink/50">Aucun créneau disponible ce jour.</p>
            ) : null}
            <NavButtons
              onBack={() => setStep("date")}
              onNext={() => setStep("info")}
              disabled={!time}
            />
          </>
        ) : null}

        {step === "info" ? (
          <>
            <h2 className="mb-4 font-semibold">Vos informations</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <input
                className="rounded-xl border border-line bg-white px-4 py-3 text-sm"
                placeholder="Prénom *"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
              />
              <input
                className="rounded-xl border border-line bg-white px-4 py-3 text-sm"
                placeholder="Nom *"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
              />
              <input
                className="rounded-xl border border-line bg-white px-4 py-3 text-sm sm:col-span-2"
                placeholder="Téléphone *"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
              <input
                className="rounded-xl border border-line bg-white px-4 py-3 text-sm sm:col-span-2"
                placeholder="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <textarea
                className="min-h-[80px] rounded-xl border border-line bg-white px-4 py-3 text-sm sm:col-span-2"
                placeholder="Commentaire"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
              <label className="flex items-center gap-2 text-sm sm:col-span-2">
                <input
                  type="checkbox"
                  checked={marketingOptIn}
                  onChange={(e) => setMarketingOptIn(e.target.checked)}
                />
                Recevoir les actualités de l&apos;institut
              </label>
            </div>
            <NavButtons
              onBack={() => setStep("slot")}
              onNext={() => setStep("confirm")}
              disabled={
                !firstName.trim() ||
                !lastName.trim() ||
                phone.replace(/\D/g, "").length < 8
              }
            />
          </>
        ) : null}

        {step === "confirm" ? (
          <>
            <h2 className="mb-4 font-semibold">Récapitulatif</h2>
            <div className="space-y-2 rounded-xl bg-white p-5 text-sm shadow-sm ring-1 ring-[#E4BDC2]/35">
              <p className="font-semibold">{selectedService?.name}</p>
              <p className="text-ink/55">
                {selectedService
                  ? formatDuration(selectedService.durationMin)
                  : null}
              </p>
              <p>
                {date} · {time}
              </p>
              <p>
                {org.name}
                {org.city ? ` · ${org.city}` : ""}
              </p>
              <p className="pt-2 font-mono font-bold text-primary">
                {selectedService ? formatMad(selectedService.price) : null}
              </p>
            </div>
            <div className="mt-6 flex gap-2">
              <button
                type="button"
                className="btn-ghost flex-1"
                onClick={() => setStep("info")}
              >
                Retour
              </button>
              <button
                type="button"
                className="btn-primary flex-1"
                disabled={submitting}
                onClick={() => void handleConfirm()}
              >
                {submitting ? "…" : "Confirmer le rendez-vous"}
              </button>
            </div>
          </>
        ) : null}

        {step === "done" && result ? (
          <div className="rounded-xl bg-white p-6 text-center shadow-sm">
            <p className="font-semibold text-emerald-700">Rendez-vous confirmé</p>
            <p className="mt-2 text-sm text-ink/60">{result.serviceName}</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function NavButtons({
  onBack,
  onNext,
  disabled,
}: {
  onBack?: () => void;
  onNext: () => void;
  disabled?: boolean;
}) {
  return (
    <div className="mt-6 flex gap-2">
      {onBack ? (
        <button type="button" className="btn-ghost flex-1" onClick={onBack}>
          Retour
        </button>
      ) : null}
      <button
        type="button"
        className="btn-primary flex-1"
        disabled={disabled}
        onClick={onNext}
      >
        Continuer
      </button>
    </div>
  );
}
