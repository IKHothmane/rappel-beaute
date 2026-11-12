"use client";

import { useState } from "react";
import { ReceiptPrinter } from "@/components/ui/receipt-printer";
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
  /** Mode payment : n'affiche ni le message d'impression ni les boutons (ex. démo sur la vitrine). */
  hideActions?: boolean;
};

const money = (value: number, currency: string) =>
  `${value.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`;

const PRINTER_LABELS = {
  idle: "Appuyez sur PRINT",
  printing: "Impression… appuyez pour arrêter",
  ready: "Tirez pour détacher, ou imprimez encore",
};

export default function TicketPrinterAnimation({
  ticket,
  mode = "service",
  onComplete,
  onPrint,
  onShare,
  hideActions = false,
}: Props) {
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(mode === "payment");
  const currency = ticket.currency ?? "DH";
  const isPayment = mode === "payment";

  const finishService = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await onComplete?.();
      setReady(true);
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

      <div className="mx-auto h-[520px] w-full max-w-[380px]">
        <ReceiptPrinter
          key={ready ? ticket.ticketNumber : "idle"}
          embedded
          autoPrint={ready}
          store={ticket.instituteName ?? "Institut de beauté"}
          address={ticket.clientName}
          items={ticket.lines.map((line) => ({
            name: line.name,
            qty: line.quantity ?? 1,
            price: line.price,
          }))}
          currency={currency}
          currencyPosition="suffix"
          taxRate={0}
          thanks="MERCI"
          dateLocale="fr-FR"
          mark="Rappel"
          labels={PRINTER_LABELS}
        />
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

      {hideActions ? null : isPayment || ready ? (
        <div className="rb-ticket-actions print:hidden">
          <button className="rb-primary-action" type="button" onClick={printAgain}>
            Imprimer le ticket
          </button>
          <button className="rb-secondary-action" type="button" onClick={shareTicket}>
            Partager le ticket
          </button>
        </div>
      ) : (
        <button
          className="rb-primary-action print:hidden"
          type="button"
          onClick={finishService}
          disabled={busy}
        >
          {busy ? "Finalisation…" : "✓  Terminer la prestation"}
        </button>
      )}
      {!isPayment ? (
        <p className="rb-demo-note print:hidden">
          Animation visuelle. L’impression papier ouvre la boîte de dialogue du navigateur.
        </p>
      ) : null}
    </section>
  );
}
