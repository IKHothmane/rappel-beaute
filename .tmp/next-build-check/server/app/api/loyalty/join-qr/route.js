"use strict";(()=>{var t={};t.id=1658,t.ids=[1658],t.modules={72934:t=>{t.exports=require("next/dist/client/components/action-async-storage.external.js")},54580:t=>{t.exports=require("next/dist/client/components/request-async-storage.external.js")},45869:t=>{t.exports=require("next/dist/client/components/static-generation-async-storage.external.js")},20399:t=>{t.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},30517:t=>{t.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},48927:t=>{t.exports=require("web-push")},84770:t=>{t.exports=require("crypto")},92048:t=>{t.exports=require("fs")},71568:t=>{t.exports=require("zlib")},8678:t=>{t.exports=import("pg")},6005:t=>{t.exports=require("node:crypto")},42725:t=>{t.exports=require("node:http2")},16229:(t,e,a)=>{a.a(t,async(t,r)=>{try{a.r(e),a.d(e,{originalPathname:()=>N,patchFetch:()=>d,requestAsyncStorage:()=>E,routeModule:()=>u,serverHooks:()=>A,staticGenerationAsyncStorage:()=>c});var i=a(49303),o=a(88716),n=a(60670),s=a(44955),l=t([s]);s=(l.then?(await l)():l)[0];let u=new i.AppRouteRouteModule({definition:{kind:o.x.APP_ROUTE,page:"/api/loyalty/join-qr/route",pathname:"/api/loyalty/join-qr",filename:"route",bundlePath:"app/api/loyalty/join-qr/route"},resolvedPagePath:"C:\\Users\\LordOfTHeRings\\Desktop\\rappel beauty\\src\\app\\api\\loyalty\\join-qr\\route.ts",nextConfigOutput:"",userland:s}),{requestAsyncStorage:E,staticGenerationAsyncStorage:c,serverHooks:A}=u,N="/api/loyalty/join-qr/route";function d(){return(0,n.patchFetch)({serverHooks:A,staticGenerationAsyncStorage:c})}r()}catch(t){r(t)}})},49303:(t,e,a)=>{t.exports=a(30517)},44955:(t,e,a)=>{a.a(t,async(t,r)=>{try{a.r(e),a.d(e,{GET:()=>l,POST:()=>d});var i=a(87070),o=a(33568),n=a(68487),s=t([o,n]);async function l(t){let e=await (0,o.lr)(t,"loyalty");if(!e.ok)return e.response;let a=await (0,n.eI)(e.session.organizationId);return i.NextResponse.json({qr:a})}async function d(t){let e=await (0,o.f8)(t,"loyalty");if(!e.ok)return e.response;let a=await t.json().catch(()=>({}));if("revoke"===a.action)return await (0,n.uL)(e.session.organizationId),i.NextResponse.json({qr:null});let r=await (0,n.$I)(e.session.organizationId);return i.NextResponse.json({qr:r})}[o,n]=s.then?(await s)():s,r()}catch(t){r(t)}})},69510:(t,e,a)=>{a.a(t,async(t,r)=>{try{a.d(e,{$d:()=>I,Q5:()=>u,S7:()=>N,Wk:()=>E,bt:()=>d,ew:()=>c,pJ:()=>y,sM:()=>p});var i=a(84770),o=a(8678),n=a(88114),s=a(68887),l=t([o,n]);[o,n]=l.then?(await l)():l;let w=new o.Pool({connectionString:process.env.DATABASE_URL}),m="ABCDEFGHJKLMNPQRSTUVWXYZ23456789";function d(t){return`${t}_${(0,i.randomBytes)(8).toString("hex")}`}function u(){let t=(0,i.randomBytes)(12),e="RBLOY_";for(let a of t)e+=m[a%m.length];return e}async function E(t){var e;await (0,n.FC)(t);let{rows:a}=await w.query(`SELECT "visitsPerReward", "rewardLabel", active, "rewardValidityDays", "stackRewards", "eligibleServiceIds",
            "rewardKind", "rewardValue"::text AS "rewardValue", "cardBackgroundUrl", "cardBackgroundColor"
     FROM "LoyaltyProgram" WHERE "organizationId" = $1`,[t]),r=a[0];return{visitsPerReward:r?.visitsPerReward&&r.visitsPerReward>0?r.visitsPerReward:5,rewardLabel:r?.rewardLabel?.trim()||"R\xe9compense",active:r?.active??!0,rewardValidityDays:r?.rewardValidityDays&&r.rewardValidityDays>0?r.rewardValidityDays:30,stackRewards:r?.stackRewards??!0,eligibleServiceIds:r?.eligibleServiceIds??[],rewardKind:(e=r?.rewardKind,"DISCOUNT"===e?"DISCOUNT":"PERCENTAGE"===e?"PERCENTAGE":"FREE_SERVICE"),rewardValue:r?.rewardValue!=null?parseFloat(r.rewardValue):null,cardBackgroundUrl:r?.cardBackgroundUrl??null,cardBackgroundColor:r?.cardBackgroundColor??null}}async function c(t,e){let a=await w.query(`SELECT id, "firstName", "lastName"
     FROM "Customer"
     WHERE id = $1 AND "organizationId" = $2 AND "deletedAt" IS NULL`,[e,t]);if(!a.rows[0])throw Error("CUSTOMER_NOT_FOUND");await A(t,e);let r=await w.query(`SELECT id, "publicToken" FROM "LoyaltyCard"
     WHERE "organizationId" = $1 AND "customerId" = $2`,[t,e]);if(r.rows[0])return await w.query('UPDATE "LoyaltyCard" SET "updatedAt" = NOW() WHERE id = $1',[r.rows[0].id]),{id:r.rows[0].id,publicToken:r.rows[0].publicToken,customerId:e,firstName:a.rows[0].firstName,lastName:a.rows[0].lastName};let i=d("lcard"),o=u();try{await w.query(`INSERT INTO "LoyaltyCard" (id, "organizationId", "customerId", "publicToken", status, "updatedAt")
       VALUES ($1, $2, $3, $4, 'ACTIVE', NOW())`,[i,t,e,o])}catch(o){let r=o.code;if("23505"!==r)throw o;let i=await w.query(`SELECT id, "publicToken" FROM "LoyaltyCard"
       WHERE "organizationId" = $1 AND "customerId" = $2`,[t,e]);if(!i.rows[0])throw o;return{id:i.rows[0].id,publicToken:i.rows[0].publicToken,customerId:e,firstName:a.rows[0].firstName,lastName:a.rows[0].lastName}}return{id:i,publicToken:o,customerId:e,firstName:a.rows[0].firstName,lastName:a.rows[0].lastName}}async function A(t,e){await w.query(`INSERT INTO "LoyaltyAccount" (
      id, "organizationId", "customerId", balance, "lifetimePoints", level, "updatedAt"
    ) VALUES ($1, $2, $3, 0, 0, 'BRONZE', NOW())
     ON CONFLICT ("organizationId", "customerId") DO NOTHING`,[d("lacc"),t,e])}async function N(t){let e=await E(t);for(let e of(await w.query(`SELECT "customerId" FROM "LoyaltyCard"
     WHERE "organizationId" = $1 AND status = 'ACTIVE'`,[t])).rows)await A(t,e.customerId);let{rows:a}=await w.query(`SELECT lc.id, c.id AS "customerId", c."firstName", c."lastName", c.phone, lc."publicToken",
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
     LIMIT 200`,[t]);return a.map(t=>({id:t.id,customerId:t.customerId,customerName:`${t.firstName} ${t.lastName}`.trim(),phone:t.phone,visits:t.visits,visitsPerReward:e.visitsPerReward,createdAt:t.createdAt.toISOString(),lastActivityAt:t.lastActivityAt.toISOString(),publicToken:t.publicToken,cardCode:(0,s.J)(t.publicToken),promoCode:t.rewardsReady>0?(0,s.J)(t.publicToken):null}))}async function I(t,e,a){let r=a??w,i=await r.query(`SELECT o.name AS "organizationName", o."logoUrl" AS "organizationLogoUrl", c."firstName", c."lastName", c.phone
     FROM "LoyaltyCard" lc
     JOIN "Organization" o ON o.id = lc."organizationId"
     JOIN "Customer" c ON c.id = lc."customerId"
     WHERE lc.id = $1 AND lc."organizationId" = $2 AND lc.status = 'ACTIVE'`,[t,e]);if(!i.rows[0])return null;let o=await E(e),n=await r.query('SELECT COALESCE(SUM(points), 0)::text AS count FROM "LoyaltyEvent" WHERE "loyaltyCardId" = $1 AND type = \'VISIT\'',[t]),l=Number(n.rows[0]?.count??0),d=o.visitsPerReward,u=(0,s.i)(l,d),c=0===u?d:d-u,A=await r.query(`SELECT e."validatedAt" AS at,
            COALESCE(a."serviceNameSnapshot", s.name, e.note, 'Ajustement') AS service,
            e.amount::text AS amount,
            e.points
     FROM "LoyaltyEvent" e
     LEFT JOIN "Appointment" a ON a.id = e."appointmentId"
     LEFT JOIN "Service" s ON s.id = e."serviceId"
     WHERE e."loyaltyCardId" = $1
     ORDER BY e."validatedAt" DESC
     LIMIT 30`,[t]);await r.query(`UPDATE "LoyaltyVisitReward"
     SET status = 'EXPIRED'
     WHERE "loyaltyCardId" = $1 AND status = 'AVAILABLE'
       AND "expiresAt" IS NOT NULL AND "expiresAt" < NOW()`,[t]);let N=await r.query(`SELECT id, name, status, "earnedAt", "expiresAt", value::text AS value
     FROM "LoyaltyVisitReward"
     WHERE "loyaltyCardId" = $1
     ORDER BY "earnedAt" DESC
     LIMIT 20`,[t]),I=N.rows.filter(t=>"AVAILABLE"===t.status).length,y=await r.query('SELECT "customerId" FROM "LoyaltyCard" WHERE id = $1 AND "organizationId" = $2',[t,e]),p=y.rows[0]?.customerId,m=p?await r.query(`SELECT a."startAt" AS at,
                COALESCE(a."serviceNameSnapshot", s.name, 'Rendez-vous') AS service,
                COALESCE(st."firstName", '') AS staff
         FROM "Appointment" a
         LEFT JOIN "Service" s ON s.id = a."serviceId"
         LEFT JOIN "Staff" st ON st.id = a."staffId"
         WHERE a."organizationId" = $1 AND a."customerId" = $2
           AND a.status IN ('PENDING', 'CONFIRMED', 'ARRIVED', 'IN_PROGRESS')
           AND a."startAt" >= NOW() - INTERVAL '2 hours'
         ORDER BY a."startAt" ASC
         LIMIT 8`,[e,p]):{rows:[]},R=p?await r.query(`SELECT name, "sessionUsed" AS used, "sessionTotal" AS total
         FROM "Package"
         WHERE "organizationId" = $1 AND "customerId" = $2 AND status = 'ACTIVE'
         ORDER BY "purchasedAt" DESC
         LIMIT 12`,[e,p]):{rows:[]};return{organizationName:i.rows[0].organizationName,organizationLogoUrl:i.rows[0].organizationLogoUrl,firstName:i.rows[0].firstName,lastName:i.rows[0].lastName,phone:i.rows[0].phone,visits:l,visitsPerReward:d,cycle:u,remaining:c,rewardLabel:o.rewardLabel,rewardsAvailable:I,history:A.rows.map(t=>({at:t.at.toISOString(),service:t.service,amount:Number(t.amount),points:t.points})),rewards:N.rows.map(t=>({id:t.id,name:t.name,status:t.status,earnedAt:t.earnedAt.toISOString(),expiresAt:t.expiresAt?t.expiresAt.toISOString():null,value:null!=t.value?Number(t.value):null})),appointments:m.rows.map(t=>({at:t.at.toISOString(),service:t.service,staff:t.staff})),sessions:R.rows.map(t=>({name:t.name,used:Number(t.used),total:Number(t.total),remaining:Math.max(0,Number(t.total)-Number(t.used))})),cardBackgroundUrl:o.cardBackgroundUrl,cardBackgroundColor:o.cardBackgroundColor}}async function y(t,e){let a=e.trim().toUpperCase(),r=a.match(/RBLOY_[A-Z2-9]{8,32}/);if(r){let e=await w.query(`SELECT "publicToken" FROM "LoyaltyCard"
       WHERE "publicToken" = $1 AND "organizationId" = $2 AND status = 'ACTIVE'`,[r[0],t]);if(!e.rows[0])throw Error("CARD_NOT_FOUND");return e.rows[0].publicToken}let i=a.replace(/^CLIENTE\s+/,"").replace(/[^A-Z2-9]/g,"");if(i.length<4||i.length>12)throw Error("CARD_NOT_FOUND");let o=await w.query(`SELECT "publicToken" FROM "LoyaltyCard"
     WHERE "organizationId" = $1 AND status = 'ACTIVE' AND "publicToken" LIKE $2
     LIMIT 2`,[t,`%${i}`]);if(1===o.rows.length)return o.rows[0].publicToken;if(o.rows.length>1)throw Error("CARD_AMBIGUOUS");throw Error("CARD_NOT_FOUND")}async function p(t){let e=t.trim().toUpperCase();if(!/^RBLOY_[A-Z2-9]{8,32}$/.test(e))return null;let{rows:a}=await w.query('SELECT id, "organizationId" FROM "LoyaltyCard" WHERE "publicToken" = $1 AND status = \'ACTIVE\'',[e]);return a[0]?I(a[0].id,a[0].organizationId):null}r()}catch(t){r(t)}})},68487:(t,e,a)=>{a.a(t,async(t,r)=>{try{a.d(e,{$I:()=>E,Dm:()=>y,GH:()=>I,Vu:()=>N,eI:()=>u,t_:()=>A,uL:()=>c});var i=a(84770),o=a(8678),n=a(69510),s=a(47441),l=t([o,n]);[o,n]=l.then?(await l)():l;let p=new o.Pool({connectionString:process.env.DATABASE_URL});async function d(t){let{rows:e}=await p.query(`SELECT q.token, o.name AS "organizationName",
            COALESCE(NULLIF(p.name, ''), o.name) AS "programName",
            COALESCE(p."visitsPerReward", 10) AS "visitsPerReward",
            COALESCE(NULLIF(p."rewardLabel", ''), 'R\xe9compense') AS "rewardLabel",
            COALESCE(p.active, true) AS active
     FROM "LoyaltyJoinQr" q
     JOIN "Organization" o ON o.id = q."organizationId"
     LEFT JOIN "LoyaltyProgram" p ON p."organizationId" = o.id
     WHERE q."organizationId" = $1 AND q.status = 'ACTIVE'
     ORDER BY q."createdAt" DESC
     LIMIT 1`,[t]),a=e[0];return a?{token:a.token,status:"ACTIVE",organizationName:a.organizationName,programName:a.programName,visitsPerReward:a.visitsPerReward>0?a.visitsPerReward:10,rewardLabel:a.rewardLabel,active:a.active}:null}async function u(t){let e=await d(t);if(e)return e;await p.query(`INSERT INTO "LoyaltyJoinQr" (id, "organizationId", token, status)
     SELECT $1, $2, $3, 'ACTIVE'
     WHERE NOT EXISTS (
       SELECT 1 FROM "LoyaltyJoinQr" WHERE "organizationId" = $2 AND status = 'ACTIVE'
     )`,[(0,n.bt)("ljqr"),t,`RBJOIN_${(0,n.Q5)().slice(6)}`]);let a=await d(t);if(!a)throw Error("JOIN_QR_FAILED");return a}async function E(t){return u(t)}async function c(t){await p.query(`UPDATE "LoyaltyJoinQr" SET status = 'REVOKED', "revokedAt" = NOW()
     WHERE "organizationId" = $1 AND status = 'ACTIVE'`,[t])}async function A(t){let e=t.trim().toUpperCase();if(!/^RBJOIN_[A-Z2-9]{8,32}$/.test(e))return null;let{rows:a}=await p.query('SELECT "organizationId" FROM "LoyaltyJoinQr" WHERE token = $1 AND status = \'ACTIVE\'',[e]);return a[0]?d(a[0].organizationId):null}async function N(t){let e=await A(t.token);if(!e)throw Error("JOIN_QR_INVALID");if(!e.active)throw Error("PROGRAM_DISABLED");let a=(0,s.d6)(t.phone);if(a.length<8||a.length>10)throw Error("INVALID_PHONE");let r=t.firstName.trim(),o=t.lastName.trim();if(r.length<1||o.length<1)throw Error("INVALID_NAME");let l=await p.query('SELECT "organizationId" FROM "LoyaltyJoinQr" WHERE token = $1 AND status = \'ACTIVE\'',[t.token.trim().toUpperCase()]),d=l.rows[0]?.organizationId;if(!d)throw Error("JOIN_QR_INVALID");let u=await p.query(`SELECT id FROM "Customer"
     WHERE "organizationId" = $1 AND phone = $2 AND "deletedAt" IS NULL`,[d,a]),E=u.rows[0]?.id;if(!E){E=`cust_${(0,i.randomBytes)(6).toString("hex")}`;try{await p.query(`INSERT INTO "Customer" (
          id, "organizationId", "firstName", "lastName", phone, email, status,
          "marketingWhatsapp", "marketingEmail", "marketingSms", "updatedAt"
        ) VALUES ($1, $2, $3, $4, $5, $6, 'NEW', false, false, false, NOW())`,[E,d,r,o,a,t.email?.trim()||null])}catch(r){let t=r.code;if("23505"!==t)throw r;let e=await p.query(`SELECT id FROM "Customer"
         WHERE "organizationId" = $1 AND phone = $2 AND "deletedAt" IS NULL`,[d,a]);if(!e.rows[0])throw r;E=e.rows[0].id}}return{cardToken:(await (0,n.ew)(d,E)).publicToken}}async function I(t){let e=await A(t);if(!e)throw Error("JOIN_QR_INVALID");if(!e.active)throw Error("PROGRAM_DISABLED");let a=await p.query('SELECT "organizationId" FROM "LoyaltyJoinQr" WHERE token = $1 AND status = \'ACTIVE\'',[t.trim().toUpperCase()]),r=a.rows[0]?.organizationId;if(!r)throw Error("JOIN_QR_INVALID");let o="";for(let t=0;t<3;t+=1){o=`cust_${(0,i.randomBytes)(6).toString("hex")}`;let e=`WL${(0,i.randomBytes)(4).toString("hex")}`;try{await p.query(`INSERT INTO "Customer" (
          id, "organizationId", "firstName", "lastName", phone, status,
          "marketingWhatsapp", "marketingEmail", "marketingSms", "updatedAt"
        ) VALUES ($1, $2, 'Cliente', $3, $4, 'NEW', false, false, false, NOW())`,[o,r,e.slice(-4).toUpperCase(),e]);break}catch(a){let e=a.code;if("23505"!==e||2===t)throw a;o=""}}if(!o)throw Error("JOIN_QR_FAILED");let s=await (0,n.ew)(r,o);return await p.query('UPDATE "Customer" SET "lastName" = $1, "updatedAt" = NOW() WHERE id = $2',[s.publicToken.slice(-4),o]),{cardToken:s.publicToken}}async function y(t,e){let a=t.trim().toUpperCase(),r=e.trim().toUpperCase();if(!/^RBLOY_[A-Z2-9]{8,32}$/.test(r))return null;let{rows:i}=await p.query(`SELECT lc.id, lc."publicToken"
     FROM "LoyaltyCard" lc
     JOIN "LoyaltyJoinQr" q ON q."organizationId" = lc."organizationId"
     WHERE lc."publicToken" = $1 AND q.token = $2 AND q.status = 'ACTIVE' AND lc.status = 'ACTIVE'`,[r,a]);return i[0]?(await p.query('UPDATE "LoyaltyCard" SET "updatedAt" = NOW() WHERE id = $1',[i[0].id]),i[0].publicToken):null}r()}catch(t){r(t)}})}};var e=require("../../../../webpack-runtime.js");e.C(t);var a=t=>e(e.s=t),r=e.X(0,[8948,7070,3314,3376,3568,8114],()=>a(16229));module.exports=r})();