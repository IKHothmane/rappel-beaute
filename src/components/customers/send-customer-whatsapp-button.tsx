"use client";

import { useRef, useState, type ReactNode } from "react";
import { customerWhatsappMessage } from "@/components/customers/customers-helpers";
import { useToast } from "@/components/ui/toast";
import { sendIndividualWhatsApp } from "@/modules/whatsapp/service";

type Props = {
  className?: string;
  children: ReactNode;
  disabled?: boolean;
} & (
  | { customerId: string; firstName: string; orgName?: string | null }
  | { appointmentId: string }
);

export function SendCustomerWhatsAppButton(props: Props) {
  const { toast } = useToast();
  const [sending, setSending] = useState(false);
  const inFlight = useRef(false);

  async function send() {
    if (inFlight.current || props.disabled) return;
    inFlight.current = true;
    setSending(true);
    const result = await sendIndividualWhatsApp(
      "appointmentId" in props
        ? { type: "APPOINTMENT_REMINDER", appointmentId: props.appointmentId }
        : {
            type: "REACTIVATION",
            customerId: props.customerId,
            message: customerWhatsappMessage(props.firstName, props.orgName),
          },
    );
    inFlight.current = false;
    setSending(false);
    if (!result.ok) {
      toast(result.error, "error");
      return;
    }
    toast(
      result.alreadySent ? "Ce rappel a déjà été envoyé." : "Message accepté par le service WhatsApp.",
      "success",
    );
  }

  return (
    <button
      type="button"
      className={props.className}
      disabled={props.disabled || sending}
      aria-busy={sending}
      onClick={() => void send()}
    >
      {sending ? "Envoi…" : props.children}
    </button>
  );
}
