import { randomBytes } from "crypto";
import { Pool } from "pg";
import { writeAuditLog } from "@/lib/db/audit";
import { getAIProvider, MockAIProvider } from "@/lib/ai/provider";
import { listAllowedAITools } from "@/lib/ai/permissions";
import {
  executeAITool,
  inferPeriodFromQuestion,
  inferToolsFromQuestion,
  loadTopServiceShare,
  summarizeToolResults,
} from "@/lib/ai/tools";
import { resolvePreset } from "@/lib/analytics/period";
import {
  getAnalyticsOverview,
  getAppointmentAnalytics,
  getCustomerAnalytics,
  getInventoryAnalytics,
  getRevenueAnalytics,
} from "@/lib/db/analytics";
import type {
  AIChatResult,
  AIConversationDetail,
  AIConversationSummary,
  AIDashboardInsight,
  AIGenerateMessageInput,
  AIGenerateMessageResult,
  AIRecommendation,
  AIRequestContext,
  AIToolResult,
  AIUsageSnapshot,
} from "@/types/ai";
import { AI_MONTHLY_MESSAGE_LIMIT } from "@/types/ai";
import { AI_TOOL_DESCRIPTIONS } from "@/lib/ai/permissions";
import {
  generateMarketingVariants,
  loadAIMessageContext,
} from "@/lib/ai/marketing";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

function newId(prefix: string) {
  return `${prefix}_${randomBytes(8).toString("hex")}`;
}

function periodKey(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function formatMad(n: number) {
  return `${n.toLocaleString("fr-MA", { maximumFractionDigits: 2 })} MAD`;
}

/**
 * Narratif déterministe à partir des tools — garantit que le CA = Analytics.
 */
export function buildFactsNarrative(results: AIToolResult[]): string | null {
  const lines: string[] = [];

  for (const r of results) {
    if (!r.ok || !r.data || typeof r.data !== "object") continue;
    const data = r.data as Record<string, unknown>;

    if (r.tool === "getRevenue" && data.totals && typeof data.totals === "object") {
      const t = data.totals as Record<string, number>;
      const periodNet = t.periodNet ?? t.month;
      const prev = t.prevMonth;
      if (typeof periodNet === "number") {
        let line = `Votre CA net est de ${formatMad(periodNet)}`;
        if (typeof prev === "number" && prev > 0) {
          const pct = Math.round(((periodNet - prev) / prev) * 1000) / 10;
          const sign = pct >= 0 ? "+" : "";
          line += `, contre ${formatMad(prev)} sur la période de comparaison, soit ${sign}${pct} %`;
        }
        line += ".";
        lines.push(line);
      }
    }

    if (r.tool === "getDashboard" && data.revenue && typeof data.revenue === "object") {
      const rev = data.revenue as { value?: number; changePercent?: number | null };
      if (typeof rev.value === "number" && !lines.some((l) => l.includes("CA net"))) {
        const pct = rev.changePercent;
        lines.push(
          `CA (vue d'ensemble) : ${formatMad(rev.value)}${
            pct != null ? ` (${pct >= 0 ? "+" : ""}${pct} % vs période précédente)` : ""
          }.`,
        );
      }
    }

    if (r.tool === "getInventory") {
      const low = data.lowStockCount;
      const out = data.outOfStockCount;
      if (typeof low === "number") {
        lines.push(
          low > 0
            ? `${low} produit(s) sous le stock minimum.`
            : "Aucun produit sous le stock minimum.",
        );
      }
      if (typeof out === "number" && out > 0) {
        lines.push(`${out} produit(s) en rupture.`);
      }
    }

    if (r.tool === "getAppointments" && data.noShow && typeof data.noShow === "object") {
      const ns = data.noShow as { rate?: number | null; count?: number };
      if (ns.rate != null) {
        lines.push(`Taux de no-show : ${ns.rate} % (${ns.count ?? 0} no-shows).`);
      }
    }

    if (r.tool === "getCustomers" && data.kpis && typeof data.kpis === "object") {
      const k = data.kpis as { inactive?: number; atRisk?: number };
      if (typeof k.inactive === "number" && k.inactive > 0) {
        lines.push(`${k.inactive} clientes inactives détectées.`);
      }
      if (typeof k.atRisk === "number" && k.atRisk > 0) {
        lines.push(`${k.atRisk} clientes à risque de perte.`);
      }
    }
  }

  if (!lines.length) return null;
  return (
    lines.join("\n\n") +
    "\n\nCes chiffres proviennent du moteur Analytics (PostgreSQL), pas d'une estimation du modèle."
  );
}

export async function getAIUsage(
  organizationId: string,
  planCode: string | null,
): Promise<AIUsageSnapshot> {
  const key = periodKey();
  const { rows } = await pool.query<{
    messageCount: number;
    promptTokens: number;
    completionTokens: number;
    estimatedCostMad: string;
  }>(
    `SELECT "messageCount", "promptTokens", "completionTokens", "estimatedCostMad"::text
     FROM "AIUsagePeriod"
     WHERE "organizationId" = $1 AND "periodKey" = $2`,
    [organizationId, key],
  );
  const row = rows[0];
  const max =
    planCode && planCode in AI_MONTHLY_MESSAGE_LIMIT
      ? AI_MONTHLY_MESSAGE_LIMIT[planCode]
      : AI_MONTHLY_MESSAGE_LIMIT.STARTER;
  const messageCount = row?.messageCount ?? 0;
  return {
    periodKey: key,
    messageCount,
    promptTokens: row?.promptTokens ?? 0,
    completionTokens: row?.completionTokens ?? 0,
    estimatedCostMad: parseFloat(row?.estimatedCostMad ?? "0"),
    maxMessages: max,
    remainingMessages: max == null ? null : Math.max(0, max - messageCount),
  };
}

export async function assertAIQuota(
  organizationId: string,
  planCode: string | null,
): Promise<void> {
  const usage = await getAIUsage(organizationId, planCode);
  if (usage.maxMessages === 0) throw new Error("AI_NOT_IN_PLAN");
  if (usage.maxMessages != null && usage.messageCount >= usage.maxMessages) {
    throw new Error("AI_QUOTA_EXCEEDED");
  }
}

async function recordUsage(
  organizationId: string,
  tokens: { prompt: number; completion: number },
) {
  const key = periodKey();
  // Estimation très conservative ~0.002 MAD / 1k tokens (placeholder V1)
  const cost =
    Math.round(((tokens.prompt + tokens.completion) / 1000) * 0.002 * 10000) / 10000;
  const id = newId("aiu");
  await pool.query(
    `INSERT INTO "AIUsagePeriod" (
      id, "organizationId", "periodKey", "messageCount",
      "promptTokens", "completionTokens", "estimatedCostMad", "updatedAt"
    ) VALUES ($1,$2,$3,1,$4,$5,$6,NOW())
    ON CONFLICT ("organizationId", "periodKey") DO UPDATE SET
      "messageCount" = "AIUsagePeriod"."messageCount" + 1,
      "promptTokens" = "AIUsagePeriod"."promptTokens" + EXCLUDED."promptTokens",
      "completionTokens" = "AIUsagePeriod"."completionTokens" + EXCLUDED."completionTokens",
      "estimatedCostMad" = "AIUsagePeriod"."estimatedCostMad" + EXCLUDED."estimatedCostMad",
      "updatedAt" = NOW()`,
    [id, organizationId, key, tokens.prompt, tokens.completion, cost],
  );
}

export async function listAIConversations(
  organizationId: string,
  userId: string,
): Promise<AIConversationSummary[]> {
  const { rows } = await pool.query<{
    id: string;
    title: string | null;
    createdAt: Date;
    updatedAt: Date;
    messageCount: string;
  }>(
    `SELECT c.id, c.title, c."createdAt", c."updatedAt",
            COUNT(m.id)::text AS "messageCount"
     FROM "AIConversation" c
     LEFT JOIN "AIMessage" m ON m."conversationId" = c.id
     WHERE c."organizationId" = $1 AND c."userId" = $2
     GROUP BY c.id
     ORDER BY c."updatedAt" DESC
     LIMIT 50`,
    [organizationId, userId],
  );
  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
    messageCount: parseInt(r.messageCount, 10),
  }));
}

export async function getAIConversation(
  organizationId: string,
  userId: string,
  conversationId: string,
): Promise<AIConversationDetail | null> {
  const { rows } = await pool.query<{
    id: string;
    title: string | null;
    createdAt: Date;
    updatedAt: Date;
  }>(
    `SELECT id, title, "createdAt", "updatedAt" FROM "AIConversation"
     WHERE id = $1 AND "organizationId" = $2 AND "userId" = $3`,
    [conversationId, organizationId, userId],
  );
  const conv = rows[0];
  if (!conv) return null;

  const { rows: msgs } = await pool.query<{
    role: string;
    content: string;
    metadata: unknown;
    createdAt: Date;
  }>(
    `SELECT role::text, content, metadata, "createdAt"
     FROM "AIMessage" WHERE "conversationId" = $1 ORDER BY "createdAt"`,
    [conversationId],
  );

  return {
    id: conv.id,
    title: conv.title,
    createdAt: conv.createdAt.toISOString(),
    updatedAt: conv.updatedAt.toISOString(),
    messageCount: msgs.length,
    messages: msgs.map((m) => ({
      role: m.role as AIConversationDetail["messages"][0]["role"],
      content: m.content,
      metadata: (m.metadata as Record<string, unknown> | null) ?? null,
      createdAt: m.createdAt.toISOString(),
    })),
  };
}

export async function deleteAIConversation(
  organizationId: string,
  userId: string,
  conversationId: string,
): Promise<void> {
  const { rowCount } = await pool.query(
    `DELETE FROM "AIConversation"
     WHERE id = $1 AND "organizationId" = $2 AND "userId" = $3`,
    [conversationId, organizationId, userId],
  );
  if (!rowCount) throw new Error("NOT_FOUND");
}

function buildSystemPrompt(ctx: AIRequestContext): string {
  const tools = listAllowedAITools(ctx.role).join(", ");
  return [
    "Tu es l'assistant Rappel Beauty pour un institut de beauté au Maroc.",
    `Utilisateur: ${ctx.userDisplayName} (rôle ${ctx.role}).`,
    "Règles strictes:",
    "- Tu ne inventes JAMAIS de chiffres. Utilise uniquement les DONNÉES RÉELLES fournies.",
    "- Les montants sont en MAD.",
    "- organizationId n'est jamais fourni par l'utilisateur.",
    `- Outils autorisés pour ce rôle: ${tools || "aucun"}.`,
    "- Si une donnée manque ou est refusée, dis-le clairement.",
    "- Ne demande jamais et n'expose jamais mots de passe, tokens, secrets.",
  ].join("\n");
}

export async function runAIChat(
  ctx: AIRequestContext,
  input: { message: string; conversationId?: string | null },
): Promise<AIChatResult> {
  await assertAIQuota(ctx.organizationId, ctx.planCode);

  const message = input.message.trim();
  if (!message) throw new Error("EMPTY_MESSAGE");
  if (message.length > 4000) throw new Error("MESSAGE_TOO_LONG");

  let conversationId = input.conversationId?.trim() || "";
  if (conversationId) {
    const existing = await getAIConversation(ctx.organizationId, ctx.userId, conversationId);
    if (!existing) throw new Error("NOT_FOUND");
  } else {
    conversationId = newId("aic");
    const title = message.slice(0, 80);
    await pool.query(
      `INSERT INTO "AIConversation" (
        id, "organizationId", "userId", title, "updatedAt"
      ) VALUES ($1,$2,$3,$4,NOW())`,
      [conversationId, ctx.organizationId, ctx.userId, title],
    );
  }

  await pool.query(
    `INSERT INTO "AIMessage" (id, "conversationId", role, content)
     VALUES ($1,$2,'USER'::"AIMessageRole",$3)`,
    [newId("aim"), conversationId, message],
  );

  const period = inferPeriodFromQuestion(message);
  const wanted = inferToolsFromQuestion(message);
  const results: AIToolResult[] = [];
  for (const tool of wanted) {
    results.push(await executeAITool(ctx, tool, { period }));
  }

  const facts = buildFactsNarrative(results);
  const toolContext = facts
    ? `${facts}\n\n---\nDonnées brutes:\n${summarizeToolResults(results)}`
    : summarizeToolResults(results);
  const toolsUsed = results.filter((r) => r.ok).map((r) => r.tool);
  const sources = results.map((r) => ({
    tool: r.tool,
    ok: r.ok,
    label: AI_TOOL_DESCRIPTIONS[r.tool] ?? r.tool,
  }));

  let provider = getAIProvider();
  let fallback = false;
  let output;

  // Mock : répondre avec le narratif factuel (chiffres Analytics exacts)
  if (provider.name === "mock") {
    output = {
      content:
        facts ??
        (results.some((r) => !r.ok && r.error)
          ? results
              .filter((r) => !r.ok)
              .map((r) => r.error)
              .join("\n")
          : "Je n'ai pas pu charger de données pour cette question."),
      promptTokens: Math.ceil(message.length / 4),
      completionTokens: Math.ceil((facts?.length ?? 40) / 4),
      provider: "mock",
    };
  } else {
    try {
      output = await provider.chat({
        systemPrompt: buildSystemPrompt(ctx),
        messages: [{ role: "user", content: message }],
        toolContext,
      });
    } catch (e) {
      const code = e instanceof Error ? e.message : "";
      if (
        code.startsWith("AI_PROVIDER_") ||
        code === "AI_PROVIDER_NOT_CONFIGURED" ||
        code === "AI_PROVIDER_TIMEOUT"
      ) {
        fallback = true;
        provider = new MockAIProvider();
        output = {
          content:
            (facts ?? "Les données n'ont pas pu être interprétées.") +
            "\n\n(Réponse de secours — provider IA indisponible.)",
          promptTokens: 0,
          completionTokens: 0,
          provider: "mock",
        };
      } else {
        throw e;
      }
    }
  }

  await pool.query(
    `INSERT INTO "AIMessage" (id, "conversationId", role, content, metadata)
     VALUES ($1,$2,'ASSISTANT'::"AIMessageRole",$3,$4::jsonb)`,
    [
      newId("aim"),
      conversationId,
      output.content,
      JSON.stringify({
        provider: output.provider,
        toolsUsed,
        sources,
        fallback,
        promptTokens: output.promptTokens,
        completionTokens: output.completionTokens,
      }),
    ],
  );

  await pool.query(
    `UPDATE "AIConversation" SET "updatedAt" = NOW() WHERE id = $1`,
    [conversationId],
  );

  await recordUsage(ctx.organizationId, {
    prompt: output.promptTokens,
    completion: output.completionTokens,
  });

  await writeAuditLog({
    organizationId: ctx.organizationId,
    actorId: ctx.userId,
    actorName: ctx.userDisplayName,
    entityType: "AIConversation",
    entityId: conversationId,
    action: "AI_CHAT",
    after: { toolsUsed, provider: output.provider, fallback },
  });

  return {
    conversationId,
    reply: output.content,
    toolsUsed,
    provider: output.provider,
    sources,
    fallback,
  };
}

export async function analyzeDashboard(
  ctx: AIRequestContext,
): Promise<AIDashboardInsight> {
  const filters = {
    period: resolvePreset("week"),
    compare: true,
    staffId: null,
    serviceId: null,
    resourceId: null,
  };

  const emptyDenied: AIDashboardInsight = {
    periodLabel: "cette semaine",
    empty: true,
    kpis: {
      revenue: 0,
      revenuePrevious: 0,
      revenueChangePercent: null,
      customersDelta: null,
      customersNew: 0,
      inactiveCustomers: 0,
      lowStockCount: 0,
      noShowRate: null,
      topServiceName: null,
      topServiceRevenueShare: null,
      revenueMonth: 0,
      revenuePrevMonth: 0,
      inactiveCustomers60d: 0,
    },
    bullets: [
      "Votre rôle n'a pas accès à l'analyse financière globale de l'institut.",
    ],
    opportunities: [],
    disclaimer:
      "Les chiffres affichés proviennent uniquement des KPI PostgreSQL autorisés pour votre rôle.",
  };

  if (ctx.role === "STAFF" || ctx.role === "CASHIER") {
    return emptyDenied;
  }

  const [overview, revenue, customers, inventory, appointments, topService] =
    await Promise.all([
      getAnalyticsOverview(ctx.organizationId, filters),
      getRevenueAnalytics(ctx.organizationId, filters),
      getCustomerAnalytics(ctx.organizationId, filters),
      getInventoryAnalytics(ctx.organizationId, filters),
      getAppointmentAnalytics(ctx.organizationId, filters),
      loadTopServiceShare(ctx.organizationId, "week"),
    ]);

  const revenueValue = overview.revenue.value;
  const revenuePrevious = overview.revenue.previous ?? revenue.totals.prevMonth;
  const revenueChangePercent = overview.revenue.changePercent;
  const customersNew = customers.kpis.newInPeriod;
  const customersDelta =
    overview.customers.previous != null
      ? overview.customers.value - overview.customers.previous
      : customersNew;
  const inactive = customers.kpis.inactive;
  const lowStock = inventory.lowStockCount;
  const noShowRate = appointments.noShow.rate;

  const empty =
    revenueValue === 0 &&
    customersNew === 0 &&
    inactive === 0 &&
    lowStock === 0 &&
    (appointments.total ?? 0) === 0;

  const bullets: string[] = [];
  const opportunities: { text: string; href: string }[] = [];

  if (topService.name && topService.share != null) {
    bullets.push(
      `${topService.name} est votre service le plus performant (${topService.share} % du CA services).`,
    );
    opportunities.push({
      text: `${topService.name} est votre service le plus performant.`,
      href: "/analytics/",
    });
  }
  if (inactive > 0) {
    opportunities.push({
      text: `${inactive} clientes n'ont pas repris d'activité récente — pensez à une relance.`,
      href: "/reactivation/",
    });
  }
  if (lowStock > 0) {
    opportunities.push({
      text: `${lowStock} produits passent sous le stock minimum.`,
      href: "/stock/",
    });
  }
  if (noShowRate != null && noShowRate >= 5) {
    opportunities.push({
      text: `Le taux de no-show est de ${noShowRate} %.`,
      href: "/settings/",
    });
  }

  return {
    periodLabel: "cette semaine",
    empty,
    kpis: {
      revenue: revenueValue,
      revenuePrevious,
      revenueChangePercent,
      customersDelta,
      customersNew,
      inactiveCustomers: inactive,
      lowStockCount: lowStock,
      noShowRate,
      topServiceName: topService.name,
      topServiceRevenueShare: topService.share,
      revenueMonth: revenueValue,
      revenuePrevMonth: revenuePrevious,
      inactiveCustomers60d: inactive,
    },
    bullets,
    opportunities,
    disclaimer:
      "Analyse basée sur les KPI Analytics (PostgreSQL). Aucun chiffre généré par le modèle de langage.",
  };
}

export async function getAIRecommendations(
  ctx: AIRequestContext,
): Promise<AIRecommendation[]> {
  if (ctx.role === "STAFF" || ctx.role === "CASHIER") return [];

  const insight = await analyzeDashboard(ctx);
  const recs: AIRecommendation[] = [];

  if (insight.kpis.inactiveCustomers > 0) {
    recs.push({
      id: "reactivate-inactive",
      title: "Opportunité relance",
      detail: `${insight.kpis.inactiveCustomers} clientes inactives — créez une campagne WhatsApp de retour.`,
      actionHref: "/reactivation/",
      actionLabel: "Ouvrir réactivation",
    });
  }
  if (insight.kpis.lowStockCount > 0) {
    recs.push({
      id: "restock",
      title: "Stock bas",
      detail: `${insight.kpis.lowStockCount} produits sous le minimum — planifiez un réassort.`,
      actionHref: "/stock/",
      actionLabel: "Voir le stock",
    });
  }
  if ((insight.kpis.noShowRate ?? 0) >= 8) {
    recs.push({
      id: "noshow",
      title: "No-shows",
      detail: `Taux de no-show à ${insight.kpis.noShowRate} % — vérifiez acomptes / rappels WhatsApp.`,
      actionHref: "/settings/",
      actionLabel: "Politique réservation",
    });
  }
  if (insight.kpis.topServiceName) {
    recs.push({
      id: "push-service",
      title: "Campagne service phare",
      detail: `Mettez en avant ${insight.kpis.topServiceName} auprès des clientes dormantes.`,
      actionHref: "/marketing/",
      actionLabel: "Créer une campagne",
    });
  }

  return recs;
}

export async function generateMessageDraft(
  ctx: AIRequestContext,
  input: AIGenerateMessageInput,
): Promise<AIGenerateMessageResult> {
  await assertAIQuota(ctx.organizationId, ctx.planCode);

  const loaded = await loadAIMessageContext(ctx.organizationId, input);
  const count = input.variantCount ?? 3;
  const generated = await generateMarketingVariants(ctx, loaded.facts, count);

  await recordUsage(ctx.organizationId, {
    prompt: generated.tokens.prompt,
    completion: generated.tokens.completion,
  });
  await writeAuditLog({
    organizationId: ctx.organizationId,
    actorId: ctx.userId,
    actorName: ctx.userDisplayName,
    entityType: "AIMessage",
    entityId: loaded.customer?.id ?? ctx.userId,
    action: "AI_GENERATE_MESSAGE",
    after: {
      kind: input.kind,
      tone: input.tone ?? "warm",
      language: input.language ?? "fr",
      channel: input.channel ?? "whatsapp",
      variantCount: generated.variants.length,
      customerId: loaded.customer?.id ?? null,
      provider: generated.provider,
      fallback: generated.fallback,
    },
  });

  return {
    variants: generated.variants,
    kind: input.kind,
    tone: input.tone ?? "warm",
    language: input.language ?? "fr",
    personalization: loaded.personalization,
    bookingUrl: loaded.bookingUrl,
    customer: loaded.customer,
    disclaimer:
      "Propositions à valider avant envoi. Aucun message WhatsApp n'est envoyé automatiquement.",
  };
}
