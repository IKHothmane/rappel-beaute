"use strict";exports.id=7207,exports.ids=[7207],exports.modules={27207:(t,e,a)=>{a.a(t,async(t,i)=>{try{a.d(e,{D2:()=>S,Mw:()=>y,Ud:()=>l,_g:()=>N,dG:()=>O,uA:()=>I,wS:()=>h});var o=a(84770),r=a(8678),s=a(2192),n=a(39811),d=a(45304),u=t([r,s,n,d]);[r,s,n,d]=u.then?(await u)():u;let A=new r.Pool({connectionString:process.env.DATABASE_URL});function c(t){return`${t}_${(0,o.randomBytes)(8).toString("hex")}`}async function m(t,e){let a=new Date().getFullYear();await e.query(`INSERT INTO "InvoiceSequence" ("organizationId", year, "lastValue", "updatedAt")
     VALUES ($1, $2, 0, NOW())
     ON CONFLICT ("organizationId", year) DO NOTHING`,[t,a]);let{rows:i}=await e.query(`UPDATE "InvoiceSequence"
     SET "lastValue" = "lastValue" + 1, "updatedAt" = NOW()
     WHERE "organizationId" = $1 AND year = $2
     RETURNING "lastValue"`,[t,a]),o=i[0]?.lastValue??1;return`FAC-${a}-${String(o).padStart(6,"0")}`}async function p(t,e){let{rows:a}=await (e??A).query(`SELECT id FROM "CashRegisterSession"
     WHERE "organizationId" = $1 AND status = 'OPEN'::"CashRegisterStatus"
     LIMIT 1`,[t]);return a[0]??null}async function l(t,e){let a=['p."organizationId" = $1',"p.active = true",'p."deletedAt" IS NULL'],i=[t],o=2;e?.search?.trim()&&(a.push(`(p.name ILIKE $${o} OR p.sku ILIKE $${o} OR COALESCE(p.brand,'') ILIKE $${o})`),i.push(`%${e.search.trim()}%`),o++),e?.category&&(a.push(`p.category = $${o}::"ProductCategory"`),i.push(e.category),o++);let{rows:r}=await A.query(`SELECT p.id, p.name, p.sku, p.category::text,
            COALESCE(NULLIF(p."salePrice", 0), NULLIF(p."purchasePrice", 0), 0)::text AS "salePrice",
            p.stock::text, p."minStock"::text, p.unit::text, p.brand
     FROM "Product" p
     WHERE ${a.join(" AND ")}
     ORDER BY p.name ASC
     LIMIT 500`,i);return r.map(t=>({id:t.id,name:t.name,sku:t.sku,category:t.category,salePrice:parseFloat(t.salePrice)||0,stock:parseFloat(t.stock),minStock:parseFloat(t.minStock)||0,unit:t.unit,brand:t.brand}))}async function I(t,e){let a=e.trim();if(a.length<2)return[];let{rows:i}=await A.query(`SELECT id, "firstName", "lastName", phone FROM "Customer"
     WHERE "organizationId" = $1 AND "deletedAt" IS NULL
       AND (
         "firstName" ILIKE $2 OR "lastName" ILIKE $2 OR phone ILIKE $2
         OR CONCAT("firstName", ' ', "lastName") ILIKE $2
       )
     ORDER BY "lastName", "firstName"
     LIMIT 20`,[t,`%${a}%`]);return i.map(t=>({id:t.id,name:`${t.firstName} ${t.lastName}`.trim(),phone:t.phone}))}async function E(t,e){let{rows:a}=await A.query(`SELECT s.id, s."invoiceId", i.number AS "invoiceNumber", s."paymentId",
            i."appointmentId", s."customerId", i."customerNameSnapshot" AS "customerName",
            s.status::text, s.subtotal::text, s."discountTotal"::text, s.total::text,
            s."paymentMethod"::text, s."soldById", s.notes, s."createdAt"
     FROM "PosSale" s
     JOIN "Invoice" i ON i.id = s."invoiceId"
     WHERE s.id = $1 AND s."organizationId" = $2`,[e,t]),i=a[0];if(!i)return null;let{rows:o}=await A.query(`SELECT ii."productId", ii."nameSnapshot", ii."unitPriceSnapshot"::text AS "unitPrice",
            ii.quantity::text, ii.total::text, p.sku, p.category::text
     FROM "InvoiceItem" ii
     LEFT JOIN "Product" p ON p.id = ii."productId"
     WHERE ii."invoiceId" = $1
     ORDER BY ii."sortOrder"`,[i.invoiceId]),r=o.map(t=>({productId:t.productId??"",name:t.nameSnapshot,sku:t.sku??"",unitPrice:parseFloat(t.unitPrice),quantity:parseFloat(t.quantity),lineTotal:parseFloat(t.total),category:t.category??null}));return{id:i.id,invoiceId:i.invoiceId,invoiceNumber:i.invoiceNumber,paymentId:i.paymentId,appointmentId:i.appointmentId,customerId:i.customerId,customerName:i.customerName,status:i.status,subtotal:parseFloat(i.subtotal),discountTotal:parseFloat(i.discountTotal),total:parseFloat(i.total),paymentMethod:i.paymentMethod,lines:r,soldById:i.soldById,notes:i.notes,createdAt:i.createdAt.toISOString()}}async function y(t,e,i){if(!e.lines?.length)throw Error("EMPTY_CART");if(!e.idempotencyKey?.trim())throw Error("IDEMPOTENCY_REQUIRED");let o=await A.query(`SELECT id FROM "PosSale"
     WHERE "organizationId" = $1 AND "idempotencyKey" = $2`,[t,e.idempotencyKey]);if(o.rows[0]){let e=await E(t,o.rows[0].id);if(e)return e}let r=e.paymentMethod;if("ONLINE"===r)throw Error("ONLINE_NOT_ALLOWED");let u=new Map;for(let t of e.lines){let e=Number(t.quantity);if(!t.productId||!Number.isFinite(e)||e<=0)throw Error("INVALID_LINE");u.set(t.productId,(u.get(t.productId)??0)+e)}let l=await A.connect(),I="";try{if(await l.query("BEGIN"),"CASH"===r&&!await p(t,l))throw Error("NO_OPEN_SESSION");let a="Passage",o=null,E=e.customerId?.trim()||null,y=e.appointmentId?.trim()||null;if(y){let{rows:e}=await l.query(`SELECT a.id, a."customerId", c."firstName", c."lastName", c.phone
         FROM "Appointment" a
         JOIN "Customer" c ON c.id = a."customerId"
         WHERE a.id = $1 AND a."organizationId" = $2 AND c."deletedAt" IS NULL
         FOR SHARE OF a`,[y,t]);if(!e[0])throw Error("APPOINTMENT_NOT_FOUND");E=e[0].customerId,a=`${e[0].firstName} ${e[0].lastName}`.trim(),o=e[0].phone}else if(E){let{rows:e}=await l.query(`SELECT "firstName", "lastName", phone FROM "Customer"
         WHERE id = $1 AND "organizationId" = $2 AND "deletedAt" IS NULL
         FOR SHARE`,[E,t]);if(!e[0])throw Error("CUSTOMER_NOT_FOUND");a=`${e[0].firstName} ${e[0].lastName}`.trim(),o=e[0].phone}let{rows:$}=await l.query('SELECT name, address, phone, ice FROM "Organization" WHERE id = $1',[t]);if(!$[0])throw Error("ORG_NOT_FOUND");let N=[];for(let[e,a]of u){let{rows:i}=await l.query(`SELECT id, name, sku,
                COALESCE(NULLIF("salePrice", 0), NULLIF("purchasePrice", 0), 0)::text AS "salePrice",
                stock::text, category::text,
                sellable, active
         FROM "Product"
         WHERE id = $1 AND "organizationId" = $2 AND "deletedAt" IS NULL
         FOR UPDATE`,[e,t]),o=i[0];if(!o||!o.active)throw Error("PRODUCT_NOT_FOUND");let r=parseFloat(o.salePrice);if(!Number.isFinite(r)||r<=0)throw Error("PRODUCT_NO_PRICE");let s=parseFloat(o.stock);if(s<a-1e-4||s<=0)throw Error("INSUFFICIENT_STOCK");let n=Math.round(r*a*100)/100;N.push({product:o,quantity:a,unitPrice:r,lineTotal:n})}let S=Math.round(100*N.reduce((t,e)=>t+e.lineTotal,0))/100,h=Math.max(0,Number(e.discountTotal)||0);h>S&&(h=S),h=Math.round(100*h)/100;let O=Math.round((S-h)*100)/100;if(O<0)throw Error("INVALID_TOTAL");let A=c("inv"),T=c("pay");I=c("pos");let L=await m(t,l);await l.query(`INSERT INTO "Invoice" (
        id, "organizationId", number, "appointmentId", "customerId", status,
        "orgNameSnapshot", "orgAddressSnapshot", "orgPhoneSnapshot", "orgIceSnapshot",
        "customerNameSnapshot", "customerPhoneSnapshot",
        subtotal, "discountTotal", total,
        notes, "issuedAt", "createdById", "idempotencyKey", "updatedAt"
      ) VALUES (
        $1,$2,$3,$4,$5,'PAID'::"InvoiceStatus",
        $6,$7,$8,$9,$10,$11,
        $12,$13,$14,
        $15,NOW(),$16,$17,NOW()
      )`,[A,t,L,y,E,$[0].name,$[0].address,$[0].phone,$[0].ice,a,o,S,h,O,e.notes??null,i.id,`pos:${e.idempotencyKey}`]);let w=0;for(let t=0;t<N.length;t++){let e=N[t],a=t===N.length-1,i=h<=0?0:a?Math.round((h-w)*100)/100:Math.round(e.lineTotal/S*h*100)/100;w+=i;let o=Math.round((e.lineTotal-i)*100)/100;await l.query(`INSERT INTO "InvoiceItem" (
          id, "invoiceId", "serviceId", "productId", "nameSnapshot",
          "unitPriceSnapshot", quantity, discount, total, "sortOrder"
        ) VALUES ($1,$2,NULL,$3,$4,$5,$6,$7,$8,$9)`,[c("ii"),A,e.product.id,e.product.name,e.unitPrice,e.quantity,i,o,t])}let P=await (0,n.Gd)(t,l);if(await l.query(`INSERT INTO "Payment" (
        id, "organizationId", "appointmentId", "customerId", "invoiceId",
        amount, method, kind, status, "ticketNumber", notes, "userId", "idempotencyKey",
        "paidAt", "updatedAt"
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7::"PaymentMethod",'PAYMENT'::"PaymentKind",
        'COMPLETED'::"PaymentStatus",$8,$9,$10,$11,NOW(),NOW()
      )`,[T,t,y,E,A,O,r,P,e.notes??`Vente POS ${L}`,i.id,`pospay:${e.idempotencyKey}`]),"CASH"===r){let e=await p(t,l);if(!e)throw Error("NO_OPEN_SESSION");await l.query(`INSERT INTO "CashRegisterTransaction" (
          id, "organizationId", "sessionId", type, amount, method, "paymentId",
          "userId", reason, "idempotencyKey"
        ) VALUES (
          $1,$2,$3,'SALE'::"CashTxnType",$4,'CASH'::"PaymentMethod",$5,$6,$7,$8
        )`,[c("ctxn"),t,e.id,O,T,i.id,`POS ${L}`,`cashpos:${T}`])}for(let a of N)await (0,d.F1)(t,{productId:a.product.id,type:"SALE",quantity:a.quantity,reason:`Vente POS ${L}`,referenceType:"SALE",referenceId:I,idempotencyKey:`pos:${e.idempotencyKey}:mov:${a.product.id}`},i.id,l);await l.query(`INSERT INTO "PosSale" (
        id, "organizationId", "invoiceId", "paymentId", "customerId", "soldById",
        status, subtotal, "discountTotal", total, "paymentMethod",
        "idempotencyKey", notes, "updatedAt"
      ) VALUES (
        $1,$2,$3,$4,$5,$6,
        'COMPLETED'::"PosSaleStatus",$7,$8,$9,$10::"PaymentMethod",
        $11,$12,NOW()
      )`,[I,t,A,T,E,i.id,S,h,O,r,e.idempotencyKey,e.notes??null]),await (0,s.writeAuditLog)({organizationId:t,actorId:i.id,actorName:i.name,entityType:"PosSale",entityId:I,action:"POS_SALE_CREATED",after:{invoiceId:A,paymentId:T,total:O,method:r,customerId:E,lines:N.map(t=>({productId:t.product.id,qty:t.quantity,unitPrice:t.unitPrice}))},client:l}),h>0&&await (0,s.writeAuditLog)({organizationId:t,actorId:i.id,actorName:i.name,entityType:"PosSale",entityId:I,action:"POS_DISCOUNT_APPLIED",after:{discountTotal:h,subtotal:S,total:O},client:l}),await (0,s.writeAuditLog)({organizationId:t,actorId:i.id,actorName:i.name,entityType:"PosSale",entityId:I,action:"POS_PAYMENT_COMPLETED",after:{paymentId:T,method:r,amount:O},client:l}),await l.query("COMMIT")}catch(a){if(await l.query("ROLLBACK"),a&&"object"==typeof a&&"code"in a&&"23505"===a.code){let a=await A.query(`SELECT id FROM "PosSale"
         WHERE "organizationId" = $1 AND "idempotencyKey" = $2`,[t,e.idempotencyKey]);if(a.rows[0]){let e=await E(t,a.rows[0].id);if(e)return e}}throw a}finally{l.release()}try{if(e.customerId){let{earnPointsFromPayment:o}=await a.e(8114).then(a.bind(a,88114)),r=await E(t,I);r?.paymentId&&await o({organizationId:t,paymentId:r.paymentId,customerId:e.customerId,amountMad:r.total,userId:i.id})}}catch(t){console.error("[createPosSale] loyalty",t)}try{let{createCommissionForPosSale:e}=await a.e(836).then(a.bind(a,40836)),o=await A.query('SELECT email, "firstName", "lastName" FROM "User" WHERE id = $1 AND "organizationId" = $2',[i.id,t]);o.rows[0]&&await e({organizationId:t,posSaleId:I,soldByUser:{id:i.id,email:o.rows[0].email,firstName:o.rows[0].firstName,lastName:o.rows[0].lastName}})}catch(t){console.error("[createPosSale] product commission",t)}let y=await E(t,I);if(!y)throw Error("SALE_NOT_FOUND");return y}function $(t,e){if(!t)return null;let a=new Date(t);return Number.isNaN(a.getTime())?null:("string"==typeof t&&/^\d{4}-\d{2}-\d{2}$/.test(t)&&(e?a.setHours(23,59,59,999):a.setHours(0,0,0,0)),a)}async function N(t,e){let a=['s."organizationId" = $1'],i=[t],o=2,r=$(e?.from,!1),s=$(e?.to,!0);r&&(a.push(`s."createdAt" >= $${o++}`),i.push(r)),s&&(a.push(`s."createdAt" <= $${o++}`),i.push(s)),e?.soldById?.trim()&&(a.push(`s."soldById" = $${o++}`),i.push(e.soldById.trim())),e?.paymentMethod?.trim()&&(a.push(`s."paymentMethod" = $${o++}::"PaymentMethod"`),i.push(e.paymentMethod.trim())),e?.status?.trim()&&"all"!==e.status&&(a.push(`s.status = $${o++}::"PosSaleStatus"`),i.push(e.status.trim())),e?.customerId?.trim()&&(a.push(`s."customerId" = $${o++}`),i.push(e.customerId.trim())),e?.appointmentId?.trim()&&(a.push(`i."appointmentId" = $${o++}`),i.push(e.appointmentId.trim())),e?.paymentId?.trim()&&(a.push(`s."paymentId" = $${o++}`),i.push(e.paymentId.trim())),e?.search?.trim()&&(a.push(`(i.number ILIKE $${o} OR COALESCE(i."customerNameSnapshot", '') ILIKE $${o})`),i.push(`%${e.search.trim()}%`),o+=1);let n=Math.min(Math.max(e?.limit??50,1),200);i.push(n);let{rows:d}=await A.query(`SELECT s.id
     FROM "PosSale" s
     JOIN "Invoice" i ON i.id = s."invoiceId"
     WHERE ${a.join(" AND ")}
     ORDER BY s."createdAt" DESC
     LIMIT $${o}`,i),u=[];for(let e of d){let a=await E(t,e.id);a&&u.push(a)}return u}async function S(t,e){let a=['s."organizationId" = $1'],i=[t],o=2,r=$(e?.from,!1),s=$(e?.to,!0);r&&(a.push(`s."createdAt" >= $${o++}`),i.push(r)),s&&(a.push(`s."createdAt" <= $${o++}`),i.push(s)),e?.soldById?.trim()&&(a.push(`s."soldById" = $${o++}`),i.push(e.soldById.trim())),e?.paymentMethod?.trim()&&(a.push(`s."paymentMethod" = $${o++}::"PaymentMethod"`),i.push(e.paymentMethod.trim())),e?.status?.trim()&&"all"!==e.status?(a.push(`s.status = $${o++}::"PosSaleStatus"`),i.push(e.status.trim())):a.push("s.status = 'COMPLETED'::\"PosSaleStatus\""),e?.customerId?.trim()&&(a.push(`s."customerId" = $${o++}`),i.push(e.customerId.trim())),e?.search?.trim()&&(a.push(`(EXISTS (
         SELECT 1 FROM "Invoice" i
         WHERE i.id = s."invoiceId"
           AND (i.number ILIKE $${o} OR COALESCE(i."customerNameSnapshot", '') ILIKE $${o})
       ))`),i.push(`%${e.search.trim()}%`),o+=1);let n=a.join(" AND "),d=n.replace(/\bs\./g,"s2."),{rows:u}=await A.query(`SELECT
       COALESCE(SUM(s.total), 0)::text AS revenue,
       COUNT(*)::text AS "salesCount",
       COALESCE((
         SELECT SUM(ii.quantity)
         FROM "PosSale" s2
         JOIN "InvoiceItem" ii ON ii."invoiceId" = s2."invoiceId"
         WHERE ${d}
       ), 0)::text AS "productsSold"
     FROM "PosSale" s
     WHERE ${n}`,i),c=parseFloat(u[0]?.revenue??"0"),m=parseInt(u[0]?.salesCount??"0",10),p=parseFloat(u[0]?.productsSold??"0");return{revenue:c,salesCount:m,productsSold:p,averageBasket:m>0?Math.round(c/m*100)/100:0}}async function h(t,e){return E(t,e)}async function O(t,e,i){let o=await E(t,e);if(!o)throw Error("SALE_NOT_FOUND");if("REFUNDED"===o.status)return o;if("COMPLETED"!==o.status)throw Error("SALE_NOT_REFUNDABLE");if(!o.paymentId)throw Error("PAYMENT_MISSING");let{refundPayment:r}=await Promise.resolve().then(a.bind(a,39811));for(let a of(await r(t,o.paymentId,{amount:o.total,method:o.paymentMethod,reason:`Remboursement POS ${o.invoiceNumber}`,idempotencyKey:`posrefund:${e}`},i.id),o.lines))a.productId&&await (0,d.F1)(t,{productId:a.productId,type:"RETURN",quantity:a.quantity,reason:`Retour POS ${o.invoiceNumber}`,referenceType:"SALE",referenceId:e,idempotencyKey:`posrefund:${e}:mov:${a.productId}`},i.id);await A.query(`UPDATE "PosSale"
     SET status = 'REFUNDED'::"PosSaleStatus", "updatedAt" = NOW()
     WHERE id = $1 AND "organizationId" = $2`,[e,t]),await A.query(`UPDATE "Invoice"
     SET status = 'VOID'::"InvoiceStatus", "voidedAt" = NOW(),
         "voidReason" = $3, "updatedAt" = NOW()
     WHERE id = $1 AND "organizationId" = $2`,[o.invoiceId,t,"Remboursement POS"]),await (0,s.writeAuditLog)({organizationId:t,actorId:i.id,actorName:i.name,entityType:"PosSale",entityId:e,action:"POS_REFUND_CREATED",before:{status:"COMPLETED",total:o.total},after:{status:"REFUNDED"}});let n=await E(t,e);if(!n)throw Error("SALE_NOT_FOUND");return n}i()}catch(t){i(t)}})}};