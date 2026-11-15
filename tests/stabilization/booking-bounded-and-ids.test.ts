import { beforeEach, describe, expect, it, vi } from "vitest";

const listAppointments = vi.fn();
const poolQuery = vi.fn();

vi.mock("@/lib/db/pool", () => ({ pool: { query: (...a: unknown[]) => poolQuery(...a) } }));
vi.mock("@/lib/db/audit", () => ({ writeAuditLog: vi.fn() }));
vi.mock("@/lib/db/appointments", () => ({
  listAppointmentsByOrg: (...a: unknown[]) => listAppointments(...a),
}));
vi.mock("@/lib/db/staff", () => ({ listStaff: vi.fn(async () => ({ items: [] })) }));
vi.mock("@/lib/db/resources", () => ({ listResources: vi.fn(async () => ({ items: [] })) }));

import { assertAppointmentBookable } from "@/lib/db/planning";
import { newId } from "@/lib/db/ids";
import { endOfBusinessDay, startOfBusinessDay } from "@/lib/time/business-timezone";

describe("assertAppointmentBookable : requête bornée à la journée", () => {
  beforeEach(() => {
    listAppointments.mockReset();
    poolQuery.mockReset();
    poolQuery.mockResolvedValue({ rows: [], rowCount: 0 });
  });

  it("demande uniquement la journée concernée (to = fin de journée + 1 ms)", async () => {
    listAppointments.mockResolvedValue([]);
    const start = new Date("2030-06-12T10:00:00.000Z");
    const end = new Date("2030-06-12T11:00:00.000Z");

    await assertAppointmentBookable({ organizationId: "org1", startAt: start, endAt: end });

    expect(listAppointments).toHaveBeenCalledTimes(1);
    const [orgId, range] = listAppointments.mock.calls[0] as [string, { from: Date; to: Date }];
    expect(orgId).toBe("org1");
    expect(range.from.getTime()).toBe(startOfBusinessDay(start).getTime());
    expect(range.to.getTime()).toBe(endOfBusinessDay(start).getTime() + 1);
  });

  it("détecte toujours un conflit avec un rendez-vous du même jour et ignore un autre jour", async () => {
    const start = new Date("2030-06-12T10:00:00.000Z");
    const end = new Date("2030-06-12T11:00:00.000Z");
    const base = {
      id: "a1",
      customerId: "c1",
      customerName: "X",
      serviceId: "s1",
      serviceName: "S",
      staffId: "st1",
      staffName: "T",
      status: "CONFIRMED",
    };
    listAppointments.mockResolvedValue([
      { ...base, startAt: "2030-06-12T10:30:00.000Z", endAt: "2030-06-12T11:30:00.000Z" },
      { ...base, id: "a2", startAt: "2030-06-13T10:00:00.000Z", endAt: "2030-06-13T11:00:00.000Z" },
    ]);

    await expect(
      assertAppointmentBookable({ organizationId: "org1", staffId: "st1", startAt: start, endAt: end }),
    ).rejects.toThrow("AVAILABILITY_CONFLICT");

    listAppointments.mockResolvedValue([
      { ...base, id: "a2", startAt: "2030-06-13T10:00:00.000Z", endAt: "2030-06-13T11:00:00.000Z" },
    ]);
    await expect(
      assertAppointmentBookable({ organizationId: "org1", staffId: "st1", startAt: start, endAt: end }),
    ).resolves.toBeUndefined();
  });
});

describe("newId", () => {
  it("garde le préfixe et le séparateur demandés, avec une partie aléatoire", () => {
    expect(newId("apt", "-")).toMatch(/^apt-[0-9a-f]{12}$/);
    expect(newId("cust", "-")).toMatch(/^cust-[0-9a-f]{12}$/);
    expect(newId("apt")).toMatch(/^apt_[0-9a-f]{12}$/);
  });

  it("ne collisionne pas dans la même milliseconde", () => {
    const ids = new Set(Array.from({ length: 2000 }, () => newId("apt", "-")));
    expect(ids.size).toBe(2000);
  });
});
