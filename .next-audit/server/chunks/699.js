"use strict";!function(){try{var t="undefined"!=typeof window?window:"undefined"!=typeof global?global:"undefined"!=typeof self?self:{},e=(new t.Error).stack;e&&(t._sentryDebugIds=t._sentryDebugIds||{},t._sentryDebugIds[e]="2fb5e149-6730-4345-ad09-cdcf423751fa",t._sentryDebugIdIdentifier="sentry-dbid-2fb5e149-6730-4345-ad09-cdcf423751fa")}catch(t){}}(),exports.id=699,exports.ids=[699],exports.modules={90699:(t,e,a)=>{a.a(t,async(t,s)=>{try{a.d(e,{Fs:()=>y,Vr:()=>N,WF:()=>m,h2:()=>O,n$:()=>A,sB:()=>C,syncReactivationWhatsAppTasks:()=>R});var n=a(84770),i=a(8678),o=a(90831),r=a(66085),c=a(34239),d=t([i,r,c]);[i,r,c]=d.then?(await d)():d;let g=(0,o.S)(new i.Pool({connectionString:process.env.DATABASE_URL}));function u(t){return`${t}_${(0,n.randomBytes)(8).toString("hex")}`}let C=["REACTIVATION","PROMOTION","BIRTHDAY","LOYALTY_REWARD","PACKAGE_EXPIRING","POST_VISIT"];function p(t,e){return"AT_RISK"===e&&t>=60?"AT_RISK":t<30?"ACTIVE":t<45?"DAYS_30":t<60?"DAYS_45":t<90?"DAYS_60":"DAYS_90"}function S(t){return{minimumDaysBetweenMarketingMessages:Number(t.minimumDaysBetweenMarketingMessages)||30,threshold30Enabled:!!t.threshold30Enabled,threshold45Enabled:!!t.threshold45Enabled,threshold60Enabled:!!t.threshold60Enabled,threshold90Enabled:!!t.threshold90Enabled,autoCreateWhatsAppTasks:!!t.autoCreateWhatsAppTasks,promoCode30:t.promoCode30??null,promoCode45:t.promoCode45??null,promoCode60:t.promoCode60??null,promoCode90:t.promoCode90??null,promoDiscount30:t.promoDiscount30??null,promoDiscount45:t.promoDiscount45??null,promoDiscount60:t.promoDiscount60??null,promoDiscount90:t.promoDiscount90??null}}function l(t,e){switch(t){case"DAYS_30":return{code:e.promoCode30,discount:e.promoDiscount30};case"DAYS_45":return{code:e.promoCode45,discount:e.promoDiscount45};case"DAYS_60":return{code:e.promoCode60,discount:e.promoDiscount60};case"DAYS_90":case"AT_RISK":return{code:e.promoCode90,discount:e.promoDiscount90};default:return{code:null,discount:null}}}let h=`
  WITH completed AS (
    SELECT
      a."customerId",
      a."startAt",
      a.price,
      s.name AS "serviceName",
      NULLIF(TRIM(CONCAT(COALESCE(st."firstName", ''), ' ', COALESCE(st."lastName", ''))), '') AS "staffName",
      ROW_NUMBER() OVER (PARTITION BY a."customerId" ORDER BY a."startAt" DESC) AS rn
    FROM "Appointment" a
    JOIN "Service" s ON s.id = a."serviceId"
    LEFT JOIN "Staff" st ON st.id = a."staffId"
    WHERE a."organizationId" = $1 AND a.status = 'COMPLETED'
  ),
  last_visit AS (
    SELECT
      c."customerId",
      c."startAt" AS "lastVisitAt",
      c."serviceName" AS "lastServiceName",
      c.price AS "lastServicePrice",
      c."staffName" AS "lastStaffName"
    FROM completed c
    WHERE c.rn = 1
  ),
  customer_stats AS (
    SELECT
      cu.id,
      cu."firstName",
      cu."lastName",
      cu.phone,
      cu.status::text AS status,
      cu."marketingWhatsapp",
      lv."lastVisitAt",
      lv."lastServiceName",
      lv."lastServicePrice",
      lv."lastStaffName",
      GREATEST(0, EXTRACT(DAY FROM NOW() - lv."lastVisitAt")::int) AS "daysSince",
      COUNT(a.id)::int AS visits,
      COALESCE(SUM(CASE WHEN a.status = 'COMPLETED' THEN a.price ELSE 0 END), 0)::float AS revenue
    FROM "Customer" cu
    JOIN last_visit lv ON lv."customerId" = cu.id
    LEFT JOIN "Appointment" a ON a."customerId" = cu.id
    WHERE cu."organizationId" = $1
      AND cu."deletedAt" IS NULL
    GROUP BY cu.id, cu."firstName", cu."lastName", cu.phone, cu.status,
             cu."marketingWhatsapp", lv."lastVisitAt", lv."lastServiceName", lv."lastServicePrice", lv."lastStaffName"
  ),
  last_marketing AS (
    SELECT DISTINCT ON (t."customerId")
      t."customerId",
      t."sentAt"
    FROM "WhatsAppTask" t
    WHERE t."organizationId" = $1
      AND t.type::text = ANY($2::text[])
      AND t.status = 'SENT'::"WhatsAppTaskStatus"
      AND t."sentAt" IS NOT NULL
    ORDER BY t."customerId", t."sentAt" DESC
  ),
  upcoming AS (
    SELECT DISTINCT a."customerId"
    FROM "Appointment" a
    WHERE a."organizationId" = $1
      AND a.status IN ('PENDING','CONFIRMED')
      AND a."startAt" >= NOW()
  ),
  snoozed AS (
    SELECT DISTINCT ON (s."customerId")
      s."customerId",
      s."snoozedUntil"
    FROM "ReactivationSnooze" s
    WHERE s."organizationId" = $1
      AND s."snoozedUntil" > NOW()
    ORDER BY s."customerId", s."snoozedUntil" DESC
  ),
  pending_wa AS (
    SELECT DISTINCT ON (t."customerId")
      t."customerId",
      t.id AS "taskId"
    FROM "WhatsAppTask" t
    WHERE t."organizationId" = $1
      AND t.type = 'REACTIVATION'::"WhatsAppTaskType"
      AND t.status = 'PENDING'::"WhatsAppTaskStatus"
    ORDER BY t."customerId", t."createdAt" DESC
  )
`;async function m(t){let{rows:e}=await g.query('SELECT * FROM "ReactivationSettings" WHERE "organizationId" = $1',[t]);if(e[0])return S(e[0]);let a=u("rset");await g.query(`INSERT INTO "ReactivationSettings" (
      id, "organizationId", "promoCode45", "promoCode60", "promoCode90", "updatedAt"
    ) VALUES ($1,$2,'RETOUR10','RETOUR15','RETOUR20',NOW())`,[a,t]);let s=await g.query('SELECT * FROM "ReactivationSettings" WHERE "organizationId" = $1',[t]);return S(s.rows[0])}async function A(t,e,a){await m(t);let s=['"updatedAt" = NOW()'],n=[t],i=2;for(let t of["minimumDaysBetweenMarketingMessages","threshold30Enabled","threshold45Enabled","threshold60Enabled","threshold90Enabled","autoCreateWhatsAppTasks","promoCode30","promoCode45","promoCode60","promoCode90","promoDiscount30","promoDiscount45","promoDiscount60","promoDiscount90"])void 0!==e[t]&&(s.push(`"${t}" = $${i}`),n.push(e[t]),i++);return await g.query(`UPDATE "ReactivationSettings" SET ${s.join(", ")} WHERE "organizationId" = $1`,n),await (0,r.writeAuditLog)({organizationId:t,entityType:"ReactivationSettings",entityId:t,action:"UPDATE",actorId:a.id,actorName:a.name,after:e}),m(t)}async function E(t){let[e,a]=await Promise.all([g.query(`${h}
       SELECT
         COUNT(*) FILTER (WHERE cs."daysSince" >= 30 AND NOT (sn."customerId" IS NOT NULL))::int AS "toRelance",
         COUNT(*) FILTER (WHERE cs."daysSince" >= 30 AND cs."daysSince" < 45)::int AS "days30",
         COUNT(*) FILTER (WHERE cs."daysSince" >= 45 AND cs."daysSince" < 60)::int AS "days45",
         COUNT(*) FILTER (WHERE cs."daysSince" >= 60 AND cs."daysSince" < 90)::int AS "days60",
         COUNT(*) FILTER (WHERE cs."daysSince" >= 90)::int AS "days90",
         COUNT(*) FILTER (WHERE cs."daysSince" >= 180)::int AS "days180",
         COUNT(*) FILTER (WHERE cs."daysSince" >= 30)::int AS "inactiveCount",
         COUNT(*) FILTER (WHERE cs."daysSince" >= 30 AND lm."sentAt" IS NOT NULL)::int AS "contactedCount",
         COUNT(*) FILTER (WHERE cs."daysSince" >= 30 AND pw."taskId" IS NOT NULL)::int AS "pendingCount",
         COUNT(*) FILTER (WHERE cs."daysSince" >= 30 AND up."customerId" IS NOT NULL)::int AS "upcomingCount",
         COUNT(*) FILTER (WHERE cs."daysSince" >= 30 AND cs.status = 'VIP')::int AS "vipInactiveCount",
         COUNT(*) FILTER (WHERE cs."daysSince" >= 30 AND cs.revenue >= 3000)::int AS "highSpenderCount",
         COUNT(*) FILTER (WHERE cs."daysSince" >= 30 AND cs.visits = 1)::int AS "firstVisitCount",
         COALESCE(SUM(
           CASE WHEN cs."daysSince" >= 30 AND NOT (sn."customerId" IS NOT NULL)
           THEN CASE WHEN cs.visits > 0 THEN cs.revenue / cs.visits ELSE COALESCE(cs."lastServicePrice"::float, 0) END
           ELSE 0 END
         ), 0)::text AS "estimatedRevenue"
       FROM customer_stats cs
       LEFT JOIN snoozed sn ON sn."customerId" = cs.id
       LEFT JOIN last_marketing lm ON lm."customerId" = cs.id
       LEFT JOIN upcoming up ON up."customerId" = cs.id
       LEFT JOIN pending_wa pw ON pw."customerId" = cs.id`,[t,C]),g.query(`SELECT
         COUNT(DISTINCT a."customerId")::int AS returned,
         COALESCE(SUM(a.price), 0)::text AS recovered
       FROM "WhatsAppTask" t
       JOIN "Appointment" a
         ON a."customerId" = t."customerId"
        AND a."organizationId" = t."organizationId"
        AND a.status = 'COMPLETED'
        AND a."startAt" > t."sentAt"
       WHERE t."organizationId" = $1
         AND t.type = 'REACTIVATION'::"WhatsAppTaskType"
         AND t.status = 'SENT'::"WhatsAppTaskStatus"
         AND t."sentAt" IS NOT NULL`,[t])]),s=e.rows[0],n=a.rows[0],i=s?.contactedCount??0,o=n?.returned??0;return{toRelance:s?.toRelance??0,days30:s?.days30??0,days45:s?.days45??0,days60:s?.days60??0,days90:s?.days90??0,days180:s?.days180??0,estimatedRevenue:Math.round(100*(parseFloat(s?.estimatedRevenue??"0")||0))/100,inactiveCount:s?.inactiveCount??0,contactedCount:i,pendingCount:s?.pendingCount??0,upcomingCount:s?.upcomingCount??0,returnedCount:o,recoveredRevenue:Math.round(100*(parseFloat(n?.recovered??"0")||0))/100,conversionPct:i>0?Math.round(o/i*1e3)/10:null,vipInactiveCount:s?.vipInactiveCount??0,highSpenderCount:s?.highSpenderCount??0,firstVisitCount:s?.firstVisitCount??0}}async function N(t,e){var a;let s=await m(t),n=e.bucket&&(a=e.bucket)?"ACTIVE"===a?' AND cs."daysSince" < 30':"AT_RISK"===a?" AND (cs.status = 'AT_RISK' OR cs.\"daysSince\" >= 90)":"DAYS_30"===a?' AND cs."daysSince" >= 30 AND cs."daysSince" < 45':"DAYS_45"===a?' AND cs."daysSince" >= 45 AND cs."daysSince" < 60':"DAYS_60"===a?' AND cs."daysSince" >= 60 AND cs."daysSince" < 90':"DAYS_90"===a?' AND cs."daysSince" >= 90':' AND cs."daysSince" < 30':"",i=!1!==e.relanceOnly?' AND cs."daysSince" >= 30':"",{rows:o}=await g.query(`${h}
     SELECT
       cs.id,
       cs."firstName",
       cs."lastName",
       cs.phone,
       cs.status,
       cs."marketingWhatsapp",
       cs."lastVisitAt",
       cs."lastServiceName",
       cs."lastStaffName",
       cs."lastServicePrice",
       cs."daysSince",
       cs.visits,
       cs.revenue,
       lm."sentAt" AS "lastMarketingSentAt",
       (up."customerId" IS NOT NULL) AS "hasUpcoming",
       (sn."customerId" IS NOT NULL) AS "isSnoozed",
       pw."taskId" AS "pendingTaskId"
     FROM customer_stats cs
     LEFT JOIN last_marketing lm ON lm."customerId" = cs.id
     LEFT JOIN upcoming up ON up."customerId" = cs.id
     LEFT JOIN snoozed sn ON sn."customerId" = cs.id
     LEFT JOIN pending_wa pw ON pw."customerId" = cs.id
     WHERE 1=1 ${i} ${n}
     ORDER BY cs."daysSince" DESC, cs.revenue DESC
     LIMIT 200`,[t,C]),r=await E(t);return{items:o.map(t=>(function(t,e){let a=Number(t.daysSince)||0,s=p(a,t.status),n=Number(t.visits)||0,i=Math.round(100*(Number(t.revenue)||0))/100,o=l(s,e),r=null;if(t.marketingWhatsapp){if(t.hasUpcoming)r="Rendez-vous \xe0 venir";else if(t.isSnoozed)r="Relance ignor\xe9e (snooze actif)";else if(t.lastMarketingSentAt){let a=(Date.now()-new Date(t.lastMarketingSentAt).getTime())/864e5;a<e.minimumDaysBetweenMarketingMessages&&(r=`Derni\xe8re relance il y a ${Math.floor(a)} j (min. ${e.minimumDaysBetweenMarketingMessages} j)`)}}else r="Opt-in WhatsApp marketing absent";let c=!r&&t.marketingWhatsapp&&!t.pendingTaskId;return{id:t.id,firstName:t.firstName,lastName:t.lastName,phone:t.phone,marketingWhatsapp:t.marketingWhatsapp,status:t.status,bucket:s,daysSinceLastVisit:a,lastVisitAt:new Date(t.lastVisitAt).toISOString(),lastServiceName:t.lastServiceName,lastStaffName:t.lastStaffName||null,lastServicePrice:null!=t.lastServicePrice?parseFloat(String(t.lastServicePrice)):null,averageTicket:n>0?Math.round(i/n*100)/100:0,totalRevenue:i,visits:n,lastMarketingSentAt:t.lastMarketingSentAt?new Date(t.lastMarketingSentAt).toISOString():null,hasUpcomingAppointment:t.hasUpcoming,isSnoozed:t.isSnoozed,canPrepareWhatsApp:c,blockReason:r,pendingWhatsAppTaskId:t.pendingTaskId,suggestedPromoCode:o.code,suggestedPromoDiscount:o.discount}})(t,s)),kpis:r,settings:s}}async function I(t){let{rows:e}=await g.query('SELECT name, phone, address FROM "Organization" WHERE id = $1',[t]);return e[0]??{name:"",phone:"",address:""}}async function T(t){let{rows:e}=await g.query(`SELECT id, body FROM "WhatsAppTemplate"
     WHERE "organizationId" = $1 AND type = 'REACTIVATION'::"WhatsAppTaskType" AND active = true
     ORDER BY "isDefault" DESC, "updatedAt" DESC LIMIT 1`,[t]);return e[0]??null}async function D(t,e){let a=await m(t),{rows:s}=await g.query(`${h}
     SELECT
       cs."firstName",
       cs."lastName",
       cs.phone,
       cs."lastVisitAt",
       cs."lastServiceName",
       cs."daysSince",
       cs.status
     FROM customer_stats cs
     WHERE cs.id = $3`,[t,C,e]),n=s[0];if(!n)return null;let i=p(Number(n.daysSince),n.status),o=l(i,a),r=await I(t),d=await T(t),u=new Date(n.lastVisitAt),S=d?.body??`Bonjour {{customer.firstName}} 🌸

Cela fait {{lastVisit.days}} jours que nous ne vous avons pas vue.
Votre dernier {{lastService.name}} remonte \xe0 {{lastVisit.date}}.

Nous serions ravis de vous revoir \xe0 {{organization.name}}.`;return{message:(0,c.O3)(S,{customer:{firstName:n.firstName,lastName:n.lastName},organization:{name:r.name,phone:r.phone??"",address:r.address??""},service:{name:n.lastServiceName??"",price:""},promotion:{code:o.code??"",discount:o.discount??""},lastVisit:{date:u.toLocaleDateString("fr-FR",{month:"long",year:"numeric"}),days:String(n.daysSince)},lastService:{name:n.lastServiceName??""}}),templateId:d?.id??null,phone:n.phone}}async function O(t,e,a){let s=await m(t),n=(await N(t,{relanceOnly:!1})).items.find(t=>t.id===e);if(!n)return{error:"Cliente introuvable."};if(n.daysSinceLastVisit<30)return{error:"Cliente encore active (< 30 j)."};if(!n.marketingWhatsapp)return{error:"Opt-in WhatsApp marketing requis."};if(n.hasUpcomingAppointment)return{error:"Rendez-vous \xe0 venir — pas de relance."};if(n.isSnoozed)return{error:"Relance en pause (ignor\xe9e)."};if(n.pendingWhatsAppTaskId){let a=await D(t,e);return a?{taskId:n.pendingWhatsAppTaskId,waLink:(0,c.FV)(a.phone,a.message),message:a.message}:{error:"Impossible de pr\xe9parer le message."}}if(n.lastMarketingSentAt&&(Date.now()-new Date(n.lastMarketingSentAt).getTime())/864e5<s.minimumDaysBetweenMarketingMessages)return{error:`Relance trop r\xe9cente (min. ${s.minimumDaysBetweenMarketingMessages} j).`};let i=await D(t,e);if(!i)return{error:"Impossible de pr\xe9parer le message."};let o=u("wtask"),d=new Date().toISOString().slice(0,7);await g.query(`INSERT INTO "WhatsAppTask" (
      id, "organizationId", "customerId", "templateId", type, status,
      "messageSnapshot", "phoneSnapshot", "scheduledFor", "idempotencyKey", "updatedAt"
    ) VALUES (
      $1,$2,$3,$4,'REACTIVATION'::"WhatsAppTaskType",'PENDING'::"WhatsAppTaskStatus",
      $5,$6,NOW(),$7,NOW()
    )
    ON CONFLICT ("organizationId", "idempotencyKey") DO UPDATE SET
      "messageSnapshot" = EXCLUDED."messageSnapshot",
      "phoneSnapshot" = EXCLUDED."phoneSnapshot",
      "updatedAt" = NOW()
    RETURNING id`,[o,t,e,i.templateId,i.message,i.phone,`wa:reactivation:manual:${e}:${d}`]);let{rows:p}=await g.query(`SELECT id FROM "WhatsAppTask"
     WHERE "organizationId" = $1 AND "idempotencyKey" = $2`,[t,`wa:reactivation:manual:${e}:${d}`]);return await (0,r.writeAuditLog)({organizationId:t,entityType:"Reactivation",entityId:e,action:"PREPARE_WHATSAPP",actorId:a.id,actorName:a.name}),{taskId:p[0]?.id??o,waLink:(0,c.FV)(i.phone,i.message),message:i.message}}async function y(t,e,a,s,n){let i=u("rsnz");await g.query(`INSERT INTO "ReactivationSnooze" (
      id, "organizationId", "customerId", "snoozedUntil", reason, "createdById"
    ) VALUES ($1,$2,$3,NOW() + ($4 || ' days')::interval,$5,$6)`,[i,t,e,String(a),n??null,s.id]),await g.query(`UPDATE "WhatsAppTask"
     SET status = 'SKIPPED'::"WhatsAppTaskStatus", "updatedAt" = NOW()
     WHERE "organizationId" = $1
       AND "customerId" = $2
       AND type = 'REACTIVATION'::"WhatsAppTaskType"
       AND status = 'PENDING'::"WhatsAppTaskStatus"`,[t,e]),await (0,r.writeAuditLog)({organizationId:t,entityType:"ReactivationSnooze",entityId:e,action:"SNOOZE",actorId:s.id,actorName:s.name,after:{days:a,reason:n}})}async function R(t){let e=await m(t);if(!e.autoCreateWhatsAppTasks)return;await (0,c.Cc)(t),await I(t);let a=await T(t);if(!a)return;let{items:s}=await N(t,{relanceOnly:!0}),n=new Date().toISOString().slice(0,7);for(let o of s){var i;if(i=o.bucket,("DAYS_30"===i?!e.threshold30Enabled:"DAYS_45"===i?!e.threshold45Enabled:"DAYS_60"===i?!e.threshold60Enabled:"DAYS_90"!==i&&"AT_RISK"!==i||!e.threshold90Enabled)||!o.canPrepareWhatsApp||o.pendingWhatsAppTaskId)continue;let s=await D(t,o.id);s&&await g.query(`INSERT INTO "WhatsAppTask" (
        id, "organizationId", "customerId", "templateId", type, status,
        "messageSnapshot", "phoneSnapshot", "scheduledFor", "idempotencyKey", "updatedAt"
      ) VALUES (
        $1,$2,$3,$4,'REACTIVATION'::"WhatsAppTaskType",'PENDING'::"WhatsAppTaskStatus",
        $5,$6,NOW(),$7,NOW()
      )
      ON CONFLICT ("organizationId", "idempotencyKey") DO NOTHING`,[u("wtask"),t,o.id,a.id,s.message,s.phone,`wa:reactivation:auto:${o.id}:${n}`])}}s()}catch(t){s(t)}})}};