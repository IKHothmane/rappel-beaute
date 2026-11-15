"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { ArrowLeft, Loader2, X } from "lucide-react";
import { LoyaltyMergeSummary } from "@/components/loyalty/loyalty-merge-summary";
import { useToast } from "@/components/ui/toast";
import { LOYALTY_NAME_MAX_LENGTH, LOYALTY_PHONE_MAX_LENGTH, validLoyaltyPhone } from "@/lib/loyalty/profile-input";
import { cn } from "@/lib/utils";
import {
  assignLoyaltyPhone,
  mergeLoyaltyCustomers,
  previewLoyaltyPhone,
  type LoyaltyAssignPreview,
  type LoyaltyMergeFailure,
  type LoyaltyMergePreview,
  type LoyaltyMergeResult,
} from "@/modules/loyalty/service";

export type MergeDialogSource = { customerId: string; name: string; cardCode: string | null };

export type LoyaltyMergeOutcome =
  | { kind: "assigned"; customerId: string; phone: string }
  | { kind: "merged"; customerId: string; result: LoyaltyMergeResult };

type Step = "phone" | "assign" | "merge";
type Busy = null | "preview" | "assign" | "merge" | "refresh";
type Problem = { code: string; message: string; refreshable?: boolean };

const FOCUSABLE =
  'a[href],button:not([disabled]),input:not([disabled]):not([type="hidden"]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

/** Cibles tactiles : html { zoom: 0.8 } réduit un bouton de 44 px CSS à ~35 px à l'écran, d'où 55 px sur mobile. */
const touch = "min-h-[55px] lg:min-h-11";
const fieldClass =
  "w-full min-w-0 rounded-xl border border-[#F0E4EA] bg-[#FCF8FA] px-3 text-base outline-none transition focus:border-[#C95483] focus:ring-2 focus:ring-pink-100 aria-[invalid=true]:border-red-400 aria-[invalid=true]:ring-2 aria-[invalid=true]:ring-red-100 disabled:opacity-60 min-h-[55px] lg:min-h-11";
const primaryButton =
  "inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#981C52] px-5 py-2 text-sm font-semibold text-white transition hover:bg-[#7d1643] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#981C52] disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto";
const secondaryButton =
  "inline-flex w-full items-center justify-center gap-2 rounded-xl border border-[#E7B9CD] bg-white px-5 py-2 text-sm font-semibold text-[#765E6B] transition hover:bg-[#FFF1F7] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#981C52] disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto";

const PROBLEM_TEXT: Record<string, string> = {
  INVALID_INPUT: "Les informations saisies sont invalides. Vérifiez le numéro puis réessayez.",
  IDENTITY_NOT_CONFIRMED: "Cochez la confirmation d’identité avant de fusionner.",
  NOT_FOUND: "Fiche introuvable. La liste va être actualisée.",
  ALREADY_MERGED: "Cette fiche a déjà été fusionnée. La liste va être actualisée.",
  SAME_CUSTOMER: "Ce numéro correspond à la fiche elle-même.",
  SOURCE_NOT_ANONYMOUS: "Cette fiche a déjà un numéro. La liste va être actualisée.",
  TARGET_MERGED: "La fiche existante a elle-même été fusionnée dans une autre. Relancez la vérification du numéro.",
  AMBIGUOUS_CARD: "Plusieurs cartes correspondent à cette cliente. Corrigez le doublon avant de fusionner.",
  AMBIGUOUS_TARGET: "Plusieurs fiches correspondent à ce numéro. Corrigez les doublons avant de fusionner.",
  IDEMPOTENCY_CONFLICT: "Cette tentative a déjà servi pour une autre fusion. Fermez puis rouvrez cet écran.",
  CARD_INACTIVE: "Une des deux cartes n’est plus active : la fusion est impossible.",
  MERGE_IN_PROGRESS: "Une fusion est en cours, réessayez dans un instant.",
  STALE_PREVIEW: "Les fiches ont changé depuis l’aperçu. Actualisez puis confirmez de nouveau.",
  NETWORK: "Connexion impossible. Vérifiez le réseau puis réessayez.",
  TIMEOUT: "Le serveur met trop de temps à répondre. Réessayez : aucune fusion n’est dupliquée.",
};

/** Après ces erreurs, les données affichées sont périmées : on demande à la page de se rafraîchir. */
const REFRESH_CODES = new Set(["NOT_FOUND", "ALREADY_MERGED", "SOURCE_NOT_ANONYMOUS", "TARGET_MERGED", "CARD_INACTIVE"]);

function newIdempotencyKey() {
  try {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
    if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
      const bytes = crypto.getRandomValues(new Uint8Array(16));
      return `rb-${Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("")}`;
    }
  } catch {
    /* repli ci-dessous */
  }
  return `rb-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

function Spinner() {
  return <Loader2 size={16} className="animate-spin" aria-hidden />;
}

export function LoyaltyMergeDialog({
  source,
  onClose,
  onDone,
  onUnavailable,
  onStale,
}: {
  source: MergeDialogSource;
  onClose: () => void;
  onDone: (outcome: LoyaltyMergeOutcome) => void;
  /** 403 FORBIDDEN / 404 MERGE_DISABLED : la fonctionnalité n'est pas disponible, le bouton doit disparaître. */
  onUnavailable: () => void;
  /** Les données de la page sont périmées (fiche déjà fusionnée, introuvable…). */
  onStale: () => void;
}) {
  const { toast } = useToast();
  const [mounted, setMounted] = useState(false);
  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [assignPreview, setAssignPreview] = useState<LoyaltyAssignPreview | null>(null);
  const [mergePreview, setMergePreview] = useState<LoyaltyMergePreview | null>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState<Busy>(null);
  const [problem, setProblem] = useState<Problem | null>(null);
  const [retryUntil, setRetryUntil] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());

  const rootRef = useRef<HTMLDivElement | null>(null);
  const phoneRef = useRef<HTMLInputElement | null>(null);
  const titleRef = useRef<HTMLHeadingElement | null>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const busyRef = useRef<Busy>(null);
  const abortRef = useRef<AbortController | null>(null);
  // Une seule clé par ouverture de l'écran : les nouveaux essais d'une même fusion la réutilisent (rejeu côté serveur).
  const idempotencyKeyRef = useRef<string>("");
  if (!idempotencyKeyRef.current) idempotencyKeyRef.current = newIdempotencyKey();

  useEffect(() => {
    openerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setMounted(true);
    return () => {
      abortRef.current?.abort();
      const opener = openerRef.current;
      if (opener && document.contains(opener)) opener.focus();
    };
  }, []);

  const committing = busy === "assign" || busy === "merge";
  const secondsLeft = retryUntil ? Math.max(0, Math.ceil((retryUntil - now) / 1000)) : 0;
  const rateLimited = secondsLeft > 0;

  useEffect(() => {
    if (!retryUntil) return;
    setNow(Date.now());
    const timer = setInterval(() => {
      const current = Date.now();
      setNow(current);
      if (current >= retryUntil) {
        setRetryUntil(null);
        setProblem((prev) => (prev?.code === "RATE_LIMITED" ? null : prev));
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [retryUntil]);

  const close = useCallback(() => {
    if (busyRef.current === "assign" || busyRef.current === "merge") return;
    onClose();
  }, [onClose]);

  // Défilement figé, Échap, focus gardé dans le dialogue.
  useEffect(() => {
    if (!mounted) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        close();
        return;
      }
      if (event.key !== "Tab") return;
      const root = rootRef.current;
      if (!root) return;
      const items = Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((el) => el.getClientRects().length > 0);
      if (items.length === 0) {
        event.preventDefault();
        titleRef.current?.focus();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      if (!root.contains(active)) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
      } else if (event.shiftKey && (active === first || active === titleRef.current)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };
    const onFocusIn = (event: FocusEvent) => {
      const root = rootRef.current;
      if (root && event.target instanceof Node && !root.contains(event.target)) {
        (root.querySelector<HTMLElement>(FOCUSABLE) ?? titleRef.current)?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("focusin", onFocusIn);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("focusin", onFocusIn);
    };
  }, [mounted, close]);

  // Focus : champ du numéro sur la première étape, titre de l'étape sinon (lecteurs d'écran).
  useEffect(() => {
    if (!mounted) return;
    const target = step === "phone" ? phoneRef.current : titleRef.current;
    target?.focus();
  }, [mounted, step]);

  function setBusyState(value: Busy) {
    busyRef.current = value;
    setBusy(value);
  }

  function signal() {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    return controller.signal;
  }

  function fail(res: LoyaltyMergeFailure) {
    if (res.code === "ABORTED") return;
    if (res.code === "FORBIDDEN" || res.code === "MERGE_DISABLED") {
      toast("La fusion de fiches n’est pas disponible pour ce compte.", "info");
      onUnavailable();
      return;
    }
    let message = PROBLEM_TEXT[res.code] ?? res.error ?? "Opération impossible. Réessayez.";
    if (res.code === "RATE_LIMITED") {
      const wait = Math.max(1, Math.min(600, Math.round(res.retryAfterSec ?? 30)));
      setRetryUntil(Date.now() + wait * 1000);
      message = "Trop de requêtes. Patientez avant de réessayer.";
    }
    if (res.code === "STALE_PREVIEW") return; // traité par refreshPreview
    setProblem({ code: res.code, message });
    toast(message, "error");
    if (REFRESH_CODES.has(res.code)) onStale();
  }

  function applyPreview(data: LoyaltyAssignPreview | LoyaltyMergePreview) {
    setProblem(null);
    setConfirmed(false);
    if (data.mode === "assign") {
      setAssignPreview(data);
      setMergePreview(null);
      setStep("assign");
    } else {
      setMergePreview(data);
      setAssignPreview(null);
      setStep("merge");
    }
  }

  async function runPreview(kind: "preview" | "refresh") {
    if (busyRef.current) return false;
    const value = phone.trim();
    if (!value) {
      setPhoneError("Saisissez le numéro de la cliente.");
      setStep("phone");
      phoneRef.current?.focus();
      return false;
    }
    if (!validLoyaltyPhone(value)) {
      setPhoneError("Indiquez un numéro valide (chiffres, espaces, + ou indicatif).");
      setStep("phone");
      phoneRef.current?.focus();
      return false;
    }
    setPhoneError(null);
    setProblem(null);
    setBusyState(kind);
    const res = await previewLoyaltyPhone({ sourceCustomerId: source.customerId, phone: value }, signal());
    setBusyState(null);
    if (!res.ok) {
      fail(res);
      return false;
    }
    applyPreview(res.data);
    return true;
  }

  function onPhoneSubmit(event: FormEvent) {
    event.preventDefault();
    if (rateLimited) return;
    void runPreview("preview");
  }

  async function onAssign(event: FormEvent) {
    event.preventDefault();
    if (busyRef.current || rateLimited || !assignPreview) return;
    setProblem(null);
    setBusyState("assign");
    const res = await assignLoyaltyPhone({
      sourceCustomerId: source.customerId,
      phone: phone.trim(),
      ...(firstName.trim() ? { firstName: firstName.trim() } : {}),
      ...(lastName.trim() ? { lastName: lastName.trim() } : {}),
    });
    setBusyState(null);
    if (!res.ok) {
      fail(res);
      return;
    }
    if (res.data.mode === "merge") {
      applyPreview(res.data.preview);
      toast("Ce numéro vient d’être attribué à une autre fiche : vérifiez la fusion proposée.", "info");
      return;
    }
    onDone({ kind: "assigned", customerId: res.data.customerId, phone: res.data.phone });
  }

  async function onMerge() {
    if (busyRef.current || rateLimited || !confirmed || !mergePreview) return;
    setProblem(null);
    setBusyState("merge");
    const res = await mergeLoyaltyCustomers({
      sourceCustomerId: source.customerId,
      targetCustomerId: mergePreview.target.customerId,
      idempotencyKey: idempotencyKeyRef.current,
      previewVersion: mergePreview.previewVersion,
    });
    if (!res.ok && res.code === "STALE_PREVIEW") {
      // Les fiches ont bougé depuis l'aperçu : on relit l'aperçu, l'équipe doit reconfirmer.
      setBusyState("refresh");
      const again = await previewLoyaltyPhone({ sourceCustomerId: source.customerId, phone: phone.trim() }, signal());
      setBusyState(null);
      if (again.ok) {
        applyPreview(again.data);
        toast("Les fiches ont changé : l’aperçu a été actualisé. Vérifiez puis confirmez de nouveau.", "info");
      } else {
        fail(again);
        if (again.code !== "ABORTED" && again.code !== "FORBIDDEN" && again.code !== "MERGE_DISABLED") {
          setProblem({ code: "STALE_PREVIEW", message: PROBLEM_TEXT.STALE_PREVIEW, refreshable: true });
        }
      }
      return;
    }
    setBusyState(null);
    if (!res.ok) {
      fail(res);
      return;
    }
    onDone({ kind: "merged", customerId: mergePreview.target.customerId, result: res.data });
  }

  function backToPhone() {
    if (busyRef.current) return;
    abortRef.current?.abort();
    setProblem(null);
    setConfirmed(false);
    setStep("phone");
  }

  if (!mounted) return null;

  const titleId = "loyalty-merge-title";
  const descId = "loyalty-merge-desc";
  const wide = step === "merge";
  const title = step === "merge" ? "Fusionner avec une fiche existante" : "Ajouter le numéro";
  const description =
    step === "phone"
      ? `Cliente anonyme : ${source.name}${source.cardCode ? ` · carte ${source.cardCode}` : ""}.`
      : step === "assign"
        ? "Ce numéro n’est pas encore connu : il sera enregistré sur cette fiche."
        : "Ce numéro appartient déjà à une fiche. Comparez les deux fiches puis confirmez.";

  return createPortal(
    <div className="rb-fullscreen-overlay fixed z-[90] flex items-end justify-center bg-[#261524]/45 backdrop-blur-[1px] sm:items-center sm:p-6">
      <div
        ref={rootRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
        aria-busy={busy !== null}
        className={cn(
          "flex max-h-full w-full flex-col overflow-hidden rounded-t-3xl border border-[#F0DDE6] bg-white shadow-2xl sm:rounded-2xl",
          wide ? "sm:max-w-4xl" : "sm:max-w-lg",
        )}
      >
        <header className="flex shrink-0 items-start justify-between gap-3 border-b border-[#F0DDE6] bg-gradient-to-br from-[#FFF5F9] via-[#FCE7F1] to-[#F3E8FF] px-5 py-4 sm:px-6">
          <div className="min-w-0">
            <h2
              id={titleId}
              ref={titleRef}
              tabIndex={-1}
              className="break-words font-display text-xl font-bold tracking-tight text-[#261524] outline-none sm:text-2xl"
            >
              {title}
            </h2>
            <p id={descId} className="mt-1 break-words text-sm leading-5 text-[#654254]">
              {description}
            </p>
          </div>
          <button
            type="button"
            onClick={close}
            disabled={committing}
            aria-label="Fermer"
            className="-mr-2 -mt-1 inline-flex h-[55px] w-[55px] shrink-0 items-center justify-center rounded-xl text-[#887787] transition hover:bg-white/70 hover:text-[#261524] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#981C52] disabled:opacity-50 lg:h-11 lg:w-11"
          >
            <X size={20} aria-hidden />
          </button>
        </header>

        {step === "phone" ? (
          <form onSubmit={onPhoneSubmit} noValidate className="flex min-h-0 flex-1 flex-col">
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-5 sm:px-6">
              <div>
                <label htmlFor="loyalty-merge-phone" className="text-sm font-semibold text-[#30202C]">
                  Numéro de téléphone de la cliente
                </label>
                <input
                  id="loyalty-merge-phone"
                  ref={phoneRef}
                  type="tel"
                  inputMode="tel"
                  autoComplete="off"
                  maxLength={LOYALTY_PHONE_MAX_LENGTH}
                  value={phone}
                  onChange={(event) => {
                    setPhone(event.target.value);
                    if (phoneError) setPhoneError(null);
                  }}
                  disabled={busy !== null}
                  aria-invalid={phoneError ? true : undefined}
                  aria-describedby={phoneError ? "loyalty-merge-phone-hint loyalty-merge-phone-error" : "loyalty-merge-phone-hint"}
                  placeholder="06 12 34 56 78"
                  className={cn(fieldClass, "mt-1.5")}
                />
                <p id="loyalty-merge-phone-hint" className="mt-1.5 text-xs text-[#765E6B]">
                  Format local ou international (+212…, +33…). Si le numéro existe déjà, vous pourrez fusionner les deux fiches.
                </p>
                {phoneError ? (
                  <p id="loyalty-merge-phone-error" role="alert" className="mt-1.5 text-sm font-semibold text-red-700">
                    {phoneError}
                  </p>
                ) : null}
              </div>
              <ProblemBanner problem={problem} secondsLeft={secondsLeft} busy={busy !== null} onRefresh={() => void runPreview("refresh")} />
            </div>
            <footer className="flex shrink-0 flex-col-reverse gap-2 border-t border-[#F0DDE6] bg-white px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
              <button type="button" onClick={close} className={cn(secondaryButton, touch)}>
                Annuler
              </button>
              <button type="submit" disabled={busy !== null || rateLimited || !phone.trim()} className={cn(primaryButton, touch)}>
                {busy === "preview" ? (
                  <>
                    <Spinner /> Vérification…
                  </>
                ) : rateLimited ? (
                  `Patientez ${secondsLeft} s`
                ) : (
                  "Vérifier le numéro"
                )}
              </button>
            </footer>
          </form>
        ) : null}

        {step === "assign" && assignPreview ? (
          <form onSubmit={onAssign} className="flex min-h-0 flex-1 flex-col">
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-5 sm:px-6">
              <div className="rounded-2xl border border-[#CFE9DB] bg-[#F6FCF9] p-4">
                <p className="text-xs font-semibold text-[#765E6B]">Numéro à enregistrer</p>
                <p className="mt-0.5 break-words text-lg font-bold text-[#30202C]">{assignPreview.canonicalPhone}</p>
                <p className="mt-1 text-sm text-[#654254]">
                  Aucune fiche n’utilise ce numéro : la fiche {source.name}
                  {assignPreview.source.cardCode ? ` (carte ${assignPreview.source.cardCode})` : ""} le conservera, avec ses{" "}
                  {assignPreview.source.visits} passage{assignPreview.source.visits > 1 ? "s" : ""}.
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label htmlFor="loyalty-merge-first" className="text-sm font-semibold text-[#30202C]">
                    Prénom <span className="font-normal text-[#765E6B]">(facultatif)</span>
                  </label>
                  <input
                    id="loyalty-merge-first"
                    value={firstName}
                    onChange={(event) => setFirstName(event.target.value)}
                    maxLength={LOYALTY_NAME_MAX_LENGTH}
                    autoComplete="off"
                    disabled={busy !== null}
                    className={cn(fieldClass, "mt-1.5")}
                  />
                </div>
                <div>
                  <label htmlFor="loyalty-merge-last" className="text-sm font-semibold text-[#30202C]">
                    Nom <span className="font-normal text-[#765E6B]">(facultatif)</span>
                  </label>
                  <input
                    id="loyalty-merge-last"
                    value={lastName}
                    onChange={(event) => setLastName(event.target.value)}
                    maxLength={LOYALTY_NAME_MAX_LENGTH}
                    autoComplete="off"
                    disabled={busy !== null}
                    className={cn(fieldClass, "mt-1.5")}
                  />
                </div>
              </div>
              <ProblemBanner problem={problem} secondsLeft={secondsLeft} busy={busy !== null} onRefresh={() => void runPreview("refresh")} />
            </div>
            <footer className="flex shrink-0 flex-col-reverse gap-2 border-t border-[#F0DDE6] bg-white px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
              <button type="button" onClick={backToPhone} disabled={busy !== null} className={cn(secondaryButton, touch)}>
                <ArrowLeft size={16} aria-hidden /> Modifier le numéro
              </button>
              <button type="submit" disabled={busy !== null || rateLimited} className={cn(primaryButton, touch)}>
                {busy === "assign" ? (
                  <>
                    <Spinner /> Enregistrement…
                  </>
                ) : rateLimited ? (
                  `Patientez ${secondsLeft} s`
                ) : (
                  "Enregistrer le numéro"
                )}
              </button>
            </footer>
          </form>
        ) : null}

        {step === "merge" && mergePreview ? (
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-5 sm:px-6">
              <button
                type="button"
                onClick={backToPhone}
                disabled={busy !== null}
                className={cn(
                  "inline-flex items-center gap-2 rounded-xl px-2 text-sm font-semibold text-[#981C52] hover:bg-[#FFF1F7] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#981C52] disabled:opacity-50",
                  touch,
                )}
              >
                <ArrowLeft size={16} aria-hidden /> Modifier le numéro ({phone.trim()})
              </button>
              <LoyaltyMergeSummary preview={mergePreview} />
              <ProblemBanner problem={problem} secondsLeft={secondsLeft} busy={busy !== null} onRefresh={() => void runPreview("refresh")} />
            </div>
            <footer className="shrink-0 space-y-3 border-t border-[#F0DDE6] bg-white px-5 py-4 sm:px-6">
              <label
                className={cn(
                  "flex cursor-pointer items-start gap-3 rounded-xl border border-[#E7B9CD] bg-[#FFF9FB] px-3 py-2.5",
                  touch,
                  busy !== null && "cursor-not-allowed opacity-60",
                )}
              >
                <input
                  type="checkbox"
                  checked={confirmed}
                  onChange={(event) => setConfirmed(event.target.checked)}
                  disabled={busy !== null}
                  className="mt-0.5 h-5 w-5 shrink-0 accent-[#981C52]"
                />
                <span className="min-w-0 break-words text-sm font-semibold text-[#30202C]">
                  J’ai vérifié que c’est bien la même personne
                </span>
              </label>
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <button type="button" onClick={close} disabled={committing} className={cn(secondaryButton, touch)}>
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={() => void onMerge()}
                  disabled={!confirmed || busy !== null || rateLimited}
                  className={cn(primaryButton, touch)}
                >
                  {busy === "merge" ? (
                    <>
                      <Spinner /> Fusion en cours…
                    </>
                  ) : busy === "refresh" ? (
                    <>
                      <Spinner /> Actualisation…
                    </>
                  ) : rateLimited ? (
                    `Patientez ${secondsLeft} s`
                  ) : (
                    "Fusionner les deux fiches"
                  )}
                </button>
              </div>
            </footer>
          </div>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}

function ProblemBanner({
  problem,
  secondsLeft,
  busy,
  onRefresh,
}: {
  problem: Problem | null;
  secondsLeft: number;
  busy: boolean;
  onRefresh: () => void;
}) {
  if (!problem) return null;
  return (
    <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
      <p className="break-words font-semibold">
        {problem.code === "RATE_LIMITED"
          ? `Trop de requêtes.${secondsLeft > 0 ? ` Réessayez dans ${secondsLeft} s.` : ""}`
          : problem.message}
      </p>
      {problem.refreshable ? (
        <button
          type="button"
          onClick={onRefresh}
          disabled={busy}
          className={cn(
            "mt-2 inline-flex items-center justify-center rounded-lg border border-red-300 bg-white px-4 text-sm font-semibold text-red-800 hover:bg-red-100 disabled:opacity-50",
            touch,
          )}
        >
          Actualiser l’aperçu
        </button>
      ) : null}
    </div>
  );
}
