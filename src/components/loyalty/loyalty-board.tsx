"use client";

import { useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";
import {
  Camera,
  Clock,
  Crown,
  ExternalLink,
  Gift,
  Plus,
  Settings,
  Ticket,
  UserRound,
  Users,
} from "lucide-react";
import { LoyaltyScanPage } from "@/components/loyalty/loyalty-scan-page";
import type { VisitCardRow } from "@/components/loyalty/visit-cards-list";
import { journalKind, memberInitials, rewardTypeLabel } from "@/components/loyalty/loyalty-helpers";
import { useToast } from "@/components/ui/toast";
import type {
  LoyaltyAccountSummary,
  LoyaltyJournalItem,
  LoyaltyProgramConfig,
  LoyaltyRewardItem,
  LoyaltyRewardType,
} from "@/types/loyalty";

type ServiceOption = { id: string; name: string };

function phoneLabel(phone: string | null | undefined) {
  if (!phone || phone.startsWith("WL")) return "Sans téléphone";
  return phone;
}

function activityWhen(iso: string) {
  return new Date(iso).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Africa/Casablanca",
  });
}

export function LoyaltyBoard({
  orgName,
  canWrite,
  canRedeem,
  program,
  visitCards,
  ranking,
  rewards,
  journal,
  services,
  onRefresh,
  onOpenSettings,
  onCreateReward,
  onRedeem,
}: {
  orgName: string;
  canWrite: boolean;
  canRedeem: boolean;
  program: LoyaltyProgramConfig | null;
  visitCards: VisitCardRow[];
  ranking: LoyaltyAccountSummary[];
  rewards: LoyaltyRewardItem[];
  journal: LoyaltyJournalItem[];
  services: ServiceOption[];
  onRefresh: () => void;
  onOpenSettings: () => void;
  onCreateReward: (input: {
    name: string;
    pointsCost: number;
    type: LoyaltyRewardType;
    value?: number;
  }) => Promise<string | null>;
  onRedeem: (customerId: string, rewardId: string) => Promise<string | null>;
}) {
  const { toast } = useToast();
  const [focusId, setFocusId] = useState<string | null>(null);
  const [joinImage, setJoinImage] = useState<string | null>(null);
  const [joinUrl, setJoinUrl] = useState<string | null>(null);
  const [joinBusy, setJoinBusy] = useState(false);
  const [serviceId, setServiceId] = useState("");
  const [passageToken, setPassageToken] = useState("");
  const [tempCode, setTempCode] = useState<string | null>(null);
  const [passageBusy, setPassageBusy] = useState(false);
  const [passageNote, setPassageNote] = useState<string | null>(null);
  const [rewardCustomerId, setRewardCustomerId] = useState("");
  const [rewardId, setRewardId] = useState("");
  const [rewardBusy, setRewardBusy] = useState(false);
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState<LoyaltyRewardType>("FREE_SERVICE");
  const [newCost, setNewCost] = useState("");
  const [newValue, setNewValue] = useState("");
  const [creating, setCreating] = useState(false);
  const [cameraOn, setCameraOn] = useState(false);

  const threshold = program?.visitsPerReward && program.visitsPerReward > 0 ? program.visitsPerReward : null;
  const rewardLabel = program?.rewardLabel?.trim() || "";
  const focused = focusId ? visitCards.find((card) => card.customerId === focusId) ?? null : null;
  const filled = focused && threshold ? Math.min(threshold, Math.max(0, focused.visits)) : 0;
  const loyal = useMemo(
    () => [...visitCards].sort((a, b) => b.visits - a.visits || a.customerName.localeCompare(b.customerName, "fr")).slice(0, 5),
    [visitCards],
  );
  const activeRewards = rewards.filter((reward) => reward.active);
  const eligible =
    !serviceId ||
    !program?.eligibleServiceIds?.length ||
    program.eligibleServiceIds.includes(serviceId);

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
        const url = `${window.location.origin}/carte/rejoindre/${token}/`;
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
      const url = `${window.location.origin}/carte/rejoindre/${data.qr.token}/`;
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

  async function issueCode() {
    setPassageBusy(true);
    setPassageNote(null);
    try {
      const res = await fetch("/api/loyalty/credit-code/", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "issue" }),
      });
      const body = (await res.json()) as { code?: string; error?: string };
      if (!res.ok || !body.code) throw new Error(body.error || "Code temporaire indisponible.");
      setTempCode(body.code);
    } catch (error) {
      toast(error instanceof Error ? error.message : "Code temporaire indisponible.", "error");
    } finally {
      setPassageBusy(false);
    }
  }

  async function addPassage() {
    if (!passageToken.trim() || !tempCode || !serviceId) return;
    setPassageBusy(true);
    setPassageNote(null);
    try {
      const res = await fetch("/api/loyalty/credit-code/", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "redeem",
          token: passageToken,
          code: tempCode,
          serviceId,
        }),
      });
      const body = (await res.json()) as { error?: string; customerName?: string; visits?: number; visitsPerReward?: number };
      if (!res.ok) throw new Error(body.error || "Passage impossible.");
      setPassageNote(`${body.customerName} · ${body.visits ?? 0} / ${body.visitsPerReward ?? threshold ?? "—"}`);
      setTempCode(null);
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
    <div className="mx-auto w-full max-w-[1180px] space-y-4">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="text-[12px] text-ink/45">
            Fidélité <span className="px-1">›</span> <span className="text-ink/70">Carte de fidélité</span>
          </p>
          <h1 className="mt-1 text-[26px] font-semibold tracking-tight text-ink sm:text-[32px]">Carte de fidélité</h1>
          <p className="mt-1 max-w-xl text-[13px] text-ink/55 sm:text-sm">
            Gérez votre programme de fidélité, ajoutez des passages et récompensez vos clientes.
          </p>
        </div>
        {joinUrl ? (
          <a
            href={joinUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-full border border-[#F3D5E2] bg-white px-4 text-[13px] font-semibold text-ink"
          >
            Voir la page publique
            <ExternalLink size={14} />
          </a>
        ) : null}
      </header>

      <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(280px,0.85fr)]">
        <article
          className="relative min-w-0 overflow-hidden rounded-3xl p-5 text-white shadow-md sm:p-6"
          style={{ background: "linear-gradient(145deg, #4A1024 0%, #7A1838 48%, #3A0E1E 100%)" }}
        >
          <div className="pointer-events-none absolute -right-8 -top-10 h-40 w-40 rounded-full bg-[#E8C56B]/10" />
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <Crown className="text-[#E8C56B]" size={28} />
              <p className="mt-3 font-display text-[22px] uppercase tracking-[0.18em] text-[#E8C56B] sm:text-[28px]">
                {orgName}
              </p>
              {program?.name && program.name !== orgName ? (
                <p className="text-[11px] uppercase tracking-[0.22em] text-white/55">{program.name}</p>
              ) : null}
            </div>
            <p className="shrink-0 text-right text-[10px] font-bold uppercase tracking-[0.16em] text-white/70">
              Carte
              <br />
              fidélité
            </p>
          </div>
          <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
              <p className="text-[13px] text-white/70">Vos passages</p>
              <p className="mt-1 text-[28px] font-semibold">
                {focused && threshold ? `${focused.visits} / ${threshold}` : "—"}
              </p>
              {focused && threshold ? (
                <div className="mt-2 flex max-w-full flex-wrap gap-1.5">
                  {Array.from({ length: Math.min(threshold, 12) }, (_, index) => (
                    <span
                      key={index}
                      className={index < Math.min(filled, 12) ? "h-3.5 w-3.5 rounded-full bg-[#E8C56B]" : "h-3.5 w-3.5 rounded-full border border-white/40"}
                    />
                  ))}
                </div>
              ) : null}
            </div>
            <div className="flex min-w-0 items-end gap-3">
              <div className="min-w-0 rounded-2xl bg-black/25 px-3 py-2">
                <p className="text-[11px] text-[#E8C56B]">Prochaine récompense</p>
                <p className="truncate text-sm font-semibold">{rewardLabel || "—"}</p>
              </div>
              <div className="shrink-0 rounded-xl bg-white p-1.5">
                {joinImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={joinImage} alt="QR fidélité de l'institut" className="h-16 w-16 sm:h-20 sm:w-20" />
                ) : (
                  <div className="flex h-16 w-16 items-center justify-center text-center text-[10px] text-ink/50 sm:h-20 sm:w-20">
                    {joinBusy ? "…" : "Aucun QR"}
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="mt-6 flex items-end justify-between gap-3 border-t border-white/15 pt-4">
            <div className="min-w-0">
              <p className="truncate text-lg font-semibold">{focused?.customerName || "Aucune cliente sélectionnée"}</p>
              <p className="text-sm text-white/70">{focused ? phoneLabel(focused.phone) : "Scannez ou choisissez une carte"}</p>
            </div>
            {canWrite ? (
              <button type="button" disabled={joinBusy} onClick={() => void regenerateJoin()} className="shrink-0 text-[12px] font-semibold text-[#E8C56B]">
                {joinImage ? "Régénérer le QR" : "Générer le QR"}
              </button>
            ) : null}
          </div>
        </article>

        <div className="grid min-w-0 gap-3">
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
              onPreview={(preview) => {
                if (!preview) return;
                const match = visitCards.find((card) => card.customerName === preview.customerName);
                if (match) setFocusId(match.customerId);
                setPassageToken(preview.token);
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
                <p className="text-[12px] text-ink/55">Un code temporaire à usage unique est exigé.</p>
              </div>
            </div>
            {canWrite ? (
              <div className="mt-3 grid gap-2">
                <select className={field} value={serviceId} onChange={(event) => setServiceId(event.target.value)}>
                  <option value="">Prestation…</option>
                  {services.map((service) => (
                    <option key={service.id} value={service.id}>
                      {service.name}
                    </option>
                  ))}
                </select>
                <p className="text-[12px] font-semibold text-[#1B7F4E]">
                  {serviceId && eligible ? "Service éligible détecté" : "Choisissez une prestation éligible"}
                </p>
                <input
                  className={field}
                  value={passageToken}
                  onChange={(event) => setPassageToken(event.target.value)}
                  placeholder="Code carte RBLOY…"
                  autoComplete="off"
                />
                {tempCode ? <p className="text-sm font-bold tracking-[0.2em] text-ink">Code {tempCode}</p> : null}
                {passageNote ? <p className="text-[12px] font-semibold text-[#1B7F4E]">{passageNote}</p> : null}
                <div className="flex flex-col gap-2 sm:flex-row">
                  <button
                    type="button"
                    disabled={passageBusy}
                    onClick={() => void issueCode()}
                    className="h-10 flex-1 rounded-xl bg-white text-[13px] font-semibold text-[#1B7F4E]"
                  >
                    Code temporaire
                  </button>
                  <button
                    type="button"
                    disabled={passageBusy || !tempCode || !serviceId || !passageToken.trim() || !eligible}
                    onClick={() => void addPassage()}
                    className="h-10 flex-1 rounded-xl bg-[#1B7F4E] text-[13px] font-semibold text-white disabled:opacity-50"
                  >
                    Ajouter le passage
                  </button>
                </div>
              </div>
            ) : (
              <p className="mt-3 text-[12px] text-ink/50">Réservé à l&apos;équipe autorisée.</p>
            )}
          </section>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <section className="min-w-0 rounded-2xl bg-[#FFF1F6] p-4">
          <div className="flex items-start gap-3">
            <Gift className="shrink-0 text-primary" size={18} />
            <div>
              <h2 className="text-[15px] font-bold">Récompenser une cliente</h2>
              <p className="text-[12px] text-ink/55">Utilisez une récompense du catalogue.</p>
            </div>
          </div>
          {canRedeem ? (
            <form
              className="mt-3 flex flex-col gap-2 sm:flex-row"
              onSubmit={(event) => {
                event.preventDefault();
                if (!rewardCustomerId || !rewardId) return;
                setRewardBusy(true);
                void onRedeem(rewardCustomerId, rewardId).then((error) => {
                  setRewardBusy(false);
                  if (!error) {
                    setRewardId("");
                    onRefresh();
                  }
                });
              }}
            >
              <select className={field} value={rewardCustomerId} onChange={(event) => setRewardCustomerId(event.target.value)}>
                <option value="">Cliente…</option>
                {ranking.map((member) => (
                  <option key={member.customerId} value={member.customerId}>
                    {member.customerName}
                  </option>
                ))}
              </select>
              <select className={field} value={rewardId} onChange={(event) => setRewardId(event.target.value)}>
                <option value="">Récompense…</option>
                {activeRewards.map((reward) => (
                  <option key={reward.id} value={reward.id}>
                    {reward.name}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                disabled={rewardBusy || !rewardCustomerId || !rewardId}
                className="h-11 shrink-0 rounded-xl bg-primary px-4 text-sm font-semibold text-white disabled:opacity-50"
              >
                Appliquer
              </button>
            </form>
          ) : (
            <p className="mt-3 text-[12px] text-ink/50">Consultation seule.</p>
          )}
        </section>

        <section className="min-w-0 rounded-2xl border border-[#F3D5E2] bg-white p-4 shadow-sm">
          <div className="flex items-start gap-3">
            <Ticket className="shrink-0 text-primary" size={18} />
            <div>
              <h2 className="text-[15px] font-bold">Générer une récompense</h2>
              <p className="text-[12px] text-ink/55">Elle rejoint le catalogue utilisable au comptoir.</p>
            </div>
          </div>
          {canWrite ? (
            <form
              className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2"
              onSubmit={(event) => {
                event.preventDefault();
                setCreating(true);
                void onCreateReward({
                  name: newName,
                  pointsCost: Number(newCost) || 0,
                  type: newType,
                  value: newValue.trim() ? Number(newValue) : undefined,
                }).then((error) => {
                  setCreating(false);
                  if (!error) {
                    setNewName("");
                    setNewValue("");
                    onRefresh();
                  }
                });
              }}
            >
              <label className="text-[11px] font-semibold text-ink/50">
                Type de récompense
                <select className={`${field} mt-1`} value={newType} onChange={(event) => setNewType(event.target.value as LoyaltyRewardType)}>
                  <option value="FREE_SERVICE">Soin offert</option>
                  <option value="DISCOUNT_FIXED">Remise MAD</option>
                  <option value="DISCOUNT_PERCENT">Remise %</option>
                </select>
              </label>
              <label className="text-[11px] font-semibold text-ink/50">
                Nom
                <input className={`${field} mt-1`} value={newName} onChange={(event) => setNewName(event.target.value)} placeholder="Soin visage offert" />
              </label>
              <label className="text-[11px] font-semibold text-ink/50">
                Points requis
                <input className={`${field} mt-1`} inputMode="numeric" value={newCost} onChange={(event) => setNewCost(event.target.value)} />
              </label>
              <label className="text-[11px] font-semibold text-ink/50">
                Valeur
                <input className={`${field} mt-1`} inputMode="numeric" value={newValue} onChange={(event) => setNewValue(event.target.value)} placeholder="MAD ou %" />
              </label>
              <button
                type="submit"
                disabled={creating || !newName.trim()}
                className="h-11 rounded-xl bg-primary text-sm font-semibold text-white disabled:opacity-50 sm:col-span-2"
              >
                Générer la récompense
              </button>
            </form>
          ) : (
            <p className="mt-3 text-[12px] text-ink/50">Réservé à l&apos;équipe autorisée.</p>
          )}
        </section>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <section className="min-w-0 rounded-2xl border border-[#F3D5E2] bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 text-[15px] font-bold">
              <Clock size={16} className="text-ink/40" /> Dernières activités
            </h2>
          </div>
          {journal.length === 0 ? (
            <p className="text-sm text-ink/45">Aucun mouvement pour l&apos;instant.</p>
          ) : (
            <ul className="divide-y divide-[#FFF1F6]">
              {journal.slice(0, 5).map((row) => {
                const card = visitCards.find((item) => item.customerId === row.customerId);
                return (
                  <li key={row.id} className="flex items-center gap-3 py-2.5">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#FFF1F6] text-[11px] font-bold text-primary">
                      {memberInitials(row.customerName)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{row.customerName}</p>
                      <p className="truncate text-[12px] text-ink/45">{journalKind(row)}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-[11px] text-ink/40">{activityWhen(row.createdAt)}</p>
                      <p className="mt-1 inline-flex rounded-full bg-[#EAF8EF] px-2 py-0.5 text-[11px] font-bold text-[#1B7F4E]">
                        {card ? `${card.visits} / ${card.visitsPerReward}` : `${row.points > 0 ? "+" : ""}${row.points} pts`}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="min-w-0 rounded-2xl border border-[#F3D5E2] bg-white p-4 shadow-sm">
          <h2 className="mb-1 flex items-center gap-2 text-[15px] font-bold">
            <Users size={16} className="text-ink/40" /> Clientes fidèles
          </h2>
          <p className="mb-2 text-[12px] text-ink/45">Classement par nombre de passages.</p>
          {loyal.length === 0 ? (
            <p className="text-sm text-ink/45">Aucune carte pour le moment.</p>
          ) : (
            <ol className="space-y-2">
              {loyal.map((card, index) => (
                <li key={card.id}>
                  <button
                    type="button"
                    onClick={() => setFocusId(card.customerId)}
                    className="flex w-full items-center gap-3 rounded-xl px-1 py-1 text-left hover:bg-[#FFF1F6]"
                  >
                    <span className="w-5 text-sm font-bold text-ink/35">{index + 1}</span>
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#F3E4EA] text-[11px] font-bold">
                      {memberInitials(card.customerName)}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm font-semibold">{card.customerName}</span>
                    <span className="shrink-0 text-[12px] text-ink/55">
                      {card.visits} / {card.visitsPerReward} passages
                    </span>
                  </button>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <section className="min-w-0 rounded-2xl border border-[#F3D5E2] bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-[15px] font-bold">
              <Settings size={16} className="text-ink/40" /> Paramètres de fidélité
            </h2>
            {canWrite ? (
              <button type="button" onClick={onOpenSettings} className="inline-flex items-center gap-1 text-[13px] font-semibold text-primary">
                <Settings size={14} /> Modifier
              </button>
            ) : null}
          </div>
          <dl className="space-y-3 text-sm">
            <div className="flex items-center justify-between gap-3">
              <dt className="text-ink/55">Programme</dt>
              <dd className="truncate font-semibold">{program?.name || "—"}</dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-ink/55">Nombre de passages</dt>
              <dd className="font-semibold">{threshold ?? "—"}</dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-ink/55">Récompense principale</dt>
              <dd className="truncate font-semibold">{rewardLabel || "—"}</dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-ink/55">Statut</dt>
              <dd className="font-semibold">{program ? (program.active ? "Actif" : "Inactif") : "—"}</dd>
            </div>
          </dl>
        </section>

        <section className="min-w-0 rounded-2xl border border-[#F3D5E2] bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-[15px] font-bold">Récompenses en cours</h2>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[320px] text-left text-[12px]">
              <thead>
                <tr className="text-ink/40">
                  <th className="pb-2 font-semibold">Récompense</th>
                  <th className="pb-2 font-semibold">Type</th>
                  <th className="pb-2 font-semibold">Utilisations</th>
                  <th className="pb-2 font-semibold">Statut</th>
                </tr>
              </thead>
              <tbody>
                {rewards.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-3 text-ink/45">
                      Aucune récompense.
                    </td>
                  </tr>
                ) : (
                  rewards.slice(0, 6).map((reward) => (
                    <tr key={reward.id} className="border-t border-[#FFF1F6]">
                      <td className="max-w-[140px] truncate py-2 font-semibold">{reward.name}</td>
                      <td className="py-2 text-ink/60">{rewardTypeLabel(reward.type)}</td>
                      <td className="py-2">
                        {reward.redemptionCount}
                        {reward.maxRedemptions != null ? ` / ${reward.maxRedemptions}` : ""}
                      </td>
                      <td className="py-2">
                        <span className={reward.active ? "font-semibold text-[#1B7F4E]" : "text-ink/40"}>
                          {reward.active ? "Actif" : "Inactif"}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
