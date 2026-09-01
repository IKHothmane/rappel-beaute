import type { Appointment } from "@/types/appointment";

export const MOCK_ORG_ID = "org_institut_royal";

export const MOCK_APPOINTMENTS: Appointment[] = [
  {
    id: "apt-001",
    organizationId: MOCK_ORG_ID,
    customerId: "c1",
    customerName: "Sara El Amrani",
    serviceId: "s1",
    serviceName: "Hydrafacial",
    staffId: "e2",
    staffName: "Chaimae",
    resourceId: "r2",
    resourceName: "Cabine 2",
    startAt: "2026-08-30T09:00:00",
    endAt: "2026-08-30T10:00:00",
    price: 450,
    deposit: 50,
    status: "CONFIRMED",
  },
  {
    id: "apt-002",
    organizationId: MOCK_ORG_ID,
    customerId: "c2",
    customerName: "Imane B.",
    serviceId: "s3",
    serviceName: "Soin visage",
    staffId: "e1",
    staffName: "Sara",
    resourceId: "r1",
    resourceName: "Cabine 1",
    startAt: "2026-08-30T10:30:00",
    endAt: "2026-08-30T11:30:00",
    price: 300,
    status: "PENDING",
  },
  {
    id: "apt-003",
    organizationId: MOCK_ORG_ID,
    customerId: "c3",
    customerName: "Meryem Alaoui",
    serviceId: "s4",
    serviceName: "Massage",
    staffId: "e3",
    staffName: "Nadia",
    resourceId: "r3",
    resourceName: "Salle massage",
    startAt: "2026-08-30T14:30:00",
    endAt: "2026-08-30T15:30:00",
    price: 350,
    status: "CONFIRMED",
  },
  {
    id: "apt-004",
    organizationId: MOCK_ORG_ID,
    customerId: "c4",
    customerName: "Lina Benjelloun",
    serviceId: "s2",
    serviceName: "Manucure",
    staffId: "e1",
    staffName: "Sara",
    resourceId: "r1",
    resourceName: "Cabine 1",
    startAt: "2026-08-30T12:00:00",
    endAt: "2026-08-30T12:45:00",
    price: 150,
    status: "ARRIVED",
  },
  {
    id: "apt-005",
    organizationId: MOCK_ORG_ID,
    customerId: "c1",
    customerName: "Sara El Amrani",
    serviceId: "s2",
    serviceName: "Manucure",
    staffId: "e2",
    staffName: "Chaimae",
    resourceId: "r2",
    resourceName: "Cabine 2",
    startAt: "2026-08-31T11:00:00",
    endAt: "2026-08-31T11:45:00",
    price: 150,
    status: "CONFIRMED",
  },
  {
    id: "apt-006",
    organizationId: MOCK_ORG_ID,
    customerId: "c2",
    customerName: "Imane B.",
    serviceId: "s1",
    serviceName: "Hydrafacial",
    staffId: "e2",
    staffName: "Chaimae",
    resourceId: "r2",
    resourceName: "Cabine 2",
    startAt: "2026-08-28T15:00:00",
    endAt: "2026-08-28T16:00:00",
    price: 450,
    status: "COMPLETED",
  },
];

/** Congés / pauses mock — blocage visuel */
export const STAFF_BLOCKS: {
  staffId: string;
  startAt: string;
  endAt: string;
  label: string;
}[] = [
  {
    staffId: "e3",
    startAt: "2026-08-30T12:00:00",
    endAt: "2026-08-30T13:30:00",
    label: "Pause déjeuner",
  },
];

/** Horaires d'ouverture par jour (0 = dimanche) */
export const WORKING_HOURS: Record<number, { open: number; close: number } | null> = {
  0: { open: 9, close: 18 },
  1: { open: 9, close: 19 },
  2: { open: 9, close: 19 },
  3: { open: 9, close: 19 },
  4: { open: 9, close: 19 },
  5: { open: 9, close: 19 },
  6: { open: 9, close: 17 },
};
