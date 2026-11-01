"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import QRCode from "qrcode";
import {
  Camera,
  ExternalLink,
  Plus,
  Settings,
  UserRound,
  Users,
} from "lucide-react";
import { shortCardCode, visitCycle } from "@/lib/loyalty/card-code";
import { loyaltyJoinUrl } from "@/lib/loyalty/public-origin";
import { LoyaltyScanPage, type LoyaltyScanPreview } from "@/components/loyalty/loyalty-scan-page";
import type { VisitCardRow } from "@/components/loyalty/visit-cards-list";
import { memberInitials } from "@/components/loyalty/loyalty-helpers";
import { LoyaltyBrandCard } from "@/components/loyalty/loyalty-brand-card";
import { ResponsiveTable } from "@/components/app/ResponsiveTable";
import { useToast } from "@/components/ui/toast";
import type { LoyaltyJournalItem, LoyaltyProgramConfig } from "@/types/loyalty";

function phoneLabel(phone: string | null | undefined) {
  if (!phone || phone.startsWith("WL")) return "Sans téléphone";
  return phone;
}

async function createQrDetector() {
  const Native = (
    window as unknown as {
      BarcodeDetector?: new (opts: { formats: string[] }) => {
        detect: (source: HTMLVideoElement) => Promise<{ rawValue?: string }[]>;
      };
    }
  ).BarcodeDetector;
  if (Native) return new Native({ formats: ["qr_code"] });
  const mod = await import("barcode-detector/ponyfill");
  return new mod.BarcodeDetector({ formats: ["qr_code"] });
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
  onRefresh,
  onOpenSettings,
}: {
  orgName: string;
  canWrite: boolean;
  program: LoyaltyProgramConfig | null;
  visitCards: VisitCardRow[];
  journal?: LoyaltyJournalItem[];
  onRefresh: () => void;
  onOpenSettings: () => void;
}) {
  const { toast } = useToast();
  const router = useRouter();
  const [focusId, setFocusId] = useState<string | null>(null);
  const [joinImage, setJoinImage] = useState<string | null>(null);
  const [joinUrl, setJoinUrl] = useState<string | null>(null);
  const [joinBusy, setJoinBusy] = useState(false);
  const [passageToken, setPassageToken] = useState("");
  const [customerCode, setCustomerCode] = useState("");
  const [passageBusy, setPassageBusy] = useState(false);
  const [passageNote, setPassageNote] = useState<string | null>(null);
  const [cameraOn, setCameraOn] = useState(false);
  const [scanNonce, setScanNonce] = useState(0);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const onScanRef = useRef<(value: string) => void>(() => {});
  /** Ordre de scan de la session (plus récent en premier) */
  const [scannedIds, setScannedIds] = useState<string[]>([]);
  onScanRef.current = (value: string) => {
    setCustomerCode(value);
    setScanNonce((current) => current + 1);
    setCameraOn(false);
  };

  const threshold = program?.visitsPerReward && program.visitsPerReward > 0 ? program.visitsPerReward : null;
  const rewardLabel = program?.rewardLabel?.trim() || "";
  const focused = focusId ? visitCards.find((card) => card.customerId === focusId) ?? null : null;
  const cycleVisits = focused && threshold ? visitCycle(focused.visits, threshold) : 0;
  const filled = threshold ? Math.min(threshold, Math.max(0, cycleVisits)) : 0;

  function rememberScan(customerId: string) {
    setFocusId(customerId);
    setScannedIds((prev) => [customerId, ...prev.filter((id) => id !== customerId)]);
  }

  // Chaque cliente scannée apparaît dans la liste (session + activité récente)
  const scannedList = useMemo(() => {
    const byId = new Map(visitCards.map((card) => [card.customerId, card]));
    const activity = (card: VisitCardRow) =>
      new Date(card.lastActivityAt || card.createdAt).getTime();
    const fromScans = scannedIds
      .map((id) => byId.get(id))
      .filter((card): card is VisitCardRow => Boolean(card));
    const rest = visitCards
      .filter((card) => !scannedIds.includes(card.customerId))
      .sort(
        (a, b) =>
          activity(b) - activity(a) || a.customerName.localeCompare(b.customerName, "fr"),
      );
    return [...fromScans, ...rest];
  }, [visitCards, scannedIds]);

  // Rafraîchir pour voir les clientes qui viennent de scanner le QR d'adhésion
  useEffect(() => {
    const timer = setInterval(() => onRefresh(), 12000);
    return () => clearInterval(timer);
  }, [onRefresh]);

  // Nouvelles cartes (adhésion via QR) → marquées scannées et en tête
  useEffect(() => {
    const recentMs = 3 * 60 * 1000;
    const now = Date.now();
    const freshIds = visitCards
      .filter((card) => {
        const at = new Date(card.lastActivityAt || card.createdAt).getTime();
        return now - at < recentMs;
      })
      .sort(
        (a, b) =>
          new Date(b.lastActivityAt || b.createdAt).getTime() -
          new Date(a.lastActivityAt || a.createdAt).getTime(),
      )
      .map((card) => card.customerId);
    if (!freshIds.length) return;
    setScannedIds((prev) => {
      const merged = [...freshIds, ...prev.filter((id) => !freshIds.includes(id))];
      if (merged.length === prev.length && merged.every((id, i) => id === prev[i])) return prev;
      return merged;
    });
  }, [visitCards]);

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
      const matched = visitCards.find((card) => card.customerName === body.customerName);
      if (matched) rememberScan(matched.customerId);
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
    const video = videoRef.current;
    if (!video || !navigator.mediaDevices?.getUserMedia) return;
    let stopped = false;
    let stream: MediaStream | null = null;
    void (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        if (stopped) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        video.srcObject = stream;
        await video.play();
        const detector = await createQrDetector();
        const tick = async () => {
          if (stopped) return;
          const codes = await detector.detect(video).catch(() => []);
          const value = codes[0]?.rawValue;
          if (value) {
            stopped = true;
            onScanRef.current(value);
            return;
          }
          window.requestAnimationFrame(() => void tick());
        };
        void tick();
      } catch {
        if (!stopped) {
          setCameraOn(false);
          toast("Caméra indisponible. Saisissez le code de la carte.", "error");
        }
      }
    })();
    return () => {
      stopped = true;
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, [cameraOn, toast]);

  function selectCustomer(card: VisitCardRow) {
    rememberScan(card.customerId);
    const code = (card.cardCode || card.promoCode || (card.publicToken ? shortCardCode(card.publicToken) : "")).trim();
    if (!code) return;
    setPassageToken(code);
    setCustomerCode(code);
    setScanNonce((current) => current + 1);
  }

  function showClientCard(preview: LoyaltyScanPreview | null) {
    if (!preview) return;
    rememberScan(preview.customerId);
    setPassageToken(shortCardCode(preview.token));
    onRefresh();
  }

  function startCamera() {
    if (!navigator.mediaDevices?.getUserMedia) {
      document.getElementById("loyalty-card-code")?.focus();
      toast("Caméra indisponible. Saisissez le code de la carte.", "error");
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
              <video
                id="loyalty-camera"
                ref={videoRef}
                className="mt-3 aspect-video w-full rounded-xl bg-black object-cover"
                muted
                playsInline
                autoPlay
              />
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
              scanNonce={scanNonce}
              organizationName={orgName}
              onCodeChange={setCustomerCode}
              onPreview={(preview) => {
                showClientCard(preview);
              }}
              onValidated={() => {
                onRefresh();
              }}
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

        <div className="order-2 min-w-0 lg:order-1">
          <LoyaltyBrandCard
            organizationName={orgName}
            programName={program?.name}
            backgroundUrl={program?.cardBackgroundUrl}
            cycleVisits={focused && threshold ? cycleVisits : null}
            threshold={threshold}
            highlightLabel={focused?.promoCode ? "Code promo" : "Prochaine récompense"}
            highlightValue={focused?.promoCode ? `${focused.promoCode} · soin offert` : rewardLabel}
            qrSrc={joinImage}
            qrAlt="QR fidélité de l'institut"
            qrEmpty={joinBusy ? "…" : "Aucun QR"}
            footerTitle={focused?.customerName || "Aucune cliente sélectionnée"}
            footerSubtitle={focused ? phoneLabel(focused.phone) : "Scannez ou choisissez une carte"}
            action={
              canWrite ? (
                <button type="button" disabled={joinBusy} onClick={() => void regenerateJoin()} className="shrink-0 self-start text-[12px] font-semibold text-[#E8C56B] sm:self-auto">
                  {joinImage ? "Régénérer le QR" : "Générer le QR"}
                </button>
              ) : null
            }
          />
        </div>
      </div>

      <section className="min-w-0">
        <div className="mb-2 flex items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 text-[15px] font-bold">
            <Users size={16} className="text-ink/40" /> Clientes fidélité
          </h2>
          <span className="rounded-full bg-[#FFF1F6] px-2.5 py-0.5 text-[11px] font-bold text-primary">
            {scannedList.length}
          </span>
        </div>
        {scannedList.length === 0 ? (
          <p className="surface p-4 text-sm text-ink/45">Aucune cliente pour le moment.</p>
        ) : (
          <ResponsiveTable
            headers={["Cliente", "Téléphone", "Code", "Passages", "Dernière activité", ""]}
            cards={scannedList.map((card) => (
              <button
                key={card.id}
                type="button"
                onClick={() => router.push(`/customers/${card.customerId}/`)}
                className="surface flex items-start gap-3 p-4 text-left transition hover:border-primary/30"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#F3E4EA] text-[11px] font-bold">
                  {memberInitials(card.customerName)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium text-ink">{card.customerName}</span>
                  <span className="block truncate text-xs text-ink/50">{phoneLabel(card.phone)}</span>
                </span>
                <span className="shrink-0 text-right text-xs font-bold text-[#1B7F4E]">
                  {card.promoCode ? `${card.promoCode} offert` : `${visitCycle(card.visits, card.visitsPerReward)}/${card.visitsPerReward}`}
                </span>
              </button>
            ))}
          >
            {scannedList.map((card) => {
              const justScanned = scannedIds.includes(card.customerId);
              return (
                <tr
                  key={card.id}
                  onClick={() => router.push(`/customers/${card.customerId}/`)}
                  className={`cursor-pointer transition-colors hover:bg-[#FFF7FA] ${card.customerId === focusId ? "bg-[#FFF1F6]" : ""}`}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#F3E4EA] text-[11px] font-bold">
                        {memberInitials(card.customerName)}
                      </span>
                      <span className="truncate font-medium text-ink">{card.customerName}</span>
                      {justScanned ? (
                        <span className="shrink-0 rounded-full bg-primary/15 px-1.5 py-0.5 text-[10px] font-bold text-primary">Scan</span>
                      ) : null}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-ink/70">{phoneLabel(card.phone)}</td>
                  <td className="px-4 py-3 font-mono text-[12px] font-bold tracking-[0.14em] text-ink/70">{card.cardCode || "—"}</td>
                  <td className="px-4 py-3">
                    {card.promoCode ? (
                      <span className="rounded-full bg-[#E8C56B]/40 px-2 py-0.5 text-[11px] font-bold text-[#5D4200]">{card.promoCode} offert</span>
                    ) : (
                      <span className="rounded-full bg-[#EAF8EF] px-2 py-0.5 text-[11px] font-bold text-[#1B7F4E]">
                        {visitCycle(card.visits, card.visitsPerReward)}/{card.visitsPerReward}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-ink/55">{activityWhen(card.lastActivityAt || card.createdAt)}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        selectCustomer(card);
                      }}
                      className="rounded-full bg-[#FFF1F6] px-3 py-1 text-[12px] font-semibold text-primary"
                    >
                      Afficher la carte
                    </button>
                  </td>
                </tr>
              );
            })}
          </ResponsiveTable>
        )}
      </section>
    </div>
  );
}
