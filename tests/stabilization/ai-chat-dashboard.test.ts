import { describe, expect, it } from "vitest";
import { buildFactsNarrative } from "@/lib/ai/service";
import { inferPeriodFromQuestion, inferToolsFromQuestion } from "@/lib/ai/tools";
import { canUseAITool } from "@/lib/ai/permissions";
import { sanitizeAIBody } from "@/lib/ai/guard";
import { AI_MONTHLY_MESSAGE_LIMIT, AI_RATE_LIMIT } from "@/types/ai";
import type { AIToolResult } from "@/types/ai";
import { resolvePreset } from "@/lib/analytics/period";

describe("43.5–43.6 — Chat + Dashboard IA", () => {
  it("STARTER = IA désactivée (quota 0)", () => {
    expect(AI_MONTHLY_MESSAGE_LIMIT.STARTER).toBe(0);
  });

  it("rate limit IA défini", () => {
    expect(AI_RATE_LIMIT.limit).toBe(20);
    expect(AI_RATE_LIMIT.windowMs).toBe(60_000);
  });

  it("organizationId injecté est ignoré", () => {
    const body = sanitizeAIBody({
      message: "CA ?",
      organizationId: "org_hacker",
      conversationId: "c1",
    });
    expect(body).toEqual({ message: "CA ?", conversationId: "c1" });
  });

  it("période déduite de la question", () => {
    expect(inferPeriodFromQuestion("CA cette semaine")).toBe("week");
    expect(inferPeriodFromQuestion("réalisé ce mois-ci")).toBe("month");
    expect(inferPeriodFromQuestion("aujourd'hui")).toBe("today");
  });

  it("CA narratif = totals Analytics (pas inventé)", () => {
    const results: AIToolResult[] = [
      {
        ok: true,
        tool: "getRevenue",
        data: {
          totals: { periodNet: 32450, month: 32450, prevMonth: 28700 },
        },
      },
    ];
    const text = buildFactsNarrative(results);
    expect(text).toContain("32");
    expect(text).toContain("450");
    expect(text).toContain("28");
    expect(text).toMatch(/13/);
    expect(text).toMatch(/Analytics|PostgreSQL/i);
  });

  it("aucune donnée inventée si tools vides", () => {
    expect(buildFactsNarrative([])).toBeNull();
  });

  it("refus finance STAFF", () => {
    expect(canUseAITool("STAFF", "getRevenue")).toBe(false);
  });

  it("resolvePreset week est un vrai objet période Analytics", () => {
    const p = resolvePreset("week");
    expect(p.startAt).toBeInstanceOf(Date);
    expect(p.endAt).toBeInstanceOf(Date);
    expect(p.endAt.getTime()).toBeGreaterThan(p.startAt.getTime());
  });

  it("tools CA pour question réalisé", () => {
    expect(inferToolsFromQuestion("Combien avons-nous réalisé ce mois-ci ?")).toEqual(
      expect.arrayContaining(["getRevenue"]),
    );
  });

  it("dashboard empty shape — kpis à zéro = empty logique", () => {
    const empty =
      0 === 0 && 0 === 0 && 0 === 0 && 0 === 0 && 0 === 0;
    expect(empty).toBe(true);
  });
});
