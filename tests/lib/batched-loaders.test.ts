import { beforeEach, describe, expect, it, vi } from "vitest";

const { query } = vi.hoisted(() => ({ query: vi.fn() }));
vi.mock("@/lib/db/pool", () => ({ pool: { query } }));

import { getPurchaseById } from "@/lib/db/procurement";
import { listResources } from "@/lib/db/resources";
import { listStaff } from "@/lib/db/staff";

const DAY = 24 * 60 * 60 * 1000;

function sqlOf(call: unknown[]): string {
  return String(call[0]);
}

beforeEach(() => {
  query.mockReset();
});

describe("listStaff (agenda) : tables enfants chargées par lot", () => {
  const staffRows = [
    { id: "st_1", firstName: "Sara", lastName: "Amrani", status: "ACTIVE" },
    { id: "st_2", firstName: "Lina", lastName: "Bennis", status: "ON_LEAVE" },
    { id: "st_3", firstName: "Nora", lastName: "", status: "ACTIVE" },
  ];
  const d = (iso: string) => new Date(iso);

  function installStaffMock() {
    query.mockImplementation(async (sql: string) => {
      if (sql.includes('UPDATE "Staff"')) return { rows: [], rowCount: 0 };
      if (sql.includes('FROM "Staff" st') && sql.includes("st.status IN")) return { rows: staffRows };
      if (sql.includes('FROM "StaffSchedule"')) {
        return {
          rows: [
            { staffId: "st_2", id: "sch_2", dayOfWeek: 1, startTime: "09:00", endTime: "17:00", active: true },
            { staffId: "st_1", id: "sch_1a", dayOfWeek: 1, startTime: "09:00", endTime: "18:00", active: true },
            { staffId: "st_1", id: "sch_1b", dayOfWeek: 2, startTime: "10:00", endTime: "18:00", active: false },
          ],
        };
      }
      if (sql.includes('FROM "StaffBreak"')) {
        return { rows: [{ staffId: "st_1", id: "br_1", dayOfWeek: 1, startTime: "12:00", endTime: "13:00" }] };
      }
      if (sql.includes('FROM "StaffLeave"')) {
        return {
          rows: [
            {
              staffId: "st_2",
              id: "lv_ok",
              startAt: d("2030-01-02T00:00:00Z"),
              endAt: d("2030-01-05T00:00:00Z"),
              type: "VACATION",
              reason: null,
              status: "APPROVED",
              createdAt: d("2029-12-01T00:00:00Z"),
            },
            {
              staffId: "st_2",
              id: "lv_pending",
              startAt: d("2030-02-02T00:00:00Z"),
              endAt: d("2030-02-05T00:00:00Z"),
              type: "VACATION",
              reason: "x",
              status: "PENDING",
              createdAt: d("2029-12-02T00:00:00Z"),
            },
          ],
        };
      }
      if (sql.includes('FROM "StaffOvertime"')) {
        return {
          rows: [
            { staffId: "st_3", id: "ot_1", startAt: d("2030-01-02T08:00:00Z"), endAt: d("2030-01-02T10:00:00Z"), reason: "r" },
          ],
        };
      }
      if (sql.includes('FROM "StaffReplacement" r') && sql.includes('r."absentStaffId" = ANY')) {
        return {
          rows: [
            {
              absentStaffId: "st_1",
              id: "rp_1",
              startAt: d("2030-01-03T00:00:00Z"),
              endAt: d("2030-01-04T00:00:00Z"),
              substituteStaffId: "st_3",
              substituteName: "Nora ",
            },
          ],
        };
      }
      if (sql.includes('FROM "StaffReplacement" r') && sql.includes('r."substituteStaffId" = ANY')) {
        return {
          rows: [
            {
              substituteStaffId: "st_3",
              id: "rp_1",
              startAt: d("2030-01-03T00:00:00Z"),
              endAt: d("2030-01-04T00:00:00Z"),
              absentStaffId: "st_1",
              absentName: "Sara Amrani",
            },
          ],
        };
      }
      throw new Error(`requête inattendue : ${sql.slice(0, 80)}`);
    });
  }

  it("utilise 6 requêtes enfants quel que soit le nombre d'employées et regroupe par employée", async () => {
    installStaffMock();
    const before = Date.now();
    const { items, total } = await listStaff("org_1", { page: 1, limit: 50, agenda: true });
    const after = Date.now();

    // 2 synchronisations des congés + 1 liste + 6 tables enfants (et non 6 par employée).
    expect(query).toHaveBeenCalledTimes(9);
    expect(total).toBe(3);

    const batchCalls = query.mock.calls.filter((c) => /ANY\(\$1::text\[\]\)/.test(sqlOf(c)));
    expect(batchCalls).toHaveLength(6);
    for (const c of batchCalls) {
      expect(c[1][0]).toEqual(["st_1", "st_2", "st_3"]);
    }
    // Filtre d'organisation conservé sur les tables qui le portent.
    for (const table of ["StaffLeave", "StaffOvertime", "StaffReplacement"]) {
      for (const c of batchCalls.filter((x) => sqlOf(x).includes(`"${table}"`))) {
        expect(c[1]).toContain("org_1");
      }
    }
    // Bornes de dates inchangées : [-7 j, +90 j] calculées depuis maintenant.
    const overtimeCall = batchCalls.find((c) => sqlOf(c).includes('"StaffOvertime"'))!;
    const [, , from, to] = overtimeCall[1] as [unknown, unknown, Date, Date];
    expect(from.getTime()).toBeGreaterThanOrEqual(before - 7 * DAY - 3 * 60 * 60 * 1000);
    expect(from.getTime()).toBeLessThanOrEqual(after - 7 * DAY + 3 * 60 * 60 * 1000);
    expect(to.getTime()).toBeGreaterThanOrEqual(before + 90 * DAY - 3 * 60 * 60 * 1000);
    expect(to.getTime()).toBeLessThanOrEqual(after + 90 * DAY + 3 * 60 * 60 * 1000);

    expect(items).toEqual([
      {
        id: "st_1",
        firstName: "Sara",
        lastName: "Amrani",
        displayName: "Sara Amrani",
        status: "ACTIVE",
        schedules: [
          { id: "sch_1a", dayOfWeek: 1, startTime: "09:00", endTime: "18:00", active: true },
          { id: "sch_1b", dayOfWeek: 2, startTime: "10:00", endTime: "18:00", active: false },
        ],
        breaks: [{ id: "br_1", dayOfWeek: 1, startTime: "12:00", endTime: "13:00" }],
        leaves: [],
        overtimes: [],
        replacementsAsAbsent: [
          {
            id: "rp_1",
            startAt: "2030-01-03T00:00:00.000Z",
            endAt: "2030-01-04T00:00:00.000Z",
            substituteStaffId: "st_3",
            substituteName: "Nora",
          },
        ],
        replacementsAsSubstitute: [],
      },
      {
        id: "st_2",
        firstName: "Lina",
        lastName: "Bennis",
        displayName: "Lina Bennis",
        status: "ON_LEAVE",
        schedules: [{ id: "sch_2", dayOfWeek: 1, startTime: "09:00", endTime: "17:00", active: true }],
        breaks: [],
        // Seuls les congés APPROUVÉS sont exposés.
        leaves: [
          {
            id: "lv_ok",
            startAt: "2030-01-02T00:00:00.000Z",
            endAt: "2030-01-05T00:00:00.000Z",
            type: "VACATION",
            reason: null,
            status: "APPROVED",
            createdAt: "2029-12-01T00:00:00.000Z",
          },
        ],
        overtimes: [],
        replacementsAsAbsent: [],
        replacementsAsSubstitute: [],
      },
      {
        id: "st_3",
        firstName: "Nora",
        lastName: "",
        displayName: "Nora",
        status: "ACTIVE",
        schedules: [],
        breaks: [],
        leaves: [],
        overtimes: [
          { id: "ot_1", startAt: "2030-01-02T08:00:00.000Z", endAt: "2030-01-02T10:00:00.000Z", reason: "r" },
        ],
        replacementsAsAbsent: [],
        replacementsAsSubstitute: [
          {
            id: "rp_1",
            startAt: "2030-01-03T00:00:00.000Z",
            endAt: "2030-01-04T00:00:00.000Z",
            absentStaffId: "st_1",
            absentName: "Sara Amrani",
          },
        ],
      },
    ]);
  });

  it("ne lance aucune requête enfant quand il n'y a aucune employée", async () => {
    query.mockImplementation(async (sql: string) => {
      if (sql.includes('UPDATE "Staff"')) return { rows: [], rowCount: 0 };
      return { rows: [] };
    });
    const res = await listStaff("org_1", { page: 1, limit: 50, agenda: true });
    expect(res).toEqual({ items: [], total: 0 });
    // 2 synchronisations + 1 liste, aucune requête enfant.
    expect(query).toHaveBeenCalledTimes(3);
  });
});

describe("listResources (agenda) : maintenances chargées par lot", () => {
  it("une seule requête de maintenances, filtrée aux statuts bloquants par ressource", async () => {
    query.mockImplementation(async (sql: string) => {
      if (sql.includes('FROM "Resource" r') && sql.includes("r.active = true")) {
        return {
          rows: [
            { id: "res_1", name: "Cabine 1", type: "ROOM", active: true },
            { id: "res_2", name: "Laser", type: "EQUIPMENT", active: true },
            { id: "res_3", name: "Sauna", type: "ROOM", active: true },
          ],
        };
      }
      if (sql.includes('FROM "ResourceMaintenance"')) {
        const mk = (resourceId: string, id: string, status: string, day: number) => ({
          resourceId,
          id,
          startAt: new Date(Date.UTC(2030, 0, day)),
          endAt: new Date(Date.UTC(2030, 0, day + 1)),
          type: "PREVENTIVE",
          reason: null,
          status,
          createdAt: new Date(Date.UTC(2029, 11, 1)),
        });
        return {
          rows: [
            mk("res_1", "m_1b", "SCHEDULED", 20),
            mk("res_2", "m_2", "COMPLETED", 15),
            mk("res_1", "m_1a", "IN_PROGRESS", 10),
          ],
        };
      }
      throw new Error(`requête inattendue : ${sql.slice(0, 80)}`);
    });

    const { items, total } = await listResources("org_1", { page: 1, limit: 50, agenda: true });

    expect(query).toHaveBeenCalledTimes(2);
    const maintCall = query.mock.calls.find((c) => sqlOf(c).includes('"ResourceMaintenance"'))!;
    expect(sqlOf(maintCall)).toContain("ANY($1::text[])");
    expect(sqlOf(maintCall)).toContain('ORDER BY "startAt" DESC');
    expect(maintCall[1]).toEqual([["res_1", "res_2", "res_3"]]);

    expect(total).toBe(3);
    expect(items).toEqual([
      {
        id: "res_1",
        name: "Cabine 1",
        type: "ROOM",
        active: true,
        maintenances: [
          expect.objectContaining({ id: "m_1b", status: "SCHEDULED", startAt: "2030-01-20T00:00:00.000Z" }),
          expect.objectContaining({ id: "m_1a", status: "IN_PROGRESS" }),
        ],
      },
      { id: "res_2", name: "Laser", type: "EQUIPMENT", active: true, maintenances: [] },
      { id: "res_3", name: "Sauna", type: "ROOM", active: true, maintenances: [] },
    ]);
  });

  it("n'interroge pas les maintenances sans ressource", async () => {
    query.mockResolvedValue({ rows: [] });
    const res = await listResources("org_1", { page: 1, limit: 50, agenda: true });
    expect(res).toEqual({ items: [], total: 0 });
    expect(query).toHaveBeenCalledTimes(1);
  });
});

describe("getPurchaseById : lignes de réception en une requête", () => {
  it("charge les lignes de tous les reçus ensemble et conserve l'association reçu -> lignes", async () => {
    query.mockImplementation(async (sql: string) => {
      if (sql.includes('FROM "Purchase" pu')) {
        return {
          rows: [
            {
              id: "pu_1",
              number: "PO-1",
              supplierId: null,
              supplierName: "Sans fournisseur",
              status: "PARTIALLY_RECEIVED",
              notes: null,
              orderedAt: null,
              receivedAt: null,
              createdById: "u_1",
              createdAt: new Date("2030-01-01T00:00:00Z"),
              updatedAt: new Date("2030-01-01T00:00:00Z"),
            },
          ],
        };
      }
      if (sql.includes('FROM "PurchaseItem" pi')) return { rows: [] };
      if (sql.includes('FROM "PurchaseReceipt" pr')) {
        return {
          rows: [
            { id: "rc_2", receivedAt: new Date("2030-01-03T00:00:00Z"), userId: "u_1", notes: null, idempotencyKey: "k2", userFirst: "Sara", userLast: "A" },
            { id: "rc_1", receivedAt: new Date("2030-01-02T00:00:00Z"), userId: null, notes: "n", idempotencyKey: null, userFirst: null, userLast: null },
          ],
        };
      }
      if (sql.includes('FROM "PurchaseReceiptLine" rl')) {
        return {
          rows: [
            { receiptId: "rc_1", id: "l_1", purchaseItemId: "pi_1", productId: "p_1", productName: "Crème", quantity: "2.500", lotNumber: "L1", expiresAt: "2031-01-01T00:00:00Z", inventoryMovementId: "mv_1" },
            { receiptId: "rc_2", id: "l_2", purchaseItemId: "pi_2", productId: "p_2", productName: "Huile", quantity: "1", lotNumber: null, expiresAt: null, inventoryMovementId: null },
            { receiptId: "rc_1", id: "l_3", purchaseItemId: "pi_3", productId: "p_3", productName: "Gel", quantity: "abc", lotNumber: null, expiresAt: null, inventoryMovementId: null },
          ],
        };
      }
      throw new Error(`requête inattendue : ${sql.slice(0, 80)}`);
    });

    const purchase = await getPurchaseById("org_1", "pu_1");

    const lineCalls = query.mock.calls.filter((c) => sqlOf(c).includes('"PurchaseReceiptLine"'));
    expect(lineCalls).toHaveLength(1);
    expect(lineCalls[0][1]).toEqual([["rc_2", "rc_1"]]);
    // Purchase + items + reçus + lignes = 4 requêtes, quel que soit le nombre de reçus.
    expect(query).toHaveBeenCalledTimes(4);

    expect(purchase!.receipts).toEqual([
      {
        id: "rc_2",
        receivedAt: "2030-01-03T00:00:00.000Z",
        userId: "u_1",
        userName: "Sara A",
        notes: null,
        idempotencyKey: "k2",
        lines: [
          { id: "l_2", purchaseItemId: "pi_2", productId: "p_2", productName: "Huile", quantity: 1, lotNumber: null, expiresAt: null, inventoryMovementId: null },
        ],
      },
      {
        id: "rc_1",
        receivedAt: "2030-01-02T00:00:00.000Z",
        userId: null,
        userName: null,
        notes: "n",
        idempotencyKey: null,
        lines: [
          { id: "l_1", purchaseItemId: "pi_1", productId: "p_1", productName: "Crème", quantity: 2.5, lotNumber: "L1", expiresAt: "2031-01-01T00:00:00.000Z", inventoryMovementId: "mv_1" },
          { id: "l_3", purchaseItemId: "pi_3", productId: "p_3", productName: "Gel", quantity: 0, lotNumber: null, expiresAt: null, inventoryMovementId: null },
        ],
      },
    ]);
  });

  it("ne lance pas de requête de lignes sans reçu", async () => {
    query.mockImplementation(async (sql: string) => {
      if (sql.includes('FROM "Purchase" pu')) {
        return {
          rows: [
            {
              id: "pu_1", number: "PO-1", supplierId: "s", supplierName: "F", status: "ORDERED", notes: null,
              orderedAt: null, receivedAt: null, createdById: null,
              createdAt: new Date("2030-01-01T00:00:00Z"), updatedAt: new Date("2030-01-01T00:00:00Z"),
            },
          ],
        };
      }
      return { rows: [] };
    });
    const purchase = await getPurchaseById("org_1", "pu_1");
    expect(purchase!.receipts).toEqual([]);
    expect(query.mock.calls.some((c) => sqlOf(c).includes('"PurchaseReceiptLine"'))).toBe(false);
  });
});
