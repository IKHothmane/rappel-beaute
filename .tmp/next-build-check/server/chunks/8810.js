"use strict";exports.id=8810,exports.ids=[8810],exports.modules={26603:(t,e,r)=>{r.a(t,async(t,a)=>{try{r.d(e,{Bh:()=>D,D3:()=>R,EU:()=>u,RV:()=>m,_f:()=>L,ak:()=>O,creditVisitIfEligible:()=>y,d7:()=>p,fh:()=>A,t6:()=>N});var i=r(84770),o=r(8678),d=r(2192),s=r(68887),n=r(82433),c=r(88114),I=r(69510),l=t([o,d,n,c,I]);[o,d,n,c,I]=l.then?(await l)():l;let C=new o.Pool({connectionString:process.env.DATABASE_URL});async function E(t,e){let r=(0,s.J)(e.publicToken);if(r.length<4)return;let a=`loyalty:${e.rewardId}`,i=e.rewardKind,o="DISCOUNT"===i?"FIXED_AMOUNT":"PERCENTAGE"===i?"PERCENTAGE":"FREE_SERVICE",d="FREE_SERVICE"===o?null:null!=e.rewardValue&&e.rewardValue>0?e.rewardValue:null;if("FREE_SERVICE"!==o&&null==d)return;let n=e.rewardLabel.trim()||("FREE_SERVICE"===o?"Service offert":"PERCENTAGE"===o?`Remise ${d} %`:`Remise ${d} MAD`),c=(await t.query(`SELECT id, "customerId", description, status FROM "Promotion"
     WHERE "organizationId" = $1 AND upper(code) = $2
     LIMIT 1`,[e.organizationId,r])).rows[0];if(!c?.customerId||c.customerId===e.customerId){if(c){await t.query(`UPDATE "Promotion"
       SET status = 'ACTIVE', type = $2::"PromotionType", name = $3, "customerId" = $4,
           value = $5, "maxUses" = 1, "maxUsesPerCustomer" = 1, "usageCount" = 0,
           "serviceId" = NULL, "endsAt" = $6, description = $7, "deletedAt" = NULL, "updatedAt" = NOW()
       WHERE id = $1`,[c.id,o,n,e.customerId,d,e.expiresAt,a]);return}await t.query(`INSERT INTO "Promotion" (
      id, "organizationId", name, code, type, status, value, "customerId",
      "maxUses", "maxUsesPerCustomer", "usageCount", "endsAt", description, "updatedAt"
    ) VALUES ($1,$2,$3,$4,$5::"PromotionType",'ACTIVE'::"PromotionStatus",$6,$7,1,1,0,$8,$9,NOW())`,[(0,I.bt)("promo"),e.organizationId,n,r,o,d,e.customerId,e.expiresAt,a])}}async function u(t){let e=await (0,I.Wk)(t),{rows:r}=await C.query(`SELECT r.id, r."customerId", r.name, r."expiresAt", lc."publicToken"
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
       )`,[t]);for(let a of r)await E(C,{organizationId:t,customerId:a.customerId,publicToken:a.publicToken,rewardId:a.id,rewardLabel:a.name||e.rewardLabel,rewardKind:e.rewardKind,rewardValue:e.rewardValue,expiresAt:a.expiresAt})}async function w(t,e){let r=(0,I.bt)("levt");try{await t.query(`INSERT INTO "LoyaltyEvent" (
        id, "organizationId", "customerId", "loyaltyCardId", type,
        "appointmentId", "serviceId", amount, points, note, "validatedBy", "validatedAt"
      ) VALUES ($1, $2, $3, $4, 'VISIT', $5, $6, $7, $8, $9, $10, NOW())`,[r,e.organizationId,e.customerId,e.cardId,e.appointmentId,e.serviceId,e.amount,e.points,e.note,e.validatedBy]),await t.query('UPDATE "LoyaltyCard" SET "updatedAt" = NOW() WHERE id = $1',[e.cardId])}catch(t){if((0,c.zp)(t))throw Error("ALREADY_VALIDATED");throw t}let a=await t.query(`SELECT COALESCE(SUM(points), 0)::text AS count
     FROM "LoyaltyEvent" WHERE "loyaltyCardId" = $1 AND type = 'VISIT'`,[e.cardId]),i=Number(a.rows[0]?.count??0),o=null;if(e.points>0&&i>0&&i%e.program.visitsPerReward==0){let a=e.program.stackRewards?{rows:[]}:await t.query(`SELECT id FROM "LoyaltyVisitReward"
           WHERE "loyaltyCardId" = $1 AND status = 'AVAILABLE'
             AND ("expiresAt" IS NULL OR "expiresAt" > NOW())
           LIMIT 1`,[e.cardId]);if(0===a.rows.length){o=(0,I.bt)("lrew"),await t.query(`INSERT INTO "LoyaltyVisitReward" (
          id, "organizationId", "customerId", "loyaltyCardId", "loyaltyEventId",
          name, status, value, "earnedAt", "expiresAt"
        ) VALUES ($1, $2, $3, $4, $5, $6, 'AVAILABLE', $7, NOW(), NOW() + $8::interval)`,[o,e.organizationId,e.customerId,e.cardId,r,e.program.rewardLabel,e.program.rewardValue,`${e.program.rewardValidityDays} days`]),await (0,d.writeAuditLog)({organizationId:e.organizationId,actorId:e.validatedBy,actorName:e.actorName,entityType:"LoyaltyVisitReward",entityId:o,action:"LOYALTY_REWARD_EARNED",before:{status:null,visits:i},after:{status:"AVAILABLE",name:e.program.rewardLabel,value:e.program.rewardValue,customerId:e.customerId,loyaltyEventId:r},client:t});let a=await t.query('SELECT "publicToken" FROM "LoyaltyCard" WHERE id = $1',[e.cardId]);if(a.rows[0]){let r=e.program.rewardValidityDays>0?e.program.rewardValidityDays:365;await E(t,{organizationId:e.organizationId,customerId:e.customerId,publicToken:a.rows[0].publicToken,rewardId:o,rewardLabel:e.program.rewardLabel,rewardKind:e.program.rewardKind,rewardValue:e.program.rewardValue,expiresAt:new Date(Date.now()+864e5*r)})}}}return{eventId:r,visits:i,rewardId:o}}async function m(t,e){let r=await (0,I.pJ)(t,e),a=await C.query(`SELECT lc.id, lc."customerId", c."firstName", c."lastName", c.phone
     FROM "LoyaltyCard" lc
     JOIN "Customer" c ON c.id = lc."customerId"
     WHERE lc."publicToken" = $1 AND lc."organizationId" = $2 AND lc.status = 'ACTIVE'`,[r,t]);if(!a.rows[0])throw Error("CARD_NOT_FOUND");let i=await (0,I.Wk)(t);if(!i.active)throw Error("PROGRAM_DISABLED");let o=await C.query(`SELECT a.id,
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
     LIMIT 1`,[t,a.rows[0].customerId]),d=await (0,I.$d)(a.rows[0].id,t);if(!d)throw Error("CARD_NOT_FOUND");let s=o.rows[0];return{token:r,customerId:a.rows[0].customerId,customerName:`${a.rows[0].firstName} ${a.rows[0].lastName}`.trim(),firstName:a.rows[0].firstName,lastName:a.rows[0].lastName,phone:a.rows[0].phone,appointmentId:s?.id??null,serviceName:s?.serviceName??null,amount:s?Number(s.amount):null,visits:d.cycle,visitsPerReward:i.visitsPerReward,rewardLabel:i.rewardLabel,rewards:d.rewards.filter(t=>"AVAILABLE"===t.status),card:{organizationName:d.organizationName,firstName:d.firstName,lastName:d.lastName,visits:d.visits,cycle:d.cycle,visitsPerReward:d.visitsPerReward,remaining:d.remaining,rewardLabel:d.rewardLabel,rewardsAvailable:d.rewardsAvailable,rewards:d.rewards,appointments:d.appointments,sessions:d.sessions,cardBackgroundUrl:d.cardBackgroundUrl}}}async function A(t,e,r,a){if(!(await (0,I.Wk)(t)).active)throw Error("PROGRAM_DISABLED");let i=(await C.query(`UPDATE "LoyaltyVisitReward"
     SET status = 'REDEEMED', "usedAt" = NOW(), "usedById" = $3
     WHERE id = $1 AND "organizationId" = $2 AND status = 'AVAILABLE'
       AND ("expiresAt" IS NULL OR "expiresAt" > NOW())
     RETURNING id, name, "customerId", value::text AS value`,[e,t,r])).rows[0];if(!i)throw Error("REWARD_NOT_AVAILABLE");await C.query(`UPDATE "Promotion"
     SET status = 'INACTIVE', "updatedAt" = NOW()
     WHERE "organizationId" = $1 AND description = $2 AND "deletedAt" IS NULL AND status = 'ACTIVE'`,[t,`loyalty:${i.id}`]),await (0,d.writeAuditLog)({organizationId:t,actorId:r,actorName:a,entityType:"LoyaltyVisitReward",entityId:i.id,action:"LOYALTY_REWARD_REDEEMED",before:{status:"AVAILABLE",customerId:i.customerId},after:{status:"REDEEMED",name:i.name,value:null!=i.value?Number(i.value):null,customerId:i.customerId,usedById:r}})}async function N(t,e,r,a){let i=await (0,I.Wk)(t);if(!i.active)throw Error("PROGRAM_DISABLED");let o=e.trim().toUpperCase(),d=await C.connect(),s=!1;try{await d.query("BEGIN");let e=await d.query(`SELECT lc.id, lc."customerId", c."firstName", c."lastName"
       FROM "LoyaltyCard" lc
       JOIN "Customer" c ON c.id = lc."customerId"
       WHERE lc."publicToken" = $1 AND lc."organizationId" = $2 AND lc.status = 'ACTIVE'
       FOR UPDATE OF lc`,[o,t]);if(!e.rows[0])throw Error("CARD_NOT_FOUND");let c=(await d.query(`SELECT a.id, a."customerId", a."serviceId", a.status, a.price::text AS amount,
              COALESCE(a."serviceNameSnapshot", s.name, 'Prestation') AS "serviceName"
       FROM "Appointment" a
       LEFT JOIN "Service" s ON s.id = a."serviceId"
       WHERE a.id = $1 AND a."organizationId" = $2
       FOR UPDATE OF a`,[r,t])).rows[0];if(!c||c.customerId!==e.rows[0].customerId)throw Error("APPOINTMENT_MISMATCH");if("COMPLETED"!==c.status)throw Error("APPOINTMENT_NOT_COMPLETED");if(i.eligibleServiceIds.length>0&&(!c.serviceId||!i.eligibleServiceIds.includes(c.serviceId)))throw Error("SERVICE_NOT_ELIGIBLE");await w(d,{organizationId:t,cardId:e.rows[0].id,customerId:e.rows[0].customerId,appointmentId:c.id,serviceId:c.serviceId,amount:c.amount,points:1,validatedBy:a,note:null,program:i}),await d.query("COMMIT");let l={cardId:e.rows[0].id,customerName:`${e.rows[0].firstName} ${e.rows[0].lastName}`.trim(),serviceName:c.serviceName,amount:Number(c.amount)};s=!0,d.release(),(0,n.Wl)(o);let E=await (0,I.$d)(l.cardId,t);if(!E)throw Error("CARD_NOT_FOUND");return{...E,customerName:l.customerName,serviceName:l.serviceName,amount:l.amount}}catch(t){if(!s){try{await d.query("ROLLBACK")}catch{}d.release()}throw t}}async function y(t){let e=await (0,I.Wk)(t.organizationId);if(!e.active)return{credited:!1};let r=(await C.query(`SELECT a."customerId", a."serviceId", a.price::text AS amount, a.status::text AS status,
            COALESCE((
              SELECT SUM(CASE WHEN p.kind = 'REFUND' THEN -p.amount ELSE p.amount END)
              FROM "Payment" p
              WHERE p."appointmentId" = a.id AND p.status = 'COMPLETED'
            ), 0)::text AS "netPaid"
     FROM "Appointment" a
     WHERE a.id = $1 AND a."organizationId" = $2`,[t.appointmentId,t.organizationId])).rows[0];if(!r||"COMPLETED"!==r.status)return{credited:!1};let a=Number(r.amount)||0;if((Number(r.netPaid)||0)+.009<a||e.eligibleServiceIds.length>0&&(!r.serviceId||!e.eligibleServiceIds.includes(r.serviceId)))return{credited:!1};let i=await C.query(`SELECT id, "publicToken" FROM "LoyaltyCard"
     WHERE "organizationId" = $1 AND "customerId" = $2 AND status = 'ACTIVE'
     LIMIT 1`,[t.organizationId,r.customerId]);if(!i.rows[0])return{credited:!1};let o=await C.connect(),d=!1;try{return await o.query("BEGIN"),await o.query('SELECT id FROM "LoyaltyCard" WHERE id = $1 FOR UPDATE',[i.rows[0].id]),await w(o,{organizationId:t.organizationId,cardId:i.rows[0].id,customerId:r.customerId,appointmentId:t.appointmentId,serviceId:r.serviceId,amount:r.amount,points:1,validatedBy:t.actorId??null,note:null,program:e}),await o.query("COMMIT"),d=!0,(0,n.Wl)(i.rows[0].publicToken),{credited:!0}}catch(t){if(t instanceof Error&&"ALREADY_VALIDATED"===t.message)return{credited:!1};throw t}finally{if(!d)try{await o.query("ROLLBACK")}catch{}o.release()}}async function L(t){let e=t.reason.trim();if(e.length<3)throw Error("REASON_REQUIRED");if(1!==t.delta&&-1!==t.delta)throw Error("INVALID_DELTA");let r=await (0,I.Wk)(t.organizationId);if(!r.active)throw Error("PROGRAM_DISABLED");let a=await C.query(`SELECT id, "publicToken" FROM "LoyaltyCard"
     WHERE "organizationId" = $1 AND "customerId" = $2 AND status = 'ACTIVE'
     LIMIT 1`,[t.organizationId,t.customerId]);if(!a.rows[0])throw Error("NO_CARD");let i=await C.connect(),o=!1;try{await i.query("BEGIN"),await i.query('SELECT id FROM "LoyaltyCard" WHERE id = $1 FOR UPDATE',[a.rows[0].id]);let s=await i.query(`SELECT COALESCE(SUM(points), 0)::text AS count
       FROM "LoyaltyEvent" WHERE "loyaltyCardId" = $1 AND type = 'VISIT'`,[a.rows[0].id]),c=Number(s.rows[0]?.count??0);if(c+t.delta<0)throw Error("VISIT_BELOW_ZERO");let I=await w(i,{organizationId:t.organizationId,cardId:a.rows[0].id,customerId:t.customerId,appointmentId:null,serviceId:null,amount:0,points:t.delta,validatedBy:t.actorId,note:e,program:r});return await (0,d.writeAuditLog)({organizationId:t.organizationId,actorId:t.actorId,actorName:t.actorName,entityType:"LoyaltyEvent",entityId:I.eventId,action:"LOYALTY_VISIT_ADJUSTED",before:{visits:c,customerId:t.customerId},after:{visits:I.visits,delta:t.delta,reason:e,customerId:t.customerId},client:i}),await i.query("COMMIT"),o=!0,(0,n.Wl)(a.rows[0].publicToken),{visits:I.visits}}catch(t){if(!o)try{await i.query("ROLLBACK")}catch{}throw t}finally{i.release()}}function T(t,e){return(0,i.createHash)("sha256").update(`${t}:${e}`).digest("hex")}async function R(t){let e=String((0,i.randomInt)(0,1e6)).padStart(6,"0"),r=new Date(Date.now()+6e5);return await C.query(`INSERT INTO "LoyaltyCreditCode" (id, "organizationId", "codeHash", "expiresAt", "createdBy")
     VALUES ($1, $2, $3, $4, $5)`,[(0,I.bt)("lcode"),t.organizationId,T(t.organizationId,e),r,t.actorId]),{code:e,expiresAt:r.toISOString()}}async function p(t){let{rows:e}=await C.query(`SELECT id, name FROM "Service"
     WHERE "organizationId" = $1 AND active = true
     ORDER BY name ASC
     LIMIT 80`,[t]);return e}async function D(t){let e=await (0,I.Wk)(t.organizationId);if(!e.active)throw Error("PROGRAM_DISABLED");let r=await (0,I.pJ)(t.organizationId,t.rawToken),a=t.code.replace(/\s/g,"");if(!/^\d{6}$/.test(a))throw Error("CODE_INVALID");let i=await C.connect(),o=!1;try{await i.query("BEGIN");let s=await i.query(`SELECT id FROM "LoyaltyCreditCode"
       WHERE "organizationId" = $1 AND "codeHash" = $2 AND "usedAt" IS NULL AND "expiresAt" > NOW()
       ORDER BY "createdAt" DESC
       LIMIT 1
       FOR UPDATE`,[t.organizationId,T(t.organizationId,a)]);if(!s.rows[0])throw Error("CODE_INVALID");let c=await i.query('UPDATE "LoyaltyCreditCode" SET "usedAt" = NOW() WHERE id = $1 AND "usedAt" IS NULL RETURNING id',[s.rows[0].id]);if(!c.rows[0])throw Error("CODE_INVALID");let l=await i.query(`SELECT lc.id, lc."customerId", c."firstName", c."lastName"
       FROM "LoyaltyCard" lc
       JOIN "Customer" c ON c.id = lc."customerId"
       WHERE lc."publicToken" = $1 AND lc."organizationId" = $2 AND lc.status = 'ACTIVE'
       FOR UPDATE OF lc`,[r,t.organizationId]);if(!l.rows[0])throw Error("CARD_NOT_FOUND");let E=await i.query(`SELECT id, name, price::text AS price FROM "Service"
       WHERE id = $1 AND "organizationId" = $2 AND active = true`,[t.serviceId,t.organizationId]);if(!E.rows[0])throw Error("SERVICE_NOT_FOUND");if(e.eligibleServiceIds.length>0&&!e.eligibleServiceIds.includes(E.rows[0].id))throw Error("SERVICE_NOT_ELIGIBLE");let u=await w(i,{organizationId:t.organizationId,cardId:l.rows[0].id,customerId:l.rows[0].customerId,appointmentId:null,serviceId:E.rows[0].id,amount:E.rows[0].price,points:1,validatedBy:t.actorId,note:"Passage exceptionnel",program:e,actorName:t.actorName});await (0,d.writeAuditLog)({organizationId:t.organizationId,actorId:t.actorId,actorName:t.actorName,entityType:"LoyaltyEvent",entityId:u.eventId,action:"LOYALTY_VISIT_ADJUSTED",before:{customerId:l.rows[0].customerId},after:{visits:u.visits,serviceId:E.rows[0].id,creditCodeId:c.rows[0].id,customerId:l.rows[0].customerId},client:i}),await i.query("COMMIT"),o=!0,(0,n.Wl)(r);let m=await (0,I.$d)(l.rows[0].id,t.organizationId);if(!m)throw Error("CARD_NOT_FOUND");return{...m,customerName:`${l.rows[0].firstName} ${l.rows[0].lastName}`.trim(),serviceName:E.rows[0].name}}catch(t){if(!o)try{await i.query("ROLLBACK")}catch{}throw t}finally{i.release()}}async function O(t){let e=await (0,I.Wk)(t.organizationId);if(!e.active)throw Error("PROGRAM_DISABLED");let r=await (0,I.pJ)(t.organizationId,t.rawToken),a=t.serviceId?.trim()||null,i=await C.connect(),o=!1;try{await i.query("BEGIN");let c=await i.query(`SELECT lc.id, lc."customerId", c."firstName", c."lastName"
       FROM "LoyaltyCard" lc
       JOIN "Customer" c ON c.id = lc."customerId"
       WHERE lc."publicToken" = $1 AND lc."organizationId" = $2 AND lc.status = 'ACTIVE'
       FOR UPDATE OF lc`,[r,t.organizationId]);if(!c.rows[0])throw Error("CARD_NOT_FOUND");let l=null;if(a){let r=await i.query(`SELECT id, name, price::text AS price FROM "Service"
         WHERE id = $1 AND "organizationId" = $2 AND active = true`,[a,t.organizationId]);if(!r.rows[0])throw Error("SERVICE_NOT_FOUND");if(e.eligibleServiceIds.length>0&&!e.eligibleServiceIds.includes(r.rows[0].id))throw Error("SERVICE_NOT_ELIGIBLE");l=r.rows[0]}let E=await w(i,{organizationId:t.organizationId,cardId:c.rows[0].id,customerId:c.rows[0].customerId,appointmentId:null,serviceId:l?.id??null,amount:l?.price??0,points:1,validatedBy:t.actorId,note:"Passage",program:e,actorName:t.actorName});await (0,d.writeAuditLog)({organizationId:t.organizationId,actorId:t.actorId,actorName:t.actorName,entityType:"LoyaltyEvent",entityId:E.eventId,action:"LOYALTY_VISIT_ADJUSTED",before:{customerId:c.rows[0].customerId},after:{visits:E.visits,serviceId:l?.id??null,customerId:c.rows[0].customerId},client:i}),await i.query("COMMIT"),o=!0,(0,n.Wl)(r);let u=await (0,I.$d)(c.rows[0].id,t.organizationId);if(!u)throw Error("CARD_NOT_FOUND");return{...u,customerName:`${c.rows[0].firstName} ${c.rows[0].lastName}`.trim(),serviceName:l?.name??"Passage",promoCode:E.rewardId?(0,s.J)(r):null}}catch(t){if(!o)try{await i.query("ROLLBACK")}catch{}throw t}finally{i.release()}}a()}catch(t){a(t)}})}};