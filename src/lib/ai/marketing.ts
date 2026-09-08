import { Pool } from "pg";
import { buildPublicBookingUrl, slugifyLabel } from "@/lib/booking-qr";
import { getAIProvider } from "@/lib/ai/provider";
import {
  AI_MARKETING_ATTRIBUTION,
  type AIGenerateMessageInput,
  type AIMessageKind,
  type AIMessageLanguage,
  type AIMessageLlmFacts,
  type AIMessagePersonalization,
  type AIRequestContext,
} from "@/types/ai";
import type { WhatsAppTaskType } from "@/types/whatsapp";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export const AI_KIND_TO_WHATSAPP: Record<AIMessageKind, WhatsAppTaskType> = {
  inactive: "REACTIVATION",
  birthday: "BIRTHDAY",
  post_visit: "POST_VISIT",
  confirmation: "APPOINTMENT_CONFIRMATION",
  reactivation: "REACTIVATION",
  promotion: "PROMOTION",
};

const MARKETING_KINDS = new Set<AIMessageKind>([
  "inactive",
  "birthday",
  "post_visit",
  "reactivation",
  "promotion",
]);

export function isMarketingMessageKind(kind: AIMessageKind): boolean {
  return MARKETING_KINDS.has(kind);
}

function formatDateFr(d: Date): string {
  return d.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Africa/Casablanca",
  });
}

function formatTimeFr(d: Date): string {
  return d.toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Africa/Casablanca",
  });
}

export type AIMessageDbContext = {
  customer: {
    id: string;
    firstName: string;
    hasPhone: boolean;
    marketingWhatsapp: boolean;
  } | null;
  personalization: AIMessagePersonalization;
  facts: AIMessageLlmFacts;
  bookingUrl: string | null;
  appointmentId: string | null;
};

/**
 * Charge uniquement les faits utiles au message, scopés organizationId.
 * Téléphone / e-mail / notes / CA ne sont PAS dans `facts` (LLM).
 */
export async function loadAIMessageContext(
  organizationId: string,
  input: Pick<AIGenerateMessageInput, "customerId" | "appointmentId" | "kind" | "tone" | "language" | "promotion" | "objective">,
): Promise<AIMessageDbContext> {
  const tone = input.tone ?? "warm";
  const language = input.language ?? "fr";
  const kind = input.kind;
  const promotion = input.promotion?.trim() || null;
  const objective = input.objective?.trim() || null;

  const { rows: orgRows } = await pool.query<{
    name: string;
    slug: string;
  }>(`SELECT name, slug FROM "Organization" WHERE id = $1`, [organizationId]);
  const org = orgRows[0] ?? { name: "l'institut", slug: "" };

  let customer: AIMessageDbContext["customer"] = null;
  let lastService: string | null = null;
  let lastVisitDate: string | null = null;
  let recommendedService: string | null = null;
  let appointmentDate: string | null = null;
  let appointmentTime: string | null = null;
  let appointmentId: string | null = input.appointmentId ?? null;
  let serviceForUrl: string | null = null;

  if (input.customerId) {
    const { rows: custRows } = await pool.query<{
      id: string;
      firstName: string;
      phone: string | null;
      marketingWhatsapp: boolean;
    }>(
      `SELECT id, "firstName", phone, "marketingWhatsapp"
       FROM "Customer"
       WHERE id = $1 AND "organizationId" = $2 AND "deletedAt" IS NULL`,
      [input.customerId, organizationId],
    );
    const c = custRows[0];
    if (!c) throw new Error("CUSTOMER_NOT_FOUND");
    customer = {
      id: c.id,
      firstName: c.firstName,
      hasPhone: Boolean(c.phone?.trim()),
      marketingWhatsapp: c.marketingWhatsapp,
    };

    const { rows: lastRows } = await pool.query<{
      serviceName: string;
      startAt: Date;
    }>(
      `SELECT s.name AS "serviceName", a."startAt"
       FROM "Appointment" a
       JOIN "Service" s ON s.id = a."serviceId"
       WHERE a."customerId" = $1 AND a."organizationId" = $2
         AND a.status = 'COMPLETED'
       ORDER BY a."startAt" DESC
       LIMIT 1`,
      [c.id, organizationId],
    );
    if (lastRows[0]) {
      lastService = lastRows[0].serviceName;
      lastVisitDate = formatDateFr(new Date(lastRows[0].startAt));
    }

    const { rows: recRows } = await pool.query<{ serviceName: string }>(
      `SELECT s.name AS "serviceName"
       FROM "Appointment" a
       JOIN "Service" s ON s.id = a."serviceId"
       WHERE a."customerId" = $1 AND a."organizationId" = $2
         AND a.status = 'COMPLETED'
       GROUP BY s.name
       ORDER BY COUNT(*) DESC, MAX(a."startAt") DESC
       LIMIT 1`,
      [c.id, organizationId],
    );
    recommendedService = recRows[0]?.serviceName ?? lastService;
    serviceForUrl = recommendedService;
  }

  if (kind === "confirmation") {
    const aptId = input.appointmentId;
    const { rows: aptRows } = await pool.query<{
      id: string;
      startAt: Date;
      serviceName: string;
      customerId: string;
    }>(
      aptId
        ? `SELECT a.id, a."startAt", s.name AS "serviceName", a."customerId"
           FROM "Appointment" a
           JOIN "Service" s ON s.id = a."serviceId"
           WHERE a.id = $1 AND a."organizationId" = $2
             AND a.status IN ('PENDING','CONFIRMED')`
        : `SELECT a.id, a."startAt", s.name AS "serviceName", a."customerId"
           FROM "Appointment" a
           JOIN "Service" s ON s.id = a."serviceId"
           WHERE a."organizationId" = $1
             AND ($2::text IS NULL OR a."customerId" = $2)
             AND a.status IN ('PENDING','CONFIRMED')
             AND a."startAt" > NOW()
           ORDER BY a."startAt" ASC
           LIMIT 1`,
      aptId ? [aptId, organizationId] : [organizationId, input.customerId ?? null],
    );
    const apt = aptRows[0];
    if (aptId && !apt) throw new Error("APPOINTMENT_NOT_FOUND");
    if (apt) {
      if (customer && apt.customerId !== customer.id) throw new Error("APPOINTMENT_MISMATCH");
      appointmentId = apt.id;
      appointmentDate = formatDateFr(new Date(apt.startAt));
      appointmentTime = formatTimeFr(new Date(apt.startAt));
      serviceForUrl = apt.serviceName;
      if (!recommendedService) recommendedService = apt.serviceName;
    }
  }

  const bookingUrl = org.slug
    ? buildPublicBookingUrl({
        slug: org.slug,
        service: serviceForUrl ? slugifyLabel(serviceForUrl) : null,
        source: AI_MARKETING_ATTRIBUTION,
      })
    : null;

  const firstName = customer?.firstName ?? "{prénom}";
  const personalization: AIMessagePersonalization = {
    firstName,
    lastService,
    lastVisitDate,
    recommendedService,
    appointmentDate,
    appointmentTime,
  };

  const facts: AIMessageLlmFacts = {
    firstName,
    lastService,
    lastVisitDate,
    recommendedService,
    appointmentDate,
    appointmentTime,
    organizationName: org.name,
    promotion,
    bookingUrl,
    kind,
    tone,
    language,
    objective,
  };

  return { customer, personalization, facts, bookingUrl, appointmentId };
}

/** Texte facts pour le LLM — pas d'identifiants, pas de contact, pas de CA. */
export function formatLlmSafeFacts(facts: AIMessageLlmFacts): string {
  const lines = [
    `Prénom: ${facts.firstName}`,
    facts.lastService ? `Dernier service: ${facts.lastService}` : null,
    facts.lastVisitDate ? `Date dernière visite: ${facts.lastVisitDate}` : null,
    facts.recommendedService ? `Service recommandé: ${facts.recommendedService}` : null,
    facts.appointmentDate
      ? `Date RDV: ${facts.appointmentDate}${facts.appointmentTime ? ` à ${facts.appointmentTime}` : ""}`
      : null,
    `Institut: ${facts.organizationName}`,
    facts.promotion ? `Offre / code: ${facts.promotion}` : null,
    facts.bookingUrl ? `Lien de réservation: ${facts.bookingUrl}` : null,
    facts.objective ? `Consigne: ${facts.objective}` : null,
  ];
  return lines.filter(Boolean).join("\n");
}

const SENSITIVE_KEYS = [
  "phone",
  "email",
  "notes",
  "address",
  "instagram",
  "organizationId",
  "customerId",
  "ltv",
  "revenue",
  "lifetime",
];

export function assertFactsAreSafe(text: string): boolean {
  const lower = text.toLowerCase();
  return !SENSITIVE_KEYS.some((k) => lower.includes(k.toLowerCase() + ":"));
}

function kindGoal(kind: AIMessageKind, lang: AIMessageLanguage): string {
  const goals: Record<AIMessageLanguage, Record<AIMessageKind, string>> = {
    fr: {
      inactive: "relancer une cliente inactive avec bienveillance",
      birthday: "souhaiter un joyeux anniversaire et l'inviter à passer",
      post_visit: "prendre des nouvelles après une prestation et proposer le prochain RDV",
      confirmation: "confirmer un rendez-vous (date et heure fournies uniquement)",
      reactivation: "réactiver une cliente et proposer de réserver",
      promotion: "annoncer une offre sans inventer de prix",
    },
    darija: {
      inactive: "t3awd tcontacti cliente li makatjich",
      birthday: "tbarak liha f 3id miladha",
      post_visit: "t9oul labas 3liha mor lprestation",
      confirmation: "tconfirmi RDV",
      reactivation: "t3awd t3ayet liha tji",
      promotion: "t3len 3la offre",
    },
    ar: {
      inactive: "إعادة التواصل مع زبونة غير نشطة",
      birthday: "تهنئة بعيد الميلاد",
      post_visit: "متابعة بعد الخدمة واقتراح موعد قادم",
      confirmation: "تأكيد الموعد",
      reactivation: "دعوة للعودة",
      promotion: "عرض ترويجي",
    },
  };
  return goals[lang][kind];
}

function fill(template: string, f: AIMessageLlmFacts): string {
  return template
    .replaceAll("{prenom}", f.firstName)
    .replaceAll("{institut}", f.organizationName)
    .replaceAll("{lastService}", f.lastService ?? "soin")
    .replaceAll("{lastVisit}", f.lastVisitDate ?? "")
    .replaceAll("{recommended}", f.recommendedService ?? f.lastService ?? "soin")
    .replaceAll("{rdvDate}", f.appointmentDate ?? "")
    .replaceAll("{rdvTime}", f.appointmentTime ?? "")
    .replaceAll("{promo}", f.promotion ?? "")
    .replaceAll("{url}", f.bookingUrl ?? "")
    .replaceAll("{objectif}", f.objective ?? "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function withPromo(f: AIMessageLlmFacts, lineFr: string, lineDarija: string, lineAr: string): string {
  if (!f.promotion) return "";
  if (f.language === "darija") return `\n${lineDarija} ${f.promotion}.`;
  if (f.language === "ar") return `\n${lineAr} ${f.promotion}.`;
  return `\n${lineFr} ${f.promotion}.`;
}

function withUrl(f: AIMessageLlmFacts): string {
  return f.bookingUrl ? `\n${f.bookingUrl}` : "";
}

function lastVisitBit(f: AIMessageLlmFacts, fr: string, darija: string, ar: string): string {
  if (!f.lastVisitDate) return "";
  if (f.language === "darija") return darija.replace("{lastVisit}", f.lastVisitDate);
  if (f.language === "ar") return ar.replace("{lastVisit}", f.lastVisitDate);
  return fr.replace("{lastVisit}", f.lastVisitDate);
}

export function buildMockVariants(
  facts: AIMessageLlmFacts,
  count: number,
): string[] {
  const f = facts;
  const k = f.kind;
  const t = f.tone;
  const lang = f.language;
  const drafts: string[] = [];

  if (lang === "fr") {
    if (k === "confirmation") {
      drafts.push(
        fill(
          t === "short"
            ? "Bonjour {prenom}, RDV {rdvDate} à {rdvTime} pour {recommended} à {institut}. Merci de confirmer 🌸"
            : t === "professional"
              ? "Bonjour {prenom},\n\nNous confirmons votre rendez-vous du {rdvDate} à {rdvTime} pour {recommended} à {institut}.\n\nMerci de nous confirmer votre présence."
              : "Bonjour {prenom} 👋\n\nVotre rendez-vous du {rdvDate} à {rdvTime} pour {recommended} est bien noté.\n\nUn petit oui pour confirmer et on s'occupe du reste 🌸",
          f,
        ),
      );
      drafts.push(
        fill(
          "Bonjour {prenom},\nPetit rappel : {rdvDate} à {rdvTime} — {recommended} chez {institut}. Confirmez-nous s'il vous plaît.",
          f,
        ),
      );
      drafts.push(
        fill(
          "Bonjour {prenom} 🌸\nOn vous attend le {rdvDate} à {rdvTime} pour votre {recommended}. Merci de confirmer.",
          f,
        ),
      );
    } else if (k === "birthday") {
      drafts.push(
        fill(
          t === "short"
            ? "Joyeux anniversaire {prenom} 🎂 On vous attend à {institut} !{promoLine}"
            : "Joyeux anniversaire {prenom} 🎂\n\nToute l'équipe {institut} vous souhaite une belle journée.\nPassez nous voir, on a une petite attention pour vous.{promoLine}{urlLine}",
          {
            ...f,
          },
        ).replace("{promoLine}", withPromo(f, "Offre :", "", "")).replace("{urlLine}", withUrl(f)),
      );
      drafts.push(
        fill(
          "Bonjour {prenom},\nJoyeux anniversaire ! {institut} serait ravi de vous fêter.{promo}{url}",
          f,
        ),
      );
      drafts.push(
        fill(
          "{prenom}, joyeux anniversaire 🎉 Votre {recommended} vous attend quand vous voulez.",
          f,
        ) + withUrl(f),
      );
    } else if (k === "post_visit") {
      const visit = lastVisitBit(
        f,
        " Votre dernière visite date du {lastVisit}.",
        "",
        "",
      );
      drafts.push(
        fill(
          t === "short"
            ? "Bonjour {prenom}, j'espère que votre {lastService} vous a plu. On rebook ?{url}"
            : `Bonjour {prenom} 👋\n\nNous espérons que vous avez apprécié votre {lastService}.${visit}\nUn {recommended} serait idéal pour la suite.\n\nSouhaitez-vous un créneau ?{url}`,
          f,
        ),
      );
      drafts.push(
        fill(
          "Bonjour {prenom},\nUn mot après votre {lastService} : tout s'est bien passé ?\nOn peut prévoir votre prochain {recommended} quand vous voulez.{url}",
          f,
        ),
      );
      drafts.push(
        fill(
          "{prenom}, merci pour votre visite. Pour entretenir le résultat de votre {lastService}, on vous conseille un {recommended}.{url}",
          f,
        ),
      );
    } else if (k === "promotion") {
      drafts.push(
        fill(
          t === "short"
            ? "Bonjour {prenom}, offre {promo} sur {recommended} à {institut}.{url}"
            : "Bonjour {prenom},\n\n{objectif}\n{promo}\n\nIdéal pour un {recommended}. Réservez ici :{url}",
          f,
        ),
      );
      drafts.push(
        fill(
          "Bonjour {prenom} 🌸 Une attention {institut} : {promo} {objectif}\nVotre {recommended} vous attend.{url}",
          f,
        ),
      );
      drafts.push(
        fill(
          "{prenom}, petite offre du moment chez {institut} : {promo}. Répondez à ce message pour réserver.",
          f,
        ),
      );
    } else {
      // inactive / reactivation
      const visit = lastVisitBit(f, " (dernière visite le {lastVisit})", "", "");
      drafts.push(
        fill(
          t === "short"
            ? "Bonjour {prenom}, on aimerait vous revoir pour un {recommended} 🌸{url}"
            : `Bonjour {prenom} 🌸\n\nCela fait un moment que nous ne vous avons pas vue${visit}.\nVotre dernier {lastService} nous manque — un {recommended} vous ferait du bien.\n\nRépondez à ce message pour réserver.{promoLine}{url}`,
          f,
        ).replace("{promoLine}", withPromo(f, "Offre :", "", "")),
      );
      drafts.push(
        fill(
          "Bonjour {prenom},\nNous serions ravis de vous retrouver à {institut} pour un {recommended}.{promo}{url}",
          f,
        ),
      );
      drafts.push(
        fill(
          "{prenom}, un petit mot de {institut} : on pense à vous. Souhaitez-vous un créneau pour {recommended} ?",
          f,
        ) + withUrl(f),
      );
    }
  } else if (lang === "darija") {
    if (k === "confirmation") {
      drafts.push(
        fill(
          t === "short"
            ? "Salam {prenom}, RDV {rdvDate} f {rdvTime} l {recommended}. Confirmi 3afak 🌸"
            : "Salam {prenom} 👋\n\nRDV dyalek {rdvDate} f {rdvTime} l {recommended} 3end {institut}.\n\nConfirmi lina please.",
          f,
        ),
      );
      drafts.push(
        fill("Salam {prenom}, ntsnawik {rdvDate} f {rdvTime}. {recommended}. OK?", f),
      );
      drafts.push(
        fill(
          "{prenom}, rappel : {rdvDate} à {rdvTime} — {recommended} 3end {institut}.",
          f,
        ),
      );
    } else if (k === "birthday") {
      drafts.push(
        fill(
          "Mbrouk 3id miladek {prenom} 🎂\nFariqin {institut} kaytmenaw lik nhar zwine. Aji tchofi 3endna!{url}",
          f,
        ),
      );
      drafts.push(fill("Salam {prenom}, mbrouk 🎂 {promo} {institut}", f));
      drafts.push(
        fill("{prenom} mbrouk! {recommended} kaysenk.{url}", f),
      );
    } else if (k === "post_visit") {
      drafts.push(
        fill(
          "Salam {prenom}, labas? {lastService} 3ejbek?\nNqdero n3awdo {recommended} melli tbghi.{url}",
          f,
        ),
      );
      drafts.push(
        fill(
          "{prenom}, chokran 3la ziyara. {recommended} mzyan l continuation.{url}",
          f,
        ),
      );
      drafts.push(
        fill("Salam {prenom} 🌸 {lastService} daz mzyan? Aji nqado RDV.{url}", f),
      );
    } else if (k === "promotion") {
      drafts.push(
        fill("Salam {prenom}, offre {promo} 3la {recommended} 3end {institut}.{url}", f),
      );
      drafts.push(
        fill("{prenom} 🌸 {objectif} {promo} — {recommended}.{url}", f),
      );
      drafts.push(fill("Salam {prenom}, promo {institut} : {promo}. Jawb l message.", f));
    } else {
      drafts.push(
        fill(
          t === "short"
            ? "Salam {prenom}, twahchnak 🌸 {recommended}?{url}"
            : "Salam {prenom} 🌸\n\nMakaynach chftinak had lmodda.\nAkhir {lastService} kan zwine — bghitin t3awdi {recommended}?\n\nJawb l had message.{url}",
          f,
        ),
      );
      drafts.push(
        fill("Salam {prenom}, ntsnawik 3end {institut} l {recommended}.{promo}{url}", f),
      );
      drafts.push(
        fill("{prenom}, twahchnak f {institut}. T9dri tji l {recommended}?", f) +
          withUrl(f),
      );
    }
  } else {
    // ar
    if (k === "confirmation") {
      drafts.push(
        fill(
          t === "short"
            ? "مرحبا {prenom}، موعدك {rdvDate} الساعة {rdvTime} لخدمة {recommended}. يرجى التأكيد."
            : "مرحبا {prenom}،\n\nنؤكد موعدك يوم {rdvDate} الساعة {rdvTime} لخدمة {recommended} في {institut}.\n\nيرجى تأكيد الحضور.",
          f,
        ),
      );
      drafts.push(
        fill("مرحبا {prenom}، تذكير: {rdvDate} الساعة {rdvTime} — {recommended}.", f),
      );
      drafts.push(
        fill("{prenom}، ننتظرك {rdvDate} الساعة {rdvTime} لـ {recommended}.", f),
      );
    } else if (k === "birthday") {
      drafts.push(
        fill(
          "عيد ميلاد سعيد {prenom} 🎂\nفريق {institut} يتمنى لك يوماً جميلاً. نسعد بزيارتك.{url}",
          f,
        ),
      );
      drafts.push(fill("مرحبا {prenom}، عيد ميلاد سعيد. {promo} {institut}", f));
      drafts.push(fill("{prenom}، كل عام وأنتِ بخير. {recommended} بانتظارك.{url}", f));
    } else if (k === "post_visit") {
      drafts.push(
        fill(
          "مرحبا {prenom}، نأمل أن تكوني قد استمتعتِ بـ {lastService}.\nنقترح {recommended} للمتابعة.{url}",
          f,
        ),
      );
      drafts.push(
        fill("{prenom}، شكراً لزيارتك. هل نحدد موعداً لـ {recommended}؟{url}", f),
      );
      drafts.push(
        fill("مرحبا {prenom} 🌸 كيف كانت جلسة {lastService}؟{url}", f),
      );
    } else if (k === "promotion") {
      drafts.push(
        fill("مرحبا {prenom}، عرض {promo} على {recommended} في {institut}.{url}", f),
      );
      drafts.push(fill("{prenom}، {objectif} {promo} — {recommended}.{url}", f));
      drafts.push(fill("مرحبا {prenom}، عرض {institut}: {promo}. ردي على الرسالة للحجز.", f));
    } else {
      drafts.push(
        fill(
          t === "short"
            ? "مرحبا {prenom}، مشتاقون لرؤيتك. {recommended}؟{url}"
            : "مرحبا {prenom}،\n\nلم نركِ منذ فترة.\nآخر خدمة كانت {lastService} — نقترح {recommended}.\n\nردي على الرسالة للحجز.{url}",
          f,
        ),
      );
      drafts.push(
        fill("مرحبا {prenom}، يسعدنا استقبالك في {institut} لخدمة {recommended}.{promo}{url}", f),
      );
      drafts.push(
        fill("{prenom}، فريق {institut} يفكر فيكِ. هل تحجزين {recommended}؟", f) +
          withUrl(f),
      );
    }
  }

  const unique = [...new Set(drafts.map((d) => d.trim()).filter(Boolean))];
  while (unique.length < count && unique.length > 0) {
    unique.push(unique[unique.length % drafts.length] ?? unique[0]);
  }
  return unique.slice(0, count).map((v) => (t === "short" ? v.replace(/\n\n/g, "\n").slice(0, 320) : v));
}

export function buildMarketingSystemPrompt(facts: AIMessageLlmFacts, count: number): string {
  const langLabel =
    facts.language === "ar"
      ? "arabe (الفصحى المبسطة، مناسب لواتساب المغرب)"
      : facts.language === "darija"
        ? "darija marocaine en alphabet latin (style WhatsApp)"
        : "français";
  const toneLabel =
    facts.tone === "short"
      ? "très court (2 à 4 lignes max)"
      : facts.tone === "professional"
        ? "professionnel, poli, sans familiarité excessive"
        : "chaleureux, humain, institut de beauté";

  return [
    "Tu rédiges des messages WhatsApp pour un institut de beauté au Maroc (Rappel Beauty).",
    `Objectif: ${kindGoal(facts.kind, facts.language)}.`,
    `Langue OBLIGATOIRE: ${langLabel}.`,
    `Ton: ${toneLabel}.`,
    `Produis exactement ${count} variantes différentes.`,
    "Réponds UNIQUEMENT en JSON: {\"variants\":[\"...\",\"...\"]}",
    "Règles strictes:",
    "- N'utilise QUE les faits fournis. N'invente ni prix, ni date, ni service, ni code promo.",
    "- N'inclus jamais téléphone, e-mail, notes médicales, CA, ni identifiants.",
    "- Si un fait manque (ex. date de visite), ne l'invente pas : omets-le.",
    "- Place le lien de réservation s'il est fourni, tel quel.",
    "- Tutoiement ou vouvoiement selon le ton (chaleureux = tu, professionnel = vous).",
    "- Aucun envoi automatique : ce sont des brouillons à valider par l'employée.",
  ].join("\n");
}

function parseVariantsJson(content: string, fallback: string[]): string[] {
  const trimmed = content.trim();
  const jsonMatch = trimmed.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return fallback;
  try {
    const parsed = JSON.parse(jsonMatch[0]) as { variants?: unknown };
    if (!Array.isArray(parsed.variants)) return fallback;
    const list = parsed.variants
      .filter((v): v is string => typeof v === "string")
      .map((v) => v.trim())
      .filter(Boolean);
    return list.length ? list : fallback;
  } catch {
    return fallback;
  }
}

export async function generateMarketingVariants(
  _ctx: AIRequestContext,
  facts: AIMessageLlmFacts,
  variantCount: number,
): Promise<{ variants: string[]; provider: string; fallback: boolean; tokens: { prompt: number; completion: number } }> {
  const mock = buildMockVariants(facts, variantCount);
  let provider = getAIProvider();

  if (provider.name === "mock") {
    return {
      variants: mock,
      provider: "mock",
      fallback: false,
      tokens: {
        prompt: 80,
        completion: Math.ceil(mock.join("").length / 4),
      },
    };
  }

  try {
    const output = await provider.chat({
      systemPrompt: buildMarketingSystemPrompt(facts, variantCount),
      messages: [
        {
          role: "user",
          content: `Rédige ${variantCount} messages WhatsApp.`,
        },
      ],
      toolContext: formatLlmSafeFacts(facts),
      temperature: 0.5,
    });
    const variants = parseVariantsJson(output.content, mock).slice(0, variantCount);
    while (variants.length < variantCount) {
      variants.push(mock[variants.length % mock.length] ?? mock[0]);
    }
    return {
      variants,
      provider: output.provider,
      fallback: false,
      tokens: {
        prompt: output.promptTokens,
        completion: output.completionTokens,
      },
    };
  } catch (e) {
    const code = e instanceof Error ? e.message : "";
    if (
      code.startsWith("AI_PROVIDER_") ||
      code === "AI_PROVIDER_NOT_CONFIGURED" ||
      code === "AI_PROVIDER_TIMEOUT"
    ) {
      const fb = new MockAIProvider();
      void fb;
      return {
        variants: mock,
        provider: "mock",
        fallback: true,
        tokens: { prompt: 0, completion: 0 },
      };
    }
    throw e;
  }
}
