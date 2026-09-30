"use client";

import { useCallback, useEffect, useState } from "react";
import { CalendarCheck } from "lucide-react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import {
  disconnectGoogleCalendar,
  getGoogleCalendarStatus,
  listGoogleCalendarOptions,
  selectGoogleCalendar,
  syncAgendaToGoogle,
} from "@/modules/google-calendar/service";
import type { GoogleCalendarOption, GoogleCalendarStatus } from "@/types/google-calendar";

type Props = {
  compact?: boolean;
  className?: string;
  autoOpenOnReturn?: boolean;
};

export function GoogleCalendarConnect({
  compact = false,
  className,
  autoOpenOnReturn = !compact,
}: Props) {
  const { toast } = useToast();
  const [status, setStatus] = useState<GoogleCalendarStatus | null>(null);
  const [calendars, setCalendars] = useState<GoogleCalendarOption[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [confirmOff, setConfirmOff] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const next = await getGoogleCalendarStatus();
      setStatus(next);
      return next;
    } catch {
      setStatus(null);
      return null;
    }
  }, []);

  const loadCalendars = useCallback(async (currentId?: string | null) => {
    try {
      const items = await listGoogleCalendarOptions();
      setCalendars(items);
      setSelectedId(currentId || items.find((c) => c.primary)?.id || items[0]?.id || "");
    } catch {
      setCalendars([]);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!autoOpenOnReturn) return;
    const sp = new URLSearchParams(window.location.search);
    if (sp.get("google") !== "connected") return;
    void (async () => {
      const next = await refresh();
      if (next?.connected && next.canManage) {
        setOpen(true);
        await loadCalendars(next.calendarId);
        try {
          const result = await syncAgendaToGoogle();
          toast(
            result.synced > 0
              ? `${result.synced} rendez-vous envoyés vers Google Calendar.`
              : "Compte Google lié. Les prochains RDV iront dans ce calendrier.",
            "success",
          );
        } catch {
          toast("Compte lié. La synchro des RDV existants a échoué — réessayez.", "error");
        }
      }
    })();
  }, [autoOpenOnReturn, loadCalendars, refresh]);

  function connect() {
    if (status && !status.configured) {
      toast(
        "Google Calendar n'est pas configuré. Ajoutez GOOGLE_CLIENT_ID et GOOGLE_CLIENT_SECRET.",
        "error",
      );
      return;
    }
    window.location.href = "/api/integrations/google-calendar/connect/";
  }

  async function openPanel() {
    const next = await refresh();
    if (!next?.connected) {
      connect();
      return;
    }
    setOpen(true);
    await loadCalendars(next.calendarId);
  }

  async function saveCalendar() {
    const chosen = calendars.find((c) => c.id === selectedId);
    if (!chosen) return;
    setBusy(true);
    try {
      const result = await selectGoogleCalendar(chosen.id, chosen.name);
      await refresh();
      setOpen(false);
      toast(
        result.synced > 0
          ? `Calendrier ${chosen.name} : ${result.synced} rendez-vous synchronisés.`
          : `Calendrier de l'institut : ${chosen.name}. Les nouveaux RDV iront dans Google.`,
        "success",
      );
    } catch (e) {
      toast(e instanceof Error ? e.message : "Impossible d'enregistrer le calendrier.", "error");
    } finally {
      setBusy(false);
    }
  }

  async function runSync() {
    setBusy(true);
    try {
      const result = await syncAgendaToGoogle();
      toast(
        result.synced > 0
          ? `${result.synced} rendez-vous envoyés vers Google Calendar.`
          : "Aucun rendez-vous à venir à synchroniser.",
        "success",
      );
    } catch (e) {
      toast(e instanceof Error ? e.message : "Synchronisation impossible.", "error");
    } finally {
      setBusy(false);
    }
  }

  async function disconnect() {
    setBusy(true);
    try {
      await disconnectGoogleCalendar();
      setConfirmOff(false);
      setOpen(false);
      await refresh();
      toast("Google Calendar déconnecté pour cet institut.", "info");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Déconnexion impossible.", "error");
    } finally {
      setBusy(false);
    }
  }

  const connected = Boolean(status?.connected);
  const canManage = Boolean(status?.canManage);
  const orgName = status?.orgName?.trim() || "cet institut";
  const label = connected
    ? status?.calendarName || status?.email || "Google connecté"
    : "Calendrier de l'institut";

  return (
    <>
      <button
        type="button"
        onClick={() => (canManage ? void openPanel() : undefined)}
        disabled={!status || !canManage}
        title={
          connected
            ? `Calendrier Google de ${orgName}${status?.email ? ` · ${status.email}` : ""}`
            : `Lier le calendrier Google de ${orgName}`
        }
        className={cn(
          compact
            ? "flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#F6E3EF] text-primary shadow-sm"
            : "inline-flex h-10 max-w-[240px] items-center gap-2 rounded-lg bg-[#FBF4F6] px-3 text-sm font-semibold text-ink hover:bg-[#F0DDE9]",
          className,
        )}
      >
        <span
          className={cn(
            "rounded-full",
            compact ? "sr-only" : "inline-flex h-2 w-2 shrink-0",
            connected ? "bg-emerald-500" : "bg-ink/25",
          )}
        />
        <CalendarCheck size={compact ? 18 : 16} className={connected ? "text-emerald-600" : "text-ink/55"} />
        {compact ? <span className="sr-only">{label}</span> : <span className="truncate">{label}</span>}
      </button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={`Calendrier Google · ${orgName}`}
      >
        <p className="text-sm text-ink/65">
          Les rendez-vous de <strong>{orgName}</strong> s&apos;affichent ici et dans Google Calendar
          (création, déplacement, annulation). Chaque institut a son propre calendrier.
        </p>
        {status?.email ? (
          <p className="mt-2 text-xs font-semibold text-ink/50">Compte Google : {status.email}</p>
        ) : null}

        {calendars.length > 0 ? (
          <ul className="mt-4 max-h-56 space-y-1 overflow-y-auto">
            {calendars.map((cal) => (
              <li key={cal.id}>
                <label
                  className={cn(
                    "flex cursor-pointer items-start gap-3 rounded-xl px-3 py-2.5 hover:bg-[#FBF4F6]",
                    selectedId === cal.id && "bg-[#FBF4F6]",
                  )}
                >
                  <input
                    type="radio"
                    name="google-calendar"
                    className="mt-1"
                    checked={selectedId === cal.id}
                    onChange={() => setSelectedId(cal.id)}
                  />
                  <span>
                    <span className="block text-sm font-semibold text-ink">{cal.name}</span>
                    {cal.primary ? (
                      <span className="text-[11px] font-bold uppercase tracking-wide text-ink/40">
                        Principal
                      </span>
                    ) : null}
                  </span>
                </label>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 text-sm text-ink/50">Aucun calendrier Google listé pour ce compte.</p>
        )}

        <div className="mt-5 flex flex-col gap-2">
          <button
            type="button"
            disabled={busy || !selectedId}
            onClick={() => void saveCalendar()}
            className="h-10 rounded-lg bg-primary text-sm font-semibold text-white disabled:opacity-50"
          >
            Utiliser ce calendrier
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void runSync()}
            className="h-10 rounded-lg bg-[#FBF4F6] text-sm font-semibold text-ink"
          >
            Synchroniser l&apos;agenda vers Google
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={connect}
            className="h-10 rounded-lg bg-[#FBF4F6] text-sm font-semibold text-ink"
          >
            Changer de compte Google
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => setConfirmOff(true)}
            className="h-10 text-sm font-semibold text-red-600"
          >
            Déconnecter cet institut
          </button>
        </div>
      </Modal>

      <ConfirmDialog
        open={confirmOff}
        title="Déconnecter Google Calendar ?"
        description={`Les rendez-vous de ${orgName} ne seront plus envoyés dans Google. Les autres instituts ne sont pas concernés.`}
        confirmLabel="Déconnecter"
        destructive
        loading={busy}
        onConfirm={() => void disconnect()}
        onCancel={() => setConfirmOff(false)}
      />
    </>
  );
}
