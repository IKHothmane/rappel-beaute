"use strict";!function(){try{var t="undefined"!=typeof window?window:"undefined"!=typeof global?global:"undefined"!=typeof self?self:{},e=(new t.Error).stack;e&&(t._sentryDebugIds=t._sentryDebugIds||{},t._sentryDebugIds[e]="6bd10566-7c73-4ca3-bdeb-00c178983a6c",t._sentryDebugIdIdentifier="sentry-dbid-6bd10566-7c73-4ca3-bdeb-00c178983a6c")}catch(t){}}(),exports.id=6430,exports.ids=[6430],exports.modules={36430:(t,e,o)=>{o.a(t,async(t,n)=>{try{o.d(e,{Vi:()=>c,aR:()=>l,computePromotionDiscount:()=>I,kb:()=>A,recordPromotionUsage:()=>S});var i=o(84770),r=o(8678),a=o(90831),s=o(66085),u=t([r,s]);[r,s]=u.then?(await u)():u;let p=(0,a.S)(new r.Pool({connectionString:process.env.DATABASE_URL}));function d(t){return`${t}_${(0,i.randomBytes)(8).toString("hex")}`}function m(t){return{id:String(t.id),name:String(t.name),code:t.code??null,type:t.type,status:t.status,value:null!=t.value?parseFloat(String(t.value)):null,serviceId:t.serviceId??null,category:t.category??null,customerId:t.customerId??null,minAmount:null!=t.minAmount?parseFloat(String(t.minAmount)):null,maxUses:null!=t.maxUses?Number(t.maxUses):null,maxUsesPerCustomer:null!=t.maxUsesPerCustomer?Number(t.maxUsesPerCustomer):null,usageCount:Number(t.usageCount)||0,monthUses:Number(t.monthUses)||0,monthDiscount:null!=t.monthDiscount?parseFloat(String(t.monthDiscount)):0,monthRevenue:null!=t.monthRevenue?parseFloat(String(t.monthRevenue)):0,startsAt:t.startsAt?new Date(t.startsAt).toISOString():null,endsAt:t.endsAt?new Date(t.endsAt).toISOString():null,timeStart:t.timeStart??null,timeEnd:t.timeEnd??null,weekdays:t.weekdays??null,description:t.description??null}}async function E(t){let{rows:e}=await p.query(`SELECT
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
          AND i.status <> 'VOID'), 0)::text AS "revenuePrevMonth"`,[t]);return{activeCount:e[0]?.activeCount??0,usedThisMonth:e[0]?.usedThisMonth??0,discountTotalMonth:Math.round(100*(parseFloat(e[0]?.discountTotalMonth??"0")||0))/100,estimatedRevenueMonth:Math.round(100*(parseFloat(e[0]?.estimatedRevenueMonth??"0")||0))/100,customersTouchedMonth:e[0]?.customersTouchedMonth??0,usedPrevMonth:e[0]?.usedPrevMonth??0,discountPrevMonth:Math.round(100*(parseFloat(e[0]?.discountPrevMonth??"0")||0))/100,revenuePrevMonth:Math.round(100*(parseFloat(e[0]?.revenuePrevMonth??"0")||0))/100,archivedCount:e[0]?.archivedCount??0,totalCount:e[0]?.totalCount??0}}async function l(t,e){let o=['p."organizationId" = $1','p."deletedAt" IS NULL'],n=[t],i=2;e.status&&(o.push(`p.status = $${i}::"PromotionStatus"`),n.push(e.status),i++),e.search&&(o.push(`(p.name ILIKE $${i} OR COALESCE(p.code,'') ILIKE $${i})`),n.push(`%${e.search}%`),i++);let r=o.join(" AND "),a=(e.page-1)*e.limit,[s,u,d]=await Promise.all([p.query(`SELECT COUNT(*)::int AS total FROM "Promotion" p WHERE ${r}`,n),p.query(`SELECT p.id, p.name, p.code, p.type::text, p.status::text, p.value::text, p."serviceId", p.category,
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
       LIMIT $${i} OFFSET $${i+1}`,[...n,e.limit,a]),E(t)]);return{items:u.rows.map(t=>m(t)),total:s.rows[0]?.total??0,kpis:d}}async function A(t,e,o){let n=d("promo");await p.query(`INSERT INTO "Promotion" (
      id, "organizationId", name, code, type, status, value, "serviceId", category,
      "customerId", "minAmount", "maxUses", "maxUsesPerCustomer", "usageCount",
      "startsAt", "endsAt", "timeStart", "timeEnd", weekdays, description, "updatedAt"
    ) VALUES (
      $1,$2,$3,$4,$5::"PromotionType",$6::"PromotionStatus",$7,$8,$9,
      $10,$11,$12,$13,0,$14,$15,$16,$17,$18,$19,NOW()
    )`,[n,t,e.name,e.code??null,e.type,e.status??"ACTIVE",e.value??null,e.serviceId??null,e.category??null,e.customerId??null,e.minAmount??null,e.maxUses??null,e.maxUsesPerCustomer??null,e.startsAt?new Date(e.startsAt):null,e.endsAt?new Date(e.endsAt):null,e.timeStart??null,e.timeEnd??null,e.weekdays??null,e.description??null]),await (0,s.writeAuditLog)({organizationId:t,actorId:o.id,actorName:o.name,entityType:"Promotion",entityId:n,action:"CREATE",after:e});let{items:i}=await l(t,{page:1,limit:1,search:e.name});return i.find(t=>t.id===n)??i[0]}async function c(t,e,o,n){await p.query(`UPDATE "Promotion" SET status = $1::"PromotionStatus", "updatedAt" = NOW()
     WHERE id = $2 AND "organizationId" = $3 AND "deletedAt" IS NULL`,[o,e,t]),await (0,s.writeAuditLog)({organizationId:t,actorId:n.id,actorName:n.name,entityType:"Promotion",entityId:e,action:"STATUS",after:{status:o}});let{rows:i}=await p.query(`SELECT id, name, code, type::text, status::text, value::text, "serviceId", category,
            "minAmount"::text, "maxUses", "maxUsesPerCustomer", "usageCount", "startsAt", "endsAt",
            "timeStart", "timeEnd", weekdays, description, "customerId"
     FROM "Promotion" WHERE id = $1 AND "organizationId" = $2`,[e,t]);if(!i[0])throw Error("NOT_FOUND");return m(i[0])}async function I(t){let e=t.at??new Date,o=null;if(t.promotionId){let{rows:e}=await p.query(`SELECT * FROM "Promotion"
       WHERE id = $1 AND "organizationId" = $2 AND "deletedAt" IS NULL`,[t.promotionId,t.organizationId]);o=e[0]??null}else if(t.promotionCode){let{rows:e}=await p.query(`SELECT * FROM "Promotion"
       WHERE "organizationId" = $1 AND upper(code) = upper($2) AND "deletedAt" IS NULL
       ORDER BY CASE WHEN status = 'ACTIVE' THEN 0 ELSE 1 END, "updatedAt" DESC`,[t.organizationId,t.promotionCode.trim()]);o=e[0]??null}if(!o)return null;if("ACTIVE"!==String(o.status))throw Error("PROMO_INACTIVE");if(o.startsAt&&new Date(o.startsAt)>e)throw Error("PROMO_NOT_STARTED");if(o.endsAt&&new Date(o.endsAt)<e)throw Error("PROMO_EXPIRED");if(o.serviceId&&String(o.serviceId)!==t.serviceId)throw Error("PROMO_SERVICE_MISMATCH");if(o.category&&t.serviceCategory&&String(o.category)!==t.serviceCategory)throw Error("PROMO_CATEGORY_MISMATCH");let n=null!=o.minAmount?parseFloat(String(o.minAmount)):0;if(t.amount<n)throw Error("PROMO_MIN_AMOUNT");if(null!=o.maxUses&&Number(o.usageCount)>=Number(o.maxUses))throw Error("PROMO_MAX_USES");if(null!=o.maxUsesPerCustomer){let{rows:e}=await p.query(`SELECT COUNT(*)::int AS n FROM "PromotionUsage"
       WHERE "promotionId" = $1 AND "customerId" = $2`,[o.id,t.customerId]);if((e[0]?.n??0)>=Number(o.maxUsesPerCustomer))throw Error("PROMO_MAX_PER_CUSTOMER")}let i=String(o.type);if("HAPPY_HOUR"===i||o.timeStart||o.weekdays){if(o.weekdays&&!String(o.weekdays).split(",").map(t=>t.trim()).includes(String(e.getDay())))throw Error("PROMO_WEEKDAY");if(o.timeStart&&o.timeEnd){let t=`${String(e.getHours()).padStart(2,"0")}:${String(e.getMinutes()).padStart(2,"0")}`;if(t<String(o.timeStart)||t>String(o.timeEnd))throw Error("PROMO_TIME")}}let r=null!=o.value?parseFloat(String(o.value)):0,a=0;return("PERCENTAGE"===i?a=Math.round(t.amount*(r/100)*100)/100:"FIXED_AMOUNT"===i||"HAPPY_HOUR"===i||"PACKAGE"===i?a=Math.min(t.amount,r):"FREE_SERVICE"===i&&(a=t.amount),(a=Math.max(0,Math.min(t.amount,a)))<=0)?null:{promotionId:String(o.id),name:String(o.name),code:o.code??null,type:i,discountAmount:a}}async function S(t){let e=t.client??p;await e.query(`INSERT INTO "PromotionUsage" (
      id, "organizationId", "promotionId", "customerId", "appointmentId",
      "invoiceId", "discountAmount", "idempotencyKey"
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
    ON CONFLICT ("organizationId", "idempotencyKey") DO NOTHING`,[d("prus"),t.organizationId,t.promotionId,t.customerId,t.appointmentId??null,t.invoiceId??null,t.discountAmount,t.idempotencyKey]),await e.query(`UPDATE "Promotion" SET "usageCount" = "usageCount" + 1, "updatedAt" = NOW()
     WHERE id = $1 AND "organizationId" = $2
       AND NOT EXISTS (
         SELECT 1 FROM "PromotionUsage"
         WHERE "organizationId" = $2 AND "idempotencyKey" = $3
           AND id <> (
             SELECT id FROM "PromotionUsage"
             WHERE "organizationId" = $2 AND "idempotencyKey" = $3
             LIMIT 1
           )
       )`,[t.promotionId,t.organizationId,t.idempotencyKey]),await e.query(`UPDATE "Promotion" p SET "usageCount" = (
       SELECT COUNT(*) FROM "PromotionUsage" u WHERE u."promotionId" = p.id
     ), "updatedAt" = NOW()
     WHERE p.id = $1`,[t.promotionId]),await e.query(`UPDATE "LoyaltyVisitReward" r
     SET status = 'REDEEMED', "usedAt" = NOW()
     FROM "Promotion" p
     WHERE p.id = $1 AND p."organizationId" = $2
       AND p.description = 'loyalty:' || r.id
       AND r."organizationId" = $2 AND r."customerId" = $3 AND r.status = 'AVAILABLE'`,[t.promotionId,t.organizationId,t.customerId])}n()}catch(t){n(t)}})}};