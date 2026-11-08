"use strict";(()=>{var t={};t.id=5220,t.ids=[5220,5430],t.modules={72934:t=>{t.exports=require("next/dist/client/components/action-async-storage.external.js")},54580:t=>{t.exports=require("next/dist/client/components/request-async-storage.external.js")},45869:t=>{t.exports=require("next/dist/client/components/static-generation-async-storage.external.js")},20399:t=>{t.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},30517:t=>{t.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},48927:t=>{t.exports=require("web-push")},84770:t=>{t.exports=require("crypto")},92048:t=>{t.exports=require("fs")},71568:t=>{t.exports=require("zlib")},8678:t=>{t.exports=import("pg")},6005:t=>{t.exports=require("node:crypto")},42725:t=>{t.exports=require("node:http2")},17080:(t,e,a)=>{a.a(t,async(t,r)=>{try{a.r(e),a.d(e,{originalPathname:()=>m,patchFetch:()=>d,requestAsyncStorage:()=>l,routeModule:()=>c,serverHooks:()=>C,staticGenerationAsyncStorage:()=>E});var n=a(49303),i=a(88716),o=a(60670),s=a(53656),u=t([s]);s=(u.then?(await u)():u)[0];let c=new n.AppRouteRouteModule({definition:{kind:i.x.APP_ROUTE,page:"/api/gift-cards/route",pathname:"/api/gift-cards",filename:"route",bundlePath:"app/api/gift-cards/route"},resolvedPagePath:"C:\\Users\\LordOfTHeRings\\Desktop\\rappel beauty\\src\\app\\api\\gift-cards\\route.ts",nextConfigOutput:"",userland:s}),{requestAsyncStorage:l,staticGenerationAsyncStorage:E,serverHooks:C}=c,m="/api/gift-cards/route";function d(){return(0,o.patchFetch)({serverHooks:C,staticGenerationAsyncStorage:E})}r()}catch(t){r(t)}})},49303:(t,e,a)=>{t.exports=a(30517)},53656:(t,e,a)=>{a.a(t,async(t,r)=>{try{a.r(e),a.d(e,{GET:()=>c,POST:()=>l});var n=a(87070),i=a(33568),o=a(95430),s=a(37604),u=a(29725),d=t([i,o]);async function c(t){let e=await (0,i.lr)(t,"promotions");if(!e.ok)return e.response;try{let a=new URL(t.url),r=a.searchParams.get("code"),i=a.searchParams.get("id");if(r){let t=await (0,o.$9)(e.session.organizationId,r);if(!t)return n.NextResponse.json({error:"Carte introuvable."},{status:404});return n.NextResponse.json(t)}if(i){let t=await (0,o.tf)(e.session.organizationId,i);if(!t)return n.NextResponse.json({error:"Carte introuvable."},{status:404});return n.NextResponse.json(t)}let s=(0,u.p2)(a.searchParams),[d,c]=await Promise.all([(0,o.eU)(e.session.organizationId,{...s,search:s.search||void 0}),(0,o.b8)(e.session.organizationId,24)]);return n.NextResponse.json({data:d.items,pagination:{page:s.page,limit:s.limit,total:d.total,totalPages:Math.max(1,Math.ceil(d.total/s.limit))},kpis:d.kpis,journal:c})}catch(t){return console.error("[GET /api/gift-cards]",t),n.NextResponse.json({error:"Impossible de charger les cartes cadeaux."},{status:500})}}async function l(t){let e=await (0,i.f8)(t,"promotions");if(!e.ok)return e.response;if(!(0,s.Xh)(e.session.role))return n.NextResponse.json({error:"Acc\xe8s refus\xe9."},{status:403});try{let a=(0,i.stripOrganizationId)(await t.json()),r={id:e.session.id,name:`${e.session.firstName} ${e.session.lastName}`.trim()};if("cancel"===a.action){let t="string"==typeof a.id?a.id.trim():"";if(!t)return n.NextResponse.json({error:"Identifiant manquant."},{status:400});try{let a=await (0,o.YV)(e.session.organizationId,t,r);return n.NextResponse.json(a)}catch(t){if(t instanceof Error&&"NOT_FOUND"===t.message)return n.NextResponse.json({error:"Carte introuvable."},{status:404});if(t instanceof Error&&"GIFT_CARD_INACTIVE"===t.message)return n.NextResponse.json({error:"Seule une carte active peut \xeatre suspendue."},{status:409});throw t}}let s=(0,u.nS)(a);if(!s.ok)return n.NextResponse.json({error:"Donn\xe9es invalides.",details:s.errors},{status:400});let d=await (0,o.Ic)(e.session.organizationId,s.data,r);return n.NextResponse.json(d,{status:201})}catch(t){return console.error("[POST /api/gift-cards]",t),n.NextResponse.json({error:"Impossible de traiter la carte."},{status:500})}}[i,o]=d.then?(await d)():d,r()}catch(t){r(t)}})},95430:(t,e,a)=>{a.a(t,async(t,r)=>{try{a.d(e,{$9:()=>p,Ic:()=>A,YV:()=>f,b8:()=>I,eU:()=>C,redeemGiftCard:()=>g,tf:()=>m});var n=a(84770),i=a(8678),o=a(2192),s=t([i,o]);[i,o]=s.then?(await s)():s;let N=new i.Pool({connectionString:process.env.DATABASE_URL});function u(t){return`${t}_${(0,n.randomBytes)(8).toString("hex")}`}function d(){let t=()=>(0,n.randomBytes)(2).toString("hex").toUpperCase();return`BEAUTY-${t()}-${t()}`}let y=`g.id, g.code, g."initialValue"::text, g.balance::text, g.status::text,
              g."buyerCustomerId", g."beneficiaryCustomerId", g."expiresAt", g."createdAt", g.notes,
              b."firstName" AS "buyerFirst", b."lastName" AS "buyerLast", b.phone AS "buyerPhone",
              n."firstName" AS "benFirst", n."lastName" AS "benLast", n.phone AS "benPhone"`;function c(t){return{id:String(t.id),code:String(t.code),initialValue:parseFloat(String(t.initialValue))||0,balance:parseFloat(String(t.balance))||0,status:t.status,buyerName:t.buyerFirst||t.buyerLast?`${t.buyerFirst??""} ${t.buyerLast??""}`.trim():null,beneficiaryName:t.benFirst||t.benLast?`${t.benFirst??""} ${t.benLast??""}`.trim():null,buyerPhone:t.buyerPhone??null,beneficiaryPhone:t.benPhone??null,buyerCustomerId:t.buyerCustomerId??null,beneficiaryCustomerId:t.beneficiaryCustomerId??null,notes:t.notes??null,expiresAt:t.expiresAt?new Date(t.expiresAt).toISOString():null,createdAt:new Date(t.createdAt).toISOString()}}function l(t){return Math.round(100*(parseFloat(t??"0")||0))/100}async function E(t){let{rows:e}=await N.query(`SELECT
      (SELECT COUNT(*)::int FROM "GiftCard"
       WHERE "organizationId" = $1 AND status <> 'CANCELLED') AS "soldCount",
      COALESCE((SELECT SUM("initialValue") FROM "GiftCard"
        WHERE "organizationId" = $1 AND status <> 'CANCELLED'), 0)::text AS "soldValue",
      COALESCE((SELECT SUM(ABS(amount)) FROM "GiftCardTransaction"
        WHERE "organizationId" = $1 AND type = 'REDEEMED'), 0)::text AS "redeemedValue",
      COALESCE((SELECT SUM(balance) FROM "GiftCard"
        WHERE "organizationId" = $1 AND status = 'ACTIVE'), 0)::text AS "remainingBalance",
      (SELECT COUNT(*)::int FROM "GiftCard"
        WHERE "organizationId" = $1 AND status = 'ACTIVE') AS "activeCount",
      (SELECT COUNT(*)::int FROM "GiftCard"
        WHERE "organizationId" = $1 AND status = 'USED') AS "usedCount",
      (SELECT COUNT(*)::int FROM "GiftCard"
        WHERE "organizationId" = $1 AND status <> 'CANCELLED'
          AND notes IS NOT NULL AND BTRIM(notes) <> '') AS "ritualCount",
      (SELECT COUNT(*)::int FROM "GiftCard"
        WHERE "organizationId" = $1 AND status <> 'CANCELLED'
          AND timezone('Africa/Casablanca', "createdAt") >= date_trunc('month', timezone('Africa/Casablanca', now()))
          AND timezone('Africa/Casablanca', "createdAt") < date_trunc('month', timezone('Africa/Casablanca', now())) + interval '1 month'
      ) AS "soldThisMonth",
      (SELECT COUNT(*)::int FROM "GiftCard"
        WHERE "organizationId" = $1 AND status <> 'CANCELLED'
          AND timezone('Africa/Casablanca', "createdAt") >= date_trunc('month', timezone('Africa/Casablanca', now())) - interval '1 month'
          AND timezone('Africa/Casablanca', "createdAt") < date_trunc('month', timezone('Africa/Casablanca', now()))
      ) AS "soldPrevMonth",
      COALESCE((SELECT SUM("initialValue") FROM "GiftCard"
        WHERE "organizationId" = $1 AND status <> 'CANCELLED'
          AND timezone('Africa/Casablanca', "createdAt") >= date_trunc('month', timezone('Africa/Casablanca', now()))
          AND timezone('Africa/Casablanca', "createdAt") < date_trunc('month', timezone('Africa/Casablanca', now())) + interval '1 month'
      ), 0)::text AS "soldValueThisMonth",
      (SELECT COUNT(*)::int FROM "GiftCard"
        WHERE "organizationId" = $1 AND status = 'ACTIVE'
          AND "expiresAt" IS NOT NULL
          AND "expiresAt" >= now()
          AND "expiresAt" <= now() + interval '30 days') AS "expiringSoonCount",
      COALESCE((SELECT SUM(balance) FROM "GiftCard"
        WHERE "organizationId" = $1 AND status = 'ACTIVE'
          AND "expiresAt" IS NOT NULL
          AND "expiresAt" >= now()
          AND "expiresAt" <= now() + interval '30 days'), 0)::text AS "expiringSoonBalance"`,[t]),a=e[0];return{soldCount:a?.soldCount??0,soldValue:l(a?.soldValue),redeemedValue:l(a?.redeemedValue),remainingBalance:l(a?.remainingBalance),activeCount:a?.activeCount??0,usedCount:a?.usedCount??0,ritualCount:a?.ritualCount??0,soldThisMonth:a?.soldThisMonth??0,soldPrevMonth:a?.soldPrevMonth??0,soldValueThisMonth:l(a?.soldValueThisMonth),expiringSoonCount:a?.expiringSoonCount??0,expiringSoonBalance:l(a?.expiringSoonBalance)}}async function C(t,e){let a=['g."organizationId" = $1'],r=[t],n=2;e.status&&(a.push(`g.status = $${n}::"GiftCardStatus"`),r.push(e.status),n++),e.search&&(a.push(`(
      g.code ILIKE $${n}
      OR COALESCE(g.notes, '') ILIKE $${n}
      OR COALESCE(b."firstName", '') ILIKE $${n}
      OR COALESCE(b."lastName", '') ILIKE $${n}
      OR COALESCE(b.phone, '') ILIKE $${n}
      OR COALESCE(n."firstName", '') ILIKE $${n}
      OR COALESCE(n."lastName", '') ILIKE $${n}
      OR COALESCE(n.phone, '') ILIKE $${n}
    )`),r.push(`%${e.search}%`),n++);let i=a.join(" AND "),o=(e.page-1)*e.limit,[s,u,d]=await Promise.all([N.query(`SELECT COUNT(*)::int AS total
       FROM "GiftCard" g
       LEFT JOIN "Customer" b ON b.id = g."buyerCustomerId"
       LEFT JOIN "Customer" n ON n.id = g."beneficiaryCustomerId"
       WHERE ${i}`,r),N.query(`SELECT ${y}
       FROM "GiftCard" g
       LEFT JOIN "Customer" b ON b.id = g."buyerCustomerId"
       LEFT JOIN "Customer" n ON n.id = g."beneficiaryCustomerId"
       WHERE ${i}
       ORDER BY g."createdAt" DESC
       LIMIT $${n} OFFSET $${n+1}`,[...r,e.limit,o]),E(t)]);return{items:u.rows.map(t=>c(t)),total:s.rows[0]?.total??0,kpis:d}}async function m(t,e){let{rows:a}=await N.query(`SELECT ${y}
     FROM "GiftCard" g
     LEFT JOIN "Customer" b ON b.id = g."buyerCustomerId"
     LEFT JOIN "Customer" n ON n.id = g."beneficiaryCustomerId"
     WHERE g.id = $1 AND g."organizationId" = $2`,[e,t]);if(!a[0])return null;let r=await N.query(`SELECT id, type::text, amount::text, "balanceAfter"::text, reason, "paymentId", "createdAt"
     FROM "GiftCardTransaction" WHERE "giftCardId" = $1 ORDER BY "createdAt" ASC`,[e]);return{...c(a[0]),transactions:r.rows.map(t=>({id:t.id,type:t.type,amount:parseFloat(t.amount)||0,balanceAfter:parseFloat(t.balanceAfter)||0,reason:t.reason,paymentId:t.paymentId,createdAt:new Date(t.createdAt).toISOString()}))}}async function p(t,e){let{rows:a}=await N.query(`SELECT ${y}
     FROM "GiftCard" g
     LEFT JOIN "Customer" b ON b.id = g."buyerCustomerId"
     LEFT JOIN "Customer" n ON n.id = g."beneficiaryCustomerId"
     WHERE g."organizationId" = $1 AND upper(g.code) = upper($2)`,[t,e]);return a[0]?c(a[0]):null}async function A(t,e,a){let r=await N.connect(),n=d(),i=u("gc");try{await r.query("BEGIN");for(let o=0;o<5;o++)try{await r.query(`INSERT INTO "GiftCard" (
            id, "organizationId", code, "initialValue", balance,
            "buyerCustomerId", "beneficiaryCustomerId", status, "expiresAt",
            notes, "createdById", "updatedAt"
          ) VALUES (
            $1,$2,$3,$4,$4,$5,$6,'ACTIVE'::"GiftCardStatus",$7,$8,$9,NOW()
          )`,[i,t,n,e.amount,e.buyerCustomerId??null,e.beneficiaryCustomerId??null,function(t){if(t)return new Date(t);let e=new Date;return e.setFullYear(e.getFullYear()+1),e}(e.expiresAt),e.notes??null,a.id]);break}catch(t){if("object"==typeof t&&null!==t&&"code"in t&&"23505"===t.code&&o<4){n=d();continue}throw t}await r.query(`INSERT INTO "GiftCardTransaction" (
        id, "organizationId", "giftCardId", type, amount, "balanceAfter",
        reason, "createdById", "idempotencyKey"
      ) VALUES (
        $1,$2,$3,'ISSUED'::"GiftCardTxnType",$4,$4,'\xc9mission carte cadeau',$5,$6
      )`,[u("gctx"),t,i,e.amount,a.id,`issue:${i}`]),await (0,o.writeAuditLog)({organizationId:t,actorId:a.id,actorName:a.name,entityType:"GiftCard",entityId:i,action:"ISSUE",after:{code:n,amount:e.amount},client:r}),await r.query("COMMIT")}catch(t){throw await r.query("ROLLBACK"),t}finally{r.release()}let s=await m(t,i);if(!s)throw Error("NOT_FOUND");return s}async function I(t,e=20){let{rows:a}=await N.query(`SELECT t.id, g.code, t.type::text, t.amount::text, t."balanceAfter"::text,
            t.reason, t."paymentId", t."createdAt",
            NULLIF(TRIM(COALESCE(u."firstName", '') || ' ' || COALESCE(u."lastName", '')), '') AS "actorName"
     FROM "GiftCardTransaction" t
     JOIN "GiftCard" g ON g.id = t."giftCardId"
     LEFT JOIN "User" u ON u.id = t."createdById"
     WHERE t."organizationId" = $1
     ORDER BY t."createdAt" DESC
     LIMIT $2`,[t,e]);return a.map(t=>{var e;let a=parseFloat(t.amount)||0,r=parseFloat(t.balanceAfter)||0,i=new Date(t.createdAt).toISOString();return{id:t.id,code:t.code,type:t.type,amount:a,balanceAfter:r,reason:t.reason,paymentId:t.paymentId,actorName:t.actorName,createdAt:i,proofHash:(e=[t.id,t.type,t.amount,t.balanceAfter,i],(0,n.createHash)("sha256").update(e.join("|")).digest("hex"))}})}async function f(t,e,a){let r=await N.connect();try{await r.query("BEGIN");let{rows:n}=await r.query(`SELECT id, status::text, balance::text, code
       FROM "GiftCard"
       WHERE id = $1 AND "organizationId" = $2
       FOR UPDATE`,[e,t]);if(!n[0])throw Error("NOT_FOUND");if("ACTIVE"!==n[0].status)throw Error("GIFT_CARD_INACTIVE");await r.query(`UPDATE "GiftCard"
       SET status = 'CANCELLED'::"GiftCardStatus", "updatedAt" = NOW()
       WHERE id = $1`,[e]),await r.query(`INSERT INTO "GiftCardTransaction" (
        id, "organizationId", "giftCardId", type, amount, "balanceAfter",
        reason, "createdById", "idempotencyKey"
      ) VALUES (
        $1,$2,$3,'ADJUSTMENT'::"GiftCardTxnType",0,$4,'Suspension carte cadeau',$5,$6
      )`,[u("gctx"),t,e,parseFloat(n[0].balance)||0,a.id,`cancel:${e}:${Date.now()}`]),await (0,o.writeAuditLog)({organizationId:t,actorId:a.id,actorName:a.name,entityType:"GiftCard",entityId:e,action:"CANCEL",after:{code:n[0].code,status:"CANCELLED"},client:r}),await r.query("COMMIT")}catch(t){throw await r.query("ROLLBACK"),t}finally{r.release()}let n=await m(t,e);if(!n)throw Error("NOT_FOUND");return n}async function g(t){let e=t.client??N,a=`redeem:payment:${t.paymentId}`,r=await e.query(`SELECT "giftCardId", amount::text FROM "GiftCardTransaction"
     WHERE "organizationId" = $1 AND "idempotencyKey" = $2`,[t.organizationId,a]);if(r.rows[0])return{giftCardId:r.rows[0].giftCardId,redeemed:Math.abs(parseFloat(r.rows[0].amount)||0)};let n=t.giftCardId;if(!n&&t.code){let a=await e.query(`SELECT id FROM "GiftCard"
       WHERE "organizationId" = $1 AND upper(code) = upper($2)`,[t.organizationId,t.code]);n=a.rows[0]?.id}if(!n)throw Error("GIFT_CARD_NOT_FOUND");let{rows:i}=await e.query(`SELECT id, balance::text, status::text, "expiresAt"
     FROM "GiftCard"
     WHERE id = $1 AND "organizationId" = $2
     FOR UPDATE`,[n,t.organizationId]);if(!i[0])throw Error("GIFT_CARD_NOT_FOUND");if("ACTIVE"!==i[0].status)throw Error("GIFT_CARD_INACTIVE");if(i[0].expiresAt&&new Date(i[0].expiresAt)<new Date)throw await e.query(`UPDATE "GiftCard" SET status = 'EXPIRED'::"GiftCardStatus", "updatedAt" = NOW()
       WHERE id = $1`,[n]),Error("GIFT_CARD_EXPIRED");let o=parseFloat(i[0].balance)||0,s=Math.min(t.amount,o);if(s<=0)throw Error("GIFT_CARD_EMPTY");let d=Math.round((o-s)*100)/100,c=d<=0?"USED":"ACTIVE";return await e.query(`INSERT INTO "GiftCardTransaction" (
      id, "organizationId", "giftCardId", type, amount, "balanceAfter",
      reason, "paymentId", "createdById", "idempotencyKey"
    ) VALUES (
      $1,$2,$3,'REDEEMED'::"GiftCardTxnType",$4,$5,'Utilisation encaissement',$6,$7,$8
    )`,[u("gctx"),t.organizationId,n,-s,d,t.paymentId,t.userId??null,a]),await e.query(`UPDATE "GiftCard" SET
      balance = $1,
      status = $2::"GiftCardStatus",
      "updatedAt" = NOW()
     WHERE id = $3`,[d,c,n]),{giftCardId:n,redeemed:s}}r()}catch(t){r(t)}})},29725:(t,e,a)=>{a.d(e,{p2:()=>c,d1:()=>s,nS:()=>d,TQ:()=>u});let r=["PERCENTAGE","FIXED_AMOUNT","FREE_SERVICE","PACKAGE","HAPPY_HOUR"];function n(t){if("string"!=typeof t)return;let e=t.trim();return e.length?e:void 0}function i(t){return"number"==typeof t&&Number.isFinite(t)?t:"string"==typeof t&&""!==t.trim()&&Number.isFinite(Number(t))?Number(t):void 0}function o(t){let e=i(t);if(void 0!==e&&Number.isInteger(e))return e}function s(t){return{page:Math.max(1,Number(t.get("page"))||1),limit:Math.min(100,Math.max(1,Number(t.get("limit"))||40)),status:t.get("status")?.trim()||null,search:t.get("search")?.trim()||""}}function u(t){let e=[],a=n(t.name),s=n(t.type);return(a||e.push("name"),s&&r.includes(s)||e.push("type"),!e.length&&a&&s)?{ok:!0,data:{name:a,code:n(t.code)?.toUpperCase(),type:s,status:n(t.status)||"ACTIVE",value:i(t.value),serviceId:n(t.serviceId),category:n(t.category),customerId:n(t.customerId),minAmount:i(t.minAmount),maxUses:o(t.maxUses),maxUsesPerCustomer:o(t.maxUsesPerCustomer),startsAt:n(t.startsAt),endsAt:n(t.endsAt),timeStart:n(t.timeStart),timeEnd:n(t.timeEnd),weekdays:n(t.weekdays),description:n(t.description)}}:{ok:!1,errors:e}}function d(t){let e=i(t.amount);return void 0===e||e<=0?{ok:!1,errors:["amount"]}:{ok:!0,data:{amount:Math.round(100*e)/100,buyerCustomerId:n(t.buyerCustomerId),beneficiaryCustomerId:n(t.beneficiaryCustomerId),expiresAt:n(t.expiresAt),notes:n(t.notes)}}}function c(t){return{page:Math.max(1,Number(t.get("page"))||1),limit:Math.min(200,Math.max(1,Number(t.get("limit"))||40)),status:t.get("status")?.trim()||null,search:t.get("search")?.trim()||""}}}};var e=require("../../../webpack-runtime.js");e.C(t);var a=t=>e(e.s=t),r=e.X(0,[8948,7070,3314,3376,3568],()=>a(17080));module.exports=r})();