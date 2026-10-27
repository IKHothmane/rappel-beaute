import type { BeautyTicket } from "@/components/tickets/TicketPrinterAnimation";

function money(value: number, currency: string) {
  return `${value.toLocaleString("fr-FR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} ${currency}`;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Ouvre une fenêtre ticket thermique (80 mm) — une seule feuille, pas de A4 multi-pages. */
export function printBeautyTicket(ticket: BeautyTicket) {
  const currency = ticket.currency ?? "DH";
  const lines = ticket.lines
    .map((line) => {
      const qty = line.quantity ?? 1;
      const detail = line.detail
        ? `<div class="detail">${escapeHtml(line.detail)}</div>`
        : "";
      const qtyHtml = qty > 1 ? `<div class="detail">Qté : ${qty}</div>` : "";
      return `<div class="line">
        <div>
          <strong>${escapeHtml(line.name)}</strong>
          ${detail}${qtyHtml}
        </div>
        <span>${escapeHtml(money(line.price * qty, currency))}</span>
      </div>`;
    })
    .join("");

  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <title>Ticket ${escapeHtml(ticket.ticketNumber)}</title>
  <style>
    @page { size: 80mm auto; margin: 0; }
    * { box-sizing: border-box; }
    html, body {
      margin: 0;
      padding: 0;
      width: 80mm;
      background: #fff;
      color: #34212b;
      font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    }
    .ticket {
      width: 72mm;
      margin: 0 auto;
      padding: 4mm 3mm 6mm;
      font-size: 11px;
      line-height: 1.35;
    }
    .brand {
      text-align: center;
      font-size: 15px;
      font-weight: 700;
      margin: 0 0 2px;
    }
    .small {
      text-align: center;
      font-size: 10px;
      color: #666;
      margin: 0 0 6px;
    }
    .rule {
      border-top: 1px dashed #999;
      margin: 6px 0;
    }
    .row, .line, .total {
      display: flex;
      justify-content: space-between;
      gap: 8px;
      margin: 3px 0;
    }
    .line strong { display: block; font-size: 11px; }
    .detail { font-size: 9px; color: #666; margin-top: 1px; }
    .total { font-size: 13px; font-weight: 700; margin-top: 4px; }
    .thanks {
      text-align: center;
      margin-top: 8px;
      font-size: 11px;
      font-weight: 700;
    }
  </style>
</head>
<body>
  <div class="ticket">
    <p class="brand">${escapeHtml(ticket.instituteName ?? "Institut")}</p>
    <p class="small">Ticket de caisse</p>
    <div class="rule"></div>
    <div class="row"><span>Ticket</span><strong>${escapeHtml(ticket.ticketNumber)}</strong></div>
    <div class="row"><span>Date</span><span>${escapeHtml(ticket.date)}</span></div>
    <div class="row"><span>Cliente</span><strong>${escapeHtml(ticket.clientName)}</strong></div>
    <div class="rule"></div>
    ${lines}
    <div class="rule"></div>
    <div class="total"><span>TOTAL</span><strong>${escapeHtml(money(ticket.total, currency))}</strong></div>
    ${
      ticket.paymentMethod
        ? `<p class="small">Paiement : ${escapeHtml(ticket.paymentMethod)}</p>`
        : ""
    }
    <p class="thanks">Merci pour votre visite</p>
    <p class="small">À bientôt chez vous.</p>
  </div>
  <script>
    window.onload = function () {
      window.focus();
      window.print();
      setTimeout(function () { window.close(); }, 300);
    };
  </script>
</body>
</html>`;

  const popup = window.open("", "rb-ticket-print", "width=320,height=640");
  if (!popup) {
    window.alert("Autorisez les fenêtres pop-up pour imprimer le ticket.");
    return;
  }
  popup.document.open();
  popup.document.write(html);
  popup.document.close();
}
