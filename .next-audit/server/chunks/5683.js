"use strict";!function(){try{var t="undefined"!=typeof window?window:"undefined"!=typeof global?global:"undefined"!=typeof self?self:{},e=(new t.Error).stack;e&&(t._sentryDebugIds=t._sentryDebugIds||{},t._sentryDebugIds[e]="d9425f92-594e-4d3c-927f-a93ddc7ea221",t._sentryDebugIdIdentifier="sentry-dbid-d9425f92-594e-4d3c-927f-a93ddc7ea221")}catch(t){}}(),exports.id=5683,exports.ids=[5683],exports.modules={55683:(t,e,a)=>{a.a(t,async(t,o)=>{try{a.d(e,{A5:()=>y,Fc:()=>O,JP:()=>g,KC:()=>c,LY:()=>E,P1:()=>T,Tt:()=>S,adjustCommissionsForRefund:()=>w,createCommissionForAppointment:()=>f,createCommissionForPosSale:()=>C,eu:()=>I,oz:()=>L,tk:()=>A,xd:()=>N});var n=a(84770),i=a(8678),r=a(90831),s=a(66085),d=t([i,s]);[i,s]=d.then?(await d)():d;let $=(0,r.S)(new i.Pool({connectionString:process.env.DATABASE_URL}));function m(t){return`${t}_${(0,n.randomBytes)(8).toString("hex")}`}function u(t){return"object"==typeof t&&null!==t&&"code"in t&&"23505"===t.code}async function c(t,e){let a=await $.query(`SELECT id FROM "Staff"
     WHERE "organizationId" = $1 AND "deletedAt" IS NULL
       AND lower(COALESCE(email,'')) = lower($2)
     LIMIT 1`,[t,e.email]);if(a.rows[0])return a.rows[0].id;let o=await $.query(`SELECT id FROM "Staff"
     WHERE "organizationId" = $1 AND "deletedAt" IS NULL
       AND lower("firstName") = lower($2) AND lower("lastName") = lower($3)
     LIMIT 1`,[t,e.firstName,e.lastName]);return o.rows[0]?.id??null}async function p(t,e,a){let{rows:o}=await $.query(`SELECT id, status::text, "closedAt", "closedById"
     FROM "CommissionPeriod"
     WHERE "organizationId" = $1 AND year = $2 AND month = $3`,[t,e,a]);return o[0]?{id:o[0].id,year:e,month:a,status:o[0].status,closedAt:o[0].closedAt?new Date(o[0].closedAt).toISOString():null,closedById:o[0].closedById}:{id:null,year:e,month:a,status:"OPEN",closedAt:null,closedById:null}}function l(t,e){let a=parseFloat(String(t.commissionAmount))||0,o=parseFloat(String(t.adjustmentsTotal??0))||0,n=null!=t.customerName?String(t.customerName).trim():"";return{id:String(t.id),appointmentId:null!=t.appointmentId?String(t.appointmentId):null,posSaleId:null!=t.posSaleId?String(t.posSaleId):null,staffId:String(t.staffId),staffName:String(t.staffNameSnapshot??t.staffName??""),serviceId:null!=t.serviceId?String(t.serviceId):null,serviceName:String(t.serviceNameSnapshot??t.serviceName??""),customerName:n||null,appointmentAt:new Date(t.appointmentAt).toISOString(),baseAmount:parseFloat(String(t.baseAmount))||0,type:t.type,percentageSnapshot:null!=t.percentageSnapshot?parseFloat(String(t.percentageSnapshot)):null,fixedSnapshot:null!=t.fixedSnapshot?parseFloat(String(t.fixedSnapshot)):null,commissionAmount:a,adjustmentsTotal:o,netAmount:Math.round((a+o)*100)/100,paid:!!t.paid,paidAt:t.paidAt?new Date(t.paidAt).toISOString():null,periodClosed:e,createdAt:new Date(t.createdAt).toISOString()}}let R=`
  SELECT
    cr.id, cr."appointmentId", cr."posSaleId", cr."staffId", cr."serviceId",
    cr."serviceNameSnapshot", cr."staffNameSnapshot",
    cr."baseAmount"::text, cr.type::text,
    cr."percentageSnapshot"::text, cr."fixedSnapshot"::text,
    cr."commissionAmount"::text, cr.paid, cr."paidAt",
    cr."createdAt",
    COALESCE(a."startAt", ps."createdAt", cr."createdAt") AS "appointmentAt",
    NULLIF(TRIM(CONCAT(
      COALESCE(cu."firstName", cu_pos."firstName", ''), ' ',
      COALESCE(cu."lastName", cu_pos."lastName", '')
    )), '') AS "customerName",
    COALESCE((
      SELECT SUM(adj.amount) FROM "CommissionAdjustment" adj
      WHERE adj."commissionRecordId" = cr.id
    ), 0)::text AS "adjustmentsTotal"
  FROM "CommissionRecord" cr
  LEFT JOIN "Appointment" a ON a.id = cr."appointmentId"
  LEFT JOIN "Customer" cu ON cu.id = a."customerId"
  LEFT JOIN "PosSale" ps ON ps.id = cr."posSaleId"
  LEFT JOIN "Customer" cu_pos ON cu_pos.id = ps."customerId"
`;async function E(t,e){let a=function(t,e,a,o=new Date){let n=t=>{let e=new Date(t);return e.setHours(0,0,0,0),e},i=t=>{let e=n(t);return e.setDate(e.getDate()+1),e};if("custom"===t&&e&&a){let t=n(new Date(e)),o=i(new Date(a));return{from:t,to:o,year:t.getFullYear(),month:t.getMonth()+1}}if("today"===t){let t=n(o);return{from:t,to:i(o),year:t.getFullYear(),month:t.getMonth()+1}}if("week"===t){let t=n(o),e=t.getDay();t.setDate(t.getDate()-(0===e?6:e-1));let a=new Date(t);return a.setDate(a.getDate()+7),{from:t,to:a,year:o.getFullYear(),month:o.getMonth()+1}}if("prev_month"===t){let t=new Date(o.getFullYear(),o.getMonth()-1,1),e=new Date(o.getFullYear(),o.getMonth(),1);return{from:t,to:e,year:t.getFullYear(),month:t.getMonth()+1}}let r=new Date(o.getFullYear(),o.getMonth(),1),s=new Date(o.getFullYear(),o.getMonth()+1,1);return{from:r,to:s,year:r.getFullYear(),month:r.getMonth()+1}}(e.preset,e.from,e.to),o=await p(t,a.year,a.month),n="CLOSED"===o.status,i=['cr."organizationId" = $1','COALESCE(a."startAt", ps."createdAt", cr."createdAt") >= $2','COALESCE(a."startAt", ps."createdAt", cr."createdAt") < $3'],r=[t,a.from,a.to],s=4,d=e.forceStaffId||e.staffId;d&&(i.push(`cr."staffId" = $${s}`),r.push(d),s++),e.serviceId&&(i.push(`cr."serviceId" = $${s}`),r.push(e.serviceId),s++),"paid"===e.paid&&i.push("cr.paid = true"),"unpaid"===e.paid&&i.push("cr.paid = false"),e.search&&(i.push(`(cr."serviceNameSnapshot" ILIKE $${s} OR cr."staffNameSnapshot" ILIKE $${s}
        OR CONCAT(COALESCE(cu."firstName", cu_pos."firstName", ''), ' ', COALESCE(cu."lastName", cu_pos."lastName", '')) ILIKE $${s})`),r.push(`%${e.search}%`),s++);let m=i.join(" AND "),u=(e.page-1)*e.limit,c=`
       FROM "CommissionRecord" cr
       LEFT JOIN "Appointment" a ON a.id = cr."appointmentId"
       LEFT JOIN "Customer" cu ON cu.id = a."customerId"
       LEFT JOIN "PosSale" ps ON ps.id = cr."posSaleId"
       LEFT JOIN "Customer" cu_pos ON cu_pos.id = ps."customerId"`,[E,S,A,f]=await Promise.all([$.query(`SELECT COUNT(*)::int AS total
       ${c}
       WHERE ${m}`,r),$.query(`${R}
       WHERE ${m}
       ORDER BY COALESCE(a."startAt", ps."createdAt", cr."createdAt") DESC, cr."createdAt" DESC
       LIMIT $${s} OFFSET $${s+1}`,[...r,e.limit,u]),$.query(`SELECT
         COALESCE(SUM(cr."commissionAmount" + COALESCE(adj.t, 0)), 0)::text AS "commissionTotal",
         COALESCE(SUM(cr."baseAmount"), 0)::text AS "baseTotal",
         COUNT(*)::int AS count,
         COALESCE(SUM(CASE WHEN cr.paid THEN cr."commissionAmount" + COALESCE(adj.t, 0) ELSE 0 END), 0)::text AS "paidTotal",
         COALESCE(SUM(CASE WHEN NOT cr.paid THEN cr."commissionAmount" + COALESCE(adj.t, 0) ELSE 0 END), 0)::text AS "unpaidTotal",
         COUNT(*) FILTER (WHERE cr.paid)::int AS "paidCount",
         COUNT(*) FILTER (WHERE NOT cr.paid)::int AS "unpaidCount",
         CASE WHEN SUM(cr."baseAmount") > 0
           THEN (SUM(
             CASE WHEN cr.type = 'PERCENTAGE' AND cr."percentageSnapshot" IS NOT NULL
               THEN cr."baseAmount" * cr."percentageSnapshot"
               ELSE 0 END
           ) / NULLIF(SUM(
             CASE WHEN cr.type = 'PERCENTAGE' THEN cr."baseAmount" ELSE 0 END
           ), 0))::text
           ELSE NULL END AS "weightedRate"
       ${c}
       LEFT JOIN LATERAL (
         SELECT SUM(amount) AS t FROM "CommissionAdjustment"
         WHERE "commissionRecordId" = cr.id
       ) adj ON true
       WHERE ${m}`,r),$.query(`SELECT
         cr."staffId",
         cr."staffNameSnapshot" AS "staffName",
         COALESCE(SUM(cr."commissionAmount" + COALESCE(adj.t, 0)), 0)::text AS "commissionTotal",
         COALESCE(SUM(cr."baseAmount"), 0)::text AS "baseTotal",
         COUNT(*)::int AS count,
         COALESCE(SUM(CASE WHEN cr.paid THEN cr."commissionAmount" + COALESCE(adj.t, 0) ELSE 0 END), 0)::text AS "paidTotal",
         COALESCE(SUM(CASE WHEN NOT cr.paid THEN cr."commissionAmount" + COALESCE(adj.t, 0) ELSE 0 END), 0)::text AS "unpaidTotal"
       ${c}
       LEFT JOIN LATERAL (
         SELECT SUM(amount) AS t FROM "CommissionAdjustment"
         WHERE "commissionRecordId" = cr.id
       ) adj ON true
       WHERE ${m}
       GROUP BY cr."staffId", cr."staffNameSnapshot"
       ORDER BY SUM(cr."commissionAmount" + COALESCE(adj.t, 0)) DESC`,r)]),N=Math.round(100*(parseFloat(A.rows[0]?.commissionTotal??"0")||0))/100,I=Math.round(100*(parseFloat(A.rows[0]?.baseTotal??"0")||0))/100,C=Math.round(100*(parseFloat(A.rows[0]?.paidTotal??"0")||0))/100,y=Math.round(100*(parseFloat(A.rows[0]?.unpaidTotal??"0")||0))/100,w=A.rows[0]?.count??0,O=A.rows[0]?.weightedRate!=null?Math.round(10*parseFloat(A.rows[0].weightedRate))/10:I>0&&N>0?Math.round(N/I*1e3)/10:null;return{items:S.rows.map(t=>l(t,n)),total:E.rows[0]?.total??0,kpis:{commissionTotal:N,baseTotal:I,count:w,avgRatePct:O,paidTotal:C,unpaidTotal:y,paidCount:A.rows[0]?.paidCount??0,unpaidCount:A.rows[0]?.unpaidCount??0,byStaff:f.rows.map(t=>({staffId:t.staffId,staffName:t.staffName,commissionTotal:Math.round(100*(parseFloat(t.commissionTotal)||0))/100,baseTotal:Math.round(100*(parseFloat(t.baseTotal)||0))/100,count:t.count,paidTotal:Math.round(100*(parseFloat(t.paidTotal)||0))/100,unpaidTotal:Math.round(100*(parseFloat(t.unpaidTotal)||0))/100}))},period:{from:a.from.toISOString(),to:a.to.toISOString(),preset:e.preset,year:a.year,month:a.month,status:o.status}}}async function S(t,e){let{rows:a}=await $.query(`${R}
     WHERE cr.id = $1 AND cr."organizationId" = $2`,[e,t]);if(!a[0])return null;let o=new Date(a[0].appointmentAt),n=await p(t,o.getFullYear(),o.getMonth()+1),i=l(a[0],"CLOSED"===n.status),r=await $.query(`SELECT id, amount::text, reason, "paymentId", "createdById", "createdAt"
     FROM "CommissionAdjustment"
     WHERE "commissionRecordId" = $1
     ORDER BY "createdAt" ASC`,[e]);return{...i,adjustments:r.rows.map(t=>({id:t.id,amount:parseFloat(t.amount)||0,reason:t.reason,paymentId:t.paymentId,createdById:t.createdById,createdAt:new Date(t.createdAt).toISOString()}))}}async function A(t,e,a){let o=await $.query(`SELECT "firstName", "lastName" FROM "Staff"
     WHERE id = $1 AND "organizationId" = $2 AND "deletedAt" IS NULL`,[e,t]);if(!o.rows[0])return null;let n=new Date,i=a?.year??n.getFullYear(),r=a?.month??n.getMonth()+1,s=new Date(i,r-1,1).toLocaleDateString("fr-FR",{month:"long",year:"numeric"}),d=t=>String(t).padStart(2,"0"),m=new Date(i,r,0).getDate(),u=`${i}-${d(r)}-01`,c=`${i}-${d(r)}-${d(m)}`,{items:p,kpis:l}=await E(t,{page:1,limit:200,preset:"custom",from:u,to:c,forceStaffId:e});return{staffId:e,staffName:`${o.rows[0].firstName} ${o.rows[0].lastName}`.trim(),periodLabel:s.charAt(0).toUpperCase()+s.slice(1),baseTotal:l.baseTotal,count:l.count,commissionTotal:Math.round(100*p.reduce((t,e)=>t+e.commissionAmount,0))/100,netTotal:l.commissionTotal,items:p}}async function f(t){let{organizationId:e,appointmentId:a}=t,o=await $.query(`SELECT
      a.status::text, a."staffId", a."serviceId", a.price::text,
      s.name AS "serviceName",
      st."firstName" AS "staffFirst", st."lastName" AS "staffLast"
     FROM "Appointment" a
     JOIN "Service" s ON s.id = a."serviceId"
     JOIN "Staff" st ON st.id = a."staffId"
     WHERE a.id = $1 AND a."organizationId" = $2`,[a,e]);if(!o.rows[0]||"COMPLETED"!==o.rows[0].status)return{created:0,skipped:0};let n=`apt:${a}:commission:${o.rows[0].staffId}`;if((await $.query(`SELECT 1 FROM "CommissionRecord"
     WHERE "organizationId" = $1 AND "idempotencyKey" = $2`,[e,n])).rows[0])return{created:0,skipped:1};let i=await $.query(`SELECT type::text, percentage::text, "fixedAmount"::text
     FROM "ServiceCommission"
     WHERE "serviceId" = $1 AND "staffId" = $2`,[o.rows[0].serviceId,o.rows[0].staffId]);if(!i.rows[0])return{created:0,skipped:0};let r=parseFloat(o.rows[0].price)||0,s=null!=i.rows[0].percentage?parseFloat(i.rows[0].percentage):null,d=null!=i.rows[0].fixedAmount?parseFloat(i.rows[0].fixedAmount):null,c=0;"PERCENTAGE"===i.rows[0].type&&null!=s?c=Math.round(s/100*r*100)/100:"FIXED"===i.rows[0].type&&null!=d&&(c=d);try{return await $.query(`INSERT INTO "CommissionRecord" (
        id, "organizationId", "appointmentId", "staffId", "serviceId",
        "serviceNameSnapshot", "staffNameSnapshot", "baseAmount", type,
        "percentageSnapshot", "fixedSnapshot", "commissionAmount",
        "idempotencyKey", "updatedAt"
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9::"CommissionType",$10,$11,$12,$13,NOW()
      )`,[m("com"),e,a,o.rows[0].staffId,o.rows[0].serviceId,o.rows[0].serviceName,`${o.rows[0].staffFirst} ${o.rows[0].staffLast}`.trim(),r,i.rows[0].type,s,d,c,n]),{created:1,skipped:0}}catch(t){if(u(t))return{created:0,skipped:1};throw t}}async function N(t){let e=await $.query(`SELECT id, "organizationId", "productCommissionEnabled",
            "productCommissionRate"::text, "updatedAt"
     FROM "CommissionSettings" WHERE "organizationId" = $1`,[t]);if(e.rows[0]){let t=e.rows[0];return{id:t.id,organizationId:t.organizationId,productCommissionEnabled:t.productCommissionEnabled,productCommissionRate:parseFloat(t.productCommissionRate)||5,updatedAt:t.updatedAt.toISOString()}}let a=m("cset");return await $.query(`INSERT INTO "CommissionSettings" (
      id, "organizationId", "productCommissionEnabled", "productCommissionRate", "updatedAt"
    ) VALUES ($1,$2,false,5,NOW())
    ON CONFLICT ("organizationId") DO NOTHING`,[a,t]),N(t)}async function I(t,e,a){await N(t);let o=null!=e.productCommissionRate?Math.min(100,Math.max(0,Math.round(100*e.productCommissionRate)/100)):void 0;return await $.query(`UPDATE "CommissionSettings" SET
       "productCommissionEnabled" = COALESCE($2, "productCommissionEnabled"),
       "productCommissionRate" = COALESCE($3, "productCommissionRate"),
       "updatedAt" = NOW()
     WHERE "organizationId" = $1`,[t,e.productCommissionEnabled??null,o??null]),await (0,s.writeAuditLog)({organizationId:t,actorId:a.id,actorName:a.name,entityType:"CommissionSettings",entityId:t,action:"COMMISSION_SETTINGS_UPDATED",after:{productCommissionEnabled:e.productCommissionEnabled,productCommissionRate:o}}),N(t)}async function C(t){let e=await N(t.organizationId);if(!e.productCommissionEnabled||e.productCommissionRate<=0)return{created:0,skipped:0};let a=await $.query(`SELECT id, total::text, status::text FROM "PosSale"
     WHERE id = $1 AND "organizationId" = $2`,[t.posSaleId,t.organizationId]);if(!a.rows[0]||"COMPLETED"!==a.rows[0].status)return{created:0,skipped:0};let o=await c(t.organizationId,t.soldByUser);if(!o)return{created:0,skipped:0};let n=await $.query('SELECT "firstName", "lastName" FROM "Staff" WHERE id = $1',[o]);if(!n.rows[0])return{created:0,skipped:0};let i=`pos:${t.posSaleId}:commission:${o}`;if((await $.query(`SELECT 1 FROM "CommissionRecord"
     WHERE "organizationId" = $1 AND "idempotencyKey" = $2`,[t.organizationId,i])).rows[0])return{created:0,skipped:1};let r=parseFloat(a.rows[0].total)||0,s=e.productCommissionRate,d=Math.round(s/100*r*100)/100;if(d<=0)return{created:0,skipped:0};try{return await $.query(`INSERT INTO "CommissionRecord" (
        id, "organizationId", "appointmentId", "posSaleId", "staffId", "serviceId",
        "serviceNameSnapshot", "staffNameSnapshot", "baseAmount", type,
        "percentageSnapshot", "fixedSnapshot", "commissionAmount",
        "idempotencyKey", "updatedAt"
      ) VALUES (
        $1,$2,NULL,$3,$4,NULL,$5,$6,$7,'PERCENTAGE'::"CommissionType",$8,NULL,$9,$10,NOW()
      )`,[m("com"),t.organizationId,t.posSaleId,o,"Vente produits",`${n.rows[0].firstName} ${n.rows[0].lastName}`.trim(),r,s,d,i]),{created:1,skipped:0}}catch(t){if(u(t))return{created:0,skipped:1};throw t}}async function y(t,e,a,o){let n=await S(t,e);if(!n)throw Error("NOT_FOUND");let i=a.idempotencyKey??`adj:${e}:${a.amount}:${Date.now()}`;if(a.idempotencyKey&&(await $.query(`SELECT id FROM "CommissionAdjustment"
       WHERE "organizationId" = $1 AND "idempotencyKey" = $2`,[t,a.idempotencyKey])).rows[0]){let a=await S(t,e);if(a)return a}let r=await $.connect();try{await r.query("BEGIN");let d=m("cadj");await r.query(`INSERT INTO "CommissionAdjustment" (
        id, "organizationId", "commissionRecordId", amount, reason,
        "paymentId", "createdById", "idempotencyKey"
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,[d,t,e,a.amount,a.reason,a.paymentId??null,o.id,i]),await (0,s.writeAuditLog)({organizationId:t,actorId:o.id,actorName:o.name,entityType:"CommissionRecord",entityId:e,action:"COMMISSION_ADJUSTMENT",before:{netAmount:n.netAmount,commissionAmount:n.commissionAmount},after:{adjustment:a.amount,netAmount:Math.round((n.netAmount+a.amount)*100)/100,reason:a.reason},client:r}),await r.query("COMMIT")}catch(o){if(await r.query("ROLLBACK"),u(o)&&a.idempotencyKey){let a=await S(t,e);if(a)return a}throw o}finally{r.release()}let d=await S(t,e);if(!d)throw Error("NOT_FOUND");return d}async function w(t){if(!t.appointmentId||t.refundAmount<=0)return;let{rows:e}=await $.query(`SELECT id, "commissionAmount"::text, "baseAmount"::text
     FROM "CommissionRecord"
     WHERE "organizationId" = $1 AND "appointmentId" = $2`,[t.organizationId,t.appointmentId]);if(!e.length)return;let a=Math.min(1,t.refundAmount/Math.max(t.originalPaymentAmount,.01));for(let o of e){let e=parseFloat(o.commissionAmount)||0,n=Math.round(-e*a*100)/100;0!==n&&await y(t.organizationId,o.id,{amount:n,reason:t.reason??"Remboursement cliente",paymentId:t.refundPaymentId,idempotencyKey:`refund:${t.refundPaymentId}:commission:${o.id}`},{id:t.actorId})}}async function O(t,e,a,o){let n=await p(t,e,a);if("CLOSED"===n.status)return n;let i=n.id??m("cper");return await $.query(`INSERT INTO "CommissionPeriod" (
      id, "organizationId", year, month, status, "closedAt", "closedById", "updatedAt"
    ) VALUES ($1,$2,$3,$4,'CLOSED'::"CommissionPeriodStatus",NOW(),$5,NOW())
    ON CONFLICT ("organizationId", year, month) DO UPDATE SET
      status = 'CLOSED'::"CommissionPeriodStatus",
      "closedAt" = NOW(),
      "closedById" = EXCLUDED."closedById",
      "updatedAt" = NOW()`,[i,t,e,a,o.id]),await (0,s.writeAuditLog)({organizationId:t,actorId:o.id,actorName:o.name,entityType:"CommissionPeriod",entityId:i,action:"CLOSE_PERIOD",before:{status:"OPEN",year:e,month:a},after:{status:"CLOSED",year:e,month:a}}),p(t,e,a)}async function T(t,e,a){let o=[...new Set(e.map(t=>t.trim()).filter(Boolean))].slice(0,200);if(!o.length)return{updated:0};let{rows:n}=await $.query(`UPDATE "CommissionRecord"
     SET paid = true, "paidAt" = NOW(), "updatedAt" = NOW()
     WHERE "organizationId" = $1 AND paid = false AND id = ANY($2::text[])
     RETURNING id`,[t,o]);return n.length&&await (0,s.writeAuditLog)({organizationId:t,actorId:a.id,actorName:a.name,entityType:"CommissionRecord",entityId:n[0].id,action:"MARK_PAID_BULK",before:{paid:!1,count:n.length},after:{paid:!0,ids:n.map(t=>t.id)}}),{updated:n.length}}async function L(t,e,a,o){let n=await S(t,e);if(!n)throw Error("NOT_FOUND");await $.query(`UPDATE "CommissionRecord"
     SET paid = $1, "paidAt" = CASE WHEN $1 THEN NOW() ELSE NULL END, "updatedAt" = NOW()
     WHERE id = $2 AND "organizationId" = $3`,[a,e,t]),await (0,s.writeAuditLog)({organizationId:t,actorId:o.id,actorName:o.name,entityType:"CommissionRecord",entityId:e,action:a?"MARK_PAID":"MARK_UNPAID",before:{paid:n.paid},after:{paid:a}});let i=await S(t,e);if(!i)throw Error("NOT_FOUND");return i}function g(t){let e=t.map(t=>[new Date(t.appointmentAt).toLocaleDateString("fr-FR"),t.staffName,t.serviceName,t.baseAmount.toFixed(2),t.type,t.percentageSnapshot??"",t.fixedSnapshot??"",t.commissionAmount.toFixed(2),t.adjustmentsTotal.toFixed(2),t.netAmount.toFixed(2),t.paid?"oui":"non"].join(";"));return["Date;Employ\xe9e;Service;Base MAD;Type;Taux %;Fixe MAD;Commission MAD;Ajustements MAD;Net MAD;Pay\xe9e",...e].join("\n")}o()}catch(t){o(t)}})}};