import { pool } from "@/lib/db/pool";

/**
 * Tutoriel de prise en main du propriétaire (table "UserTutorialState", RLS tenant_isolation).
 *
 * - userId et organizationId viennent toujours de la session, jamais du corps de la requête.
 * - Éligibilité sans rattrapage : seul un OWNER d'un nouvel institut sans ligne, service ni rendez-vous reçoit la ligne
 *   NOT_STARTED (créée à la première lecture). Un ancien compte actif n'obtient jamais de ligne, sauf par l'action
 *   explicite « reset » (« Revoir le tutoriel »).
 * - Chaque action est une transaction : ligne verrouillée (FOR UPDATE), transition validée, mise à jour atomique.
 * - Table absente (SQLSTATE 42P01, migration non appliquée) : lecture dégradée, écriture refusée proprement.
 */

export const TUTORIAL_ACTIONS = ["start", "step", "pause", "skip", "complete", "reset"] as const;
export type TutorialAction = (typeof TUTORIAL_ACTIONS)[number];

export const TUTORIAL_STEPS = ["welcome", "services", "staff", "planning", "resources", "agenda"] as const;
export type TutorialStep = (typeof TUTORIAL_STEPS)[number];

export type TutorialStatus = "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED" | "SKIPPED";

export type TutorialSnapshot = { status: TutorialStatus; lastStep: string | null; version: number };

export type TutorialProgress = {
  services: number;
  staff: number;
  staffWithSchedule: number;
  resources: number;
  appointments: number;
};

export type TutorialState = {
  tutorial: TutorialSnapshot | null;
  progress: TutorialProgress;
  eligible: boolean;
};

export type TutorialActionResult =
  | ({ kind: "ok" } & TutorialState)
  | { kind: "invalid_transition"; status: TutorialStatus | null }
  | { kind: "unavailable" };

export const EMPTY_PROGRESS: TutorialProgress = { services: 0, staff: 0, staffWithSchedule: 0, resources: 0, appointments: 0 };

export const isTutorialAction = (value: unknown): value is TutorialAction =>
  typeof value === "string" && (TUTORIAL_ACTIONS as readonly string[]).includes(value);
export const isTutorialStep = (value: unknown): value is TutorialStep =>
  typeof value === "string" && (TUTORIAL_STEPS as readonly string[]).includes(value);

/** SQLSTATE 42P01 : relation absente (migration non encore appliquée). */
export function isMissingTutorialTable(error: unknown): boolean {
  return typeof error === "object" && error !== null && (error as { code?: unknown }).code === "42P01";
}

type Row = { status: TutorialStatus; lastStep: string | null; version: number };
const snapshot = (row: Row): TutorialSnapshot => ({ status: row.status, lastStep: row.lastStep ?? null, version: Number(row.version) || 1 });
const isActive = (status: TutorialStatus) => status === "NOT_STARTED" || status === "IN_PROGRESS";

/**
 * Avancement réel de l'institut, en une requête (sous-requêtes scalaires). L'institut est filtré explicitement en
 * plus de la RLS. StaffSchedule n'a pas d'organizationId : l'institut passe par le membre du personnel.
 */
const PROGRESS_SQL = `
  SELECT
    (SELECT COUNT(*) FROM "Service" WHERE "organizationId" = $1 AND active)::int AS services,
    (SELECT COUNT(*) FROM "Staff" WHERE "organizationId" = $1 AND "deletedAt" IS NULL AND status <> 'ARCHIVED')::int AS staff,
    (SELECT COUNT(DISTINCT st.id)
       FROM "StaffSchedule" ss
       JOIN "Staff" st ON st.id = ss."staffId"
      WHERE st."organizationId" = $1 AND st."deletedAt" IS NULL AND st.status <> 'ARCHIVED' AND ss.active)::int AS "staffWithSchedule",
    (SELECT COUNT(*) FROM "Resource" WHERE "organizationId" = $1 AND "deletedAt" IS NULL AND active)::int AS resources,
    (SELECT COUNT(*) FROM "Appointment" WHERE "organizationId" = $1 AND status <> 'CANCELLED')::int AS appointments`;

type Queryable = { query: (text: string, values?: unknown[]) => Promise<{ rows: Record<string, unknown>[] }> };

async function readProgress(db: Queryable, organizationId: string): Promise<TutorialProgress> {
  const { rows } = await db.query(PROGRESS_SQL, [organizationId]);
  const row = rows[0] ?? {};
  const n = (key: keyof TutorialProgress) => Number(row[key]) || 0;
  return { services: n("services"), staff: n("staff"), staffWithSchedule: n("staffWithSchedule"), resources: n("resources"), appointments: n("appointments") };
}

async function canCreateAutomatically(db: Queryable, organizationId: string, progress: TutorialProgress) {
  if (progress.services > 0 || progress.appointments > 0) return false;
  const { rows } = await db.query(
    `SELECT 1 FROM "Organization"
      WHERE id = $1 AND "tutorialAutoEligible"
        AND NOT EXISTS (SELECT 1 FROM "Service" WHERE "organizationId" = $1)
        AND NOT EXISTS (SELECT 1 FROM "Appointment" WHERE "organizationId" = $1)`,
    [organizationId],
  );
  return rows.length > 0;
}

const SELECT_SQL = `SELECT status, "lastStep", version FROM "UserTutorialState" WHERE "userId" = $1 AND "organizationId" = $2`;
const INSERT_NOT_STARTED_SQL = `INSERT INTO "UserTutorialState" ("userId", "organizationId", status, "createdAt", "updatedAt")
     VALUES ($1, $2, 'NOT_STARTED', now(), now())
     ON CONFLICT ("userId") DO NOTHING
     RETURNING status, "lastStep", version`;

/**
 * Lecture pour la session. Un non-OWNER ne voit rien (tutorial null, jamais éligible, aucune requête). Pour un OWNER
 * sans ligne, la ligne NOT_STARTED n'est créée que si l'institut est encore vide (aucun service, aucun rendez-vous).
 */
export async function getTutorialState(opts: { userId: string; organizationId: string; isOwner: boolean }): Promise<TutorialState> {
  if (!opts.isOwner) return { tutorial: null, progress: EMPTY_PROGRESS, eligible: false };
  const progress = await readProgress(pool as unknown as Queryable, opts.organizationId);
  try {
    const { rows } = await pool.query<Row>(SELECT_SQL, [opts.userId, opts.organizationId]);
    if (rows[0]) return { tutorial: snapshot(rows[0]), progress, eligible: isActive(rows[0].status) };
    if (!(await canCreateAutomatically(pool as unknown as Queryable, opts.organizationId, progress))) {
      return { tutorial: null, progress, eligible: false };
    }

    const inserted = await pool.query<Row>(INSERT_NOT_STARTED_SQL, [opts.userId, opts.organizationId]);
    // Insertion concurrente : la ligne du gagnant fait foi.
    const row = inserted.rows[0] ?? (await pool.query<Row>(SELECT_SQL, [opts.userId, opts.organizationId])).rows[0];
    if (!row) return { tutorial: null, progress, eligible: false };
    return { tutorial: snapshot(row), progress, eligible: isActive(row.status) };
  } catch (error) {
    if (isMissingTutorialTable(error)) return { tutorial: null, progress, eligible: false };
    throw error;
  }
}

type Update = { status: TutorialStatus; lastStep: string | null; setStarted: boolean; clearEnds: boolean; ended: "completed" | "skipped" | null };

/**
 * Transition pure : renvoie la mise à jour à appliquer, "noop" (action idempotente déjà satisfaite) ou null
 * (transition interdite). `step` est déjà validé (liste blanche) par l'appelant.
 */
export function planTransition(
  status: TutorialStatus,
  lastStep: string | null,
  action: TutorialAction,
  step: TutorialStep | undefined,
): Update | "noop" | null {
  const keep = { setStarted: false, clearEnds: false, ended: null } as const;
  switch (action) {
    case "start":
      return isActive(status) ? { status: "IN_PROGRESS", lastStep, ...keep, setStarted: true } : null;
    case "step":
      if (!step || !isActive(status)) return null;
      return { status: "IN_PROGRESS", lastStep: step, ...keep, setStarted: true };
    case "pause":
      if (status !== "IN_PROGRESS") return null;
      return { status: "IN_PROGRESS", lastStep: step ?? lastStep, ...keep };
    case "skip":
      if (status === "SKIPPED") return "noop";
      return isActive(status) ? { status: "SKIPPED", lastStep, ...keep, ended: "skipped" } : null;
    case "complete":
      if (status === "COMPLETED") return "noop";
      return isActive(status) ? { status: "COMPLETED", lastStep, ...keep, setStarted: true, ended: "completed" } : null;
    case "reset":
      return { status: "IN_PROGRESS", lastStep: null, setStarted: true, clearEnds: true, ended: null };
    default:
      return null;
  }
}

/**
 * Applique une action du propriétaire. Une seule transaction : ligne verrouillée, transition validée, mise à jour.
 * Sans ligne : « reset » la crée (même pour un ancien compte) ; les autres actions ne la créent que si l'institut est
 * encore vide (même règle d'éligibilité que la lecture). Autrement : transition interdite.
 */
export async function applyTutorialAction(opts: {
  userId: string;
  organizationId: string;
  action: TutorialAction;
  step?: TutorialStep;
}): Promise<TutorialActionResult> {
  const client = await pool.connect();
  let finalRow: Row | null = null;
  try {
    await client.query("BEGIN");
    let current = (await client.query<Row>(`${SELECT_SQL} FOR UPDATE`, [opts.userId, opts.organizationId])).rows[0];

    if (!current) {
      let create = opts.action === "reset";
      if (!create) {
        const progress = await readProgress(client as unknown as Queryable, opts.organizationId);
        create = await canCreateAutomatically(client as unknown as Queryable, opts.organizationId, progress);
      }
      if (!create) {
        await client.query("ROLLBACK");
        return { kind: "invalid_transition", status: null };
      }
      await client.query(INSERT_NOT_STARTED_SQL, [opts.userId, opts.organizationId]);
      // Relecture verrouillée : couvre aussi la ligne créée en parallèle par une autre requête.
      current = (await client.query<Row>(`${SELECT_SQL} FOR UPDATE`, [opts.userId, opts.organizationId])).rows[0];
      if (!current) throw new Error("UserTutorialState introuvable après insertion");
    }

    const plan = planTransition(current.status, current.lastStep, opts.action, opts.step);
    if (!plan) {
      await client.query("ROLLBACK");
      return { kind: "invalid_transition", status: current.status };
    }
    if (plan === "noop") {
      finalRow = current;
    } else {
      const { rows } = await client.query<Row>(
        `UPDATE "UserTutorialState"
            SET status = $3,
                "lastStep" = $4,
                "startedAt" = CASE WHEN $5::boolean THEN now() WHEN $6::boolean THEN COALESCE("startedAt", now()) ELSE "startedAt" END,
                "completedAt" = CASE WHEN $5::boolean THEN NULL WHEN $7::text = 'completed' THEN now() ELSE "completedAt" END,
                "skippedAt" = CASE WHEN $5::boolean THEN NULL WHEN $7::text = 'skipped' THEN now() ELSE "skippedAt" END,
                "updatedAt" = now()
          WHERE "userId" = $1 AND "organizationId" = $2
        RETURNING status, "lastStep", version`,
        [opts.userId, opts.organizationId, plan.status, plan.lastStep, plan.clearEnds, plan.setStarted, plan.ended],
      );
      finalRow = rows[0] ?? null;
      if (!finalRow) throw new Error("UserTutorialState non mis à jour");
    }
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    if (isMissingTutorialTable(error)) return { kind: "unavailable" };
    throw error;
  } finally {
    client.release();
  }

  const progress = await readProgress(pool as unknown as Queryable, opts.organizationId);
  return { kind: "ok", tutorial: snapshot(finalRow), progress, eligible: isActive(finalRow.status) };
}
