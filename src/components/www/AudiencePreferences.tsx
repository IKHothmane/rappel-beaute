"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import "./audience-preferences.css";

const STORAGE_KEY = "rb:audience-consent:v1";
const PREFERENCES_EVENT = "rb:audience-preferences";
const GA_ID = "G-SNZEX2P7KK";
const GTM_ID = "GTM-WZGGKNPG";
type Choice = "granted" | "denied";
type AnalyticsWindow = Window & {
  dataLayer?: unknown[];
  gtag?: (...args: unknown[]) => void;
};

function loadAudienceScripts() {
  if (document.querySelector('script[data-rb-audience="gtag"]')) return;
  const analytics = window as AnalyticsWindow;
  analytics.dataLayer ??= [];
  analytics.gtag ??= function () {
    analytics.dataLayer!.push(arguments);
  };
  Object.assign(window, { [`ga-disable-${GA_ID}`]: false });
  analytics.gtag("consent", "default", {
    analytics_storage: "denied",
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
  });
  analytics.gtag("consent", "update", { analytics_storage: "granted" });
  analytics.gtag("js", new Date());
  analytics.gtag("config", GA_ID);
  analytics.dataLayer.push({ "gtm.start": Date.now(), event: "gtm.js" });
  for (const [name, src] of [
    ["gtag", `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`],
    ["gtm", `https://www.googletagmanager.com/gtm.js?id=${GTM_ID}`],
  ]) {
    const script = document.createElement("script");
    script.async = true;
    script.src = src;
    script.dataset.rbAudience = name;
    document.head.appendChild(script);
  }
}

function disableAudience() {
  Object.assign(window, { [`ga-disable-${GA_ID}`]: true });
  (window as AnalyticsWindow).gtag?.("consent", "update", {
    analytics_storage: "denied",
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
  });
  const parts = window.location.hostname.split(".");
  const domains = [
    "",
    ...parts.slice(0, -1).map((_, index) => `; domain=${parts.slice(index).join(".")}`),
  ];
  const segments = window.location.pathname.split("/").filter(Boolean);
  const paths = new Set(["/"]);
  for (let index = 1; index <= segments.length; index++) {
    const prefix = `/${segments.slice(0, index).join("/")}`;
    paths.add(prefix);
    paths.add(`${prefix}/`);
  }
  for (const item of document.cookie.split(";")) {
    const name = item.trim().split("=")[0];
    if (!/^(_ga(?:_|$)|_gid$|_gat(?:_|$)|_gcl_)/.test(name)) continue;
    for (const domain of domains) {
      for (const path of paths) {
        document.cookie = `${name}=; Max-Age=0; path=${path}${domain}; SameSite=Lax`;
      }
    }
  }
}

export function AudiencePreferencesButton() {
  return (
    <button
      type="button"
      className="audience-preferences-button"
      onClick={() => window.dispatchEvent(new Event(PREFERENCES_EVENT))}
    >
      Préférences cookies
    </button>
  );
}

export function AudiencePreferences() {
  const [open, setOpen] = useState(false);
  const [choice, setChoice] = useState<Choice | null>(null);
  const previousFocus = useRef<HTMLElement | null>(null);

  useEffect(() => {
    let stored: string | null = null;
    try {
      stored = localStorage.getItem(STORAGE_KEY);
    } catch {
      /* Storage can be unavailable. */
    }
    if (stored === "granted" || stored === "denied") {
      setChoice(stored);
      if (stored === "granted") loadAudienceScripts();
      else disableAudience();
    } else setOpen(true);
    const showPreferences = () => {
      previousFocus.current =
        document.activeElement instanceof HTMLElement ? document.activeElement : null;
      setOpen(true);
    };
    window.addEventListener(PREFERENCES_EVENT, showPreferences);
    return () => window.removeEventListener(PREFERENCES_EVENT, showPreferences);
  }, []);

  function save(next: Choice) {
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* The choice still applies to this page. */
    }
    setChoice(next);
    setOpen(false);
    if (next === "granted") loadAudienceScripts();
    else {
      disableAudience();
      // Unload a previously accepted container, including its already executed scripts.
      if (choice === "granted") {
        window.location.reload();
        return;
      }
    }
    previousFocus.current?.focus({ preventScroll: true });
  }

  if (!open) return null;
  return (
    <section className="audience-banner" aria-labelledby="audience-title">
      <div>
        <h2 id="audience-title">Votre choix pour la mesure d’audience</h2>
        <p>
          Avec votre accord, Google Analytics et Google Tag Manager nous aident à comprendre les
          visites du site. Vous pouvez refuser et continuer votre navigation.
        </p>
        <Link href="/confidentialite/#cookies">En savoir plus</Link>
      </div>
      <div className="audience-actions">
        <button type="button" onClick={() => save("denied")}>
          Refuser
        </button>
        <button type="button" onClick={() => save("granted")}>
          Accepter
        </button>
        {choice && (
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              previousFocus.current?.focus({ preventScroll: true });
            }}
          >
            Fermer
          </button>
        )}
      </div>
    </section>
  );
}
