!function(){try{var t="undefined"!=typeof window?window:"undefined"!=typeof global?global:"undefined"!=typeof self?self:{},e=(new t.Error).stack;e&&(t._sentryDebugIds=t._sentryDebugIds||{},t._sentryDebugIds[e]="13cdb570-4e27-45d8-af49-364fbd472e38",t._sentryDebugIdIdentifier="sentry-dbid-13cdb570-4e27-45d8-af49-364fbd472e38")}catch(t){}}();"use strict";(()=>{var t={};t.id=473,t.ids=[473,6430],t.modules={72934:t=>{t.exports=require("next/dist/client/components/action-async-storage.external.js")},54580:t=>{t.exports=require("next/dist/client/components/request-async-storage.external.js")},45869:t=>{t.exports=require("next/dist/client/components/static-generation-async-storage.external.js")},20399:t=>{t.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},30517:t=>{t.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},48927:t=>{t.exports=require("web-push")},61212:t=>{t.exports=require("async_hooks")},61282:t=>{t.exports=require("child_process")},84770:t=>{t.exports=require("crypto")},27920:t=>{t.exports=require("diagnostics_channel")},17702:t=>{t.exports=require("events")},92048:t=>{t.exports=require("fs")},85807:t=>{t.exports=require("module")},19801:t=>{t.exports=require("os")},55315:t=>{t.exports=require("path")},96119:t=>{t.exports=require("perf_hooks")},35816:t=>{t.exports=require("process")},74175:t=>{t.exports=require("tty")},17360:t=>{t.exports=require("url")},21764:t=>{t.exports=require("util")},6162:t=>{t.exports=require("worker_threads")},71568:t=>{t.exports=require("zlib")},8678:t=>{t.exports=import("pg")},92761:t=>{t.exports=require("node:async_hooks")},17718:t=>{t.exports=require("node:child_process")},6005:t=>{t.exports=require("node:crypto")},92110:t=>{t.exports=require("node:diagnostics_channel")},87561:t=>{t.exports=require("node:fs")},88849:t=>{t.exports=require("node:http")},42725:t=>{t.exports=require("node:http2")},22286:t=>{t.exports=require("node:https")},85690:t=>{t.exports=require("node:inspector")},87503:t=>{t.exports=require("node:net")},70612:t=>{t.exports=require("node:os")},49411:t=>{t.exports=require("node:path")},51747:t=>{t.exports=require("node:readline")},84492:t=>{t.exports=require("node:stream")},31764:t=>{t.exports=require("node:tls")},47261:t=>{t.exports=require("node:util")},24086:t=>{t.exports=require("node:worker_threads")},65628:t=>{t.exports=require("node:zlib")},84769:(t,e,o)=>{o.a(t,async(t,r)=>{try{o.r(e),o.d(e,{DELETE:()=>C,GET:()=>h,HEAD:()=>T,OPTIONS:()=>R,PATCH:()=>O,POST:()=>N,PUT:()=>y});var n=o(98930),i=o(21967),s=o(54580),a=o(46485),u=o(40444),d=o(36430),m=o(30886),p=o(26086),l=o(73575),c=t([u,d]);[u,d]=c.then?(await c)():c;let A=(0,l.f_)(async function(t){let e=await (0,u.lr)(t,"promotions");if(!e.ok)return e.response;try{let o=(0,p.d1)(new URL(t.url).searchParams),{items:r,total:n,kpis:i}=await (0,d.aR)(e.session.organizationId,{...o,search:o.search||void 0});return a.NextResponse.json({data:r,pagination:{page:o.page,limit:o.limit,total:n,totalPages:Math.max(1,Math.ceil(n/o.limit))},kpis:i})}catch(t){return console.error("[GET /api/promotions]",t),a.NextResponse.json({error:"Impossible de charger les promotions."},{status:500})}}),I=(0,l.f_)(async function(t){let e=await (0,u.f8)(t,"promotions");if(!e.ok)return e.response;if(!(0,m.Xh)(e.session.role))return a.NextResponse.json({error:"Acc\xe8s refus\xe9."},{status:403});try{let o=(0,u.stripOrganizationId)(await t.json()),r={id:e.session.id,name:`${e.session.firstName} ${e.session.lastName}`.trim()};if("setStatus"===o.action){let t="string"==typeof o.id?o.id:"",n="string"==typeof o.status?o.status:null;if(!t||!n)return a.NextResponse.json({error:"Donn\xe9es invalides."},{status:400});let i=await (0,d.Vi)(e.session.organizationId,t,n,r);return a.NextResponse.json(i)}let n=(0,p.TQ)(o);if(!n.ok)return a.NextResponse.json({error:"Donn\xe9es invalides.",details:n.errors},{status:400});let i=await (0,d.kb)(e.session.organizationId,n.data,r);return a.NextResponse.json(i,{status:201})}catch(t){return console.error("[POST /api/promotions]",t),a.NextResponse.json({error:"Impossible de cr\xe9er la promotion."},{status:500})}}),S={...s},g="workUnitAsyncStorage"in S?S.workUnitAsyncStorage:"requestAsyncStorage"in S?S.requestAsyncStorage:void 0;function E(t,e){return"phase-production-build"===process.env.NEXT_PHASE||"function"!=typeof t?t:new Proxy(t,{apply:(t,o,r)=>{let s;try{let t=(0,n.x)([g,"optionalAccess",t=>t.getStore,"call",t=>t()]);s=(0,n.x)([t,"optionalAccess",t=>t.headers])}catch(t){}return i.wrapRouteHandlerWithSentry(t,{method:e,parameterizedRoute:"/api/promotions",headers:s}).apply(o,r)}})}let h=E(A,"GET"),N=E(I,"POST"),y=E(void 0,"PUT"),O=E(void 0,"PATCH"),C=E(void 0,"DELETE"),T=E(void 0,"HEAD"),R=E(void 0,"OPTIONS");r()}catch(t){r(t)}})},22373:(t,e,o)=>{o.a(t,async(t,r)=>{try{o.r(e),o.d(e,{originalPathname:()=>E,patchFetch:()=>d,requestAsyncStorage:()=>p,routeModule:()=>m,serverHooks:()=>c,staticGenerationAsyncStorage:()=>l});var n=o(32829),i=o(85358),s=o(66806),a=o(84769),u=t([a]);a=(u.then?(await u)():u)[0];let m=new n.AppRouteRouteModule({definition:{kind:i.x.APP_ROUTE,page:"/api/promotions/route",pathname:"/api/promotions",filename:"route",bundlePath:"app/api/promotions/route"},resolvedPagePath:"D:\\rappel beauty\\src\\app\\api\\promotions\\route.ts",nextConfigOutput:"",userland:a}),{requestAsyncStorage:p,staticGenerationAsyncStorage:l,serverHooks:c}=m,E="/api/promotions/route";function d(){return(0,s.patchFetch)({serverHooks:c,staticGenerationAsyncStorage:l})}r()}catch(t){r(t)}})},36430:(t,e,o)=>{o.a(t,async(t,r)=>{try{o.d(e,{Vi:()=>E,aR:()=>l,computePromotionDiscount:()=>A,kb:()=>c,recordPromotionUsage:()=>I});var n=o(84770),i=o(8678),s=o(90831),a=o(66085),u=t([i,a]);[i,a]=u.then?(await u)():u;let S=(0,s.S)(new i.Pool({connectionString:process.env.DATABASE_URL}));function d(t){return`${t}_${(0,n.randomBytes)(8).toString("hex")}`}function m(t){return{id:String(t.id),name:String(t.name),code:t.code??null,type:t.type,status:t.status,value:null!=t.value?parseFloat(String(t.value)):null,serviceId:t.serviceId??null,category:t.category??null,customerId:t.customerId??null,minAmount:null!=t.minAmount?parseFloat(String(t.minAmount)):null,maxUses:null!=t.maxUses?Number(t.maxUses):null,maxUsesPerCustomer:null!=t.maxUsesPerCustomer?Number(t.maxUsesPerCustomer):null,usageCount:Number(t.usageCount)||0,monthUses:Number(t.monthUses)||0,monthDiscount:null!=t.monthDiscount?parseFloat(String(t.monthDiscount)):0,monthRevenue:null!=t.monthRevenue?parseFloat(String(t.monthRevenue)):0,startsAt:t.startsAt?new Date(t.startsAt).toISOString():null,endsAt:t.endsAt?new Date(t.endsAt).toISOString():null,timeStart:t.timeStart??null,timeEnd:t.timeEnd??null,weekdays:t.weekdays??null,description:t.description??null}}async function p(t){let{rows:e}=await S.query(`SELECT
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
          AND i.status <> 'VOID'), 0)::text AS "revenuePrevMonth"`,[t]);return{activeCount:e[0]?.activeCount??0,usedThisMonth:e[0]?.usedThisMonth??0,discountTotalMonth:Math.round(100*(parseFloat(e[0]?.discountTotalMonth??"0")||0))/100,estimatedRevenueMonth:Math.round(100*(parseFloat(e[0]?.estimatedRevenueMonth??"0")||0))/100,customersTouchedMonth:e[0]?.customersTouchedMonth??0,usedPrevMonth:e[0]?.usedPrevMonth??0,discountPrevMonth:Math.round(100*(parseFloat(e[0]?.discountPrevMonth??"0")||0))/100,revenuePrevMonth:Math.round(100*(parseFloat(e[0]?.revenuePrevMonth??"0")||0))/100,archivedCount:e[0]?.archivedCount??0,totalCount:e[0]?.totalCount??0}}async function l(t,e){let o=['p."organizationId" = $1','p."deletedAt" IS NULL'],r=[t],n=2;e.status&&(o.push(`p.status = $${n}::"PromotionStatus"`),r.push(e.status),n++),e.search&&(o.push(`(p.name ILIKE $${n} OR COALESCE(p.code,'') ILIKE $${n})`),r.push(`%${e.search}%`),n++);let i=o.join(" AND "),s=(e.page-1)*e.limit,[a,u,d]=await Promise.all([S.query(`SELECT COUNT(*)::int AS total FROM "Promotion" p WHERE ${i}`,r),S.query(`SELECT p.id, p.name, p.code, p.type::text, p.status::text, p.value::text, p."serviceId", p.category,
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
       LIMIT $${n} OFFSET $${n+1}`,[...r,e.limit,s]),p(t)]);return{items:u.rows.map(t=>m(t)),total:a.rows[0]?.total??0,kpis:d}}async function c(t,e,o){let r=d("promo");await S.query(`INSERT INTO "Promotion" (
      id, "organizationId", name, code, type, status, value, "serviceId", category,
      "customerId", "minAmount", "maxUses", "maxUsesPerCustomer", "usageCount",
      "startsAt", "endsAt", "timeStart", "timeEnd", weekdays, description, "updatedAt"
    ) VALUES (
      $1,$2,$3,$4,$5::"PromotionType",$6::"PromotionStatus",$7,$8,$9,
      $10,$11,$12,$13,0,$14,$15,$16,$17,$18,$19,NOW()
    )`,[r,t,e.name,e.code??null,e.type,e.status??"ACTIVE",e.value??null,e.serviceId??null,e.category??null,e.customerId??null,e.minAmount??null,e.maxUses??null,e.maxUsesPerCustomer??null,e.startsAt?new Date(e.startsAt):null,e.endsAt?new Date(e.endsAt):null,e.timeStart??null,e.timeEnd??null,e.weekdays??null,e.description??null]),await (0,a.writeAuditLog)({organizationId:t,actorId:o.id,actorName:o.name,entityType:"Promotion",entityId:r,action:"CREATE",after:e});let{items:n}=await l(t,{page:1,limit:1,search:e.name});return n.find(t=>t.id===r)??n[0]}async function E(t,e,o,r){await S.query(`UPDATE "Promotion" SET status = $1::"PromotionStatus", "updatedAt" = NOW()
     WHERE id = $2 AND "organizationId" = $3 AND "deletedAt" IS NULL`,[o,e,t]),await (0,a.writeAuditLog)({organizationId:t,actorId:r.id,actorName:r.name,entityType:"Promotion",entityId:e,action:"STATUS",after:{status:o}});let{rows:n}=await S.query(`SELECT id, name, code, type::text, status::text, value::text, "serviceId", category,
            "minAmount"::text, "maxUses", "maxUsesPerCustomer", "usageCount", "startsAt", "endsAt",
            "timeStart", "timeEnd", weekdays, description, "customerId"
     FROM "Promotion" WHERE id = $1 AND "organizationId" = $2`,[e,t]);if(!n[0])throw Error("NOT_FOUND");return m(n[0])}async function A(t){let e=t.at??new Date,o=null;if(t.promotionId){let{rows:e}=await S.query(`SELECT * FROM "Promotion"
       WHERE id = $1 AND "organizationId" = $2 AND "deletedAt" IS NULL`,[t.promotionId,t.organizationId]);o=e[0]??null}else if(t.promotionCode){let{rows:e}=await S.query(`SELECT * FROM "Promotion"
       WHERE "organizationId" = $1 AND upper(code) = upper($2) AND "deletedAt" IS NULL
       ORDER BY CASE WHEN status = 'ACTIVE' THEN 0 ELSE 1 END, "updatedAt" DESC`,[t.organizationId,t.promotionCode.trim()]);o=e[0]??null}if(!o)return null;if("ACTIVE"!==String(o.status))throw Error("PROMO_INACTIVE");if(o.startsAt&&new Date(o.startsAt)>e)throw Error("PROMO_NOT_STARTED");if(o.endsAt&&new Date(o.endsAt)<e)throw Error("PROMO_EXPIRED");if(o.serviceId&&String(o.serviceId)!==t.serviceId)throw Error("PROMO_SERVICE_MISMATCH");if(o.category&&t.serviceCategory&&String(o.category)!==t.serviceCategory)throw Error("PROMO_CATEGORY_MISMATCH");let r=null!=o.minAmount?parseFloat(String(o.minAmount)):0;if(t.amount<r)throw Error("PROMO_MIN_AMOUNT");if(null!=o.maxUses&&Number(o.usageCount)>=Number(o.maxUses))throw Error("PROMO_MAX_USES");if(null!=o.maxUsesPerCustomer){let{rows:e}=await S.query(`SELECT COUNT(*)::int AS n FROM "PromotionUsage"
       WHERE "promotionId" = $1 AND "customerId" = $2`,[o.id,t.customerId]);if((e[0]?.n??0)>=Number(o.maxUsesPerCustomer))throw Error("PROMO_MAX_PER_CUSTOMER")}let n=String(o.type);if("HAPPY_HOUR"===n||o.timeStart||o.weekdays){if(o.weekdays&&!String(o.weekdays).split(",").map(t=>t.trim()).includes(String(e.getDay())))throw Error("PROMO_WEEKDAY");if(o.timeStart&&o.timeEnd){let t=`${String(e.getHours()).padStart(2,"0")}:${String(e.getMinutes()).padStart(2,"0")}`;if(t<String(o.timeStart)||t>String(o.timeEnd))throw Error("PROMO_TIME")}}let i=null!=o.value?parseFloat(String(o.value)):0,s=0;return("PERCENTAGE"===n?s=Math.round(t.amount*(i/100)*100)/100:"FIXED_AMOUNT"===n||"HAPPY_HOUR"===n||"PACKAGE"===n?s=Math.min(t.amount,i):"FREE_SERVICE"===n&&(s=t.amount),(s=Math.max(0,Math.min(t.amount,s)))<=0)?null:{promotionId:String(o.id),name:String(o.name),code:o.code??null,type:n,discountAmount:s}}async function I(t){let e=t.client??S;await e.query(`INSERT INTO "PromotionUsage" (
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
       AND r."organizationId" = $2 AND r."customerId" = $3 AND r.status = 'AVAILABLE'`,[t.promotionId,t.organizationId,t.customerId])}r()}catch(t){r(t)}})},26086:(t,e,o)=>{o.d(e,{p2:()=>m,d1:()=>a,nS:()=>d,TQ:()=>u});let r=["PERCENTAGE","FIXED_AMOUNT","FREE_SERVICE","PACKAGE","HAPPY_HOUR"];function n(t){if("string"!=typeof t)return;let e=t.trim();return e.length?e:void 0}function i(t){return"number"==typeof t&&Number.isFinite(t)?t:"string"==typeof t&&""!==t.trim()&&Number.isFinite(Number(t))?Number(t):void 0}function s(t){let e=i(t);if(void 0!==e&&Number.isInteger(e))return e}function a(t){return{page:Math.max(1,Number(t.get("page"))||1),limit:Math.min(100,Math.max(1,Number(t.get("limit"))||40)),status:t.get("status")?.trim()||null,search:t.get("search")?.trim()||""}}function u(t){let e=[],o=n(t.name),a=n(t.type);return(o||e.push("name"),a&&r.includes(a)||e.push("type"),!e.length&&o&&a)?{ok:!0,data:{name:o,code:n(t.code)?.toUpperCase(),type:a,status:n(t.status)||"ACTIVE",value:i(t.value),serviceId:n(t.serviceId),category:n(t.category),customerId:n(t.customerId),minAmount:i(t.minAmount),maxUses:s(t.maxUses),maxUsesPerCustomer:s(t.maxUsesPerCustomer),startsAt:n(t.startsAt),endsAt:n(t.endsAt),timeStart:n(t.timeStart),timeEnd:n(t.timeEnd),weekdays:n(t.weekdays),description:n(t.description)}}:{ok:!1,errors:e}}function d(t){let e=i(t.amount);return void 0===e||e<=0?{ok:!1,errors:["amount"]}:{ok:!0,data:{amount:Math.round(100*e)/100,buyerCustomerId:n(t.buyerCustomerId),beneficiaryCustomerId:n(t.beneficiaryCustomerId),expiresAt:n(t.expiresAt),notes:n(t.notes)}}}function m(t){return{page:Math.max(1,Number(t.get("page"))||1),limit:Math.min(200,Math.max(1,Number(t.get("limit"))||40)),status:t.get("status")?.trim()||null,search:t.get("search")?.trim()||""}}}};var e=require("../../../webpack-runtime.js");e.C(t);var o=t=>e(e.s=t),r=e.X(0,[9085,3192,6485,3110,618,444],()=>o(22373));module.exports=r})();