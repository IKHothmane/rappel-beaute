"use strict";!function(){try{var t="undefined"!=typeof window?window:"undefined"!=typeof global?global:"undefined"!=typeof self?self:{},e=(new t.Error).stack;e&&(t._sentryDebugIds=t._sentryDebugIds||{},t._sentryDebugIds[e]="c15f455e-2a69-4bd7-91a2-8168152a5deb",t._sentryDebugIdIdentifier="sentry-dbid-c15f455e-2a69-4bd7-91a2-8168152a5deb")}catch(t){}}(),exports.id=4239,exports.ids=[4239],exports.modules={34239:(t,e,a)=>{a.a(t,async(t,i)=>{try{a.d(e,{Cc:()=>E,FV:()=>m,O3:()=>N,Rv:()=>R,VO:()=>D,Z9:()=>W,_i:()=>F,bO:()=>w,enqueueOnlineBookingConfirmation:()=>C,enqueueWaitingListOffer:()=>P,getWhatsAppTaskById:()=>M,hy:()=>f,jg:()=>v,l$:()=>g,lT:()=>$,us:()=>L,vl:()=>c});var o=a(84770),s=a(67487),n=a(70653),r=a(66085),p=a(84678),d=t([n,r]);function u(t){return`${t}_${(0,o.randomBytes)(8).toString("hex")}`}function c(t){let e=t.replace(/\D/g,"");return e.startsWith("212")?e:e.startsWith("0")?`212${e.slice(1)}`:9===e.length?`212${e}`:e}function m(t,e){let a=c(t);return`https://wa.me/${a}?text=${encodeURIComponent(e)}`}function N(t,e){let a={"{{customer.firstName}}":e.customer.firstName,"{{customer.lastName}}":e.customer.lastName,"{{appointment.date}}":e.appointment?.date??"","{{appointment.time}}":e.appointment?.time??"","{{service.name}}":e.service?.name??"","{{service.price}}":e.service?.price??"","{{staff.firstName}}":e.staff?.firstName??"","{{organization.name}}":e.organization.name,"{{organization.phone}}":e.organization.phone,"{{organization.address}}":e.organization.address,"{{organization.googleReviewUrl}}":e.organization.googleReviewUrl??"","{{promotion.code}}":e.promotion?.code??"","{{promotion.discount}}":e.promotion?.discount??"","{{package.remainingSessions}}":e.package?.remainingSessions??"","{{loyalty.points}}":e.loyalty?.points??"","{{lastVisit.date}}":e.lastVisit?.date??"","{{lastVisit.days}}":e.lastVisit?.days??"","{{lastService.name}}":e.lastService?.name??e.service?.name??"","{{bookingUrl}}":e.bookingUrl??"","{{recommendedDate}}":e.recommendedDate??""},i=t;for(let[t,e]of Object.entries(a))i=i.split(t).join(e);return i}function A(t){return t.toLocaleDateString("fr-FR",{weekday:"long",day:"numeric",month:"long",year:"numeric",timeZone:"Africa/Casablanca"})}function l(t){return t.toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit",timeZone:"Africa/Casablanca"})}function I(t){return{id:String(t.id),name:String(t.name),type:t.type,body:String(t.body),active:!!t.active,isDefault:!!t.isDefault}}function T(t){let e=String(t.phoneSnapshot),a=String(t.messageSnapshot);return{id:String(t.id),type:t.type,status:t.status,messageSnapshot:a,phoneSnapshot:e,waLink:m(e,a),scheduledFor:new Date(t.scheduledFor).toISOString(),sentAt:t.sentAt?new Date(t.sentAt).toISOString():null,sentById:t.sentById??null,staffOutcome:t.staffOutcome??null,outcomeAt:t.outcomeAt?new Date(t.outcomeAt).toISOString():null,customerId:String(t.customerId),customerName:String(t.customerName),appointmentId:t.appointmentId??null,appointmentStartAt:t.appointmentStartAt?new Date(t.appointmentStartAt).toISOString():null,serviceName:t.serviceName??null,servicePrice:null!=t.servicePrice?parseFloat(String(t.servicePrice)):null,templateId:t.templateId??null,attributionSource:t.attributionSource??null}}[n,r]=d.then?(await d)():d;let b=[{name:"Confirmation RDV",type:"APPOINTMENT_CONFIRMATION",body:`Bonjour {{customer.firstName}} 👋

Nous confirmons votre rendez-vous du {{appointment.date}}
\xe0 {{appointment.time}} pour {{service.name}}.

Merci de nous confirmer votre pr\xe9sence 🌸`},{name:"Rappel RDV",type:"APPOINTMENT_REMINDER",body:`Bonjour {{customer.firstName}} 🌸

Petit rappel pour votre rendez-vous demain \xe0 {{appointment.time}} \xe0 {{organization.name}} pour votre {{service.name}}.

\xc0 demain !`},{name:"R\xe9activation",type:"REACTIVATION",body:`Bonjour {{customer.firstName}} 🌸

Cela fait {{lastVisit.days}} jours que nous ne vous avons pas vue.
Votre dernier {{lastService.name}} remonte \xe0 {{lastVisit.date}}.

Nous serions ravis de vous revoir \xe0 {{organization.name}}.
{{promotion.discount}} avec le code {{promotion.code}}.`},{name:"Anniversaire",type:"BIRTHDAY",body:`Joyeux anniversaire {{customer.firstName}} 🎂

Pour cette occasion, l'\xe9quipe {{organization.name}} vous pr\xe9pare une surprise.

Passez nous voir au {{organization.address}} !`},{name:"Demande d'avis",type:"REVIEW_REQUEST",body:`Bonjour {{customer.firstName}} 🌸

Merci pour votre visite \xe0 {{organization.name}}.

Nous esp\xe9rons que vous avez appr\xe9ci\xe9 votre {{service.name}}.

Votre avis nous ferait tr\xe8s plaisir ❤️

⭐ Laisser un avis Google :
{{organization.googleReviewUrl}}`},{name:"Liste d'attente",type:"WAITING_LIST",body:`Bonjour {{customer.firstName}} 👋

Une place vient de se lib\xe9rer pour {{service.name}}
le {{appointment.date}} \xe0 {{appointment.time}} \xe0 {{organization.name}}.

Souhaitez-vous la r\xe9server ?
{{bookingUrl}}`},{name:"Post-prestation",type:"POST_VISIT",body:`Bonjour {{customer.firstName}} 👋

Nous esp\xe9rons que vous avez appr\xe9ci\xe9 votre {{lastService.name}}.
Votre prochaine s\xe9ance pourrait \xeatre recommand\xe9e autour du {{recommendedDate}}.

Souhaitez-vous prendre rendez-vous ?
{{bookingUrl}}`}];async function E(t){for(let e of b){let{rows:a}=await n.pool.query(`SELECT id FROM "WhatsAppTemplate"
       WHERE "organizationId" = $1 AND type = $2::"WhatsAppTaskType" AND "isDefault" = true
       LIMIT 1`,[t,e.type]);a.length||await n.pool.query(`INSERT INTO "WhatsAppTemplate" (
        id, "organizationId", name, type, body, active, "isDefault", "updatedAt"
      ) VALUES ($1,$2,$3,$4::"WhatsAppTaskType",$5,true,true,NOW())`,[u("wtpl"),t,e.name,e.type,e.body])}}async function y(t,e){let{rows:a}=await n.pool.query(`SELECT id, body FROM "WhatsAppTemplate"
     WHERE "organizationId" = $1 AND type = $2::"WhatsAppTaskType" AND active = true
     ORDER BY "isDefault" DESC, "updatedAt" DESC
     LIMIT 1`,[t,e]);return a[0]??null}async function S(t){let{rows:e}=await n.pool.query('SELECT name, phone, address FROM "Organization" WHERE id = $1',[t]);return e[0]??{name:"",phone:"",address:""}}async function O(t,e){let a=u("wtask"),{rows:i}=await n.pool.query(`INSERT INTO "WhatsAppTask" (
      id, "organizationId", "customerId", "appointmentId", "templateId",
      type, status, "messageSnapshot", "phoneSnapshot", "scheduledFor",
      "idempotencyKey", "attributionSource", "updatedAt"
    ) VALUES (
      $1,$2,$3,$4,$5,$6::"WhatsAppTaskType",'PENDING'::"WhatsAppTaskStatus",
      $7,$8,$9,$10,$11,NOW()
    )
    ON CONFLICT ("organizationId", "idempotencyKey") DO NOTHING
    RETURNING id`,[a,t,e.customerId,e.appointmentId??null,e.templateId??null,e.type,e.messageSnapshot,e.phoneSnapshot,e.scheduledFor,e.idempotencyKey,e.attributionSource??null]);return i[0]?.id??null}async function f(t){await E(t);let e=await S(t),i={name:e.name,phone:e.phone??"",address:e.address??""},o=await y(t,"APPOINTMENT_REMINDER");if(o){let{rows:e}=await n.pool.query(`SELECT a.id, a."customerId", c.phone, c."firstName", c."lastName",
              a."startAt", s.name AS "serviceName", a.price::text,
              st."firstName" AS "staffFirstName"
       FROM "Appointment" a
       JOIN "Customer" c ON c.id = a."customerId"
       JOIN "Service" s ON s.id = a."serviceId"
       JOIN "Staff" st ON st.id = a."staffId"
       WHERE a."organizationId" = $1
         AND a.status IN ('PENDING','CONFIRMED')
         AND a."startAt" >= (date_trunc('day', NOW() AT TIME ZONE 'Africa/Casablanca') + INTERVAL '1 day')
         AND a."startAt" < (date_trunc('day', NOW() AT TIME ZONE 'Africa/Casablanca') + INTERVAL '2 days')
         AND c."deletedAt" IS NULL
         AND c.phone IS NOT NULL AND c.phone <> ''`,[t]),a=new Date;for(let s of(a.setHours(8,0,0,0),e)){let e=new Date(s.startAt),n=N(o.body,{customer:{firstName:s.firstName,lastName:s.lastName},appointment:{date:A(e),time:l(e)},service:{name:s.serviceName,price:`${s.price} MAD`},staff:{firstName:s.staffFirstName},organization:i}),r=e.toISOString().slice(0,10);await O(t,{customerId:s.customerId,appointmentId:s.id,templateId:o.id,type:"APPOINTMENT_REMINDER",messageSnapshot:n,phoneSnapshot:s.phone,scheduledFor:a,idempotencyKey:`wa:reminder:${s.id}:${r}`})}}let s=await y(t,"APPOINTMENT_CONFIRMATION");if(s){let{rows:e}=await n.pool.query(`SELECT a.id, a."customerId", c.phone, c."firstName", c."lastName",
              a."startAt", s.name AS "serviceName", a.price::text,
              st."firstName" AS "staffFirstName"
       FROM "Appointment" a
       JOIN "Customer" c ON c.id = a."customerId"
       JOIN "Service" s ON s.id = a."serviceId"
       JOIN "Staff" st ON st.id = a."staffId"
       WHERE a."organizationId" = $1
         AND a.status = 'PENDING'
         AND a."startAt" >= (date_trunc('day', NOW() AT TIME ZONE 'Africa/Casablanca') + INTERVAL '2 days')
         AND a."startAt" < (date_trunc('day', NOW() AT TIME ZONE 'Africa/Casablanca') + INTERVAL '3 days')
         AND c."deletedAt" IS NULL
         AND c.phone IS NOT NULL AND c.phone <> ''`,[t]),a=new Date;for(let o of(a.setHours(9,0,0,0),e)){let e=new Date(o.startAt),n=N(s.body,{customer:{firstName:o.firstName,lastName:o.lastName},appointment:{date:A(e),time:l(e)},service:{name:o.serviceName,price:`${o.price} MAD`},staff:{firstName:o.staffFirstName},organization:i}),r=e.toISOString().slice(0,10);await O(t,{customerId:o.customerId,appointmentId:o.id,templateId:s.id,type:"APPOINTMENT_CONFIRMATION",messageSnapshot:n,phoneSnapshot:o.phone,scheduledFor:a,idempotencyKey:`wa:confirm:${o.id}:${r}`})}}let{syncReviewRequests:r}=await a.e(538).then(a.bind(a,50538));await r(t);let{syncReactivationWhatsAppTasks:p}=await a.e(699).then(a.bind(a,90699));await p(t);let{syncPostVisitTasks:d}=await Promise.all([a.e(699),a.e(3336)]).then(a.bind(a,53336));await d(t);let u=await y(t,"BIRTHDAY");if(u){let e=new Date().getFullYear(),{rows:a}=await n.pool.query(`SELECT c.id, c.phone, c."firstName", c."lastName"
       FROM "Customer" c
       WHERE c."organizationId" = $1
         AND c."deletedAt" IS NULL
         AND c."marketingWhatsapp" = true
         AND c."birthDate" IS NOT NULL
         AND EXTRACT(MONTH FROM c."birthDate") = EXTRACT(MONTH FROM CURRENT_DATE)
         AND EXTRACT(DAY FROM c."birthDate") = EXTRACT(DAY FROM CURRENT_DATE)
         AND c.phone IS NOT NULL AND c.phone <> ''`,[t]);for(let o of a){let a=N(u.body,{customer:{firstName:o.firstName,lastName:o.lastName},organization:i,promotion:{code:"",discount:"une surprise"}});await O(t,{customerId:o.id,templateId:u.id,type:"BIRTHDAY",messageSnapshot:a,phoneSnapshot:o.phone,scheduledFor:new Date,idempotencyKey:`wa:birthday:${o.id}:${e}`})}}await n.pool.query(`UPDATE "WhatsAppTask" t
     SET status = 'CANCELLED'::"WhatsAppTaskStatus", "updatedAt" = NOW()
     FROM "Appointment" a
     WHERE t."appointmentId" = a.id
       AND t."organizationId" = $1
       AND t.status = 'PENDING'::"WhatsAppTaskStatus"
       AND a.status IN ('CANCELLED','NO_SHOW')`,[t])}async function h(t){let{rows:e}=await n.pool.query(`SELECT
      (SELECT COUNT(*)::int FROM "WhatsAppTask"
       WHERE "organizationId" = $1
         AND status = 'PENDING'::"WhatsAppTaskStatus"
         AND "scheduledFor" >= date_trunc('day', NOW())
         AND "scheduledFor" < date_trunc('day', NOW()) + INTERVAL '1 day') AS "pendingToday",
      (SELECT COUNT(*)::int FROM "WhatsAppTask"
       WHERE "organizationId" = $1
         AND status = 'SENT'::"WhatsAppTaskStatus"
         AND "sentAt" >= date_trunc('day', NOW())
         AND "sentAt" < date_trunc('day', NOW()) + INTERVAL '1 day') AS "sentToday",
      (SELECT COUNT(*)::int FROM "WhatsAppTask"
       WHERE "organizationId" = $1
         AND "staffOutcome" = 'CUSTOMER_CONFIRMED'::"WhatsAppStaffOutcome"
         AND "outcomeAt" >= date_trunc('day', NOW())
         AND "outcomeAt" < date_trunc('day', NOW()) + INTERVAL '1 day') AS "confirmationsRecorded",
      (SELECT COUNT(*)::int FROM "WhatsAppTask"
       WHERE "organizationId" = $1
         AND "staffOutcome" = 'CUSTOMER_CANCELLED'::"WhatsAppStaffOutcome"
         AND "outcomeAt" >= date_trunc('day', NOW())
         AND "outcomeAt" < date_trunc('day', NOW()) + INTERVAL '1 day') AS "cancellationsRecorded",
      (SELECT COUNT(*)::int FROM "WhatsAppTask"
       WHERE "organizationId" = $1
         AND "staffOutcome" = 'NEEDS_FOLLOWUP'::"WhatsAppStaffOutcome"
         AND "outcomeAt" >= date_trunc('day', NOW())
         AND "outcomeAt" < date_trunc('day', NOW()) + INTERVAL '1 day') AS "followUpsRecorded"`,[t]);return{pendingToday:e[0]?.pendingToday??0,sentToday:e[0]?.sentToday??0,confirmationsRecorded:e[0]?.confirmationsRecorded??0,cancellationsRecorded:e[0]?.cancellationsRecorded??0,followUpsRecorded:e[0]?.followUpsRecorded??0}}async function D(t,e){await f(t);let a=['t."organizationId" = $1'],i=[t],o=2;e.status?(a.push(`t.status = $${o}::"WhatsAppTaskStatus"`),i.push(e.status),o++):a.push("t.status = 'PENDING'::\"WhatsAppTaskStatus\""),e.type&&(a.push(`t.type = $${o}::"WhatsAppTaskType"`),i.push(e.type),o++);let s=a.join(" AND "),[r,p]=await Promise.all([n.pool.query(`SELECT t.*,
              c."firstName" || ' ' || c."lastName" AS "customerName",
              a."startAt" AS "appointmentStartAt",
              s.name AS "serviceName",
              a.price::text AS "servicePrice"
       FROM "WhatsAppTask" t
       JOIN "Customer" c ON c.id = t."customerId"
       LEFT JOIN "Appointment" a ON a.id = t."appointmentId"
       LEFT JOIN "Service" s ON s.id = a."serviceId"
       WHERE ${s}
       ORDER BY t."scheduledFor" ASC, t."createdAt" ASC
       LIMIT 100`,i),h(t)]);return{items:r.rows.map(t=>T(t)),kpis:p}}async function R(t){let{rows:e}=await n.pool.query(`SELECT t.*,
            c."firstName" || ' ' || c."lastName" AS "customerName",
            a."startAt" AS "appointmentStartAt",
            s.name AS "serviceName",
            a.price::text AS "servicePrice"
     FROM "WhatsAppTask" t
     JOIN "Customer" c ON c.id = t."customerId"
     LEFT JOIN "Appointment" a ON a.id = t."appointmentId"
     LEFT JOIN "Service" s ON s.id = a."serviceId"
     WHERE t."organizationId" = $1
       AND t.status = 'SENT'::"WhatsAppTaskStatus"
     ORDER BY t."sentAt" DESC NULLS LAST
     LIMIT 50`,[t]);return e.map(t=>T(t))}async function g(t,e,i){let{rows:o}=await n.pool.query(`UPDATE "WhatsAppTask"
     SET status = 'SENT'::"WhatsAppTaskStatus",
         "sentAt" = NOW(),
         "sentById" = $3,
         "updatedAt" = NOW()
     WHERE id = $2 AND "organizationId" = $1 AND status = 'PENDING'::"WhatsAppTaskStatus"
     RETURNING *`,[t,e,i.id]);if(!o[0])return null;await n.pool.query(`UPDATE "CampaignRecipient"
     SET status = 'SENT'::"CampaignRecipientStatus", "updatedAt" = NOW()
     WHERE "whatsappTaskId" = $1 AND status = 'PENDING'::"CampaignRecipientStatus"`,[e]);let{syncReviewRequestOnWhatsAppSent:s}=await a.e(538).then(a.bind(a,50538));await s(e,i.id),await (0,r.writeAuditLog)({organizationId:t,entityType:"WhatsAppTask",entityId:e,action:"SENT",actorId:i.id,actorName:i.name,after:{manual:!0}});let p=await n.pool.query(`SELECT t.*,
            c."firstName" || ' ' || c."lastName" AS "customerName",
            a."startAt" AS "appointmentStartAt",
            s.name AS "serviceName",
            a.price::text AS "servicePrice"
     FROM "WhatsAppTask" t
     JOIN "Customer" c ON c.id = t."customerId"
     LEFT JOIN "Appointment" a ON a.id = t."appointmentId"
     LEFT JOIN "Service" s ON s.id = a."serviceId"
     WHERE t.id = $1`,[e]);return T(p.rows[0])}async function W(t,e,a){let{rowCount:i}=await n.pool.query(`UPDATE "WhatsAppTask"
     SET status = 'SKIPPED'::"WhatsAppTaskStatus", "updatedAt" = NOW()
     WHERE id = $2 AND "organizationId" = $1 AND status = 'PENDING'::"WhatsAppTaskStatus"`,[t,e]);return!!i&&(await n.pool.query(`UPDATE "ReviewRequest"
     SET status = 'SKIPPED'::"ReviewRequestStatus", "updatedAt" = NOW()
     WHERE "whatsappTaskId" = $1 AND status = 'PENDING'::"ReviewRequestStatus"`,[e]),await (0,r.writeAuditLog)({organizationId:t,entityType:"WhatsAppTask",entityId:e,action:"SKIPPED",actorId:a.id,actorName:a.name}),!0)}async function w(t,e,a,i){let{rowCount:o}=await n.pool.query(`UPDATE "WhatsAppTask"
     SET "staffOutcome" = $3::"WhatsAppStaffOutcome",
         "outcomeAt" = NOW(),
         "outcomeById" = $4,
         "updatedAt" = NOW()
     WHERE id = $2 AND "organizationId" = $1 AND status = 'SENT'::"WhatsAppTaskStatus"`,[t,e,a,i.id]);return!!o&&(await (0,r.writeAuditLog)({organizationId:t,entityType:"WhatsAppTask",entityId:e,action:"OUTCOME",actorId:i.id,actorName:i.name,after:{outcome:a}}),!0)}async function $(t){await E(t);let{rows:e}=await n.pool.query(`SELECT id, name, type::text, body, active, "isDefault"
     FROM "WhatsAppTemplate"
     WHERE "organizationId" = $1
     ORDER BY type, "isDefault" DESC, name`,[t]);return e.map(t=>I(t))}async function v(t,e,a){if(!p.Bk.includes(e.type))throw Error("Type de mod\xe8le invalide.");let i=u("wtpl");e.isDefault&&await n.pool.query(`UPDATE "WhatsAppTemplate" SET "isDefault" = false, "updatedAt" = NOW()
       WHERE "organizationId" = $1 AND type = $2::"WhatsAppTaskType"`,[t,e.type]),await n.pool.query(`INSERT INTO "WhatsAppTemplate" (
      id, "organizationId", name, type, body, active, "isDefault", "updatedAt"
    ) VALUES ($1,$2,$3,$4::"WhatsAppTaskType",$5,$6,$7,NOW())`,[i,t,e.name,e.type,e.body,e.active??!0,e.isDefault??!1]),await (0,r.writeAuditLog)({organizationId:t,entityType:"WhatsAppTemplate",entityId:i,action:"CREATE",actorId:a.id,actorName:a.name});let{rows:o}=await n.pool.query('SELECT id, name, type::text, body, active, "isDefault" FROM "WhatsAppTemplate" WHERE id = $1',[i]);return I(o[0])}async function L(t,e,a){let i=await n.pool.query('SELECT type::text AS type FROM "WhatsAppTemplate" WHERE id = $1 AND "organizationId" = $2',[e.id,t]);if(!i.rows[0])return null;e.isDefault&&await n.pool.query(`UPDATE "WhatsAppTemplate" SET "isDefault" = false, "updatedAt" = NOW()
       WHERE "organizationId" = $1 AND type = $2::"WhatsAppTaskType" AND id <> $3`,[t,i.rows[0].type,e.id]);let o=['"updatedAt" = NOW()'],s=[t,e.id],p=3;void 0!==e.name&&(o.push(`name = $${p}`),s.push(e.name),p++),void 0!==e.body&&(o.push(`body = $${p}`),s.push(e.body),p++),void 0!==e.active&&(o.push(`active = $${p}`),s.push(e.active),p++),void 0!==e.isDefault&&(o.push(`"isDefault" = $${p}`),s.push(e.isDefault),p++),await n.pool.query(`UPDATE "WhatsAppTemplate" SET ${o.join(", ")} WHERE "organizationId" = $1 AND id = $2`,s),await (0,r.writeAuditLog)({organizationId:t,entityType:"WhatsAppTemplate",entityId:e.id,action:"UPDATE",actorId:a.id,actorName:a.name});let{rows:d}=await n.pool.query('SELECT id, name, type::text, body, active, "isDefault" FROM "WhatsAppTemplate" WHERE id = $1',[e.id]);return d[0]?I(d[0]):null}async function C(t,e){await E(t);let a=await y(t,"APPOINTMENT_CONFIRMATION");if(!a)return;let{rows:i}=await n.pool.query(`SELECT a."customerId", c.phone, c."firstName", c."lastName",
            a."startAt", s.name AS "serviceName", a.price::text,
            st."firstName" AS "staffFirstName"
     FROM "Appointment" a
     JOIN "Customer" c ON c.id = a."customerId"
     JOIN "Service" s ON s.id = a."serviceId"
     JOIN "Staff" st ON st.id = a."staffId"
     WHERE a.id = $1 AND a."organizationId" = $2
       AND c.phone IS NOT NULL AND c.phone <> ''`,[e,t]),o=i[0];if(!o)return;let s=await S(t),r=new Date(o.startAt),p=N(a.body,{customer:{firstName:o.firstName,lastName:o.lastName},appointment:{date:A(r),time:l(r)},service:{name:o.serviceName,price:`${o.price} MAD`},staff:{firstName:o.staffFirstName},organization:{name:s.name,phone:s.phone??"",address:s.address??""}});await O(t,{customerId:o.customerId,appointmentId:e,templateId:a.id,type:"APPOINTMENT_CONFIRMATION",messageSnapshot:p,phoneSnapshot:o.phone,scheduledFor:new Date,idempotencyKey:`wa:online_confirm:${e}`})}async function P(t){await E(t.organizationId);let e=await y(t.organizationId,"WAITING_LIST");if(!e)return;let{rows:a}=await n.pool.query(`SELECT c.phone, c."firstName", c."lastName",
            s.name AS "serviceName", s.price::text,
            o.slug
     FROM "Customer" c
     JOIN "Service" s ON s.id = $3
     JOIN "Organization" o ON o.id = $1
     WHERE c.id = $2 AND c."organizationId" = $1
       AND c.phone IS NOT NULL AND c.phone <> ''`,[t.organizationId,t.customerId,t.serviceId]),i=a[0];if(!i)return;let o=await S(t.organizationId),r=(0,s.bZ)(),p=r?`${r}/book/${i.slug}/`:`/book/${i.slug}/`,d=N(e.body,{customer:{firstName:i.firstName,lastName:i.lastName},appointment:{date:A(t.startAt),time:l(t.startAt)},service:{name:i.serviceName,price:`${i.price} MAD`},organization:{name:o.name,phone:o.phone??"",address:o.address??""},bookingUrl:p});await O(t.organizationId,{customerId:t.customerId,appointmentId:t.appointmentId,templateId:e.id,type:"WAITING_LIST",messageSnapshot:d,phoneSnapshot:i.phone,scheduledFor:new Date,idempotencyKey:`wa:waiting_list:${t.waitingListEntryId}:${t.appointmentId}`})}async function M(t){let{rows:e}=await n.pool.query(`SELECT t.*,
            c."firstName" || ' ' || c."lastName" AS "customerName",
            a."startAt" AS "appointmentStartAt",
            s.name AS "serviceName",
            a.price::text AS "servicePrice"
     FROM "WhatsAppTask" t
     JOIN "Customer" c ON c.id = t."customerId"
     LEFT JOIN "Appointment" a ON a.id = t."appointmentId"
     LEFT JOIN "Service" s ON s.id = a."serviceId"
     WHERE t.id = $1`,[t]);return e[0]?T(e[0]):null}async function F(t,e,a){var i;let{rows:o}=await n.pool.query(`SELECT phone, "marketingWhatsapp", "firstName"
     FROM "Customer"
     WHERE id = $1 AND "organizationId" = $2 AND "deletedAt" IS NULL`,[e.customerId,t]),s=o[0];if(!s)throw Error("CUSTOMER_NOT_FOUND");if(!s.phone?.trim())throw Error("CUSTOMER_NO_PHONE");if(i=e.type,p.gf.has(i)&&!s.marketingWhatsapp&&!e.allowWithoutMarketingOptIn)throw Error("CUSTOMER_NO_MARKETING_OPTIN");if(e.appointmentId){let{rows:a}=await n.pool.query(`SELECT "customerId" FROM "Appointment"
       WHERE id = $1 AND "organizationId" = $2`,[e.appointmentId,t]);if(!a[0])throw Error("APPOINTMENT_NOT_FOUND");if(a[0].customerId!==e.customerId)throw Error("APPOINTMENT_MISMATCH")}let d=u("wtask"),c=`wa:ai_marketing:${d}`;try{await n.pool.query(`INSERT INTO "WhatsAppTask" (
        id, "organizationId", "customerId", "appointmentId", "templateId",
        type, status, "messageSnapshot", "phoneSnapshot", "scheduledFor",
        "idempotencyKey", "attributionSource", "updatedAt"
      ) VALUES (
        $1,$2,$3,$4,NULL,$5::"WhatsAppTaskType",'PENDING'::"WhatsAppTaskStatus",
        $6,$7,NOW(),$8,$9,NOW()
      )`,[d,t,e.customerId,e.appointmentId??null,e.type,e.message,s.phone,c,e.attributionSource])}catch(a){if(a instanceof Error&&a.message.includes("attributionSource"))await n.pool.query(`INSERT INTO "WhatsAppTask" (
          id, "organizationId", "customerId", "appointmentId", "templateId",
          type, status, "messageSnapshot", "phoneSnapshot", "scheduledFor",
          "idempotencyKey", "updatedAt"
        ) VALUES (
          $1,$2,$3,$4,NULL,$5::"WhatsAppTaskType",'PENDING'::"WhatsAppTaskStatus",
          $6,$7,NOW(),$8,NOW()
        )`,[d,t,e.customerId,e.appointmentId??null,e.type,e.message,s.phone,c]);else throw a}await (0,r.writeAuditLog)({organizationId:t,entityType:"WhatsAppTask",entityId:d,action:"AI_WHATSAPP_DRAFT",actorId:a.id,actorName:a.name,after:{type:e.type,attributionSource:e.attributionSource,customerId:e.customerId,autoSent:!1}});let m=await M(d);if(!m)throw Error("TASK_CREATE_FAILED");return m}i()}catch(t){i(t)}})},84678:(t,e,a)=>{a.d(e,{Bk:()=>i,gf:()=>o});let i=["APPOINTMENT_CONFIRMATION","APPOINTMENT_REMINDER","APPOINTMENT_FOLLOWUP","REACTIVATION","BIRTHDAY","REVIEW_REQUEST","PROMOTION","PACKAGE_EXPIRING","LOYALTY_REWARD","WAITING_LIST","POST_VISIT"],o=new Set(["REACTIVATION","BIRTHDAY","PROMOTION","LOYALTY_REWARD","PACKAGE_EXPIRING","POST_VISIT"])}};