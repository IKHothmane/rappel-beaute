import { describe, expect, it } from "vitest";
import { paymentWhatsappMessage, waMeLink } from "@/components/finance/payment-helpers";
import type { PaymentItem } from "@/types/finance";

const base: PaymentItem = {
  id: "p1", appointmentId: "a1", customerId: "c1", customerName: "Sara Alaoui", customerPhone: "0612345678",
  serviceName: "Soin visage", amount: 350, method: "CASH", kind: "PAYMENT", status: "COMPLETED",
  parentPaymentId: null, giftCardId: null, ticketNumber: "22/11-004", notes: null, userId: null, userName: null,
  paidAt: "2026-11-22T10:00:00Z", createdAt: "2026-11-22T10:00:00Z",
};

describe("waMeLink", () => {
  it("normalise le numéro marocain et reste sans message par défaut", () => {
    expect(waMeLink("06 12 34 56 78")).toBe("https://wa.me/212612345678");
    expect(waMeLink("+212 612345678")).toBe("https://wa.me/212612345678");
  });
  it("refuse un numéro absent ou trop court", () => {
    expect(waMeLink(null)).toBeNull();
    expect(waMeLink("123")).toBeNull();
  });
  it("pré-remplit le message, encodé pour l'URL", () => {
    const url = waMeLink("0612345678", "Bonjour & merci\nÀ bientôt");
    expect(url).toBe(`https://wa.me/212612345678?text=${encodeURIComponent("Bonjour & merci\nÀ bientôt")}`);
  });
  it("ignore un message vide", () => {
    expect(waMeLink("0612345678", "   ")).toBe("https://wa.me/212612345678");
  });
});

describe("paymentWhatsappMessage", () => {
  it("remercie pour un paiement encaissé, avec prénom, montant, prestation et ticket", () => {
    const msg = paymentWhatsappMessage(base, "Institut Royal");
    expect(msg).toContain("Bonjour Sara,");
    expect(msg).toContain("Merci pour votre visite chez Institut Royal");
    expect(msg).toContain("« Soin visage »");
    expect(msg).toContain("ticket 22/11-004");
    expect(msg).toMatch(/350/);
  });
  it("relance un reste à régler (RDV non payé ou paiement en attente)", () => {
    expect(paymentWhatsappMessage({ ...base, id: "due:a1", notes: "RDV non payé" }, "Institut Royal")).toContain("reste");
    expect(paymentWhatsappMessage({ ...base, status: "PENDING" }, "Institut Royal")).toContain("à régler");
  });
  it("annonce un remboursement, un acompte et un échec", () => {
    expect(paymentWhatsappMessage({ ...base, kind: "REFUND", amount: -100 }, "Institut Royal")).toContain("remboursement");
    expect(paymentWhatsappMessage({ ...base, kind: "DEPOSIT" }, "Institut Royal")).toContain("acompte");
    expect(paymentWhatsappMessage({ ...base, status: "FAILED" }, "Institut Royal")).toContain("n'a pas pu");
  });
  it("reste correct sans nom, sans prestation, sans ticket ni institut", () => {
    const msg = paymentWhatsappMessage({ ...base, customerName: null, serviceName: null, ticketNumber: null }, null);
    expect(msg.startsWith("Bonjour,")).toBe(true);
    expect(msg).toContain("notre institut");
    expect(msg).not.toContain("«");
    expect(msg).not.toContain("ticket");
  });
});
