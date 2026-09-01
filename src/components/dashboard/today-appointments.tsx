"use client";

import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { TODAY_APPTS } from "@/lib/app-mock";

export function TodayAppointments() {
  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Rendez-vous aujourd&apos;hui</CardTitle>
          <p className="mt-1 text-sm text-ink/45">
            {TODAY_APPTS.length} rendez-vous affichés · 12 programmés
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

      <div className="divide-y divide-line">
        {TODAY_APPTS.map((appointment, index) => (
          <motion.div
            key={`${appointment.time}-${appointment.client}`}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.12 + index * 0.06 }}
            className="flex items-center gap-4 p-4 transition hover:bg-[#FBF4F6]/80"
          >
            <div className="w-14 shrink-0 font-mono text-sm font-bold text-ink">
              {appointment.time}
            </div>
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary-light to-[#FFF1D6] text-sm font-bold text-primary">
              {appointment.client.charAt(0)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{appointment.client}</p>
              <p className="mt-0.5 truncate text-xs text-ink/45">
                {appointment.service} · {appointment.staff}
              </p>
            </div>
            <Badge
              className="hidden sm:inline-flex"
              variant={appointment.status === "Confirmé" ? "success" : "warning"}
            >
              {appointment.status}
            </Badge>
          </motion.div>
        ))}
      </div>
    </Card>
  );
}
