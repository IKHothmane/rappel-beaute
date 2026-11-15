import { randomBytes } from "crypto";
import { pool } from "@/lib/db/pool";
import { logger } from "@/lib/logger";
import { LOYALTY_PHONE_ALREADY_KNOWN_CODE } from "@/lib/loyalty/profile-input";

/**
 * Signale au personnel qu'une cliente a saisi un numéro déjà rattaché à une autre fiche de l'institut.
 * Aucune donnée personnelle : ni numéro, ni nom, ni identifiant de l'autre fiche (institut + carte + code).
 * Un journal structuré est toujours émis ; la ligne d'audit (table AuditLog existante, sans migration)
 * est dédupliquée sur 24 h par entité pour qu'un envoi répété ne la multiplie pas. Ne lève jamais :
 * ce signalement ne doit pas transformer un refus normal en erreur serveur.
 */
export async function recordPhoneAlreadyKnown(input: {
  organizationId: string;
  entityType: "LoyaltyCard" | "LoyaltyJoinQr";
  entityId: string;
  source: "card_profile" | "card_feedback" | "join_form";
}): Promise<void> {
  logger.warn("loyalty.phone_already_known", {
    organizationId: input.organizationId,
    entityType: input.entityType,
    entityId: input.entityId,
    code: LOYALTY_PHONE_ALREADY_KNOWN_CODE,
    source: input.source,
  });
  try {
    await pool.query(
      `INSERT INTO "AuditLog" (id, "organizationId", "actorId", "actorName", "entityType", "entityId", action, "after")
       SELECT $1, $2, NULL, 'Fidélité (public)', $3, $4, $5, $6::jsonb
       WHERE NOT EXISTS (
         SELECT 1 FROM "AuditLog"
         WHERE "organizationId" = $2 AND "entityType" = $3 AND "entityId" = $4 AND action = $5
           AND "createdAt" > NOW() - INTERVAL '24 hours'
       )`,
      [
        `aud_${randomBytes(8).toString("hex")}`,
        input.organizationId,
        input.entityType,
        input.entityId,
        LOYALTY_PHONE_ALREADY_KNOWN_CODE,
        JSON.stringify({ code: LOYALTY_PHONE_ALREADY_KNOWN_CODE, source: input.source }),
      ],
    );
  } catch (error) {
    logger.warn("loyalty.phone_already_known.audit_failed", {
      organizationId: input.organizationId,
      entityId: input.entityId,
      reason: error instanceof Error ? error.name : "unknown",
    });
  }
}
