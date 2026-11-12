"use strict";!function(){try{var e="undefined"!=typeof window?window:"undefined"!=typeof global?global:"undefined"!=typeof self?self:{},t=(new e.Error).stack;t&&(e._sentryDebugIds=e._sentryDebugIds||{},e._sentryDebugIds[t]="db3298f0-881b-4bc1-9f49-ac25ca59a0e7",e._sentryDebugIdIdentifier="sentry-dbid-db3298f0-881b-4bc1-9f49-ac25ca59a0e7")}catch(e){}}(),exports.id=11,exports.ids=[11],exports.modules={70011:(e,t,r)=>{r.a(e,async(e,i)=>{try{r.r(t),r.d(t,{authorizeCustomerPush:()=>p,customerPushStatus:()=>c,dispatchAllDueCustomerPushes:()=>f,dispatchDueCustomerPushes:()=>g,subscribeCustomerPush:()=>N,unsubscribeCustomerPush:()=>I,updateCustomerPushPreferences:()=>m});var o=r(84770),n=r(70653),a=r(67394),s=r(68649),d=r(89220),u=e([n]);n=(u.then?(await u)():u)[0];let O=!1;async function l(e){let{rows:t}=await n.pool.query(`SELECT lc."organizationId", lc."customerId", c.phone,
            (c."marketingWhatsapp" OR c."marketingEmail" OR c."marketingSms") AS "marketingOptIn"
     FROM "LoyaltyCard" lc
     JOIN "Organization" o ON o.id = lc."organizationId" AND o.status = 'ACTIVE'
     JOIN "Customer" c ON c.id = lc."customerId" AND c."deletedAt" IS NULL
     WHERE lc."publicToken" = $1 AND lc.status = 'ACTIVE'`,[e]);return t[0]??null}async function c(e,t){let r=await l(e);if(!r)return null;let i=(0,d.P5)().configured;if("ok"!==(0,s.EE)(t,r,new Date))return{configured:i,authorized:!1};let o=await n.pool.query(`SELECT "loyaltyReward", "loyaltyProgress", "reviewRequest", "rewardExpiry", offers, "revokedAt"
     FROM "NotificationPreference"
     WHERE "organizationId" = $1 AND "customerId" = $2`,[r.organizationId,r.customerId]),a=await n.pool.query(`SELECT COUNT(*)::int AS active
     FROM "WebPushSubscription"
     WHERE "organizationId" = $1 AND "customerId" = $2 AND "revokedAt" IS NULL
       AND ("expirationTime" IS NULL OR "expirationTime" > NOW())`,[r.organizationId,r.customerId]),u=o.rows[0]??null;return{configured:i,authorized:!0,subscribed:(a.rows[0]?.active??0)>0&&!u?.revokedAt,preferences:u?{loyaltyReward:u.loyaltyReward,loyaltyProgress:u.loyaltyProgress,reviewRequest:u.reviewRequest,rewardExpiry:u.rewardExpiry,offers:u.offers}:(0,s.dc)(void 0)}}async function p(e,t){let i=await l(e);if(!i)return{ok:!1,reason:"not_found"};if(!(0,s.C7)(i.phone,t))return{ok:!1,reason:"phone"};let{newGrantToken:a,hashGrantToken:d,GRANT_TTL_MS:u}=await r.e(1090).then(r.bind(r,21090)),c=a();return await n.pool.query(`INSERT INTO "PushAccessGrant" (id, "organizationId", "customerId", "tokenHash", "expiresAt", "createdAt")
     VALUES ($1, $2, $3, $4, $5, NOW())`,[(0,o.randomUUID)(),i.organizationId,i.customerId,d(c),new Date(Date.now()+u)]),{ok:!0,grantToken:c}}async function N(e){let t=await l(e.token);if(!t)return"not_found";if("ok"!==(0,s.EE)(e.grant,t,e.now??new Date))return"forbidden";if(!(0,s.pg)(e.endpoint)||!(0,s.GP)(e.p256dh)||!(0,s.GP)(e.auth))return"invalid";let r=(0,s.SN)(e.expirationTime,e.now??new Date);if("expired"===r)return"expired";let i=(0,s.dc)(e.preferences);return await n.pool.query(`INSERT INTO "NotificationPreference" (
       id, "organizationId", "customerId",
       "loyaltyReward", "loyaltyProgress", "reviewRequest", "rewardExpiry", offers,
       "consentedAt", "revokedAt", "createdAt", "updatedAt"
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW(),NULL,NOW(),NOW())
     ON CONFLICT ("organizationId", "customerId") DO UPDATE SET
       "loyaltyReward" = EXCLUDED."loyaltyReward",
       "loyaltyProgress" = EXCLUDED."loyaltyProgress",
       "reviewRequest" = EXCLUDED."reviewRequest",
       "rewardExpiry" = EXCLUDED."rewardExpiry",
       offers = EXCLUDED.offers,
       "consentedAt" = COALESCE("NotificationPreference"."consentedAt", NOW()),
       "revokedAt" = NULL,
       "updatedAt" = NOW()`,[(0,o.randomUUID)(),t.organizationId,t.customerId,i.loyaltyReward,i.loyaltyProgress,i.reviewRequest,i.rewardExpiry,i.offers]),await n.pool.query(`INSERT INTO "WebPushSubscription" (
       id, "organizationId", "customerId", endpoint, p256dh, auth, "expirationTime",
       "revokedAt", "failureCount", "createdAt", "updatedAt"
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,NULL,0,NOW(),NOW())
     ON CONFLICT (endpoint) DO UPDATE SET
       "organizationId" = EXCLUDED."organizationId",
       "customerId" = EXCLUDED."customerId",
       p256dh = EXCLUDED.p256dh,
       auth = EXCLUDED.auth,
       "expirationTime" = EXCLUDED."expirationTime",
       "revokedAt" = NULL,
       "failureCount" = 0,
       "updatedAt" = NOW()`,[(0,o.randomUUID)(),t.organizationId,t.customerId,e.endpoint,e.p256dh,e.auth,r]),await g(t.organizationId,t.customerId),"ok"}async function I(e,t){let r=await l(e);return r?"ok"!==(0,s.EE)(t,r,new Date)?"forbidden":(await n.pool.query(`UPDATE "NotificationPreference"
     SET "revokedAt" = NOW(), "updatedAt" = NOW()
     WHERE "organizationId" = $1 AND "customerId" = $2`,[r.organizationId,r.customerId]),await n.pool.query(`UPDATE "WebPushSubscription"
     SET "revokedAt" = NOW(), "updatedAt" = NOW()
     WHERE "organizationId" = $1 AND "customerId" = $2 AND "revokedAt" IS NULL`,[r.organizationId,r.customerId]),"ok"):"not_found"}async function m(e,t,r){let i=await l(e);if(!i)return"not_found";if("ok"!==(0,s.EE)(r,i,new Date))return"forbidden";let{rowCount:o}=await n.pool.query(`UPDATE "NotificationPreference"
     SET "loyaltyReward" = $3, "loyaltyProgress" = $4, "reviewRequest" = $5,
         "rewardExpiry" = $6, offers = $7, "updatedAt" = NOW()
     WHERE "organizationId" = $1 AND "customerId" = $2
       AND "consentedAt" IS NOT NULL AND "revokedAt" IS NULL`,[i.organizationId,i.customerId,t.loyaltyReward,t.loyaltyProgress,t.reviewRequest,t.rewardExpiry,t.offers]);return(o??0)>0?"ok":"inactive"}let D=`
  EXISTS (
    SELECT 1 FROM "WebPushSubscription" s
    WHERE s."organizationId" = p."organizationId"
      AND s."customerId" = p."customerId"
      AND s."revokedAt" IS NULL
      AND (s."expirationTime" IS NULL OR s."expirationTime" > NOW())
  )`;async function E(e,t){let r=[e,t];await n.pool.query(`INSERT INTO "CustomerPushDelivery" (
       id, "organizationId", "customerId", category, "idempotencyKey", title, body, url, status, "scheduledFor", "createdAt"
     )
     SELECT gen_random_uuid()::text, r."organizationId", r."customerId", 'LOYALTY_REWARD',
            'reward:' || r.id, 'R\xe9compense disponible',
            'Votre r\xe9compense \xab ' || r.name || ' \xbb est pr\xeate.',
            '/carte/' || lc."publicToken" || '/',
            'PENDING', NOW(), NOW()
     FROM "LoyaltyVisitReward" r
     JOIN "NotificationPreference" p
       ON p."organizationId" = r."organizationId" AND p."customerId" = r."customerId"
     JOIN "LoyaltyCard" lc ON lc.id = r."loyaltyCardId"
     WHERE r."organizationId" = $1
       AND ($2::text IS NULL OR r."customerId" = $2)
       AND r.status = 'AVAILABLE'
       AND p."consentedAt" IS NOT NULL AND p."revokedAt" IS NULL AND p."loyaltyReward" = true
       AND ${D}
     ON CONFLICT ("organizationId", "idempotencyKey") DO NOTHING`,r),await n.pool.query(`INSERT INTO "CustomerPushDelivery" (
       id, "organizationId", "customerId", category, "idempotencyKey", title, body, url, status, "scheduledFor", "createdAt"
     )
     SELECT gen_random_uuid()::text, e."organizationId", e."customerId", 'LOYALTY_PROGRESS',
            'visit:' || e.id, 'Carte fid\xe9lit\xe9',
            'Votre carte avance : ' ||
              mod(v.visits, GREATEST(COALESCE(lp."visitsPerReward", 10), 1))
              || '/' || GREATEST(COALESCE(lp."visitsPerReward", 10), 1) || ' passages.',
            '/carte/' || lc."publicToken" || '/',
            'PENDING', e."validatedAt", NOW()
     FROM "LoyaltyEvent" e
     JOIN "NotificationPreference" p
       ON p."organizationId" = e."organizationId" AND p."customerId" = e."customerId"
     JOIN "LoyaltyCard" lc ON lc.id = e."loyaltyCardId"
     LEFT JOIN "LoyaltyProgram" lp ON lp."organizationId" = e."organizationId"
     JOIN LATERAL (
       SELECT COALESCE(SUM(e2.points), 0)::int AS visits
       FROM "LoyaltyEvent" e2
       WHERE e2."loyaltyCardId" = e."loyaltyCardId" AND e2.type = 'VISIT' AND e2."validatedAt" <= e."validatedAt"
     ) v ON true
     WHERE e."organizationId" = $1
       AND ($2::text IS NULL OR e."customerId" = $2)
       AND e.type = 'VISIT' AND e.points > 0
       AND e."validatedAt" >= p."consentedAt"
       AND p."revokedAt" IS NULL AND p."loyaltyProgress" = true
       AND ${D}
     ON CONFLICT ("organizationId", "idempotencyKey") DO NOTHING`,r),await n.pool.query(`INSERT INTO "CustomerPushDelivery" (
       id, "organizationId", "customerId", category, "idempotencyKey", title, body, url, status, "scheduledFor", "createdAt"
     )
     SELECT gen_random_uuid()::text, rr."organizationId", rr."customerId", 'REVIEW_REQUEST',
            'review:' || rr.id, 'Donner mon avis',
            'Votre rendez-vous est termin\xe9. Dites-nous comment il s''est pass\xe9.',
            '/book/' || o.slug || '/reviews/' || rr."publicToken" || '/',
            'PENDING', rr."scheduledFor", NOW()
     FROM "ReviewRequest" rr
     JOIN "Organization" o ON o.id = rr."organizationId"
     JOIN "Appointment" a ON a.id = rr."appointmentId" AND a.status = 'COMPLETED'
     JOIN "NotificationPreference" p
       ON p."organizationId" = rr."organizationId" AND p."customerId" = rr."customerId"
     WHERE rr."organizationId" = $1
       AND ($2::text IS NULL OR rr."customerId" = $2)
       AND rr.status IN ('PENDING', 'SENT')
       AND rr."tokenExpiresAt" > NOW()
       AND rr."scheduledFor" <= NOW()
       AND NOT EXISTS (SELECT 1 FROM "Review" rv WHERE rv."appointmentId" = rr."appointmentId")
       AND p."consentedAt" IS NOT NULL AND p."revokedAt" IS NULL AND p."reviewRequest" = true
       AND ${D}
     ON CONFLICT ("organizationId", "idempotencyKey") DO NOTHING`,r),await n.pool.query(`INSERT INTO "CustomerPushDelivery" (
       id, "organizationId", "customerId", category, "idempotencyKey", title, body, url, status, "scheduledFor", "createdAt"
     )
     SELECT gen_random_uuid()::text, r."organizationId", r."customerId", 'REWARD_EXPIRY',
            'expiry:' || r.id, 'R\xe9compense bient\xf4t expir\xe9e',
            'Votre r\xe9compense \xab ' || r.name || ' \xbb expire bient\xf4t.',
            '/carte/' || lc."publicToken" || '/',
            'PENDING', r."expiresAt" - interval '3 days', NOW()
     FROM "LoyaltyVisitReward" r
     JOIN "NotificationPreference" p
       ON p."organizationId" = r."organizationId" AND p."customerId" = r."customerId"
     JOIN "LoyaltyCard" lc ON lc.id = r."loyaltyCardId"
     WHERE r."organizationId" = $1
       AND ($2::text IS NULL OR r."customerId" = $2)
       AND r.status = 'AVAILABLE'
       AND r."expiresAt" IS NOT NULL
       AND r."expiresAt" > NOW()
       AND r."expiresAt" <= NOW() + interval '3 days'
       AND p."consentedAt" IS NOT NULL AND p."revokedAt" IS NULL AND p."rewardExpiry" = true
       AND ${D}
     ON CONFLICT ("organizationId", "idempotencyKey") DO NOTHING`,r),await n.pool.query(`INSERT INTO "CustomerPushDelivery" (
       id, "organizationId", "customerId", category, "idempotencyKey", title, body, url, status, "scheduledFor", "createdAt"
     )
     SELECT gen_random_uuid()::text, pr."organizationId", p."customerId", 'OFFER',
            'offer:' || pr.id || ':' || p."customerId",
            'Offre de l''institut',
            pr.name,
            '/book/' || o.slug || '/',
            'PENDING', GREATEST(COALESCE(pr."startsAt", pr."createdAt"), p."consentedAt"), NOW()
     FROM "Promotion" pr
     JOIN "Organization" o ON o.id = pr."organizationId"
     JOIN "NotificationPreference" p ON p."organizationId" = pr."organizationId"
     JOIN "Customer" c ON c.id = p."customerId"
     WHERE pr."organizationId" = $1
       AND ($2::text IS NULL OR p."customerId" = $2)
       AND pr.status = 'ACTIVE' AND pr."deletedAt" IS NULL
       AND (pr."customerId" IS NULL OR pr."customerId" = p."customerId")
       AND (pr."startsAt" IS NULL OR pr."startsAt" <= NOW())
       AND (pr."endsAt" IS NULL OR pr."endsAt" > NOW())
       AND pr."createdAt" >= p."consentedAt"
       AND p."revokedAt" IS NULL AND p.offers = true
       AND (c."marketingWhatsapp" OR c."marketingEmail" OR c."marketingSms")
       AND ${D}
     ON CONFLICT ("organizationId", "idempotencyKey") DO NOTHING`,r)}async function y(){let e=(0,d.R5)();if(!e)return null;let t=await Promise.resolve().then(r.t.bind(r,48927,23)),i=t.default??t;return O||(i.setVapidDetails(e.subject,e.publicKey,e.privateKey),O=!0),i}async function A(e,t,r){try{return await e.sendNotification({endpoint:t.endpoint,keys:{p256dh:t.p256dh,auth:t.auth}},r),"sent"}catch(r){let e=r.statusCode;if((0,s.WO)(e))return await n.pool.query('UPDATE "WebPushSubscription" SET "revokedAt" = NOW(), "updatedAt" = NOW() WHERE id = $1',[t.id]),"gone";return await n.pool.query(`UPDATE "WebPushSubscription"
       SET "failureCount" = "failureCount" + 1, "updatedAt" = NOW()
       WHERE id = $1`,[t.id]),a.k.warn("customer push send failed",{status:e??0}),"retry"}}async function g(e,t){let r=t??null;await n.pool.query(`UPDATE "WebPushSubscription"
     SET "revokedAt" = NOW(), "updatedAt" = NOW()
     WHERE "organizationId" = $1 AND "revokedAt" IS NULL
       AND "expirationTime" IS NOT NULL AND "expirationTime" <= NOW()
       AND ($2::text IS NULL OR "customerId" = $2)`,[e,r]),await E(e,r);let i=await y();if(!i)return{sent:0,configured:!1};let o=await n.pool.query(`WITH picked AS (
       SELECT id FROM "CustomerPushDelivery"
       WHERE "organizationId" = $1 AND status = 'PENDING'
         AND "scheduledFor" <= NOW()
         AND "nextAttemptAt" <= NOW()
         AND ("lockedUntil" IS NULL OR "lockedUntil" <= NOW())
         AND ($2::text IS NULL OR "customerId" = $2)
       ORDER BY "nextAttemptAt" ASC
       LIMIT 40
       FOR UPDATE SKIP LOCKED
     )
     UPDATE "CustomerPushDelivery" d
     SET "lockedUntil" = NOW() + interval '2 minutes',
         "attemptCount" = "attemptCount" + 1
     FROM picked
     WHERE d.id = picked.id
     RETURNING d.id, d.title, d.body, d.url, d."customerId", d."organizationId", d.category, d."attemptCount"`,[e,r]),a=0;for(let e of o.rows){let t=(await n.pool.query(`SELECT p."loyaltyReward", p."loyaltyProgress", p."reviewRequest", p."rewardExpiry", p.offers,
              p."consentedAt", p."revokedAt",
              (c."marketingWhatsapp" OR c."marketingEmail" OR c."marketingSms") AS "marketingOptIn"
       FROM "Customer" c
       LEFT JOIN "NotificationPreference" p
         ON p."customerId" = c.id AND p."organizationId" = c."organizationId"
       WHERE c.id = $1 AND c."organizationId" = $2`,[e.customerId,e.organizationId])).rows[0],r=(0,s.y$)({eventOrganizationId:e.organizationId,subscriptionOrganizationId:e.organizationId,category:e.category,eligible:!0,alreadySent:!1,consent:t?.consentedAt?{consentedAt:t.consentedAt,revokedAt:t.revokedAt,loyaltyReward:!!t.loyaltyReward,loyaltyProgress:!!t.loyaltyProgress,reviewRequest:!!t.reviewRequest,rewardExpiry:!!t.rewardExpiry,offers:!!t.offers}:null,subscriptionRevoked:!1,subscriptionExpired:!1,marketingOptIn:!!t?.marketingOptIn}),o=await n.pool.query(`SELECT id, endpoint, p256dh, auth
       FROM "WebPushSubscription"
       WHERE "organizationId" = $1 AND "customerId" = $2 AND "revokedAt" IS NULL
         AND ("expirationTime" IS NULL OR "expirationTime" > NOW())`,[e.organizationId,e.customerId]),d=[];if("send"===r){let t=JSON.stringify({title:e.title,body:e.body,url:e.url&&e.url.startsWith("/")?e.url:"/"});for(let e of(0===o.rows.length&&d.push("retry"),o.rows))d.push(await A(i,e,t))}let u=(0,s.jD)({results:d,attemptCount:Number(e.attemptCount),consent:r});"SENT"===u.status&&(a+=1),await n.pool.query(`UPDATE "CustomerPushDelivery"
       SET status = $2::"CustomerPushStatus",
           "sentAt" = CASE WHEN $2 = 'SENT' THEN NOW() ELSE NULL END,
           "lockedUntil" = NULL,
           "nextAttemptAt" = CASE WHEN $3::int IS NULL THEN "nextAttemptAt" ELSE NOW() + ($3::int * interval '1 millisecond') END,
           error = $4
       WHERE id = $1`,[e.id,u.status,u.delayMs,"PENDING"===u.status?"temporary":"SENT"===u.status?null:r])}return{sent:a,configured:!0}}async function f(){let{rows:e}=await n.pool.query(`SELECT DISTINCT "organizationId"
     FROM "WebPushSubscription"
     WHERE "revokedAt" IS NULL`),t=0;for(let r of e){let e=await g(r.organizationId);t+=e.sent}return{sent:t,organizations:e.length,agendaRequired:!1}}i()}catch(e){i(e)}})},68649:(e,t,r)=>{r.d(t,{C7:()=>I,EE:()=>m,GP:()=>u,SN:()=>l,WO:()=>p,bm:()=>a,dc:()=>s,jD:()=>E,pg:()=>d,vi:()=>n,y$:()=>c});var i=r(31244);let o=/^RBLOY_[A-Z2-9]{8,32}$/;function n(e){let t="string"==typeof e.cardToken?e.cardToken.trim().toUpperCase():"";return o.test(t)?t:null}function a(e){let t=e&&"object"==typeof e?e:{};return{cardToken:n(t),endpoint:t.endpoint,p256dh:t.p256dh,auth:t.auth,expirationTime:t.expirationTime,preferences:t.preferences}}function s(e){let t=e&&"object"==typeof e?e:{},r=e=>Object.prototype.hasOwnProperty.call(t,e);return{loyaltyReward:!r("loyaltyReward")||!0===t.loyaltyReward,loyaltyProgress:!0===t.loyaltyProgress,reviewRequest:!r("reviewRequest")||!0===t.reviewRequest,rewardExpiry:!r("rewardExpiry")||!0===t.rewardExpiry,offers:!0===t.offers}}function d(e){if("string"!=typeof e||e.length<20||e.length>2e3)return!1;try{let t=new URL(e);return"https:"===t.protocol}catch{return!1}}function u(e){return"string"==typeof e&&/^[A-Za-z0-9_-]{16,200}$/.test(e)}function l(e,t){if(null==e||""===e)return null;let r="number"==typeof e?e:"string"==typeof e?Date.parse(e):NaN;if(!Number.isFinite(r))return"expired";let i=new Date(r);return i.getTime()<=t.getTime()?"expired":i}function c(e){var t,r;return e.eventOrganizationId!==e.subscriptionOrganizationId?"wrong_organization":e.eligible?e.alreadySent?"duplicate":!e.consent?.consentedAt||e.consent.revokedAt?"no_consent":(t=e.consent,r=e.category,t?.consentedAt&&!t.revokedAt&&("LOYALTY_REWARD"===r?t.loyaltyReward:"LOYALTY_PROGRESS"===r?t.loyaltyProgress:"REVIEW_REQUEST"===r?t.reviewRequest:"REWARD_EXPIRY"===r?t.rewardExpiry:t.offers))?"OFFER"!==e.category||e.marketingOptIn?e.subscriptionRevoked?"subscription_revoked":e.subscriptionExpired?"subscription_expired":"send":"offer_without_marketing":"category_off":"ineligible"}function p(e){return 404===e||410===e}let N=[6e4,3e5,9e5,36e5];function I(e,t){let r=(0,i.d6)(e),o=(0,i.d6)(t);return!(r.length<8)&&!(o.length<8)&&r===o}function m(e,t,r){return e&&t?e.revokedAt||e.expiresAt.getTime()<=r.getTime()?"expired":e.organizationId!==t.organizationId||e.customerId!==t.customerId?"mismatch":"ok":"missing"}function E(e){return"send"!==e.consent?{status:"SKIPPED",delayMs:null}:e.results.includes("sent")?{status:"SENT",delayMs:null}:e.results.includes("retry")&&e.attemptCount<5?{status:"PENDING",delayMs:N[Math.min(Math.max(e.attemptCount-1,0),N.length-1)]??6e4}:{status:"FAILED",delayMs:null}}},89220:(e,t,r)=>{r.d(t,{P5:()=>s,R5:()=>d});var i=r(6005),o=r(67394);function n(e){try{return Buffer.from(e,"base64url")}catch{return null}}let a=!1;function s(e=process.env){let t=e.VAPID_PUBLIC_KEY?.trim()??"",r=e.VAPID_PRIVATE_KEY?.trim()??"",s=e.VAPID_SUBJECT?.trim()??"",d=s.startsWith("mailto:")||s.startsWith("https://"),u=!!(t&&r&&function(e,t){let r=n(e.trim()),o=n(t.trim());if(!r||!o||32!==o.length||65!==r.length||4!==r[0])return!1;try{let e=(0,i.createECDH)("prime256v1");e.setPrivateKey(o);let t=e.getPublicKey();return t.length===r.length&&(0,i.timingSafeEqual)(t,r)}catch{return!1}}(t,r));t&&r&&!u&&!a&&(a=!0,o.k.warn("VAPID key pair does not match"));let l=!!(u&&d);return{configured:l,publicKey:l?t:null}}function d(e=process.env){let t=s(e);return t.configured&&t.publicKey?{publicKey:t.publicKey,privateKey:e.VAPID_PRIVATE_KEY.trim(),subject:e.VAPID_SUBJECT.trim()}:null}},31244:(e,t,r)=>{r.d(t,{D5:()=>p,IX:()=>u,Kq:()=>a,UK:()=>o,_H:()=>i,cs:()=>c,d6:()=>n});let i=10;function o(e){return e.replace(/\s+/g,"").trim()}function n(e){let t=e.replace(/\D/g,"");return t.startsWith("00212")&&(t=t.slice(2)),t.startsWith("212")&&(t=`0${t.slice(3)}`),t}function a(e,t=i){return n(e).slice(0,t)}function s(e){return/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)}function d(e){if(null==e||""===e)return;let t=new Date(String(e));if(!Number.isNaN(t.getTime()))return t.toISOString()}function u(e){let t={};if(!e||"object"!=typeof e)return{ok:!1,errors:{_form:"Corps de requ\xeate invalide."}};let r=String(e.firstName??"").trim(),o=String(e.lastName??"").trim(),n=a(String(e.phone??""));r||(t.firstName="Le nom complet est obligatoire."),(!n||n.length<8)&&(t.phone="Le t\xe9l\xe9phone est obligatoire."),n.length>i&&(t.phone="Le t\xe9l\xe9phone ne doit pas d\xe9passer 10 chiffres.");let u=null!=e.email?String(e.email).trim():"";return(u&&!s(u)&&(t.email="E-mail invalide."),Object.keys(t).length>0)?{ok:!1,errors:t}:{ok:!0,data:{firstName:r,lastName:o,phone:n,email:u||void 0,birthDate:d(e.birthDate),address:e.address?String(e.address).trim():void 0,instagram:e.instagram?String(e.instagram).trim():void 0,notes:e.notes?String(e.notes).trim():void 0,marketingWhatsapp:!!e.marketingWhatsapp,marketingEmail:!!e.marketingEmail,marketingSms:!!e.marketingSms}}}let l=["ACTIVE","NEW","INACTIVE","AT_RISK","ARCHIVED"];function c(e){let t={};if(!e||"object"!=typeof e)return{ok:!1,errors:{_form:"Corps de requ\xeate invalide."}};let r={};if(void 0!==e.firstName){let i=String(e.firstName).trim();i?r.firstName=i:t.firstName="Le nom complet est obligatoire."}if(void 0!==e.lastName&&(r.lastName=String(e.lastName).trim()),void 0!==e.phone){let o=a(String(e.phone));o.length<8||o.length>i?t.phone="Le t\xe9l\xe9phone doit contenir 8 \xe0 10 chiffres.":r.phone=o}if(void 0!==e.email){let i=String(e.email).trim();i&&!s(i)?t.email="E-mail invalide.":r.email=i||void 0}if(void 0!==e.birthDate&&(r.birthDate=d(e.birthDate)),void 0!==e.address&&(r.address=String(e.address).trim()||void 0),void 0!==e.instagram&&(r.instagram=String(e.instagram).trim()||void 0),void 0!==e.notes&&(r.notes=String(e.notes).trim()||void 0),void 0!==e.marketingWhatsapp&&(r.marketingWhatsapp=!!e.marketingWhatsapp),void 0!==e.marketingEmail&&(r.marketingEmail=!!e.marketingEmail),void 0!==e.marketingSms&&(r.marketingSms=!!e.marketingSms),void 0!==e.status){let i=String(e.status);l.includes(i)?r.status=i:t.status="Statut invalide."}return(void 0!==e.archived&&(r.archived=!!e.archived),Object.keys(t).length>0)?{ok:!1,errors:t}:{ok:!0,data:r}}function p(e){var t;let r=Math.max(1,parseInt(e.get("page")??"1",10)||1),i=Math.min(100,Math.max(1,parseInt(e.get("limit")??"20",10)||20));return{page:r,limit:i,search:(e.get("search")??"").trim(),status:e.get("status"),segment:(t=e.get("segment"))&&["ALL","ACTIVE","VIP","NEW","INACTIVE","AT_RISK"].includes(t)?t:"ALL"}}}};