"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { GoogleLogo, stripQueryParam } from "@/components/auth/google-auth";
import { WrongHostNotice, readWrongHost, type WrongHost } from "@/components/auth/auth-ui";

type Status = { linked: boolean; hasPassword: boolean; email: string | null };
type Notice = { tone: "success" | "info" | "error"; text: string };

const LINK_NOTICES: Record<string, Notice> = {
  linked: {
    tone: "success",
    text: "Compte Google lié. Vous pouvez maintenant vous connecter avec Google.",
  },
  already_linked: { tone: "info", text: "Un compte Google est déjà lié à votre compte." },
  in_use: {
    tone: "error",
    text: "Ce compte Google est déjà utilisé par un autre compte Rappel Beauty.",
  },
  cancelled: { tone: "info", text: "Liaison avec Google annulée. Votre compte n'a pas été modifié." },
  failed: { tone: "error", text: "La liaison avec Google a échoué. Réessayez." },
};

const noticeClass: Record<Notice["tone"], string> = {
  success: "border-emerald-200 bg-emerald-50 text-emerald-800",
  info: "border-line bg-paper text-ink/70",
  error: "border-rose-200 bg-rose-50 text-rose-800",
};

const FOCUSABLE =
  'a[href],button:not([disabled]),input:not([disabled]),[tabindex]:not([tabindex="-1"])';

/** Boîte de dialogue modale (focus piégé, Échap, retour du focus). Compense html { zoom: 0.8 } via rb-fullscreen-overlay. */
function Dialog({
  title,
  onClose,
  busy,
  children,
}: {
  title: string;
  onClose: () => void;
  busy: boolean;
  children: ReactNode;
}) {
  const titleId = useId();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const node = ref.current;
    (
      node?.querySelector<HTMLElement>("[data-autofocus]") ??
      node?.querySelector<HTMLElement>(FOCUSABLE)
    )?.focus();
    return () => {
      document.body.style.overflow = overflow;
      previous?.focus?.();
    };
  }, []);

  useEffect(() => {
    // Sur le document : Échap fonctionne même si le focus est retombé sur <body>.
    const onEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) onClose();
    };
    document.addEventListener("keydown", onEscape);
    return () => document.removeEventListener("keydown", onEscape);
  }, [busy, onClose]);

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key !== "Tab") return;
    const items = Array.from(ref.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? []);
    if (!items.length) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  return (
    <div
      className="rb-fullscreen-overlay fixed z-[80] flex items-end justify-center bg-black/30 p-4 sm:items-center"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !busy) onClose();
      }}
    >
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onKeyDown={onKeyDown}
        className="max-h-[88vh] w-full max-w-md overflow-y-auto rounded-2xl border border-line bg-white p-5 shadow-soft"
      >
        <h2 id={titleId} className="font-display text-lg font-semibold">
          {title}
        </h2>
        {children}
      </div>
    </div>
  );
}

export function GoogleSecurityCard() {
  // `null` tant que le statut n'est pas lu ; `"hidden"` si Google est désactivé (404) ou la session invalide.
  const [status, setStatus] = useState<Status | "hidden" | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [dialog, setDialog] = useState<"link" | "unlink" | null>(null);
  const [password, setPassword] = useState("");
  const [dialogError, setDialogError] = useState<string | null>(null);
  const [wrongHost, setWrongHost] = useState<WrongHost | null>(null);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);

  const load = useCallback(async () => {
    setLoadError(false);
    try {
      const res = await fetch("/api/auth/google/status/", {
        credentials: "include",
        cache: "no-store",
      });
      if (res.status === 404 || res.status === 401 || res.status === 403) {
        setStatus("hidden");
        return;
      }
      if (!res.ok) throw new Error("status");
      const data = (await res.json()) as Partial<Status>;
      setStatus({
        linked: data.linked === true,
        hasPassword: data.hasPassword === true,
        email: typeof data.email === "string" ? data.email : null,
      });
    } catch {
      setLoadError(true);
    }
  }, []);

  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get("google_link");
    if (code) {
      setNotice(LINK_NOTICES[code] ?? LINK_NOTICES.failed);
      stripQueryParam("google_link");
    }
    void load();
  }, [load]);

  function closeDialog() {
    if (busyRef.current) return;
    setDialog(null);
    setPassword("");
    setDialogError(null);
    setWrongHost(null);
  }

  async function startLink(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busyRef.current || !password) return;
    busyRef.current = true;
    setBusy(true);
    setDialogError(null);
    setWrongHost(null);
    let navigating = false;
    try {
      const res = await fetch("/api/auth/google/link/start/", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password, next: "/security/" }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        url?: string;
        code?: string;
        error?: string;
        host?: string;
        origin?: string;
      };
      const host = readWrongHost(data);
      if (host) {
        // Le cookie de liaison n'existe que sur l'hôte officiel : on propose de rouvrir cette page là-bas.
        setWrongHost(host);
        return;
      }
      if (res.ok && typeof data.url === "string" && /^https:\/\//i.test(data.url)) {
        navigating = true;
        window.location.assign(data.url);
        return;
      }
      if (data.code === "INVALID_PASSWORD") {
        setDialogError("Mot de passe incorrect.");
        return;
      }
      busyRef.current = false;
      if (data.code === "ALREADY_LINKED") {
        setDialog(null);
        setPassword("");
        setNotice(LINK_NOTICES.already_linked);
        await load();
        return;
      }
      if (data.code === "NO_PASSWORD") {
        setDialog(null);
        setPassword("");
        await load();
        return;
      }
      setDialogError(
        res.status === 429
          ? "Trop de tentatives. Réessayez plus tard."
          : "Impossible de lancer la liaison Google. Réessayez.",
      );
    } catch {
      setDialogError("Réseau indisponible. Réessayez.");
    } finally {
      if (!navigating) {
        busyRef.current = false;
        setBusy(false);
      }
    }
  }

  async function unlink(e?: FormEvent<HTMLFormElement>) {
    e?.preventDefault();
    const needsPassword = Boolean(status && status !== "hidden" && status.hasPassword);
    if (busyRef.current || (needsPassword && !password)) return;
    busyRef.current = true;
    setBusy(true);
    setDialogError(null);
    try {
      const res = await fetch("/api/auth/google/unlink/", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(needsPassword ? { password } : {}),
      });
      const data = (await res.json().catch(() => ({}))) as { code?: string; error?: string };
      if (data.code === "INVALID_PASSWORD" || data.code === "CURRENT_PASSWORD_REQUIRED") {
        setDialogError(
          data.code === "CURRENT_PASSWORD_REQUIRED" ? "Saisissez votre mot de passe actuel." : "Mot de passe incorrect.",
        );
        busyRef.current = false;
        setBusy(false);
        // État périmé côté client : recharger pour afficher le champ mot de passe.
        if (data.code === "CURRENT_PASSWORD_REQUIRED") void load();
        return;
      }
      if (data.code === "REAUTH_REQUIRED") {
        setDialogError("Pour votre sécurité, reconnectez-vous puis réessayez.");
        busyRef.current = false;
        setBusy(false);
        return;
      }
      setPassword("");
      if (res.ok) {
        setNotice({ tone: "success", text: "Google a été délié de votre compte." });
      } else if (data.code === "NOT_LINKED") {
        setNotice({ tone: "info", text: "Aucun compte Google n'était lié." });
      } else if (data.code === "LAST_LOGIN_METHOD") {
        setNotice({
          tone: "error",
          text: "Ajoutez un mot de passe ou vérifiez votre e-mail avant de délier Google : c'est votre seul moyen de connexion.",
        });
      } else if (res.status === 429) {
        setNotice({ tone: "error", text: "Trop de tentatives. Réessayez plus tard." });
      } else {
        setNotice({ tone: "error", text: "Impossible de délier Google. Réessayez." });
      }
      busyRef.current = false;
      setBusy(false);
      setDialog(null);
      await load();
    } catch {
      busyRef.current = false;
      setBusy(false);
      setDialogError("Réseau indisponible. Réessayez.");
    }
  }

  if (status === "hidden") return null;

  return (
    <section
      aria-labelledby="google-card-title"
      className="surface mb-4 max-w-md space-y-3 p-5 text-sm"
    >
      <div className="flex items-center gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-line bg-white">
          <GoogleLogo />
        </span>
        <div className="min-w-0">
          <h2 id="google-card-title" className="font-medium text-ink">
            Connexion avec Google
          </h2>
          {status ? (
            <p className="text-xs text-ink/55">
              {status.linked ? "Compte Google lié" : "Aucun compte Google lié"}
            </p>
          ) : null}
        </div>
      </div>

      {notice ? (
        <p role="status" className={`rounded-lg border px-3 py-2 ${noticeClass[notice.tone]}`}>
          {notice.text}
        </p>
      ) : null}

      {loadError ? (
        <div role="alert" className="space-y-2">
          <p className="text-ink/65">Impossible de lire l’état de la connexion Google.</p>
          <button type="button" className="btn-ghost" onClick={() => void load()}>
            Réessayer
          </button>
        </div>
      ) : status === null ? (
        <p className="text-ink/55" role="status">
          Chargement…
        </p>
      ) : status.linked ? (
        <>
          <p className="text-ink/65">
            Vous pouvez vous connecter en un clic avec Google
            {status.email ? (
              <>
                {" "}
                (compte <span className="font-medium text-ink">{status.email}</span>)
              </>
            ) : null}
            .
          </p>
          <button type="button" className="btn-ghost" onClick={() => setDialog("unlink")}>
            Délier
          </button>
        </>
      ) : status.hasPassword ? (
        <>
          <p className="text-ink/65">
            Liez votre compte Google pour vous connecter sans saisir votre mot de passe. Par
            sécurité, nous vous demandons votre mot de passe actuel.
          </p>
          <button type="button" className="btn-ghost" onClick={() => setDialog("link")}>
            Lier mon compte Google
          </button>
        </>
      ) : (
        <div className="space-y-2 text-ink/65">
          <p>
            Ce compte n’a pas de mot de passe : pour lier Google, nous devons d’abord vérifier votre
            identité avec un mot de passe. Définissez-en un, puis revenez ici.
          </p>
          <p className="flex flex-wrap gap-x-4 gap-y-1">
            <a href="#password" className="font-semibold text-primary">
              Définir un mot de passe
            </a>
            <Link href="/forgot-password/" className="font-semibold text-primary/80">
              Mot de passe oublié ?
            </Link>
          </p>
        </div>
      )}

      {dialog === "link" ? (
        <Dialog title="Lier mon compte Google" onClose={closeDialog} busy={busy}>
          <form onSubmit={startLink} method="post" action="/security/" className="mt-3 space-y-4">
            <p className="text-sm text-ink/65">
              Saisissez votre mot de passe actuel, puis vous serez redirigé vers Google pour
              confirmer.
            </p>
            <label className="block text-sm">
              <span className="mb-1.5 block font-medium">Mot de passe actuel</span>
              <input
                data-autofocus
                type="password"
                name="current-password"
                autoComplete="current-password"
                required
                maxLength={200}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                readOnly={busy}
                aria-invalid={Boolean(dialogError)}
                aria-describedby={dialogError ? "google-link-error" : undefined}
                className="w-full rounded-lg border border-line px-3 py-2.5 outline-none focus:border-primary"
              />
            </label>
            {wrongHost ? (
              <WrongHostNotice
                wrongHost={wrongHost}
                path="/security/"
                className="space-y-1 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-rose-800"
                linkClassName="font-semibold underline"
              />
            ) : null}
            {dialogError ? (
              <p
                id="google-link-error"
                role="alert"
                className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-rose-800"
              >
                {dialogError}
              </p>
            ) : null}
            <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
              <button type="button" className="btn-ghost" onClick={closeDialog} disabled={busy}>
                Annuler
              </button>
              <button
                type="submit"
                className="btn-primary"
                disabled={busy || !password}
                aria-busy={busy}
              >
                {busy ? "Redirection…" : "Continuer vers Google"}
              </button>
            </div>
          </form>
        </Dialog>
      ) : null}

      {dialog === "unlink" ? (
        <Dialog title="Délier Google ?" onClose={closeDialog} busy={busy}>
          <form onSubmit={unlink} method="post" action="/security/">
          <p className="mt-3 text-sm text-ink/65">
            Vous ne pourrez plus vous connecter avec Google. Vous garderez votre e-mail et votre mot
            de passe.
          </p>
          {status?.hasPassword ? (
            <label className="mt-3 block text-sm">
              <span className="mb-1.5 block font-medium">Mot de passe actuel</span>
              <input
                data-autofocus
                type="password"
                name="current-password"
                autoComplete="current-password"
                required
                maxLength={200}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                readOnly={busy}
                aria-invalid={Boolean(dialogError)}
                className="w-full rounded-lg border border-line px-3 py-2.5 outline-none focus:border-primary"
              />
            </label>
          ) : null}
          {dialogError ? (
            <p
              role="alert"
              className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-rose-800"
            >
              {dialogError}
            </p>
          ) : null}
          <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              data-autofocus={status?.hasPassword ? undefined : true}
              className="btn-ghost"
              onClick={closeDialog}
              disabled={busy}
            >
              Annuler
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={busy || Boolean(status?.hasPassword && !password)}
              aria-busy={busy}
            >
              {busy ? "Déliaison…" : "Délier Google"}
            </button>
          </div>
          </form>
        </Dialog>
      ) : null}
    </section>
  );
}
