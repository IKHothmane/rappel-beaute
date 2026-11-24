"use client";

import type { ReactNode } from "react";
import { customerWhatsappMessage, whatsappHref } from "./customers-helpers";

type Props = {
  phone?: string | null;
  firstName: string;
  orgName?: string | null;
  className?: string;
  disabled?: boolean;
  children: ReactNode;
};

export function SendCustomerWhatsAppButton({ phone, firstName, orgName, className, disabled, children }: Props) {
  const href = whatsappHref(phone, firstName, customerWhatsappMessage(firstName, orgName));
  if (disabled || !href) {
    return <button type="button" className={className} disabled>{children}</button>;
  }

  return (
    <a href={href} target="_blank" rel="noreferrer" className={className}>
      {children}
    </a>
  );
}
