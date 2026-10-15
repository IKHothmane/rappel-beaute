"use client";

import { useState, type ReactNode } from "react";
import { customerWhatsappMessage } from "@/components/customers/customers-helpers";
import { useToast } from "@/components/ui/toast";
import { sendCustomerWhatsApp } from "@/modules/whatsapp/service";

export function SendCustomerWhatsAppButton({
  customerId,
  firstName,
  orgName,
  className,
  children,
}: {
  customerId: string;
  firstName: string;
  orgName?: string | null;
  className?: string;
  children: ReactNode;
}) {
  const { toast } = useToast();
  const [sending, setSending] = useState(false);

  async function send() {
    if (sending) return;
    setSending(true);
    const result = await sendCustomerWhatsApp(
      customerId,
      customerWhatsappMessage(firstName, orgName),
    );
    setSending(false);
    if (!result.ok) {
      toast(result.error, "error");
      return;
    }
    toast("Message envoyé.", "success");
  }

  return (
    <button type="button" className={className} disabled={sending} onClick={() => void send()}>
      {sending ? "Envoi…" : children}
    </button>
  );
}
