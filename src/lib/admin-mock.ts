export type PlanId = "STARTER" | "INSTITUT" | "PREMIUM";
export type OrgStatus = "ACTIVE" | "TRIAL" | "SUSPENDED" | "PENDING" | "EXPIRED";
export type UserRole = "OWNER" | "MANAGER" | "STAFF" | "CASHIER" | "ACCOUNTANT";
export type UserStatus = "ACTIVE" | "DISABLED";
export type SubStatus = "ACTIVE" | "PENDING" | "EXPIRED" | "CANCELLED" | "PAST_DUE";
export type TicketStatus = "OPEN" | "IN_PROGRESS" | "RESOLVED";
export type NotifKind = "SYSTEM" | "PAYMENT" | "SECURITY" | "ORG" | "SUPPORT";

export type Organization = {
  id: string;
  name: string;
  slug: string;
  city: string;
  address: string;
  phone: string;
  email: string;
  plan: PlanId;
  status: OrgStatus;
  ownerName: string;
  ownerEmail: string;
  ownerPhone: string;
  createdAt: string;
  mrr: number;
  rdvMonth: number;
  customers: number;
  revenueMonth: number;
  noShowRate: number;
  sites: number;
  nextBilling: string;
};

export type PlatformAccount = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  orgId: string;
  orgName: string;
  lastLogin: string;
};

export type Subscription = {
  id: string;
  orgId: string;
  orgName: string;
  plan: PlanId;
  price: number;
  startAt: string;
  nextBilling: string;
  status: SubStatus;
};

export type Payment = {
  id: string;
  orgId: string;
  orgName: string;
  amount: number;
  plan: PlanId;
  date: string;
  status: "SUCCESS" | "FAILED";
};

export type Ticket = {
  id: string;
  number: number;
  orgId: string;
  orgName: string;
  subject: string;
  status: TicketStatus;
  createdAt: string;
  preview: string;
};

export type NotificationItem = {
  id: string;
  kind: NotifKind;
  tone: "red" | "yellow" | "green";
  title: string;
  at: string;
  read: boolean;
};

export type AuditEntry = {
  id: string;
  at: string;
  actor: string;
  action: string;
  target: string;
  orgId?: string;
  orgName?: string;
  before?: string;
  after?: string;
  ip?: string;
};

export type PlatformUser = {
  id: string;
  name: string;
  firstName: string;
  email: string;
  role: "SUPER_ADMIN";
};

export const PLATFORM_USER: PlatformUser = {
  id: "pu_1",
  name: "Osman Benali",
  firstName: "Osman",
  email: "admin@rappelbeaute.ma",
  role: "SUPER_ADMIN",
};

export const PLAN_PRICES: Record<PlanId, number> = {
  STARTER: 299,
  INSTITUT: 499,
  PREMIUM: 899,
};

export const PLAN_LABEL: Record<PlanId, string> = {
  STARTER: "Starter",
  INSTITUT: "Institut",
  PREMIUM: "Premium",
};

export const STATUS_LABEL: Record<OrgStatus, string> = {
  ACTIVE: "Actif",
  TRIAL: "Essai",
  SUSPENDED: "Suspendu",
  PENDING: "En attente",
  EXPIRED: "Expiré",
};

export const ROLE_LABEL: Record<UserRole | "SUPER_ADMIN", string> = {
  SUPER_ADMIN: "Super administrateur",
  OWNER: "Propriétaire",
  MANAGER: "Responsable",
  STAFF: "Employée",
  CASHIER: "Caisse",
  ACCOUNTANT: "Comptable",
};

export const SUB_STATUS_LABEL: Record<SubStatus, string> = {
  ACTIVE: "Actif",
  PENDING: "En attente",
  EXPIRED: "Expiré",
  CANCELLED: "Annulé",
  PAST_DUE: "Impayé",
};

export const ORGANIZATIONS: Organization[] = [
  {
    id: "org_01",
    name: "Institut Royal",
    slug: "institut-royal",
    city: "Casablanca",
    address: "12 Bd Anfa",
    phone: "+212 6 61 00 11 22",
    email: "contact@institutroyal.ma",
    plan: "INSTITUT",
    status: "ACTIVE",
    ownerName: "Nadia Bennani",
    ownerEmail: "nadia@institutroyal.ma",
    ownerPhone: "+212 6 61 00 11 22",
    createdAt: "2026-03-12",
    mrr: 499,
    rdvMonth: 245,
    customers: 418,
    revenueMonth: 84500,
    noShowRate: 3.2,
    sites: 1,
    nextBilling: "2026-09-30",
  },
  {
    id: "org_02",
    name: "Beauty House",
    slug: "beauty-house",
    city: "Rabat",
    address: "4 Av. Hassan II",
    phone: "+212 6 62 33 44 55",
    email: "hello@beautyhouse.ma",
    plan: "STARTER",
    status: "ACTIVE",
    ownerName: "Sara Alaoui",
    ownerEmail: "sara@beautyhouse.ma",
    ownerPhone: "+212 6 62 33 44 55",
    createdAt: "2026-08-18",
    mrr: 299,
    rdvMonth: 123,
    customers: 190,
    revenueMonth: 32000,
    noShowRate: 4.1,
    sites: 1,
    nextBilling: "2026-09-18",
  },
  {
    id: "org_03",
    name: "Maison Lalla",
    slug: "maison-lalla",
    city: "Marrakech",
    address: "Medina, Derb Sidi",
    phone: "+212 6 70 88 99 00",
    email: "imane@maisonlalla.ma",
    plan: "PREMIUM",
    status: "ACTIVE",
    ownerName: "Imane Alaoui",
    ownerEmail: "imane@maisonlalla.ma",
    ownerPhone: "+212 6 70 88 99 00",
    createdAt: "2026-01-20",
    mrr: 899,
    rdvMonth: 512,
    customers: 890,
    revenueMonth: 210000,
    noShowRate: 2.4,
    sites: 3,
    nextBilling: "2026-09-20",
  },
  {
    id: "org_04",
    name: "Institut Noor",
    slug: "institut-noor",
    city: "Tanger",
    address: "Malabata",
    phone: "+212 6 55 12 34 56",
    email: "contact@institutnoor.ma",
    plan: "INSTITUT",
    status: "TRIAL",
    ownerName: "Nayla Chraibi",
    ownerEmail: "nayla@institutnoor.ma",
    ownerPhone: "+212 6 55 12 34 56",
    createdAt: "2026-08-22",
    mrr: 0,
    rdvMonth: 38,
    customers: 42,
    revenueMonth: 9800,
    noShowRate: 5.0,
    sites: 1,
    nextBilling: "2026-09-05",
  },
  {
    id: "org_05",
    name: "Bella Beauty",
    slug: "bella-beauty",
    city: "Fès",
    address: "Ville Nouvelle",
    phone: "+212 6 44 77 88 99",
    email: "contact@bellabeauty.ma",
    plan: "STARTER",
    status: "SUSPENDED",
    ownerName: "Fatima Zahra",
    ownerEmail: "contact@bellabeauty.ma",
    ownerPhone: "+212 6 44 77 88 99",
    createdAt: "2026-02-18",
    mrr: 0,
    rdvMonth: 0,
    customers: 110,
    revenueMonth: 0,
    noShowRate: 0,
    sites: 1,
    nextBilling: "—",
  },
  {
    id: "org_06",
    name: "Baraka Spa",
    slug: "baraka-spa",
    city: "Agadir",
    address: "Marina",
    phone: "+212 6 11 22 33 44",
    email: "houda@barakaspa.ma",
    plan: "PREMIUM",
    status: "PENDING",
    ownerName: "Houda Amrani",
    ownerEmail: "houda@barakaspa.ma",
    ownerPhone: "+212 6 11 22 33 44",
    createdAt: "2026-08-28",
    mrr: 0,
    rdvMonth: 0,
    customers: 0,
    revenueMonth: 0,
    noShowRate: 0,
    sites: 2,
    nextBilling: "—",
  },
];

export const USERS: PlatformAccount[] = [
  {
    id: "u1",
    firstName: "Nadia",
    lastName: "Bennani",
    email: "nadia@institutroyal.ma",
    role: "OWNER",
    status: "ACTIVE",
    orgId: "org_01",
    orgName: "Institut Royal",
    lastLogin: "2026-08-30 18:12",
  },
  {
    id: "u2",
    firstName: "Sara",
    lastName: "Alaoui",
    email: "sara@beautyhouse.ma",
    role: "OWNER",
    status: "ACTIVE",
    orgId: "org_02",
    orgName: "Beauty House",
    lastLogin: "2026-08-30 17:40",
  },
  {
    id: "u3",
    firstName: "Imane",
    lastName: "Alaoui",
    email: "imane@maisonlalla.ma",
    role: "OWNER",
    status: "ACTIVE",
    orgId: "org_03",
    orgName: "Maison Lalla",
    lastLogin: "2026-08-29 09:05",
  },
  {
    id: "u4",
    firstName: "Meryem",
    lastName: "Tazi",
    email: "meryem@institutroyal.ma",
    role: "STAFF",
    status: "ACTIVE",
    orgId: "org_01",
    orgName: "Institut Royal",
    lastLogin: "2026-08-30 12:20",
  },
  {
    id: "u5",
    firstName: "Lina",
    lastName: "Kabbaj",
    email: "lina@beautyhouse.ma",
    role: "CASHIER",
    status: "ACTIVE",
    orgId: "org_02",
    orgName: "Beauty House",
    lastLogin: "2026-08-28 16:00",
  },
  {
    id: "u6",
    firstName: "Hicham",
    lastName: "Benjelloun",
    email: "hicham@maisonlalla.ma",
    role: "ACCOUNTANT",
    status: "ACTIVE",
    orgId: "org_03",
    orgName: "Maison Lalla",
    lastLogin: "2026-08-27 11:33",
  },
  {
    id: "u7",
    firstName: "Fatima",
    lastName: "Zahra",
    email: "contact@bellabeauty.ma",
    role: "OWNER",
    status: "DISABLED",
    orgId: "org_05",
    orgName: "Bella Beauty",
    lastLogin: "2026-07-02 10:00",
  },
];

export const SUBSCRIPTIONS: Subscription[] = ORGANIZATIONS.map((o, i) => ({
  id: `sub_${i + 1}`,
  orgId: o.id,
  orgName: o.name,
  plan: o.plan,
  price: PLAN_PRICES[o.plan],
  startAt: o.createdAt,
  nextBilling: o.nextBilling,
  status:
    o.status === "ACTIVE"
      ? "ACTIVE"
      : o.status === "PENDING"
        ? "PENDING"
        : o.status === "SUSPENDED"
          ? "CANCELLED"
          : o.status === "TRIAL"
            ? "PENDING"
            : "EXPIRED",
}));

export const PAYMENTS: Payment[] = [
  { id: "pay1", orgId: "org_01", orgName: "Institut Royal", amount: 499, plan: "INSTITUT", date: "2026-08-30", status: "SUCCESS" },
  { id: "pay2", orgId: "org_02", orgName: "Beauty House", amount: 299, plan: "STARTER", date: "2026-08-29", status: "SUCCESS" },
  { id: "pay3", orgId: "org_03", orgName: "Maison Lalla", amount: 899, plan: "PREMIUM", date: "2026-08-28", status: "SUCCESS" },
  { id: "pay4", orgId: "org_05", orgName: "Bella Beauty", amount: 299, plan: "STARTER", date: "2026-08-27", status: "FAILED" },
  { id: "pay5", orgId: "org_01", orgName: "Institut Royal", amount: 499, plan: "INSTITUT", date: "2026-07-30", status: "SUCCESS" },
  { id: "pay6", orgId: "org_03", orgName: "Maison Lalla", amount: 899, plan: "PREMIUM", date: "2026-07-28", status: "SUCCESS" },
];

export const TICKETS: Ticket[] = [
  {
    id: "t1",
    number: 1024,
    orgId: "org_01",
    orgName: "Institut Royal",
    subject: "Je n’arrive pas à créer un RDV",
    status: "OPEN",
    createdAt: "2026-08-30 20:10",
    preview: "Erreur lors de la validation du créneau cabine.",
  },
  {
    id: "t2",
    number: 1023,
    orgId: "org_02",
    orgName: "Beauty House",
    subject: "Problème de connexion",
    status: "IN_PROGRESS",
    createdAt: "2026-08-30 18:40",
    preview: "Mot de passe oublié, e-mail non reçu.",
  },
  {
    id: "t3",
    number: 1020,
    orgId: "org_03",
    orgName: "Maison Lalla",
    subject: "Export rapport CA",
    status: "RESOLVED",
    createdAt: "2026-08-28 11:00",
    preview: "Demande d’export Excel mensuel.",
  },
];

export const NOTIFICATIONS: NotificationItem[] = [
  { id: "n1", kind: "PAYMENT", tone: "red", title: "Paiement échoué — Bella Beauty", at: "2026-08-30 21:10", read: false },
  { id: "n2", kind: "ORG", tone: "yellow", title: "Institut Noor arrive à expiration", at: "2026-08-30 19:00", read: false },
  { id: "n3", kind: "ORG", tone: "green", title: "Nouvel institut — Baraka Spa", at: "2026-08-28 10:00", read: true },
  { id: "n4", kind: "SYSTEM", tone: "red", title: "Erreur système — file WhatsApp", at: "2026-08-27 14:22", read: true },
  { id: "n5", kind: "ORG", tone: "yellow", title: "Institut inactif — Bella Beauty", at: "2026-08-26 09:00", read: true },
  { id: "n6", kind: "PAYMENT", tone: "green", title: "Nouveau paiement — Maison Lalla", at: "2026-08-28 12:01", read: true },
];

export const AUDIT_LOG: AuditEntry[] = [
  {
    id: "aud_1",
    at: "2026-08-30T21:43:00",
    actor: "Nadia Bennani",
    action: "PRICE_UPDATED",
    target: "Service Hydrafacial",
    orgId: "org_01",
    orgName: "Institut Royal",
    before: '{ "price": 400 }',
    after: '{ "price": 450 }',
    ip: "105.158.12.10",
  },
  {
    id: "aud_2",
    at: "2026-08-30T21:40:00",
    actor: "Sara Alaoui",
    action: "LOGIN",
    target: "Beauty House",
    orgId: "org_02",
    orgName: "Beauty House",
    ip: "41.141.22.8",
  },
  {
    id: "aud_3",
    at: "2026-08-30T21:35:00",
    actor: "Osman Benali",
    action: "SUPPORT_IMPERSONATION_START",
    target: "Institut Royal · ticket #1024",
    orgId: "org_01",
    orgName: "Institut Royal",
    ip: "196.200.1.4",
  },
  {
    id: "aud_4",
    at: "2026-08-30T21:20:00",
    actor: "Osman Benali",
    action: "ORG_CREATED",
    target: "Institut Noor",
    orgId: "org_04",
    orgName: "Institut Noor",
    ip: "196.200.1.4",
  },
  {
    id: "aud_5",
    at: "2026-08-29T11:05:00",
    actor: "Osman Benali",
    action: "SUBSCRIPTION_CHANGE",
    target: "Beauty House → Starter",
    orgId: "org_02",
    orgName: "Beauty House",
  },
  {
    id: "aud_6",
    at: "2026-08-28T16:40:00",
    actor: "Osman Benali",
    action: "ORG_SUSPEND",
    target: "Bella Beauty",
    orgId: "org_05",
    orgName: "Bella Beauty",
  },
];

export const AUDIT_ACTION_LABEL: Record<string, string> = {
  PRICE_UPDATED: "Prix modifié",
  LOGIN: "Connexion",
  SUPPORT_IMPERSONATION_START: "Début mode assistance",
  SUPPORT_IMPERSONATION_END: "Fin mode assistance",
  ORG_CREATED: "Institut créé",
  ORG_CREATE: "Institut créé",
  SUBSCRIPTION_CHANGE: "Changement d’abonnement",
  ORG_SUSPEND: "Suspension d’institut",
  TRIAL_ACTIVATE: "Activation essai",
};

export function auditActionLabel(action: string) {
  return AUDIT_ACTION_LABEL[action] ?? action;
}

export function getOrganization(id: string) {
  return ORGANIZATIONS.find((o) => o.id === id);
}

export function getTicket(id: string) {
  return TICKETS.find((t) => t.id === id);
}

export const MRR_SERIES = [
  { label: "Jan", value: 18200 },
  { label: "Fév", value: 20100 },
  { label: "Mar", value: 22400 },
  { label: "Avr", value: 24800 },
  { label: "Mai", value: 27100 },
  { label: "Juin", value: 28900 },
  { label: "Juil", value: 30200 },
  { label: "Aoû", value: 31950 },
];

export function platformStats() {
  const active = ORGANIZATIONS.filter((o) => o.status === "ACTIVE");
  const mrr = active.reduce((s, o) => s + o.mrr, 0);
  const users = USERS.length;
  const rdv = ORGANIZATIONS.reduce((s, o) => s + o.rdvMonth, 0);
  const subs = SUBSCRIPTIONS;
  return {
    orgs: 128,
    orgsDelta: 12,
    users: 346,
    usersDelta: 28,
    rdv: 8492,
    rdvGrowth: 14.8,
    mrr: 31950,
    arr: 383400,
    activeSubs: 128,
    pendingSubs: subs.filter((s) => s.status === "PENDING").length,
    expiredSubs: 7,
    cancelledSubs: 3,
    paySuccess: 124,
    payFailed: 4,
    revenueGrowth: 18,
    openTickets: TICKETS.filter((t) => t.status !== "RESOLVED").length,
    unreadNotifs: NOTIFICATIONS.filter((n) => !n.read).length,
    planShare: { STARTER: 45, INSTITUT: 48, PREMIUM: 7 },
  };
}
