"use client";

import { motion } from "framer-motion";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AppPageHeader } from "@/components/app/AppUi";
import { useToast } from "@/components/ui/toast";
import { listCustomers } from "@/modules/customers/service";
import { listServices } from "@/modules/services/service";
import {
  createWaitingList,
  listWaitingList,
  updateWaitingListEntryStatus,
} from "@/modules/waiting-list/service";
import {
  WAITING_LIST_STATUS_LABEL,
  type WaitingListEntry,
  type WaitingListStatus,
} from "@/types/waiting-list";

export function WaitingListPageView() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<WaitingListEntry[]>([]);
  const [statusFilter, setStatusFilter] = useState<WaitingListStatus | "">("WAITING");
  const [customers, setCustomers] = useState<{ id: string; label: string }[]>([]);
  const [services, setServices] = useState<{ id: string; name: string }[]>([]);
  const [customerId, setCustomerId] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [preferredDate, setPreferredDate] = useState("");
  const [timeFrom, setTimeFrom] = useState("");
  const [timeTo, setTimeTo] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const res = await listWaitingList({
        status: statusFilter || undefined,
      });
      setItems(res.items);
    } catch {
      toast("Impossible de charger la liste d'attente.", "error");
    }
  }, [statusFilter, toast]);

  useEffect(() => {
    setLoading(true);
    refresh().finally(() => setLoading(false));
  }, [refresh]);

  useEffect(() => {
    listCustomers({ page: 1, limit: 100 })
      .then((r) =>
        setCustomers(
          r.data.map((c) => ({
            id: c.id,
            label: `${c.firstName} ${c.lastName} · ${c.phone}`,
          })),
        ),
      )
      .catch(() => undefined);
    listServices({ page: 1, limit: 100, active: true })
      .then((r) => setServices(r.data.map((s) => ({ id: s.id, name: s.name }))))
      .catch(() => undefined);
  }, []);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!customerId || !serviceId || !preferredDate) return;
    setSubmitting(true);
    try {
      await createWaitingList({
        customerId,
        serviceId,
        preferredDate,
        preferredTimeFrom: timeFrom || null,
        preferredTimeTo: timeTo || null,
      });
      toast("Cliente ajoutée à la liste d'attente.", "success");
      setCustomerId("");
      setPreferredDate("");
      setTimeFrom("");
      setTimeTo("");
      await refresh();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Erreur", "error");
    } finally {
      setSubmitting(false);
    }
  }

  async function setStatus(id: string, status: WaitingListStatus) {
    try {
      await updateWaitingListEntryStatus(id, status);
      await refresh();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Erreur", "error");
    }
  }

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <AppPageHeader
        title="Liste d'attente"
        description="Prévenez les clientes quand un créneau se libère — sans réservation automatique."
        action={
          <Link href="/whatsapp/" className="btn-ghost">
            WhatsApp
          </Link>
        }
      />

      <form
        onSubmit={onCreate}
        className="mb-6 grid gap-3 rounded-2xl border border-line bg-white p-5 sm:grid-cols-2 lg:grid-cols-3"
      >
        <label className="block text-sm sm:col-span-1">
          <span className="mb-1 block font-medium">Cliente</span>
          <select
            className="input w-full"
            value={customerId}
            onChange={(e) => setCustomerId(e.target.value)}
            required
          >
            <option value="">Choisir…</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium">Service</span>
          <select
            className="input w-full"
            value={serviceId}
            onChange={(e) => setServiceId(e.target.value)}
            required
          >
            <option value="">Choisir…</option>
            {services.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium">Date souhaitée</span>
          <input
            type="date"
            className="input w-full"
            value={preferredDate}
            onChange={(e) => setPreferredDate(e.target.value)}
            required
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium">Heure min</span>
          <input
            type="time"
            className="input w-full"
            value={timeFrom}
            onChange={(e) => setTimeFrom(e.target.value)}
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium">Heure max</span>
          <input
            type="time"
            className="input w-full"
            value={timeTo}
            onChange={(e) => setTimeTo(e.target.value)}
          />
        </label>
        <div className="flex items-end">
          <button type="submit" className="btn-primary w-full" disabled={submitting}>
            {submitting ? "…" : "Ajouter"}
          </button>
        </div>
      </form>

      <div className="mb-4 flex flex-wrap gap-2">
        {(["", "WAITING", "NOTIFIED", "BOOKED", "EXPIRED", "CANCELLED"] as const).map(
          (s) => (
            <button
              key={s || "all"}
              type="button"
              onClick={() => setStatusFilter(s)}
              className={`rounded-lg border px-3 py-1.5 text-xs font-medium ${
                statusFilter === s
                  ? "border-primary bg-primary-light text-primary-dark"
                  : "border-line bg-white text-ink/60"
              }`}
            >
              {s ? WAITING_LIST_STATUS_LABEL[s] : "Tous"}
            </button>
          ),
        )}
      </div>

      {loading ? (
        <p className="text-sm text-ink/45">Chargement…</p>
      ) : items.length === 0 ? (
        <p className="rounded-2xl border border-line bg-white p-6 text-sm text-ink/50">
          Aucune entrée.
        </p>
      ) : (
        <ul className="space-y-3">
          {items.map((e) => (
            <li
              key={e.id}
              className="rounded-2xl border border-line bg-white p-5 text-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-medium">{e.customerName}</p>
                  <p className="text-ink/55">
                    {e.serviceName} · {e.preferredDate}
                    {e.preferredTimeFrom
                      ? ` · ${e.preferredTimeFrom}${e.preferredTimeTo ? `–${e.preferredTimeTo}` : ""}`
                      : ""}
                  </p>
                  <p className="mt-1 font-mono text-[10px] text-ink/35">{e.customerPhone}</p>
                </div>
                <span className="rounded-lg bg-[#FBF4F6] px-2 py-1 text-[11px] font-semibold">
                  {WAITING_LIST_STATUS_LABEL[e.status]}
                </span>
              </div>
              {e.status === "WAITING" || e.status === "NOTIFIED" ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {e.status === "NOTIFIED" ? (
                    <Link href="/whatsapp/" className="btn-ghost text-xs">
                      Ouvrir WhatsApp
                    </Link>
                  ) : null}
                  <button
                    type="button"
                    className="btn-ghost text-xs"
                    onClick={() => setStatus(e.id, "BOOKED")}
                  >
                    Marquer réservée
                  </button>
                  <button
                    type="button"
                    className="btn-ghost text-xs text-red-600"
                    onClick={() => setStatus(e.id, "CANCELLED")}
                  >
                    Annuler
                  </button>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </motion.div>
  );
}
