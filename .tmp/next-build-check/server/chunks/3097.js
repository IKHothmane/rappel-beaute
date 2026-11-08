"use strict";exports.id=3097,exports.ids=[3097],exports.modules={49303:(e,t,r)=>{e.exports=r(30517)},45304:(e,t,r)=>{r.a(e,async(e,i)=>{try{r.d(t,{Bl:()=>d,F1:()=>S,Ir:()=>y,Jh:()=>$,cb:()=>T,ex:()=>E,gk:()=>N,nM:()=>A,qF:()=>O,ry:()=>m,tr:()=>s,zp:()=>L});var a=r(84770),o=r(79549),n=r(64231),u=e([o]);function c(e){return`${e}_${(0,a.randomBytes)(8).toString("hex")}`}function p(e){let t=parseFloat(e.stock)||0,r=parseFloat(e.minStock)||0,i=parseFloat(e.purchasePrice)||0;return{id:e.id,name:e.name,sku:e.sku,category:e.category,brand:e.brand,unit:e.unit,purchasePrice:i,salePrice:null!=e.salePrice?parseFloat(e.salePrice):null,stock:t,minStock:r,maxStock:null!=e.maxStock?parseFloat(e.maxStock):null,supplierName:e.supplierName,consumable:e.consumable,sellable:e.sellable,active:e.active,stockValue:Math.round(t*i*100)/100,alert:(0,n.xw)(t,r,e.nearestExpiry),nearestExpiry:e.nearestExpiry?.toISOString()??null,serviceCount:parseInt(e.serviceCount,10)||0}}o=(u.then?(await u)():u)[0];let R=`
  SELECT
    p.id, p.name, p.sku, p.category::text AS category, p.brand, p.unit::text AS unit,
    p."purchasePrice"::text, p."salePrice"::text,
    p.stock::text, p."minStock"::text, p."maxStock"::text,
    p."supplierName", p.consumable, p.sellable, p.active, p.notes,
    p."createdAt", p."updatedAt",
    MIN(l."expiresAt") FILTER (WHERE l.quantity > 0) AS "nearestExpiry",
    COUNT(DISTINCT sp."serviceId")::text AS "serviceCount"
  FROM "Product" p
  LEFT JOIN "ProductLot" l ON l."productId" = p.id
  LEFT JOIN "ServiceProduct" sp ON sp."productId" = p.id
`;async function d(e){let{rows:t}=await o.pool.query(`SELECT
      COUNT(*)::text AS "productCount",
      COUNT(*) FILTER (WHERE active)::text AS "activeCount",
      COUNT(*) FILTER (WHERE active AND stock > 0 AND stock < "minStock")::text AS "lowStockCount",
      COUNT(*) FILTER (WHERE active AND stock <= 0)::text AS "outOfStockCount",
      COALESCE(SUM(stock * "purchasePrice") FILTER (WHERE active), 0)::text AS "totalStockValue",
      (
        SELECT COUNT(DISTINCT p2.id)::text FROM "Product" p2
        JOIN "ProductLot" l2 ON l2."productId" = p2.id
        WHERE p2."organizationId" = $1 AND p2."deletedAt" IS NULL AND p2.active
          AND l2.quantity > 0
          AND l2."expiresAt" IS NOT NULL
          AND l2."expiresAt" >= NOW()
          AND l2."expiresAt" <= NOW() + INTERVAL '30 days'
      ) AS "expiringSoonCount",
      (
        SELECT COUNT(DISTINCT p3.id)::text FROM "Product" p3
        JOIN "ProductLot" l3 ON l3."productId" = p3.id
        WHERE p3."organizationId" = $1 AND p3."deletedAt" IS NULL AND p3.active
          AND l3.quantity > 0
          AND l3."expiresAt" IS NOT NULL
          AND l3."expiresAt" < NOW()
      ) AS "expiredCount"
     FROM "Product"
     WHERE "organizationId" = $1 AND "deletedAt" IS NULL`,[e]),r=t[0];return{productCount:parseInt(r?.productCount??"0",10),activeCount:parseInt(r?.activeCount??"0",10),lowStockCount:parseInt(r?.lowStockCount??"0",10),outOfStockCount:parseInt(r?.outOfStockCount??"0",10),expiringSoonCount:parseInt(r?.expiringSoonCount??"0",10),expiredCount:parseInt(r?.expiredCount??"0",10),totalStockValue:Math.round(100*(parseFloat(r?.totalStockValue??"0")||0))/100}}async function s(e,t){let{page:r,limit:i,search:a,category:n,active:u,alert:c,supplier:s}=t,l=['p."organizationId" = $1','p."deletedAt" IS NULL'],I=[e],E=2;a&&(l.push(`(p.name ILIKE $${E} OR p.sku ILIKE $${E} OR COALESCE(p.brand, '') ILIKE $${E} OR COALESCE(p."supplierName", '') ILIKE $${E})`),I.push(`%${a}%`),E++),n&&(l.push(`p.category = $${E}::"ProductCategory"`),I.push(n),E++),null!=u&&(l.push(`p.active = $${E}`),I.push(u),E++),s&&(l.push(`p."supplierName" ILIKE $${E}`),I.push(`%${s}%`),E++);let N=l.join(" AND "),S=await d(e),m="";"LOW"===c?m='HAVING p.stock > 0 AND p.stock < p."minStock"':"OUT"===c?m="HAVING p.stock <= 0":"EXPIRING"===c?m=`HAVING MIN(l."expiresAt") FILTER (WHERE l.quantity > 0) IS NOT NULL
      AND MIN(l."expiresAt") FILTER (WHERE l.quantity > 0) >= NOW()
      AND MIN(l."expiresAt") FILTER (WHERE l.quantity > 0) <= NOW() + INTERVAL '30 days'`:"EXPIRED"===c&&(m=`HAVING MIN(l."expiresAt") FILTER (WHERE l.quantity > 0) IS NOT NULL
      AND MIN(l."expiresAt") FILTER (WHERE l.quantity > 0) < NOW()`);let A=await o.pool.query(`SELECT COUNT(*)::int AS total FROM (
      SELECT p.id
      FROM "Product" p
      LEFT JOIN "ProductLot" l ON l."productId" = p.id
      WHERE ${N}
      GROUP BY p.id
      ${m}
    ) sub`,I),y=`
    ${R}
    WHERE ${N}
    GROUP BY p.id
    ${m}
    ORDER BY p.active DESC, p.name
    LIMIT $${E} OFFSET $${E+1}
  `;return{items:(await o.pool.query(y,[...I,i,(r-1)*i])).rows.map(p),total:A.rows[0]?.total??0,kpis:S}}async function l(e){let{rows:t}=await o.pool.query(`SELECT id, "lotNumber", quantity::text, "expiresAt", "receivedAt", notes
     FROM "ProductLot" WHERE "productId" = $1
     ORDER BY "expiresAt" NULLS LAST, "receivedAt" DESC`,[e]);return t.map(e=>({id:e.id,lotNumber:e.lotNumber,quantity:parseFloat(e.quantity)||0,expiresAt:e.expiresAt?.toISOString()??null,receivedAt:e.receivedAt.toISOString(),notes:e.notes}))}function I(e){return{id:e.id,productId:e.productId,productName:e.productName,productSku:e.productSku,type:e.type,quantity:parseFloat(e.quantity)||0,unit:e.unit,reason:e.reason,referenceType:e.referenceType,referenceId:e.referenceId,userId:e.userId,userName:e.userFirst||e.userLast?`${e.userFirst??""} ${e.userLast??""}`.trim():null,createdAt:e.createdAt.toISOString()}}async function E(e,t){let r=['im."organizationId" = $1'],i=[e],a=2;t.productId&&(r.push(`im."productId" = $${a}`),i.push(t.productId),a++),t.type&&(r.push(`im.type = $${a}::"MovementType"`),i.push(t.type),a++),t.search&&(r.push(`(p.name ILIKE $${a} OR p.sku ILIKE $${a} OR COALESCE(im.reason, '') ILIKE $${a})`),i.push(`%${t.search}%`),a++);let n=r.join(" AND "),u=(t.page-1)*t.limit,[c,p]=await Promise.all([o.pool.query(`SELECT COUNT(*)::int AS total
       FROM "InventoryMovement" im
       JOIN "Product" p ON p.id = im."productId"
       WHERE ${n}`,i),o.pool.query(`SELECT
        im.id, im."productId", p.name AS "productName", p.sku AS "productSku",
        im.type::text, im.quantity::text, im.unit::text AS unit, im.reason,
        im."referenceType"::text, im."referenceId", im."userId",
        u."firstName" AS "userFirst", u."lastName" AS "userLast",
        im."createdAt"
       FROM "InventoryMovement" im
       JOIN "Product" p ON p.id = im."productId"
       LEFT JOIN "User" u ON u.id = im."userId"
       WHERE ${n}
       ORDER BY im."createdAt" DESC
       LIMIT $${a} OFFSET $${a+1}`,[...i,t.limit,u])]);return{items:p.rows.map(e=>I(e)),total:c.rows[0]?.total??0}}async function N(e,t){let{rows:r}=await o.pool.query(`${R}
     WHERE p.id = $1 AND p."organizationId" = $2 AND p."deletedAt" IS NULL
     GROUP BY p.id`,[t,e]);if(!r[0])return null;let[i,a,n,u]=await Promise.all([l(t),o.pool.query(`SELECT s.id AS "serviceId", s.name AS "serviceName", sp.quantity::text, sp.unit
       FROM "ServiceProduct" sp
       JOIN "Service" s ON s.id = sp."serviceId"
       WHERE sp."productId" = $1
       ORDER BY s.name`,[t]),E(e,{page:1,limit:20,productId:t}),o.pool.query(`SELECT ps."supplierId", s.name AS "supplierName", ps."purchasePrice"::text, ps.preferred
       FROM "ProductSupplier" ps
       JOIN "Supplier" s ON s.id = ps."supplierId"
       WHERE ps."productId" = $1 AND s."deletedAt" IS NULL
       ORDER BY ps.preferred DESC, ps."purchasePrice" ASC`,[t])]);return{...p(r[0]),notes:r[0].notes,lots:i,services:a.rows.map(e=>({serviceId:e.serviceId,serviceName:e.serviceName,quantity:parseFloat(e.quantity)||0,unit:e.unit})),suppliers:u.rows.map(e=>({supplierId:e.supplierId,supplierName:e.supplierName,purchasePrice:parseFloat(e.purchasePrice)||0,preferred:e.preferred})),recentMovements:n.items,createdAt:r[0].createdAt.toISOString(),updatedAt:r[0].updatedAt.toISOString()}}async function S(e,t,i,a){let u=!a,p=a??await o.pool.connect();try{if(u&&await p.query("BEGIN"),t.idempotencyKey){let r=await p.query(`SELECT id FROM "InventoryMovement"
         WHERE "organizationId" = $1 AND "idempotencyKey" = $2`,[e,t.idempotencyKey]);if(r.rows[0]){u&&await p.query("COMMIT");let i=(await E(e,{page:1,limit:1,productId:t.productId})).items.find(e=>e.id===r.rows[0].id);if(i)return{movement:i,created:!1};let{rows:a}=await p.query(`SELECT
            im.id, im."productId", p.name AS "productName", p.sku AS "productSku",
            im.type::text, im.quantity::text, im.unit::text AS unit, im.reason,
            im."referenceType"::text, im."referenceId", im."userId",
            u."firstName" AS "userFirst", u."lastName" AS "userLast",
            im."createdAt"
           FROM "InventoryMovement" im
           JOIN "Product" p ON p.id = im."productId"
           LEFT JOIN "User" u ON u.id = im."userId"
           WHERE im.id = $1`,[r.rows[0].id]);return{movement:I(a[0]),created:!1}}}let a=await p.query(`SELECT id, unit, name, sku, stock::text FROM "Product"
       WHERE id = $1 AND "organizationId" = $2 AND "deletedAt" IS NULL
       FOR UPDATE`,[t.productId,e]);if(!a.rows[0])throw Error("PRODUCT_NOT_FOUND");let o=(0,n.jU)(t.type,t.quantity),d=parseFloat(a.rows[0].stock)||0;if("SERVICE_CONSUMPTION"!==t.type&&o<0&&d+o<-.0001)throw Error("INSUFFICIENT_STOCK");let s=c("mov");await p.query(`INSERT INTO "InventoryMovement" (
        id, "organizationId", "productId", type, quantity, unit, reason,
        "referenceType", "referenceId", "userId", "idempotencyKey"
      ) VALUES (
        $1,$2,$3,$4::"MovementType",$5,$6::"ProductUnit",$7,
        $8::"InventoryReferenceType",$9,$10,$11
      )`,[s,e,t.productId,t.type,o,a.rows[0].unit,t.reason??null,t.referenceType??null,t.referenceId??null,i??null,t.idempotencyKey??null]),await p.query(`UPDATE "Product"
       SET stock = stock + $1, "updatedAt" = NOW()
       WHERE id = $2`,[o,t.productId]),u&&await p.query("COMMIT");try{let{checkStockAndNotify:i}=await r.e(188).then(r.bind(r,45329));await i(e,t.productId)}catch(e){console.error("[createInventoryMovement] notification",e)}return{movement:{id:s,productId:t.productId,productName:a.rows[0].name,productSku:a.rows[0].sku,type:t.type,quantity:o,unit:a.rows[0].unit,reason:t.reason??null,referenceType:t.referenceType??null,referenceId:t.referenceId??null,userId:i??null,userName:null,createdAt:new Date().toISOString()},created:!0}}catch(r){if(u&&await p.query("ROLLBACK"),t.idempotencyKey&&"object"==typeof r&&null!==r&&"code"in r&&"23505"===r.code){let r=(await E(e,{page:1,limit:5,productId:t.productId})).items.find(e=>e.referenceId===t.referenceId&&e.type===t.type);if(r)return{movement:r,created:!1}}throw r}finally{u&&p.release()}}async function m(e,t,r){let i=c("prd"),a=await o.pool.connect();try{await a.query("BEGIN"),await a.query(`INSERT INTO "Product" (
        id, "organizationId", name, sku, category, brand, unit,
        "purchasePrice", "salePrice", stock, "minStock", "maxStock",
        "supplierName", consumable, sellable, active, notes, "updatedAt"
      ) VALUES (
        $1,$2,$3,$4,$5::"ProductCategory",$6,$7::"ProductUnit",
        $8,$9,0,$10,$11,$12,$13,$14,$15,$16,NOW()
      )`,[i,e,t.name,t.sku,t.category??"CONSOMMABLE",t.brand??null,t.unit??"UNIT",t.purchasePrice??0,t.salePrice??null,t.minStock??0,t.maxStock??null,t.supplierName??null,!1!==t.consumable,!1!==t.sellable,!1!==t.active,t.notes??null]),t.initialStock&&t.initialStock>0&&await S(e,{productId:i,type:"PURCHASE",quantity:t.initialStock,reason:"Stock initial",referenceType:"MANUAL"},r,a),await a.query("COMMIT")}catch(e){throw await a.query("ROLLBACK"),e}finally{a.release()}let n=await N(e,i);if(!n)throw Error("Product introuvable apr\xe8s cr\xe9ation.");return n}async function A(e,t,r,i){let a=await N(e,t);if(!a)throw Error("NOT_FOUND");let n=void 0!==r.purchasePrice&&r.purchasePrice!==a.purchasePrice||void 0!==r.salePrice&&r.salePrice!==a.salePrice,u=[],p=[],d=1,s=(e,t,r)=>{u.push(r?`"${e}" = $${d}${r}`:`"${e}" = $${d}`),p.push(t),d++};void 0!==r.name&&s("name",r.name),void 0!==r.sku&&s("sku",r.sku),void 0!==r.category&&s("category",r.category,'::"ProductCategory"'),void 0!==r.brand&&s("brand",r.brand??null),void 0!==r.unit&&s("unit",r.unit,'::"ProductUnit"'),void 0!==r.purchasePrice&&s("purchasePrice",r.purchasePrice),void 0!==r.salePrice&&s("salePrice",r.salePrice??null),void 0!==r.minStock&&s("minStock",r.minStock),void 0!==r.maxStock&&s("maxStock",r.maxStock??null),void 0!==r.supplierName&&s("supplierName",r.supplierName??null),void 0!==r.consumable&&s("consumable",r.consumable),void 0!==r.sellable&&s("sellable",r.sellable),void 0!==r.active&&s("active",r.active),void 0!==r.notes&&s("notes",r.notes??null),u.length&&(u.push('"updatedAt" = NOW()'),p.push(t,e),await o.pool.query(`UPDATE "Product" SET ${u.join(", ")}
       WHERE id = $${d} AND "organizationId" = $${d+1} AND "deletedAt" IS NULL`,p)),n&&await o.pool.query(`INSERT INTO "ProductPriceHistory" (
        id, "productId", "oldPurchasePrice", "newPurchasePrice",
        "oldSalePrice", "newSalePrice", "userId"
      ) VALUES ($1,$2,$3,$4,$5,$6,$7)`,[c("pph"),t,a.purchasePrice,r.purchasePrice??a.purchasePrice,a.salePrice,void 0!==r.salePrice?r.salePrice??null:a.salePrice,i??null]);let l=await N(e,t);if(!l)throw Error("NOT_FOUND");return l}async function y(e,t){let r=await N(e,t);if(!r)throw Error("NOT_FOUND");let{rowCount:i}=await o.pool.query(`UPDATE "Product"
     SET "deletedAt" = NOW(), active = false, "updatedAt" = NOW()
     WHERE id = $1 AND "organizationId" = $2 AND "deletedAt" IS NULL`,[t,e]);if(!i)throw Error("NOT_FOUND");return{name:r.name}}async function O(e,t,r){if(!(await o.pool.query('SELECT id FROM "Product" WHERE id = $1 AND "organizationId" = $2 AND "deletedAt" IS NULL',[t,e])).rows[0])throw Error("NOT_FOUND");let i=c("lot");await o.pool.query(`INSERT INTO "ProductLot" (id, "productId", "lotNumber", quantity, "expiresAt", notes, "updatedAt")
     VALUES ($1,$2,$3,$4,$5,$6,NOW())`,[i,t,r.lotNumber,r.quantity,r.expiresAt?new Date(r.expiresAt):null,r.notes??null]);let a=(await l(t)).find(e=>e.id===i);if(!a)throw Error("Lot introuvable.");return a}async function T(e,t,r){let i=0,a=await o.pool.connect();try{for(let o of(await a.query("BEGIN"),t)){let{rows:t}=await a.query(`SELECT stock::text FROM "Product"
         WHERE id = $1 AND "organizationId" = $2 AND "deletedAt" IS NULL
         FOR UPDATE`,[o.productId,e]);if(!t[0])continue;let n=parseFloat(t[0].stock)||0,u=Math.round((o.countedQuantity-n)*1e3)/1e3;0!==u&&(await S(e,{productId:o.productId,type:u>0?"ADJUSTMENT_IN":"ADJUSTMENT_OUT",quantity:Math.abs(u),reason:`Inventaire physique (th\xe9orique ${n} → r\xe9el ${o.countedQuantity})`,referenceType:"INVENTORY",idempotencyKey:`inv:${new Date().toISOString().slice(0,10)}:${o.productId}:${n}:${o.countedQuantity}`},r,a),i++)}await a.query("COMMIT")}catch(e){throw await a.query("ROLLBACK"),e}finally{a.release()}return{adjustments:i}}async function $(e){let{organizationId:t,appointmentId:r,userId:i}=e,a=new Map;for(let t of e.products){let e=Math.round(Number(t.quantity));t.productId&&e>0&&a.set(t.productId,(a.get(t.productId)??0)+e)}if(0===a.size)return{created:0,skipped:0};let n=Array.from(a.keys()),{rows:u}=await o.pool.query(`SELECT id, name FROM "Product"
     WHERE "organizationId" = $1 AND id = ANY($2::text[]) AND "deletedAt" IS NULL`,[t,n]),c=new Map(u.map(e=>[e.id,e.name])),p=0,d=0;for(let[e,o]of a){let a=c.get(e);a&&((await S(t,{productId:e,type:"SERVICE_CONSUMPTION",quantity:o,reason:`Consommation RDV — ${a}`,referenceType:"APPOINTMENT",referenceId:r,idempotencyKey:`apt:${r}:product:${e}`},i)).created?p++:d++)}return{created:p,skipped:d}}function L(e){return"object"==typeof e&&null!==e&&"code"in e&&"23505"===e.code}i()}catch(e){i(e)}})},64231:(e,t,r)=>{r.d(t,{B7:()=>n,Sz:()=>a,Zy:()=>o,_3:()=>i,jU:()=>c,xw:()=>u});let i={PROFESSIONNEL:"Professionnel",VENTE:"Vente",CONSOMMABLE:"Consommable",MATERIEL:"Mat\xe9riel",ACCESSOIRE:"Accessoire",JETABLE:"Jetable"},a={UNIT:"Unit\xe9",ML:"ml",L:"L",G:"g",KG:"kg",BOX:"Bo\xeete",PACK:"Pack",PIECE:"Pi\xe8ce"},o=["PROFESSIONNEL","VENTE","CONSOMMABLE","MATERIEL","ACCESSOIRE","JETABLE"],n=["UNIT","ML","L","G","KG","BOX","PACK","PIECE"];function u(e,t,r,i=new Date){if(e<=0)return"OUT";if(r){let e=(r.getTime()-i.getTime())/864e5;if(e<0)return"EXPIRED";if(e<=30)return"EXPIRING"}return e<t?"LOW":"OK"}function c(e,t){let r=Math.abs(t);switch(e){case"PURCHASE":case"RETURN":case"ADJUSTMENT_IN":case"TRANSFER_IN":return r;case"SERVICE_CONSUMPTION":case"SALE":case"LOSS":case"DAMAGE":case"EXPIRATION":case"ADJUSTMENT_OUT":case"TRANSFER_OUT":return-r}}}};