"use client";

import { useEffect, useRef, useState } from "react";

type Preview = {
  token: string;
  customerName: string;
  appointmentId: string | null;
  serviceName: string | null;
  amount: number | null;
  visits: number;
  visitsPerReward: number;
  rewardLabel: string;
  rewards: {
    id: string;
    name: string;
    expiresAt: string | null;
    value: number | null;
  }[];
};

type Issued = {
  publicToken: string;
  firstName: string;
  lastName: string;
  cardUrl: string;
};

type CustomerHit = { id: string; firstName: string; lastName: string };

function money(amount: number) {
  return `${amount.toLocaleString("fr-FR")} DH`;
}

function daysLeft(iso: string | null) {
  if (!iso) return null;
  const ms = new Date(iso).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / 86_400_000));
}

function extractToken(value: string) {
  const upper = value.toUpperCase();
  const join = upper.match(/RBJOIN_[A-Z2-9]+/);
  if (join) return join[0];
  const card = upper.match(/RBLOY_[A-Z2-9]+/);
  if (card) return card[0];
  return upper.trim();
}

export function LoyaltyScanPage() {
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<CustomerHit[]>([]);
  const [issued, setIssued] = useState<Issued | null>(null);
  const [token, setToken] = useState("");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [pendingReward, setPendingReward] = useState<Preview["rewards"][number] | null>(null);
  const [issuedCode, setIssuedCode] = useState<string | null>(null);
  const [creditCode, setCreditCode] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [services, setServices] = useState<{ id: string; name: string }[]>([]);
  const [canCredit, setCanCredit] = useState(false);
  const [cameraOn, setCameraOn] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const needle = query.trim();
    if (needle.length < 2) {
      setHits([]);
      return;
    }
    const handle = setTimeout(() => {
      void fetch(`/api/customers/?search=${encodeURIComponent(needle)}&limit=6`)
        .then((res) => res.json())
        .then((body: { data?: CustomerHit[] }) => setHits(body.data ?? []))
        .catch(() => setHits([]));
    }, 250);
    return () => clearTimeout(handle);
  }, [query]);

  useEffect(() => {
    if (!cameraOn || !videoRef.current) return;
    let stop = false;
    let stream: MediaStream | null = null;
    const video = videoRef.current;
    const Detector = (window as unknown as {
      BarcodeDetector?: new (opts: { formats: string[] }) => {
        detect: (source: CanvasImageSource) => Promise<{ rawValue: string }[]>;
      };
    }).BarcodeDetector;

    void (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        video.srcObject = stream;
        await video.play();
        if (!Detector) return;
        const detector = new Detector({ formats: ["qr_code"] });
        const loop = async () => {
          if (stop) return;
          try {
            const codes = await detector.detect(video);
            const raw = codes[0]?.rawValue;
            if (raw) {
              const next = extractToken(raw);
              setToken(next);
              setCameraOn(false);
              void scan(next);
              return;
            }
          } catch {
            /* image pas encore prête */
          }
          requestAnimationFrame(() => void loop());
        };
        void loop();
      } catch {
        setError("La caméra n'est pas disponible. Saisissez le code de la carte.");
        setCameraOn(false);
      }
    })();

    return () => {
      stop = true;
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, [cameraOn]);

  async function issue(customerId: string) {
    setBusy(true);
    setError(null);
    setDone(null);
    try {
      const res = await fetch("/api/loyalty/cards/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerId }),
      });
      const body = (await res.json()) as Issued & { error?: string };
      if (!res.ok) throw new Error(body.error || "Création impossible.");
      setIssued(body);
      setHits([]);
      setQuery("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Création impossible.");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    void fetch("/api/loyalty/credit-code/")
      .then(async (res) => {
        if (!res.ok) {
          setCanCredit(false);
          return;
        }
        const body = (await res.json()) as { services?: { id: string; name: string }[] };
        setCanCredit(true);
        setServices(body.services ?? []);
      })
      .catch(() => setCanCredit(false));
  }, []);

  async function issueCode() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/loyalty/credit-code/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "issue" }),
      });
      const body = (await res.json()) as { code?: string; error?: string };
      if (!res.ok || !body.code) throw new Error(body.error || "Code impossible à générer.");
      setIssuedCode(body.code);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Code impossible à générer.");
    } finally {
      setBusy(false);
    }
  }

  async function scan(rawToken?: string) {
    const next = extractToken(rawToken ?? token);
    setBusy(true);
    setError(null);
    setDone(null);
    setPreview(null);
    if (next.startsWith("RBJOIN_")) {
      setError("Ce QR est pour la cliente. Elle le scanne sans se connecter, et sa carte apparaît dans Cartes de fidélité.");
      setBusy(false);
      return;
    }
    try {
      const res = await fetch(`/api/loyalty/scan/?token=${encodeURIComponent(next)}`);
      const body = (await res.json()) as Preview & { error?: string };
      if (!res.ok) throw new Error(body.error || "Lecture impossible.");
      setPreview(body);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lecture impossible.");
    } finally {
      setBusy(false);
    }
  }

  async function redeem() {
    if (!preview) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/loyalty/credit-code/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "redeem",
          token: preview.token,
          code: creditCode,
          serviceId,
        }),
      });
      const body = (await res.json()) as {
        error?: string;
        customerName?: string;
        serviceName?: string;
        cycle?: number;
        visitsPerReward?: number;
      };
      if (!res.ok) throw new Error(body.error || "Passage impossible.");
      setDone(
        `Passage ajouté. ${body.customerName} · ${body.serviceName}. Carte : ${body.cycle} / ${body.visitsPerReward}.`,
      );
      setPreview(null);
      setCreditCode("");
      setIssuedCode(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Passage impossible.");
    } finally {
      setBusy(false);
    }
  }

  async function confirmRewardUsed() {
    if (!pendingReward) return;
    const rewardId = pendingReward.id;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/loyalty/scan/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "use-reward", rewardId }),
      });
      const body = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(body.error || "Récompense impossible à utiliser.");
      setDone("Récompense confirmée comme utilisée.");
      setPendingReward(null);
      setPreview((current) =>
        current
          ? { ...current, rewards: current.rewards.filter((reward) => reward.id !== rewardId) }
          : current,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Récompense impossible à utiliser.");
    } finally {
      setBusy(false);
    }
  }

  async function validate() {
    if (!preview?.appointmentId) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/loyalty/scan/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: preview.token, appointmentId: preview.appointmentId }),
      });
      const body = (await res.json()) as { error?: string; visits?: number; serviceName?: string; amount?: number; customerName?: string };
      if (!res.ok) throw new Error(body.error || "Validation impossible.");
      setDone(
        `Passage validé. ${body.customerName} · ${body.serviceName} · ${money(body.amount ?? 0)}. Total : ${body.visits} passages.`,
      );
      setPreview(null);
      setToken("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Validation impossible.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-8">
      <div>
        <h1 className="font-display text-3xl font-light text-ink">Carte fidélité</h1>
        <p className="mt-2 text-sm text-ink/65">
          Le passage est crédité automatiquement quand la prestation est terminée et payée. Un code
          institut, valable dix minutes et une seule fois, sert seulement pour une séance
          exceptionnelle. Le QR public n&apos;ajoute jamais de passage.
        </p>
      </div>

      {canCredit ? (
      <section className="surface space-y-3 p-5">
        <h2 className="text-lg font-semibold text-ink">Code institut</h2>
        <button
          type="button"
          disabled={busy}
          onClick={() => void issueCode()}
          className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          Générer un code
        </button>
        {issuedCode ? (
          <p className="text-sm text-ink">
            Code : <span className="font-mono text-lg font-bold tracking-widest">{issuedCode}</span>
            <span className="block text-ink/55">Valable 10 minutes, une seule utilisation.</span>
          </p>
        ) : null}
      </section>
      ) : null}

      <section className="surface space-y-3 p-5">
        <h2 className="text-lg font-semibold text-ink">Émettre une carte</h2>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Nom de la cliente"
          className="w-full rounded-xl border border-line px-3 py-2 text-sm"
        />
        <ul className="space-y-2">
          {hits.map((customer) => (
            <li key={customer.id}>
              <button
                type="button"
                disabled={busy}
                onClick={() => void issue(customer.id)}
                className="w-full rounded-xl border border-line px-3 py-2 text-left text-sm hover:border-primary/40"
              >
                {customer.firstName} {customer.lastName}
              </button>
            </li>
          ))}
        </ul>
        {issued ? (
          <p className="text-sm text-ink">
            Carte de {issued.firstName} {issued.lastName} :{" "}
            <a className="font-semibold text-primary" href={issued.cardUrl}>
              {issued.cardUrl}
            </a>
          </p>
        ) : null}
      </section>

      <section className="surface space-y-3 p-5">
        <h2 className="text-lg font-semibold text-ink">Scanner une carte</h2>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            value={token}
            onChange={(event) => setToken(event.target.value)}
            placeholder="RBLOY_…"
            className="w-full rounded-xl border border-line px-3 py-2 text-sm"
          />
          <button
            type="button"
            onClick={() => setCameraOn((value) => !value)}
            className="rounded-full border border-line px-4 py-2 text-sm font-semibold"
          >
            {cameraOn ? "Fermer la caméra" : "Caméra"}
          </button>
          <button
            type="button"
            disabled={busy || !token.trim()}
            onClick={() => void scan()}
            className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            Lire
          </button>
        </div>
        {cameraOn ? (
          <video ref={videoRef} className="aspect-video w-full rounded-2xl bg-black" muted playsInline />
        ) : null}

        {preview ? (
          <div className="rounded-2xl border border-line p-4 text-sm">
            <p className="font-semibold text-ink">{preview.customerName}</p>
            <p className="mt-1 text-ink/70">
              {preview.visits} passages · prochaine {preview.rewardLabel} à {preview.visitsPerReward}
            </p>
            {preview.appointmentId ? (
              <p className="mt-1 text-ink/70">
                {preview.serviceName} · {money(preview.amount ?? 0)}
              </p>
            ) : (
              <p className="mt-1 text-ink/70">Aucun rendez-vous terminé à valider.</p>
            )}
            {canCredit ? (
            <div className="mt-4 space-y-2 border-t border-line pt-4">
              <p className="font-semibold text-ink">Ajouter un passage exceptionnel</p>
              <select
                value={serviceId}
                onChange={(event) => setServiceId(event.target.value)}
                className="w-full rounded-xl border border-line px-3 py-2 text-sm"
              >
                <option value="">Choisir la prestation</option>
                {services.map((service) => (
                  <option key={service.id} value={service.id}>
                    {service.name}
                  </option>
                ))}
              </select>
              <input
                value={creditCode}
                onChange={(event) => setCreditCode(event.target.value)}
                inputMode="numeric"
                placeholder="Code institut"
                className="w-full rounded-xl border border-line px-3 py-2 text-sm"
              />
              <button
                type="button"
                disabled={busy || !serviceId || creditCode.trim().length < 6}
                onClick={() => void redeem()}
                className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                Ajouter le passage
              </button>
            </div>
            ) : null}
            {preview.rewards.map((reward) => {
              const left = daysLeft(reward.expiresAt);
              return (
                <div key={reward.id} className="mt-3 rounded-2xl bg-[#FFEFF8] p-4">
                  <p className="text-base font-semibold text-ink">Récompense disponible</p>
                  <p className="mt-1 font-display text-2xl text-ink">{reward.name}</p>
                  {reward.value != null ? (
                    <p className="mt-1 text-ink/80">Valeur : {money(reward.value)}</p>
                  ) : null}
                  {left != null ? (
                    <p className="text-ink/70">Expire dans {left} jour{left > 1 ? "s" : ""}</p>
                  ) : null}
                  {pendingReward?.id === reward.id ? (
                    <div className="mt-3 flex gap-2">
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => setPendingReward(null)}
                        className="rounded-full border border-line px-4 py-2 text-sm font-semibold"
                      >
                        Annuler
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void confirmRewardUsed()}
                        className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                      >
                        Confirmer l&apos;utilisation
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => setPendingReward(reward)}
                      className="mt-3 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                    >
                      Utiliser
                    </button>
                  )}
                </div>
              );
            })}
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => setPreview(null)}
                className="rounded-full border border-line px-4 py-2 font-semibold"
              >
                Annuler
              </button>
              {preview.appointmentId ? (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void validate()}
                  className="rounded-full bg-primary px-4 py-2 font-semibold text-white disabled:opacity-50"
                >
                  Valider le passage
                </button>
              ) : null}
            </div>
          </div>
        ) : null}
        {done ? <p className="text-sm font-semibold text-ink">{done}</p> : null}
        {error ? <p className="text-sm text-red-700">{error}</p> : null}
      </section>
    </div>
  );
}
