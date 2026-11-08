"use strict";exports.id=5750,exports.ids=[5750],exports.modules={15750:(t,o,e)=>{e.a(t,async(t,n)=>{try{e.d(o,{Vi:()=>l,aR:()=>E,computePromotionDiscount:()=>c,kb:()=>A,recordPromotionUsage:()=>I});var i=e(84770),r=e(8678),a=e(2192),s=t([r,a]);[r,a]=s.then?(await s)():s;let S=new r.Pool({connectionString:process.env.DATABASE_URL});function u(t){return`${t}_${(0,i.randomBytes)(8).toString("hex")}`}function d(t){return{id:String(t.id),name:String(t.name),code:t.code??null,type:t.type,status:t.status,value:null!=t.value?parseFloat(String(t.value)):null,serviceId:t.serviceId??null,category:t.category??null,customerId:t.customerId??null,minAmount:null!=t.minAmount?parseFloat(String(t.minAmount)):null,maxUses:null!=t.maxUses?Number(t.maxUses):null,maxUsesPerCustomer:null!=t.maxUsesPerCustomer?Number(t.maxUsesPerCustomer):null,usageCount:Number(t.usageCount)||0,monthUses:Number(t.monthUses)||0,monthDiscount:null!=t.monthDiscount?parseFloat(String(t.monthDiscount)):0,monthRevenue:null!=t.monthRevenue?parseFloat(String(t.monthRevenue)):0,startsAt:t.startsAt?new Date(t.startsAt).toISOString():null,endsAt:t.endsAt?new Date(t.endsAt).toISOString():null,timeStart:t.timeStart??null,timeEnd:t.timeEnd??null,weekdays:t.weekdays??null,description:t.description??null}}async function m(t){let{rows:o}=await S.query(`SELECT
      (SELECT COUNT(*)::int FROM "Promotion"
       WHERE "organizationId" = $1 AND status = 'ACTIVE' AND "deletedAt" IS NULL) AS "activeCount",
      (SELECT COUNT(*)::int FROM "Promotion"
       WHERE "organizationId" = $1 AND "deletedAt" IS NULL) AS "totalCount",
      (SELECT COUNT(*)::int FROM "Promotion"
       WHERE "organizationId" = $1 AND "deletedAt" IS NULL
         AND status IN ('INACTIVE','EXPIRED')) AS "archivedCount",
      (SELECT COUNT(*)::int FROM "PromotionUsage"
       WHERE "organizationId" = $1
         AND "createdAt" >= date_trunc('month', NOW())) AS "usedThisMonth",
      COALESCE((SELECT SUM("discountAmount") FROM "PromotionUsage"
        WHERE "organizationId" = $1
          AND "createdAt" >= date_trunc('month', NOW())), 0)::text AS "discountTotalMonth",
      COALESCE((SELECT SUM(i.total) FROM "Invoice" i
        WHERE i."organizationId" = $1 AND i."promotionId" IS NOT NULL
          AND i."issuedAt" >= date_trunc('month', NOW())
          AND i.status <> 'VOID'), 0)::text AS "estimatedRevenueMonth",
      (SELECT COUNT(DISTINCT "customerId")::int FROM "PromotionUsage"
       WHERE "organizationId" = $1
         AND "createdAt" >= date_trunc('month', NOW())
         AND "customerId" IS NOT NULL) AS "customersTouchedMonth",
      (SELECT COUNT(*)::int FROM "PromotionUsage"
       WHERE "organizationId" = $1
         AND "createdAt" >= date_trunc('month', NOW()) - interval '1 month'
         AND "createdAt" < date_trunc('month', NOW())) AS "usedPrevMonth",
      COALESCE((SELECT SUM("discountAmount") FROM "PromotionUsage"
        WHERE "organizationId" = $1
          AND "createdAt" >= date_trunc('month', NOW()) - interval '1 month'
          AND "createdAt" < date_trunc('month', NOW())), 0)::text AS "discountPrevMonth",
      COALESCE((SELECT SUM(i.total) FROM "Invoice" i
        WHERE i."organizationId" = $1 AND i."promotionId" IS NOT NULL
          AND i."issuedAt" >= date_trunc('month', NOW()) - interval '1 month'
          AND i."issuedAt" < date_trunc('month', NOW())
          AND i.status <> 'VOID'), 0)::text AS "revenuePrevMonth"`,[t]);return{activeCount:o[0]?.activeCount??0,usedThisMonth:o[0]?.usedThisMonth??0,discountTotalMonth:Math.round(100*(parseFloat(o[0]?.discountTotalMonth??"0")||0))/100,estimatedRevenueMonth:Math.round(100*(parseFloat(o[0]?.estimatedRevenueMonth??"0")||0))/100,customersTouchedMonth:o[0]?.customersTouchedMonth??0,usedPrevMonth:o[0]?.usedPrevMonth??0,discountPrevMonth:Math.round(100*(parseFloat(o[0]?.discountPrevMonth??"0")||0))/100,revenuePrevMonth:Math.round(100*(parseFloat(o[0]?.revenuePrevMonth??"0")||0))/100,archivedCount:o[0]?.archivedCount??0,totalCount:o[0]?.totalCount??0}}async function E(t,o){let e=['p."organizationId" = $1','p."deletedAt" IS NULL'],n=[t],i=2;o.status&&(e.push(`p.status = $${i}::"PromotionStatus"`),n.push(o.status),i++),o.search&&(e.push(`(p.name ILIKE $${i} OR COALESCE(p.code,'') ILIKE $${i})`),n.push(`%${o.search}%`),i++);let r=e.join(" AND "),a=(o.page-1)*o.limit,[s,u,E]=await Promise.all([S.query(`SELECT COUNT(*)::int AS total FROM "Promotion" p WHERE ${r}`,n),S.query(`SELECT p.id, p.name, p.code, p.type::text, p.status::text, p.value::text, p."serviceId", p.category,
              p."minAmount"::text, p."maxUses", p."maxUsesPerCustomer", p."usageCount", p."startsAt", p."endsAt",
              p."timeStart", p."timeEnd", p.weekdays, p.description, p."customerId",
              COALESCE(u."monthUses", 0)::int AS "monthUses",
              COALESCE(u."monthDiscount", 0)::text AS "monthDiscount",
              COALESCE(inv."monthRevenue", 0)::text AS "monthRevenue"
       FROM "Promotion" p
       LEFT JOIN (
         SELECT "promotionId", COUNT(*)::int AS "monthUses", SUM("discountAmount") AS "monthDiscount"
         FROM "PromotionUsage"
         WHERE "organizationId" = $1 AND "createdAt" >= date_trunc('month', NOW())
         GROUP BY "promotionId"
       ) u ON u."promotionId" = p.id
       LEFT JOIN (
         SELECT "promotionId", SUM(total) AS "monthRevenue"
         FROM "Invoice"
         WHERE "organizationId" = $1 AND "promotionId" IS NOT NULL
           AND "issuedAt" >= date_trunc('month', NOW())
           AND status <> 'VOID'
         GROUP BY "promotionId"
       ) inv ON inv."promotionId" = p.id
       WHERE ${r}
       ORDER BY p."createdAt" DESC
       LIMIT $${i} OFFSET $${i+1}`,[...n,o.limit,a]),m(t)]);return{items:u.rows.map(t=>d(t)),total:s.rows[0]?.total??0,kpis:E}}async function A(t,o,e){let n=u("promo");await S.query(`INSERT INTO "Promotion" (
      id, "organizationId", name, code, type, status, value, "serviceId", category,
      "customerId", "minAmount", "maxUses", "maxUsesPerCustomer", "usageCount",
      "startsAt", "endsAt", "timeStart", "timeEnd", weekdays, description, "updatedAt"
    ) VALUES (
      $1,$2,$3,$4,$5::"PromotionType",$6::"PromotionStatus",$7,$8,$9,
      $10,$11,$12,$13,0,$14,$15,$16,$17,$18,$19,NOW()
    )`,[n,t,o.name,o.code??null,o.type,o.status??"ACTIVE",o.value??null,o.serviceId??null,o.category??null,o.customerId??null,o.minAmount??null,o.maxUses??null,o.maxUsesPerCustomer??null,o.startsAt?new Date(o.startsAt):null,o.endsAt?new Date(o.endsAt):null,o.timeStart??null,o.timeEnd??null,o.weekdays??null,o.description??null]),await (0,a.writeAuditLog)({organizationId:t,actorId:e.id,actorName:e.name,entityType:"Promotion",entityId:n,action:"CREATE",after:o});let{items:i}=await E(t,{page:1,limit:1,search:o.name});return i.find(t=>t.id===n)??i[0]}async function l(t,o,e,n){await S.query(`UPDATE "Promotion" SET status = $1::"PromotionStatus", "updatedAt" = NOW()
     WHERE id = $2 AND "organizationId" = $3 AND "deletedAt" IS NULL`,[e,o,t]),await (0,a.writeAuditLog)({organizationId:t,actorId:n.id,actorName:n.name,entityType:"Promotion",entityId:o,action:"STATUS",after:{status:e}});let{rows:i}=await S.query(`SELECT id, name, code, type::text, status::text, value::text, "serviceId", category,
            "minAmount"::text, "maxUses", "maxUsesPerCustomer", "usageCount", "startsAt", "endsAt",
            "timeStart", "timeEnd", weekdays, description, "customerId"
     FROM "Promotion" WHERE id = $1 AND "organizationId" = $2`,[o,t]);if(!i[0])throw Error("NOT_FOUND");return d(i[0])}async function c(t){let o=t.at??new Date,e=null;if(t.promotionId){let{rows:o}=await S.query(`SELECT * FROM "Promotion"
       WHERE id = $1 AND "organizationId" = $2 AND "deletedAt" IS NULL`,[t.promotionId,t.organizationId]);e=o[0]??null}else if(t.promotionCode){let{rows:o}=await S.query(`SELECT * FROM "Promotion"
       WHERE "organizationId" = $1 AND upper(code) = upper($2) AND "deletedAt" IS NULL
       ORDER BY CASE WHEN status = 'ACTIVE' THEN 0 ELSE 1 END, "updatedAt" DESC`,[t.organizationId,t.promotionCode.trim()]);e=o[0]??null}if(!e)return null;if("ACTIVE"!==String(e.status))throw Error("PROMO_INACTIVE");if(e.startsAt&&new Date(e.startsAt)>o)throw Error("PROMO_NOT_STARTED");if(e.endsAt&&new Date(e.endsAt)<o)throw Error("PROMO_EXPIRED");if(e.serviceId&&String(e.serviceId)!==t.serviceId)throw Error("PROMO_SERVICE_MISMATCH");if(e.category&&t.serviceCategory&&String(e.category)!==t.serviceCategory)throw Error("PROMO_CATEGORY_MISMATCH");let n=null!=e.minAmount?parseFloat(String(e.minAmount)):0;if(t.amount<n)throw Error("PROMO_MIN_AMOUNT");if(null!=e.maxUses&&Number(e.usageCount)>=Number(e.maxUses))throw Error("PROMO_MAX_USES");if(null!=e.maxUsesPerCustomer){let{rows:o}=await S.query(`SELECT COUNT(*)::int AS n FROM "PromotionUsage"
       WHERE "promotionId" = $1 AND "customerId" = $2`,[e.id,t.customerId]);if((o[0]?.n??0)>=Number(e.maxUsesPerCustomer))throw Error("PROMO_MAX_PER_CUSTOMER")}let i=String(e.type);if("HAPPY_HOUR"===i||e.timeStart||e.weekdays){if(e.weekdays&&!String(e.weekdays).split(",").map(t=>t.trim()).includes(String(o.getDay())))throw Error("PROMO_WEEKDAY");if(e.timeStart&&e.timeEnd){let t=`${String(o.getHours()).padStart(2,"0")}:${String(o.getMinutes()).padStart(2,"0")}`;if(t<String(e.timeStart)||t>String(e.timeEnd))throw Error("PROMO_TIME")}}let r=null!=e.value?parseFloat(String(e.value)):0,a=0;return("PERCENTAGE"===i?a=Math.round(t.amount*(r/100)*100)/100:"FIXED_AMOUNT"===i||"HAPPY_HOUR"===i||"PACKAGE"===i?a=Math.min(t.amount,r):"FREE_SERVICE"===i&&(a=t.amount),(a=Math.max(0,Math.min(t.amount,a)))<=0)?null:{promotionId:String(e.id),name:String(e.name),code:e.code??null,type:i,discountAmount:a}}async function I(t){let o=t.client??S;await o.query(`INSERT INTO "PromotionUsage" (
      id, "organizationId", "promotionId", "customerId", "appointmentId",
      "invoiceId", "discountAmount", "idempotencyKey"
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
    ON CONFLICT ("organizationId", "idempotencyKey") DO NOTHING`,[u("prus"),t.organizationId,t.promotionId,t.customerId,t.appointmentId??null,t.invoiceId??null,t.discountAmount,t.idempotencyKey]),await o.query(`UPDATE "Promotion" SET "usageCount" = "usageCount" + 1, "updatedAt" = NOW()
     WHERE id = $1 AND "organizationId" = $2
       AND NOT EXISTS (
         SELECT 1 FROM "PromotionUsage"
         WHERE "organizationId" = $2 AND "idempotencyKey" = $3
           AND id <> (
             SELECT id FROM "PromotionUsage"
             WHERE "organizationId" = $2 AND "idempotencyKey" = $3
             LIMIT 1
           )
       )`,[t.promotionId,t.organizationId,t.idempotencyKey]),await o.query(`UPDATE "Promotion" p SET "usageCount" = (
       SELECT COUNT(*) FROM "PromotionUsage" u WHERE u."promotionId" = p.id
     ), "updatedAt" = NOW()
     WHERE p.id = $1`,[t.promotionId]),await o.query(`UPDATE "LoyaltyVisitReward" r
     SET status = 'REDEEMED', "usedAt" = NOW()
     FROM "Promotion" p
     WHERE p.id = $1 AND p."organizationId" = $2
       AND p.description = 'loyalty:' || r.id
       AND r."organizationId" = $2 AND r."customerId" = $3 AND r.status = 'AVAILABLE'`,[t.promotionId,t.organizationId,t.customerId])}n()}catch(t){n(t)}})}};