"use strict";exports.id=2170,exports.ids=[2170],exports.modules={92170:(t,o,e)=>{e.a(t,async(t,a)=>{try{e.d(o,{Zp:()=>A,gc:()=>l,m5:()=>N,onAppointmentCompleted:()=>$,p:()=>O,refreshInvoiceStatusForAppointment:()=>T});var n=e(84770),i=e(8678),s=e(40836),r=t([i,s]);[i,s]=r.then?(await r)():r;let R=new i.Pool({connectionString:process.env.DATABASE_URL});function d(t){return`${t}_${(0,n.randomBytes)(8).toString("hex")}`}async function u(t,o){let e=new Date().getFullYear();await o.query(`INSERT INTO "InvoiceSequence" ("organizationId", year, "lastValue", "updatedAt")
     VALUES ($1, $2, 0, NOW())
     ON CONFLICT ("organizationId", year) DO NOTHING`,[t,e]);let{rows:a}=await o.query(`UPDATE "InvoiceSequence"
     SET "lastValue" = "lastValue" + 1, "updatedAt" = NOW()
     WHERE "organizationId" = $1 AND year = $2
     RETURNING "lastValue"`,[t,e]),n=a[0]?.lastValue??1;return`FAC-${e}-${String(n).padStart(6,"0")}`}function p(t="p"){return`COALESCE(SUM(CASE WHEN ${t}.kind = 'REFUND' THEN -${t}.amount ELSE ${t}.amount END) FILTER (WHERE ${t}.status = 'COMPLETED'), 0)`}async function I(t,o,e){let{rows:a}=await (e??R).query(`SELECT
      ${p("p")}::text AS paid,
      STRING_AGG(DISTINCT p.method::text, ',') AS methods
     FROM "Payment" p
     WHERE p.status = 'COMPLETED'
       AND (
         p."invoiceId" = $1
         OR ($2::text IS NOT NULL AND p."appointmentId" = $2 AND p."invoiceId" IS NULL)
       )`,[t,o]);return{paid:Math.round(100*(parseFloat(a[0]?.paid??"0")||0))/100,methods:a[0]?.methods?a[0].methods.split(","):[]}}function m(t,o,e){return"VOID"===e||"DRAFT"===e?e:o<=.001?"ISSUED":o+.01>=t?"PAID":"PARTIALLY_PAID"}function c(t,o,e){let a=parseFloat(String(t.total))||0,n="VOID"===t.status?"VOID":m(a,o,t.status);return{id:String(t.id),number:String(t.number),customerId:String(t.customerId??""),customerName:String(t.customerNameSnapshot??t.customerName??""),customerPhone:t.customerPhoneSnapshot||t.customerPhone||null,appointmentId:t.appointmentId??null,status:n,subtotal:parseFloat(String(t.subtotal))||0,discountTotal:parseFloat(String(t.discountTotal))||0,total:a,paidAmount:o,remaining:Math.max(0,Math.round((a-o)*100)/100),issuedAt:t.issuedAt?new Date(t.issuedAt).toISOString():null,createdAt:new Date(t.createdAt).toISOString(),paymentMethods:e,firstItemName:t.firstItemName||null,staffName:t.staffName||null}}async function E(t){let{rows:o}=await R.query(`WITH inv AS (
      SELECT i.id, i.total, i.status, i."appointmentId",
        COALESCE(i."issuedAt", i."createdAt") AS ts
      FROM "Invoice" i
      WHERE i."organizationId" = $1
    ),
    paid AS (
      SELECT
        inv.id, inv.total, inv.status, inv.ts,
        COALESCE((
          SELECT ${p("p")}
          FROM "Payment" p
          WHERE p.status = 'COMPLETED'
            AND (p."invoiceId" = inv.id
              OR (inv."appointmentId" IS NOT NULL AND p."appointmentId" = inv."appointmentId" AND p."invoiceId" IS NULL))
        ), 0) AS paid
      FROM inv
    )
    SELECT
      COALESCE(SUM(total) FILTER (
        WHERE status <> 'VOID'
          AND ts >= date_trunc('month', NOW())
          AND ts < date_trunc('month', NOW()) + INTERVAL '1 month'
      ), 0)::text AS "billedTotal",
      COALESCE(SUM(LEAST(paid, total)) FILTER (
        WHERE status <> 'VOID'
          AND ts >= date_trunc('month', NOW())
          AND ts < date_trunc('month', NOW()) + INTERVAL '1 month'
      ), 0)::text AS "paidTotal",
      COALESCE(SUM(GREATEST(total - paid, 0)) FILTER (
        WHERE status <> 'VOID'
          AND ts >= date_trunc('month', NOW())
          AND ts < date_trunc('month', NOW()) + INTERVAL '1 month'
      ), 0)::text AS "unpaidTotal",
      COUNT(*) FILTER (
        WHERE status <> 'VOID'
          AND ts >= date_trunc('month', NOW())
          AND ts < date_trunc('month', NOW()) + INTERVAL '1 month'
      )::text AS "monthCount",
      COALESCE(SUM(total) FILTER (
        WHERE status <> 'VOID'
          AND ts >= date_trunc('month', NOW()) - INTERVAL '1 month'
          AND ts < date_trunc('month', NOW())
      ), 0)::text AS "prevMonthBilled",
      COALESCE(SUM(total) FILTER (
        WHERE status = 'VOID'
          AND ts >= date_trunc('month', NOW())
          AND ts < date_trunc('month', NOW()) + INTERVAL '1 month'
      ), 0)::text AS "voidMonthTotal",
      COUNT(*) FILTER (
        WHERE status = 'VOID'
          AND ts >= date_trunc('month', NOW())
          AND ts < date_trunc('month', NOW()) + INTERVAL '1 month'
      )::text AS "voidMonthCount",
      COUNT(*) FILTER (
        WHERE status <> 'VOID'
          AND ts >= date_trunc('month', NOW())
          AND ts < date_trunc('month', NOW()) + INTERVAL '1 month'
          AND paid + 0.01 >= total
      )::text AS "paidCount",
      COUNT(*) FILTER (
        WHERE status <> 'VOID'
          AND ts >= date_trunc('month', NOW())
          AND ts < date_trunc('month', NOW()) + INTERVAL '1 month'
          AND paid > 0.001 AND paid + 0.01 < total
      )::text AS "partialCount",
      COUNT(*) FILTER (
        WHERE status <> 'VOID'
          AND ts >= date_trunc('month', NOW())
          AND ts < date_trunc('month', NOW()) + INTERVAL '1 month'
          AND paid <= 0.001
      )::text AS "unpaidCount"
     FROM paid`,[t]),e=o[0],a=Math.round(100*(parseFloat(e?.billedTotal??"0")||0))/100,n=Math.round(100*(parseFloat(e?.paidTotal??"0")||0))/100,i=Math.round(100*(parseFloat(e?.prevMonthBilled??"0")||0))/100,s=parseInt(e?.monthCount??"0",10)||0;return{billedTotal:a,paidTotal:n,unpaidTotal:Math.round(100*(parseFloat(e?.unpaidTotal??"0")||0))/100,monthCount:s,prevMonthBilled:i,evolutionPct:i>0?Math.round((a-i)/i*1e3)/10:null,voidMonthTotal:Math.round(100*(parseFloat(e?.voidMonthTotal??"0")||0))/100,voidMonthCount:parseInt(e?.voidMonthCount??"0",10)||0,paidCount:parseInt(e?.paidCount??"0",10)||0,partialCount:parseInt(e?.partialCount??"0",10)||0,unpaidCount:parseInt(e?.unpaidCount??"0",10)||0,avgBasket:s>0?Math.round(a/s*100)/100:null,recoveryPct:a>0?Math.round(n/a*1e3)/10:null}}async function l(t,o){let e=['i."organizationId" = $1'],a=[t],n=2;o.customerId&&(e.push(`i."customerId" = $${n}`),a.push(o.customerId),n++),o.status&&(e.push(`i.status = $${n}::"InvoiceStatus"`),a.push(o.status),n++),o.search&&(e.push(`(i.number ILIKE $${n} OR i."customerNameSnapshot" ILIKE $${n} OR COALESCE(i."customerPhoneSnapshot", '') ILIKE $${n})`),a.push(`%${o.search}%`),n++),o.from&&(e.push(`COALESCE(i."issuedAt", i."createdAt") >= $${n}::timestamptz`),a.push(o.from),n++),o.to&&(e.push(`COALESCE(i."issuedAt", i."createdAt") < ($${n}::date + INTERVAL '1 day')`),a.push(o.to),n++),o.method&&(e.push(`EXISTS (
      SELECT 1 FROM "Payment" p
      WHERE p.status = 'COMPLETED' AND p.method = $${n}::"PaymentMethod"
        AND (p."invoiceId" = i.id OR (i."appointmentId" IS NOT NULL AND p."appointmentId" = i."appointmentId"))
    )`),a.push(o.method),n++);let i=e.join(" AND "),s=(o.page-1)*o.limit,[r,d,u]=await Promise.all([R.query(`SELECT COUNT(*)::int AS total FROM "Invoice" i WHERE ${i}`,a),R.query(`SELECT
        i.id, i.number, i."customerId", i."customerNameSnapshot", i."customerPhoneSnapshot",
        i."appointmentId", i.status::text, i.subtotal::text, i."discountTotal"::text,
        i.total::text, i."issuedAt", i."createdAt",
        (SELECT ii."nameSnapshot" FROM "InvoiceItem" ii
          WHERE ii."invoiceId" = i.id ORDER BY ii."sortOrder", ii.id LIMIT 1) AS "firstItemName",
        NULLIF(TRIM(CONCAT(COALESCE(st."firstName", ''), ' ', COALESCE(st."lastName", ''))), '') AS "staffName"
       FROM "Invoice" i
       LEFT JOIN "Appointment" a ON a.id = i."appointmentId"
       LEFT JOIN "Staff" st ON st.id = a."staffId"
       WHERE ${i}
       ORDER BY COALESCE(i."issuedAt", i."createdAt") DESC
       LIMIT $${n} OFFSET $${n+1}`,[...a,o.limit,s]),E(t)]),p=[];for(let t of d.rows){let{paid:o,methods:e}=await I(t.id,t.appointmentId??null);p.push(c(t,o,e))}return{items:p,total:r.rows[0]?.total??0,kpis:u}}async function S(t){let{rows:o}=await R.query(`SELECT id, "serviceId", "nameSnapshot", "unitPriceSnapshot"::text,
            quantity::text, discount::text, total::text, "sortOrder"
     FROM "InvoiceItem"
     WHERE "invoiceId" = $1
     ORDER BY "sortOrder", id`,[t]);return o.map(t=>({id:t.id,serviceId:t.serviceId,nameSnapshot:t.nameSnapshot,unitPriceSnapshot:parseFloat(t.unitPriceSnapshot)||0,quantity:parseFloat(t.quantity)||0,discount:parseFloat(t.discount)||0,total:parseFloat(t.total)||0,sortOrder:t.sortOrder}))}async function N(t,o){let{rows:e}=await R.query(`SELECT
      i.id, i.number, i."customerId", i."customerNameSnapshot",
      i."customerPhoneSnapshot", i."appointmentId", i.status::text,
      i."orgNameSnapshot", i."orgAddressSnapshot", i."orgPhoneSnapshot", i."orgIceSnapshot",
      i.subtotal::text, i."discountTotal"::text, i.total::text, i.notes,
      i."promotionId", i."promotionNameSnapshot", i."promotionCodeSnapshot", i."promotionTypeSnapshot",
      i."issuedAt", i."voidedAt", i."voidReason", i."createdAt", i."updatedAt"
     FROM "Invoice" i
     WHERE i.id = $1 AND i."organizationId" = $2`,[o,t]);if(!e[0])return null;let[a,n]=await Promise.all([S(o),I(o,e[0].appointmentId)]),i=c(e[0],n.paid,n.methods);return i.status!==e[0].status&&"VOID"!==e[0].status&&"DRAFT"!==e[0].status&&await R.query('UPDATE "Invoice" SET status = $1::"InvoiceStatus", "updatedAt" = NOW() WHERE id = $2',[i.status,o]),{...i,orgNameSnapshot:e[0].orgNameSnapshot,orgAddressSnapshot:e[0].orgAddressSnapshot,orgPhoneSnapshot:e[0].orgPhoneSnapshot,orgIceSnapshot:e[0].orgIceSnapshot,customerNameSnapshot:e[0].customerNameSnapshot,customerPhoneSnapshot:e[0].customerPhoneSnapshot,promotionId:e[0].promotionId??null,promotionNameSnapshot:e[0].promotionNameSnapshot??null,promotionCodeSnapshot:e[0].promotionCodeSnapshot??null,promotionTypeSnapshot:e[0].promotionTypeSnapshot??null,notes:e[0].notes,voidedAt:e[0].voidedAt?.toISOString()??null,voidReason:e[0].voidReason,items:a,updatedAt:e[0].updatedAt.toISOString()}}async function A(t,o,a){let n=`apt:${o.appointmentId}:invoice`,i=await R.query(`SELECT id FROM "Invoice"
     WHERE "organizationId" = $1 AND "idempotencyKey" = $2`,[t,n]);if(i.rows[0]){let o=await N(t,i.rows[0].id);if(!o)throw Error("NOT_FOUND");return await h(t,o.id),{invoice:await N(t,o.id),created:!1}}let s=await R.query(`SELECT
      a.id, a."customerId", a."serviceId", a.price::text, a.status::text, a."promotionId",
      s.name AS "serviceName", s.category AS "serviceCategory", s.price::text AS "servicePrice",
      c."firstName" AS "customerFirst", c."lastName" AS "customerLast", c.phone AS "customerPhone"
     FROM "Appointment" a
     JOIN "Service" s ON s.id = a."serviceId"
     JOIN "Customer" c ON c.id = a."customerId"
     WHERE a.id = $1 AND a."organizationId" = $2`,[o.appointmentId,t]);if(!s.rows[0])throw Error("APPOINTMENT_NOT_FOUND");let r=await R.query('SELECT name, address, phone, ice FROM "Organization" WHERE id = $1',[t]);if(!r.rows[0])throw Error("ORG_NOT_FOUND");let p=parseFloat(s.rows[0].price)||0,c=parseFloat(s.rows[0].servicePrice??"")||0,E=0,l=null,S=o.promotionId||s.rows[0].promotionId,A=o.promotionCode;if(S||A){let{computePromotionDiscount:o}=await e.e(5750).then(e.bind(e,15750)),a=await o({organizationId:t,promotionId:S,promotionCode:A,serviceId:s.rows[0].serviceId,serviceCategory:s.rows[0].serviceCategory,customerId:s.rows[0].customerId,amount:c>0?Math.min(p,c):p});a&&(E=a.discountAmount,l={promotionId:a.promotionId,name:a.name,code:a.code,type:a.type})}else null!=o.discountTotal&&o.discountTotal>0&&(E=Math.min(p,Math.max(0,o.discountTotal)));let O=Math.max(0,Math.round((p-E)*100)/100),T=await R.connect(),$="";try{await T.query("BEGIN");let i=await u(t,T);$=d("inv");let c=`${s.rows[0].customerFirst} ${s.rows[0].customerLast}`.trim();if(await T.query(`INSERT INTO "Invoice" (
        id, "organizationId", number, "appointmentId", "customerId", status,
        "orgNameSnapshot", "orgAddressSnapshot", "orgPhoneSnapshot", "orgIceSnapshot",
        "customerNameSnapshot", "customerPhoneSnapshot",
        subtotal, "discountTotal", total,
        "promotionId", "promotionNameSnapshot", "promotionCodeSnapshot", "promotionTypeSnapshot",
        notes, "issuedAt", "createdById", "idempotencyKey", "updatedAt"
      ) VALUES (
        $1,$2,$3,$4,$5,'ISSUED'::"InvoiceStatus",
        $6,$7,$8,$9,$10,$11,
        $12,$13,$14,
        $15,$16,$17,$18,
        $19,NOW(),$20,$21,NOW()
      )`,[$,t,i,o.appointmentId,s.rows[0].customerId,r.rows[0].name,r.rows[0].address,r.rows[0].phone,r.rows[0].ice,c,s.rows[0].customerPhone,p,E,O,l?.promotionId??null,l?.name??null,l?.code??null,l?.type??null,o.notes??null,a??null,n]),await T.query(`INSERT INTO "InvoiceItem" (
        id, "invoiceId", "serviceId", "nameSnapshot", "unitPriceSnapshot",
        quantity, discount, total, "sortOrder"
      ) VALUES ($1,$2,$3,$4,$5,1,$6,$7,0)`,[d("ini"),$,s.rows[0].serviceId,s.rows[0].serviceName,p,E,O]),l&&E>0){let{recordPromotionUsage:a}=await e.e(5750).then(e.bind(e,15750));await a({organizationId:t,promotionId:l.promotionId,customerId:s.rows[0].customerId,appointmentId:o.appointmentId,invoiceId:$,discountAmount:E,idempotencyKey:`apt:${o.appointmentId}:promo`,client:T})}await T.query(`UPDATE "Payment" SET "invoiceId" = $1
       WHERE "appointmentId" = $2 AND "organizationId" = $3 AND "invoiceId" IS NULL`,[$,o.appointmentId,t]);let S=await I($,o.appointmentId,T),N=m(O,S.paid,"ISSUED");await T.query('UPDATE "Invoice" SET status = $1::"InvoiceStatus", "updatedAt" = NOW() WHERE id = $2',[N,$]),await T.query("COMMIT")}catch(o){if(await T.query("ROLLBACK"),"object"==typeof o&&null!==o&&"code"in o&&"23505"===o.code){let o=await R.query(`SELECT id FROM "Invoice"
         WHERE "organizationId" = $1 AND "idempotencyKey" = $2`,[t,n]);if(o.rows[0])return{invoice:await N(t,o.rows[0].id),created:!1}}throw o}finally{T.release()}let D=await N(t,$);if(!D)throw Error("NOT_FOUND");return{invoice:D,created:!0}}async function h(t,o){let e=await R.query(`SELECT "appointmentId", total::text, status::text FROM "Invoice"
     WHERE id = $1 AND "organizationId" = $2`,[o,t]);if(!e.rows[0]||"VOID"===e.rows[0].status)return;e.rows[0].appointmentId&&await R.query(`UPDATE "Payment" SET "invoiceId" = $1
       WHERE "appointmentId" = $2 AND "organizationId" = $3 AND "invoiceId" IS NULL`,[o,e.rows[0].appointmentId,t]);let a=await I(o,e.rows[0].appointmentId),n=parseFloat(e.rows[0].total)||0,i=m(n,a.paid,e.rows[0].status);await R.query('UPDATE "Invoice" SET status = $1::"InvoiceStatus", "updatedAt" = NOW() WHERE id = $2',[i,o])}async function O(t,o,e){let a=await N(t,o);if(!a)throw Error("NOT_FOUND");if("VOID"===a.status)return a;await R.query(`UPDATE "Invoice"
     SET status = 'VOID'::"InvoiceStatus",
         "voidedAt" = NOW(),
         "voidReason" = $1,
         "updatedAt" = NOW()
     WHERE id = $2 AND "organizationId" = $3`,[e.reason,o,t]);let n=await N(t,o);if(!n)throw Error("NOT_FOUND");return n}async function T(t,o){let{rows:e}=await R.query(`SELECT id FROM "Invoice"
     WHERE "organizationId" = $1 AND "appointmentId" = $2 AND status <> 'VOID'`,[t,o]);for(let o of e)await h(t,o.id)}async function $(t){let{createCommissionForAppointment:o}=await Promise.resolve().then(e.bind(e,40836)),{consumePackageSessionForAppointment:a}=await e.e(8114).then(e.bind(e,88114));await A(t.organizationId,{appointmentId:t.appointmentId},t.userId),await o({organizationId:t.organizationId,appointmentId:t.appointmentId});let n=await R.query('SELECT "customerId" FROM "Appointment" WHERE id = $1 AND "organizationId" = $2',[t.appointmentId,t.organizationId]);n.rows[0]&&await a({organizationId:t.organizationId,appointmentId:t.appointmentId,customerId:n.rows[0].customerId,serviceId:t.serviceId})}a()}catch(t){a(t)}})}};