"use strict";exports.id=7577,exports.ids=[7577],exports.modules={87577:(e,t,r)=>{r.a(e,async(e,a)=>{try{r.r(t),r.d(t,{deliverDueWalletMessages:()=>m,deliverWalletMessagesForToken:()=>N,startGoogleWalletNotifier:()=>A});var n=r(84770),o=r(79549),i=r(43895),s=r(90510),d=r(5932),E=r(82433),l=r(78616),u=e([o,E,l]);async function c(e){let{rows:t}=await o.pool.query(`SELECT lc.id AS "cardId", lc."organizationId", lc."customerId", o.slug,
            COALESCE((
              SELECT SUM(e.points) FROM "LoyaltyEvent" e
              WHERE e."loyaltyCardId" = lc.id AND e.type = 'VISIT'
            ), 0)::int AS visits,
            GREATEST(COALESCE(lp."visitsPerReward", 10), 1)::int AS "visitsPerReward",
            (
              SELECT e.id FROM "LoyaltyEvent" e
              WHERE e."loyaltyCardId" = lc.id AND e.type = 'VISIT' AND e.points > 0
              ORDER BY e."validatedAt" DESC LIMIT 1
            ) AS "latestEventId",
            p."revokedAt", p."consentedAt", p."loyaltyReward", p."loyaltyProgress",
            p."reviewRequest", p."rewardExpiry"
     FROM "LoyaltyCard" lc
     JOIN "Organization" o ON o.id = lc."organizationId" AND o.status = 'ACTIVE'
     LEFT JOIN "LoyaltyProgram" lp ON lp."organizationId" = lc."organizationId"
     LEFT JOIN "NotificationPreference" p
       ON p."organizationId" = lc."organizationId" AND p."customerId" = lc."customerId"
     WHERE lc."publicToken" = $1 AND lc.status = 'ACTIVE'`,[e.trim().toUpperCase()]),r=t[0];if(!r)return null;let a=r.visitsPerReward,n=r.visits%a;return{cardId:r.cardId,organizationId:r.organizationId,customerId:r.customerId,slug:r.slug,cycle:n,visitsPerReward:a,remaining:0===n?a:a-n,latestEventId:r.latestEventId,revoked:!!r.revokedAt,hasPreference:!!r.consentedAt,loyaltyReward:!!r.loyaltyReward,loyaltyProgress:!!r.loyaltyProgress,reviewRequest:!!r.reviewRequest,rewardExpiry:!!r.rewardExpiry}}async function I(e){let t=[];for(let r of(await o.pool.query(`SELECT id, name, "expiresAt"
     FROM "LoyaltyVisitReward"
     WHERE "loyaltyCardId" = $1 AND status = 'AVAILABLE'`,[e.cardId])).rows)if(t.push({kind:"REWARD_AVAILABLE",entityId:r.id,header:"R\xe9compense disponible",body:`Votre r\xe9compense \xab ${r.name} \xbb est pr\xeate.`}),r.expiresAt&&r.expiresAt.getTime()>Date.now()&&r.expiresAt.getTime()<=Date.now()+2592e5){let e=r.expiresAt.toLocaleDateString("fr-FR",{timeZone:"Africa/Casablanca"});t.push({kind:"REWARD_EXPIRY",entityId:r.id,header:"R\xe9compense bient\xf4t expir\xe9e",body:`Votre r\xe9compense \xab ${r.name} \xbb expire le ${e}.`})}let r=(await o.pool.query(`SELECT rr.id, rr."publicToken", o.slug
     FROM "ReviewRequest" rr
     JOIN "Organization" o ON o.id = rr."organizationId"
     JOIN "Appointment" a ON a.id = rr."appointmentId" AND a.status = 'COMPLETED'
     WHERE rr."organizationId" = $1 AND rr."customerId" = $2
       AND rr.status IN ('PENDING', 'SENT')
       AND rr."tokenExpiresAt" > NOW()
       AND rr."scheduledFor" <= NOW()
       AND NOT EXISTS (SELECT 1 FROM "Review" rv WHERE rv."appointmentId" = rr."appointmentId")
     ORDER BY rr."scheduledFor" DESC
     LIMIT 1`,[e.organizationId,e.customerId])).rows[0];if(r){let a=(0,l.hg)({origin:(0,s.Ar)(),cardSlug:e.slug,requestSlug:r.slug,token:r.publicToken});a&&t.push({kind:"REVIEW_REQUEST",entityId:r.id,header:"Donner mon avis",body:`Dites-nous comment s'est pass\xe9 votre rendez-vous. ${a}`})}return e.latestEventId&&(0,l.Hk)(e.cycle,e.visitsPerReward,e.remaining)&&t.push({kind:"LOYALTY_PROGRESS",entityId:e.latestEventId,header:"Carte fid\xe9lit\xe9",body:`Votre carte est \xe0 ${e.cycle}/${e.visitsPerReward} passages.`}),t}async function p(e,t,r,a){let i=(0,l.NW)(t.kind,t.entityId);await o.pool.query(`INSERT INTO "GoogleWalletMessage" (
       id, "organizationId", "customerId", "loyaltyCardId", kind, "idempotencyKey",
       header, body, status, "attemptCount", error, "sentAt", "createdAt"
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,1,$10,CASE WHEN $9 = 'SENT' THEN NOW() ELSE NULL END,NOW())
     ON CONFLICT ("organizationId", "idempotencyKey") DO UPDATE SET
       status = EXCLUDED.status,
       "attemptCount" = "GoogleWalletMessage"."attemptCount" + 1,
       error = EXCLUDED.error,
       "sentAt" = CASE WHEN EXCLUDED.status = 'SENT' THEN NOW() ELSE "GoogleWalletMessage"."sentAt" END`,[(0,n.randomUUID)(),e.organizationId,e.customerId,e.cardId,t.kind,i,t.header,t.body,r,a])}async function N(e){if(!(0,d._7)())return{sent:0};let t=await c(e);if(!t)return{sent:0};let r=await o.pool.query(`SELECT COUNT(*)::int AS total
     FROM "GoogleWalletMessage"
     WHERE "loyaltyCardId" = $1 AND status = 'SENT' AND "sentAt" > NOW() - interval '24 hours'`,[t.cardId]),a=(0,l.ac)(r.rows[0]?.total??0)?3-(r.rows[0]?.total??0):0,n=a>0?await (0,E.vN)():null,s=0;for(let r of(await I(t))){let d=(0,l.NW)(r.kind,r.entityId),u=await o.pool.query(`SELECT status, "attemptCount" FROM "GoogleWalletMessage"
       WHERE "organizationId" = $1 AND "idempotencyKey" = $2`,[t.organizationId,d]),c=(0,l.nh)(u.rows[0]?.status??null,u.rows[0]?.attemptCount??0);if("send"!==c)continue;let I=(0,l.OO)({kind:r.kind,...t});if("send"!==I){await p(t,r,"SKIPPED",I);continue}if(a<=0)continue;if(n&&"APPROVED"!==n.toUpperCase())break;let N=0;try{N=await (0,E.c1)(e,{id:d,header:r.header,body:r.body})}catch(e){i.k.warn("google wallet message failed",{status:0}),await p(t,r,"FAILED",e instanceof Error?e.message.slice(0,120):"temporary");continue}let m=(0,l.L8)(N,n);if("sent"===m){await p(t,r,"SENT",null),s+=1,a-=1;continue}if("quota"===m||"not_published"===m||"not_registered"===m){await p(t,r,"SKIPPED",m),"quota"===m&&(a=0);continue}await p(t,r,"FAILED",`http_${N}`)}return{sent:s}}async function m(){if(!(0,d._7)())return{sent:0,cards:0};let{rows:e}=await o.pool.query(`SELECT lc."publicToken"
     FROM "LoyaltyCard" lc
     WHERE lc.status = 'ACTIVE'
       AND (
         EXISTS (
           SELECT 1 FROM "LoyaltyVisitReward" r
           WHERE r."loyaltyCardId" = lc.id AND r.status = 'AVAILABLE'
             AND NOT EXISTS (
               SELECT 1 FROM "GoogleWalletMessage" m
               WHERE m."loyaltyCardId" = lc.id
                 AND m."idempotencyKey" = 'REWARD_AVAILABLE:' || r.id
                 AND m.status IN ('SENT', 'SKIPPED')
             )
         )
         OR EXISTS (
           SELECT 1 FROM "ReviewRequest" rr
           WHERE rr."customerId" = lc."customerId" AND rr."organizationId" = lc."organizationId"
             AND rr.status IN ('PENDING', 'SENT') AND rr."scheduledFor" <= NOW()
             AND NOT EXISTS (
               SELECT 1 FROM "GoogleWalletMessage" m
               WHERE m."idempotencyKey" = 'REVIEW_REQUEST:' || rr.id
                 AND m.status IN ('SENT', 'SKIPPED')
             )
         )
       )
     LIMIT 20`),t=0;for(let r of e)try{let e=await N(r.publicToken);t+=e.sent}catch{i.k.warn("google wallet card skipped")}return{sent:t,cards:e.length}}[o,E,l]=u.then?(await u)():u;let g=globalThis;function A(){if(g.googleWalletTimer||"phase-production-build"===process.env.NEXT_PHASE)return;let e=()=>{m().catch(()=>{i.k.warn("google wallet tick failed")})},t=setTimeout(e,2e4);t.unref?.(),g.googleWalletTimer=setInterval(e,6e4),g.googleWalletTimer.unref?.()}a()}catch(e){a(e)}})},78616:(e,t,r)=>{r.a(e,async(e,a)=>{try{r.d(t,{Hk:()=>s,L8:()=>c,NW:()=>i,OO:()=>d,ac:()=>E,hg:()=>u,nh:()=>l});var n=r(43546),o=e([n]);function i(e,t){return`${e}:${t}`}function s(e,t,r){return!(t<=1)&&!(e<=0)&&(1===r||e===Math.ceil(t/2)&&r>1)}function d(e){return e.revoked?"no_consent":"LOYALTY_PROGRESS"===e.kind?e.hasPreference&&e.loyaltyProgress?"send":"category_off":e.hasPreference?("REWARD_AVAILABLE"!==e.kind||e.loyaltyReward)&&("REWARD_EXPIRY"!==e.kind||e.rewardExpiry)&&("REVIEW_REQUEST"!==e.kind||e.reviewRequest)?"send":"category_off":"send"}function E(e){return e<3}function l(e,t){return"SENT"===e||"SKIPPED"===e?"duplicate":"FAILED"===e&&t>=3?"stop":"send"}function u(e){let t;if(!e.cardSlug||e.cardSlug!==e.requestSlug||!e.token.startsWith("RBREV_"))return null;try{t=new URL(e.origin)}catch{return null}if("https:"!==t.protocol)return null;let r=(0,n.LR)(e.cardSlug,e.token),a=new URL(r,t);return a.origin===t.origin&&a.pathname.startsWith(`/book/${encodeURIComponent(e.cardSlug)}/reviews/`)?a.toString():null}function c(e,t){return t&&"APPROVED"!==t.toUpperCase()?"not_published":404===e?"not_registered":409===e?"sent":429===e?"quota":e>=500?"temporary":e>=200&&e<300?"sent":"temporary"}n=(o.then?(await o)():o)[0],a()}catch(e){a(e)}})},43546:(e,t,r)=>{r.a(e,async(e,a)=>{try{r.d(t,{B5:()=>R,F1:()=>g,GD:()=>N,LR:()=>l,Ms:()=>m,My:()=>E,hU:()=>d,v:()=>u,xy:()=>A,zT:()=>p});var n=r(84770),o=r(79549),i=r(2192),s=e([o,i]);[o,i]=s.then?(await s)():s;let S="ABCDEFGHJKLMNPQRSTUVWXYZ23456789",y=/^RBREV_[A-Z2-9]{16,32}$/;function d(){let e=(0,n.randomBytes)(20),t="";for(let r=0;r<20;r++)t+=S[e[r]%S.length];return`RBREV_${t}`}function E(e=new Date){return new Date(e.getTime()+2592e6)}function l(e,t){return`/book/${encodeURIComponent(e)}/reviews/${encodeURIComponent(t)}/`}function u(e){return e.replace(/\s+/g," ").trim()}function c(e){let t=e.now??new Date;if(!e.request)return{ok:!1,code:"TOKEN_INVALID"};if(e.request.organizationId!==e.slugOrganizationId||!e.appointment||e.appointment.organizationId!==e.slugOrganizationId||e.appointment.customerId!==e.request.customerId)return{ok:!1,code:"ORG_MISMATCH"};if(e.request.tokenExpiresAt.getTime()<=t.getTime())return{ok:!1,code:"TOKEN_EXPIRED"};if("CANCELLED"===e.request.status||"SKIPPED"===e.request.status||"COMPLETED"!==e.appointment.status)return{ok:!1,code:"NOT_ELIGIBLE"};if(e.request.hasReview)return{ok:!1,code:"DUPLICATE"};if(!Number.isInteger(e.rating)||e.rating<1||e.rating>5)return{ok:!1,code:"RATING_INVALID"};let r=u(e.comment);return r.length<8||r.length>800?{ok:!1,code:"COMMENT_INVALID"}:{ok:!0}}async function I(e,t){let r=t.trim().toUpperCase();if(!y.test(r))return null;let{rows:a}=await o.pool.query(`SELECT rr.id, rr."organizationId", rr."customerId", rr."appointmentId", rr.status::text AS status,
            rr."tokenExpiresAt",
            EXISTS(SELECT 1 FROM "Review" r WHERE r."appointmentId" = rr."appointmentId") AS "hasReview",
            a.status::text AS "appointmentStatus",
            a."organizationId" AS "appointmentOrgId",
            a."customerId" AS "appointmentCustomerId",
            c."firstName" AS "firstName",
            COALESCE(a."serviceNameSnapshot", s.name, 'Prestation') AS "serviceName",
            o.name AS "organizationName"
     FROM "ReviewRequest" rr
     JOIN "Organization" o ON o.id = rr."organizationId" AND o.slug = $2 AND o.status = 'ACTIVE'
     JOIN "Appointment" a ON a.id = rr."appointmentId"
     JOIN "Customer" c ON c.id = rr."customerId"
     LEFT JOIN "Service" s ON s.id = a."serviceId"
     WHERE rr."publicToken" = $1`,[r,e]),n=a[0];return n?{...n,tokenExpiresAt:new Date(n.tokenExpiresAt),hasReview:!!n.hasReview}:null}async function p(e,t){let r=await I(e,t);if(!r)return{ok:!1,code:"TOKEN_INVALID"};let a=c({slugOrganizationId:r.organizationId,request:r,appointment:{organizationId:r.appointmentOrgId,customerId:r.appointmentCustomerId,status:r.appointmentStatus},rating:5,comment:"aper\xe7u valide"});return a.ok||"DUPLICATE"===a.code?{ok:!0,organizationName:r.organizationName,firstName:r.firstName,serviceName:r.serviceName,alreadySubmitted:r.hasReview}:a}async function N(e){let t=await I(e.slug,e.token),r=t?.organizationId??"",a=c({slugOrganizationId:r,request:t,appointment:t?{organizationId:t.appointmentOrgId,customerId:t.appointmentCustomerId,status:t.appointmentStatus}:null,rating:e.rating,comment:e.comment});if(!a.ok)return a;if(!t)return{ok:!1,code:"TOKEN_INVALID"};let i=u(e.comment);try{await o.pool.query(`INSERT INTO "Review" (
         id, "organizationId", "customerId", "appointmentId", "reviewRequestId",
         rating, comment, status, "updatedAt"
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,'PENDING',NOW())`,[`prev_${(0,n.randomBytes)(8).toString("hex")}`,t.organizationId,t.customerId,t.appointmentId,t.id,e.rating,i])}catch(t){let e="object"==typeof t&&t&&"code"in t?String(t.code):"";if("23505"===e)return{ok:!1,code:"DUPLICATE"};throw t}return{ok:!0}}async function m(e){let{rows:t}=await o.pool.query(`SELECT r.id, r.rating, r.comment, r."createdAt", c."firstName" AS "firstName",
            COALESCE(a."serviceNameSnapshot", s.name, CASE WHEN a.id IS NULL THEN 'Carte fid\xe9lit\xe9' ELSE 'Prestation' END) AS "serviceName",
            o.name AS "organizationName"
     FROM "Review" r
     JOIN "Organization" o ON o.id = r."organizationId" AND o.slug = $1 AND o.status = 'ACTIVE'
     JOIN "Customer" c ON c.id = r."customerId"
     LEFT JOIN "Appointment" a ON a.id = r."appointmentId"
     LEFT JOIN "Service" s ON s.id = a."serviceId"
     WHERE r.status = 'PUBLISHED'
     ORDER BY r."createdAt" DESC, r.id DESC`,[e]);return{organizationName:t[0]?.organizationName??null,reviews:t.map(e=>({id:e.id,rating:e.rating,comment:e.comment,firstName:e.firstName,serviceName:e.serviceName,createdAt:new Date(e.createdAt).toISOString()}))}}async function A(e,t,r){let a=u(r);if(a.length<3||a.length>300)return!1;let{rowCount:n}=await o.pool.query(`UPDATE "Review" r
     SET status = 'REPORTED', "reportReason" = $3, "reportedAt" = NOW(), "updatedAt" = NOW()
     FROM "Organization" o
     WHERE r.id = $2 AND r."organizationId" = o.id AND o.slug = $1 AND o.status = 'ACTIVE'
       AND r.status = 'PUBLISHED'`,[e,t,a]);return(n??0)>0}async function g(e){let{rows:t}=await o.pool.query(`SELECT r.id, r.rating, r.comment, r.status::text AS status, r."createdAt",
            c."firstName", c."lastName", c.phone,
            COALESCE(a."serviceNameSnapshot", s.name, CASE WHEN a.id IS NULL THEN 'Carte fid\xe9lit\xe9' ELSE 'Prestation' END) AS "serviceName",
            r."reportReason"
     FROM "Review" r
     JOIN "Customer" c ON c.id = r."customerId"
     LEFT JOIN "Appointment" a ON a.id = r."appointmentId"
     LEFT JOIN "Service" s ON s.id = a."serviceId"
     WHERE r."organizationId" = $1
     ORDER BY r."createdAt" DESC, r.id DESC`,[e]);return t.map(e=>({id:e.id,rating:e.rating,comment:e.comment,status:e.status,createdAt:new Date(e.createdAt).toISOString(),customerName:`${e.firstName} ${e.lastName}`.trim(),phone:e.phone,serviceName:e.serviceName,reportReason:e.reportReason}))}async function R(e){let t="publish"===e.action?"PUBLISHED":"reject"===e.action?"REJECTED":"REPORTED",r=e.reason?u(e.reason):null;if("report"===e.action&&(!r||r.length<3))return!1;let{rowCount:a}=await o.pool.query(`UPDATE "Review"
     SET status = $3::"PublicReviewStatus",
         "publishedAt" = CASE WHEN $3 = 'PUBLISHED' THEN NOW() ELSE "publishedAt" END,
         "moderatedAt" = NOW(),
         "moderatedById" = $4,
         "reportReason" = CASE WHEN $3 = 'REPORTED' THEN $5 ELSE "reportReason" END,
         "reportedAt" = CASE WHEN $3 = 'REPORTED' THEN NOW() ELSE "reportedAt" END,
         "updatedAt" = NOW()
     WHERE id = $2 AND "organizationId" = $1`,[e.organizationId,e.reviewId,t,e.actorId,r]);return!!a&&(await (0,i.writeAuditLog)({organizationId:e.organizationId,actorId:e.actorId,actorName:e.actorName,entityType:"Review",entityId:e.reviewId,action:`REVIEW_${t}`,after:{status:t}}),!0)}a()}catch(e){a(e)}})}};