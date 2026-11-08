"use strict";exports.id=7374,exports.ids=[7374],exports.modules={57266:(e,t,r)=>{r.a(e,async(e,i)=>{try{r.d(t,{CD:()=>f,Ei:()=>O,Gp:()=>A,MS:()=>P,MW:()=>D,QU:()=>w,S6:()=>N,cu:()=>I,e1:()=>S,jm:()=>m,u2:()=>c,xO:()=>R});var u=r(84770),a=r(8678),n=r(45304),d=e([a,n]);[a,n]=d.then?(await d)():d;let v=new a.Pool({connectionString:process.env.DATABASE_URL});function s(e){return`${e}_${(0,u.randomBytes)(8).toString("hex")}`}function o(e){return"object"==typeof e&&null!==e&&"code"in e&&"23505"===e.code}async function p(e){let{rows:t}=await v.query(`SELECT
      (SELECT COUNT(*)::text FROM "Supplier"
        WHERE "organizationId" = $1 AND "deletedAt" IS NULL) AS "supplierCount",
      (SELECT COUNT(*)::text FROM "Supplier"
        WHERE "organizationId" = $1 AND "deletedAt" IS NULL AND active = true) AS "activeCount",
      (SELECT COUNT(*)::text FROM "Purchase"
        WHERE "organizationId" = $1
          AND status IN ('ORDERED','PARTIALLY_RECEIVED')) AS "openOrdersCount",
      (SELECT COALESCE(SUM(pi."quantityOrdered" * pi."unitPrice"), 0)::text
        FROM "PurchaseItem" pi
        JOIN "Purchase" pu ON pu.id = pi."purchaseId"
        WHERE pu."organizationId" = $1
          AND pu.status <> 'CANCELLED'
          AND pu."createdAt" >= date_trunc('month', NOW())) AS "monthPurchasesTotal"`,[e]),r=t[0];return{supplierCount:parseInt(r.supplierCount,10)||0,activeCount:parseInt(r.activeCount,10)||0,openOrdersCount:parseInt(r.openOrdersCount,10)||0,monthPurchasesTotal:Math.round(100*parseFloat(r.monthPurchasesTotal))/100||0}}async function c(e,t){let r=['s."organizationId" = $1','s."deletedAt" IS NULL'],i=[e],u=2;(!0===t.active||!1===t.active)&&(r.push(`s.active = $${u}`),i.push(t.active),u++),t.search&&(r.push(`(s.name ILIKE $${u} OR COALESCE(s.phone,'') ILIKE $${u} OR COALESCE(s.email,'') ILIKE $${u} OR COALESCE(s."contactName",'') ILIKE $${u})`),i.push(`%${t.search}%`),u++);let a=r.join(" AND "),n=(t.page-1)*t.limit,[d,s,o]=await Promise.all([v.query(`SELECT COUNT(*)::int AS total FROM "Supplier" s WHERE ${a}`,i),v.query(`SELECT
        s.id, s.name, s.phone, s.email, s."contactName", s.active,
        COUNT(DISTINCT ps.id)::int AS "productCount",
        COUNT(DISTINCT pu.id)::int AS "purchaseCount",
        COALESCE(SUM(DISTINCT CASE WHEN pu.status <> 'CANCELLED'
          THEN (SELECT SUM(pi."quantityOrdered" * pi."unitPrice") FROM "PurchaseItem" pi WHERE pi."purchaseId" = pu.id)
          ELSE 0 END), 0)::text AS "totalPurchased"
       FROM "Supplier" s
       LEFT JOIN "ProductSupplier" ps ON ps."supplierId" = s.id
       LEFT JOIN "Purchase" pu ON pu."supplierId" = s.id
       WHERE ${a}
       GROUP BY s.id
       ORDER BY s.name
       LIMIT $${u} OFFSET $${u+1}`,[...i,t.limit,n]),p(e)]);return{items:await Promise.all(s.rows.map(async e=>{let t=await v.query(`SELECT COALESCE(SUM(pi."quantityOrdered" * pi."unitPrice"), 0)::text AS t
         FROM "Purchase" pu
         JOIN "PurchaseItem" pi ON pi."purchaseId" = pu.id
         WHERE pu."supplierId" = $1 AND pu.status <> 'CANCELLED'`,[e.id]);return{id:e.id,name:e.name,phone:e.phone??null,email:e.email??null,contactName:e.contactName??null,active:!!e.active,productCount:Number(e.productCount)||0,purchaseCount:Number(e.purchaseCount)||0,totalPurchased:Math.round(100*parseFloat(t.rows[0]?.t??"0"))/100}})),total:d.rows[0]?.total??0,kpis:o}}async function l(e){let{rows:t}=await v.query(`SELECT
      ps.id, ps."productId", p.name AS "productName", p.sku AS "productSku",
      p.unit::text AS unit, ps."supplierId", s.name AS "supplierName",
      ps."supplierSku", ps."purchasePrice"::text, ps."minimumOrderQuantity"::text,
      ps."leadTimeDays", ps.preferred
     FROM "ProductSupplier" ps
     JOIN "Product" p ON p.id = ps."productId"
     JOIN "Supplier" s ON s.id = ps."supplierId"
     WHERE ps."supplierId" = $1 AND p."deletedAt" IS NULL
     ORDER BY ps.preferred DESC, p.name`,[e]);return t.map(E)}function E(e){return{id:String(e.id),productId:String(e.productId),productName:String(e.productName),productSku:String(e.productSku),unit:String(e.unit),supplierId:String(e.supplierId),supplierName:String(e.supplierName),supplierSku:e.supplierSku??null,purchasePrice:parseFloat(String(e.purchasePrice))||0,minimumOrderQuantity:null!=e.minimumOrderQuantity?parseFloat(String(e.minimumOrderQuantity)):null,leadTimeDays:null!=e.leadTimeDays?Number(e.leadTimeDays):null,preferred:!!e.preferred}}async function I(e,t){let{rows:r}=await v.query(`SELECT id, name, phone, email, address, "contactName", notes, active,
            "createdAt", "updatedAt"
     FROM "Supplier"
     WHERE id = $1 AND "organizationId" = $2 AND "deletedAt" IS NULL`,[t,e]);if(!r[0])return null;let[i,u,a]=await Promise.all([l(t),R(e,{page:1,limit:10,supplierId:t}),v.query(`SELECT
        COUNT(*)::text AS "purchaseCount",
        COALESCE(SUM(sub.total), 0)::text AS "totalPurchased",
        MAX(pu."createdAt") AS "lastAt"
       FROM "Purchase" pu
       LEFT JOIN LATERAL (
         SELECT SUM(pi."quantityOrdered" * pi."unitPrice") AS total
         FROM "PurchaseItem" pi WHERE pi."purchaseId" = pu.id
       ) sub ON true
       WHERE pu."supplierId" = $1 AND pu.status <> 'CANCELLED'`,[t])]),n=a.rows[0];return{id:r[0].id,name:r[0].name,phone:r[0].phone,email:r[0].email,address:r[0].address,contactName:r[0].contactName,notes:r[0].notes,active:r[0].active,productCount:i.length,purchaseCount:parseInt(n?.purchaseCount??"0",10)||0,totalPurchased:Math.round(100*parseFloat(n?.totalPurchased??"0"))/100,lastPurchaseAt:n?.lastAt?.toISOString()??null,products:i,recentPurchases:u.items,createdAt:r[0].createdAt.toISOString(),updatedAt:r[0].updatedAt.toISOString()}}async function m(e,t){let r=s("sup");await v.query(`INSERT INTO "Supplier" (
      id, "organizationId", name, phone, email, address, "contactName", notes, active, "updatedAt"
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,NOW())`,[r,e,t.name,t.phone??null,t.email??null,t.address??null,t.contactName??null,t.notes??null,!1!==t.active]);let i=await I(e,r);if(!i)throw Error("Supplier introuvable apr\xe8s cr\xe9ation.");return i}async function N(e,t,r){let i=[],u=[],a=1,n=(e,t)=>{i.push(`"${e}" = $${a}`),u.push(t),a++};if(void 0!==r.name&&n("name",r.name),void 0!==r.phone&&n("phone",r.phone??null),void 0!==r.email&&n("email",r.email??null),void 0!==r.address&&n("address",r.address??null),void 0!==r.contactName&&n("contactName",r.contactName??null),void 0!==r.notes&&n("notes",r.notes??null),void 0!==r.active&&n("active",r.active),i.length){i.push('"updatedAt" = NOW()'),u.push(t,e);let{rowCount:r}=await v.query(`UPDATE "Supplier" SET ${i.join(", ")}
       WHERE id = $${a} AND "organizationId" = $${a+1} AND "deletedAt" IS NULL`,u);if(!r)throw Error("NOT_FOUND")}let d=await I(e,t);if(!d)throw Error("NOT_FOUND");return d}async function A(e,t){let{rowCount:r}=await v.query(`UPDATE "Supplier"
     SET active = false, "deletedAt" = NOW(), "updatedAt" = NOW()
     WHERE id = $1 AND "organizationId" = $2 AND "deletedAt" IS NULL`,[t,e]);if(!r)throw Error("NOT_FOUND")}async function O(e,t,r){if(!(await v.query('SELECT id FROM "Supplier" WHERE id = $1 AND "organizationId" = $2 AND "deletedAt" IS NULL',[t,e])).rows[0])throw Error("SUPPLIER_NOT_FOUND");if(!(await v.query('SELECT id FROM "Product" WHERE id = $1 AND "organizationId" = $2 AND "deletedAt" IS NULL',[r.productId,e])).rows[0])throw Error("PRODUCT_NOT_FOUND");let i=await v.connect();try{await i.query("BEGIN"),r.preferred&&await i.query(`UPDATE "ProductSupplier" SET preferred = false, "updatedAt" = NOW()
         WHERE "productId" = $1`,[r.productId]);let e=s("ps");await i.query(`INSERT INTO "ProductSupplier" (
        id, "productId", "supplierId", "supplierSku", "purchasePrice",
        "minimumOrderQuantity", "leadTimeDays", preferred, "updatedAt"
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW())
      ON CONFLICT ("productId", "supplierId") DO UPDATE SET
        "supplierSku" = EXCLUDED."supplierSku",
        "purchasePrice" = EXCLUDED."purchasePrice",
        "minimumOrderQuantity" = EXCLUDED."minimumOrderQuantity",
        "leadTimeDays" = EXCLUDED."leadTimeDays",
        preferred = EXCLUDED.preferred,
        "updatedAt" = NOW()`,[e,r.productId,t,r.supplierSku??null,r.purchasePrice,r.minimumOrderQuantity??null,r.leadTimeDays??null,!!r.preferred]),await i.query("COMMIT")}catch(e){throw await i.query("ROLLBACK"),e}finally{i.release()}let u=(await l(t)).find(e=>e.productId===r.productId);if(!u)throw Error("Link introuvable.");return u}async function S(e,t,r){let{rowCount:i}=await v.query(`DELETE FROM "ProductSupplier" ps
     USING "Supplier" s
     WHERE ps."supplierId" = s.id
       AND s.id = $1 AND s."organizationId" = $2
       AND ps."productId" = $3`,[t,e,r]);if(!i)throw Error("NOT_FOUND")}async function h(e){let{rows:t}=await v.query(`SELECT
      COUNT(*)::text AS "purchaseCount",
      COUNT(*) FILTER (WHERE status = 'DRAFT')::text AS "draftCount",
      COUNT(*) FILTER (WHERE status = 'ORDERED')::text AS "orderedCount",
      COUNT(*) FILTER (WHERE status IN ('ORDERED','PARTIALLY_RECEIVED'))::text AS "awaitingReceiptCount",
      COUNT(*) FILTER (WHERE status = 'RECEIVED')::text AS "receivedCount",
      COALESCE((
        SELECT SUM(pi."quantityOrdered" * pi."unitPrice")
        FROM "PurchaseItem" pi
        JOIN "Purchase" pu ON pu.id = pi."purchaseId"
        WHERE pu."organizationId" = $1
          AND pu.status <> 'CANCELLED'
          AND pu."createdAt" >= date_trunc('month', NOW())
      ), 0)::text AS "monthTotal"
     FROM "Purchase"
     WHERE "organizationId" = $1`,[e]),r=t[0];return{purchaseCount:parseInt(r.purchaseCount,10)||0,draftCount:parseInt(r.draftCount,10)||0,orderedCount:parseInt(r.orderedCount,10)||0,awaitingReceiptCount:parseInt(r.awaitingReceiptCount,10)||0,receivedCount:parseInt(r.receivedCount,10)||0,monthTotal:Math.round(100*parseFloat(r.monthTotal))/100||0}}async function y(e,t){let r=new Date().getFullYear(),i=`ACH-${r}-`,{rows:u}=await t.query(`SELECT number FROM "Purchase"
     WHERE "organizationId" = $1 AND number LIKE $2
     ORDER BY number DESC LIMIT 1
     FOR UPDATE`,[e,`${i}%`]),a=1;if(u[0]?.number){let e=u[0].number.slice(i.length),t=parseInt(e,10);Number.isNaN(t)||(a=t+1)}return`${i}${String(a).padStart(4,"0")}`}async function R(e,t){let r=['pu."organizationId" = $1'],i=[e],u=2;t.supplierId&&(r.push(`pu."supplierId" = $${u}`),i.push(t.supplierId),u++),t.status&&(r.push(`pu.status = $${u}::"PurchaseStatus"`),i.push(t.status),u++),t.search&&(r.push(`(pu.number ILIKE $${u} OR COALESCE(s.name, '') ILIKE $${u})`),i.push(`%${t.search}%`),u++);let a=r.join(" AND "),n=(t.page-1)*t.limit,[d,s,o]=await Promise.all([v.query(`SELECT COUNT(*)::int AS total
       FROM "Purchase" pu
       LEFT JOIN "Supplier" s ON s.id = pu."supplierId"
       WHERE ${a}`,i),v.query(`SELECT
        pu.id, pu.number, pu."supplierId", COALESCE(s.name, 'Sans fournisseur') AS "supplierName",
        pu.status::text AS status, pu."orderedAt", pu."receivedAt", pu."createdAt",
        COUNT(pi.id)::int AS "itemCount",
        COALESCE(SUM(pi."quantityOrdered" * pi."unitPrice"), 0)::text AS total
       FROM "Purchase" pu
       LEFT JOIN "Supplier" s ON s.id = pu."supplierId"
       LEFT JOIN "PurchaseItem" pi ON pi."purchaseId" = pu.id
       WHERE ${a}
       GROUP BY pu.id, s.name
       ORDER BY pu."createdAt" DESC
       LIMIT $${u} OFFSET $${u+1}`,[...i,t.limit,n]),h(e)]);return{items:s.rows.map(e=>({id:String(e.id),number:String(e.number),supplierId:e.supplierId?String(e.supplierId):null,supplierName:String(e.supplierName??"Sans fournisseur"),status:e.status,itemCount:Number(e.itemCount)||0,total:Math.round(100*parseFloat(String(e.total??"0")))/100,orderedAt:e.orderedAt?new Date(e.orderedAt).toISOString():null,receivedAt:e.receivedAt?new Date(e.receivedAt).toISOString():null,createdAt:new Date(e.createdAt).toISOString()})),total:d.rows[0]?.total??0,kpis:o}}async function T(e){let{rows:t}=await v.query(`SELECT
      pi.id, pi."productId", p.name AS "productName", p.sku AS "productSku",
      pi."quantityOrdered"::text, pi."quantityReceived"::text,
      pi."unitPrice"::text, pi.unit::text AS unit
     FROM "PurchaseItem" pi
     JOIN "Product" p ON p.id = pi."productId"
     WHERE pi."purchaseId" = $1
     ORDER BY p.name`,[e]);return t.map(e=>{let t=parseFloat(e.quantityOrdered)||0,r=parseFloat(e.quantityReceived)||0,i=parseFloat(e.unitPrice)||0;return{id:e.id,productId:e.productId,productName:e.productName,productSku:e.productSku,quantityOrdered:t,quantityReceived:r,quantityRemaining:Math.max(0,Math.round((t-r)*1e3)/1e3),unitPrice:i,unit:e.unit,lineTotal:Math.round(t*i*100)/100}})}async function C(e){let{rows:t}=await v.query(`SELECT
      pr.id, pr."receivedAt", pr."userId", pr.notes, pr."idempotencyKey",
      u."firstName" AS "userFirst", u."lastName" AS "userLast"
     FROM "PurchaseReceipt" pr
     LEFT JOIN "User" u ON u.id = pr."userId"
     WHERE pr."purchaseId" = $1
     ORDER BY pr."receivedAt" DESC`,[e]),r=[];for(let e of t){let t=await v.query(`SELECT
        rl.id, rl."purchaseItemId", rl."productId", p.name AS "productName",
        rl.quantity::text, rl."lotNumber", rl."expiresAt", rl."inventoryMovementId"
       FROM "PurchaseReceiptLine" rl
       JOIN "Product" p ON p.id = rl."productId"
       WHERE rl."receiptId" = $1`,[e.id]);r.push({id:e.id,receivedAt:e.receivedAt.toISOString(),userId:e.userId,userName:e.userFirst||e.userLast?`${e.userFirst??""} ${e.userLast??""}`.trim():null,notes:e.notes,idempotencyKey:e.idempotencyKey,lines:t.rows.map(e=>({id:e.id,purchaseItemId:e.purchaseItemId,productId:e.productId,productName:e.productName,quantity:parseFloat(e.quantity)||0,lotNumber:e.lotNumber,expiresAt:e.expiresAt?new Date(e.expiresAt).toISOString():null,inventoryMovementId:e.inventoryMovementId}))})}return r}async function D(e,t){let{rows:r}=await v.query(`SELECT
      pu.id, pu.number, pu."supplierId", COALESCE(s.name, 'Sans fournisseur') AS "supplierName",
      pu.status::text AS status, pu.notes, pu."orderedAt", pu."receivedAt",
      pu."createdById", pu."createdAt", pu."updatedAt"
     FROM "Purchase" pu
     LEFT JOIN "Supplier" s ON s.id = pu."supplierId"
     WHERE pu.id = $1 AND pu."organizationId" = $2`,[t,e]);if(!r[0])return null;let[i,u]=await Promise.all([T(t),C(t)]),a=i.reduce((e,t)=>e+t.lineTotal,0);return{id:r[0].id,number:r[0].number,supplierId:r[0].supplierId??null,supplierName:r[0].supplierName??"Sans fournisseur",status:r[0].status,itemCount:i.length,total:Math.round(100*a)/100,orderedAt:r[0].orderedAt?.toISOString()??null,receivedAt:r[0].receivedAt?.toISOString()??null,createdAt:r[0].createdAt.toISOString(),updatedAt:r[0].updatedAt.toISOString(),notes:r[0].notes,createdById:r[0].createdById,items:i,receipts:u}}async function L(e,t,r,i){if(r.productId){let i=await e.query(`SELECT id, unit FROM "Product"
       WHERE id = $1 AND "organizationId" = $2 AND "deletedAt" IS NULL`,[r.productId,t]);if(!i.rows[0])throw Error("PRODUCT_NOT_FOUND");return i.rows[0]}let a=r.productName?.trim();if(!a)throw Error("PRODUCT_NOT_FOUND");let n=await e.query(`SELECT id, unit FROM "Product"
     WHERE "organizationId" = $1 AND "deletedAt" IS NULL AND lower(btrim(name)) = lower($2)
     ORDER BY "createdAt" ASC
     LIMIT 1`,[t,a]);if(n.rows[0])return n.rows[0];for(let n=0;n<3;n+=1){let d=s("prd");await e.query("SAVEPOINT purchase_product");try{return await e.query(`INSERT INTO "Product" (
          id, "organizationId", name, sku, category, unit,
          "purchasePrice", stock, "minStock", "supplierName",
          consumable, sellable, active, "updatedAt"
        ) VALUES (
          $1,$2,$3,$4,'CONSOMMABLE'::"ProductCategory",'UNIT'::"ProductUnit",
          $5,0,0,$6,true,true,true,NOW()
        )`,[d,t,a,function(e){let t=e.normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-zA-Z0-9]+/g,"").slice(0,8).toUpperCase();return`${t||"PRD"}-${(0,u.randomBytes)(3).toString("hex").toUpperCase()}`}(a),r.unitPrice,i]),await e.query("RELEASE SAVEPOINT purchase_product"),{id:d,unit:"UNIT"}}catch(t){if(await e.query("ROLLBACK TO SAVEPOINT purchase_product"),!o(t)||2===n)throw t}}throw Error("PRODUCT_NOT_FOUND")}async function $(e,t,r,i,u){for(let a of i){let i=await L(e,r,a,u);await e.query(`INSERT INTO "PurchaseItem" (
        id, "purchaseId", "productId", "quantityOrdered", "quantityReceived", "unitPrice", unit
      ) VALUES ($1,$2,$3,$4,0,$5,$6::"ProductUnit")`,[s("pui"),t,i.id,a.quantityOrdered,a.unitPrice,i.unit])}}async function w(e,t,r){let i=await v.connect();try{await i.query("BEGIN");let u=null;if(t.supplierId){let r=await i.query(`SELECT name FROM "Supplier"
         WHERE id = $1 AND "organizationId" = $2 AND "deletedAt" IS NULL AND active = true`,[t.supplierId,e]);if(!r.rows[0])throw Error("SUPPLIER_NOT_FOUND");u=r.rows[0].name}let a=await y(e,i),n=s("pur"),d=t.submit?"ORDERED":"DRAFT";await i.query(`INSERT INTO "Purchase" (
        id, "organizationId", "supplierId", number, status, notes,
        "orderedAt", "createdById", "updatedAt"
      ) VALUES ($1,$2,$3,$4,$5::"PurchaseStatus",$6,$7,$8,NOW())`,[n,e,t.supplierId??null,a,d,t.notes??null,t.submit?new Date:null,r??null]),await $(i,n,e,t.items,u),await i.query("COMMIT");let o=await D(e,n);if(!o)throw Error("Purchase introuvable.");return o}catch(e){throw await i.query("ROLLBACK"),e}finally{i.release()}}async function f(e,t,r){let i=await D(e,t);if(!i)throw Error("NOT_FOUND");if("DRAFT"!==i.status&&(r.items||void 0!==r.supplierId))throw Error("ITEMS_LOCKED");if("CANCELLED"===i.status||"RECEIVED"===i.status)throw Error("LOCKED");if("CANCELLED"===r.status&&"PARTIALLY_RECEIVED"===i.status)throw Error("CANNOT_CANCEL");let u=await v.connect();try{await u.query("BEGIN"),void 0!==r.notes&&await u.query('UPDATE "Purchase" SET notes = $1, "updatedAt" = NOW() WHERE id = $2',[r.notes??null,t]);let a=i.supplierId?i.supplierName:null;if(void 0!==r.supplierId){if(r.supplierId){let t=await u.query(`SELECT name FROM "Supplier"
           WHERE id = $1 AND "organizationId" = $2 AND "deletedAt" IS NULL AND active = true`,[r.supplierId,e]);if(!t.rows[0])throw Error("SUPPLIER_NOT_FOUND");a=t.rows[0].name}else a=null;await u.query('UPDATE "Purchase" SET "supplierId" = $1, "updatedAt" = NOW() WHERE id = $2',[r.supplierId,t])}r.items&&(await u.query('DELETE FROM "PurchaseItem" WHERE "purchaseId" = $1',[t]),await $(u,t,e,r.items,a)),"ORDERED"===r.status&&"DRAFT"===i.status&&await u.query(`UPDATE "Purchase"
         SET status = 'ORDERED'::"PurchaseStatus", "orderedAt" = NOW(), "updatedAt" = NOW()
         WHERE id = $1`,[t]),"CANCELLED"===r.status&&await u.query(`UPDATE "Purchase"
         SET status = 'CANCELLED'::"PurchaseStatus", "updatedAt" = NOW()
         WHERE id = $1`,[t]),"DRAFT"===r.status&&"ORDERED"===i.status&&await u.query(`UPDATE "Purchase"
         SET status = 'DRAFT'::"PurchaseStatus", "orderedAt" = NULL, "updatedAt" = NOW()
         WHERE id = $1`,[t]),await u.query("COMMIT")}catch(e){throw await u.query("ROLLBACK"),e}finally{u.release()}let a=await D(e,t);if(!a)throw Error("NOT_FOUND");return a}async function P(e,t,r,i){if((await v.query(`SELECT id FROM "PurchaseReceipt"
     WHERE "organizationId" = $1 AND "idempotencyKey" = $2`,[e,r.idempotencyKey])).rows[0]){let r=await D(e,t);if(!r)throw Error("NOT_FOUND");return{purchase:r,created:!1}}let u=await D(e,t);if(!u)throw Error("NOT_FOUND");if("ORDERED"!==u.status&&"PARTIALLY_RECEIVED"!==u.status)throw Error("NOT_RECEIVABLE");let a=await v.connect();try{if(await a.query("BEGIN"),(await a.query(`SELECT id FROM "PurchaseReceipt"
       WHERE "organizationId" = $1 AND "idempotencyKey" = $2
       FOR UPDATE`,[e,r.idempotencyKey])).rows[0])return await a.query("COMMIT"),{purchase:await D(e,t),created:!1};let d=s("recv");for(let o of(await a.query(`INSERT INTO "PurchaseReceipt" (
        id, "organizationId", "purchaseId", "userId", notes, "idempotencyKey"
      ) VALUES ($1,$2,$3,$4,$5,$6)`,[d,e,t,i??null,r.notes??null,r.idempotencyKey]),r.items)){let r=await a.query(`SELECT id, "productId", "quantityOrdered"::text, "quantityReceived"::text
         FROM "PurchaseItem"
         WHERE id = $1 AND "purchaseId" = $2
         FOR UPDATE`,[o.purchaseItemId,t]);if(!r.rows[0])throw Error("ITEM_NOT_FOUND");let p=parseFloat(r.rows[0].quantityOrdered)||0,c=parseFloat(r.rows[0].quantityReceived)||0,l=p-c;if(o.quantity>l+1e-4)throw Error("OVER_RECEIVE");let E=`recv:${d}:item:${o.purchaseItemId}`,{movement:I}=await (0,n.F1)(e,{productId:r.rows[0].productId,type:"PURCHASE",quantity:o.quantity,reason:`R\xe9ception ${u.number}`,referenceType:"PURCHASE",referenceId:t,idempotencyKey:E},i,a);o.lotNumber&&await a.query(`INSERT INTO "ProductLot" (
            id, "productId", "lotNumber", quantity, "expiresAt", notes, "updatedAt"
          ) VALUES ($1,$2,$3,$4,$5,$6,NOW())`,[s("lot"),r.rows[0].productId,o.lotNumber,o.quantity,o.expiresAt?new Date(o.expiresAt):null,`R\xe9ception ${u.number}`]);let m=s("rln");await a.query(`INSERT INTO "PurchaseReceiptLine" (
          id, "receiptId", "purchaseItemId", "productId", quantity,
          "lotNumber", "expiresAt", "inventoryMovementId"
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,[m,d,o.purchaseItemId,r.rows[0].productId,o.quantity,o.lotNumber??null,o.expiresAt?new Date(o.expiresAt):null,I.id]),await a.query(`UPDATE "PurchaseItem"
         SET "quantityReceived" = "quantityReceived" + $1
         WHERE id = $2`,[o.quantity,o.purchaseItemId])}let o=(await a.query(`SELECT "quantityOrdered"::text, "quantityReceived"::text
       FROM "PurchaseItem" WHERE "purchaseId" = $1`,[t])).rows.map((e,t)=>{let r=parseFloat(e.quantityOrdered)||0,i=parseFloat(e.quantityReceived)||0;return{id:String(t),productId:"",productName:"",productSku:"",quantityOrdered:r,quantityReceived:i,quantityRemaining:Math.max(0,r-i),unitPrice:0,unit:"UNIT",lineTotal:0}}),p=function(e){if(0===e.length)return"ORDERED";let t=e.every(e=>e.quantityReceived>=e.quantityOrdered-1e-4),r=e.some(e=>e.quantityReceived>0);return t?"RECEIVED":r?"PARTIALLY_RECEIVED":"ORDERED"}(o);await a.query(`UPDATE "Purchase"
       SET status = $1::"PurchaseStatus",
           "receivedAt" = CASE WHEN $1 = 'RECEIVED' THEN NOW() ELSE "receivedAt" END,
           "updatedAt" = NOW()
       WHERE id = $2`,[p,t]),await a.query("COMMIT")}catch(r){if(await a.query("ROLLBACK"),o(r)){let r=await D(e,t);if(r)return{purchase:r,created:!1}}throw r}finally{a.release()}let d=await D(e,t);if(!d)throw Error("NOT_FOUND");return{purchase:d,created:!0}}i()}catch(e){i(e)}})},94150:(e,t,r)=>{r.d(t,{cI:()=>m,Ae:()=>p,FI:()=>l,Em:()=>d,ES:()=>o,Fc:()=>I,jX:()=>E,_G:()=>s});let i=["DRAFT","ORDERED","PARTIALLY_RECEIVED","RECEIVED","CANCELLED"];function u(e){if("string"!=typeof e)return;let t=e.trim();return t.length?t:void 0}function a(e){return"number"==typeof e&&Number.isFinite(e)?e:"string"==typeof e&&""!==e.trim()&&Number.isFinite(Number(e))?Number(e):void 0}function n(e){if("boolean"==typeof e)return e}function d(e){let t=[],r=u(e.name);return(r||t.push("name"),t.length)?{ok:!1,errors:t}:{ok:!0,data:{name:r,phone:u(e.phone),email:u(e.email),address:u(e.address),contactName:u(e.contactName),notes:u(e.notes),active:n(e.active)}}}function s(e){let t={};if(void 0!==e.name){let r=u(e.name);if(!r)return{ok:!1,errors:["name"]};t.name=r}return void 0!==e.phone&&(t.phone=u(e.phone)??void 0),void 0!==e.email&&(t.email=u(e.email)??void 0),void 0!==e.address&&(t.address=u(e.address)??void 0),void 0!==e.contactName&&(t.contactName=u(e.contactName)??void 0),void 0!==e.notes&&(t.notes=u(e.notes)??void 0),void 0!==e.active&&(t.active=!!e.active),{ok:!0,data:t}}function o(e){let t=[],r=u(e.productId),i=a(e.purchasePrice);return(r||t.push("productId"),(void 0===i||i<0)&&t.push("purchasePrice"),t.length)?{ok:!1,errors:t}:{ok:!0,data:{productId:r,supplierSku:u(e.supplierSku),purchasePrice:i,minimumOrderQuantity:a(e.minimumOrderQuantity),leadTimeDays:void 0!==a(e.leadTimeDays)?Math.round(a(e.leadTimeDays)):void 0,preferred:n(e.preferred)}}}function p(e){return{page:Math.max(1,Number(e.get("page"))||1),limit:Math.min(100,Math.max(1,Number(e.get("limit"))||30)),search:e.get("search")?.trim()||"",active:"true"===e.get("active")||"false"!==e.get("active")&&null}}function c(e){if(!Array.isArray(e)||0===e.length)return null;let t=[];for(let r of e){if(!r||"object"!=typeof r)return null;let e=u(r.productId),i=u(r.productName),n=a(r.quantityOrdered),d=a(r.unitPrice);if(!e&&!i||void 0===n||n<=0||i&&i.length>120||void 0===d||d<0)return null;t.push({productId:e,productName:e?void 0:i,quantityOrdered:Math.round(n),unitPrice:Math.round(d)})}return t}function l(e){let t=[],r=u(e.supplierId),i=c(e.items);return(i||t.push("items"),t.length)?{ok:!1,errors:t}:{ok:!0,data:{supplierId:r||void 0,notes:u(e.notes),items:i,submit:!!e.submit}}}function E(e){let t={};if("notes"in e&&(t.notes=u(e.notes)??null),"supplierId"in e&&(t.supplierId=u(e.supplierId)??null),void 0!==e.items){let r=c(e.items);if(!r)return{ok:!1,errors:["items"]};t.items=r}if(void 0!==e.status){let r=String(e.status);if("DRAFT"!==r&&"ORDERED"!==r&&"CANCELLED"!==r)return{ok:!1,errors:["status"]};t.status=r}return{ok:!0,data:t}}function I(e){let t=[],r=u(e.idempotencyKey);if(r||t.push("idempotencyKey"),Array.isArray(e.items)&&0!==e.items.length||t.push("items"),t.length)return{ok:!1,errors:t};let i=[];for(let t of e.items){if(!t||"object"!=typeof t)return{ok:!1,errors:["items"]};let e=u(t.purchaseItemId),r=a(t.quantity);if(!e||void 0===r||r<=0)return{ok:!1,errors:["items"]};i.push({purchaseItemId:e,quantity:r,lotNumber:u(t.lotNumber),expiresAt:u(t.expiresAt)})}return{ok:!0,data:{idempotencyKey:r,notes:u(e.notes),items:i}}}function m(e){let t=e.get("status");return{page:Math.max(1,Number(e.get("page"))||1),limit:Math.min(100,Math.max(1,Number(e.get("limit"))||30)),search:e.get("search")?.trim()||"",supplierId:e.get("supplierId")?.trim()||null,status:t&&i.includes(t)?t:null}}}};