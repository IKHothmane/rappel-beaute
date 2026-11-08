"use strict";(()=>{var e={};e.id=5836,e.ids=[5836],e.modules={72934:e=>{e.exports=require("next/dist/client/components/action-async-storage.external.js")},54580:e=>{e.exports=require("next/dist/client/components/request-async-storage.external.js")},45869:e=>{e.exports=require("next/dist/client/components/static-generation-async-storage.external.js")},20399:e=>{e.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},30517:e=>{e.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},48927:e=>{e.exports=require("web-push")},84770:e=>{e.exports=require("crypto")},92048:e=>{e.exports=require("fs")},71568:e=>{e.exports=require("zlib")},8678:e=>{e.exports=import("pg")},6005:e=>{e.exports=require("node:crypto")},42725:e=>{e.exports=require("node:http2")},47877:(e,t,r)=>{r.a(e,async(e,a)=>{try{r.r(t),r.d(t,{originalPathname:()=>p,patchFetch:()=>d,requestAsyncStorage:()=>u,routeModule:()=>c,serverHooks:()=>A,staticGenerationAsyncStorage:()=>E});var o=r(49303),i=r(88716),s=r(60670),n=r(24255),l=e([n]);n=(l.then?(await l)():l)[0];let c=new o.AppRouteRouteModule({definition:{kind:i.x.APP_ROUTE,page:"/api/loyalty/cards/route",pathname:"/api/loyalty/cards",filename:"route",bundlePath:"app/api/loyalty/cards/route"},resolvedPagePath:"C:\\Users\\LordOfTHeRings\\Desktop\\rappel beauty\\src\\app\\api\\loyalty\\cards\\route.ts",nextConfigOutput:"",userland:n}),{requestAsyncStorage:u,staticGenerationAsyncStorage:E,serverHooks:A}=c,p="/api/loyalty/cards/route";function d(){return(0,s.patchFetch)({serverHooks:A,staticGenerationAsyncStorage:E})}a()}catch(e){a(e)}})},49303:(e,t,r)=>{e.exports=r(30517)},24255:(e,t,r)=>{r.a(e,async(e,a)=>{try{r.r(t),r.d(t,{POST:()=>d});var o=r(87070),i=r(33568),s=r(69510),n=r(90510),l=e([i,s]);async function d(e){let t=await (0,i.PX)(e,"loyalty");if(!t.ok)return t.response;try{let r=(0,i.stripOrganizationId)(await e.json()),a=String(r.customerId??"").trim();if(!a)return o.NextResponse.json({error:"Choisissez une cliente."},{status:400});let l=await (0,s.ew)(t.session.organizationId,a);return o.NextResponse.json({...l,cardUrl:(0,n.Eh)(l.publicToken)})}catch(e){if(e instanceof Error&&"CUSTOMER_NOT_FOUND"===e.message)return o.NextResponse.json({error:"Cliente introuvable."},{status:404});return console.error("[POST /api/loyalty/cards]",e),o.NextResponse.json({error:"Impossible de cr\xe9er la carte."},{status:500})}}[i,s]=l.then?(await l)():l,a()}catch(e){a(e)}})},69510:(e,t,r)=>{r.a(e,async(e,a)=>{try{r.d(t,{$d:()=>y,Q5:()=>c,S7:()=>p,Wk:()=>u,bt:()=>d,ew:()=>E,pJ:()=>N,sM:()=>w});var o=r(84770),i=r(8678),s=r(88114),n=r(68887),l=e([i,s]);[i,s]=l.then?(await l)():l;let I=new i.Pool({connectionString:process.env.DATABASE_URL}),m="ABCDEFGHJKLMNPQRSTUVWXYZ23456789";function d(e){return`${e}_${(0,o.randomBytes)(8).toString("hex")}`}function c(){let e=(0,o.randomBytes)(12),t="RBLOY_";for(let r of e)t+=m[r%m.length];return t}async function u(e){var t;await (0,s.FC)(e);let{rows:r}=await I.query(`SELECT "visitsPerReward", "rewardLabel", active, "rewardValidityDays", "stackRewards", "eligibleServiceIds",
            "rewardKind", "rewardValue"::text AS "rewardValue", "cardBackgroundUrl", "cardBackgroundColor"
     FROM "LoyaltyProgram" WHERE "organizationId" = $1`,[e]),a=r[0];return{visitsPerReward:a?.visitsPerReward&&a.visitsPerReward>0?a.visitsPerReward:5,rewardLabel:a?.rewardLabel?.trim()||"R\xe9compense",active:a?.active??!0,rewardValidityDays:a?.rewardValidityDays&&a.rewardValidityDays>0?a.rewardValidityDays:30,stackRewards:a?.stackRewards??!0,eligibleServiceIds:a?.eligibleServiceIds??[],rewardKind:(t=a?.rewardKind,"DISCOUNT"===t?"DISCOUNT":"PERCENTAGE"===t?"PERCENTAGE":"FREE_SERVICE"),rewardValue:a?.rewardValue!=null?parseFloat(a.rewardValue):null,cardBackgroundUrl:a?.cardBackgroundUrl??null,cardBackgroundColor:a?.cardBackgroundColor??null}}async function E(e,t){let r=await I.query(`SELECT id, "firstName", "lastName"
     FROM "Customer"
     WHERE id = $1 AND "organizationId" = $2 AND "deletedAt" IS NULL`,[t,e]);if(!r.rows[0])throw Error("CUSTOMER_NOT_FOUND");await A(e,t);let a=await I.query(`SELECT id, "publicToken" FROM "LoyaltyCard"
     WHERE "organizationId" = $1 AND "customerId" = $2`,[e,t]);if(a.rows[0])return await I.query('UPDATE "LoyaltyCard" SET "updatedAt" = NOW() WHERE id = $1',[a.rows[0].id]),{id:a.rows[0].id,publicToken:a.rows[0].publicToken,customerId:t,firstName:r.rows[0].firstName,lastName:r.rows[0].lastName};let o=d("lcard"),i=c();try{await I.query(`INSERT INTO "LoyaltyCard" (id, "organizationId", "customerId", "publicToken", status, "updatedAt")
       VALUES ($1, $2, $3, $4, 'ACTIVE', NOW())`,[o,e,t,i])}catch(i){let a=i.code;if("23505"!==a)throw i;let o=await I.query(`SELECT id, "publicToken" FROM "LoyaltyCard"
       WHERE "organizationId" = $1 AND "customerId" = $2`,[e,t]);if(!o.rows[0])throw i;return{id:o.rows[0].id,publicToken:o.rows[0].publicToken,customerId:t,firstName:r.rows[0].firstName,lastName:r.rows[0].lastName}}return{id:o,publicToken:i,customerId:t,firstName:r.rows[0].firstName,lastName:r.rows[0].lastName}}async function A(e,t){await I.query(`INSERT INTO "LoyaltyAccount" (
      id, "organizationId", "customerId", balance, "lifetimePoints", level, "updatedAt"
    ) VALUES ($1, $2, $3, 0, 0, 'BRONZE', NOW())
     ON CONFLICT ("organizationId", "customerId") DO NOTHING`,[d("lacc"),e,t])}async function p(e){let t=await u(e);for(let t of(await I.query(`SELECT "customerId" FROM "LoyaltyCard"
     WHERE "organizationId" = $1 AND status = 'ACTIVE'`,[e])).rows)await A(e,t.customerId);let{rows:r}=await I.query(`SELECT lc.id, c.id AS "customerId", c."firstName", c."lastName", c.phone, lc."publicToken",
            COALESCE((
              SELECT SUM(e.points) FROM "LoyaltyEvent" e
              WHERE e."loyaltyCardId" = lc.id AND e.type = 'VISIT'
            ), 0)::int AS visits,
            COALESCE((
              SELECT COUNT(*) FROM "LoyaltyVisitReward" r
              WHERE r."loyaltyCardId" = lc.id AND r.status = 'AVAILABLE'
                AND (r."expiresAt" IS NULL OR r."expiresAt" > NOW())
            ), 0)::int AS "rewardsReady",
            lc."createdAt",
            GREATEST(
              lc."createdAt",
              lc."updatedAt",
              COALESCE((
                SELECT MAX(e."validatedAt") FROM "LoyaltyEvent" e
                WHERE e."loyaltyCardId" = lc.id
              ), lc."createdAt")
            ) AS "lastActivityAt"
     FROM "LoyaltyCard" lc
     JOIN "Customer" c ON c.id = lc."customerId"
     WHERE lc."organizationId" = $1 AND lc.status = 'ACTIVE' AND c."deletedAt" IS NULL
     ORDER BY "lastActivityAt" DESC, lc."createdAt" DESC
     LIMIT 200`,[e]);return r.map(e=>({id:e.id,customerId:e.customerId,customerName:`${e.firstName} ${e.lastName}`.trim(),phone:e.phone,visits:e.visits,visitsPerReward:t.visitsPerReward,createdAt:e.createdAt.toISOString(),lastActivityAt:e.lastActivityAt.toISOString(),publicToken:e.publicToken,cardCode:(0,n.J)(e.publicToken),promoCode:e.rewardsReady>0?(0,n.J)(e.publicToken):null}))}async function y(e,t,r){let a=r??I,o=await a.query(`SELECT o.name AS "organizationName", o."logoUrl" AS "organizationLogoUrl", c."firstName", c."lastName", c.phone
     FROM "LoyaltyCard" lc
     JOIN "Organization" o ON o.id = lc."organizationId"
     JOIN "Customer" c ON c.id = lc."customerId"
     WHERE lc.id = $1 AND lc."organizationId" = $2 AND lc.status = 'ACTIVE'`,[e,t]);if(!o.rows[0])return null;let i=await u(t),s=await a.query('SELECT COALESCE(SUM(points), 0)::text AS count FROM "LoyaltyEvent" WHERE "loyaltyCardId" = $1 AND type = \'VISIT\'',[e]),l=Number(s.rows[0]?.count??0),d=i.visitsPerReward,c=(0,n.i)(l,d),E=0===c?d:d-c,A=await a.query(`SELECT e."validatedAt" AS at,
            COALESCE(a."serviceNameSnapshot", s.name, e.note, 'Ajustement') AS service,
            e.amount::text AS amount,
            e.points
     FROM "LoyaltyEvent" e
     LEFT JOIN "Appointment" a ON a.id = e."appointmentId"
     LEFT JOIN "Service" s ON s.id = e."serviceId"
     WHERE e."loyaltyCardId" = $1
     ORDER BY e."validatedAt" DESC
     LIMIT 30`,[e]);await a.query(`UPDATE "LoyaltyVisitReward"
     SET status = 'EXPIRED'
     WHERE "loyaltyCardId" = $1 AND status = 'AVAILABLE'
       AND "expiresAt" IS NOT NULL AND "expiresAt" < NOW()`,[e]);let p=await a.query(`SELECT id, name, status, "earnedAt", "expiresAt", value::text AS value
     FROM "LoyaltyVisitReward"
     WHERE "loyaltyCardId" = $1
     ORDER BY "earnedAt" DESC
     LIMIT 20`,[e]),y=p.rows.filter(e=>"AVAILABLE"===e.status).length,N=await a.query('SELECT "customerId" FROM "LoyaltyCard" WHERE id = $1 AND "organizationId" = $2',[e,t]),w=N.rows[0]?.customerId,m=w?await a.query(`SELECT a."startAt" AS at,
                COALESCE(a."serviceNameSnapshot", s.name, 'Rendez-vous') AS service,
                COALESCE(st."firstName", '') AS staff
         FROM "Appointment" a
         LEFT JOIN "Service" s ON s.id = a."serviceId"
         LEFT JOIN "Staff" st ON st.id = a."staffId"
         WHERE a."organizationId" = $1 AND a."customerId" = $2
           AND a.status IN ('PENDING', 'CONFIRMED', 'ARRIVED', 'IN_PROGRESS')
           AND a."startAt" >= NOW() - INTERVAL '2 hours'
         ORDER BY a."startAt" ASC
         LIMIT 8`,[t,w]):{rows:[]},R=w?await a.query(`SELECT name, "sessionUsed" AS used, "sessionTotal" AS total
         FROM "Package"
         WHERE "organizationId" = $1 AND "customerId" = $2 AND status = 'ACTIVE'
         ORDER BY "purchasedAt" DESC
         LIMIT 12`,[t,w]):{rows:[]};return{organizationName:o.rows[0].organizationName,organizationLogoUrl:o.rows[0].organizationLogoUrl,firstName:o.rows[0].firstName,lastName:o.rows[0].lastName,phone:o.rows[0].phone,visits:l,visitsPerReward:d,cycle:c,remaining:E,rewardLabel:i.rewardLabel,rewardsAvailable:y,history:A.rows.map(e=>({at:e.at.toISOString(),service:e.service,amount:Number(e.amount),points:e.points})),rewards:p.rows.map(e=>({id:e.id,name:e.name,status:e.status,earnedAt:e.earnedAt.toISOString(),expiresAt:e.expiresAt?e.expiresAt.toISOString():null,value:null!=e.value?Number(e.value):null})),appointments:m.rows.map(e=>({at:e.at.toISOString(),service:e.service,staff:e.staff})),sessions:R.rows.map(e=>({name:e.name,used:Number(e.used),total:Number(e.total),remaining:Math.max(0,Number(e.total)-Number(e.used))})),cardBackgroundUrl:i.cardBackgroundUrl,cardBackgroundColor:i.cardBackgroundColor}}async function N(e,t){let r=t.trim().toUpperCase(),a=r.match(/RBLOY_[A-Z2-9]{8,32}/);if(a){let t=await I.query(`SELECT "publicToken" FROM "LoyaltyCard"
       WHERE "publicToken" = $1 AND "organizationId" = $2 AND status = 'ACTIVE'`,[a[0],e]);if(!t.rows[0])throw Error("CARD_NOT_FOUND");return t.rows[0].publicToken}let o=r.replace(/^CLIENTE\s+/,"").replace(/[^A-Z2-9]/g,"");if(o.length<4||o.length>12)throw Error("CARD_NOT_FOUND");let i=await I.query(`SELECT "publicToken" FROM "LoyaltyCard"
     WHERE "organizationId" = $1 AND status = 'ACTIVE' AND "publicToken" LIKE $2
     LIMIT 2`,[e,`%${o}`]);if(1===i.rows.length)return i.rows[0].publicToken;if(i.rows.length>1)throw Error("CARD_AMBIGUOUS");throw Error("CARD_NOT_FOUND")}async function w(e){let t=e.trim().toUpperCase();if(!/^RBLOY_[A-Z2-9]{8,32}$/.test(t))return null;let{rows:r}=await I.query('SELECT id, "organizationId" FROM "LoyaltyCard" WHERE "publicToken" = $1 AND status = \'ACTIVE\'',[t]);return r[0]?y(r[0].id,r[0].organizationId):null}a()}catch(e){a(e)}})},90510:(e,t,r)=>{r.d(t,{Ar:()=>i,Eh:()=>s,JK:()=>n,wI:()=>o});let a="https://rappelbeauty.com";function o(e,t){return e}function i(e){return a}function s(e){let t=e.trim().toUpperCase();return`${a}/carte/${t}/`}function n(e){return a}}};var t=require("../../../../webpack-runtime.js");t.C(e);var r=e=>t(t.s=e),a=t.X(0,[8948,7070,3314,3376,3568,8114],()=>r(47877));module.exports=a})();