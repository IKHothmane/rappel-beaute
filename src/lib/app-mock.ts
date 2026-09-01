/** RBAC migré vers @/lib/rbac — mock data UI en attendant les API */
export type { AppRole } from "@/lib/rbac";
export { ROLE_LABEL, ROLE_NAV, canAccess, canAccessNav } from "@/lib/rbac";

export const CURRENT_USER = {
  id: "u_owner",
  firstName: "Nadia",
  lastName: "Bennani",
  email: "nadia@institutroyal.ma",
  phone: "+212 6 61 00 11 22",
  role: "OWNER" as const,
  orgName: "Institut Royal",
  orgSlug: "institut-royal",
};

export const TODAY_APPTS = [
  { time: "09:00", client: "Sara", service: "Hydrafacial", staff: "Sara", status: "Confirmé" },
  { time: "10:00", client: "Chaimae", service: "Manucure", staff: "Chaimae", status: "Confirmé" },
  { time: "11:30", client: "Nadia", service: "Massage", staff: "Nadia", status: "En attente" },
  { time: "13:00", client: "Sara", service: "Soin visage", staff: "Sara", status: "Confirmé" },
];

export const CUSTOMERS = [
  { id: "c1", firstName: "Sara", lastName: "El Amrani", phone: "06 61 22 33 44", lastVisit: "12/08/2026", revenue: 4850, status: "VIP" },
  { id: "c2", firstName: "Imane", lastName: "Tazi", phone: "06 70 11 22 33", lastVisit: "28/08/2026", revenue: 1200, status: "Active" },
  { id: "c3", firstName: "Meryem", lastName: "Alaoui", phone: "06 55 44 33 22", lastVisit: "02/06/2026", revenue: 890, status: "À risque" },
  { id: "c4", firstName: "Lina", lastName: "Benjelloun", phone: "06 12 34 56 78", lastVisit: "—", revenue: 0, status: "Nouvelle" },
];

export const SERVICES = [
  { id: "s1", name: "Hydrafacial", price: 450, duration: 60 },
  { id: "s2", name: "Manucure", price: 150, duration: 45 },
  { id: "s3", name: "Soin visage", price: 300, duration: 60 },
  { id: "s4", name: "Massage", price: 350, duration: 60 },
];

export const STAFF = [
  { id: "e1", name: "Sara", role: "Esthéticienne", status: "Active" },
  { id: "e2", name: "Chaimae", role: "Esthéticienne", status: "Active" },
  { id: "e3", name: "Nadia", role: "Manager", status: "Active" },
];

export const RESOURCES = [
  { id: "r1", name: "Cabine 1", type: "Cabine" },
  { id: "r2", name: "Cabine 2", type: "Cabine" },
  { id: "r3", name: "Salle massage", type: "Salle" },
  { id: "r4", name: "Machine Hydrafacial", type: "Équipement" },
];

export const PRODUCTS = [
  { id: "p1", name: "Sérum Hydrafacial", sku: "SER-HYD-01", stock: 22, min: 10, unit: "ml" },
  { id: "p2", name: "Crème manucure", sku: "CRE-MAN-02", stock: 8, min: 12, unit: "pcs" },
  { id: "p3", name: "Huile massage", sku: "HUI-MAS-03", stock: 35, min: 15, unit: "ml" },
];

export const MOVEMENTS = [
  { date: "30/08", type: "Achat", qty: "+30", product: "Sérum Hydrafacial" },
  { date: "30/08", type: "Usage", qty: "-5", product: "Sérum Hydrafacial" },
  { date: "29/08", type: "Vente", qty: "-2", product: "Crème manucure" },
  { date: "28/08", type: "Perte", qty: "-1", product: "Huile massage" },
];

export const SUPPLIERS = [
  { id: "f1", name: "Beauty Distro Maroc", phone: "05 22 11 22 33", email: "cmd@beautydistro.ma" },
  { id: "f2", name: "Cosméto Casa", phone: "05 22 44 55 66", email: "hello@cosmetocasa.ma" },
];

export const WHATSAPP_QUEUE = [
  { time: "09:00", client: "Sara", text: "Rappel RDV Hydrafacial", status: "À envoyer" },
  { time: "10:30", client: "Imane", text: "Confirmation Manucure", status: "À envoyer" },
  { time: "18:00", client: "Meryem", text: "Demande d'avis", status: "Préparé" },
];

export const NOTIFS = [
  { tone: "red" as const, text: "Stock Hydrafacial faible" },
  { tone: "yellow" as const, text: "3 RDV non confirmés" },
  { tone: "yellow" as const, text: "Abonnement bientôt renouvelé" },
  { tone: "green" as const, text: "Paiement reçu" },
  { tone: "green" as const, text: "Nouvelle cliente" },
];

export const ONBOARDING_STEPS = [
  { id: 1, title: "Profil institut", done: true },
  { id: 2, title: "Services", done: true },
  { id: 3, title: "Employées", done: false },
  { id: 4, title: "Horaires", done: false },
  { id: 5, title: "Premier RDV", done: false },
];
