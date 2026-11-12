"use strict";!function(){try{var t="undefined"!=typeof window?window:"undefined"!=typeof global?global:"undefined"!=typeof self?self:{},e=(new t.Error).stack;e&&(t._sentryDebugIds=t._sentryDebugIds||{},t._sentryDebugIds[e]="8dba7f41-f89a-4402-9dac-62fd2ba4e096",t._sentryDebugIdIdentifier="sentry-dbid-8dba7f41-f89a-4402-9dac-62fd2ba4e096")}catch(t){}}(),exports.id=6614,exports.ids=[6614],exports.modules={54437:(t,e,r)=>{r.a(t,async(t,a)=>{try{r.d(e,{Bh:()=>O,D3:()=>R,EU:()=>w,RV:()=>A,_f:()=>p,ak:()=>S,creditVisitIfEligible:()=>L,d7:()=>D,fh:()=>N,t6:()=>y});var i=r(84770),o=r(8678),d=r(90831),n=r(66085),s=r(49849),c=r(77821),I=r(45136),l=r(71074),E=t([o,n,c,I,l]);[o,n,c,I,l]=E.then?(await E)():E;let C=(0,d.S)(new o.Pool({connectionString:process.env.DATABASE_URL}));async function u(t,e){let r=(0,s.J)(e.publicToken);if(r.length<4)return;let a=`loyalty:${e.rewardId}`,i=e.rewardKind,o="DISCOUNT"===i?"FIXED_AMOUNT":"PERCENTAGE"===i?"PERCENTAGE":"FREE_SERVICE",d="FREE_SERVICE"===o?null:null!=e.rewardValue&&e.rewardValue>0?e.rewardValue:null;if("FREE_SERVICE"!==o&&null==d)return;let n=e.rewardLabel.trim()||("FREE_SERVICE"===o?"Service offert":"PERCENTAGE"===o?`Remise ${d} %`:`Remise ${d} MAD`),c=(await t.query(`SELECT id, "customerId", description, status FROM "Promotion"
     WHERE "organizationId" = $1 AND upper(code) = $2
     LIMIT 1`,[e.organizationId,r])).rows[0];if(!c?.customerId||c.customerId===e.customerId){if(c){await t.query(`UPDATE "Promotion"
       SET status = 'ACTIVE', type = $2::"PromotionType", name = $3, "customerId" = $4,
           value = $5, "maxUses" = 1, "maxUsesPerCustomer" = 1, "usageCount" = 0,
           "serviceId" = NULL, "endsAt" = $6, description = $7, "deletedAt" = NULL, "updatedAt" = NOW()
       WHERE id = $1`,[c.id,o,n,e.customerId,d,e.expiresAt,a]);return}await t.query(`INSERT INTO "Promotion" (
      id, "organizationId", name, code, type, status, value, "customerId",
      "maxUses", "maxUsesPerCustomer", "usageCount", "endsAt", description, "updatedAt"
    ) VALUES ($1,$2,$3,$4,$5::"PromotionType",'ACTIVE'::"PromotionStatus",$6,$7,1,1,0,$8,$9,NOW())`,[(0,l.bt)("promo"),e.organizationId,n,r,o,d,e.customerId,e.expiresAt,a])}}async function w(t){let e=await (0,l.Wk)(t),{rows:r}=await C.query(`SELECT r.id, r."customerId", r.name, r."expiresAt", lc."publicToken"
     FROM "LoyaltyVisitReward" r
     JOIN "LoyaltyCard" lc ON lc.id = r."loyaltyCardId"
     WHERE r."organizationId" = $1 AND r.status = 'AVAILABLE'
       AND (r."expiresAt" IS NULL OR r."expiresAt" > NOW())
       AND NOT EXISTS (
         SELECT 1 FROM "Promotion" p
         WHERE p."organizationId" = r."organizationId"
           AND p.description = 'loyalty:' || r.id
           AND p."deletedAt" IS NULL
           AND p.status = 'ACTIVE'
       )`,[t]);for(let a of r)await u(C,{organizationId:t,customerId:a.customerId,publicToken:a.publicToken,rewardId:a.id,rewardLabel:a.name||e.rewardLabel,rewardKind:e.rewardKind,rewardValue:e.rewardValue,expiresAt:a.expiresAt})}async function m(t,e){let r=(0,l.bt)("levt");try{await t.query(`INSERT INTO "LoyaltyEvent" (
        id, "organizationId", "customerId", "loyaltyCardId", type,
        "appointmentId", "serviceId", amount, points, note, "validatedBy", "validatedAt"
      ) VALUES ($1, $2, $3, $4, 'VISIT', $5, $6, $7, $8, $9, $10, NOW())`,[r,e.organizationId,e.customerId,e.cardId,e.appointmentId,e.serviceId,e.amount,e.points,e.note,e.validatedBy]),await t.query('UPDATE "LoyaltyCard" SET "updatedAt" = NOW() WHERE id = $1',[e.cardId])}catch(t){if((0,I.zp)(t))throw Error("ALREADY_VALIDATED");throw t}let a=await t.query(`SELECT COALESCE(SUM(points), 0)::text AS count
     FROM "LoyaltyEvent" WHERE "loyaltyCardId" = $1 AND type = 'VISIT'`,[e.cardId]),i=Number(a.rows[0]?.count??0),o=null;if(e.points>0&&i>0&&i%e.program.visitsPerReward==0){let a=e.program.stackRewards?{rows:[]}:await t.query(`SELECT id FROM "LoyaltyVisitReward"
           WHERE "loyaltyCardId" = $1 AND status = 'AVAILABLE'
             AND ("expiresAt" IS NULL OR "expiresAt" > NOW())
           LIMIT 1`,[e.cardId]);if(0===a.rows.length){o=(0,l.bt)("lrew"),await t.query(`INSERT INTO "LoyaltyVisitReward" (
          id, "organizationId", "customerId", "loyaltyCardId", "loyaltyEventId",
          name, status, value, "earnedAt", "expiresAt"
        ) VALUES ($1, $2, $3, $4, $5, $6, 'AVAILABLE', $7, NOW(), NOW() + $8::interval)`,[o,e.organizationId,e.customerId,e.cardId,r,e.program.rewardLabel,e.program.rewardValue,`${e.program.rewardValidityDays} days`]),await (0,n.writeAuditLog)({organizationId:e.organizationId,actorId:e.validatedBy,actorName:e.actorName,entityType:"LoyaltyVisitReward",entityId:o,action:"LOYALTY_REWARD_EARNED",before:{status:null,visits:i},after:{status:"AVAILABLE",name:e.program.rewardLabel,value:e.program.rewardValue,customerId:e.customerId,loyaltyEventId:r},client:t});let a=await t.query('SELECT "publicToken" FROM "LoyaltyCard" WHERE id = $1',[e.cardId]);if(a.rows[0]){let r=e.program.rewardValidityDays>0?e.program.rewardValidityDays:365;await u(t,{organizationId:e.organizationId,customerId:e.customerId,publicToken:a.rows[0].publicToken,rewardId:o,rewardLabel:e.program.rewardLabel,rewardKind:e.program.rewardKind,rewardValue:e.program.rewardValue,expiresAt:new Date(Date.now()+864e5*r)})}}}return{eventId:r,visits:i,rewardId:o}}async function A(t,e){let r=await (0,l.pJ)(t,e),a=await C.query(`SELECT lc.id, lc."customerId", c."firstName", c."lastName", c.phone
     FROM "LoyaltyCard" lc
     JOIN "Customer" c ON c.id = lc."customerId"
     WHERE lc."publicToken" = $1 AND lc."organizationId" = $2 AND lc.status = 'ACTIVE'`,[r,t]);if(!a.rows[0])throw Error("CARD_NOT_FOUND");let i=await (0,l.Wk)(t);if(!i.active)throw Error("PROGRAM_DISABLED");let o=await C.query(`SELECT a.id,
            COALESCE(a."serviceNameSnapshot", s.name, 'Prestation') AS "serviceName",
            a.price::text AS amount
     FROM "Appointment" a
     LEFT JOIN "Service" s ON s.id = a."serviceId"
     WHERE a."organizationId" = $1
       AND a."customerId" = $2
       AND a.status = 'COMPLETED'
       AND NOT EXISTS (
         SELECT 1 FROM "LoyaltyEvent" e WHERE e."appointmentId" = a.id
       )
     ORDER BY a."startAt" DESC
     LIMIT 1`,[t,a.rows[0].customerId]),d=await (0,l.$d)(a.rows[0].id,t);if(!d)throw Error("CARD_NOT_FOUND");let n=o.rows[0];return{token:r,customerId:a.rows[0].customerId,customerName:`${a.rows[0].firstName} ${a.rows[0].lastName}`.trim(),firstName:a.rows[0].firstName,lastName:a.rows[0].lastName,phone:a.rows[0].phone,appointmentId:n?.id??null,serviceName:n?.serviceName??null,amount:n?Number(n.amount):null,visits:d.cycle,visitsPerReward:i.visitsPerReward,rewardLabel:i.rewardLabel,rewards:d.rewards.filter(t=>"AVAILABLE"===t.status),card:{organizationName:d.organizationName,firstName:d.firstName,lastName:d.lastName,visits:d.visits,cycle:d.cycle,visitsPerReward:d.visitsPerReward,remaining:d.remaining,rewardLabel:d.rewardLabel,rewardsAvailable:d.rewardsAvailable,rewards:d.rewards,appointments:d.appointments,sessions:d.sessions,cardBackgroundUrl:d.cardBackgroundUrl}}}async function N(t,e,r,a){if(!(await (0,l.Wk)(t)).active)throw Error("PROGRAM_DISABLED");let i=(await C.query(`UPDATE "LoyaltyVisitReward"
     SET status = 'REDEEMED', "usedAt" = NOW(), "usedById" = $3
     WHERE id = $1 AND "organizationId" = $2 AND status = 'AVAILABLE'
       AND ("expiresAt" IS NULL OR "expiresAt" > NOW())
     RETURNING id, name, "customerId", value::text AS value`,[e,t,r])).rows[0];if(!i)throw Error("REWARD_NOT_AVAILABLE");await C.query(`UPDATE "Promotion"
     SET status = 'INACTIVE', "updatedAt" = NOW()
     WHERE "organizationId" = $1 AND description = $2 AND "deletedAt" IS NULL AND status = 'ACTIVE'`,[t,`loyalty:${i.id}`]),await (0,n.writeAuditLog)({organizationId:t,actorId:r,actorName:a,entityType:"LoyaltyVisitReward",entityId:i.id,action:"LOYALTY_REWARD_REDEEMED",before:{status:"AVAILABLE",customerId:i.customerId},after:{status:"REDEEMED",name:i.name,value:null!=i.value?Number(i.value):null,customerId:i.customerId,usedById:r}})}async function y(t,e,r,a){let i=await (0,l.Wk)(t);if(!i.active)throw Error("PROGRAM_DISABLED");let o=e.trim().toUpperCase(),d=await C.connect(),n=!1;try{await d.query("BEGIN");let e=await d.query(`SELECT lc.id, lc."customerId", c."firstName", c."lastName"
       FROM "LoyaltyCard" lc
       JOIN "Customer" c ON c.id = lc."customerId"
       WHERE lc."publicToken" = $1 AND lc."organizationId" = $2 AND lc.status = 'ACTIVE'
       FOR UPDATE OF lc`,[o,t]);if(!e.rows[0])throw Error("CARD_NOT_FOUND");let s=(await d.query(`SELECT a.id, a."customerId", a."serviceId", a.status, a.price::text AS amount,
              COALESCE(a."serviceNameSnapshot", s.name, 'Prestation') AS "serviceName"
       FROM "Appointment" a
       LEFT JOIN "Service" s ON s.id = a."serviceId"
       WHERE a.id = $1 AND a."organizationId" = $2
       FOR UPDATE OF a`,[r,t])).rows[0];if(!s||s.customerId!==e.rows[0].customerId)throw Error("APPOINTMENT_MISMATCH");if("COMPLETED"!==s.status)throw Error("APPOINTMENT_NOT_COMPLETED");if(i.eligibleServiceIds.length>0&&(!s.serviceId||!i.eligibleServiceIds.includes(s.serviceId)))throw Error("SERVICE_NOT_ELIGIBLE");await m(d,{organizationId:t,cardId:e.rows[0].id,customerId:e.rows[0].customerId,appointmentId:s.id,serviceId:s.serviceId,amount:s.amount,points:1,validatedBy:a,note:null,program:i}),await d.query("COMMIT");let I={cardId:e.rows[0].id,customerName:`${e.rows[0].firstName} ${e.rows[0].lastName}`.trim(),serviceName:s.serviceName,amount:Number(s.amount)};n=!0,d.release(),(0,c.Wl)(o);let E=await (0,l.$d)(I.cardId,t);if(!E)throw Error("CARD_NOT_FOUND");return{...E,customerName:I.customerName,serviceName:I.serviceName,amount:I.amount}}catch(t){if(!n){try{await d.query("ROLLBACK")}catch{}d.release()}throw t}}async function L(t){let e=await (0,l.Wk)(t.organizationId);if(!e.active)return{credited:!1};let r=(await C.query(`SELECT a."customerId", a."serviceId", a.price::text AS amount, a.status::text AS status,
            COALESCE((
              SELECT SUM(CASE WHEN p.kind = 'REFUND' THEN -p.amount ELSE p.amount END)
              FROM "Payment" p
              WHERE p."appointmentId" = a.id AND p.status = 'COMPLETED'
            ), 0)::text AS "netPaid"
     FROM "Appointment" a
     WHERE a.id = $1 AND a."organizationId" = $2`,[t.appointmentId,t.organizationId])).rows[0];if(!r||"COMPLETED"!==r.status)return{credited:!1};let a=Number(r.amount)||0;if((Number(r.netPaid)||0)+.009<a||e.eligibleServiceIds.length>0&&(!r.serviceId||!e.eligibleServiceIds.includes(r.serviceId)))return{credited:!1};let i=await C.query(`SELECT id, "publicToken" FROM "LoyaltyCard"
     WHERE "organizationId" = $1 AND "customerId" = $2 AND status = 'ACTIVE'
     LIMIT 1`,[t.organizationId,r.customerId]);if(!i.rows[0])return{credited:!1};let o=await C.connect(),d=!1;try{return await o.query("BEGIN"),await o.query('SELECT id FROM "LoyaltyCard" WHERE id = $1 FOR UPDATE',[i.rows[0].id]),await m(o,{organizationId:t.organizationId,cardId:i.rows[0].id,customerId:r.customerId,appointmentId:t.appointmentId,serviceId:r.serviceId,amount:r.amount,points:1,validatedBy:t.actorId??null,note:null,program:e}),await o.query("COMMIT"),d=!0,(0,c.Wl)(i.rows[0].publicToken),{credited:!0}}catch(t){if(t instanceof Error&&"ALREADY_VALIDATED"===t.message)return{credited:!1};throw t}finally{if(!d)try{await o.query("ROLLBACK")}catch{}o.release()}}async function p(t){let e=t.reason.trim();if(e.length<3)throw Error("REASON_REQUIRED");if(1!==t.delta&&-1!==t.delta)throw Error("INVALID_DELTA");let r=await (0,l.Wk)(t.organizationId);if(!r.active)throw Error("PROGRAM_DISABLED");let a=await C.query(`SELECT id, "publicToken" FROM "LoyaltyCard"
     WHERE "organizationId" = $1 AND "customerId" = $2 AND status = 'ACTIVE'
     LIMIT 1`,[t.organizationId,t.customerId]);if(!a.rows[0])throw Error("NO_CARD");let i=await C.connect(),o=!1;try{await i.query("BEGIN"),await i.query('SELECT id FROM "LoyaltyCard" WHERE id = $1 FOR UPDATE',[a.rows[0].id]);let d=await i.query(`SELECT COALESCE(SUM(points), 0)::text AS count
       FROM "LoyaltyEvent" WHERE "loyaltyCardId" = $1 AND type = 'VISIT'`,[a.rows[0].id]),s=Number(d.rows[0]?.count??0);if(s+t.delta<0)throw Error("VISIT_BELOW_ZERO");let I=await m(i,{organizationId:t.organizationId,cardId:a.rows[0].id,customerId:t.customerId,appointmentId:null,serviceId:null,amount:0,points:t.delta,validatedBy:t.actorId,note:e,program:r});return await (0,n.writeAuditLog)({organizationId:t.organizationId,actorId:t.actorId,actorName:t.actorName,entityType:"LoyaltyEvent",entityId:I.eventId,action:"LOYALTY_VISIT_ADJUSTED",before:{visits:s,customerId:t.customerId},after:{visits:I.visits,delta:t.delta,reason:e,customerId:t.customerId},client:i}),await i.query("COMMIT"),o=!0,(0,c.Wl)(a.rows[0].publicToken),{visits:I.visits}}catch(t){if(!o)try{await i.query("ROLLBACK")}catch{}throw t}finally{i.release()}}function T(t,e){return(0,i.createHash)("sha256").update(`${t}:${e}`).digest("hex")}async function R(t){let e=String((0,i.randomInt)(0,1e6)).padStart(6,"0"),r=new Date(Date.now()+6e5);return await C.query(`INSERT INTO "LoyaltyCreditCode" (id, "organizationId", "codeHash", "expiresAt", "createdBy")
     VALUES ($1, $2, $3, $4, $5)`,[(0,l.bt)("lcode"),t.organizationId,T(t.organizationId,e),r,t.actorId]),{code:e,expiresAt:r.toISOString()}}async function D(t){let{rows:e}=await C.query(`SELECT id, name FROM "Service"
     WHERE "organizationId" = $1 AND active = true
     ORDER BY name ASC
     LIMIT 80`,[t]);return e}async function O(t){let e=await (0,l.Wk)(t.organizationId);if(!e.active)throw Error("PROGRAM_DISABLED");let r=await (0,l.pJ)(t.organizationId,t.rawToken),a=t.code.replace(/\s/g,"");if(!/^\d{6}$/.test(a))throw Error("CODE_INVALID");let i=await C.connect(),o=!1;try{await i.query("BEGIN");let d=await i.query(`SELECT id FROM "LoyaltyCreditCode"
       WHERE "organizationId" = $1 AND "codeHash" = $2 AND "usedAt" IS NULL AND "expiresAt" > NOW()
       ORDER BY "createdAt" DESC
       LIMIT 1
       FOR UPDATE`,[t.organizationId,T(t.organizationId,a)]);if(!d.rows[0])throw Error("CODE_INVALID");let s=await i.query('UPDATE "LoyaltyCreditCode" SET "usedAt" = NOW() WHERE id = $1 AND "usedAt" IS NULL RETURNING id',[d.rows[0].id]);if(!s.rows[0])throw Error("CODE_INVALID");let I=await i.query(`SELECT lc.id, lc."customerId", c."firstName", c."lastName"
       FROM "LoyaltyCard" lc
       JOIN "Customer" c ON c.id = lc."customerId"
       WHERE lc."publicToken" = $1 AND lc."organizationId" = $2 AND lc.status = 'ACTIVE'
       FOR UPDATE OF lc`,[r,t.organizationId]);if(!I.rows[0])throw Error("CARD_NOT_FOUND");let E=await i.query(`SELECT id, name, price::text AS price FROM "Service"
       WHERE id = $1 AND "organizationId" = $2 AND active = true`,[t.serviceId,t.organizationId]);if(!E.rows[0])throw Error("SERVICE_NOT_FOUND");if(e.eligibleServiceIds.length>0&&!e.eligibleServiceIds.includes(E.rows[0].id))throw Error("SERVICE_NOT_ELIGIBLE");let u=await m(i,{organizationId:t.organizationId,cardId:I.rows[0].id,customerId:I.rows[0].customerId,appointmentId:null,serviceId:E.rows[0].id,amount:E.rows[0].price,points:1,validatedBy:t.actorId,note:"Passage exceptionnel",program:e,actorName:t.actorName});await (0,n.writeAuditLog)({organizationId:t.organizationId,actorId:t.actorId,actorName:t.actorName,entityType:"LoyaltyEvent",entityId:u.eventId,action:"LOYALTY_VISIT_ADJUSTED",before:{customerId:I.rows[0].customerId},after:{visits:u.visits,serviceId:E.rows[0].id,creditCodeId:s.rows[0].id,customerId:I.rows[0].customerId},client:i}),await i.query("COMMIT"),o=!0,(0,c.Wl)(r);let w=await (0,l.$d)(I.rows[0].id,t.organizationId);if(!w)throw Error("CARD_NOT_FOUND");return{...w,customerName:`${I.rows[0].firstName} ${I.rows[0].lastName}`.trim(),serviceName:E.rows[0].name}}catch(t){if(!o)try{await i.query("ROLLBACK")}catch{}throw t}finally{i.release()}}async function S(t){let e=await (0,l.Wk)(t.organizationId);if(!e.active)throw Error("PROGRAM_DISABLED");let r=await (0,l.pJ)(t.organizationId,t.rawToken),a=t.serviceId?.trim()||null,i=await C.connect(),o=!1;try{await i.query("BEGIN");let d=await i.query(`SELECT lc.id, lc."customerId", c."firstName", c."lastName"
       FROM "LoyaltyCard" lc
       JOIN "Customer" c ON c.id = lc."customerId"
       WHERE lc."publicToken" = $1 AND lc."organizationId" = $2 AND lc.status = 'ACTIVE'
       FOR UPDATE OF lc`,[r,t.organizationId]);if(!d.rows[0])throw Error("CARD_NOT_FOUND");let I=null;if(a){let r=await i.query(`SELECT id, name, price::text AS price FROM "Service"
         WHERE id = $1 AND "organizationId" = $2 AND active = true`,[a,t.organizationId]);if(!r.rows[0])throw Error("SERVICE_NOT_FOUND");if(e.eligibleServiceIds.length>0&&!e.eligibleServiceIds.includes(r.rows[0].id))throw Error("SERVICE_NOT_ELIGIBLE");I=r.rows[0]}let E=await m(i,{organizationId:t.organizationId,cardId:d.rows[0].id,customerId:d.rows[0].customerId,appointmentId:null,serviceId:I?.id??null,amount:I?.price??0,points:1,validatedBy:t.actorId,note:"Passage",program:e,actorName:t.actorName});await (0,n.writeAuditLog)({organizationId:t.organizationId,actorId:t.actorId,actorName:t.actorName,entityType:"LoyaltyEvent",entityId:E.eventId,action:"LOYALTY_VISIT_ADJUSTED",before:{customerId:d.rows[0].customerId},after:{visits:E.visits,serviceId:I?.id??null,customerId:d.rows[0].customerId},client:i}),await i.query("COMMIT"),o=!0,(0,c.Wl)(r);let u=await (0,l.$d)(d.rows[0].id,t.organizationId);if(!u)throw Error("CARD_NOT_FOUND");return{...u,customerName:`${d.rows[0].firstName} ${d.rows[0].lastName}`.trim(),serviceName:I?.name??"Passage",promoCode:E.rewardId?(0,s.J)(r):null}}catch(t){if(!o)try{await i.query("ROLLBACK")}catch{}throw t}finally{i.release()}}a()}catch(t){a(t)}})}};