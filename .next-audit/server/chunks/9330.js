"use strict";!function(){try{var t="undefined"!=typeof window?window:"undefined"!=typeof global?global:"undefined"!=typeof self?self:{},n=(new t.Error).stack;n&&(t._sentryDebugIds=t._sentryDebugIds||{},t._sentryDebugIds[n]="2780f7e9-d1a0-431e-8455-a20091c19e80",t._sentryDebugIdIdentifier="sentry-dbid-2780f7e9-d1a0-431e-8455-a20091c19e80")}catch(t){}}(),exports.id=9330,exports.ids=[9330],exports.modules={50590:(t,n,a)=>{a.a(t,async(t,r)=>{try{a.d(n,{Xj:()=>s,_V:()=>d,kF:()=>E});var e=a(46485),i=a(40444),o=t([i]);function s(t,n=200){return e.NextResponse.json(t,{status:n,headers:{"Cache-Control":"private, no-store"}})}function d(t,n){return e.NextResponse.json({error:t},{status:n})}async function E(t){return(0,i.ZX)(t)}i=(o.then?(await o)():o)[0],r()}catch(t){r(t)}})},31916:(t,n,a)=>{a.a(t,async(t,r)=>{try{a.d(n,{C3:()=>P,TH:()=>A,VM:()=>l,Xw:()=>R,Yw:()=>g,du:()=>d.du,getAdminSubscriptionsKpis:()=>c,jN:()=>N,jl:()=>m,m:()=>y,oj:()=>I,pM:()=>O,qn:()=>f,x6:()=>T});var e=a(84770),i=a(8678),o=a(90831),s=a(74157),d=a(16340),E=a(79333),u=t([i,s,d,E]);[i,s,d,E]=u.then?(await u)():u;let U=(0,o.S)(new i.Pool({connectionString:process.env.DATABASE_URL}));function p(t){return`${t.firstName} ${t.lastName}`.trim()}async function c(){let{rows:t}=await U.query(`SELECT
      COUNT(*)::text AS total,
      COUNT(*) FILTER (WHERE s.status = 'ACTIVE')::text AS active,
      COUNT(*) FILTER (WHERE s.status = 'TRIAL')::text AS trial,
      COUNT(*) FILTER (WHERE s.status = 'PAST_DUE')::text AS pastDue,
      COUNT(*) FILTER (WHERE s.status = 'PAUSED')::text AS suspended,
      COUNT(*) FILTER (
        WHERE s.status IN ('ACTIVE', 'TRIAL', 'PAST_DUE')
          AND s."currentPeriodEnd" > NOW()
          AND s."currentPeriodEnd" <= NOW() + INTERVAL '7 days'
      )::text AS soon,
      COUNT(*) FILTER (
        WHERE s.status = 'EXPIRED'
          OR (s."currentPeriodEnd" < NOW() AND s.status IN ('ACTIVE', 'TRIAL', 'PAST_DUE'))
      )::text AS expired,
      COALESCE(SUM(s."priceSnapshot") FILTER (WHERE s.status IN ('ACTIVE', 'TRIAL')), 0)::text AS mrr
     FROM "Subscription" s`);return{total:parseInt(t[0]?.total??"0",10),active:parseInt(t[0]?.active??"0",10),trial:parseInt(t[0]?.trial??"0",10),pastDue:parseInt(t[0]?.pastDue??"0",10),suspended:parseInt(t[0]?.suspended??"0",10),expiringSoon:parseInt(t[0]?.soon??"0",10),expired:parseInt(t[0]?.expired??"0",10),mrr:parseFloat(t[0]?.mrr??"0")}}function S(t,n){let a=Math.ceil((n.getTime()-Date.now())/864e5);return"EXPIRED"===t||a<0?{daysUntilExpiry:a,urgency:"expired",paymentLabel:"PAST_DUE"===t?"Impay\xe9":"\xc9chu"}:"PAUSED"===t||"CANCELLED"===t?{daysUntilExpiry:a,urgency:a<=7?"soon":"ok",paymentLabel:"PAUSED"===t?"Suspendu":"Annul\xe9"}:"TRIAL"===t?{daysUntilExpiry:a,urgency:a<=7?"soon":"ok",paymentLabel:a<=7?`Essai (J-${Math.max(0,a)})`:"En essai"}:"PAST_DUE"===t?{daysUntilExpiry:a,urgency:"soon",paymentLabel:"Impay\xe9"}:a<=7?{daysUntilExpiry:a,urgency:"soon",paymentLabel:"Renouvellement"}:{daysUntilExpiry:a,urgency:"ok",paymentLabel:"Pay\xe9"}}async function I(t){let n=[],a=[];t?.search?.trim()&&(n.push(`%${t.search.trim().toLowerCase()}%`),a.push(`(LOWER(o.name) LIKE $${n.length} OR LOWER(COALESCE(o.email, '')) LIKE $${n.length})`)),t?.planCode&&(n.push(t.planCode),a.push(`p.code = $${n.length}`)),t?.status==="EXPIRING_SOON"?a.push(`s.status IN ('ACTIVE', 'TRIAL', 'PAST_DUE')
       AND s."currentPeriodEnd" > NOW()
       AND s."currentPeriodEnd" <= NOW() + INTERVAL '7 days'`):t?.status==="EXPIRED_VIEW"?a.push("(s.status = 'EXPIRED' OR (s.\"currentPeriodEnd\" < NOW() AND s.status IN ('ACTIVE', 'TRIAL', 'PAST_DUE')))"):t?.status&&(n.push(t.status),a.push(`s.status = $${n.length}::"SubscriptionStatus"`)),t?.organizationId&&(n.push(t.organizationId),a.push(`s."organizationId" = $${n.length}`));let r=a.length?`WHERE ${a.join(" AND ")}`:"",{rows:e}=await U.query(`SELECT s.id, s."organizationId", o.name AS "organizationName", o.email AS "organizationEmail",
            o.city AS "organizationCity",
            s."planId", p.code AS "planCode", p.name AS "planName", s.status,
            s."priceSnapshot"::text, s."currencySnapshot",
            s."currentPeriodStart", s."currentPeriodEnd", s."trialEndsAt", s."startedAt"
     FROM "Subscription" s
     JOIN "Organization" o ON o.id = s."organizationId"
     JOIN "Plan" p ON p.id = s."planId"
     ${r}
     ORDER BY s."currentPeriodEnd" ASC`,n);return e.map(t=>{let n=S(t.status,t.currentPeriodEnd);return{id:t.id,organizationId:t.organizationId,organizationName:t.organizationName,organizationEmail:t.organizationEmail,organizationCity:t.organizationCity,planId:t.planId,planCode:t.planCode,planName:t.planName,status:t.status,priceSnapshot:parseFloat(t.priceSnapshot),currencySnapshot:t.currencySnapshot,currentPeriodStart:t.currentPeriodStart.toISOString(),currentPeriodEnd:t.currentPeriodEnd.toISOString(),trialEndsAt:t.trialEndsAt?.toISOString()??null,startedAt:t.startedAt.toISOString(),...n}})}async function l(t){let{rows:n}=await U.query(`SELECT s.id, s."organizationId", o.name AS "organizationName", o.email AS "organizationEmail",
            o.city AS "organizationCity",
            s."planId", p.code AS "planCode", p.name AS "planName", s.status,
            s."priceSnapshot"::text, s."currencySnapshot",
            s."currentPeriodStart", s."currentPeriodEnd", s."trialEndsAt", s."startedAt"
     FROM "Subscription" s
     JOIN "Organization" o ON o.id = s."organizationId"
     JOIN "Plan" p ON p.id = s."planId"
     WHERE s.id = $1`,[t]),a=n[0];if(!a)return null;let r=S(a.status,a.currentPeriodEnd);return{id:a.id,organizationId:a.organizationId,organizationName:a.organizationName,organizationEmail:a.organizationEmail,organizationCity:a.organizationCity,planId:a.planId,planCode:a.planCode,planName:a.planName,status:a.status,priceSnapshot:parseFloat(a.priceSnapshot),currencySnapshot:a.currencySnapshot,currentPeriodStart:a.currentPeriodStart.toISOString(),currentPeriodEnd:a.currentPeriodEnd.toISOString(),trialEndsAt:a.trialEndsAt?.toISOString()??null,startedAt:a.startedAt.toISOString(),...r}}async function A(t,n){let{rows:a}=await U.query(`SELECT id, "platformUserName", action, "before", "after", "createdAt"
     FROM "PlatformAuditLog"
     WHERE ("entityId" = $1 OR ("organizationId" = $2 AND "entityType" = 'Subscription'))
     ORDER BY "createdAt" DESC
     LIMIT 50`,[t,n]);return a.map(t=>({id:t.id,platformUserName:t.platformUserName,action:t.action,before:t.before,after:t.after,createdAt:t.createdAt.toISOString()}))}async function y(t,n,a,r){let e=await (0,d.Ov)(a);if(!e||!e.active)throw Error("PLAN_NOT_FOUND");let{rows:i}=await U.query(`SELECT "organizationId", "planId", "priceSnapshot"::text, status, "currentPeriodEnd"
     FROM "Subscription" WHERE id = $1`,[n]),o=i[0];if(!o)throw Error("NOT_FOUND");let u=r?.applyAt??"now";if("next_period"===u){await U.query('UPDATE "Subscription" SET "planId" = $2, "priceSnapshot" = $3, "updatedAt" = NOW() WHERE id = $1',[n,a,e.price]),await (0,s._)({platformUserId:t.id,platformUserName:p(t),organizationId:o.organizationId,entityType:"Subscription",entityId:n,action:"SUBSCRIPTION_PLAN_CHANGE_SCHEDULED",before:{planId:o.planId,priceSnapshot:parseFloat(o.priceSnapshot)},after:{planId:a,priceSnapshot:e.price,planCode:e.code,applyAt:o.currentPeriodEnd.toISOString()}});return}let c=new Date,S=(0,E.zI)(c,1);await U.query(`UPDATE "Subscription" SET
      "planId" = $2,
      "priceSnapshot" = $3,
      status = CASE
        WHEN status = 'TRIAL'::"SubscriptionStatus" THEN 'TRIAL'::"SubscriptionStatus"
        ELSE 'ACTIVE'::"SubscriptionStatus"
      END,
      "currentPeriodStart" = $4,
      "currentPeriodEnd" = $5,
      "updatedAt" = NOW()
     WHERE id = $1`,[n,a,e.price,c,S]),await (0,s._)({platformUserId:t.id,platformUserName:p(t),organizationId:o.organizationId,entityType:"Subscription",entityId:n,action:"SUBSCRIPTION_CHANGED",before:{planId:o.planId,priceSnapshot:parseFloat(o.priceSnapshot)},after:{planId:a,priceSnapshot:e.price,planCode:e.code}})}async function N(t,n,a,r,e){let{rows:i}=await U.query('SELECT "organizationId", status FROM "Subscription" WHERE id = $1',[n]),o=i[0];if(!o)throw Error("NOT_FOUND");await U.query(`UPDATE "Subscription" SET status = $2::"SubscriptionStatus", "updatedAt" = NOW(),
      "cancelledAt" = CASE WHEN $2::text = 'CANCELLED' THEN NOW() ELSE "cancelledAt" END
     WHERE id = $1`,[n,a]),await (0,s._)({platformUserId:t.id,platformUserName:p(t),organizationId:o.organizationId,entityType:"Subscription",entityId:n,action:r,before:{status:o.status},after:{status:a,reason:e??null}})}async function T(t,n,a){let{rows:r}=await U.query('SELECT "organizationId", paid, "paidAt" FROM "Subscription" WHERE id = $1',[n]),e=r[0];if(!e)throw Error("NOT_FOUND");await U.query(`UPDATE "Subscription" SET
      paid = $2,
      "paidAt" = CASE WHEN $2 THEN NOW() ELSE NULL END,
      "updatedAt" = NOW()
     WHERE id = $1`,[n,a]),await (0,s._)({platformUserId:t.id,platformUserName:p(t),organizationId:e.organizationId,entityType:"Subscription",entityId:n,action:a?"SUBSCRIPTION_MARKED_PAID":"SUBSCRIPTION_MARKED_UNPAID",before:{paid:e.paid,paidAt:e.paidAt?.toISOString()??null},after:{paid:a}})}async function g(t,n,a=1){let{rows:r}=await U.query('SELECT "organizationId", "currentPeriodEnd" FROM "Subscription" WHERE id = $1',[n]),e=r[0];if(!e)throw Error("NOT_FOUND");let i=e.currentPeriodEnd.getTime()<Date.now()?new Date:e.currentPeriodEnd,o=(0,E.zI)(i,a);return await U.query('UPDATE "Subscription" SET "currentPeriodEnd" = $2, status = \'ACTIVE\', "updatedAt" = NOW() WHERE id = $1',[n,o]),await (0,s._)({platformUserId:t.id,platformUserName:p(t),organizationId:e.organizationId,entityType:"Subscription",entityId:n,action:"SUBSCRIPTION_EXTENDED",before:{currentPeriodEnd:e.currentPeriodEnd.toISOString()},after:{currentPeriodEnd:o.toISOString(),months:a}}),{newEnd:o.toISOString()}}async function O(t,n,a,r){let{rows:e}=await U.query('SELECT "organizationId", "currentPeriodEnd" FROM "Subscription" WHERE id = $1',[n]),i=e[0];if(!i)throw Error("NOT_FOUND");let o=i.currentPeriodEnd.getTime()<Date.now()?new Date:i.currentPeriodEnd,d=new Date(o.getTime()+864e5*a);return await U.query('UPDATE "Subscription" SET "currentPeriodEnd" = $2, status = \'ACTIVE\', "updatedAt" = NOW() WHERE id = $1',[n,d]),await (0,s._)({platformUserId:t.id,platformUserName:p(t),organizationId:i.organizationId,entityType:"Subscription",entityId:n,action:"SUBSCRIPTION_TRIAL_GRANTED",before:{currentPeriodEnd:i.currentPeriodEnd.toISOString()},after:{currentPeriodEnd:d.toISOString(),days:a,reason:r}}),{newEnd:d.toISOString()}}async function f(t,n,a=7){let{rows:r}=await U.query(`SELECT "organizationId", status, "currentPeriodEnd", "trialEndsAt"
     FROM "Subscription" WHERE id = $1`,[n]),e=r[0];if(!e)throw Error("NOT_FOUND");let i=new Date,o=new Date(i.getTime()+864e5*a);return await U.query(`UPDATE "Subscription" SET
      status = 'TRIAL',
      "trialEndsAt" = $2,
      "currentPeriodStart" = $3,
      "currentPeriodEnd" = $2,
      "cancelledAt" = NULL,
      "updatedAt" = NOW()
     WHERE id = $1`,[n,o,i]),await U.query(`UPDATE "Organization" SET status = 'ACTIVE', "updatedAt" = NOW()
     WHERE id = $1 AND status != 'ARCHIVED'`,[e.organizationId]),await (0,s._)({platformUserId:t.id,platformUserName:p(t),organizationId:e.organizationId,entityType:"Subscription",entityId:n,action:"SUBSCRIPTION_TRIAL_GRANTED",before:{status:e.status,currentPeriodEnd:e.currentPeriodEnd.toISOString(),trialEndsAt:e.trialEndsAt?.toISOString()??null},after:{status:"TRIAL",currentPeriodEnd:o.toISOString(),trialEndsAt:o.toISOString(),days:a,mode:"demo"}}),{newEnd:o.toISOString()}}async function m(t,n,a){if(!Number.isFinite(a)||a<0||a>1e6)throw Error("INVALID_PRICE");let r=Math.round(100*a)/100,{rows:e}=await U.query('SELECT "organizationId", "priceSnapshot"::text FROM "Subscription" WHERE id = $1',[n]),i=e[0];if(!i)throw Error("NOT_FOUND");return await U.query('UPDATE "Subscription" SET "priceSnapshot" = $2, "updatedAt" = NOW() WHERE id = $1',[n,r]),await (0,s._)({platformUserId:t.id,platformUserName:p(t),organizationId:i.organizationId,entityType:"Subscription",entityId:n,action:"SUBSCRIPTION_PRICE_CHANGED",before:{priceSnapshot:parseFloat(i.priceSnapshot)},after:{priceSnapshot:r}}),{price:r}}async function R(t,n,a){let{rows:r}=await U.query('SELECT "organizationId", "currentPeriodEnd", status FROM "Subscription" WHERE id = $1',[n]),e=r[0];if(!e)throw Error("NOT_FOUND");if(Number.isNaN(a.getTime()))throw Error("INVALID_DATE");return await U.query(`UPDATE "Subscription" SET
      "currentPeriodEnd" = $2,
      status = CASE
        WHEN status IN ('CANCELLED', 'EXPIRED') THEN 'ACTIVE'::"SubscriptionStatus"
        ELSE status
      END,
      "updatedAt" = NOW()
     WHERE id = $1`,[n,a]),await (0,s._)({platformUserId:t.id,platformUserName:p(t),organizationId:e.organizationId,entityType:"Subscription",entityId:n,action:"SUBSCRIPTION_EXTENDED",before:{currentPeriodEnd:e.currentPeriodEnd.toISOString(),status:e.status},after:{currentPeriodEnd:a.toISOString()}}),{newEnd:a.toISOString()}}async function P(t,n){let a=await (0,d.Le)(n.planCode);if(!a)throw Error("PLAN_NOT_FOUND");let{rows:r}=await U.query('SELECT id FROM "Subscription" WHERE "organizationId" = $1 ORDER BY "createdAt" DESC LIMIT 1',[n.organizationId]);if(r[0])return await y(t,r[0].id,a.id,{applyAt:"now"}),r[0].id;let e=await D(n.organizationId,a.id);return await U.query('UPDATE "Subscription" SET status = \'ACTIVE\', "trialEndsAt" = NULL, "updatedAt" = NOW() WHERE id = $1',[e]),await (0,s._)({platformUserId:t.id,platformUserName:p(t),organizationId:n.organizationId,entityType:"Subscription",entityId:e,action:"SUBSCRIPTION_CREATED",after:{planCode:n.planCode,planId:a.id}}),e}async function D(t,n,a){let r=await (0,d.Ov)(n);if(!r)throw Error("PLAN_NOT_FOUND");let i=new Date,o=new Date(i.getTime()+864e5*r.trialDays),s=(0,E.zI)(i,1),u=`sub_${(0,e.randomBytes)(6).toString("hex")}`;return await (a??U).query(`INSERT INTO "Subscription" (
      id, "organizationId", "planId", status, "priceSnapshot", "currencySnapshot",
      "startedAt", "currentPeriodStart", "currentPeriodEnd", "trialEndsAt", "updatedAt"
    ) VALUES ($1,$2,$3,'TRIAL',$4,$5,$6,$6,$7,$8,NOW())`,[u,t,n,r.price,r.currency,i,s,o]),u}r()}catch(t){r(t)}})},74157:(t,n,a)=>{a.a(t,async(t,r)=>{try{a.d(n,{_:()=>d,g:()=>E});var e=a(84770),i=a(8678),o=a(90831),s=t([i]);i=(s.then?(await s)():s)[0];let u=(0,o.S)(new i.Pool({connectionString:process.env.DATABASE_URL}));async function d(t){let n=t.client??u;await n.query(`INSERT INTO "PlatformAuditLog" (
      id, "platformUserId", "platformUserName", "organizationId",
      "entityType", "entityId", action, "before", "after"
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9::jsonb)`,[`paud_${(0,e.randomBytes)(8).toString("hex")}`,t.platformUserId??null,t.platformUserName??null,t.organizationId??null,t.entityType,t.entityId,t.action,null!=t.before?JSON.stringify(t.before):null,null!=t.after?JSON.stringify(t.after):null])}async function E(t){let n=Math.min(t.limit??50,200),a=[],r=[];t.organizationId&&(a.push(t.organizationId),r.push(`a."organizationId" = $${a.length}`)),t.entityType&&(a.push(t.entityType),r.push(`a."entityType" = $${a.length}`)),t.entityId&&(a.push(t.entityId),r.push(`a."entityId" = $${a.length}`));let e=r.length?`WHERE ${r.join(" AND ")}`:"";a.push(n);let{rows:i}=await u.query(`SELECT a.id, a."platformUserName", a."organizationId", o.name AS "organizationName",
            a."entityType", a."entityId", a.action, a."before", a."after", a."createdAt"
     FROM "PlatformAuditLog" a
     LEFT JOIN "Organization" o ON o.id = a."organizationId"
     ${e}
     ORDER BY a."createdAt" DESC
     LIMIT $${a.length}`,a);return i.map(t=>({id:t.id,platformUserName:t.platformUserName,organizationId:t.organizationId,organizationName:t.organizationName,entityType:t.entityType,entityId:t.entityId,action:t.action,before:t.before,after:t.after,createdAt:t.createdAt.toISOString()}))}r()}catch(t){r(t)}})}};