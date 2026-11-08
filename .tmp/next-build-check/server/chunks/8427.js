"use strict";exports.id=8427,exports.ids=[8427],exports.modules={28427:(t,e,a)=>{a.a(t,async(t,i)=>{try{a.d(e,{bY:()=>f,jY:()=>O,oc:()=>g,sO:()=>I,syncReviewRequestOnWhatsAppSent:()=>w,syncReviewRequests:()=>R,tX:()=>T,updateReviewSettings:()=>S});var r=a(84770),n=a(79549),s=a(2192),o=a(17729),d=a(14521),u=a(43546),N=t([n,s,o,u]);function E(t){return`${t}_${(0,r.randomBytes)(8).toString("hex")}`}function c(t){return{googleReviewUrl:t.googleReviewUrl??null,delayHours:Number(t.delayHours)||3,maxWindowHours:Number(t.maxWindowHours)||24,enabled:!!t.enabled}}async function I(t){let{rows:e}=await n.pool.query('SELECT * FROM "ReviewSettings" WHERE "organizationId" = $1',[t]);if(e[0])return c(e[0]);let a=E("rset");await n.pool.query('INSERT INTO "ReviewSettings" (id, "organizationId", "updatedAt") VALUES ($1,$2,NOW())',[a,t]);let i=await n.pool.query('SELECT * FROM "ReviewSettings" WHERE "organizationId" = $1',[t]);return c(i.rows[0])}async function S(t,e,a){await I(t);let i=['"updatedAt" = NOW()'],r=[t],o=2;return void 0!==e.googleReviewUrl&&(i.push(`"googleReviewUrl" = $${o}`),r.push(e.googleReviewUrl||null),o++),void 0!==e.delayHours&&(i.push(`"delayHours" = $${o}`),r.push(Math.max(1,Math.min(72,e.delayHours))),o++),void 0!==e.maxWindowHours&&(i.push(`"maxWindowHours" = $${o}`),r.push(Math.max(e.delayHours??3,Math.min(168,e.maxWindowHours))),o++),void 0!==e.enabled&&(i.push(`enabled = $${o}`),r.push(e.enabled),o++),await n.pool.query(`UPDATE "ReviewSettings" SET ${i.join(", ")} WHERE "organizationId" = $1`,r),await (0,s.writeAuditLog)({organizationId:t,entityType:"ReviewSettings",entityId:t,action:"UPDATE",actorId:a.id,actorName:a.name,after:e}),I(t)}async function m(t){let{rows:e}=await n.pool.query(`SELECT id, body FROM "WhatsAppTemplate"
     WHERE "organizationId" = $1 AND type = 'REVIEW_REQUEST'::"WhatsAppTaskType" AND active = true
     ORDER BY "isDefault" DESC LIMIT 1`,[t]);return e[0]??null}async function p(t,e){let{rows:a}=await n.pool.query('SELECT name, phone, address FROM "Organization" WHERE id = $1',[t]),i=a[0]??{name:"",phone:"",address:""};return{name:i.name,phone:i.phone??"",address:i.address??"",googleReviewUrl:e??""}}async function R(t){let e=await I(t);if(!e.enabled)return;await (0,o.Cc)(t);let a=await m(t);if(!a)return;let i=await p(t,e.googleReviewUrl),{rows:r}=await n.pool.query(`SELECT a.id, a."customerId", c.phone, c."firstName", c."lastName",
            a."startAt", a."endAt", s.name AS "serviceName", st."firstName" AS "staffFirstName"
     FROM "Appointment" a
     JOIN "Customer" c ON c.id = a."customerId"
     JOIN "Service" s ON s.id = a."serviceId"
     JOIN "Staff" st ON st.id = a."staffId"
     WHERE a."organizationId" = $1
       AND a.status = 'COMPLETED'
       AND a."endAt" <= NOW() - ($2 || ' hours')::interval
       AND a."endAt" >= NOW() - ($3 || ' hours')::interval
       AND c."deletedAt" IS NULL
       AND c.phone IS NOT NULL AND c.phone <> ''
       AND NOT EXISTS (SELECT 1 FROM "ReviewRequest" rr WHERE rr."appointmentId" = a.id)`,[t,String(e.delayHours),String(e.maxWindowHours)]);for(let e of r){let r=new Date(e.startAt),s=(0,o.O3)(a.body,{customer:{firstName:e.firstName,lastName:e.lastName},appointment:{date:r.toLocaleDateString("fr-FR",{weekday:"long",day:"numeric",month:"long",year:"numeric",timeZone:"Africa/Casablanca"}),time:r.toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit",timeZone:"Africa/Casablanca"})},service:{name:e.serviceName,price:""},staff:{firstName:e.staffFirstName},organization:i}),d=E("rev"),N=E("wtask"),c=(0,u.hU)(),I=(0,u.My)(),S=`review:${e.id}`,m=await n.pool.connect();try{await m.query("BEGIN");let i=await m.query(`INSERT INTO "WhatsAppTask" (
          id, "organizationId", "customerId", "appointmentId", "templateId", type, status,
          "messageSnapshot", "phoneSnapshot", "scheduledFor", "idempotencyKey", "updatedAt"
        ) VALUES (
          $1,$2,$3,$4,$5,'REVIEW_REQUEST'::"WhatsAppTaskType",'PENDING'::"WhatsAppTaskStatus",
          $6,$7,NOW(),$8,NOW()
        )
        ON CONFLICT ("organizationId", "idempotencyKey") DO NOTHING
        RETURNING id`,[N,t,e.customerId,e.id,a.id,s,e.phone,S]),r=i.rows[0]?.id;if(!r){let e=await m.query('SELECT id FROM "WhatsAppTask" WHERE "organizationId" = $1 AND "idempotencyKey" = $2',[t,S]);r=e.rows[0]?.id}if(!r){await m.query("ROLLBACK");continue}await m.query(`INSERT INTO "ReviewRequest" (
          id, "organizationId", "customerId", "appointmentId", "whatsappTaskId",
          status, "scheduledFor", "publicToken", "tokenExpiresAt", "updatedAt"
        ) VALUES (
          $1,$2,$3,$4,$5,'PENDING'::"ReviewRequestStatus",NOW(),$6,$7,NOW()
        )
        ON CONFLICT ("appointmentId") DO NOTHING`,[d,t,e.customerId,e.id,r,c,I]),await m.query("COMMIT")}catch(t){throw await m.query("ROLLBACK"),t}finally{m.release()}}await n.pool.query(`UPDATE "ReviewRequest" rr
     SET status = 'CANCELLED'::"ReviewRequestStatus", "updatedAt" = NOW()
     FROM "Appointment" a
     WHERE rr."appointmentId" = a.id
       AND rr."organizationId" = $1
       AND rr.status = 'PENDING'::"ReviewRequestStatus"
       AND a.status IN ('CANCELLED','NO_SHOW')`,[t])}async function A(t){let[{rows:e},a]=await Promise.all([n.pool.query(`SELECT
      COUNT(*) FILTER (WHERE status = 'PENDING'::"ReviewRequestStatus")::int AS "pendingToSend",
      COUNT(*) FILTER (
        WHERE status = 'SENT'::"ReviewRequestStatus" AND "sentAt" >= date_trunc('month', NOW())
      )::int AS "sentThisMonth",
      COUNT(*) FILTER (WHERE satisfaction IS NOT NULL)::int AS "recordedCount",
      AVG(
        CASE satisfaction
          WHEN 'VERY_SATISFIED' THEN 5
          WHEN 'SATISFIED' THEN 4
          WHEN 'DISSATISFIED' THEN 1
        END
      )::text AS "avgScore",
      CASE WHEN COUNT(*) FILTER (WHERE satisfaction IS NOT NULL) = 0 THEN NULL
        ELSE ROUND(100.0 * COUNT(*) FILTER (WHERE satisfaction IN ('VERY_SATISFIED','SATISFIED'))
          / COUNT(*) FILTER (WHERE satisfaction IS NOT NULL), 1)
      END::text AS "satisfiedPct",
      COUNT(*) FILTER (
        WHERE satisfaction IS NOT NULL AND "satisfactionRecordedAt" >= date_trunc('month', NOW())
      )::int AS "recordedThisMonth",
      COUNT(*) FILTER (
        WHERE satisfaction IS NOT NULL
          AND "satisfactionRecordedAt" >= date_trunc('month', NOW()) - interval '1 month'
          AND "satisfactionRecordedAt" < date_trunc('month', NOW())
      )::int AS "recordedPrevMonth",
      COUNT(*) FILTER (WHERE satisfaction IN ('VERY_SATISFIED','SATISFIED'))::int AS "positiveCount",
      COUNT(*) FILTER (WHERE satisfaction = 'DISSATISFIED')::int AS "sensitiveCount",
      COUNT(*) FILTER (WHERE status = 'SENT'::"ReviewRequestStatus")::int AS "awaitingRecord",
      COUNT(*) FILTER (WHERE status = 'SKIPPED'::"ReviewRequestStatus")::int AS "skippedCount",
      COUNT(*) FILTER (WHERE satisfaction = 'VERY_SATISFIED')::int AS "verySatisfiedCount",
      COUNT(*) FILTER (WHERE satisfaction = 'SATISFIED')::int AS "satisfiedCount",
      COUNT(*) FILTER (WHERE satisfaction = 'DISSATISFIED')::int AS "dissatisfiedCount"
     FROM "ReviewRequest"
     WHERE "organizationId" = $1`,[t]),n.pool.query(`SELECT
         COUNT(*) FILTER (WHERE status IN ('PENDING'::"PublicReviewStatus", 'PUBLISHED'::"PublicReviewStatus"))::int AS "publicCount",
         COUNT(*) FILTER (WHERE status = 'PENDING'::"PublicReviewStatus")::int AS "publicPendingCount",
         AVG(rating) FILTER (WHERE status IN ('PENDING'::"PublicReviewStatus", 'PUBLISHED'::"PublicReviewStatus"))::text AS "publicAvg"
       FROM "Review"
       WHERE "organizationId" = $1`,[t])]),i=e[0],r=a.rows[0],s=i?.avgScore!=null?parseFloat(i.avgScore):null,o=r?.publicAvg!=null?parseFloat(r.publicAvg):null;return{pendingToSend:i?.pendingToSend??0,sentThisMonth:i?.sentThisMonth??0,recordedCount:i?.recordedCount??0,averageScore:null!=s?Math.round(10*s)/10:null,satisfiedPercent:i?.satisfiedPct!=null?Number(i.satisfiedPct):null,recordedThisMonth:i?.recordedThisMonth??0,recordedPrevMonth:i?.recordedPrevMonth??0,positiveCount:i?.positiveCount??0,sensitiveCount:i?.sensitiveCount??0,awaitingRecord:i?.awaitingRecord??0,skippedCount:i?.skippedCount??0,verySatisfiedCount:i?.verySatisfiedCount??0,satisfiedCount:i?.satisfiedCount??0,dissatisfiedCount:i?.dissatisfiedCount??0,publicCount:r?.publicCount??0,publicAverageScore:null!=o?Math.round(10*o)/10:null,publicPendingCount:r?.publicPendingCount??0}}async function l(t){let{rows:e}=await n.pool.query(`WITH scores AS (
       SELECT a."staffId", CASE rr.satisfaction
         WHEN 'VERY_SATISFIED' THEN 5
         WHEN 'SATISFIED' THEN 4
         WHEN 'DISSATISFIED' THEN 1
       END AS score
       FROM "ReviewRequest" rr
       JOIN "Appointment" a ON a.id = rr."appointmentId" AND a."organizationId" = rr."organizationId"
       WHERE rr."organizationId" = $1 AND rr.satisfaction IS NOT NULL
         AND NOT EXISTS (SELECT 1 FROM "Review" r JOIN "ReviewStaffRating" sr ON sr."reviewId" = r.id
           WHERE r."appointmentId" = a.id AND sr."staffId" = a."staffId"
           AND r."organizationId" = $1 AND r.status = 'PUBLISHED' AND sr.rating IS NOT NULL)
       UNION ALL
       SELECT sr."staffId", sr.rating AS score
       FROM "Review" r
       JOIN "ReviewStaffRating" sr ON sr."reviewId" = r.id
       WHERE r."organizationId" = $1 AND r.status = 'PUBLISHED'
         AND sr.rating IS NOT NULL
     )
     SELECT st.id AS "staffId", st."firstName", st."lastName",
            COUNT(*)::int AS "reviewCount", AVG(scores.score)::text AS "avgScore"
     FROM scores
     JOIN "Staff" st ON st.id = scores."staffId" AND st."organizationId" = $1 AND st."deletedAt" IS NULL
     GROUP BY st.id, st."firstName", st."lastName"
     ORDER BY AVG(scores.score) DESC NULLS LAST, COUNT(*) DESC
     LIMIT 8`,[t]);return e.map(t=>{let e=t.firstName?.trim()||"",a=t.lastName?.trim()||"",i=null!=t.avgScore?parseFloat(t.avgScore):null;return{staffId:t.staffId,staffName:`${e} ${a}`.trim()||"Praticienne",initials:`${e.charAt(0)}${a.charAt(0)}`.toUpperCase()||"—",reviewCount:t.reviewCount,averageScore:null!=i?Math.round(10*i)/10:null}})}async function T(t,e={}){await R(t);let a=await I(t),i=['rr."organizationId" = $1'],r=[t];e.status&&"ALL"!==e.status&&(i.push('rr.status = $2::"ReviewRequestStatus"'),r.push(e.status));let{rows:s}=await n.pool.query(`SELECT rr.*,
            o.slug AS "organizationSlug",
            c."firstName" || ' ' || c."lastName" AS "customerName",
            s.name AS "serviceName",
            NULLIF(TRIM(COALESCE(st."firstName", '') || ' ' || COALESCE(st."lastName", '')), '') AS "staffName",
            a."endAt" AS "completedAt",
            EXTRACT(EPOCH FROM (NOW() - a."endAt")) / 3600 AS "hoursSince",
            wt."messageSnapshot",
            wt."phoneSnapshot",
            wt."sentAt"
     FROM "ReviewRequest" rr
     JOIN "Organization" o ON o.id = rr."organizationId"
     JOIN "Customer" c ON c.id = rr."customerId"
     JOIN "Appointment" a ON a.id = rr."appointmentId"
     JOIN "Service" s ON s.id = a."serviceId"
     LEFT JOIN "Staff" st ON st.id = a."staffId"
     LEFT JOIN "WhatsAppTask" wt ON wt.id = rr."whatsappTaskId"
     WHERE ${i.join(" AND ")}
     ORDER BY COALESCE(rr."satisfactionRecordedAt", rr."sentAt", rr."scheduledFor") DESC
     LIMIT 120`,r),[d,N]=await Promise.all([A(t),l(t)]);return{items:s.map(t=>(function(t,e){let a=String(t.messageSnapshot),i=String(t.phoneSnapshot);return{id:String(t.id),status:t.status,customerId:String(t.customerId),customerName:String(t.customerName),appointmentId:String(t.appointmentId),serviceName:String(t.serviceName),staffName:t.staffName?String(t.staffName):null,completedAt:new Date(t.completedAt).toISOString(),hoursSinceCompleted:Math.max(0,Math.floor(Number(t.hoursSince)||0)),messageSnapshot:a,phoneSnapshot:i,waLink:(0,o.FV)(i,a),whatsappTaskId:t.whatsappTaskId??null,sentAt:t.sentAt?new Date(t.sentAt).toISOString():null,satisfaction:t.satisfaction??null,satisfactionRecordedAt:t.satisfactionRecordedAt?new Date(t.satisfactionRecordedAt).toISOString():null,googleReviewUrl:e.googleReviewUrl,publicReviewPath:t.publicToken&&t.organizationSlug?(0,u.LR)(String(t.organizationSlug),String(t.publicToken)):null}})(t,a)),kpis:d,settings:a,staffScores:N}}async function O(t,e,a){let{rows:i}=await n.pool.query(`UPDATE "ReviewRequest"
     SET status = 'SKIPPED'::"ReviewRequestStatus", "updatedAt" = NOW()
     WHERE id = $2 AND "organizationId" = $1 AND status = 'PENDING'::"ReviewRequestStatus"
     RETURNING "whatsappTaskId"`,[t,e]);return!!i[0]&&(i[0].whatsappTaskId&&await n.pool.query(`UPDATE "WhatsAppTask"
       SET status = 'SKIPPED'::"WhatsAppTaskStatus", "updatedAt" = NOW()
       WHERE id = $1 AND status = 'PENDING'::"WhatsAppTaskStatus"`,[i[0].whatsappTaskId]),await (0,s.writeAuditLog)({organizationId:t,entityType:"ReviewRequest",entityId:e,action:"SKIPPED",actorId:a.id,actorName:a.name}),!0)}async function g(t,e,a,i){let{rows:r,rowCount:o}=await n.pool.query(`UPDATE "ReviewRequest" rr
     SET satisfaction = $3::"ReviewSatisfaction",
         status = 'RECORDED'::"ReviewRequestStatus",
         "satisfactionRecordedAt" = NOW(),
         "satisfactionRecordedById" = $4,
         "updatedAt" = NOW()
     FROM "Customer" c, "Appointment" a, "Service" s
     WHERE rr.id = $2 AND rr."organizationId" = $1
       AND rr.status IN ('SENT'::"ReviewRequestStatus", 'RECORDED'::"ReviewRequestStatus")
       AND c.id = rr."customerId"
       AND a.id = rr."appointmentId"
       AND s.id = a."serviceId"
     RETURNING rr."customerId", c."firstName" || ' ' || c."lastName" AS "customerName", s.name AS "serviceName"`,[t,e,a,i.id]);return o?(await (0,s.writeAuditLog)({organizationId:t,entityType:"ReviewRequest",entityId:e,action:"SATISFACTION",actorId:i.id,actorName:i.name,after:{satisfaction:a,score:d.Wk[a]}}),"DISSATISFIED"===a)?(await (0,s.writeAuditLog)({organizationId:t,entityType:"ReviewRequest",entityId:e,action:"ALERT_OWNER",actorId:i.id,actorName:i.name,after:{customerId:r[0].customerId,customerName:r[0].customerName,serviceName:r[0].serviceName,satisfaction:a}}),{ok:!0,alert:{reviewRequestId:e,customerId:r[0].customerId,customerName:r[0].customerName,serviceName:r[0].serviceName,satisfaction:a,recordedAt:new Date().toISOString()}}):{ok:!0}:{ok:!1}}async function w(t,e,a){let i=a??n.pool;await i.query(`UPDATE "ReviewRequest"
     SET status = 'SENT'::"ReviewRequestStatus",
         "sentAt" = NOW(),
         "sentById" = $2,
         "updatedAt" = NOW()
     WHERE "whatsappTaskId" = $1 AND status = 'PENDING'::"ReviewRequestStatus"`,[t,e])}async function f(t,e=5){let{rows:a}=await n.pool.query(`SELECT rr.id AS "reviewRequestId", rr."customerId",
            c."firstName" || ' ' || c."lastName" AS "customerName",
            s.name AS "serviceName", rr.satisfaction,
            rr."satisfactionRecordedAt" AS "recordedAt"
     FROM "ReviewRequest" rr
     JOIN "Customer" c ON c.id = rr."customerId"
     JOIN "Appointment" a ON a.id = rr."appointmentId"
     JOIN "Service" s ON s.id = a."serviceId"
     WHERE rr."organizationId" = $1
       AND rr.satisfaction = 'DISSATISFIED'::"ReviewSatisfaction"
     ORDER BY rr."satisfactionRecordedAt" DESC NULLS LAST
     LIMIT $2`,[t,e]);return a.map(t=>({reviewRequestId:String(t.reviewRequestId),customerId:String(t.customerId),customerName:String(t.customerName),serviceName:String(t.serviceName),satisfaction:"DISSATISFIED",recordedAt:new Date(t.recordedAt).toISOString()}))}[n,s,o,u]=N.then?(await N)():N,i()}catch(t){i(t)}})},43546:(t,e,a)=>{a.a(t,async(t,i)=>{try{a.d(e,{B5:()=>l,F1:()=>A,GD:()=>m,LR:()=>N,Ms:()=>p,My:()=>u,hU:()=>d,v:()=>E,xy:()=>R,zT:()=>S});var r=a(84770),n=a(79549),s=a(2192),o=t([n,s]);[n,s]=o.then?(await o)():o;let T="ABCDEFGHJKLMNPQRSTUVWXYZ23456789",O=/^RBREV_[A-Z2-9]{16,32}$/;function d(){let t=(0,r.randomBytes)(20),e="";for(let a=0;a<20;a++)e+=T[t[a]%T.length];return`RBREV_${e}`}function u(t=new Date){return new Date(t.getTime()+2592e6)}function N(t,e){return`/book/${encodeURIComponent(t)}/reviews/${encodeURIComponent(e)}/`}function E(t){return t.replace(/\s+/g," ").trim()}function c(t){let e=t.now??new Date;if(!t.request)return{ok:!1,code:"TOKEN_INVALID"};if(t.request.organizationId!==t.slugOrganizationId||!t.appointment||t.appointment.organizationId!==t.slugOrganizationId||t.appointment.customerId!==t.request.customerId)return{ok:!1,code:"ORG_MISMATCH"};if(t.request.tokenExpiresAt.getTime()<=e.getTime())return{ok:!1,code:"TOKEN_EXPIRED"};if("CANCELLED"===t.request.status||"SKIPPED"===t.request.status||"COMPLETED"!==t.appointment.status)return{ok:!1,code:"NOT_ELIGIBLE"};if(t.request.hasReview)return{ok:!1,code:"DUPLICATE"};if(!Number.isInteger(t.rating)||t.rating<1||t.rating>5)return{ok:!1,code:"RATING_INVALID"};let a=E(t.comment);return a.length<8||a.length>800?{ok:!1,code:"COMMENT_INVALID"}:{ok:!0}}async function I(t,e){let a=e.trim().toUpperCase();if(!O.test(a))return null;let{rows:i}=await n.pool.query(`SELECT rr.id, rr."organizationId", rr."customerId", rr."appointmentId", rr.status::text AS status,
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
     WHERE rr."publicToken" = $1`,[a,t]),r=i[0];return r?{...r,tokenExpiresAt:new Date(r.tokenExpiresAt),hasReview:!!r.hasReview}:null}async function S(t,e){let a=await I(t,e);if(!a)return{ok:!1,code:"TOKEN_INVALID"};let i=c({slugOrganizationId:a.organizationId,request:a,appointment:{organizationId:a.appointmentOrgId,customerId:a.appointmentCustomerId,status:a.appointmentStatus},rating:5,comment:"aper\xe7u valide"});return i.ok||"DUPLICATE"===i.code?{ok:!0,organizationName:a.organizationName,firstName:a.firstName,serviceName:a.serviceName,alreadySubmitted:a.hasReview}:i}async function m(t){let e=await I(t.slug,t.token),a=e?.organizationId??"",i=c({slugOrganizationId:a,request:e,appointment:e?{organizationId:e.appointmentOrgId,customerId:e.appointmentCustomerId,status:e.appointmentStatus}:null,rating:t.rating,comment:t.comment});if(!i.ok)return i;if(!e)return{ok:!1,code:"TOKEN_INVALID"};let s=E(t.comment);try{await n.pool.query(`INSERT INTO "Review" (
         id, "organizationId", "customerId", "appointmentId", "reviewRequestId",
         rating, comment, status, "updatedAt"
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,'PENDING',NOW())`,[`prev_${(0,r.randomBytes)(8).toString("hex")}`,e.organizationId,e.customerId,e.appointmentId,e.id,t.rating,s])}catch(e){let t="object"==typeof e&&e&&"code"in e?String(e.code):"";if("23505"===t)return{ok:!1,code:"DUPLICATE"};throw e}return{ok:!0}}async function p(t){let{rows:e}=await n.pool.query(`SELECT r.id, r.rating, r.comment, r."createdAt", c."firstName" AS "firstName",
            COALESCE(a."serviceNameSnapshot", s.name, CASE WHEN a.id IS NULL THEN 'Carte fid\xe9lit\xe9' ELSE 'Prestation' END) AS "serviceName",
            o.name AS "organizationName"
     FROM "Review" r
     JOIN "Organization" o ON o.id = r."organizationId" AND o.slug = $1 AND o.status = 'ACTIVE'
     JOIN "Customer" c ON c.id = r."customerId"
     LEFT JOIN "Appointment" a ON a.id = r."appointmentId"
     LEFT JOIN "Service" s ON s.id = a."serviceId"
     WHERE r.status = 'PUBLISHED'
     ORDER BY r."createdAt" DESC, r.id DESC`,[t]);return{organizationName:e[0]?.organizationName??null,reviews:e.map(t=>({id:t.id,rating:t.rating,comment:t.comment,firstName:t.firstName,serviceName:t.serviceName,createdAt:new Date(t.createdAt).toISOString()}))}}async function R(t,e,a){let i=E(a);if(i.length<3||i.length>300)return!1;let{rowCount:r}=await n.pool.query(`UPDATE "Review" r
     SET status = 'REPORTED', "reportReason" = $3, "reportedAt" = NOW(), "updatedAt" = NOW()
     FROM "Organization" o
     WHERE r.id = $2 AND r."organizationId" = o.id AND o.slug = $1 AND o.status = 'ACTIVE'
       AND r.status = 'PUBLISHED'`,[t,e,i]);return(r??0)>0}async function A(t){let{rows:e}=await n.pool.query(`SELECT r.id, r.rating, r.comment, r.status::text AS status, r."createdAt",
            c."firstName", c."lastName", c.phone,
            COALESCE(a."serviceNameSnapshot", s.name, CASE WHEN a.id IS NULL THEN 'Carte fid\xe9lit\xe9' ELSE 'Prestation' END) AS "serviceName",
            r."reportReason"
     FROM "Review" r
     JOIN "Customer" c ON c.id = r."customerId"
     LEFT JOIN "Appointment" a ON a.id = r."appointmentId"
     LEFT JOIN "Service" s ON s.id = a."serviceId"
     WHERE r."organizationId" = $1
     ORDER BY r."createdAt" DESC, r.id DESC`,[t]);return e.map(t=>({id:t.id,rating:t.rating,comment:t.comment,status:t.status,createdAt:new Date(t.createdAt).toISOString(),customerName:`${t.firstName} ${t.lastName}`.trim(),phone:t.phone,serviceName:t.serviceName,reportReason:t.reportReason}))}async function l(t){let e="publish"===t.action?"PUBLISHED":"reject"===t.action?"REJECTED":"REPORTED",a=t.reason?E(t.reason):null;if("report"===t.action&&(!a||a.length<3))return!1;let{rowCount:i}=await n.pool.query(`UPDATE "Review"
     SET status = $3::"PublicReviewStatus",
         "publishedAt" = CASE WHEN $3 = 'PUBLISHED' THEN NOW() ELSE "publishedAt" END,
         "moderatedAt" = NOW(),
         "moderatedById" = $4,
         "reportReason" = CASE WHEN $3 = 'REPORTED' THEN $5 ELSE "reportReason" END,
         "reportedAt" = CASE WHEN $3 = 'REPORTED' THEN NOW() ELSE "reportedAt" END,
         "updatedAt" = NOW()
     WHERE id = $2 AND "organizationId" = $1`,[t.organizationId,t.reviewId,e,t.actorId,a]);return!!i&&(await (0,s.writeAuditLog)({organizationId:t.organizationId,actorId:t.actorId,actorName:t.actorName,entityType:"Review",entityId:t.reviewId,action:`REVIEW_${e}`,after:{status:e}}),!0)}i()}catch(t){i(t)}})},14521:(t,e,a)=>{a.d(e,{Wk:()=>i});let i={VERY_SATISFIED:5,SATISFIED:4,DISSATISFIED:1}}};