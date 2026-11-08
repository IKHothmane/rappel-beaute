"use strict";exports.id=8114,exports.ids=[8114],exports.modules={88114:(e,t,a)=>{a.a(e,async(e,i)=>{try{a.d(t,{FC:()=>m,Lt:()=>E,Pg:()=>g,V_:()=>p,ZZ:()=>O,adjustPointsForRefund:()=>w,cg:()=>N,consumePackageSessionForAppointment:()=>M,earnPointsFromPayment:()=>A,g9:()=>S,hV:()=>L,uI:()=>T,vF:()=>R,zp:()=>c});var r=a(84770),n=a(8678),o=a(2192),s=a(68887),d=e([n,o]);[n,o]=d.then?(await d)():d;let v=new n.Pool({connectionString:process.env.DATABASE_URL});function l(e){return`${e}_${(0,r.randomBytes)(8).toString("hex")}`}function c(e){return"object"==typeof e&&null!==e&&"code"in e&&"23505"===e.code}function u(e,t){return e>=t.vipMin?"VIP":e>=t.goldMin?"GOLD":e>=t.silverMin?"SILVER":"BRONZE"}async function m(e,t){let a=t??v,i=await a.query(`SELECT id, "madPerPoint"::text, "bronzeMin", "silverMin", "goldMin", "vipMin", active,
            "visitsPerReward", "rewardLabel", name, "rewardKind", "rewardValue"::text,
            "rewardValidityDays", "productsEligible", "stackRewards", "eligibleServiceIds",
            "cardBackgroundUrl"
     FROM "LoyaltyProgram" WHERE "organizationId" = $1`,[e]);if(i.rows[0]){let e=i.rows[0];return{id:e.id,madPerPoint:parseFloat(e.madPerPoint)||1,bronzeMin:e.bronzeMin,silverMin:e.silverMin,goldMin:e.goldMin,vipMin:e.vipMin,active:e.active,visitsPerReward:e.visitsPerReward&&e.visitsPerReward>0?e.visitsPerReward:5,rewardLabel:e.rewardLabel?.trim()||"R\xe9compense",name:e.name?.trim()||"",rewardKind:"DISCOUNT"===e.rewardKind?"DISCOUNT":"PERCENTAGE"===e.rewardKind?"PERCENTAGE":"FREE_SERVICE",rewardValue:null!=e.rewardValue?parseFloat(e.rewardValue):null,rewardValidityDays:e.rewardValidityDays>0?e.rewardValidityDays:30,productsEligible:e.productsEligible,stackRewards:e.stackRewards,eligibleServiceIds:e.eligibleServiceIds??[],cardBackgroundUrl:e.cardBackgroundUrl}}let r=l("lprog");return await a.query(`INSERT INTO "LoyaltyProgram" (
      id, "organizationId", "madPerPoint", "bronzeMin", "silverMin", "goldMin", "vipMin", active, "visitsPerReward", "rewardLabel", "updatedAt"
    ) VALUES ($1,$2,1,0,1000,3000,6000,true,5,'R\xe9compense',NOW())
    ON CONFLICT ("organizationId") DO NOTHING`,[r,e]),m(e,t)}async function E(e,t,a,i=null){await m(e),await v.query(`UPDATE "LoyaltyProgram"
     SET "cardBackgroundUrl" = $2, "cardBackgroundColor" = $3, "updatedAt" = NOW()
     WHERE "organizationId" = $1`,[e,t,t?i:null]);let r=await m(e);return await (0,o.writeAuditLog)({organizationId:e,actorId:a.id,actorName:a.name,entityType:"LoyaltyProgram",entityId:r.id,action:"UPDATE",before:null,after:{cardBackgroundUrl:r.cardBackgroundUrl}}),r}async function p(e,t,a){let i=await m(e),r=t.visitsPerReward??t.visitsRequired??null,n=t.rewardLabel??t.rewardName??null;await v.query(`UPDATE "LoyaltyProgram" SET
      "madPerPoint" = COALESCE($1, "madPerPoint"),
      "bronzeMin" = COALESCE($2, "bronzeMin"),
      "silverMin" = COALESCE($3, "silverMin"),
      "goldMin" = COALESCE($4, "goldMin"),
      "vipMin" = COALESCE($5, "vipMin"),
      active = COALESCE($6, active),
      "visitsPerReward" = COALESCE($7, "visitsPerReward"),
      "rewardLabel" = COALESCE($8, "rewardLabel"),
      name = COALESCE($9, name),
      "rewardKind" = COALESCE($10, "rewardKind"),
      "rewardValue" = COALESCE($11, "rewardValue"),
      "rewardValidityDays" = COALESCE($12, "rewardValidityDays"),
      "productsEligible" = COALESCE($13, "productsEligible"),
      "stackRewards" = COALESCE($14, "stackRewards"),
      "eligibleServiceIds" = COALESCE($15, "eligibleServiceIds"),
      "updatedAt" = NOW()
     WHERE "organizationId" = $16`,[t.madPerPoint??null,t.bronzeMin??null,t.silverMin??null,t.goldMin??null,t.vipMin??null,t.active??null,r,n,t.name??null,t.rewardKind??null,t.rewardValue??null,t.rewardValidityDays??null,t.productsEligible??null,t.stackRewards??null,t.eligibleServiceIds??null,e]);let s=await m(e);return await (0,o.writeAuditLog)({organizationId:e,actorId:a.id,actorName:a.name,entityType:"LoyaltyProgram",entityId:s.id,action:"UPDATE",before:i,after:s}),s}async function I(e,t,a){let i=await a.query(`SELECT id, balance, "lifetimePoints", level::text
     FROM "LoyaltyAccount"
     WHERE "organizationId" = $1 AND "customerId" = $2
     FOR UPDATE`,[e,t]);if(i.rows[0])return{id:i.rows[0].id,balance:i.rows[0].balance,lifetimePoints:i.rows[0].lifetimePoints,level:i.rows[0].level};let r=l("lacc");return await a.query(`INSERT INTO "LoyaltyAccount" (
      id, "organizationId", "customerId", balance, "lifetimePoints", level, "updatedAt"
    ) VALUES ($1,$2,$3,0,0,'BRONZE'::"LoyaltyLevel",NOW())`,[r,e,t]),{id:r,balance:0,lifetimePoints:0,level:"BRONZE"}}async function y(e,t){let a=l("ltxn");return await e.query(`INSERT INTO "LoyaltyTransaction" (
      id, "organizationId", "accountId", "customerId", type, points, "balanceAfter",
      reason, "paymentId", "appointmentId", "rewardId", "redemptionId", "createdById", "idempotencyKey"
    ) VALUES (
      $1,$2,$3,$4,$5::"LoyaltyTxnType",$6,$7,$8,$9,$10,$11,$12,$13,$14
    )`,[a,t.organizationId,t.accountId,t.customerId,t.type,t.points,t.balanceAfter,t.reason??null,t.paymentId??null,t.appointmentId??null,t.rewardId??null,t.redemptionId??null,t.createdById??null,t.idempotencyKey]),await e.query(`UPDATE "LoyaltyAccount" SET
      balance = $1,
      "lifetimePoints" = $2,
      level = $3::"LoyaltyLevel",
      "updatedAt" = NOW()
     WHERE id = $4`,[t.balanceAfter,t.lifetimePoints,t.level,t.accountId]),a}async function A(e){if(e.amountMad<=0)return{points:0,skipped:!0};let t=`earn:payment:${e.paymentId}`,a=await v.connect();try{if(await a.query("BEGIN"),(await a.query(`SELECT 1 FROM "LoyaltyTransaction"
       WHERE "organizationId" = $1 AND "idempotencyKey" = $2`,[e.organizationId,t])).rows[0])return await a.query("COMMIT"),{points:0,skipped:!0};let i=await m(e.organizationId,a);if(!i.active)return await a.query("COMMIT"),{points:0,skipped:!0};let r=Math.floor(e.amountMad/i.madPerPoint);if(r<=0)return await a.query("COMMIT"),{points:0,skipped:!0};let n=await I(e.organizationId,e.customerId,a),o=n.balance+r,s=n.lifetimePoints+r,d=u(s,i);return await y(a,{organizationId:e.organizationId,accountId:n.id,customerId:e.customerId,type:"EARN",points:r,balanceAfter:o,lifetimePoints:s,level:d,reason:`Paiement ${e.amountMad} MAD`,paymentId:e.paymentId,appointmentId:e.appointmentId??null,createdById:e.userId??null,idempotencyKey:t}),await a.query("COMMIT"),{points:r,skipped:!1}}catch(e){if(await a.query("ROLLBACK"),c(e))return{points:0,skipped:!0};throw e}finally{a.release()}}async function w(e){if(e.refundAmount<=0||!e.customerId)return;let t=`refund:payment:${e.refundPaymentId}`,a=await v.connect();try{if(await a.query("BEGIN"),(await a.query(`SELECT 1 FROM "LoyaltyTransaction"
       WHERE "organizationId" = $1 AND "idempotencyKey" = $2`,[e.organizationId,t])).rows[0]){await a.query("COMMIT");return}let i=await m(e.organizationId,a),r=Math.floor(e.refundAmount/i.madPerPoint);if(r<=0){await a.query("COMMIT");return}let n=await I(e.organizationId,e.customerId,a),o=-Math.min(r,n.balance);if(0===o){await a.query("COMMIT");return}let s=n.balance+o,d=Math.max(0,n.lifetimePoints+o),l=u(d,i);await y(a,{organizationId:e.organizationId,accountId:n.id,customerId:e.customerId,type:"ADJUSTMENT",points:o,balanceAfter:s,lifetimePoints:d,level:l,reason:"Remboursement cliente",paymentId:e.refundPaymentId,createdById:e.userId??null,idempotencyKey:t}),await a.query("COMMIT")}catch(e){if(await a.query("ROLLBACK"),c(e))return;throw e}finally{a.release()}}async function N(e,t,a,i,r){let n=await v.connect();try{await n.query("BEGIN");let s=await m(e,n),d=await I(e,t,n),l=d.balance+a;if(l<0)throw Error("INSUFFICIENT_POINTS");let c=a>0?d.lifetimePoints+a:Math.max(0,d.lifetimePoints+a),E=u(c,s),p=`adj:${t}:${a}:${Date.now()}`;await y(n,{organizationId:e,accountId:d.id,customerId:t,type:"ADJUSTMENT",points:a,balanceAfter:l,lifetimePoints:c,level:E,reason:i,createdById:r.id,idempotencyKey:p}),await (0,o.writeAuditLog)({organizationId:e,actorId:r.id,actorName:r.name,entityType:"LoyaltyAccount",entityId:d.id,action:"ADJUSTMENT",before:{balance:d.balance},after:{balance:l,points:a,reason:i},client:n}),await n.query("COMMIT")}catch(e){throw await n.query("ROLLBACK"),e}finally{n.release()}let s=await T(e,t);if(!s.account)throw Error("NOT_FOUND");return s.account}async function R(e,t,a){let i=t.idempotencyKey??`redeem:${t.customerId}:${t.rewardId}:${Date.now()}`,r=await v.connect();try{await r.query("BEGIN");let n=await r.query(`SELECT id, "pointsSpent" FROM "LoyaltyRedemption"
       WHERE "organizationId" = $1 AND "idempotencyKey" = $2`,[e,i]);if(n.rows[0])return await r.query("COMMIT"),{redemptionId:n.rows[0].id,pointsSpent:n.rows[0].pointsSpent};let s=await r.query(`SELECT id, "pointsCost", active, "maxRedemptions", "redemptionCount", name
       FROM "LoyaltyReward"
       WHERE id = $1 AND "organizationId" = $2
       FOR UPDATE`,[t.rewardId,e]);if(!s.rows[0])throw Error("REWARD_NOT_FOUND");if(!s.rows[0].active)throw Error("REWARD_INACTIVE");if(null!=s.rows[0].maxRedemptions&&s.rows[0].redemptionCount>=s.rows[0].maxRedemptions)throw Error("REWARD_EXHAUSTED");let d=await m(e,r),c=await I(e,t.customerId,r);if(c.balance<s.rows[0].pointsCost)throw Error("INSUFFICIENT_POINTS");let E=l("lred"),p=s.rows[0].pointsCost,A=c.balance-p,w=u(c.lifetimePoints,d);return await r.query(`INSERT INTO "LoyaltyRedemption" (
        id, "organizationId", "accountId", "customerId", "rewardId",
        "pointsSpent", status, "appointmentId", "idempotencyKey", "createdById"
      ) VALUES (
        $1,$2,$3,$4,$5,$6,'APPLIED'::"LoyaltyRedemptionStatus",$7,$8,$9
      )`,[E,e,c.id,t.customerId,t.rewardId,p,t.appointmentId??null,i,a.id]),await y(r,{organizationId:e,accountId:c.id,customerId:t.customerId,type:"REDEEM",points:-p,balanceAfter:A,lifetimePoints:c.lifetimePoints,level:w,reason:`R\xe9compense : ${s.rows[0].name}`,rewardId:t.rewardId,redemptionId:E,appointmentId:t.appointmentId??null,createdById:a.id,idempotencyKey:`redeem-txn:${E}`}),await r.query(`UPDATE "LoyaltyReward"
       SET "redemptionCount" = "redemptionCount" + 1, "updatedAt" = NOW()
       WHERE id = $1`,[t.rewardId]),await (0,o.writeAuditLog)({organizationId:e,actorId:a.id,actorName:a.name,entityType:"LoyaltyRedemption",entityId:E,action:"REDEEM",after:{rewardId:t.rewardId,pointsSpent:p},client:r}),await r.query("COMMIT"),{redemptionId:E,pointsSpent:p}}catch(t){if(await r.query("ROLLBACK"),c(t)){let t=await v.query(`SELECT id, "pointsSpent" FROM "LoyaltyRedemption"
         WHERE "organizationId" = $1 AND "idempotencyKey" = $2`,[e,i]);if(t.rows[0])return{redemptionId:t.rows[0].id,pointsSpent:t.rows[0].pointsSpent}}throw t}finally{r.release()}}let f={BRONZE:0,SILVER:0,GOLD:0,VIP:0};async function S(e,t=200){let a=await m(e),[i,r,n,o,s,d]=await Promise.all([v.query(`SELECT
         (SELECT COUNT(*)::int FROM "LoyaltyAccount" WHERE "organizationId" = $1) AS "membersCount",
         (SELECT COUNT(*)::int FROM "LoyaltyAccount"
           WHERE "organizationId" = $1
             AND "createdAt" >= date_trunc('month', timezone('Africa/Casablanca', now()))) AS "membersThisMonth",
         COALESCE((SELECT SUM(points) FROM "LoyaltyTransaction" WHERE "organizationId" = $1 AND type = 'EARN'), 0)::text AS "pointsDistributed",
         COALESCE((SELECT SUM(ABS(points)) FROM "LoyaltyTransaction" WHERE "organizationId" = $1 AND type = 'REDEEM'), 0)::text AS "pointsRedeemed",
         COALESCE((SELECT SUM(balance) FROM "LoyaltyAccount" WHERE "organizationId" = $1), 0)::text AS "pointsActive",
         (SELECT COUNT(*)::int FROM "LoyaltyRedemption" WHERE "organizationId" = $1 AND status = 'APPLIED') AS "rewardsUsed",
         (
           SELECT COUNT(*)::int FROM "LoyaltyAccount" la
           WHERE la."organizationId" = $1
             AND la.balance >= COALESCE(
               (SELECT MIN("pointsCost") FROM "LoyaltyReward" WHERE "organizationId" = $1 AND active = true),
               2147483647
             )
         ) AS "rewardsReady",
         (SELECT COUNT(DISTINCT "customerId")::int FROM "LoyaltyTransaction"
           WHERE "organizationId" = $1 AND "createdAt" >= NOW() - INTERVAL '30 days') AS "active30d",
         COALESCE((
           SELECT SUM(a.price) FROM "Appointment" a
           JOIN "LoyaltyAccount" la ON la."customerId" = a."customerId" AND la."organizationId" = a."organizationId"
           WHERE a."organizationId" = $1 AND a.status = 'COMPLETED'
             AND a."startAt" >= date_trunc('month', timezone('Africa/Casablanca', now()))
             AND la."lifetimePoints" > 0
         ), 0)::text AS "memberRevenue",
         COALESCE((
           SELECT AVG(a.price) FROM "Appointment" a
           JOIN "LoyaltyAccount" la ON la."customerId" = a."customerId" AND la."organizationId" = a."organizationId"
           WHERE a."organizationId" = $1 AND a.status = 'COMPLETED'
             AND a."startAt" >= date_trunc('month', timezone('Africa/Casablanca', now()))
             AND la."lifetimePoints" > 0
         ), 0)::text AS "memberAvgTicket",
         (SELECT COUNT(*)::int FROM "Package" WHERE "organizationId" = $1 AND status = 'ACTIVE') AS "activePackages"`,[e]),v.query(`SELECT level::text, COUNT(*)::int AS n
       FROM "LoyaltyAccount"
       WHERE "organizationId" = $1
       GROUP BY level`,[e]),v.query(`SELECT la.id, la."customerId", c."firstName", c."lastName", c.phone, c."birthDate",
              la."createdAt", la.balance, la."lifetimePoints", la.level::text, la."updatedAt",
              last_apt."startAt" AS "lastVisitAt",
              last_apt."serviceName" AS "lastServiceName",
              last_apt.price::text AS "lastServicePrice"
       FROM "LoyaltyAccount" la
       JOIN "Customer" c ON c.id = la."customerId"
       LEFT JOIN LATERAL (
         SELECT a."startAt", s.name AS "serviceName", a.price
         FROM "Appointment" a
         JOIN "Service" s ON s.id = a."serviceId"
         WHERE a."customerId" = c.id AND a."organizationId" = $1 AND a.status = 'COMPLETED'
         ORDER BY a."startAt" DESC
         LIMIT 1
       ) last_apt ON true
       WHERE la."organizationId" = $1 AND c."deletedAt" IS NULL
       ORDER BY la."lifetimePoints" DESC, la.balance DESC
       LIMIT $2`,[e,t]),v.query(`SELECT lt.id, lt.type::text, lt.points, lt."balanceAfter", lt.reason, lt."paymentId",
              lt."createdAt", lt."customerId", c."firstName", c."lastName",
              NULLIF(TRIM(COALESCE(u."firstName", '') || ' ' || COALESCE(u."lastName", '')), '') AS "operatorName"
       FROM "LoyaltyTransaction" lt
       JOIN "Customer" c ON c.id = lt."customerId"
       LEFT JOIN "User" u ON u.id = lt."createdById"
       WHERE lt."organizationId" = $1
       ORDER BY lt."createdAt" DESC
       LIMIT 12`,[e]),v.query(`SELECT la."customerId", c."firstName", c."lastName", c.phone, c."birthDate",
              la.balance, la.level::text
       FROM "LoyaltyAccount" la
       JOIN "Customer" c ON c.id = la."customerId"
       WHERE la."organizationId" = $1 AND c."deletedAt" IS NULL
         AND c."birthDate" IS NOT NULL
         AND EXTRACT(MONTH FROM c."birthDate") = EXTRACT(MONTH FROM timezone('Africa/Casablanca', now()))
       ORDER BY EXTRACT(DAY FROM c."birthDate") ASC`,[e]),C(e,!1)]),l={...f};for(let e of r.rows){let t=e.level;t in l&&(l[t]=e.n)}let c=i.rows[0];return{program:a,kpis:{membersCount:c?.membersCount??0,membersThisMonth:c?.membersThisMonth??0,pointsDistributed:parseInt(c?.pointsDistributed??"0",10)||0,pointsRedeemed:parseInt(c?.pointsRedeemed??"0",10)||0,pointsActive:parseInt(c?.pointsActive??"0",10)||0,rewardsUsed:c?.rewardsUsed??0,rewardsReady:c?.rewardsReady??0,active30d:c?.active30d??0,memberRevenue:parseFloat(c?.memberRevenue??"0")||0,memberAvgTicket:Math.round(100*(parseFloat(c?.memberAvgTicket??"0")||0))/100,activePackages:c?.activePackages??0,levelCounts:l},ranking:n.rows.map(e=>({id:e.id,customerId:e.customerId,customerName:`${e.firstName} ${e.lastName}`.trim(),balance:e.balance,lifetimePoints:e.lifetimePoints,level:e.level,updatedAt:new Date(e.updatedAt).toISOString(),phone:e.phone,birthDate:e.birthDate?new Date(e.birthDate).toISOString():null,memberSince:new Date(e.createdAt).toISOString(),lastVisitAt:e.lastVisitAt?new Date(e.lastVisitAt).toISOString():null,lastServiceName:e.lastServiceName,lastServicePrice:null!=e.lastServicePrice?parseFloat(e.lastServicePrice):null})),rewards:d,journal:o.rows.map(e=>({id:e.id,type:e.type,points:e.points,balanceAfter:e.balanceAfter,reason:e.reason,paymentId:e.paymentId,createdAt:new Date(e.createdAt).toISOString(),customerId:e.customerId,customerName:`${e.firstName} ${e.lastName}`.trim(),operatorName:e.operatorName})),birthdays:s.rows.map(e=>({customerId:e.customerId,customerName:`${e.firstName} ${e.lastName}`.trim(),phone:e.phone,birthDate:new Date(e.birthDate).toISOString(),balance:e.balance,level:e.level}))}}async function T(e,t){let a=await m(e),i=await v.query(`SELECT la.id, la."customerId", c."firstName", c."lastName",
            la.balance, la."lifetimePoints", la.level::text, la."updatedAt"
     FROM "LoyaltyAccount" la
     JOIN "Customer" c ON c.id = la."customerId"
     WHERE la."organizationId" = $1 AND la."customerId" = $2`,[e,t]),r=i.rows[0]?{id:i.rows[0].id,customerId:i.rows[0].customerId,customerName:`${i.rows[0].firstName} ${i.rows[0].lastName}`.trim(),balance:i.rows[0].balance,lifetimePoints:i.rows[0].lifetimePoints,level:i.rows[0].level,updatedAt:new Date(i.rows[0].updatedAt).toISOString()}:null,n=r?.balance??0,[o,d,l,c]=await Promise.all([v.query(`SELECT COALESCE(SUM(points), 0)::text AS t FROM "LoyaltyTransaction"
       WHERE "organizationId" = $1 AND "customerId" = $2 AND type = 'EARN'
         AND "createdAt" >= date_trunc('day', NOW())`,[e,t]),v.query(`SELECT id, type::text, points, "balanceAfter", reason, "paymentId", "createdAt"
       FROM "LoyaltyTransaction"
       WHERE "organizationId" = $1 AND "customerId" = $2
       ORDER BY "createdAt" DESC LIMIT 20`,[e,t]),C(e,!0),v.query(`SELECT "publicToken" FROM "LoyaltyCard"
       WHERE "organizationId" = $1 AND "customerId" = $2 AND status = 'ACTIVE'
       ORDER BY "createdAt" DESC
       LIMIT 1`,[e,t])]),u=l.filter(e=>e.active).sort((e,t)=>e.pointsCost-t.pointsCost),E=u.filter(e=>e.pointsCost<=n),p=u.find(e=>e.pointsCost>n)??null,I=c.rows[0]?.publicToken??null;return{account:r,cardCode:I?(0,s.J)(I):null,todayEarned:parseInt(o.rows[0]?.t??"0",10)||0,nextReward:p,pointsToNextReward:p?p.pointsCost-n:null,recentTxns:d.rows.map(e=>({id:e.id,type:e.type,points:e.points,balanceAfter:e.balanceAfter,reason:e.reason,paymentId:e.paymentId,createdAt:new Date(e.createdAt).toISOString()})),program:a,redeemableRewards:E}}async function C(e,t=!1){let{rows:a}=await v.query(`SELECT id, name, description, "pointsCost", type::text, value::text, "serviceId",
            active, "maxRedemptions", "redemptionCount"
     FROM "LoyaltyReward"
     WHERE "organizationId" = $1 ${t?"AND active = true":""}
     ORDER BY "pointsCost" ASC`,[e]);return a.map(e=>({id:e.id,name:e.name,description:e.description,pointsCost:e.pointsCost,type:e.type,value:null!=e.value?parseFloat(e.value):null,serviceId:e.serviceId,active:e.active,maxRedemptions:e.maxRedemptions,redemptionCount:e.redemptionCount}))}async function O(e,t,a){let i=l("lrwd");return await v.query(`INSERT INTO "LoyaltyReward" (
      id, "organizationId", name, description, "pointsCost", type, value, "serviceId",
      active, "maxRedemptions", "redemptionCount", "updatedAt"
    ) VALUES ($1,$2,$3,$4,$5,$6::"LoyaltyRewardType",$7,$8,true,$9,0,NOW())`,[i,e,t.name,t.description??null,t.pointsCost,t.type,t.value??null,t.serviceId??null,t.maxRedemptions??null]),await (0,o.writeAuditLog)({organizationId:e,actorId:a.id,actorName:a.name,entityType:"LoyaltyReward",entityId:i,action:"CREATE",after:t}),(await C(e)).find(e=>e.id===i)}async function L(e,t,a){let i=l("pkg"),r=l("pki"),n=await v.connect();try{await n.query("BEGIN"),await n.query(`INSERT INTO "Package" (
        id, "organizationId", "customerId", name, "serviceId",
        "sessionTotal", "sessionUsed", "pricePaid", status,
        "expiresAt", notes, "createdById", "updatedAt"
      ) VALUES (
        $1,$2,$3,$4,$5,$6,0,$7,'ACTIVE'::"PackageStatus",$8,$9,$10,NOW()
      )`,[i,e,t.customerId,t.name,t.serviceId,t.sessionTotal,t.pricePaid,t.expiresAt?new Date(t.expiresAt):null,t.notes??null,a.id]),await n.query(`INSERT INTO "PackageItem" (id, "packageId", "serviceId", "sessionTotal", "sessionUsed")
       VALUES ($1,$2,$3,$4,0)`,[r,i,t.serviceId,t.sessionTotal]),await (0,o.writeAuditLog)({organizationId:e,actorId:a.id,actorName:a.name,entityType:"Package",entityId:i,action:"CREATE",after:t,client:n}),await n.query("COMMIT")}catch(e){throw await n.query("ROLLBACK"),e}finally{n.release()}let s=await D(e,i);if(!s)throw Error("NOT_FOUND");return s}function $(e){let t=Number(e.sessionTotal)||0,a=Number(e.sessionUsed)||0;return{id:String(e.id),customerId:String(e.customerId),customerName:`${e.firstName??""} ${e.lastName??""}`.trim(),name:String(e.name),serviceId:e.serviceId??null,serviceName:e.serviceName??null,sessionTotal:t,sessionUsed:a,sessionRemaining:Math.max(0,t-a),pricePaid:parseFloat(String(e.pricePaid))||0,status:e.status,purchasedAt:new Date(e.purchasedAt).toISOString(),expiresAt:e.expiresAt?new Date(e.expiresAt).toISOString():null}}async function g(e,t){let a=['p."organizationId" = $1'],i=[e],r=2;t?.customerId&&(a.push(`p."customerId" = $${r}`),i.push(t.customerId),r++),t?.status&&(a.push(`p.status = $${r}::"PackageStatus"`),i.push(t.status),r++);let{rows:n}=await v.query(`SELECT p.id, p."customerId", p.name, p."serviceId", p."sessionTotal", p."sessionUsed",
            p."pricePaid"::text, p.status::text, p."purchasedAt", p."expiresAt",
            c."firstName", c."lastName", s.name AS "serviceName"
     FROM "Package" p
     JOIN "Customer" c ON c.id = p."customerId"
     LEFT JOIN "Service" s ON s.id = p."serviceId"
     WHERE ${a.join(" AND ")}
     ORDER BY p."purchasedAt" DESC`,i);return n.map(e=>$(e))}async function D(e,t){let{rows:a}=await v.query(`SELECT p.id, p."customerId", p.name, p."serviceId", p."sessionTotal", p."sessionUsed",
            p."pricePaid"::text, p.status::text, p."purchasedAt", p."expiresAt",
            c."firstName", c."lastName", s.name AS "serviceName"
     FROM "Package" p
     JOIN "Customer" c ON c.id = p."customerId"
     LEFT JOIN "Service" s ON s.id = p."serviceId"
     WHERE p.id = $1 AND p."organizationId" = $2`,[t,e]);return a[0]?$(a[0]):null}async function M(e){let t=`apt:${e.appointmentId}:package`,a=await v.connect();try{if(await a.query("BEGIN"),(await a.query(`SELECT 1 FROM "PackageSession"
       WHERE "organizationId" = $1 AND "idempotencyKey" = $2`,[e.organizationId,t])).rows[0])return await a.query("COMMIT"),{consumed:!1};let i=await a.query(`SELECT id, "sessionUsed", "sessionTotal"
       FROM "Package"
       WHERE "organizationId" = $1 AND "customerId" = $2 AND "serviceId" = $3
         AND status = 'ACTIVE'::"PackageStatus"
         AND "sessionUsed" < "sessionTotal"
         AND ("expiresAt" IS NULL OR "expiresAt" > NOW())
       ORDER BY "purchasedAt" ASC
       LIMIT 1
       FOR UPDATE`,[e.organizationId,e.customerId,e.serviceId]);if(!i.rows[0])return await a.query("COMMIT"),{consumed:!1};let r=i.rows[0].id,n=i.rows[0].sessionUsed+1,o=n>=i.rows[0].sessionTotal;return await a.query(`INSERT INTO "PackageSession" (
        id, "organizationId", "packageId", "appointmentId", "idempotencyKey"
      ) VALUES ($1,$2,$3,$4,$5)`,[l("pks"),e.organizationId,r,e.appointmentId,t]),await a.query(`UPDATE "Package" SET
        "sessionUsed" = $1,
        status = CASE WHEN $2 THEN 'EXHAUSTED'::"PackageStatus" ELSE status END,
        "updatedAt" = NOW()
       WHERE id = $3`,[n,o,r]),await a.query(`UPDATE "PackageItem" SET "sessionUsed" = "sessionUsed" + 1
       WHERE "packageId" = $1 AND "serviceId" = $2 AND "sessionUsed" < "sessionTotal"`,[r,e.serviceId]),await a.query("COMMIT"),{consumed:!0,packageId:r}}catch(e){if(await a.query("ROLLBACK"),c(e))return{consumed:!1};throw e}finally{a.release()}}i()}catch(e){i(e)}})},68887:(e,t,a)=>{function i(e,t){return!t||t<=0?0:(e%t+t)%t}function r(e){let t=e.trim().toUpperCase();return(t.startsWith("RBLOY_")?t.slice(6):t.replace(/[^A-Z2-9]/g,"")).slice(-4)}a.d(t,{J:()=>r,i:()=>i})}};