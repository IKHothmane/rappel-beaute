"use strict";(()=>{var t={};t.id=473,t.ids=[473,5750],t.modules={72934:t=>{t.exports=require("next/dist/client/components/action-async-storage.external.js")},54580:t=>{t.exports=require("next/dist/client/components/request-async-storage.external.js")},45869:t=>{t.exports=require("next/dist/client/components/static-generation-async-storage.external.js")},20399:t=>{t.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},30517:t=>{t.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},48927:t=>{t.exports=require("web-push")},84770:t=>{t.exports=require("crypto")},92048:t=>{t.exports=require("fs")},71568:t=>{t.exports=require("zlib")},8678:t=>{t.exports=import("pg")},6005:t=>{t.exports=require("node:crypto")},42725:t=>{t.exports=require("node:http2")},29122:(t,e,o)=>{o.a(t,async(t,n)=>{try{o.r(e),o.d(e,{originalPathname:()=>E,patchFetch:()=>d,requestAsyncStorage:()=>l,routeModule:()=>m,serverHooks:()=>p,staticGenerationAsyncStorage:()=>c});var r=o(49303),i=o(88716),a=o(60670),s=o(43992),u=t([s]);s=(u.then?(await u)():u)[0];let m=new r.AppRouteRouteModule({definition:{kind:i.x.APP_ROUTE,page:"/api/promotions/route",pathname:"/api/promotions",filename:"route",bundlePath:"app/api/promotions/route"},resolvedPagePath:"C:\\Users\\LordOfTHeRings\\Desktop\\rappel beauty\\src\\app\\api\\promotions\\route.ts",nextConfigOutput:"",userland:s}),{requestAsyncStorage:l,staticGenerationAsyncStorage:c,serverHooks:p}=m,E="/api/promotions/route";function d(){return(0,a.patchFetch)({serverHooks:p,staticGenerationAsyncStorage:c})}n()}catch(t){n(t)}})},49303:(t,e,o)=>{t.exports=o(30517)},43992:(t,e,o)=>{o.a(t,async(t,n)=>{try{o.r(e),o.d(e,{GET:()=>m,POST:()=>l});var r=o(87070),i=o(33568),a=o(15750),s=o(37604),u=o(29725),d=t([i,a]);async function m(t){let e=await (0,i.lr)(t,"promotions");if(!e.ok)return e.response;try{let o=(0,u.d1)(new URL(t.url).searchParams),{items:n,total:i,kpis:s}=await (0,a.aR)(e.session.organizationId,{...o,search:o.search||void 0});return r.NextResponse.json({data:n,pagination:{page:o.page,limit:o.limit,total:i,totalPages:Math.max(1,Math.ceil(i/o.limit))},kpis:s})}catch(t){return console.error("[GET /api/promotions]",t),r.NextResponse.json({error:"Impossible de charger les promotions."},{status:500})}}async function l(t){let e=await (0,i.f8)(t,"promotions");if(!e.ok)return e.response;if(!(0,s.Xh)(e.session.role))return r.NextResponse.json({error:"Acc\xe8s refus\xe9."},{status:403});try{let o=(0,i.stripOrganizationId)(await t.json()),n={id:e.session.id,name:`${e.session.firstName} ${e.session.lastName}`.trim()};if("setStatus"===o.action){let t="string"==typeof o.id?o.id:"",i="string"==typeof o.status?o.status:null;if(!t||!i)return r.NextResponse.json({error:"Donn\xe9es invalides."},{status:400});let s=await (0,a.Vi)(e.session.organizationId,t,i,n);return r.NextResponse.json(s)}let s=(0,u.TQ)(o);if(!s.ok)return r.NextResponse.json({error:"Donn\xe9es invalides.",details:s.errors},{status:400});let d=await (0,a.kb)(e.session.organizationId,s.data,n);return r.NextResponse.json(d,{status:201})}catch(t){return console.error("[POST /api/promotions]",t),r.NextResponse.json({error:"Impossible de cr\xe9er la promotion."},{status:500})}}[i,a]=d.then?(await d)():d,n()}catch(t){n(t)}})},15750:(t,e,o)=>{o.a(t,async(t,n)=>{try{o.d(e,{Vi:()=>p,aR:()=>l,computePromotionDiscount:()=>E,kb:()=>c,recordPromotionUsage:()=>A});var r=o(84770),i=o(8678),a=o(2192),s=t([i,a]);[i,a]=s.then?(await s)():s;let I=new i.Pool({connectionString:process.env.DATABASE_URL});function u(t){return`${t}_${(0,r.randomBytes)(8).toString("hex")}`}function d(t){return{id:String(t.id),name:String(t.name),code:t.code??null,type:t.type,status:t.status,value:null!=t.value?parseFloat(String(t.value)):null,serviceId:t.serviceId??null,category:t.category??null,customerId:t.customerId??null,minAmount:null!=t.minAmount?parseFloat(String(t.minAmount)):null,maxUses:null!=t.maxUses?Number(t.maxUses):null,maxUsesPerCustomer:null!=t.maxUsesPerCustomer?Number(t.maxUsesPerCustomer):null,usageCount:Number(t.usageCount)||0,monthUses:Number(t.monthUses)||0,monthDiscount:null!=t.monthDiscount?parseFloat(String(t.monthDiscount)):0,monthRevenue:null!=t.monthRevenue?parseFloat(String(t.monthRevenue)):0,startsAt:t.startsAt?new Date(t.startsAt).toISOString():null,endsAt:t.endsAt?new Date(t.endsAt).toISOString():null,timeStart:t.timeStart??null,timeEnd:t.timeEnd??null,weekdays:t.weekdays??null,description:t.description??null}}async function m(t){let{rows:e}=await I.query(`SELECT
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
          AND i.status <> 'VOID'), 0)::text AS "revenuePrevMonth"`,[t]);return{activeCount:e[0]?.activeCount??0,usedThisMonth:e[0]?.usedThisMonth??0,discountTotalMonth:Math.round(100*(parseFloat(e[0]?.discountTotalMonth??"0")||0))/100,estimatedRevenueMonth:Math.round(100*(parseFloat(e[0]?.estimatedRevenueMonth??"0")||0))/100,customersTouchedMonth:e[0]?.customersTouchedMonth??0,usedPrevMonth:e[0]?.usedPrevMonth??0,discountPrevMonth:Math.round(100*(parseFloat(e[0]?.discountPrevMonth??"0")||0))/100,revenuePrevMonth:Math.round(100*(parseFloat(e[0]?.revenuePrevMonth??"0")||0))/100,archivedCount:e[0]?.archivedCount??0,totalCount:e[0]?.totalCount??0}}async function l(t,e){let o=['p."organizationId" = $1','p."deletedAt" IS NULL'],n=[t],r=2;e.status&&(o.push(`p.status = $${r}::"PromotionStatus"`),n.push(e.status),r++),e.search&&(o.push(`(p.name ILIKE $${r} OR COALESCE(p.code,'') ILIKE $${r})`),n.push(`%${e.search}%`),r++);let i=o.join(" AND "),a=(e.page-1)*e.limit,[s,u,l]=await Promise.all([I.query(`SELECT COUNT(*)::int AS total FROM "Promotion" p WHERE ${i}`,n),I.query(`SELECT p.id, p.name, p.code, p.type::text, p.status::text, p.value::text, p."serviceId", p.category,
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
       WHERE ${i}
       ORDER BY p."createdAt" DESC
       LIMIT $${r} OFFSET $${r+1}`,[...n,e.limit,a]),m(t)]);return{items:u.rows.map(t=>d(t)),total:s.rows[0]?.total??0,kpis:l}}async function c(t,e,o){let n=u("promo");await I.query(`INSERT INTO "Promotion" (
      id, "organizationId", name, code, type, status, value, "serviceId", category,
      "customerId", "minAmount", "maxUses", "maxUsesPerCustomer", "usageCount",
      "startsAt", "endsAt", "timeStart", "timeEnd", weekdays, description, "updatedAt"
    ) VALUES (
      $1,$2,$3,$4,$5::"PromotionType",$6::"PromotionStatus",$7,$8,$9,
      $10,$11,$12,$13,0,$14,$15,$16,$17,$18,$19,NOW()
    )`,[n,t,e.name,e.code??null,e.type,e.status??"ACTIVE",e.value??null,e.serviceId??null,e.category??null,e.customerId??null,e.minAmount??null,e.maxUses??null,e.maxUsesPerCustomer??null,e.startsAt?new Date(e.startsAt):null,e.endsAt?new Date(e.endsAt):null,e.timeStart??null,e.timeEnd??null,e.weekdays??null,e.description??null]),await (0,a.writeAuditLog)({organizationId:t,actorId:o.id,actorName:o.name,entityType:"Promotion",entityId:n,action:"CREATE",after:e});let{items:r}=await l(t,{page:1,limit:1,search:e.name});return r.find(t=>t.id===n)??r[0]}async function p(t,e,o,n){await I.query(`UPDATE "Promotion" SET status = $1::"PromotionStatus", "updatedAt" = NOW()
     WHERE id = $2 AND "organizationId" = $3 AND "deletedAt" IS NULL`,[o,e,t]),await (0,a.writeAuditLog)({organizationId:t,actorId:n.id,actorName:n.name,entityType:"Promotion",entityId:e,action:"STATUS",after:{status:o}});let{rows:r}=await I.query(`SELECT id, name, code, type::text, status::text, value::text, "serviceId", category,
            "minAmount"::text, "maxUses", "maxUsesPerCustomer", "usageCount", "startsAt", "endsAt",
            "timeStart", "timeEnd", weekdays, description, "customerId"
     FROM "Promotion" WHERE id = $1 AND "organizationId" = $2`,[e,t]);if(!r[0])throw Error("NOT_FOUND");return d(r[0])}async function E(t){let e=t.at??new Date,o=null;if(t.promotionId){let{rows:e}=await I.query(`SELECT * FROM "Promotion"
       WHERE id = $1 AND "organizationId" = $2 AND "deletedAt" IS NULL`,[t.promotionId,t.organizationId]);o=e[0]??null}else if(t.promotionCode){let{rows:e}=await I.query(`SELECT * FROM "Promotion"
       WHERE "organizationId" = $1 AND upper(code) = upper($2) AND "deletedAt" IS NULL
       ORDER BY CASE WHEN status = 'ACTIVE' THEN 0 ELSE 1 END, "updatedAt" DESC`,[t.organizationId,t.promotionCode.trim()]);o=e[0]??null}if(!o)return null;if("ACTIVE"!==String(o.status))throw Error("PROMO_INACTIVE");if(o.startsAt&&new Date(o.startsAt)>e)throw Error("PROMO_NOT_STARTED");if(o.endsAt&&new Date(o.endsAt)<e)throw Error("PROMO_EXPIRED");if(o.serviceId&&String(o.serviceId)!==t.serviceId)throw Error("PROMO_SERVICE_MISMATCH");if(o.category&&t.serviceCategory&&String(o.category)!==t.serviceCategory)throw Error("PROMO_CATEGORY_MISMATCH");let n=null!=o.minAmount?parseFloat(String(o.minAmount)):0;if(t.amount<n)throw Error("PROMO_MIN_AMOUNT");if(null!=o.maxUses&&Number(o.usageCount)>=Number(o.maxUses))throw Error("PROMO_MAX_USES");if(null!=o.maxUsesPerCustomer){let{rows:e}=await I.query(`SELECT COUNT(*)::int AS n FROM "PromotionUsage"
       WHERE "promotionId" = $1 AND "customerId" = $2`,[o.id,t.customerId]);if((e[0]?.n??0)>=Number(o.maxUsesPerCustomer))throw Error("PROMO_MAX_PER_CUSTOMER")}let r=String(o.type);if("HAPPY_HOUR"===r||o.timeStart||o.weekdays){if(o.weekdays&&!String(o.weekdays).split(",").map(t=>t.trim()).includes(String(e.getDay())))throw Error("PROMO_WEEKDAY");if(o.timeStart&&o.timeEnd){let t=`${String(e.getHours()).padStart(2,"0")}:${String(e.getMinutes()).padStart(2,"0")}`;if(t<String(o.timeStart)||t>String(o.timeEnd))throw Error("PROMO_TIME")}}let i=null!=o.value?parseFloat(String(o.value)):0,a=0;return("PERCENTAGE"===r?a=Math.round(t.amount*(i/100)*100)/100:"FIXED_AMOUNT"===r||"HAPPY_HOUR"===r||"PACKAGE"===r?a=Math.min(t.amount,i):"FREE_SERVICE"===r&&(a=t.amount),(a=Math.max(0,Math.min(t.amount,a)))<=0)?null:{promotionId:String(o.id),name:String(o.name),code:o.code??null,type:r,discountAmount:a}}async function A(t){let e=t.client??I;await e.query(`INSERT INTO "PromotionUsage" (
      id, "organizationId", "promotionId", "customerId", "appointmentId",
      "invoiceId", "discountAmount", "idempotencyKey"
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
    ON CONFLICT ("organizationId", "idempotencyKey") DO NOTHING`,[u("prus"),t.organizationId,t.promotionId,t.customerId,t.appointmentId??null,t.invoiceId??null,t.discountAmount,t.idempotencyKey]),await e.query(`UPDATE "Promotion" SET "usageCount" = "usageCount" + 1, "updatedAt" = NOW()
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
       AND r."organizationId" = $2 AND r."customerId" = $3 AND r.status = 'AVAILABLE'`,[t.promotionId,t.organizationId,t.customerId])}n()}catch(t){n(t)}})},29725:(t,e,o)=>{o.d(e,{p2:()=>m,d1:()=>s,nS:()=>d,TQ:()=>u});let n=["PERCENTAGE","FIXED_AMOUNT","FREE_SERVICE","PACKAGE","HAPPY_HOUR"];function r(t){if("string"!=typeof t)return;let e=t.trim();return e.length?e:void 0}function i(t){return"number"==typeof t&&Number.isFinite(t)?t:"string"==typeof t&&""!==t.trim()&&Number.isFinite(Number(t))?Number(t):void 0}function a(t){let e=i(t);if(void 0!==e&&Number.isInteger(e))return e}function s(t){return{page:Math.max(1,Number(t.get("page"))||1),limit:Math.min(100,Math.max(1,Number(t.get("limit"))||40)),status:t.get("status")?.trim()||null,search:t.get("search")?.trim()||""}}function u(t){let e=[],o=r(t.name),s=r(t.type);return(o||e.push("name"),s&&n.includes(s)||e.push("type"),!e.length&&o&&s)?{ok:!0,data:{name:o,code:r(t.code)?.toUpperCase(),type:s,status:r(t.status)||"ACTIVE",value:i(t.value),serviceId:r(t.serviceId),category:r(t.category),customerId:r(t.customerId),minAmount:i(t.minAmount),maxUses:a(t.maxUses),maxUsesPerCustomer:a(t.maxUsesPerCustomer),startsAt:r(t.startsAt),endsAt:r(t.endsAt),timeStart:r(t.timeStart),timeEnd:r(t.timeEnd),weekdays:r(t.weekdays),description:r(t.description)}}:{ok:!1,errors:e}}function d(t){let e=i(t.amount);return void 0===e||e<=0?{ok:!1,errors:["amount"]}:{ok:!0,data:{amount:Math.round(100*e)/100,buyerCustomerId:r(t.buyerCustomerId),beneficiaryCustomerId:r(t.beneficiaryCustomerId),expiresAt:r(t.expiresAt),notes:r(t.notes)}}}function m(t){return{page:Math.max(1,Number(t.get("page"))||1),limit:Math.min(200,Math.max(1,Number(t.get("limit"))||40)),status:t.get("status")?.trim()||null,search:t.get("search")?.trim()||""}}}};var e=require("../../../webpack-runtime.js");e.C(t);var o=t=>e(e.s=t),n=e.X(0,[8948,7070,3314,3376,3568],()=>o(29122));module.exports=n})();