import { describe, expect, it, afterAll } from "vitest";
import {
  AI_KIND_TO_WHATSAPP,
  assertFactsAreSafe,
  buildMockVariants,
  formatLlmSafeFacts,
  isMarketingMessageKind,
  loadAIMessageContext,
} from "@/lib/ai/marketing";
import { sanitizeAIBody } from "@/lib/ai/guard";
import { parseCommitWhatsAppBody, parseGenerateMessageBody } from "@/lib/validation/ai-message";
import { createAIWhatsAppTask } from "@/lib/db/whatsapp";
import { getAIMarketingAnalytics } from "@/lib/db/analytics";
import { resolvePreset } from "@/lib/analytics/period";
import { canSendWhatsapp, canWriteFeatureLimited } from "@/lib/rbac";
import { AI_MARKETING_ATTRIBUTION, type AIMessageLlmFacts } from "@/types/ai";
import { buildPublicBookingUrl } from "@/lib/booking-qr";
import {
  cleanupTestPrefix,
  ensureSecondOrg,
  getSeedOrgId,
  testId,
  testPool,
} from "../helpers/db";

function sampleFacts(over: Partial<AIMessageLlmFacts> = {}): AIMessageLlmFacts {
  return {
    firstName: "Sara",
    lastService: "Hydrafacial",
    lastVisitDate: "12 mars 2026",
    recommendedService: "Hydrafacial",
    appointmentDate: "12 septembre 2026",
    appointmentTime: "14:30",
    organizationName: "Institut Royal",
    promotion: "PRINTEMPS20",
    bookingUrl: "https://app.rappelbeauty.com/book/institut-royal/?source=ai_marketing",
    kind: "reactivation",
    tone: "warm",
    language: "fr",
    objective: null,
    ...over,
  };
}

describe("43.7 — IA Marketing & WhatsApp (unit)", () => {
  it("kind → WhatsAppTaskType", () => {
    expect(AI_KIND_TO_WHATSAPP.inactive).toBe("REACTIVATION");
    expect(AI_KIND_TO_WHATSAPP.birthday).toBe("BIRTHDAY");
    expect(AI_KIND_TO_WHATSAPP.post_visit).toBe("POST_VISIT");
    expect(AI_KIND_TO_WHATSAPP.confirmation).toBe("APPOINTMENT_CONFIRMATION");
    expect(AI_KIND_TO_WHATSAPP.reactivation).toBe("REACTIVATION");
    expect(AI_KIND_TO_WHATSAPP.promotion).toBe("PROMOTION");
  });

  it("types marketing vs confirmation", () => {
    expect(isMarketingMessageKind("reactivation")).toBe(true);
    expect(isMarketingMessageKind("confirmation")).toBe(false);
  });

  it("faits LLM sans téléphone / e-mail / notes / CA", () => {
    const text = formatLlmSafeFacts(sampleFacts());
    expect(text).toContain("Sara");
    expect(text).toContain("Hydrafacial");
    expect(text).toContain("12 mars 2026");
    expect(text.toLowerCase()).not.toMatch(/téléphone|phone:|email:|notes:|ltv|revenue|organizationid/i);
    expect(assertFactsAreSafe(text)).toBe(true);
  });

  it("3 variantes FR / darija / arabe", () => {
    const fr = buildMockVariants(sampleFacts({ language: "fr" }), 3);
    const darija = buildMockVariants(sampleFacts({ language: "darija", kind: "birthday" }), 3);
    const ar = buildMockVariants(sampleFacts({ language: "ar", kind: "promotion" }), 3);
    expect(fr).toHaveLength(3);
    expect(fr[0]).toContain("Sara");
    expect(darija.some((v) => /salam|mbrouk/i.test(v))).toBe(true);
    expect(ar.some((v) => /مرحبا|عرض/.test(v))).toBe(true);
  });

  it("ton court tronque", () => {
    const short = buildMockVariants(sampleFacts({ tone: "short" }), 1);
    expect(short[0]!.length).toBeLessThanOrEqual(320);
  });

  it("parse generate — objective seul = promotion", () => {
    const parsed = parseGenerateMessageBody({ objective: "Offre hydra" });
    expect(parsed.ok).toBe(true);
    if (parsed.ok) expect(parsed.data.kind).toBe("promotion");
  });

  it("parse generate — kind requis sinon", () => {
    const parsed = parseGenerateMessageBody({ tone: "warm" });
    expect(parsed.ok).toBe(false);
  });

  it("parse commit refuse message vide", () => {
    expect(parseCommitWhatsAppBody({ customerId: "c1", kind: "reactivation" }).ok).toBe(
      false,
    );
  });

  it("organizationId strippé", () => {
    const clean = sanitizeAIBody({
      kind: "reactivation",
      organizationId: "org_hack",
      customerId: "c1",
    });
    expect("organizationId" in clean).toBe(false);
  });

  it("lien réservation source=ai_marketing", () => {
    const url = buildPublicBookingUrl({ slug: "institut-royal", source: AI_MARKETING_ATTRIBUTION });
    expect(url).toContain("source=ai_marketing");
    expect(url).not.toMatch(/price|phone|email/i);
  });

  it("RBAC : STAFF génère + envoie, CASHIER ne peut pas WhatsApp", () => {
    expect(canWriteFeatureLimited("STAFF", "ai")).toBe(true);
    expect(canSendWhatsapp("STAFF")).toBe(true);
    expect(canWriteFeatureLimited("CASHIER", "ai")).toBe(true);
    expect(canSendWhatsapp("CASHIER")).toBe(false);
    expect(canSendWhatsapp("ACCOUNTANT")).toBe(false);
  });
});

const run = process.env.DATABASE_URL ? describe : describe.skip;
const PREFIX = "test_ai_mkt";

run("43.7 — isolation + funnel (db)", () => {
  afterAll(async () => {
    await cleanupTestPrefix(PREFIX);
    await testPool.query(
      `DELETE FROM "WhatsAppTask" WHERE "idempotencyKey" LIKE 'wa:ai_marketing:%' AND id LIKE $1`,
      [`${PREFIX}%`],
    );
  });

  it("cliente d'une autre org → CUSTOMER_NOT_FOUND", async () => {
    const orgId = await getSeedOrgId();
    const other = await ensureSecondOrg();
    await expect(
      loadAIMessageContext(orgId, {
        customerId: "does-not-exist-in-org",
        kind: "reactivation",
        tone: "warm",
        language: "fr",
        promotion: null,
        objective: null,
        appointmentId: null,
      }),
    ).rejects.toThrow("CUSTOMER_NOT_FOUND");
    await expect(
      loadAIMessageContext(other, {
        customerId: "c1",
        kind: "reactivation",
        tone: "warm",
        language: "fr",
        promotion: null,
        objective: null,
        appointmentId: null,
      }),
    ).rejects.toThrow("CUSTOMER_NOT_FOUND");
  });

  it("contexte c1 : prénom, pas de notes ni téléphone dans facts", async () => {
    const orgId = await getSeedOrgId();
    const ctx = await loadAIMessageContext(orgId, {
      customerId: "c1",
      kind: "reactivation",
      tone: "warm",
      language: "fr",
      promotion: null,
      objective: null,
      appointmentId: null,
    });
    expect(ctx.customer?.firstName).toBe("Sara");
    expect(ctx.customer?.hasPhone).toBe(true);
    const facts = formatLlmSafeFacts(ctx.facts);
    expect(facts).not.toMatch(/0661223344|Cliente fidèle|phone|notes/i);
    expect(ctx.bookingUrl).toContain("source=ai_marketing");
  });

  it("commit crée PENDING ai_marketing — pas d'envoi auto", async () => {
    const orgId = await getSeedOrgId();
    const task = await createAIWhatsAppTask(
      orgId,
      {
        customerId: "c1",
        message: "Bonjour Sara, test IA.",
        type: "REACTIVATION",
        attributionSource: AI_MARKETING_ATTRIBUTION,
      },
      { id: "u1", name: "Test" },
    );
    expect(task.status).toBe("PENDING");
    expect(task.attributionSource).toBe("ai_marketing");
    expect(task.sentAt).toBeNull();
    expect(task.waLink).toContain("wa.me/");
    expect(task.messageSnapshot).toBe("Bonjour Sara, test IA.");

    await testPool.query(`DELETE FROM "WhatsAppTask" WHERE id = $1`, [task.id]);
  });

  it("opt-in marketing requis pour PROMOTION", async () => {
    const orgId = await getSeedOrgId();
    await expect(
      createAIWhatsAppTask(
        orgId,
        {
          customerId: "c2",
          message: "Promo",
          type: "PROMOTION",
          attributionSource: AI_MARKETING_ATTRIBUTION,
        },
        { id: "u1" },
      ),
    ).rejects.toThrow("CUSTOMER_NO_MARKETING_OPTIN");
  });

  it("analytics funnel generated/sent/bookings/completed", async () => {
    const orgId = await getSeedOrgId();
    const aptId = testId(PREFIX);
    const period = resolvePreset("month");
    const filters = {
      period,
      compare: false,
      staffId: null,
      serviceId: null,
      resourceId: null,
    };

    const before = await getAIMarketingAnalytics(orgId, filters);

    const task = await createAIWhatsAppTask(
      orgId,
      {
        customerId: "c1",
        message: "Funnel test",
        type: "REACTIVATION",
        attributionSource: AI_MARKETING_ATTRIBUTION,
      },
      { id: "u1" },
    );

    await testPool.query(
      `INSERT INTO "Appointment" (
        id, "organizationId", "customerId", "serviceId", "staffId",
        "startAt", "endAt", price, status, "attributionSource", "updatedAt"
      ) VALUES ($1,$2,'c1','s1','e2', NOW(), NOW() + INTERVAL '1 hour', 400,
        'COMPLETED'::"AppointmentStatus", 'ai_marketing', NOW())`,
      [aptId, orgId],
    );

    const after = await getAIMarketingAnalytics(orgId, filters);
    expect(after.generated).toBeGreaterThanOrEqual(before.generated + 1);
    expect(after.bookings).toBeGreaterThanOrEqual(before.bookings + 1);
    expect(after.completed).toBeGreaterThanOrEqual(before.completed + 1);
    expect(after.sent).toBe(before.sent);

    await testPool.query(`DELETE FROM "Appointment" WHERE id = $1`, [aptId]);
    await testPool.query(`DELETE FROM "WhatsAppTask" WHERE id = $1`, [task.id]);
  });
});
