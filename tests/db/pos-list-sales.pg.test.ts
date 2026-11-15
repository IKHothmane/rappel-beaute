import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { Client, Pool } from "pg";
import { bindOrganization, runInScope } from "@/lib/db/tenant-context";
import { appPool, prepareRoles, rolesAdminUrl } from "./role-pools";

/**
 * listPosSales : deux requêtes quelle que soit la taille de la page (ventes puis lignes par
 * `invoiceId = ANY($1)`), mêmes sorties que le chemin historique par vente (getPosSaleById).
 * Les requêtes passent par le rôle rappel_app sous RLS : un institut ne voit que ses ventes.
 * Base locale jetable uniquement (adresse locale imposée par rolesAdminUrl).
 */
const h = vi.hoisted(() => ({ pool: null as unknown as Pool, calls: 0 }));
vi.mock("@/lib/db/pool", () => ({
  pool: new Proxy(
    {},
    {
      get: (_target, key) => {
        const value = (h.pool as unknown as Record<PropertyKey, unknown>)[key];
        if (key === "query") {
          return (...args: unknown[]) => {
            h.calls += 1;
            return (value as (...a: unknown[]) => unknown).apply(h.pool, args);
          };
        }
        return typeof value === "function" ? value.bind(h.pool) : value;
      },
    },
  ),
}));

import { getPosSaleById, listPosSales } from "@/lib/db/pos";

const adminUrl = rolesAdminUrl();
const A = "pos_ls_a";
const B = "pos_ls_b";

describe.skipIf(!adminUrl)("listPosSales sans requête par vente", () => {
  let admin: Client;
  let restoreEnv: () => void;

  const tenant = <T,>(org: string, fn: () => Promise<T>) =>
    runInScope({ kind: "tenant", organizationId: null }, async () => {
      bindOrganization(org);
      return fn();
    });

  async function cleanup() {
    await admin.query(`DELETE FROM "PosSale" WHERE "organizationId" IN ('${A}','${B}')`);
    await admin.query(`DELETE FROM "Invoice" WHERE "organizationId" IN ('${A}','${B}')`);
    await admin.query(`DELETE FROM "Product" WHERE "organizationId" IN ('${A}','${B}')`);
    await admin.query(`DELETE FROM "Organization" WHERE id IN ('${A}','${B}')`);
  }

  async function sale(org: string, n: number, minutesAgo: number, items: Array<{ name: string; product?: string; qty: number; price: number }>) {
    const invoice = `${org}_inv${n}`;
    const total = items.reduce((sum, i) => sum + i.qty * i.price, 0);
    await admin.query(
      `INSERT INTO "Invoice"(id,"organizationId",number,"orgNameSnapshot","customerNameSnapshot",subtotal,total,"updatedAt")
       VALUES ($1,$2,$3,'Org',$4,$5,$5,now())`,
      [invoice, org, `FAC-T-${org}-${n}`, `Cliente ${n}`, total],
    );
    for (const [index, item] of items.entries()) {
      await admin.query(
        `INSERT INTO "InvoiceItem"(id,"invoiceId","productId","nameSnapshot","unitPriceSnapshot",quantity,total,"sortOrder")
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [`${invoice}_it${index}`, invoice, item.product ?? null, item.name, item.price, item.qty, item.qty * item.price, index],
      );
    }
    await admin.query(
      `INSERT INTO "PosSale"(id,"organizationId","invoiceId",subtotal,total,"paymentMethod","idempotencyKey",notes,"createdAt","updatedAt")
       VALUES ($1,$2,$3,$4,$4,'CASH',$5,$6, now() - ($7 || ' minutes')::interval, now())`,
      [`${org}_sale${n}`, org, invoice, total, `${org}-key-${n}`, n === 2 ? "note" : null, String(minutesAgo)],
    );
  }

  beforeAll(async () => {
    admin = new Client({ connectionString: adminUrl });
    await admin.connect();
    restoreEnv = await prepareRoles(admin, adminUrl);
    await cleanup();
    await admin.query(
      `INSERT INTO "Organization"(id,name,slug,"updatedAt") VALUES ('${A}','A','${A}',now()),('${B}','B','${B}',now())`,
    );
    await admin.query(
      `INSERT INTO "Product"(id,"organizationId",name,sku,category,"updatedAt")
       VALUES ('${A}_p1','${A}','Shampoing','SKU-1','CONSOMMABLE',now()),('${A}_p2','${A}','Masque','SKU-2','CONSOMMABLE',now()),
              ('${B}_p1','${B}','Secret B','SKU-B','CONSOMMABLE',now())`,
    );
    await sale(A, 1, 50, [{ name: "Shampoing", product: `${A}_p1`, qty: 2, price: 30 }, { name: "Masque", product: `${A}_p2`, qty: 1, price: 45.5 }]);
    await sale(A, 2, 40, [{ name: "Ligne libre sans produit", qty: 1, price: 12 }]);
    await sale(A, 3, 30, []); // facture sans ligne
    await sale(A, 4, 20, [
      { name: "Z", product: `${A}_p2`, qty: 0.5, price: 10 },
      { name: "Y", product: `${A}_p1`, qty: 3, price: 7 },
      { name: "X", qty: 1, price: 1 },
    ]);
    await sale(A, 5, 10, [{ name: "Shampoing", product: `${A}_p1`, qty: 1, price: 30 }]);
    await sale(B, 1, 15, [{ name: "Secret B", product: `${B}_p1`, qty: 9, price: 99 }]);
    h.pool = appPool(adminUrl);
  });

  afterAll(async () => {
    await h.pool?.end().catch(() => null);
    await cleanup().catch(() => null);
    await admin?.end();
    restoreEnv?.();
  });

  it("renvoie exactement les sorties du chemin par vente, dans le même ordre (plus récentes d'abord)", async () => {
    await tenant(A, async () => {
      const listed = await listPosSales(A, { limit: 50 });
      expect(listed.map((s) => s.id)).toEqual([5, 4, 3, 2, 1].map((n) => `${A}_sale${n}`));

      const legacy = await Promise.all(listed.map((s) => getPosSaleById(A, s.id)));
      expect(listed).toEqual(legacy);

      const withLines = listed.find((s) => s.id === `${A}_sale1`)!;
      expect(withLines.lines).toEqual([
        { productId: `${A}_p1`, name: "Shampoing", sku: "SKU-1", unitPrice: 30, quantity: 2, lineTotal: 60, category: "CONSOMMABLE" },
        { productId: `${A}_p2`, name: "Masque", sku: "SKU-2", unitPrice: 45.5, quantity: 1, lineTotal: 45.5, category: "CONSOMMABLE" },
      ]);
      expect(listed.find((s) => s.id === `${A}_sale2`)!.lines[0]).toMatchObject({ productId: "", sku: "", category: null });
      expect(listed.find((s) => s.id === `${A}_sale3`)!.lines).toEqual([]);
      expect(listed.find((s) => s.id === `${A}_sale4`)!.lines.map((l) => l.name)).toEqual(["Z", "Y", "X"]);
    });
  });

  it("n'émet que deux requêtes pour plusieurs ventes (une seule si aucune vente)", async () => {
    await tenant(A, async () => {
      h.calls = 0;
      const listed = await listPosSales(A, { limit: 50 });
      expect(listed).toHaveLength(5);
      expect(h.calls).toBe(2);

      h.calls = 0;
      expect(await listPosSales(A, { search: "introuvable-xyz" })).toEqual([]);
      expect(h.calls).toBe(1);
    });
  });

  it("respecte les filtres et la limite comme avant", async () => {
    await tenant(A, async () => {
      const two = await listPosSales(A, { limit: 2 });
      expect(two.map((s) => s.id)).toEqual([`${A}_sale5`, `${A}_sale4`]);
      const byNumber = await listPosSales(A, { search: `FAC-T-${A}-2` });
      expect(byNumber.map((s) => s.id)).toEqual([`${A}_sale2`]);
      expect(byNumber[0].notes).toBe("note");
    });
  });

  it("isole les instituts : ni ventes ni lignes de l'autre institut, même en connaissant ses identifiants", async () => {
    await tenant(A, async () => {
      const listed = await listPosSales(A, { limit: 200 });
      expect(listed.every((s) => s.id.startsWith(A))).toBe(true);
      expect(JSON.stringify(listed)).not.toContain("Secret B");
      expect(await getPosSaleById(A, `${B}_sale1`)).toBeNull();
    });
    await tenant(B, async () => {
      const listed = await listPosSales(B);
      expect(listed.map((s) => s.id)).toEqual([`${B}_sale1`]);
      expect(listed[0].lines).toEqual([
        { productId: `${B}_p1`, name: "Secret B", sku: "SKU-B", unitPrice: 99, quantity: 9, lineTotal: 891, category: "CONSOMMABLE" },
      ]);
      // Une requête de lignes visant les factures de A ne renvoie rien sous le rôle de B.
      const { rows } = await h.pool.query(`SELECT id FROM "InvoiceItem" WHERE "invoiceId" = ANY($1::text[])`, [[`${A}_inv1`, `${A}_inv2`]]);
      expect(rows).toEqual([]);
    });
  });
});
