import { describe, expect, it } from "vitest";
import { canUseAITool, listAllowedAITools } from "@/lib/ai/permissions";
import { inferToolsFromQuestion, summarizeToolResults } from "@/lib/ai/tools";
import { MockAIProvider } from "@/lib/ai/provider";
import { sanitizeAIBody } from "@/lib/ai/guard";
import { canReadFeature, canWriteFeature, canWriteFeatureLimited } from "@/lib/rbac";
import { AI_MONTHLY_MESSAGE_LIMIT } from "@/types/ai";
import { isPlanFeatureEnabled, NAV_PLAN_FEATURE } from "@/lib/subscriptions/nav-features";

describe("43.1–43.4 — Fondation IA", () => {
  it("plan feature ai sur nav", () => {
    expect(NAV_PLAN_FEATURE.ai).toBe("ai");
    expect(isPlanFeatureEnabled({ ai: true }, "ai")).toBe(true);
    expect(isPlanFeatureEnabled({ ai: false }, "ai")).toBe(false);
  });

  it("quotas plan", () => {
    expect(AI_MONTHLY_MESSAGE_LIMIT.STARTER).toBe(0);
    expect(AI_MONTHLY_MESSAGE_LIMIT.INSTITUT).toBe(100);
    expect(AI_MONTHLY_MESSAGE_LIMIT.PREMIUM).toBe(500);
  });

  it("RBAC feature ai", () => {
    expect(canWriteFeature("OWNER", "ai")).toBe(true);
    expect(canWriteFeatureLimited("STAFF", "ai")).toBe(true);
    expect(canReadFeature("ACCOUNTANT", "ai")).toBe(true);
  });

  it("STAFF n'a pas getRevenue / getDashboard", () => {
    expect(canUseAITool("STAFF", "getRevenue")).toBe(false);
    expect(canUseAITool("STAFF", "getDashboard")).toBe(false);
    expect(canUseAITool("OWNER", "getRevenue")).toBe(true);
    expect(canUseAITool("ACCOUNTANT", "getRevenue")).toBe(true);
  });

  it("CASHIER bloqué finance", () => {
    expect(canUseAITool("CASHIER", "getRevenue")).toBe(false);
    expect(listAllowedAITools("CASHIER")).not.toContain("getRevenue");
  });

  it("STAFF peut searchCustomers si customers limited/read", () => {
    expect(canUseAITool("STAFF", "searchCustomers")).toBe(true);
  });

  it("organizationId strippé du body", () => {
    const clean = sanitizeAIBody({
      message: "CA ?",
      organizationId: "org_injected",
    });
    expect("organizationId" in clean).toBe(false);
    expect(clean.message).toBe("CA ?");
  });

  it("inferToolsFromQuestion détecte CA / stock / no-show", () => {
    expect(inferToolsFromQuestion("Combien avons-nous réalisé cette semaine ?")).toEqual(
      expect.arrayContaining(["getRevenue"]),
    );
    expect(inferToolsFromQuestion("Quels produits vont bientôt être en rupture ?")).toEqual(
      expect.arrayContaining(["getInventory"]),
    );
    expect(inferToolsFromQuestion("Combien de no-shows ce mois-ci ?")).toEqual(
      expect.arrayContaining(["getAppointments"]),
    );
  });

  it("summarizeToolResults n'invente pas de données", () => {
    const text = summarizeToolResults([
      { ok: true, tool: "getRevenue", data: { totals: { month: 18450 } } },
      { ok: false, tool: "getInventory", error: "Outil non autorisé pour votre rôle." },
    ]);
    expect(text).toContain("18450");
    expect(text).toContain("non autorisé");
  });

  it("MockAIProvider s'appuie sur toolContext", async () => {
    const p = new MockAIProvider();
    const out = await p.chat({
      systemPrompt: "test",
      messages: [{ role: "user", content: "Quel est le CA ?" }],
      toolContext: "• getRevenue: {\"totals\":{\"month\":18450}}",
    });
    expect(out.content).toContain("18450");
    expect(out.provider).toBe("mock");
  });

  it("MockAIProvider sans données ne invente pas de CA", async () => {
    const p = new MockAIProvider();
    const out = await p.chat({
      systemPrompt: "test",
      messages: [{ role: "user", content: "CA ?" }],
    });
    expect(out.content).not.toMatch(/\d{4,}\s*MAD/);
  });
});
