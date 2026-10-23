import { pool } from "@/lib/db/pool";
import { getStockKpis, listProducts } from "@/lib/db/inventory";
import { listStaff, syncStaffLeaveStatuses } from "@/lib/db/staff";
import { PRODUCT_CATEGORY_LABEL, PRODUCT_UNIT_LABEL } from "@/types/inventory";
import type { ProductCategory } from "@/types/inventory";
import type { StaffListItem } from "@/types/staff";

export type Salon3dChair = {
  id: string;
  name: string;
  status: "occupied" | "free";
  client: string | null;
  treatment: string | null;
  staff: string | null;
  staffId: string | null;
  time: string | null;
  price: string | null;
  appointmentId: string | null;
};

export type Salon3dStaff = {
  id: string;
  name: string;
  firstName: string;
  role: string;
  status: "busy" | "available" | "reception" | "stock" | "away";
  location: string;
  color: string;
};

export type Salon3dWaiting = {
  id: string;
  name: string;
  arrivalTime: string;
  apptTime: string;
  treatment: string;
  status: string;
};

export type Salon3dWaitingRoom = {
  id: string;
  name: string;
  capacity: number;
};

export type Salon3dStockItem = {
  id: string;
  name: string;
  qty: number;
  min: number;
  status: "out" | "low" | "ok";
  unit: string;
  category: string;
  categoryLabel: string;
  sku: string | null;
  brand: string | null;
};

export type Salon3dSnapshot = {
  organizationName: string;
  refreshedAt: string;
  chairs: Salon3dChair[];
  staff: Salon3dStaff[];
  waiting: Salon3dWaiting[];
  waitingRooms: Salon3dWaitingRoom[];
  stock: Salon3dStockItem[];
  stockPercent: number;
  stats: {
    revenueToday: number;
    occupationPercent: number;
    careDone: number;
    satisfaction: number | null;
  };
};

function isWaitingRoomResource(name: string, type: string) {
  return type === "SALLE" && /attente/i.test(name);
}

const STAFF_COLORS = ["#C9A84C", "#C49292", "#6B8CAE", "#4F7A57", "#B07A7A", "#8F6A8F"];

function dayBounds(now = new Date()) {
  const from = new Date(now);
  from.setHours(0, 0, 0, 0);
  const to = new Date(now);
  to.setHours(23, 59, 59, 999);
  return { from, to, now };
}

function hhmm(iso: Date) {
  return iso.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

function money(amount: number) {
  return `${amount.toLocaleString("fr-MA")} DH`;
}

function overlaps(now: Date, start: Date, end: Date) {
  return start.getTime() <= now.getTime() && end.getTime() > now.getTime();
}

export async function getSalon3dSnapshot(organizationId: string): Promise<Salon3dSnapshot> {
  const { from, to, now } = dayBounds();

  const org = await pool.query<{ name: string }>(
    `SELECT name FROM "Organization" WHERE id = $1 LIMIT 1`,
    [organizationId],
  );

  const resources = await pool.query<{ id: string; name: string; type: string; capacity: number }>(
    `SELECT id, name, type::text AS type, capacity
     FROM "Resource"
     WHERE "organizationId" = $1 AND active = true AND "deletedAt" IS NULL
       AND type IN ('CABINE', 'FAUTEUIL', 'TABLE', 'SALLE')
     ORDER BY
       CASE type::text
         WHEN 'CABINE' THEN 0
         WHEN 'FAUTEUIL' THEN 1
         WHEN 'TABLE' THEN 2
         ELSE 3
       END,
       name ASC
     LIMIT 24`,
    [organizationId],
  );

  const waitingRooms: Salon3dWaitingRoom[] = resources.rows
    .filter((r) => isWaitingRoomResource(r.name, r.type))
    .map((r) => ({
      id: r.id,
      name: r.name,
      capacity: Math.max(1, r.capacity || 1),
    }));

  const careResources = resources.rows.filter((r) => !isWaitingRoomResource(r.name, r.type));

  const appointments = await pool.query<{
    id: string;
    customerName: string;
    serviceName: string;
    staffId: string | null;
    staffName: string | null;
    resourceId: string | null;
    startAt: Date;
    endAt: Date;
    price: string;
    status: string;
  }>(
    `SELECT
       a.id,
       TRIM(BOTH FROM CONCAT(COALESCE(c."firstName", ''), ' ', COALESCE(c."lastName", ''))) AS "customerName",
       COALESCE(s.name, a."serviceNameSnapshot", 'Soin') AS "serviceName",
       a."staffId",
       CASE WHEN a."staffId" IS NULL THEN NULL
            ELSE TRIM(BOTH FROM CONCAT(COALESCE(st."firstName", ''), ' ', COALESCE(st."lastName", ''))) END AS "staffName",
       a."resourceId",
       a."startAt",
       a."endAt",
       a.price::text,
       a.status::text AS status
     FROM "Appointment" a
     JOIN "Customer" c ON c.id = a."customerId"
     LEFT JOIN "Service" s ON s.id = a."serviceId"
     LEFT JOIN "Staff" st ON st.id = a."staffId"
     WHERE a."organizationId" = $1
       AND a."startAt" < $3
       AND a."endAt" > $2
       AND a.status IN ('PENDING', 'CONFIRMED', 'ARRIVED', 'IN_PROGRESS')
     ORDER BY a."startAt" ASC`,
    [organizationId, from, to],
  );

  const liveStatuses = new Set(["ARRIVED", "IN_PROGRESS"]);
  const bookedStatuses = new Set(["PENDING", "CONFIRMED", "ARRIVED", "IN_PROGRESS"]);

  function currentForResource(resourceId: string) {
    const linked = appointments.rows.filter((a) => a.resourceId === resourceId && bookedStatuses.has(a.status));
    const ongoing = linked.find((a) => overlaps(now, a.startAt, a.endAt) || liveStatuses.has(a.status));
    if (ongoing) return ongoing;
    return linked.find((a) => a.startAt.getTime() >= now.getTime()) ?? null;
  }

  const chairs: Salon3dChair[] = careResources.map((resource) => {
    const appt = currentForResource(resource.id);
    const occupied = Boolean(
      appt && (liveStatuses.has(appt.status) || overlaps(now, appt.startAt, appt.endAt)),
    );
    return {
      id: resource.id,
      name: resource.name,
      status: occupied ? "occupied" : "free",
      client: occupied && appt ? appt.customerName.trim() || null : null,
      treatment: occupied && appt ? appt.serviceName : null,
      staff: occupied && appt ? (appt.staffName?.trim() || null) : null,
      staffId: occupied && appt ? appt.staffId : null,
      time:
        occupied && appt
          ? `${hhmm(appt.startAt)} - ${hhmm(appt.endAt)}`
          : null,
      price: occupied && appt ? money(Number(appt.price)) : null,
      appointmentId: occupied && appt ? appt.id : null,
    };
  });

  const occupiedResourceIds = new Set(
    chairs.filter((c) => c.status === "occupied").map((c) => c.id),
  );
  const busyStaffIds = new Set(
    chairs.filter((c) => c.status === "occupied" && c.staffId).map((c) => c.staffId as string),
  );

  const waiting = appointments.rows
    .filter((a) => {
      if (a.status === "ARRIVED") {
        return !a.resourceId || !occupiedResourceIds.has(a.resourceId) || !overlaps(now, a.startAt, a.endAt);
      }
      if (a.status === "PENDING" || a.status === "CONFIRMED") {
        const inTwoHours = a.startAt.getTime() - now.getTime() <= 2 * 60 * 60 * 1000;
        const soon = a.startAt.getTime() >= now.getTime() - 15 * 60 * 1000;
        return inTwoHours && soon && !overlaps(now, a.startAt, a.endAt);
      }
      return false;
    })
    .slice(0, 16)
    .map((a) => ({
      id: a.id,
      name: a.customerName,
      arrivalTime: a.status === "ARRIVED" ? hhmm(now) : "—",
      apptTime: hhmm(a.startAt),
      treatment: a.serviceName,
      status: a.status === "ARRIVED" ? "Arrivée" : "En attente",
    }));

  // Remet ACTIVE si le congé est terminé, puis charge l'équipe
  await syncStaffLeaveStatuses(organizationId);

  const staffResult = await listStaff(organizationId, {
    page: 1,
    limit: 50,
  });
  const staffItems = (staffResult.items as StaffListItem[]).filter(
    (member) => member.status === "ACTIVE" || member.status === "ON_LEAVE",
  );

  // Congés réellement en cours (dates), pas seulement le flag Staff.status
  const activeLeaves = await pool.query<{ staffId: string }>(
    `SELECT DISTINCT l."staffId"
     FROM "StaffLeave" l
     JOIN "Staff" st ON st.id = l."staffId"
     WHERE st."organizationId" = $1
       AND st."deletedAt" IS NULL
       AND l.status = 'APPROVED'
       AND l."startAt" <= $2
       AND l."endAt" >= $2`,
    [organizationId, now],
  );
  const onLeaveIds = new Set(activeLeaves.rows.map((r) => r.staffId));

  const staff: Salon3dStaff[] = staffItems.map((member, index) => {
    const fullName = (member.displayName || `${member.firstName} ${member.lastName}`.trim()).replace(/\s+/g, " ").trim();
    const onLeave = onLeaveIds.has(member.id);
    const busy = !onLeave && busyStaffIds.has(member.id);
    const chair = chairs.find((c) => c.staffId === member.id);
    const role = member.position?.trim() || "Équipe";
    const lower = role.toLowerCase();
    let status: Salon3dStaff["status"] = busy ? "busy" : "available";
    let location = busy && chair ? chair.name : "Disponible";
    if (onLeave) {
      status = "away";
      location = "En congé";
    } else if (!busy && (lower.includes("accueil") || lower.includes("réception") || lower.includes("reception"))) {
      status = "reception";
      location = "Comptoir Accueil";
    } else if (!busy && (lower.includes("stock") || lower.includes("magasin"))) {
      status = "stock";
      location = "Réserve & Stock";
    }
    return {
      id: member.id,
      name: fullName || member.firstName || "Employée",
      firstName: member.firstName || fullName || "Employée",
      role,
      status,
      location,
      color: STAFF_COLORS[index % STAFF_COLORS.length],
    };
  });

  const kpis = await getStockKpis(organizationId);
  const { items: allProducts } = await listProducts(organizationId, {
    page: 1,
    limit: 48,
    active: true,
  });
  const stockItems = [...allProducts].sort((a, b) => {
    const rank = (p: (typeof allProducts)[number]) => {
      if (p.stock <= 0) return 0;
      if (p.stock < p.minStock) return 1;
      return 2;
    };
    const d = rank(a) - rank(b);
    if (d !== 0) return d;
    return a.name.localeCompare(b.name, "fr");
  });

  const stock: Salon3dStockItem[] = stockItems.map((product) => {
    const qty = Number(product.stock) || 0;
    const min = Number(product.minStock) || 0;
    const category = product.category as ProductCategory;
    return {
      id: product.id,
      name: product.name,
      qty,
      min,
      status: qty <= 0 ? "out" : qty < min ? "low" : "ok",
      unit: PRODUCT_UNIT_LABEL[product.unit] || product.unit || "u.",
      category,
      categoryLabel: PRODUCT_CATEGORY_LABEL[category] || category,
      sku: product.sku || null,
      brand: product.brand || null,
    };
  });

  const stockPercent =
    kpis.activeCount > 0
      ? Math.max(
          0,
          Math.min(
            100,
            Math.round(
              ((kpis.activeCount - kpis.lowStockCount - kpis.outOfStockCount) / kpis.activeCount) * 100,
            ),
          ),
        )
      : 100;

  const revenue = await pool.query<{ total: string }>(
    `SELECT COALESCE(SUM(CASE WHEN kind = 'REFUND' THEN -amount ELSE amount END), 0)::text AS total
     FROM "Payment"
     WHERE "organizationId" = $1
       AND status = 'COMPLETED'
       AND "paidAt" >= $2
       AND "paidAt" <= $3`,
    [organizationId, from, to],
  );

  const careDone = await pool.query<{ count: string }>(
    `SELECT COUNT(*)::text AS count
     FROM "Appointment"
     WHERE "organizationId" = $1
       AND status = 'COMPLETED'
       AND "startAt" >= $2
       AND "startAt" <= $3`,
    [organizationId, from, to],
  );

  const occupiedCount = chairs.filter((c) => c.status === "occupied").length;
  const occupationPercent =
    chairs.length > 0 ? Math.round((occupiedCount / chairs.length) * 100) : 0;

  return {
    organizationName: org.rows[0]?.name ?? "Institut",
    refreshedAt: now.toISOString(),
    chairs,
    staff,
    waiting,
    waitingRooms,
    stock,
    stockPercent,
    stats: {
      revenueToday: Math.round((Number(revenue.rows[0]?.total ?? 0) || 0) * 100) / 100,
      occupationPercent,
      careDone: parseInt(careDone.rows[0]?.count ?? "0", 10),
      satisfaction: null,
    },
  };
}
