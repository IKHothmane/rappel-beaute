"use client";

import { useEffect, useState } from "react";
import {
  REQUEST_PERMISSION_ON_LOAD,
  permissionDecision,
  type BrowserPermission,
  type PushPreferences,
} from "@/lib/push/eligibility";

const DEFAULTS: PushPreferences = {
  loyaltyReward: true,
  loyaltyProgress: false,
  reviewRequest: true,
  rewardExpiry: true,
  offers: false,
};

const LABELS: { key: keyof PushPreferences; label: string }[] = [
  { key: "loyaltyReward", label: "Récompense disponible" },
  { key: "loyaltyProgress", label: "Progression de la carte" },
  { key: "reviewRequest", label: "Demande d'avis après un rendez-vous" },
  { key: "rewardExpiry", label: "Rappel avant expiration d'une récompense" },
  { key: "offers", label: "Offres de l'institut" },
];

function urlBase64ToUint8Array(value: string) {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

export function CustomerPushPanel({ token }: { token: string }) {
  const [supported, setSupported] = useState(false);
  const [configured, setConfigured] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [phone, setPhone] = useState("");
  const [subscribed, setSubscribed] = useState(false);
  const [preferences, setPreferences] = useState<PushPreferences>(DEFAULTS);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setSupported("serviceWorker" in navigator && "PushManager" in window && "Notification" in window);
    if (REQUEST_PERMISSION_ON_LOAD) return;
    let cancelled = false;
    void fetch(`/api/public/push/status/?cardToken=${encodeURIComponent(token)}`)
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (cancelled || !data) return;
        setConfigured(Boolean(data.configured));
        setAuthorized(Boolean(data.authorized));
        setSubscribed(Boolean(data.subscribed));
        if (data.preferences) setPreferences(data.preferences);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [token]);

  function toggle(key: keyof PushPreferences) {
    setPreferences((current) => ({ ...current, [key]: !current[key] }));
  }

  async function authorize() {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/public/push/authorize/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cardToken: token, phone }),
      });
      if (!response.ok) {
        setAuthorized(false);
        setMessage(
          response.status === 403
            ? "Ce numéro ne correspond pas à cette carte."
            : "Vérification impossible.",
        );
        return;
      }
      setAuthorized(true);
      setMessage("Numéro confirmé. Vous pouvez maintenant activer les notifications.");
    } finally {
      setBusy(false);
    }
  }

  async function enable() {
    if (REQUEST_PERMISSION_ON_LOAD || !supported) return;
    setBusy(true);
    setMessage("");
    try {
      const config = await fetch("/api/public/push/config/").then((response) => response.json());
      if (!config.configured || !config.publicKey) {
        setConfigured(false);
        setMessage("Les notifications ne sont pas encore activées sur le serveur.");
        return;
      }
      const current = (
        "Notification" in window ? Notification.permission : "unsupported"
      ) as BrowserPermission;
      const decision = permissionDecision(current, true);
      if (decision === "denied" || decision === "blocked") {
        setMessage("Le navigateur a refusé les notifications. Vous pouvez les autoriser dans ses réglages.");
        return;
      }
      const permission = decision === "granted" ? "granted" : await Notification.requestPermission();
      if (permission !== "granted") {
        setMessage("Permission refusée. Aucune notification ne sera envoyée.");
        return;
      }
      const registration = await navigator.serviceWorker.register("/sw.js");
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(config.publicKey),
      });
      const json = subscription.toJSON();
      const response = await fetch("/api/public/push/subscribe/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cardToken: token,
          endpoint: subscription.endpoint,
          p256dh: json.keys?.p256dh,
          auth: json.keys?.auth,
          expirationTime: subscription.expirationTime,
          preferences,
        }),
      });
      if (!response.ok) {
        setMessage("L'abonnement n'a pas pu être enregistré.");
        return;
      }
      setSubscribed(true);
      setMessage("Notifications activées.");
    } finally {
      setBusy(false);
    }
  }

  async function savePreferences() {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/public/push/preferences/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cardToken: token, preferences }),
      });
      setMessage(response.ok ? "Préférences enregistrées." : "Préférences non enregistrées.");
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/public/push/unsubscribe/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cardToken: token }),
      });
      if (!response.ok) {
        setMessage("La désactivation a échoué.");
        return;
      }
      const registration = await navigator.serviceWorker.getRegistration("/sw.js");
      const subscription = await registration?.pushManager.getSubscription();
      await subscription?.unsubscribe();
      setSubscribed(false);
      setMessage("Notifications désactivées.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <article className="mt-6 rounded-3xl border border-line bg-white p-6 shadow-md">
      <h2 className="font-display text-2xl font-light text-ink">Notifications</h2>
      <p className="mt-2 text-sm text-ink/70">
        Activez-les pour être prévenue quand une récompense est disponible, avant qu&apos;elle n&apos;expire, et pour
        donner votre avis après un rendez-vous. La progression et les offres restent désactivées tant que vous ne
        les choisissez pas. Sur iPhone, ajoutez d&apos;abord ce site à l&apos;écran d&apos;accueil, puis rouvrez-le
        depuis cette icône.
      </p>
      {!supported ? (
        <p className="mt-4 text-sm text-ink/60">Ce navigateur ne prend pas en charge les notifications.</p>
      ) : null}
      {!configured ? (
        <p className="mt-4 text-sm text-ink/60">Les notifications ne sont pas encore activées sur le serveur.</p>
      ) : null}
      <ul className="mt-4 space-y-2 text-sm text-ink">
        {LABELS.map((item) => (
          <li key={item.key}>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={preferences[item.key]}
                onChange={() => toggle(item.key)}
              />
              {item.label}
            </label>
          </li>
        ))}
      </ul>
      <div className="mt-5 flex flex-col gap-2">
        {!authorized ? (
          <>
            <label className="text-sm text-ink" htmlFor="push-phone">
              Téléphone de la carte
            </label>
            <input
              id="push-phone"
              type="tel"
              autoComplete="tel"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              className="rounded-2xl border border-line px-4 py-3 text-sm"
              placeholder="06 00 00 00 00"
            />
            <button
              type="button"
              onClick={() => void authorize()}
              disabled={busy || phone.trim().length < 8}
              className="rounded-full bg-primary px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"
            >
              Vérifier mon numéro
            </button>
          </>
        ) : !subscribed ? (
          <button
            type="button"
            onClick={() => void enable()}
            disabled={busy || !supported || !configured || !authorized}
            className="rounded-full bg-primary px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"
          >
            Activer les notifications
          </button>
        ) : (
          <>
            <button
              type="button"
              onClick={() => void savePreferences()}
              disabled={busy}
              className="rounded-full bg-primary px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"
            >
              Enregistrer mes choix
            </button>
            <button
              type="button"
              onClick={() => void disable()}
              disabled={busy}
              className="rounded-full border border-line px-4 py-3 text-sm font-semibold text-ink"
            >
              Désactiver les notifications
            </button>
          </>
        )}
      </div>
      {message ? <p className="mt-3 text-sm text-ink/70">{message}</p> : null}
    </article>
  );
}
