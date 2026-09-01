"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  formatBookingDate,
  formatBookingTime,
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

type Step = "intro" | "service" | "staff" | "date" | "slot" | "info" | "confirm" | "done";

export function BookingPageView({ slug }: { slug: string }) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("intro");
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
  const [marketingOptIn, setMarketingOptIn] = useState(false);

  const selectedService = useMemo(
    () => services.find((s) => s.id === serviceId),
    [services, serviceId],
  );

  const refreshBase = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [o, s] = await Promise.all([getPublicOrganization(slug), getPublicServices(slug)]);
      setOrg(o);
      setServices(s);
      if (!serviceId && s[0]) setServiceId(s[0].id);
    } catch {
      setError("Institut introuvable ou indisponible.");
    } finally {
      setLoading(false);
    }
  }, [slug, serviceId]);

  useEffect(() => {
    refreshBase();
  }, [refreshBase]);

  useEffect(() => {
    if (!serviceId || step === "intro") return;
    getPublicStaff(slug, serviceId, date || undefined)
      .then(setStaff)
      .catch(() => setStaff([]));
  }, [slug, serviceId, date, step]);

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
    return (
      <div className="flex min-h-screen items-center justify-center bg-paper text-sm text-ink/50">
        Chargement…
      </div>
    );
  }

  if (!org) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-paper px-6 text-center">
        <p className="text-sm text-ink/60">{error ?? "Institut introuvable."}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-paper text-ink">
      <header className="border-b border-line bg-white">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-4 sm:px-6">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary font-display text-sm font-semibold text-white">
            {org.name.charAt(0)}
          </span>
          <div className="min-w-0">
            <p className="truncate font-display text-base font-semibold">{org.name}</p>
            <p className="truncate text-xs text-ink/45">{org.address ?? "Institut de beauté"}</p>
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-3xl gap-6 px-4 py-6 lg:grid-cols-2 lg:px-6 lg:py-8">
        <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
          <div className="surface p-5">
            <p className="font-mono text-[10px] uppercase tracking-widest text-primary">Institut</p>
            <h1 className="mt-1 font-display text-2xl font-semibold">{org.name}</h1>
            <p className="mt-2 text-sm text-ink/60">★ Institut de beauté</p>
            {org.address ? <p className="mt-3 text-sm">{org.address}</p> : null}
            {org.phone ? <p className="text-sm text-ink/60">{org.phone}</p> : null}
            <p className="mt-3 text-xs text-emerald-700">Ouvert sur rendez-vous</p>
          </div>
          {selectedService && step !== "intro" ? (
            <div className="surface hidden p-4 text-sm lg:block">
              <p className="font-medium">{selectedService.name}</p>
              <p className="text-ink/55">
                {formatMad(selectedService.price)} · {formatDuration(selectedService.durationMin)}
              </p>
            </div>
          ) : null}
        </aside>

        <section className="min-w-0">
          {error ? (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          {step === "intro" ? (
            <div className="surface p-6 text-center">
              <h2 className="font-display text-xl font-semibold">Prendre rendez-vous</h2>
              <p className="mt-2 text-sm text-ink/60">
                Réservez en ligne sans créer de compte. Confirmation par l&apos;institut via WhatsApp.
              </p>
              <button type="button" className="btn-primary mt-6 w-full" onClick={() => setStep("service")}>
                Prendre rendez-vous
              </button>
            </div>
          ) : null}

          {step === "service" ? (
            <>
              <h2 className="mb-4 font-display text-xl font-semibold">Choisissez votre prestation</h2>
              <ul className="space-y-3">
                {services.map((s) => (
                  <li key={s.id}>
                    <button
                      type="button"
                      onClick={() => setServiceId(s.id)}
                      className={`w-full rounded-xl border p-4 text-left text-sm transition ${
                        serviceId === s.id ? "border-primary bg-primary/5" : "border-line bg-white"
                      }`}
                    >
                      <div className="flex justify-between gap-2">
                        <span className="font-medium">{s.name}</span>
                        <span className="shrink-0 font-mono text-ink/55">
                          {formatMad(s.price)} · {formatDuration(s.durationMin)}
                        </span>
                      </div>
                      {s.description ? (
                        <p className="mt-1 text-xs text-ink/50 line-clamp-2">{s.description}</p>
                      ) : null}
                    </button>
                  </li>
                ))}
              </ul>
              <NavButtons onBack={() => setStep("intro")} onNext={() => setStep("staff")} disabled={!serviceId} />
            </>
          ) : null}

          {step === "staff" ? (
            <>
              <h2 className="mb-4 font-display text-xl font-semibold">Choisissez votre praticienne</h2>
              <ul className="space-y-2">
                <li>
                  <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-line bg-white p-4 text-sm">
                    <input
                      type="radio"
                      name="staff"
                      checked={staffId === "any"}
                      onChange={() => setStaffId("any")}
                    />
                    <span>Peu importe</span>
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
              <h2 className="mb-4 font-display text-xl font-semibold">Choisissez une date</h2>
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
                <p className="mt-2 text-xs text-amber-600">Aucun créneau ce jour — essayez une autre date.</p>
              ) : null}
              <NavButtons onBack={() => setStep("staff")} onNext={() => setStep("slot")} disabled={!date} />
            </>
          ) : null}

          {step === "slot" ? (
            <>
              <h2 className="mb-4 font-display text-xl font-semibold">Disponibilités</h2>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {slots.filter((s) => s.available).map((s) => (
                  <button
                    key={s.time}
                    type="button"
                    onClick={() => setTime(s.time)}
                    className={`rounded-lg border py-2.5 font-mono text-sm ${
                      time === s.time ? "border-primary bg-primary text-white" : "border-line bg-white"
                    }`}
                  >
                    {s.time}
                  </button>
                ))}
              </div>
              {!slots.some((s) => s.available) ? (
                <p className="mt-3 text-sm text-ink/50">Aucun créneau disponible ce jour.</p>
              ) : null}
              <NavButtons onBack={() => setStep("date")} onNext={() => setStep("info")} disabled={!time} />
            </>
          ) : null}

          {step === "info" ? (
            <>
              <h2 className="mb-4 font-display text-xl font-semibold">Vos informations</h2>
              <div className="space-y-3">
                <input
                  placeholder="Prénom *"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full rounded-lg border border-line px-3 py-2.5 text-sm"
                />
                <input
                  placeholder="Nom *"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="w-full rounded-lg border border-line px-3 py-2.5 text-sm"
                />
                <input
                  placeholder="Téléphone *"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full rounded-lg border border-line px-3 py-2.5 text-sm"
                />
                <input
                  placeholder="Email (facultatif)"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-lg border border-line px-3 py-2.5 text-sm"
                />
                <label className="flex items-start gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={marketingOptIn}
                    onChange={(e) => setMarketingOptIn(e.target.checked)}
                    className="mt-1"
                  />
                  <span>J&apos;accepte les communications marketing (facultatif — indépendant de la réservation)</span>
                </label>
              </div>
              <NavButtons
                onBack={() => setStep("slot")}
                onNext={() => setStep("confirm")}
                disabled={!firstName.trim() || !lastName.trim() || phone.trim().length < 8}
              />
            </>
          ) : null}

          {step === "confirm" ? (
            <>
              <h2 className="mb-4 font-display text-xl font-semibold">Votre rendez-vous</h2>
              <div className="surface space-y-2 p-5 text-sm">
                <p className="font-medium">{selectedService?.name}</p>
                <p>{staffId === "any" ? "Praticienne assignée" : staff.find((s) => s.id === staffId)?.displayName}</p>
                <p>{date} · {time}</p>
                <p>{selectedService ? formatDuration(selectedService.durationMin) : ""}</p>
                <p className="font-mono text-base">{selectedService ? formatMad(selectedService.price) : ""}</p>
                <p className="text-ink/55">{org.name}</p>
                <p className="text-ink/55">{org.address}</p>
              </div>
              <div className="mt-6 flex gap-2">
                <button type="button" className="btn-ghost flex-1" onClick={() => setStep("info")}>
                  Retour
                </button>
                <button
                  type="button"
                  className="btn-primary flex-1"
                  disabled={submitting}
                  onClick={handleConfirm}
                >
                  {submitting ? "Confirmation…" : "Confirmer mon rendez-vous"}
                </button>
              </div>
            </>
          ) : null}

          {step === "done" && result ? (
            <div className="surface p-6 text-center">
              <p className="text-2xl">✅</p>
              <h2 className="mt-2 font-display text-xl font-semibold">Rendez-vous confirmé</h2>
              <p className="mt-2 text-sm text-ink/60">
                Votre rendez-vous est prévu le {formatBookingDate(result.startAt)} à{" "}
                {formatBookingTime(result.startAt)}.
              </p>
              <Link
                href={`/book/${slug}/confirmation/?id=${result.appointmentId}`}
                className="btn-ghost mt-4 inline-block text-xs"
              >
                Voir la confirmation
              </Link>
            </div>
          ) : null}
        </section>
      </main>
    </div>
  );
}

function NavButtons({
  onBack,
  onNext,
  disabled,
}: {
  onBack: () => void;
  onNext: () => void;
  disabled?: boolean;
}) {
  return (
    <div className="mt-6 flex gap-2">
      <button type="button" className="btn-ghost flex-1" onClick={onBack}>
        Retour
      </button>
      <button type="button" className="btn-primary flex-1" disabled={disabled} onClick={onNext}>
        Continuer
      </button>
    </div>
  );
}
