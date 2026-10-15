"use client";

import { useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";
import {
  Camera,
  Clock,
  Crown,
  ExternalLink,
  Plus,
  Settings,
  UserRound,
  Users,
} from "lucide-react";
import { shortCardCode, visitCycle } from "@/lib/loyalty/card-code";
import { loyaltyJoinUrl } from "@/lib/loyalty/public-origin";
import { LoyaltyScanPage } from "@/components/loyalty/loyalty-scan-page";
import type { VisitCardRow } from "@/components/loyalty/visit-cards-list";
import { journalKind, memberInitials } from "@/components/loyalty/loyalty-helpers";
import { useToast } from "@/components/ui/toast";
import type { LoyaltyJournalItem, LoyaltyProgramConfig } from "@/types/loyalty";

function phoneLabel(phone: string | null | undefined) {
  if (!phone || phone.startsWith("WL")) return "Sans téléphone";
  return phone;
}

function activityWhen(iso: string) {
  return new Date(iso).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Africa/Casablanca",
  });
}

export function LoyaltyBoard({
  orgName,
  canWrite,
  program,
  visitCards,
  journal,
  onRefresh,
  onOpenSettings,
}: {
  orgName: string;
  canWrite: boolean;
  program: LoyaltyProgramConfig | null;
  visitCards: VisitCardRow[];
  journal: LoyaltyJournalItem[];
  onRefresh: () => void;
  onOpenSettings: () => void;
}) {
  const { toast } = useToast();
  const [focusId, setFocusId] = useState<string | null>(null);
  const [joinImage, setJoinImage] = useState<string | null>(null);
  const [joinUrl, setJoinUrl] = useState<string | null>(null);
  const [joinBusy, setJoinBusy] = useState(false);
  const [passageToken, setPassageToken] = useState("");
  const [customerCode, setCustomerCode] = useState("");
  const [passageBusy, setPassageBusy] = useState(false);
  const [passageNote, setPassageNote] = useState<string | null>(null);
  const [cameraOn, setCameraOn] = useState(false);

  const threshold = program?.visitsPerReward && program.visitsPerReward > 0 ? program.visitsPerReward : null;
  const rewardLabel = program?.rewardLabel?.trim() || "";
  const focused = focusId ? visitCards.find((card) => card.customerId === focusId) ?? null : null;
  const cycleVisits = focused && threshold ? visitCycle(focused.visits, threshold) : 0;
  const filled = threshold ? Math.min(threshold, Math.max(0, cycleVisits)) : 0;
  const loyal = useMemo(
    () => [...visitCards].sort((a, b) => b.visits - a.visits || a.customerName.localeCompare(b.customerName, "fr")).slice(0, 5),
    [visitCards],
  );

  useEffect(() => {
    let cancelled = false;
    async function load(action?: "regenerate") {
      setJoinBusy(true);
      try {
        const res = await fetch("/api/loyalty/join-qr/", {
          method: action ? "POST" : "GET",
          credentials: "include",
          headers: action ? { "Content-Type": "application/json" } : undefined,
          body: action ? JSON.stringify({ action }) : undefined,
        });
        const data = (await res.json()) as { qr?: { token: string } | null; error?: string };
        if (!res.ok) throw new Error(data.error || "QR indisponible.");
        const token = data.qr?.token;
        if (!token || cancelled) {
          if (!cancelled) {
            setJoinImage(null);
            setJoinUrl(null);
          }
          return;
        }
        const url = loyaltyJoinUrl(token, window.location.origin);
        const image = await QRCode.toDataURL(url, { margin: 1, width: 280, errorCorrectionLevel: "M" });
        if (!cancelled) {
          setJoinUrl(url);
          setJoinImage(image);
        }
      } catch (error) {
        if (!cancelled) toast(error instanceof Error ? error.message : "QR indisponible.", "error");
      } finally {
        if (!cancelled) setJoinBusy(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [toast]);

  async function regenerateJoin() {
    setJoinBusy(true);
    try {
      const res = await fetch("/api/loyalty/join-qr/", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "regenerate" }),
      });
      const data = (await res.json()) as { qr?: { token: string } | null; error?: string };
      if (!res.ok || !data.qr?.token) throw new Error(data.error || "QR indisponible.");
      const url = loyaltyJoinUrl(data.qr.token, window.location.origin);
      const image = await QRCode.toDataURL(url, { margin: 1, width: 280, errorCorrectionLevel: "M" });
      setJoinUrl(url);
      setJoinImage(image);
      toast("QR d'adhésion prêt.", "success");
    } catch (error) {
      toast(error instanceof Error ? error.message : "QR indisponible.", "error");
    } finally {
      setJoinBusy(false);
    }
  }

  async function addPassage() {
    if (!passageToken.trim()) return;
    setPassageBusy(true);
    setPassageNote(null);
    try {
      const res = await fetch("/api/loyalty/credit-code/", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "add",
          token: passageToken,
        }),
      });
      const body = (await res.json()) as {
        error?: string;
        customerName?: string;
        visits?: number;
        visitsPerReward?: number;
        promoCode?: string | null;
      };
      if (!res.ok) throw new Error(body.error || "Passage impossible.");
      if (body.promoCode) {
        setPassageNote(`${body.customerName} · code ${body.promoCode} : un soin est offert. Compteur à 0.`);
        toast(`Code ${body.promoCode} : un soin est offert. Compteur à 0.`, "success");
      } else {
        const limit = body.visitsPerReward ?? threshold ?? 0;
        const shown = limit > 0 ? visitCycle(body.visits ?? 0, limit) : (body.visits ?? 0);
        setPassageNote(`${body.customerName} · ${shown} / ${limit || "—"}`);
      }
      setPassageToken("");
      onRefresh();
    } catch (error) {
      toast(error instanceof Error ? error.message : "Passage impossible.", "error");
    } finally {
      setPassageBusy(false);
    }
  }

  useEffect(() => {
    if (!cameraOn) return;
    const Detector = (window as unknown as {
      BarcodeDetector?: new (opts: { formats: string[] }) => {
        detect: (source: HTMLVideoElement) => Promise<{ rawValue?: string }[]>;
      };
    }).BarcodeDetector;
    const video = document.getElementById("loyalty-camera") as HTMLVideoElement | null;
    if (!Detector || !video || !navigator.mediaDevices?.getUserMedia) return;
    let stopped = false;
    let stream: MediaStream | null = null;
    void navigator.mediaDevices
      .getUserMedia({ video: { facingMode: "environment" } })
      .then(async (next) => {
        stream = next;
        video.srcObject = next;
        await video.play();
        const detector = new Detector({ formats: ["qr_code"] });
        const tick = async () => {
          if (stopped) return;
          const codes = await detector.detect(video).catch(() => []);
          const value = codes[0]?.rawValue;
          if (value) {
            const input = document.getElementById("loyalty-card-code") as HTMLInputElement | null;
            if (input) {
              const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
              setter?.call(input, value);
              input.dispatchEvent(new Event("input", { bubbles: true }));
            }
            stopped = true;
            setCameraOn(false);
            return;
          }
          requestAnimationFrame(() => void tick());
        };
        void tick();
      })
      .catch(() => {
        setCameraOn(false);
        toast("Caméra indisponible. Saisissez le code de la carte.", "error");
      });
    return () => {
      stopped = true;
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, [cameraOn, toast]);

  function selectCustomer(card: VisitCardRow) {
    setFocusId(card.customerId);
    const code = (card.cardCode || card.promoCode || (card.publicToken ? shortCardCode(card.publicToken) : "")).trim();
    if (!code) return;
    setPassageToken(code);
    setCustomerCode(code);
  }

  function startCamera() {
    const Detector = (window as unknown as { BarcodeDetector?: unknown }).BarcodeDetector;
    if (!Detector || !navigator.mediaDevices?.getUserMedia) {
      document.getElementById("loyalty-card-code")?.focus();
      toast("Saisissez le code affiché sur la carte.", "info");
      return;
    }
    setCameraOn(true);
  }

  const field = "h-11 w-full min-w-0 rounded-xl border border-[#F3D5E2] bg-white px-3 text-sm outline-none focus:border-primary";

  return (
    <div className="mx-auto w-full min-w-0 max-w-[1180px] space-y-4 overflow-x-clip">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="text-[12px] text-ink/45">
            Fidélité <span className="px-1">›</span> <span className="text-ink/70">Carte de fidélité</span>
          </p>
          <h1 className="mt-1 text-[24px] font-semibold leading-tight tracking-tight text-ink sm:text-[32px]">Carte de fidélité</h1>
          <p className="mt-1 max-w-xl text-[13px] leading-5 text-ink/55 sm:text-sm">
            Identifiez une cliente, ajoutez son passage, puis suivez les cartes les plus actives.
          </p>
        </div>
        {joinUrl ? (
          <a
            href={joinUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-11 w-full shrink-0 items-center justify-center gap-2 rounded-full border border-[#F3D5E2] bg-white px-4 text-[13px] font-semibold text-ink sm:h-10 sm:w-auto"
          >
            Voir la page publique
            <ExternalLink size={14} />
          </a>
        ) : null}
      </header>

      <section className="rounded-2xl border border-[#F3D5E2] bg-white p-3 shadow-sm sm:p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-[15px] font-bold">
            <Settings size={16} className="text-ink/40" /> Programme
          </h2>
          {canWrite ? (
            <button type="button" onClick={onOpenSettings} className="inline-flex h-9 items-center gap-1 rounded-full bg-[#FFF1F6] px-3 text-[13px] font-semibold text-primary">
              <Settings size={14} /> Modifier
            </button>
          ) : null}
        </div>
        <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[
            { label: "Nom", value: program?.name || "—" },
            { label: "Passages requis", value: threshold != null ? String(threshold) : "—" },
            { label: "Récompense", value: rewardLabel || "—" },
            { label: "Statut", value: program ? (program.active ? "Actif" : "Inactif") : "—" },
          ].map((item) => (
            <div key={item.label} className="min-w-0 rounded-xl bg-[#FFF7FA] px-3 py-2">
              <dt className="text-[11px] text-ink/45">{item.label}</dt>
              <dd className="truncate text-sm font-semibold text-ink">{item.value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(280px,0.85fr)]">
        <div className="order-1 grid min-w-0 gap-3 lg:order-2">
          <section className="rounded-2xl bg-[#FFF1F6] p-4">
            <div className="flex items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-primary">
                <Camera size={18} />
              </span>
              <div className="min-w-0">
                <h2 className="text-[15px] font-bold text-ink">Scanner la carte cliente</h2>
                <p className="text-[12px] text-ink/55">Scannez le QR code de la cliente pour retrouver sa carte.</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => void startCamera()}
              className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-semibold text-white"
            >
              <Camera size={16} />
              Scanner le QR code
            </button>
            {cameraOn ? (
              <video id="loyalty-camera" className="mt-3 aspect-video w-full rounded-xl bg-black object-cover" muted playsInline />
            ) : null}
          </section>

          <section className="rounded-2xl border border-[#F7E4EC] bg-white p-4 shadow-sm">
            <div className="flex items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#FFF1F6] text-primary">
                <UserRound size={18} />
              </span>
              <div>
                <h2 className="text-[15px] font-bold text-ink">Entrer le code de la cliente</h2>
                <p className="text-[12px] text-ink/55">Saisissez le code affiché sur la carte de fidélité.</p>
              </div>
            </div>
            <LoyaltyScanPage
              embedded
              code={customerCode}
              onCodeChange={setCustomerCode}
              onPreview={(preview) => {
                if (!preview) return;
                const match = visitCards.find((card) => card.customerName === preview.customerName);
                if (match) setFocusId(match.customerId);
                setPassageToken(shortCardCode(preview.token));
              }}
              onValidated={onRefresh}
            />
          </section>

          <section className="rounded-2xl border border-[#D7F0E2] bg-[#F3FBF6] p-4">
            <div className="flex items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-[#1B7F4E]">
                <Plus size={18} />
              </span>
              <div>
                <h2 className="text-[15px] font-bold text-ink">Ajouter un passage</h2>
                <p className="text-[12px] text-ink/55">
                  Saisissez le code de la carte. Au {threshold ?? 10}e passage, il devient un code promo et un soin est offert.
                </p>
              </div>
            </div>
            {canWrite ? (
              <form
                className="mt-3 grid gap-2"
                onSubmit={(event) => {
                  event.preventDefault();
                  void addPassage();
                }}
              >
                <input
                  id="loyalty-passage-code"
                  className={field}
                  value={passageToken}
                  onChange={(event) => setPassageToken(event.target.value)}
                  placeholder="Code de la carte"
                  autoComplete="off"
                />
                {passageNote ? <p className="text-[12px] font-semibold text-[#1B7F4E]">{passageNote}</p> : null}
                <button
                  type="submit"
                  disabled={passageBusy || !passageToken.trim()}
                  className="h-11 rounded-xl bg-[#1B7F4E] text-[13px] font-semibold text-white disabled:opacity-50"
                >
                  Ajouter le passage
                </button>
              </form>
            ) : (
              <p className="mt-3 text-[12px] text-ink/50">Réservé à l&apos;équipe autorisée.</p>
            )}
          </section>
        </div>

        <article
          className="relative order-2 min-w-0 overflow-hidden rounded-3xl p-4 text-white shadow-md sm:p-6 lg:order-1"
          style={{
            background: program?.cardBackgroundUrl
              ? `linear-gradient(180deg, rgba(18, 8, 12, 0.2), rgba(18, 8, 12, 0.35)), url("${program.cardBackgroundUrl}") center / cover no-repeat`
              : "linear-gradient(145deg, #4A1024 0%, #7A1838 48%, #3A0E1E 100%)",
          }}
        >
          <div className="pointer-events-none absolute -right-8 -top-10 h-40 w-40 rounded-full bg-[#E8C56B]/10" />
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <Crown className="text-[#E8C56B]" size={22} />
              <p className="mt-2 break-words font-display text-[18px] uppercase leading-tight tracking-[0.08em] text-[#E8C56B] sm:mt-3 sm:text-[26px] sm:tracking-[0.14em]">
                {orgName}
              </p>
              {program?.name && program.name !== orgName ? (
                <p className="mt-1 truncate text-[11px] uppercase tracking-[0.16em] text-white/55">{program.name}</p>
              ) : null}
            </div>
            <p className="shrink-0 text-right text-[10px] font-bold uppercase leading-tight tracking-[0.14em] text-white/70">
              Carte
              <br />
              fidélité
            </p>
          </div>
          <div className="mt-5 flex flex-col gap-4 sm:mt-8 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
              <p className="text-[13px] text-white/70">Vos passages</p>
              <p className="mt-1 text-[26px] font-semibold leading-none sm:text-[28px]">
                {focused && threshold ? `${cycleVisits} / ${threshold}` : "—"}
              </p>
              {focused && threshold ? (
                <div className="mt-2 flex max-w-full flex-wrap gap-1.5">
                  {Array.from({ length: Math.min(threshold, 12) }, (_, index) => (
                    <span
                      key={index}
                      className={index < Math.min(filled, 12) ? "h-2.5 w-2.5 rounded-full bg-[#E8C56B] sm:h-3.5 sm:w-3.5" : "h-2.5 w-2.5 rounded-full border border-white/40 sm:h-3.5 sm:w-3.5"}
                    />
                  ))}
                </div>
              ) : (
                <p className="mt-2 text-[12px] text-white/60">Choisissez une cliente fidèle pour afficher sa carte.</p>
              )}
            </div>
            <div className="flex min-w-0 items-end gap-3">
              <div className="min-w-0 flex-1 rounded-2xl bg-black/25 px-3 py-2 sm:flex-none">
                <p className="text-[11px] text-[#E8C56B]">{focused?.promoCode ? "Code promo" : "Prochaine récompense"}</p>
                <p className="truncate text-sm font-semibold">
                  {focused?.promoCode ? `${focused.promoCode} · soin offert` : rewardLabel || "—"}
                </p>
              </div>
              <div className="shrink-0 rounded-xl bg-white p-1.5">
                {joinImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={joinImage} alt="QR fidélité de l'institut" className="h-16 w-16 sm:h-20 sm:w-20" />
                ) : (
                  <div className="flex h-16 w-16 items-center justify-center text-center text-[10px] leading-tight text-ink/50 sm:h-20 sm:w-20">
                    {joinBusy ? "…" : "Aucun QR"}
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="mt-5 flex flex-col gap-3 border-t border-white/15 pt-4 sm:mt-6 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
              <p className="truncate text-base font-semibold sm:text-lg">{focused?.customerName || "Aucune cliente sélectionnée"}</p>
              <p className="truncate text-sm text-white/70">{focused ? phoneLabel(focused.phone) : "Scannez ou choisissez une carte"}</p>
            </div>
            {canWrite ? (
              <button type="button" disabled={joinBusy} onClick={() => void regenerateJoin()} className="shrink-0 self-start text-[12px] font-semibold text-[#E8C56B] sm:self-auto">
                {joinImage ? "Régénérer le QR" : "Générer le QR"}
              </button>
            ) : null}
          </div>
        </article>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <section className="min-w-0 rounded-2xl border border-[#F3D5E2] bg-white p-4 shadow-sm">
          <h2 className="mb-1 flex items-center gap-2 text-[15px] font-bold">
            <Users size={16} className="text-ink/40" /> Clientes fidèles
          </h2>
          <p className="mb-2 text-[12px] text-ink/45">Touchez un nom pour remplir son code.</p>
          {loyal.length === 0 ? (
            <p className="text-sm text-ink/45">Aucune carte pour le moment.</p>
          ) : (
            <ol className="space-y-1">
              {loyal.map((card, index) => {
                const selected = card.customerId === focusId;
                return (
                  <li key={card.id}>
                    <button
                      type="button"
                      onClick={() => selectCustomer(card)}
                      className={`flex w-full min-w-0 items-center gap-2 rounded-xl px-2 py-2 text-left sm:gap-3 ${selected ? "bg-[#FFF1F6]" : "hover:bg-[#FFF7FA]"}`}
                    >
                      <span className="w-4 shrink-0 text-sm font-bold text-ink/35">{index + 1}</span>
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#F3E4EA] text-[11px] font-bold">
                        {memberInitials(card.customerName)}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold">{card.customerName}</span>
                        {card.cardCode ? (
                          <span className="font-mono text-[12px] font-bold tracking-[0.14em] text-ink/70">{card.cardCode}</span>
                        ) : null}
                      </span>
                      {card.promoCode ? (
                        <span className="shrink-0 rounded-full bg-[#E8C56B]/40 px-2 py-0.5 text-[11px] font-bold text-[#5D4200]">
                          {card.promoCode} offert
                        </span>
                      ) : (
                        <span className="shrink-0 rounded-full bg-[#EAF8EF] px-2 py-0.5 text-[11px] font-bold text-[#1B7F4E]">
                          {visitCycle(card.visits, card.visitsPerReward)}/{card.visitsPerReward}
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ol>
          )}
        </section>

        <section className="min-w-0 rounded-2xl border border-[#F3D5E2] bg-white p-4 shadow-sm">
          <h2 className="mb-3 flex items-center gap-2 text-[15px] font-bold">
            <Clock size={16} className="text-ink/40" /> Dernières activités
          </h2>
          {journal.length === 0 ? (
            <p className="text-sm text-ink/45">Aucun mouvement pour l&apos;instant.</p>
          ) : (
            <ul className="divide-y divide-[#FFF1F6]">
              {journal.slice(0, 5).map((row) => {
                const card = visitCards.find((item) => item.customerId === row.customerId);
                return (
                  <li key={row.id}>
                    <button
                      type="button"
                      disabled={!card}
                      onClick={() => card && selectCustomer(card)}
                      className="flex w-full min-w-0 items-start gap-3 py-2.5 text-left disabled:cursor-default"
                    >
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#FFF1F6] text-[11px] font-bold text-primary">
                        {memberInitials(row.customerName)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <p className="min-w-0 truncate text-sm font-semibold">{row.customerName}</p>
                          <span className="shrink-0 rounded-full bg-[#EAF8EF] px-2 py-0.5 text-[11px] font-bold text-[#1B7F4E]">
                            {card ? `${visitCycle(card.visits, card.visitsPerReward)}/${card.visitsPerReward}` : `${row.points > 0 ? "+" : ""}${row.points} pts`}
                          </span>
                        </div>
                        <p className="truncate text-[12px] text-ink/45">{journalKind(row)}</p>
                        <p className="text-[11px] text-ink/40">{activityWhen(row.createdAt)}</p>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
