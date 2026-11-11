"use client";

import { useState, type FormEvent } from "react";
import { Send } from "lucide-react";
import { SITE } from "@/lib/site";

export function FooterEmailForm() {
  const [opened, setOpened] = useState(false);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const email = String(new FormData(event.currentTarget).get("email") || "").trim();
    const subject = "Nouveautés Rappel Beauty";
    const body = `Bonjour,\n\nJe souhaite être informé(e) des nouveautés, conseils et offres de Rappel Beauty.\nMon adresse e-mail : ${email}\n\nMerci.`;
    window.location.href = `mailto:${SITE.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    setOpened(true);
  }

  return (
    <>
      <form className="footer-email-form" onSubmit={onSubmit}>
        <label className="sr-only" htmlFor="footer-email">Votre adresse e-mail</label>
        <input id="footer-email" name="email" type="email" autoComplete="email" required maxLength={254} placeholder="Votre adresse e-mail" />
        <button type="submit" aria-label="Demander les nouveautés par e-mail"><Send size={22} aria-hidden="true" /></button>
      </form>
      <p className="footer-form-note" role="status">
        {opened ? "Votre messagerie s’ouvre pour envoyer votre demande." : "Demande via votre application e-mail."}
      </p>
    </>
  );
}
