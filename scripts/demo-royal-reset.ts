// @ts-nocheck
/**
 * Remet l'institut démo « Institut Royal » à zéro puis le remplit de données réalistes
 * (clientes marocaines, 8 semaines d'historique) pour prendre des captures d'écran.
 *
 *   npx tsx scripts/demo-royal-reset.ts backup   → sauvegarde JSON seule (aucune écriture en base)
 *   CONFIRM_RESET_ROYAL=yes npx tsx scripts/demo-royal-reset.ts run   → sauvegarde + suppression + remplissage
 *
 * Ne touche QUE l'organisation org_institut_royal. Conserve : l'organisation (logo, WhatsApp),
 * les comptes utilisateurs, l'abonnement et les réglages (fidélité, avis, réservation, modèles WhatsApp…).
 * Les dates sont relatives à aujourd'hui : relancer le script « rafraîchit » les données.
 */
import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { Pool } from "pg";

const ORG = "org_institut_royal";
const MODE = process.argv[2] ?? "";
const BACKUP_DIR = process.env.ROYAL_BACKUP_DIR || path.join(process.cwd(), ".tmp");
const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 4 });
pool.on("error", (e) => console.error("pool (connexion inactive coupée, ignoré) :", e.message));
// Le proxy Railway coupe parfois une connexion entre deux requêtes : on journalise et on continue.
process.on("uncaughtException", (e: any) => {
  if (/Connection terminated|ECONNRESET/i.test(String(e?.message))) { console.error("connexion coupée (ignoré) :", e.message); return; }
  console.error("ÉCHEC :", e); process.exit(1);
});
const isTransient = (e: any) => /Connection terminated|ECONNRESET|timeout|ETIMEDOUT/i.test(String(e?.message));
const retry = async <T,>(fn: () => Promise<T>, n = 4): Promise<T> => {
  for (let i = 0; ; i++) {
    try { return await fn(); } catch (e: any) {
      if (i >= n - 1 || !isTransient(e)) throw e;
      await new Promise((r) => setTimeout(r, 1500 * (i + 1)));
    }
  }
};
const q = (sql: string, p: any[] = []) => retry(() => pool.query(sql, p));
const log = (...a: any[]) => console.log(new Date().toISOString().slice(11, 19), ...a);

/** Tables liées à l'organisation que l'on CONSERVE (réglages, comptes, abonnement, journaux plateforme). */
const KEEP = new Set([
  "User", "Subscription", "BookingPolicySettings", "CommissionSettings", "PostVisitSettings",
  "ReactivationSettings", "ReviewSettings", "LoyaltyProgram", "LoyaltyCard", "LoyaltyJoinQr",
  "PublicWidget", "WhatsAppTemplate", "AssistantSettings", "GoogleCalendarConnection",
  "PlatformAuditLog", "SupportSession", "NotificationPreference", "OrganizationClosure",
]);

/** Tables enfants sans colonne organizationId : [table, colonne FK, table parente]. */
const CHILDREN: [string, string, string][] = [
  ["ServiceStaff", "serviceId", "Service"], ["ServiceResource", "serviceId", "Service"],
  ["ServiceProduct", "serviceId", "Service"], ["ServiceCommission", "serviceId", "Service"],
  ["StaffSchedule", "staffId", "Staff"], ["StaffBreak", "staffId", "Staff"], ["StaffLeave", "staffId", "Staff"],
  ["ResourceMaintenance", "resourceId", "Resource"], ["ProductLot", "productId", "Product"],
  ["ProductPriceHistory", "productId", "Product"], ["ProductSupplier", "productId", "Product"],
  ["PurchaseItem", "purchaseId", "Purchase"], ["PurchaseReceiptLine", "receiptId", "PurchaseReceipt"],
  ["InvoiceItem", "invoiceId", "Invoice"], ["PackageItem", "packageId", "Package"],
  ["CampaignRecipient", "campaignId", "Campaign"], ["ActivationToken", "userId", "User"],
  ["SupportMessage", "ticketId", "SupportTicket"], ["AIMessage", "conversationId", "AIConversation"],
  ["PublicWidgetOrigin", "widgetId", "PublicWidget"], ["AssistantMessage", "conversationId", "AssistantConversation"],
  ["AppleWalletRegistration", "passId", "AppleWalletPass"], ["ReviewStaffRating", "reviewId", "Review"],
];

async function orgTables(): Promise<string[]> {
  const { rows } = await q(
    `SELECT DISTINCT table_name t FROM information_schema.columns
     WHERE table_schema='public' AND column_name='organizationId' ORDER BY 1`,
  );
  return rows.map((r) => r.t);
}

// ───────────────────────────── 1. Sauvegarde ─────────────────────────────
async function backup(): Promise<string> {
  const dump: any = { meta: { org: ORG, at: new Date().toISOString() }, tables: {} };
  for (const t of await orgTables()) {
    const r = await q(`SELECT * FROM "${t}" WHERE "organizationId"=$1`, [ORG]);
    if (r.rows.length) dump.tables[t] = r.rows;
  }
  for (const [c, col, parent] of CHILDREN) {
    const r = await q(
      `SELECT c.* FROM "${c}" c JOIN "${parent}" p ON p.id = c."${col}" WHERE p."organizationId"=$1`, [ORG],
    );
    if (r.rows.length) dump.tables[c] = r.rows;
  }
  dump.tables.Organization = (await q(`SELECT * FROM "Organization" WHERE id=$1`, [ORG])).rows;
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
  const file = path.join(BACKUP_DIR, `royal-backup-${new Date().toISOString().replace(/[:.]/g, "-")}.json`);
  fs.writeFileSync(file, JSON.stringify(dump));
  const total = Object.values(dump.tables).reduce((s: number, r: any) => s + r.length, 0);
  log(`Sauvegarde : ${Object.keys(dump.tables).length} tables, ${total} lignes → ${file} (${(fs.statSync(file).size / 1024).toFixed(0)} Ko)`);
  return file;
}

// ───────────────────────────── 2. Suppression ─────────────────────────────
async function keptCounts(): Promise<Record<string, number>> {
  const out: Record<string, number> = {};
  for (const t of KEEP) {
    out[t] = (await q(`SELECT count(*)::int c FROM "${t}" WHERE "organizationId"=$1`, [ORG])).rows[0].c;
  }
  return out;
}

async function wipe() {
  const before = await keptCounts();
  const client = await pool.connect();
  const deleted: Record<string, number> = {};
  try {
    await client.query("BEGIN");
    let pending = (await orgTables()).filter((t) => !KEEP.has(t));
    const lastErr: Record<string, string> = {};
    for (let round = 0; round < 12 && pending.length; round++) {
      const next: string[] = [];
      for (const t of pending) {
        await client.query("SAVEPOINT sp");
        try {
          const r = await client.query(`DELETE FROM "${t}" WHERE "organizationId"=$1`, [ORG]);
          await client.query("RELEASE SAVEPOINT sp");
          deleted[t] = (deleted[t] ?? 0) + (r.rowCount ?? 0);
        } catch (e: any) {
          await client.query("ROLLBACK TO SAVEPOINT sp");
          lastErr[t] = e.message;
          next.push(t);
        }
      }
      pending = next;
    }
    if (pending.length) throw new Error("Suppression bloquée : " + pending.map((t) => `${t} (${lastErr[t]})`).join("; "));
    // Compte de test oublié par la suite de tests + compteur de factures à remettre à zéro
    await client.query(`DELETE FROM "User" WHERE "organizationId"=$1 AND id LIKE 'u\\_tmp\\_reset\\_%'`, [ORG]);
    await client.query(`DELETE FROM "InvoiceSequence" WHERE "organizationId"=$1`, [ORG]);
    await client.query("COMMIT");
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
  const after = await keptCounts();
  const changed = Object.keys(before).filter((t) => before[t] !== after[t] && !(t === "User"));
  if (changed.length) log("ATTENTION tables conservées dont le volume a changé :", changed.map((t) => `${t} ${before[t]}→${after[t]}`).join(", "));
  log("Supprimé :", Object.entries(deleted).filter(([, n]) => n).map(([t, n]) => `${t}:${n}`).join(" "));
}

// ───────────────────────────── 3. Remplissage ─────────────────────────────
function mulberry32(a: number) {
  return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const rnd = mulberry32(20261109);
const ri = (a: number, b: number) => a + Math.floor(rnd() * (b - a + 1));
const pick = <T,>(arr: T[]): T => arr[Math.floor(rnd() * arr.length)];
const shuffle = <T,>(arr: T[]): T[] => { const a = [...arr]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const wpick = <T,>(pairs: [T, number][]): T => { const tot = pairs.reduce((s, p) => s + p[1], 0); let r = rnd() * tot; for (const [v, w] of pairs) { r -= w; if (r <= 0) return v; } return pairs[0][0]; };

const todayStr = new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Casablanca" }).format(new Date());
const [TY, TM, TD] = todayStr.split("-").map(Number);
const MIN = 60000, HOUR = 3600000, DAY = 86400000;
const dayMs = (off: number) => Date.UTC(TY, TM - 1, TD + off);
const W = (ms: number) => new Date(ms).toISOString().slice(0, 19).replace("T", " ");
const dkey = (ms: number) => new Date(ms).toISOString().slice(0, 10);
const dow = (ms: number) => new Date(ms).getUTCDay();
const NOWFIX = dayMs(0) + 14 * HOUR; // « maintenant » figé à 14h pour des captures d'agenda équilibrées

const FIRST = ["Sara", "Imane", "Meryem", "Lina", "Salma", "Kenza", "Houda", "Nour", "Yasmine", "Rim", "Asma", "Zineb", "Ghita", "Dounia", "Siham", "Latifa", "Hanane", "Wafa", "Nadia", "Samira", "Fatima Zahra", "Khadija", "Aicha", "Hajar", "Loubna", "Soukaina", "Btissam", "Ikram", "Oumaima", "Chaimae", "Sanae", "Amal", "Majda", "Ilham", "Rajae", "Safae", "Hind", "Jihane", "Manal", "Nawal", "Karima", "Leila", "Mouna", "Rania", "Sofia", "Bouchra", "Malak", "Douaa", "Ines", "Rita"];
const LAST = ["El Amrani", "Tazi", "Alaoui", "Benjelloun", "Berrada", "Filali", "Chakir", "Idrissi", "Benkirane", "Lahlou", "Ouazzani", "Saadi", "Tahiri", "Bouzid", "Moussaoui", "Kettani", "Senhaji", "Cherkaoui", "Belhaj", "El Fassi", "Bennani", "Chraibi", "Mernissi", "Lamrani", "Skalli", "Squalli", "Bennis", "Hajji", "Zniber", "Naciri", "Guessous", "Slaoui", "Tounsi", "El Idrissi", "Fassi Fihri", "Sebti", "Amrani", "Daoudi", "Kabbaj", "Bouayad"];

const STAFF = [
  ["e1", "Samira", "Alaoui", "0661205501", "Esthéticienne", "2022-03-01"],
  ["e2", "Hajar", "Benkirane", "0662310402", "Esthéticienne — soins visage", "2023-01-16"],
  ["e3", "Nadia", "Bennani", "0661001122", "Responsable & masseuse", "2020-01-10"],
  ["e4", "Meryem", "Lahlou", "0655667704", "Prothésiste ongulaire", "2024-04-02"],
  ["e5", "Zineb", "Chraibi", "0662110005", "Coiffeuse & maquilleuse", "2024-09-09"],
];

const RESOURCES = [
  ["r1", "Cabine soin 1", "CABINE", "Rez-de-chaussée"], ["r2", "Cabine soin 2", "CABINE", "Rez-de-chaussée"],
  ["r3", "Salle massage", "SALLE", "Étage"], ["r4", "Machine Hydrafacial", "MACHINE", "Cabine soin 1/2"],
  ["r5", "Poste manucure 1", "FAUTEUIL", "Espace ongles"], ["r6", "Poste manucure 2", "FAUTEUIL", "Espace ongles"],
  ["r7", "Salle hammam", "SALLE", "Sous-sol"], ["r8", "Poste coiffure & maquillage", "FAUTEUIL", "Espace beauté"],
];

// id, nom, catégorie, description, prix, durée, prépa, nettoyage, acompte, retour(j), employées, ressources
const SERVICES: Record<string, any> = {};
[
  ["s1", "Hydrafacial", "Soins visage", "Nettoyage, exfoliation et hydratation profonde avec sérum.", 550, 60, 10, 10, 100, 30, ["e2", "e1"], ["r1", "r2"]],
  ["s2", "Manucure semi-permanent", "Mains & pieds", "Soin des ongles et pose de vernis semi-permanent.", 200, 45, 5, 10, null, 21, ["e4", "e1"], ["r5", "r6"]],
  ["s3", "Soin visage éclat", "Soins visage", "Gommage, masque et massage du visage pour un teint lumineux.", 350, 60, 5, 10, null, 30, ["e1", "e2"], ["r1", "r2"]],
  ["s4", "Massage relaxant à l'huile d'argan", "Corps & massage", "Massage du corps détente aux huiles d'argan.", 400, 60, 10, 15, null, 21, ["e3", "e1"], ["r3"]],
  ["s5", "Épilation sourcils au fil", "Épilation", "Mise en forme des sourcils au fil.", 60, 20, 0, 5, null, 21, ["e1", "e2"], ["r1", "r2"]],
  ["s6", "Maquillage soirée", "Maquillage", "Maquillage professionnel pour soirée ou événement.", 450, 75, 10, 10, 100, null, ["e5"], ["r8"]],
  ["s7", "Hammam & gommage", "Hammam & spa", "Hammam marocain, savon beldi et gommage au gant kessa.", 300, 60, 10, 15, null, 14, ["e3", "e1"], ["r7"]],
  ["s8", "Pédicure spa", "Mains & pieds", "Bain, gommage, soin des pieds et pose de vernis.", 250, 60, 5, 10, null, 28, ["e4"], ["r5", "r6"]],
  ["s9", "Pose gel / capsules", "Mains & pieds", "Pose de capsules en gel avec décoration.", 350, 90, 5, 10, 100, 21, ["e4"], ["r5", "r6"]],
  ["s10", "Brushing", "Coiffure", "Shampoing, soin et brushing.", 120, 45, 0, 10, null, 14, ["e5"], ["r8"]],
  ["s11", "Coloration & soin", "Coiffure", "Coloration complète avec soin réparateur.", 500, 120, 10, 15, 150, 45, ["e5"], ["r8"]],
  ["s12", "Épilation jambes complètes", "Épilation", "Épilation à la cire des jambes complètes.", 180, 45, 5, 10, null, 30, ["e1", "e2"], ["r1", "r2"]],
  ["s13", "Extensions de cils", "Regard", "Pose cil à cil pour un regard intense.", 450, 120, 10, 10, 100, 21, ["e2"], ["r1", "r2"]],
].forEach((s: any) => {
  SERVICES[s[0]] = { id: s[0], name: s[1], category: s[2], desc: s[3], price: s[4], dur: s[5], prep: s[6], clean: s[7], deposit: s[8], ret: s[9], staff: s[10], res: s[11] };
});
const SVC_WEIGHTS: [string, number][] = [["s3", 14], ["s2", 16], ["s7", 12], ["s4", 10], ["s5", 10], ["s12", 6], ["s1", 8], ["s10", 6], ["s8", 6], ["s9", 4], ["s6", 3], ["s11", 3], ["s13", 2]];

// ─── Clientes ───
type Grp = "VIP" | "REG" | "NEW" | "RISK" | "INACTIVE";
const CUST: any[] = [];
const usedPhones = new Set<string>();
const PFX = ["0661", "0662", "0663", "0664", "0665", "0666", "0667", "0670", "0671", "0672", "0673", "0677", "0650", "0651", "0655", "0600", "0601", "0602"];
for (let i = 1; i <= 70; i++) {
  let phone = "";
  do { phone = pick(PFX) + String(ri(100000, 999999)); } while (usedPhones.has(phone));
  usedPhones.add(phone);
  const grp: Grp = i <= 5 ? "VIP" : i <= 45 ? "REG" : i <= 59 ? "NEW" : i <= 65 ? "RISK" : "INACTIVE";
  const first = FIRST[(i * 7) % 50], last = LAST[(i * 11 + 3) % 40];
  CUST.push({
    id: `c${i}`, first, last, phone, grp,
    insta: rnd() < 0.3 ? "@" + (first.split(" ")[0] + "." + last.replace(/\s/g, "")).toLowerCase().replace(/[^a-z.]/g, "") : null,
    wa: grp === "RISK" ? i <= 63 : rnd() < 0.7, sms: false,
    birth: rnd() < 0.6 ? `${ri(1984, 2003)}-${String(ri(1, 12)).padStart(2, "0")}-${String(ri(1, 28)).padStart(2, "0")}` : null,
    notes: null as string | null,
  });
}
CUST[0].notes = "Cliente fidèle depuis 2023. Aime le thé à la menthe en arrivant.";
CUST[1].notes = "Peau sensible : éviter les acides. Préfère Hajar.";
CUST[2].notes = "Allergique au latex (gants nitrile uniquement).";
CUST[5].notes = "Prépare son mariage en décembre — essai maquillage à prévoir.";
CUST[8].notes = "Préfère les rendez-vous en fin de journée.";
CUST[12].notes = "Souvent en retard de 10 min, prévenir par WhatsApp.";
CUST[19].notes = "Cliente venue par recommandation d'une amie.";
CUST[30].notes = "Souhaite un forfait manucure + pédicure.";

// ─── Plan de visites ───
type Visit = { cust: string; off: number; svc: string; hint?: number; force?: boolean };
const visits: Visit[] = [];
const svcFor = (c: any) => (c.id === "c1" ? "s1" : c.id === "c5" ? "s4" : wpick(SVC_WEIGHTS));
for (const c of CUST) {
  if (c.grp === "VIP") {
    let off = -(ri(48, 54)); const step = c.id === "c1" ? 14 : ri(11, 16);
    while (off < 0) { visits.push({ cust: c.id, off, svc: svcFor(c), force: true }); off += step + ri(-1, 2); }
    visits.push({ cust: c.id, off: ri(3, 9), svc: svcFor(c) });
  } else if (c.grp === "REG") {
    const n = ri(3, 8); const offs = new Set<number>();
    while (offs.size < n) offs.add(-ri(1, 56));
    [...offs].forEach((o) => visits.push({ cust: c.id, off: o, svc: wpick(SVC_WEIGHTS) }));
    if (rnd() < 0.55) visits.push({ cust: c.id, off: ri(2, 11), svc: wpick(SVC_WEIGHTS) });
  } else if (c.grp === "NEW") {
    const n = ri(1, 2); const offs = new Set<number>();
    while (offs.size < n) offs.add(-ri(1, 24));
    [...offs].forEach((o) => visits.push({ cust: c.id, off: o, svc: wpick(SVC_WEIGHTS), force: true }));
    if (rnd() < 0.45) visits.push({ cust: c.id, off: ri(2, 11), svc: wpick(SVC_WEIGHTS) });
  } else if (c.grp === "RISK") {
    const n = ri(1, 3); const offs = new Set<number>();
    while (offs.size < n) offs.add(-ri(52, 95));
    [...offs].forEach((o) => visits.push({ cust: c.id, off: o, svc: wpick(SVC_WEIGHTS), force: true }));
  } else {
    const n = ri(1, 2); const offs = new Set<number>();
    while (offs.size < n) offs.add(-ri(100, 170));
    [...offs].forEach((o) => visits.push({ cust: c.id, off: o, svc: wpick(SVC_WEIGHTS), force: true }));
  }
}
// Journée « aujourd'hui » et « demain » bien remplies (captures d'agenda)
{
  const pool1 = shuffle(CUST.filter((c) => c.grp === "VIP" || c.grp === "REG").map((c) => c.id));
  const todayHints = [9.5, 10, 10.5, 11, 11.5, 14, 15, 16.5, 17];
  todayHints.forEach((h, i) => visits.push({ cust: pool1[i], off: 0, svc: wpick(SVC_WEIGHTS), hint: h * 60 }));
  const tomHints = [9.5, 10, 11, 11.5, 14.5, 15.5, 16.5];
  tomHints.forEach((h, i) => visits.push({ cust: pool1[10 + i], off: 1, svc: wpick(SVC_WEIGHTS), hint: h * 60 }));
}

// ─── Planification sans chevauchement ───
const busy = new Map<string, [number, number][]>();
const addBusy = (k: string, s: number, e: number) => { if (!busy.has(k)) busy.set(k, []); busy.get(k)!.push([s, e]); };
const isFree = (k: string, s: number, e: number) => !(busy.get(k) || []).some(([a, b]) => s < b && e > a);
for (let off = -175; off <= 14; off++) for (const st of STAFF) addBusy(st[0], dayMs(off) + 13 * HOUR, dayMs(off) + 14 * HOUR);
for (let off = 6; off <= 8; off++) addBusy("e2", dayMs(off), dayMs(off) + DAY); // congé Hajar
for (let off = -20; off <= -18; off++) addBusy("e4", dayMs(off), dayMs(off) + DAY); // congé Meryem

type Apt = { id: string; cust: string; svc: string; staff: string; res: string; start: number; end: number; off: number; force?: boolean };
const apts: Apt[] = [];
function place(v: Visit): Apt | null {
  const S = SERVICES[v.svc];
  const fixed = v.off === 0 || v.off === 1;
  for (let shift = 0; shift <= (fixed ? 0 : 5); shift++) {
    const off = v.off + (v.off < 0 ? -shift : shift);
    const base = dayMs(off);
    if (dow(base) === 0) continue; // dimanche fermé
    let starts: number[] = [];
    for (let t = 9 * 60 + 30; t <= 17 * 60 + 30 && t + S.dur <= 18 * 60 + 30; t += 15) starts.push(t);
    starts = v.hint != null ? starts.sort((a, b) => Math.abs(a - v.hint!) - Math.abs(b - v.hint!)) : shuffle(starts);
    for (const t of starts) {
      const s = base + t * MIN, e = s + S.dur * MIN;
      for (const st of shuffle(S.staff as string[])) {
        if (!isFree(st, s, e)) continue;
        for (const r of shuffle(S.res as string[])) {
          if (!isFree(r, s, e)) continue;
          addBusy(st, s, e); addBusy(r, s, e);
          return { id: "", cust: v.cust, svc: v.svc, staff: st, res: r, start: s, end: e, off, force: v.force };
        }
      }
    }
  }
  return null;
}
{
  const ordered = [...visits.filter((v) => v.hint != null), ...shuffle(visits.filter((v) => v.hint == null))];
  let failed = 0;
  for (const v of ordered) { const a = place(v); if (a) apts.push(a); else failed++; }
  apts.sort((a, b) => a.start - b.start).forEach((a, i) => (a.id = `apt_${String(i + 1).padStart(4, "0")}`));
  log(`Planification : ${apts.length} rendez-vous placés, ${failed} non placés`);
}

// ─── Statuts, acomptes, paiements ───
const SRC: [string, number][] = [["MANUAL", 25], ["PHONE", 25], ["WHATSAPP", 25], ["ONLINE_BOOKING", 25]];
const aptRows: any[] = [];
const payRows: any[] = [];
for (const a of apts) {
  const S = SERVICES[a.svc];
  const c = CUST.find((x) => x.id === a.cust);
  const source = wpick(SRC);
  let status: string;
  if (a.off < 0) {
    const r = rnd();
    status = a.force || a.cust === "c1" || a.cust === "c5" ? "COMPLETED" : r < 0.88 ? "COMPLETED" : r < 0.94 ? "CANCELLED" : "NO_SHOW";
  } else if (a.off === 0) {
    status = a.end <= NOWFIX ? "COMPLETED" : a.start <= NOWFIX ? "IN_PROGRESS" : a.start <= NOWFIX + 45 * MIN ? "ARRIVED" : rnd() < 0.75 ? "CONFIRMED" : "PENDING";
  } else status = rnd() < 0.65 ? "CONFIRMED" : "PENDING";
  const lead = source === "ONLINE_BOOKING" ? ri(1, 6) : source === "PHONE" || source === "WHATSAPP" ? ri(0, 4) : ri(0, 2);
  const createdAt = Math.min(a.start - HOUR * 3, a.start - lead * DAY - ri(1, 8) * HOUR);
  const hasDeposit = !!S.deposit && ["COMPLETED", "CONFIRMED", "ARRIVED", "IN_PROGRESS", "PENDING"].includes(status);
  const depositState = !hasDeposit ? "NOT_REQUIRED" : status === "PENDING" ? "AWAITING" : "PAID";
  const row = {
    id: a.id, cust: a.cust, svc: a.svc, staff: a.staff, res: a.res, start: a.start, end: a.end, price: S.price,
    deposit: hasDeposit ? S.deposit : null, status, source, createdAt, depositState,
    depositDueAt: status === "PENDING" && hasDeposit ? a.start - DAY : null,
    notes: rnd() < 0.08 ? pick(["Cliente fidèle — thé à la menthe offert", "Peau sensible", "Arrive avec une amie", "Souhaite un soin complet", "Préfère le calme"]) : null,
    bookingRef: source === "ONLINE_BOOKING" ? "RB" + a.id.slice(-4) + String(ri(100, 999)) : null,
  };
  aptRows.push(row);
  if (hasDeposit && status !== "PENDING") {
    payRows.push({ apt: a.id, cust: a.cust, amount: S.deposit, method: pick(["CARD", "ONLINE", "CARD"]), kind: "DEPOSIT", paidAt: createdAt + 5 * MIN, key: `seed:${a.id}:dep` });
  }
  if (status === "COMPLETED") {
    const rest = S.price - (hasDeposit ? S.deposit : 0);
    const online = source === "ONLINE_BOOKING";
    if (rest > 0) {
      if (rnd() < 0.1 && rest >= 100) {
        const half = Math.round(rest / 2 / 10) * 10;
        payRows.push({ apt: a.id, cust: a.cust, amount: half, method: "CASH", kind: "PAYMENT", paidAt: a.end + 3 * MIN, key: `seed:${a.id}:p1` });
        payRows.push({ apt: a.id, cust: a.cust, amount: rest - half, method: "CARD", kind: "PAYMENT", paidAt: a.end + 4 * MIN, key: `seed:${a.id}:p2` });
      } else {
        const method = wpick<string>(online ? [["CARD", 45], ["ONLINE", 35], ["CASH", 20]] : [["CASH", 48], ["CARD", 45], ["TRANSFER", 7]]);
        payRows.push({ apt: a.id, cust: a.cust, amount: rest, method, kind: "PAYMENT", paidAt: a.end + 3 * MIN, key: `seed:${a.id}:p1` });
      }
    }
  }
}

// Numéros de ticket « JJ/MM-NNN » et identifiants de paiements (déterministes, indépendants de la base)
payRows.sort((x, y) => x.paidAt - y.paidAt);
const seqByDay = new Map<string, number>();
payRows.forEach((p, i) => {
  const dk = dkey(p.paidAt); const n = (seqByDay.get(dk) ?? 0) + 1; seqByDay.set(dk, n);
  p.id = `pay_${String(i + 1).padStart(4, "0")}`;
  p.ticket = `${dk.slice(8, 10)}/${dk.slice(5, 7)}-${String(n).padStart(3, "0")}`;
});

// ─── Insertion ───
async function stage1() {
  const U = "u_owner", CASHIER = "u_cashier";
  const firstOf = new Map<string, number>(), lastOf = new Map<string, number>();
  for (const a of aptRows) {
    if (a.status === "CANCELLED") continue;
    firstOf.set(a.cust, Math.min(firstOf.get(a.cust) ?? Infinity, a.start));
    if (a.start < NOWFIX) lastOf.set(a.cust, Math.max(lastOf.get(a.cust) ?? 0, a.start));
  }

  log("Personnel, services, ressources…");
  for (const [id, f, l, ph, pos, hire] of STAFF) {
    await q(`INSERT INTO "Staff" (id,"organizationId","firstName","lastName",phone,position,status,"hireDate","updatedAt")
             VALUES ($1,$2,$3,$4,$5,$6,'ACTIVE'::"StaffStatus",$7,NOW())`, [id, ORG, f, l, ph, pos, hire]);
    for (const day of [1, 2, 3, 4, 5, 6]) {
      await q(`INSERT INTO "StaffSchedule" (id,"staffId","dayOfWeek","startTime","endTime",active) VALUES ($1,$2,$3,$4,$5,true)`,
        [`sch_${id}_${day}`, id, day, "09:00", day === 6 ? "17:00" : "19:00"]);
      await q(`INSERT INTO "StaffBreak" (id,"staffId","dayOfWeek","startTime","endTime") VALUES ($1,$2,$3,'13:00','14:00')`, [`brk_${id}_${day}`, id, day]);
    }
  }
  await q(`INSERT INTO "StaffLeave" (id,"staffId","startAt","endAt",type,reason,status,"updatedAt")
           VALUES ('lv_e2_next','e2',$1,$2,'CONGE','Congé annuel','APPROVED',NOW()),
                  ('lv_e4_past','e4',$3,$4,'CONGE','Congé','APPROVED',NOW())`,
    [W(dayMs(6)), W(dayMs(8) + 23 * HOUR), W(dayMs(-20)), W(dayMs(-18) + 23 * HOUR)]);

  for (const [id, name, type, loc] of RESOURCES) {
    await q(`INSERT INTO "Resource" (id,"organizationId",name,type,capacity,location,active,"updatedAt") VALUES ($1,$2,$3,$4::"ResourceType",1,$5,true,NOW())`, [id, ORG, name, type, loc]);
  }
  await q(`INSERT INTO "ResourceMaintenance" (id,"resourceId","startAt","endAt",type,reason,status,"updatedAt")
           VALUES ('mnt_r4','r4',$1,$2,'PREVENTIVE','Révision machine Hydrafacial','SCHEDULED',NOW())`,
    [W(dayMs(12) + 8 * HOUR), W(dayMs(12) + 13 * HOUR)]);

  const COMM: Record<string, ["PERCENTAGE" | "FIXED", number]> = { e1: ["PERCENTAGE", 10], e2: ["PERCENTAGE", 12], e3: ["FIXED", 40], e4: ["PERCENTAGE", 10], e5: ["PERCENTAGE", 10] };
  for (const S of Object.values(SERVICES)) {
    await q(`INSERT INTO "Service" (id,"organizationId",name,description,category,price,"durationMin","prepTimeMin","cleanupTimeMin",deposit,"recommendedReturnDays",active,"updatedAt")
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,true,NOW())`,
      [S.id, ORG, S.name, S.desc, S.category, S.price, S.dur, S.prep, S.clean, S.deposit, S.ret]);
    for (const st of S.staff) {
      await q(`INSERT INTO "ServiceStaff" ("serviceId","staffId") VALUES ($1,$2)`, [S.id, st]);
      const [type, val] = COMM[st];
      await q(`INSERT INTO "ServiceCommission" (id,"serviceId","staffId",type,percentage,"fixedAmount") VALUES ($1,$2,$3,$4::"CommissionType",$5,$6)`,
        [`sc_${S.id}_${st}`, S.id, st, type, type === "PERCENTAGE" ? val : null, type === "FIXED" ? val : null]);
    }
    for (const r of S.res) await q(`INSERT INTO "ServiceResource" ("serviceId","resourceId",quantity) VALUES ($1,$2,1)`, [S.id, r]);
  }
  await q(`INSERT INTO "ServiceResource" ("serviceId","resourceId",quantity) VALUES ('s1','r4',1)`);

  log("Fournisseurs, produits, stock…");
  const SUP = [
    ["sup_atlas", "Cosmétiques Atlas", "0522334455", "commandes@cosmetiques-atlas.ma", "Casablanca", "Rachid Benslimane"],
    ["sup_argan", "Argan d'Or Souss", "0528221133", "contact@argandor-souss.ma", "Agadir", "Latifa Ait Brahim"],
    ["sup_pro", "Pro Beauté Maroc", "0537445566", "pro@probeaute.ma", "Rabat", "Omar El Khatib"],
    ["sup_nail", "Nail Studio Maroc", "0522998877", "hello@nailstudio.ma", "Casablanca", "Salwa Fassi"],
  ];
  for (const [id, name, ph, em, addr, ct] of SUP) {
    await q(`INSERT INTO "Supplier" (id,"organizationId",name,phone,email,address,"contactName",active,"updatedAt") VALUES ($1,$2,$3,$4,$5,$6,$7,true,NOW())`, [id, ORG, name, ph, em, addr, ct]);
  }
  // id, nom, sku, cat, unité, achat, vente, min, max, consommable, vendable, fournisseur, marque, stock cible, vendus
  const PROD: any[] = [
    ["p1", "Sérum hydratant Hydrafacial (100 ml)", "SER-HYD-01", "PROFESSIONNEL", "PIECE", 90, null, 5, 30, true, false, "sup_atlas", "HydraPro", 18, 0],
    ["p2", "Masque purifiant visage", "MAS-PUR-02", "CONSOMMABLE", "PIECE", 22, null, 20, 120, true, false, "sup_atlas", null, 85, 0],
    ["p3", "Huile d'argan massage (1 L)", "HUI-ARG-03", "PROFESSIONNEL", "L", 180, null, 2, 15, true, false, "sup_argan", "Argan d'Or", 6, 0],
    ["p4", "Gants nitrile (boîte de 100)", "GAN-NIT-04", "JETABLE", "BOX", 45, null, 5, 30, true, false, "sup_pro", null, 3, 0],
    ["p5", "Vernis semi-permanent", "VER-SEM-05", "CONSOMMABLE", "PIECE", 65, null, 10, 60, true, false, "sup_nail", "NailPro", 6, 0],
    ["p6", "Huile d'argan pure 100 ml", "HUI-ARG-06", "VENTE", "PIECE", 95, 180, 8, 40, false, true, "sup_argan", "Argan d'Or", 22, 6],
    ["p7", "Savon noir beldi", "SAV-BEL-07", "VENTE", "PIECE", 22, 45, 10, 60, false, true, "sup_argan", null, 38, 9],
    ["p8", "Gant kessa", "GAN-KES-08", "VENTE", "PIECE", 12, 30, 10, 50, false, true, "sup_pro", null, 0, 12],
    ["p9", "Cire d'épilation", "CIR-EPI-09", "CONSOMMABLE", "KG", 140, null, 2, 10, true, false, "sup_pro", null, 6, 0],
    ["p10", "Rhassoul naturel", "RHA-NAT-10", "VENTE", "PIECE", 35, 70, 6, 30, false, true, "sup_argan", null, 14, 4],
    ["p11", "Crème hydratante visage", "CRE-HYD-11", "VENTE", "PIECE", 85, 160, 8, 40, false, true, "sup_atlas", "SoftSkin", 17, 3],
    ["p12", "Colle extensions de cils", "COL-CIL-12", "CONSOMMABLE", "PIECE", 120, null, 3, 12, true, false, "sup_pro", null, 5, 0],
  ];
  const supName = Object.fromEntries(SUP.map((s) => [s[0], s[1]]));
  for (const p of PROD) {
    const [id, name, sku, cat, unit, buy, sale, min, max, cons, sellable, sup, brand, stock, sold] = p;
    await q(`INSERT INTO "Product" (id,"organizationId",name,sku,category,brand,unit,"purchasePrice","salePrice",stock,"minStock","maxStock","supplierName",consumable,sellable,active,"updatedAt")
             VALUES ($1,$2,$3,$4,$5::"ProductCategory",$6,$7::"ProductUnit",$8,$9,0,$10,$11,$12,$13,$14,true,NOW())`,
      [id, ORG, name, sku, cat, brand, unit, buy, sale, min, max, supName[sup], cons, sellable]);
    await q(`INSERT INTO "ProductSupplier" (id,"productId","supplierId","purchasePrice",preferred,"updatedAt") VALUES ($1,$2,$3,$4,true,NOW())`, [`ps_${id}`, id, sup, buy]);
    const total = stock + sold;
    const p1 = total > 0 ? Math.ceil(total * 0.6) : 0, p2 = total - p1;
    const mv = async (key: string, type: string, qty: number, ref: string, reason: string, when: number) =>
      q(`INSERT INTO "InventoryMovement" (id,"organizationId","productId",type,quantity,unit,reason,"referenceType","idempotencyKey","createdAt")
         VALUES ($1,$2,$3,$4::"MovementType",$5,$6::"ProductUnit",$7,$8::"InventoryReferenceType",$9,$10)`,
        [`mov_${id}_${key}`, ORG, id, type, qty, unit, reason, ref, `seed:${id}:${key}`, W(when)]);
    if (p1 > 0) await mv("a", "PURCHASE", p1, "PURCHASE", "Réception commande fournisseur", dayMs(-52) + 10 * HOUR);
    if (p2 > 0) await mv("b", "PURCHASE", p2, "PURCHASE", "Réassort", dayMs(-14) + 11 * HOUR);
    for (let k = 0; k < sold; k++) await mv(`s${k}`, "SALE", -1, "SALE", "Vente en caisse", dayMs(-ri(1, 40)) + ri(10, 17) * HOUR);
  }
  await q(`UPDATE "Product" p SET stock = COALESCE((SELECT SUM(quantity) FROM "InventoryMovement" m WHERE m."productId"=p.id),0), "updatedAt"=NOW() WHERE p."organizationId"=$1`, [ORG]);
  await q(`INSERT INTO "ProductLot" (id,"productId","lotNumber",quantity,"expiresAt","updatedAt") VALUES
           ('lot_p2','p2','LOT-MAS-1126',85,$1,NOW()),('lot_p12','p12','LOT-COL-1226',5,$2,NOW()),('lot_p6','p6','LOT-HAR-0627',22,$3,NOW())`,
    [W(dayMs(18)), W(dayMs(24)), W(dayMs(210))]);
  const SP: [string, string, number, string][] = [["s1", "p1", 1, "PIECE"], ["s1", "p2", 1, "PIECE"], ["s3", "p2", 1, "PIECE"], ["s4", "p3", 0.05, "L"], ["s2", "p5", 0.1, "PIECE"], ["s9", "p5", 0.2, "PIECE"], ["s12", "p9", 0.03, "KG"], ["s13", "p12", 0.1, "PIECE"]];
  for (const [s, p, qty, unit] of SP) await q(`INSERT INTO "ServiceProduct" ("serviceId","productId",quantity,unit) VALUES ($1,$2,$3,$4::"ProductUnit")`, [s, p, qty, unit]);

  await q(`INSERT INTO "Purchase" (id,"organizationId","supplierId",number,status,notes,"orderedAt","createdById","updatedAt") VALUES
           ('pur_1',$1,'sup_atlas','ACH-2026-0007','ORDERED'::"PurchaseStatus",'Réassort sérum et masques',$2,'u_owner',NOW()),
           ('pur_2',$1,'sup_nail','ACH-2026-0008','DRAFT'::"PurchaseStatus",'Vernis semi-permanent',NULL,'u_manager',NOW())`, [ORG, W(dayMs(-2) + 11 * HOUR)]);
  await q(`INSERT INTO "PurchaseItem" (id,"purchaseId","productId","quantityOrdered","quantityReceived","unitPrice",unit) VALUES
           ('pui1','pur_1','p1',12,0,90,'PIECE'::"ProductUnit"),('pui2','pur_1','p2',60,0,22,'PIECE'::"ProductUnit"),
           ('pui3','pur_2','p5',24,0,65,'PIECE'::"ProductUnit")`);

  log("Clientes…");
  for (const c of CUST) {
    const first = firstOf.get(c.id), last = lastOf.get(c.id);
    const created =
      c.grp === "VIP" ? dayMs(-ri(220, 520)) : c.grp === "NEW" ? (first ?? dayMs(-10)) - DAY
      : Math.min(first ?? dayMs(-30), dayMs(-56)) - ri(10, 260) * DAY;
    const status = c.grp === "VIP" ? "VIP" : c.grp === "NEW" ? "NEW" : c.grp === "RISK" ? "AT_RISK" : c.grp === "INACTIVE" ? "INACTIVE" : "ACTIVE";
    await q(`INSERT INTO "Customer" (id,"organizationId","firstName","lastName",phone,status,instagram,notes,"birthDate","marketingWhatsapp","marketingEmail","marketingSms","createdAt","updatedAt")
             VALUES ($1,$2,$3,$4,$5,$6::"CustomerStatus",$7,$8,$9,$10,false,false,$11,$12)`,
      [c.id, ORG, c.first, c.last, c.phone, status, c.insta, c.notes, c.birth, c.wa, W(created), W(last ?? created)]);
  }
  // Anniversaire aujourd'hui (message WhatsApp d'anniversaire)
  await q(`UPDATE "Customer" SET "birthDate"=make_date($2,$3,$4) WHERE id='c13' AND "organizationId"=$1`, [ORG, TY - 29, TM, TD]);

  log(`Rendez-vous (${aptRows.length})…`);
  for (const a of aptRows) {
    await q(`INSERT INTO "Appointment" (id,"organizationId","customerId","serviceId","staffId","resourceId","startAt","endAt",price,deposit,status,notes,"createdAt","updatedAt",source,"depositState","depositDueAt","serviceNameSnapshot","bookingRef")
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::"AppointmentStatus",$12,$13,$14,$15::"AppointmentSource",$16::"DepositState",$17,$18,$19)`,
      [a.id, ORG, a.cust, a.svc, a.staff, a.res, W(a.start), W(a.end), a.price, a.deposit, a.status, a.notes, W(a.createdAt),
       W(a.status === "COMPLETED" ? a.end : a.createdAt), a.source, a.depositState, a.depositDueAt ? W(a.depositDueAt) : null, SERVICES[a.svc].name, a.bookingRef]);
  }

  log(`Paiements (${payRows.length}) et caisse…`);
  for (const p of payRows) {
    await q(`INSERT INTO "Payment" (id,"organizationId","appointmentId","customerId",amount,method,kind,status,"userId","idempotencyKey","ticketNumber","paidAt","createdAt","updatedAt")
             VALUES ($1,$2,$3,$4,$5,$6::"PaymentMethod",$7::"PaymentKind",'COMPLETED'::"PaymentStatus",$8,$9,$10,$11,$11,$11)`,
      [p.id, ORG, p.apt, p.cust, p.amount, p.method, p.kind, CASHIER, p.key, p.ticket, W(p.paidAt)]);
  }
  for (const [dk, n] of seqByDay) await q(`INSERT INTO "PaymentTicketSequence" ("organizationId","dayKey","lastValue","updatedAt") VALUES ($1,$2,$3,NOW())`, [ORG, dk, n]);

  // Sessions de caisse : une par jour ouvré passé (fermée) + celle d'aujourd'hui (ouverte)
  const cashByDay = new Map<string, any[]>();
  for (const p of payRows) if (p.method === "CASH") { const dk = dkey(p.paidAt); (cashByDay.get(dk) ?? cashByDay.set(dk, []).get(dk)!).push(p); }
  const cashExp: Record<string, { id: string; amount: number; reason: string }> = {
    [dkey(dayMs(-9))]: { id: "ctx_exp_1", amount: 120, reason: "Café, thé et eau pour l'accueil" },
    [dkey(dayMs(-3))]: { id: "ctx_exp_2", amount: 85, reason: "Produits d'entretien" },
  };
  for (let off = -56; off <= 0; off++) {
    const base = dayMs(off); if (dow(base) === 0) continue;
    const dk = dkey(base); const sid = `crs_${dk.replace(/-/g, "")}`;
    const sales = cashByDay.get(dk) ?? []; const exp = cashExp[dk];
    const cashIn = sales.reduce((s, p) => s + p.amount, 0);
    const expected = 1000 + cashIn - (exp?.amount ?? 0);
    const isToday = off === 0;
    const diff = isToday ? null : rnd() < 0.25 ? pick([-20, -10, 5, 10]) : 0;
    await q(`INSERT INTO "CashRegisterSession" (id,"organizationId","openedById","closedById","openingFloat","closingCounted","expectedBalance",difference,status,"openedAt","closedAt","createdAt","updatedAt")
             VALUES ($1,$2,'u_cashier',$3,1000,$4,$5,$6,$7::"CashRegisterStatus",$8,$9,$8,$9)`,
      [sid, ORG, isToday ? null : "u_cashier", isToday ? null : expected + diff!, isToday ? null : expected, diff, isToday ? "OPEN" : "CLOSED",
       W(base + 9 * HOUR), W(isToday ? NOWFIX : base + 19 * HOUR + 10 * MIN)]);
    await q(`INSERT INTO "CashRegisterTransaction" (id,"organizationId","sessionId",type,amount,method,reason,"userId","idempotencyKey","createdAt")
             VALUES ($1,$2,$3,'OPENING'::"CashTxnType",1000,'CASH'::"PaymentMethod",'Fond de caisse','u_cashier',$4,$5)`, [`ctx_open_${dk}`, ORG, sid, `open:${sid}`, W(base + 9 * HOUR)]);
    for (const p of sales) {
      await q(`INSERT INTO "CashRegisterTransaction" (id,"organizationId","sessionId",type,amount,method,reason,"paymentId","userId","idempotencyKey","createdAt")
               VALUES ($1,$2,$3,'SALE'::"CashTxnType",$4,'CASH'::"PaymentMethod",'Encaissement RDV',$5,'u_cashier',$6,$7)`, [`ctx_${p.id}`, ORG, sid, p.amount, p.id, `cashpay:${p.id}`, W(p.paidAt)]);
    }
    if (exp) {
      await q(`INSERT INTO "CashRegisterTransaction" (id,"organizationId","sessionId",type,amount,method,reason,"userId","idempotencyKey","createdAt")
               VALUES ($1,$2,$3,'EXPENSE'::"CashTxnType",$4,'CASH'::"PaymentMethod",$5,'u_owner',$6,$7)`, [exp.id, ORG, sid, -exp.amount, exp.reason, `expense:${exp.id}`, W(base + 12 * HOUR)]);
      await q(`INSERT INTO "Expense" (id,"organizationId",category,amount,"paymentMethod",description,"expenseDate",status,"createdById","updatedAt")
               VALUES ($1,$2,'OFFICE'::"ExpenseCategory",$3,'CASH'::"PaymentMethod",$4,$5,'RECORDED'::"ExpenseStatus",'u_owner',NOW())`, [`exp_${exp.id}`, ORG, exp.amount, exp.reason, W(base)]);
    }
  }

  log("Dépenses…");
  const EXP: [string, number, string, string, string | null, number, string | null][] = [];
  for (let m = 0; m <= 2; m++) {
    const first = Date.UTC(TY, TM - 1 - m, 1);
    const mm = new Date(first).getUTCMonth() + 1, yy = new Date(first).getUTCFullYear();
    const lbl = `${String(mm).padStart(2, "0")}-${yy}`;
    const at = (day: number) => Date.UTC(yy, mm - 1, day);
    EXP.push(["RENT", 9000, "TRANSFER", `Loyer du local — Bd Zerktouni`, null, at(1), `LOY-${lbl}`]);
    EXP.push(["INTERNET", 299, "CARD", "Abonnement fibre", null, at(5), null]);
    EXP.push(["PRODUCT_PURCHASE", 2800 + m * 150, "TRANSFER", "Réassort produits professionnels", "sup_atlas", at(8), null]);
    EXP.push(["ELECTRICITY", 1180 + m * 110, "TRANSFER", "Facture d'électricité", null, at(12), `FAC-E-${lbl}`]);
    EXP.push(["WATER", 340, "TRANSFER", "Facture d'eau", null, at(12), `FAC-W-${lbl}`]);
    EXP.push(["MARKETING", 900, "CARD", "Publicité Instagram", null, at(15), null]);
    EXP.push(["MAINTENANCE", 450, "CARD", "Entretien machine Hydrafacial", null, at(20), null]);
    EXP.push(["SALARY", 16500, "TRANSFER", "Salaires de l'équipe", null, at(28), null]);
  }
  let ex = 0;
  for (const [cat, amt, method, desc, sup, when, ref] of EXP) {
    if (when > dayMs(0)) continue;
    await q(`INSERT INTO "Expense" (id,"organizationId",category,amount,"paymentMethod",description,"supplierId","expenseDate",reference,status,"createdById","createdAt","updatedAt")
             VALUES ($1,$2,$3::"ExpenseCategory",$4,$5::"PaymentMethod",$6,$7,$8,$9,'RECORDED'::"ExpenseStatus",'u_owner',$8,$8)`,
      [`exp_${++ex}`, ORG, cat, amt, method, desc, sup, W(when), ref]);
  }

}

/** Seconde moitié : factures, commissions, fidélité, forfaits, promos, avis, notifications, WhatsApp (reprenable). */
async function stage2() {
  const U = "u_owner";
  const { pool: libPool } = await import("../src/lib/db/pool");
  libPool.on("error", (e: any) => console.error("pool app (ignoré) :", e.message));
  log("Factures, commissions, fidélité (via les fonctions de l'app)…");
  const { issueInvoiceFromAppointment } = await import("../src/lib/db/invoices");
  const { createCommissionForAppointment } = await import("../src/lib/db/commissions");
  const { earnPointsFromPayment, consumePackageSessionForAppointment } = await import("../src/lib/db/loyalty");
  const completed = aptRows.filter((a) => a.status === "COMPLETED").sort((x, y) => x.end - y.end);
  let done = 0, errs = 0;
  for (const a of completed) {
    try {
      await retry(() => issueInvoiceFromAppointment(ORG, { appointmentId: a.id }, U));
      await retry(() => createCommissionForAppointment({ organizationId: ORG, appointmentId: a.id }));
    } catch (e: any) { if (++errs <= 5) log("  erreur facture/commission", a.id, e.message); }
    if (++done % 50 === 0) log(`  ${done}/${completed.length} rendez-vous traités`);
  }
  for (const p of payRows) {
    try { await retry(() => earnPointsFromPayment({ organizationId: ORG, customerId: p.cust, paymentId: p.id, amountMad: p.amount, appointmentId: p.apt, userId: U })); }
    catch (e: any) { if (++errs <= 10) log("  erreur fidélité", p.id, e.message); }
  }
  log(`  terminé, ${errs} erreur(s)`);

  // Remet les dates historiques (les fonctions ci-dessus écrivent « maintenant »)
  await q(`UPDATE "Invoice" i SET "issuedAt"=a."endAt","createdAt"=a."endAt","updatedAt"=a."endAt" FROM "Appointment" a WHERE a.id=i."appointmentId" AND i."organizationId"=$1`, [ORG]);
  await q(`UPDATE "CommissionRecord" c SET "createdAt"=a."endAt","updatedAt"=a."endAt" FROM "Appointment" a WHERE a.id=c."appointmentId" AND c."organizationId"=$1`, [ORG]);
  await q(`UPDATE "CommissionRecord" SET paid=true,"paidAt"="createdAt" + INTERVAL '3 days' WHERE "organizationId"=$1 AND "createdAt" < $2`, [ORG, W(dayMs(-35))]);
  await q(`UPDATE "LoyaltyTransaction" t SET "createdAt"=p."paidAt" FROM "Payment" p WHERE p.id=t."paymentId" AND t."organizationId"=$1`, [ORG]);
  await q(`UPDATE "LoyaltyAccount" a SET "createdAt"=COALESCE((SELECT MIN("createdAt") FROM "LoyaltyTransaction" t WHERE t."accountId"=a.id),a."createdAt"),"updatedAt"=COALESCE((SELECT MAX("createdAt") FROM "LoyaltyTransaction" t WHERE t."accountId"=a.id),a."updatedAt") WHERE a."organizationId"=$1`, [ORG]);

  log("Fidélité, forfaits, promotions, cartes cadeaux…");
  const rewards: [string, string, number, string, number | null, string | null][] = [
    ["lrwd_50", "Remise 50 MAD", 500, "DISCOUNT_FIXED", 50, null], ["lrwd_soin", "Soin visage offert", 1000, "FREE_SERVICE", null, "s3"],
    ["lrwd_20", "Remise 20 %", 2000, "DISCOUNT_PERCENT", 20, null], ["lrwd_mani", "Manucure offerte", 800, "FREE_SERVICE", null, "s2"],
  ];
  for (const [id, name, cost, type, val, svc] of rewards) {
    await q(`INSERT INTO "LoyaltyReward" (id,"organizationId",name,"pointsCost",type,value,"serviceId",active,"redemptionCount","updatedAt") VALUES ($1,$2,$3,$4,$5::"LoyaltyRewardType",$6,$7,true,0,NOW())`, [id, ORG, name, cost, type, val, svc]);
  }
  const c1First = aptRows.filter((a) => a.cust === "c1" && a.svc === "s1" && a.status === "COMPLETED").sort((x, y) => x.start - y.start);
  const c5First = aptRows.filter((a) => a.cust === "c5" && a.svc === "s4" && a.status === "COMPLETED").sort((x, y) => x.start - y.start);
  const pkgs: [string, string, string, string, number, number, number, number][] = [
    ["pkg_1", "c1", "Forfait Hydrafacial — 6 séances", "s1", 6, 2800, (c1First[0]?.start ?? dayMs(-50)) - 3 * DAY, dayMs(150)],
    ["pkg_2", "c5", "Forfait Massage — 5 séances", "s4", 5, 1700, (c5First[0]?.start ?? dayMs(-45)) - 3 * DAY, dayMs(120)],
    ["pkg_3", "c2", "Forfait Soin visage — 3 séances", "s3", 3, 900, dayMs(-80), dayMs(12)],
  ];
  for (const [id, cust, name, svc, total, price, bought, exp] of pkgs) {
    await q(`INSERT INTO "Package" (id,"organizationId","customerId",name,"serviceId","sessionTotal","sessionUsed","pricePaid",status,"purchasedAt","expiresAt","createdById","createdAt","updatedAt")
             VALUES ($1,$2,$3,$4,$5,$6,0,$7,'ACTIVE'::"PackageStatus",$8,$9,'u_owner',$8,$8)`, [id, ORG, cust, name, svc, total, price, W(bought), W(exp)]);
    await q(`INSERT INTO "PackageItem" (id,"packageId","serviceId","sessionTotal","sessionUsed") VALUES ($1,$2,$3,$4,0)`, [`pki_${id}`, id, svc, total]);
  }
  for (const [cust, svc, list] of [["c1", "s1", c1First.slice(0, 3)], ["c5", "s4", c5First.slice(0, 2)]] as any) {
    for (const a of list) { try { await consumePackageSessionForAppointment({ organizationId: ORG, appointmentId: a.id, customerId: cust, serviceId: svc }); } catch (e: any) { log("  forfait", e.message); } }
  }
  await q(`UPDATE "PackageSession" ps SET "createdAt"=a."endAt" FROM "Appointment" a WHERE a.id=ps."appointmentId" AND ps."organizationId"=$1`, [ORG]);

  await q(`INSERT INTO "Promotion" (id,"organizationId",name,code,type,status,value,"serviceId","minAmount","maxUses","usageCount","startsAt","endsAt","timeStart","timeEnd",weekdays,"updatedAt") VALUES
    ('promo_hydra',$1,'-15 % sur l''Hydrafacial','HIVER15','PERCENTAGE'::"PromotionType",'ACTIVE'::"PromotionStatus",15,'s1',NULL,100,7,$2,$3,NULL,NULL,NULL,NOW()),
    ('promo_happy',$1,'Happy Hour — mardi au jeudi','HAPPY20','HAPPY_HOUR'::"PromotionType",'ACTIVE'::"PromotionStatus",20,NULL,NULL,NULL,12,NULL,NULL,'14:00','17:00','2,3,4',NOW()),
    ('promo_pack',$1,'Pack Hammam + Massage',NULL,'PACKAGE'::"PromotionType",'ACTIVE'::"PromotionStatus",NULL,'s7',NULL,NULL,3,$2,$4,NULL,NULL,NULL,NOW())`,
    [ORG, W(dayMs(-10)), W(dayMs(20)), W(dayMs(35))]);
  await q(`INSERT INTO "GiftCard" (id,"organizationId",code,"initialValue",balance,"buyerCustomerId","beneficiaryCustomerId",status,"expiresAt","createdById","createdAt","updatedAt") VALUES
    ('gc_1',$1,'BEAUTY-7K2M-QX',500,500,'c8','c12','ACTIVE'::"GiftCardStatus",$2,'u_owner',$3,$3),
    ('gc_2',$1,'BEAUTY-4P9D-LT',300,300,'c20',NULL,'ACTIVE'::"GiftCardStatus",$4,'u_owner',$5,$5)`,
    [ORG, W(dayMs(160)), W(dayMs(-12)), W(dayMs(120)), W(dayMs(-4))]);
  await q(`INSERT INTO "GiftCardTransaction" (id,"organizationId","giftCardId",type,amount,"balanceAfter",reason,"createdById","idempotencyKey","createdAt") VALUES
    ('gctx_1',$1,'gc_1','ISSUED'::"GiftCardTxnType",500,500,'Émission carte cadeau','u_owner','issue:gc_1',$2),
    ('gctx_2',$1,'gc_2','ISSUED'::"GiftCardTxnType",300,300,'Émission carte cadeau','u_owner','issue:gc_2',$3)`, [ORG, W(dayMs(-12)), W(dayMs(-4))]);
  await q(`INSERT INTO "Campaign" (id,"organizationId",name,channel,status,"messageTemplate","segmentFilters","promotionId","createdById","createdAt","updatedAt")
           VALUES ('camp_1',$1,'Retour Hydrafacial','WHATSAPP'::"CampaignChannel",'DRAFT'::"CampaignStatus",$2,$3::jsonb,'promo_hydra','u_owner',$4,$4)`,
    [ORG, "Bonjour {{customer.firstName}} 🌸\n\nVotre dernier {{lastService.name}} remonte à {{lastVisit.date}}.\nProfitez de {{promotion.discount}} avec le code {{promotion.code}}.\n\nÀ bientôt ❤️",
     JSON.stringify({ minDaysSinceLastVisit: 45, serviceIds: ["s1"], marketingWhatsapp: true, noUpcomingAppointment: true, excludeRecentMarketing: true }), W(dayMs(-3))]);

  log("Avis…");
  const REV: [string, number, string, boolean][] = [
    ["s1", 5, "Un accueil chaleureux et un résultat visible dès la première séance. Hajar est très professionnelle !", true],
    ["s7", 5, "Le hammam marocain est un vrai moment de détente, on en ressort comme neuve. Je reviendrai !", true],
    ["s2", 5, "Très belle manucure semi-permanent, la tenue est impeccable après trois semaines. Merci Meryem.", true],
    ["s3", 4, "Institut propre et personnel souriant. Seul petit bémol : un peu d'attente à mon arrivée.", true],
    ["s4", 5, "Massage à l'huile d'argan incroyable, Nadia a des mains en or.", true],
    ["s10", 5, "Brushing parfait pour ma soirée, Zineb a compris exactement ce que je voulais.", true],
    ["s1", 4, "Bon rapport qualité-prix, je recommande l'Hydrafacial.", true],
    ["s12", 4, "Épilation rapide et peu douloureuse, je suis satisfaite.", true],
    ["s6", 5, "Le maquillage a tenu toute la soirée, j'ai reçu beaucoup de compliments !", true],
    ["s5", 5, "Prise de rendez-vous facile par WhatsApp et rappel la veille, c'est très pratique.", true],
    ["s3", 3, "Soin agréable mais j'aurais aimé plus de conseils sur les produits à utiliser chez moi.", false],
  ];
  const usedCust = new Set<string>();
  let ri2 = 0;
  for (const [svc, rating, comment, published] of REV) {
    const cand = aptRows.filter((a) => a.svc === svc && a.status === "COMPLETED" && a.start > dayMs(-45) && a.start < dayMs(0) && !usedCust.has(a.cust)).sort((x, y) => y.start - x.start)[0]
      ?? aptRows.filter((a) => a.status === "COMPLETED" && a.start < dayMs(0) && !usedCust.has(a.cust)).sort((x, y) => y.start - x.start)[0];
    if (!cand) continue; usedCust.add(cand.cust);
    const when = cand.end + ri(2, 30) * HOUR;
    await q(`INSERT INTO "Review" (id,"organizationId","customerId","appointmentId",rating,comment,status,"publishedAt","createdAt","updatedAt","staffId","staffRating")
             VALUES ($1,$2,$3,$4,$5,$6,$7::"PublicReviewStatus",$8,$9,$9,$10,$5)`,
      [`rev_${++ri2}`, ORG, cand.cust, cand.id, rating, comment, published ? "PUBLISHED" : "PENDING", published ? W(when) : null, W(when), cand.staff]);
  }

  log("Notifications…");
  const NOTIF: [string, string, string, string, number, boolean][] = [
    ["APPOINTMENT_CREATED", "Nouvelle réservation en ligne", "Une cliente a réservé un Hydrafacial pour demain à 15:00.", "INFO", 25, false],
    ["PAYMENT_RECEIVED", "Paiement reçu", "Acompte de 100 MAD reçu en ligne pour une pose de cils.", "SUCCESS", 70, false],
    ["STOCK_LOW", "Stock bas", "Gants nitrile : il en reste 3 (seuil : 5).", "WARNING", 140, false],
    ["STOCK_OUT", "Rupture de stock", "Gant kessa : le stock est épuisé.", "CRITICAL", 200, false],
    ["PRODUCT_EXPIRING", "Produit bientôt périmé", "Masque purifiant visage : le lot expire dans 18 jours.", "WARNING", 380, true],
    ["REVIEW_PENDING", "Avis à modérer", "Un nouvel avis de 3 étoiles attend votre validation.", "INFO", 600, false],
    ["PACKAGE_EXPIRING", "Forfait bientôt expiré", "Le forfait Soin visage de Imane expire dans 12 jours.", "WARNING", 1500, true],
    ["STAFF_LEAVE", "Congé à venir", "Hajar sera en congé du lundi au mercredi prochain.", "INFO", 2800, true],
    ["APPOINTMENT_CANCELLED", "Rendez-vous annulé", "Une cliente a annulé son rendez-vous de samedi.", "WARNING", 4300, true],
  ];
  let nn = 0;
  for (const uid of ["u_owner", "u_manager"]) for (const [type, title, msg, sev, ago, read] of NOTIF) {
    const when = NOWFIX - ago * MIN;
    await q(`INSERT INTO "Notification" (id,"organizationId","userId",type,title,message,severity,"idempotencyKey","readAt","createdAt")
             VALUES ($1,$2,$3,$4::"NotificationType",$5,$6,$7::"NotificationSeverity",$8,$9,$10)`,
      [`ntf_${++nn}`, ORG, uid, type, title, msg, sev, `seed:ntf:${nn}`, read ? W(when + 20 * MIN) : null, W(when)]);
  }

  log("Statuts clientes + tâches WhatsApp…");
  const { ensureDefaultTemplates, syncWhatsAppTasks } = await import("../src/lib/db/whatsapp");
  const { syncReviewRequests } = await import("../src/lib/db/reviews");
  await retry(() => ensureDefaultTemplates(ORG));
  await retry(() => syncWhatsAppTasks(ORG));
  await retry(() => syncReviewRequests(ORG));
}

async function report() {
  const one = async (s: string, p: any[] = [ORG]) => (await q(s, p)).rows;
  log("— Contrôle —");
  const counts = await one(`SELECT 'Clientes' k,count(*) n FROM "Customer" WHERE "organizationId"=$1 UNION ALL SELECT 'Rendez-vous',count(*) FROM "Appointment" WHERE "organizationId"=$1 UNION ALL SELECT 'Paiements',count(*) FROM "Payment" WHERE "organizationId"=$1 UNION ALL SELECT 'Factures',count(*) FROM "Invoice" WHERE "organizationId"=$1 UNION ALL SELECT 'Commissions',count(*) FROM "CommissionRecord" WHERE "organizationId"=$1 UNION ALL SELECT 'Points fidélité (lignes)',count(*) FROM "LoyaltyTransaction" WHERE "organizationId"=$1 UNION ALL SELECT 'Tâches WhatsApp',count(*) FROM "WhatsAppTask" WHERE "organizationId"=$1 UNION ALL SELECT 'Avis',count(*) FROM "Review" WHERE "organizationId"=$1 UNION ALL SELECT 'Produits',count(*) FROM "Product" WHERE "organizationId"=$1`);
  console.log(counts.map((r) => `${r.k}: ${r.n}`).join(" | "));
  console.log("Factures par statut:", (await one(`SELECT status::text s,count(*)::int n FROM "Invoice" WHERE "organizationId"=$1 GROUP BY 1`)).map((r) => `${r.s}=${r.n}`).join(" "));
  console.log("RDV par statut:", (await one(`SELECT status::text s,count(*)::int n FROM "Appointment" WHERE "organizationId"=$1 GROUP BY 1`)).map((r) => `${r.s}=${r.n}`).join(" "));
  console.log("CA encaissé par mois:", (await one(`SELECT to_char("paidAt",'YYYY-MM') m,round(sum(amount))::int t FROM "Payment" WHERE "organizationId"=$1 AND kind<>'REFUND' GROUP BY 1 ORDER BY 1`)).map((r) => `${r.m}=${r.t}`).join(" "));
  console.log("RDV aujourd'hui:", (await one(`SELECT count(*)::int n FROM "Appointment" WHERE "organizationId"=$1 AND "startAt"::date=$2::date`, [ORG, todayStr]))[0].n);
}

(async () => {
  if (MODE === "backup") { await backup(); }
  else if (MODE === "run") {
    if (process.env.CONFIRM_RESET_ROYAL !== "yes") throw new Error("Définir CONFIRM_RESET_ROYAL=yes pour exécuter.");
    await backup();
    await wipe();
    await stage1();
    await stage2();
    await report();
  } else if (MODE === "resume") {
    // Reprend après une coupure : saute sauvegarde, suppression et première moitié du remplissage.
    if (process.env.CONFIRM_RESET_ROYAL !== "yes") throw new Error("Définir CONFIRM_RESET_ROYAL=yes pour exécuter.");
    await stage2();
    await report();
  } else if (MODE === "settle") {
    // L'app termine automatiquement les RDV dont l'heure est passée : on encaisse ceux du jour restés sans paiement.
    const { issueInvoiceFromAppointment } = await import("../src/lib/db/invoices");
    const { earnPointsFromPayment } = await import("../src/lib/db/loyalty");
    const rows = (await q(
      `SELECT a.id, a."customerId", a.price::float8 AS price FROM "Appointment" a
       WHERE a."organizationId"=$1 AND a.status='COMPLETED' AND a."startAt"::date=$2::date
         AND NOT EXISTS (SELECT 1 FROM "Payment" p WHERE p."appointmentId"=a.id) ORDER BY a."endAt"`, [ORG, todayStr])).rows;
    let n = (await q(`SELECT "lastValue" FROM "PaymentTicketSequence" WHERE "organizationId"=$1 AND "dayKey"=$2`, [ORG, todayStr])).rows[0]?.lastValue ?? 0;
    const sid = `crs_${todayStr.replace(/-/g, "")}`;
    for (const r of rows) {
      n++;
      const method = pick(["CASH", "CARD", "CARD", "CASH"]); const id = `pay_settle_${r.id}`;
      const ticket = `${todayStr.slice(8, 10)}/${todayStr.slice(5, 7)}-${String(n).padStart(3, "0")}`;
      await q(`INSERT INTO "Payment" (id,"organizationId","appointmentId","customerId",amount,method,kind,status,"userId","idempotencyKey","ticketNumber","paidAt","createdAt","updatedAt")
               SELECT $2,a."organizationId",a.id,a."customerId",a.price,$3::"PaymentMethod",'PAYMENT'::"PaymentKind",'COMPLETED'::"PaymentStatus",'u_cashier',$4,$5,
                      a."endAt"+INTERVAL '3 minutes',a."endAt"+INTERVAL '3 minutes',a."endAt"+INTERVAL '3 minutes'
               FROM "Appointment" a WHERE a.id=$1`, [r.id, id, method, `seed:${r.id}:p1`, ticket]);
      if (method === "CASH") {
        await q(`INSERT INTO "CashRegisterTransaction" (id,"organizationId","sessionId",type,amount,method,reason,"paymentId","userId","idempotencyKey","createdAt")
                 SELECT $1,$2,$3,'SALE'::"CashTxnType",p.amount,'CASH'::"PaymentMethod",'Encaissement RDV',p.id,'u_cashier',$4,p."paidAt" FROM "Payment" p WHERE p.id=$5`,
          [`ctx_${id}`, ORG, sid, `cashpay:${id}`, id]);
      }
      await retry(() => issueInvoiceFromAppointment(ORG, { appointmentId: r.id }, "u_owner"));
      await retry(() => earnPointsFromPayment({ organizationId: ORG, customerId: r.customerId, paymentId: id, amountMad: r.price, appointmentId: r.id, userId: "u_owner" }));
    }
    await q(`UPDATE "PaymentTicketSequence" SET "lastValue"=$3,"updatedAt"=NOW() WHERE "organizationId"=$1 AND "dayKey"=$2`, [ORG, todayStr, n]);
    await q(`UPDATE "Invoice" i SET "issuedAt"=a."endAt","createdAt"=a."endAt","updatedAt"=a."endAt" FROM "Appointment" a WHERE a.id=i."appointmentId" AND i."organizationId"=$1 AND a."startAt"::date=$2::date`, [ORG, todayStr]);
    await q(`UPDATE "CommissionRecord" c SET "createdAt"=a."endAt","updatedAt"=a."endAt" FROM "Appointment" a WHERE a.id=c."appointmentId" AND c."organizationId"=$1 AND a."startAt"::date=$2::date`, [ORG, todayStr]);
    await q(`UPDATE "LoyaltyTransaction" t SET "createdAt"=p."paidAt" FROM "Payment" p WHERE p.id=t."paymentId" AND t."organizationId"=$1 AND p."paidAt"::date=$2::date`, [ORG, todayStr]);
    log(`${rows.length} rendez-vous du jour encaissés`);
    await report();
  } else if (MODE === "sync") {
    // Dernière étape seule (tâches WhatsApp + demandes d'avis), rejouable sans risque.
    const { ensureDefaultTemplates, syncWhatsAppTasks } = await import("../src/lib/db/whatsapp");
    const { syncReviewRequests } = await import("../src/lib/db/reviews");
    await retry(() => ensureDefaultTemplates(ORG));
    await retry(() => syncWhatsAppTasks(ORG));
    await retry(() => syncReviewRequests(ORG));
    await report();
  } else if (MODE === "report") { await report(); }
  else throw new Error("Usage : backup | run | resume | report");
  await pool.end();
  process.exit(0);
})().catch(async (e) => { console.error("ÉCHEC :", e); try { await pool.end(); } catch {} process.exit(1); });
