"use client";

import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { APPOINTMENT_STATUS_LABEL } from "@/modules/appointments/constants";
import type { Appointment } from "@/types/appointment";

type TodayAppointmentsProps = {
  appointments: Appointment[];
  loading?: boolean;
};

function displayCustomer(name: string) {
  const t = name.trim();
  return t || "Cliente inconnue";
}

function displayStaff(name: string) {
  const t = name.trim();
  return t || "Employée inconnue";
}

export function TodayAppointments({ appointments, loading }: TodayAppointmentsProps) {
  const preview = appointments.slice(0, 8);

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Rendez-vous aujourd&apos;hui</CardTitle>
          <p className="mt-1 text-sm text-ink/45">
            {loading ? "Chargement…" : `${appointments.length} rendez-vous`}
          </p>
        </div>
        <Link
          href="/agenda/"
          className="flex items-center gap-1 text-sm font-semibold text-primary hover:text-primary-dark"
        >
          Voir agenda
          <ArrowRight size={16} />
        </Link>
      </CardHeader>

      {loading ? (
        <p className="p-4 text-sm text-ink/45">Chargement…</p>
      ) : preview.length === 0 ? (
        <p className="p-4 text-sm text-ink/45">Aucun rendez-vous aujourd&apos;hui.</p>
      ) : (
        <div className="divide-y divide-line">
          {preview.map((appointment, index) => {
            const customer = displayCustomer(appointment.customerName);
            const staff = displayStaff(appointment.staffName);
            const time = new Date(appointment.startAt).toLocaleTimeString("fr-FR", {
              hour: "2-digit",
              minute: "2-digit",
            });
            const confirmed =
              appointment.status === "CONFIRMED" ||
              appointment.status === "ARRIVED" ||
              appointment.status === "IN_PROGRESS" ||
              appointment.status === "COMPLETED";

            return (
              <motion.div
                key={appointment.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.12 + index * 0.06 }}
                className="flex items-center gap-4 p-4 transition hover:bg-[#FBF4F6]/80"
              >
                <div className="w-14 shrink-0 font-mono text-sm font-bold text-ink">{time}</div>
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary-light to-[#FFF1D6] text-sm font-bold text-primary">
                  {customer.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{customer}</p>
                  <p className="mt-0.5 truncate text-xs text-ink/45">
                    {appointment.serviceName || "Service"} · {staff}
                  </p>
                </div>
                <Badge className="hidden sm:inline-flex" variant={confirmed ? "success" : "warning"}>
                  {APPOINTMENT_STATUS_LABEL[appointment.status]}
                </Badge>
              </motion.div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
