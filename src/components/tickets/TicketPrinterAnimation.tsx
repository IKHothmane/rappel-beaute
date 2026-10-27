"use client";

import { useEffect, useState } from "react";
import { printBeautyTicket } from "@/components/tickets/print-beauty-ticket";
import "./TicketPrinterAnimation.css";

export type TicketLine = {
  name: string;
  detail?: string;
  quantity?: number;
  price: number;
};

export type BeautyTicket = {
  instituteName?: string;
  ticketNumber: string;
  date: string;
  clientName: string;
  employeeName?: string;
  paymentMethod?: string;
  lines: TicketLine[];
  total: number;
  currency?: string;
};

type Props = {
  ticket: BeautyTicket;
  /** payment = règlement déjà enregistré ; service = clôture de prestation */
  mode?: "payment" | "service";
  onComplete?: () => void | Promise<void>;
  onPrint?: (ticket: BeautyTicket) => void | Promise<void>;
  onShare?: (ticket: BeautyTicket) => void | Promise<void>;
  onClose?: () => void;
};

const money = (value: number, currency: string) =>
  `${value.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`;

export default function TicketPrinterAnimation({
  ticket,
  mode = "service",
  onComplete,
  onPrint,
  onShare,
}: Props) {
  const [printing, setPrinting] = useState(false);
  const [printed, setPrinted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [paperKey, setPaperKey] = useState(0);
  const currency = ticket.currency ?? "DH";
  const isPayment = mode === "payment";

  const startPrintAnimation = () => {
    // 1) papier à height 0 (sans classe is-printing)
    setPrinted(false);
    setPrinting(false);
    setPaperKey((k) => k + 1);
    // 2) après un court délai, lancer l’animation d’éjection
    window.setTimeout(() => {
      setPrinting(true);
    }, 120);
  };

  useEffect(() => {
    if (!printing) return;
    const timer = window.setTimeout(() => {
      setPrinting(false);
      setPrinted(true);
    }, 2300);
    return () => window.clearTimeout(timer);
  }, [printing, paperKey]);

  // Paiements : le ticket sort dès l’ouverture (animation visible).
  useEffect(() => {
    if (!isPayment) return;
    const boot = window.setTimeout(() => startPrintAnimation(), 80);
    return () => window.clearTimeout(boot);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- rejouer à chaque ouverture / ticket
  }, [isPayment, ticket.ticketNumber]);

  const finishService = async () => {
    if (busy || printing) return;
    setBusy(true);
    try {
      await onComplete?.();
      startPrintAnimation();
    } catch (error) {
      console.error("Impossible de générer le ticket :", error);
      window.alert("Le ticket n’a pas pu être généré. Veuillez réessayer.");
    } finally {
      setBusy(false);
    }
  };

  const printAgain = async () => {
    if (onPrint) return onPrint(ticket);
    printBeautyTicket(ticket);
  };

  const shareTicket = async () => {
    if (onShare) return onShare(ticket);
    const text = [
      ticket.instituteName ?? "Rappel Beauty",
      `Ticket ${ticket.ticketNumber}`,
      `Cliente : ${ticket.clientName}`,
      ...ticket.lines.map(
        (line) => `${line.name} — ${money(line.price * (line.quantity ?? 1), currency)}`,
      ),
      `Total : ${money(ticket.total, currency)}`,
    ].join("\n");

    if (navigator.share) {
      await navigator.share({ title: "Ticket Rappel Beauty", text });
    } else if (navigator.clipboard) {
      await navigator.clipboard.writeText(text);
      window.alert("Résumé du ticket copié. Vous pouvez le coller dans WhatsApp.");
    } else {
      window.alert(text);
    }
  };

  return (
    <section
      className={`rb-ticket-demo ${isPayment ? "rb-ticket-minimal" : ""}`}
      aria-label="Génération du ticket de caisse"
    >
      {!isPayment ? (
        <header className="rb-ticket-header">
          <div className="rb-brand-mark" aria-hidden="true">
            R
          </div>
          <div className="min-w-0 flex-1">
            <p className="rb-eyebrow">RAPPEL BEAUTY</p>
            <h2>Clôture de prestation</h2>
            <p className="rb-subtitle">Un ticket élégant, prêt en quelques secondes.</p>
          </div>
        </header>
      ) : null}

      <div
        className={`rb-printer-stage ${printing ? "is-printing" : ""} ${printed ? "is-printed" : ""}`}
      >
        {!isPayment ? <div className="rb-printer-glow" /> : null}
        <div className="rb-ticket-paper" aria-live="polite" key={`paper-${paperKey}`}>
          <div className="rb-paper-content" id="payment-ticket-print">
            <div className="rb-paper-brand">
              {ticket.instituteName ?? "Institut de beauté"}
            </div>
            <div className="rb-paper-small">Ticket de caisse</div>
            <div className="rb-paper-rule" />
            <div className="rb-paper-row">
              <span>Ticket</span>
              <strong>{ticket.ticketNumber}</strong>
            </div>
            <div className="rb-paper-row">
              <span>Date</span>
              <span>{ticket.date}</span>
            </div>
            <div className="rb-paper-row">
              <span>Cliente</span>
              <strong>{ticket.clientName}</strong>
            </div>
            <div className="rb-paper-rule" />
            {ticket.lines.map((line, index) => (
              <div className="rb-paper-line" key={`${line.name}-${index}`}>
                <div>
                  <strong>{line.name}</strong>
                  {line.detail ? <small>{line.detail}</small> : null}
                  {(line.quantity ?? 1) > 1 ? <small>Qté : {line.quantity}</small> : null}
                </div>
                <span>{money(line.price * (line.quantity ?? 1), currency)}</span>
              </div>
            ))}
            <div className="rb-paper-rule" />
            <div className="rb-paper-total">
              <span>TOTAL</span>
              <strong>{money(ticket.total, currency)}</strong>
            </div>
            {ticket.paymentMethod ? (
              <div className="rb-paper-small">Paiement : {ticket.paymentMethod}</div>
            ) : null}
            <div className="rb-paper-thanks">Merci pour votre visite ♡</div>
            <div className="rb-paper-small">À bientôt chez vous.</div>
          </div>
        </div>

        <div className="rb-printer">
          <div className="rb-printer-top">
            <span className="rb-printer-brand">Rappel Beauty</span>
            <span className="rb-printer-led" />
          </div>
          <div className="rb-printer-slot">
            <span />
          </div>
          <div className="rb-printer-front">
            <div className="rb-printer-logo">R</div>
            <div className="rb-printer-model">BEAUTY RECEIPT</div>
            <div className="rb-printer-button">
              <span />
            </div>
          </div>
          <div className="rb-printer-foot rb-left-foot" />
          <div className="rb-printer-foot rb-right-foot" />
        </div>

        <div className="rb-print-status">
          <span
            className={`rb-status-dot ${printing ? "active" : printed ? "done" : ""}`}
          />
          {printing
            ? "Impression en cours…"
            : printed
              ? "Ticket généré avec succès"
              : "Prêt à imprimer"}
        </div>
      </div>

      {!isPayment ? (
        <div className="rb-ticket-summary">
          <div>
            <span className="rb-summary-label">Cliente</span>
            <strong>{ticket.clientName}</strong>
          </div>
          <div>
            <span className="rb-summary-label">Prestations</span>
            <strong>{ticket.lines.length}</strong>
          </div>
          <div className="rb-summary-total">
            <span className="rb-summary-label">Total</span>
            <strong>{money(ticket.total, currency)}</strong>
          </div>
        </div>
      ) : null}

      {isPayment ? (
        printing ? (
          <p className="rb-print-hint print:hidden">Le ticket sort de la machine…</p>
        ) : printed ? (
          <div className="rb-ticket-actions print:hidden">
            <button className="rb-primary-action" type="button" onClick={printAgain}>
              Imprimer le ticket
            </button>
            <button className="rb-secondary-action" type="button" onClick={shareTicket}>
              Partager le ticket
            </button>
            <button
              className="rb-text-action"
              type="button"
              onClick={startPrintAnimation}
            >
              Rejouer l’animation
            </button>
          </div>
        ) : null
      ) : !printed ? (
        <button
          className="rb-primary-action print:hidden"
          type="button"
          onClick={finishService}
          disabled={busy || printing}
        >
          {busy
            ? "Finalisation…"
            : printing
              ? "Le ticket sort de la machine…"
              : "✓  Terminer la prestation"}
        </button>
      ) : (
        <div className="rb-ticket-actions print:hidden">
          <button className="rb-primary-action" type="button" onClick={printAgain}>
            Imprimer le ticket
          </button>
          <button className="rb-secondary-action" type="button" onClick={shareTicket}>
            Partager le ticket
          </button>
          <button
            className="rb-text-action"
            type="button"
            onClick={() => {
              setPrinted(false);
              setPrinting(false);
            }}
          >
            Réinitialiser la démonstration
          </button>
        </div>
      )}
      {!isPayment ? (
        <p className="rb-demo-note print:hidden">
          Animation visuelle. L’impression papier ouvre la boîte de dialogue du navigateur.
        </p>
      ) : null}
    </section>
  );
}
