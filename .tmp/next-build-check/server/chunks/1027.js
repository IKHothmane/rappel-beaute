"use strict";exports.id=1027,exports.ids=[1027],exports.modules={95846:(t,e,a)=>{a.d(e,{DY:()=>n,_b:()=>r,iT:()=>i});var s=a(53645);function n(t){return t.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"").slice(0,80)}function r(t){let e=((t.baseUrl??(0,s.bZ)())||s.Ey.appUrl).replace(/\/$/,""),a=new URL(`${e}/book/${encodeURIComponent(t.slug)}/`);return t.source?.trim()&&a.searchParams.set("source",t.source.trim().slice(0,40)),t.service?.trim()&&a.searchParams.set("service",t.service.trim().slice(0,80)),t.staff?.trim()&&a.searchParams.set("staff",t.staff.trim().slice(0,80)),a.toString()}function i(t){return t instanceof URLSearchParams?{service:t.get("service"),staff:t.get("staff"),source:t.get("source")}:{service:t.service??null,staff:t.staff??null,source:t.source??null}}},21027:(t,e,a)=>{a.a(t,async(t,s)=>{try{a.d(e,{Qn:()=>I,Rq:()=>W,dv:()=>C,getPostVisitAnalytics:()=>v,jf:()=>D,syncPostVisitTasks:()=>R});var n=a(84770),r=a(8678),i=a(2192),o=a(95846),u=a(17729),p=a(39212),d=a(60168),c=t([r,i,u,p]);[r,i,u,p]=c.then?(await c)():c;let P=new r.Pool({connectionString:process.env.DATABASE_URL});function m(t){return`${t}_${(0,n.randomBytes)(8).toString("hex")}`}let L=[...p.sB,"POST_VISIT"];function N(t,e){let a=null!=t&&t>0?t:null;return null!=a?a:e>0?e:null}function A(t){return`postvisit:${t}`}function l(t){return{enabled:!1!==t.enabled,defaultReturnDays:Number(t.defaultReturnDays)||30,maxOverdueDays:Number(t.maxOverdueDays)||14,minimumDaysBetweenMarketingMessages:Number(t.minimumDaysBetweenMarketingMessages)||30,respectFutureAppointments:!1!==t.respectFutureAppointments,respectOptIn:!1!==t.respectOptIn,autoCreateWhatsAppTasks:!1!==t.autoCreateWhatsAppTasks}}async function I(t){let e=await P.query('SELECT * FROM "PostVisitSettings" WHERE "organizationId" = $1',[t]);if(e.rows[0])return l(e.rows[0]);await P.query(`INSERT INTO "PostVisitSettings" (id, "organizationId", "updatedAt")
     VALUES ($1,$2,NOW())
     ON CONFLICT ("organizationId") DO NOTHING`,[m("pvs"),t]);let a=await P.query('SELECT * FROM "PostVisitSettings" WHERE "organizationId" = $1',[t]);return l(a.rows[0])}async function D(t,e,a){await I(t);let s=['"updatedAt" = NOW()'],n=[t],r=2,o=(t,e)=>{s.push(`"${t}" = $${r}`),n.push(e),r++};return void 0!==e.enabled&&o("enabled",e.enabled),void 0!==e.defaultReturnDays&&o("defaultReturnDays",e.defaultReturnDays),void 0!==e.maxOverdueDays&&o("maxOverdueDays",e.maxOverdueDays),void 0!==e.minimumDaysBetweenMarketingMessages&&o("minimumDaysBetweenMarketingMessages",e.minimumDaysBetweenMarketingMessages),void 0!==e.respectFutureAppointments&&o("respectFutureAppointments",e.respectFutureAppointments),void 0!==e.respectOptIn&&o("respectOptIn",e.respectOptIn),void 0!==e.autoCreateWhatsAppTasks&&o("autoCreateWhatsAppTasks",e.autoCreateWhatsAppTasks),await P.query(`UPDATE "PostVisitSettings" SET ${s.join(", ")} WHERE "organizationId" = $1`,n),await (0,i.writeAuditLog)({organizationId:t,entityType:"PostVisitSettings",entityId:t,action:"UPDATE",actorId:a.id,actorName:a.name,after:e}),I(t)}async function E(t){let{rows:e}=await P.query('SELECT name, phone, address, slug FROM "Organization" WHERE id = $1',[t]);return e[0]??{name:"",phone:"",address:"",slug:""}}async function T(t){let{rows:e}=await P.query(`SELECT id, body FROM "WhatsAppTemplate"
     WHERE "organizationId" = $1 AND type = 'POST_VISIT'::"WhatsAppTaskType" AND active = true
     ORDER BY "isDefault" DESC, "updatedAt" DESC
     LIMIT 1`,[t]);return e[0]??null}function S(t){return t.toLocaleDateString("fr-FR",{day:"numeric",month:"long",year:"numeric",timeZone:"Africa/Casablanca"})}function g(t,e){let a=new Date(t.getTime());return a.setUTCDate(a.getUTCDate()+e),a}async function y(t,e){let a=L.map(t=>`'${t}'`).join(","),{rows:s}=await P.query(`SELECT "sentAt" FROM "WhatsAppTask"
     WHERE "organizationId" = $1 AND "customerId" = $2
       AND status = 'SENT'::"WhatsAppTaskStatus"
       AND type::text IN (${a})
       AND "sentAt" IS NOT NULL
     ORDER BY "sentAt" DESC
     LIMIT 1`,[t,e]);return s[0]?.sentAt??null}async function O(t,e){let{rows:a}=await P.query(`SELECT COUNT(*)::text AS c FROM "Appointment"
     WHERE "organizationId" = $1 AND "customerId" = $2
       AND status IN ('PENDING','CONFIRMED')
       AND "startAt" > NOW()`,[t,e]);return parseInt(a[0]?.c??"0",10)>0}function h(t,e){return(0,o._b)({slug:t,service:(0,o.DY)(e),source:"post_visit"})}function f(t){return(0,u.O3)(t.templateBody,{customer:{firstName:t.firstName,lastName:t.lastName},service:{name:t.serviceName,price:""},lastService:{name:t.serviceName},lastVisit:{date:S(t.endAt),days:""},recommendedDate:S(t.recommendedAt),organization:{name:t.org.name,phone:t.org.phone??"",address:t.org.address??""},bookingUrl:t.bookingUrl})}async function w(t){if("COMPLETED"!==t.appointmentStatus)return{ok:!1,reason:"RDV non termin\xe9"};if(null==t.returnDays||t.returnDays<=0)return{ok:!1,reason:"Aucun d\xe9lai de retour"};if(!t.phone?.trim())return{ok:!1,reason:"T\xe9l\xe9phone absent"};if(t.settings.respectOptIn&&!t.marketingWhatsapp)return{ok:!1,reason:"Opt-in WhatsApp requis"};if(t.settings.respectFutureAppointments&&t.hasFutureAppointment)return{ok:!1,reason:"RDV futur existant"};if(t.alreadyHasTask)return{ok:!1,reason:"Relance d\xe9j\xe0 cr\xe9\xe9e"};if(t.lastMarketingSentAt){let e=864e5*t.settings.minimumDaysBetweenMarketingMessages;if(Date.now()-t.lastMarketingSentAt.getTime()<e)return{ok:!1,reason:"Anti-spam marketing"}}return{ok:!0}}async function R(t){let e=await I(t);if(!e.enabled||!e.autoCreateWhatsAppTasks)return await k(t,e),{created:0};await (0,u.Cc)(t);let a=await T(t);if(!a)return{created:0};let s=await E(t),{rows:n}=await P.query(`SELECT a.id, a."customerId", c."firstName", c."lastName", c.phone,
            c."marketingWhatsapp", s.id AS "serviceId", s.name AS "serviceName",
            s."recommendedReturnDays", a."endAt"
     FROM "Appointment" a
     JOIN "Customer" c ON c.id = a."customerId"
     JOIN "Service" s ON s.id = a."serviceId"
     WHERE a."organizationId" = $1
       AND a.status = 'COMPLETED'
       AND c."deletedAt" IS NULL
       AND c.phone IS NOT NULL AND TRIM(c.phone) <> ''
       AND NOT EXISTS (
         SELECT 1 FROM "WhatsAppTask" t
         WHERE t."organizationId" = $1
           AND t."idempotencyKey" = 'postvisit:' || a.id
       )`,[t]),r=0,i=Date.now();for(let o of n){let n=N(o.recommendedReturnDays,e.defaultReturnDays);if(null==n)continue;let u=g(new Date(o.endAt),n),p=g(u,-0),d=g(u,e.maxOverdueDays);if(i<p.getTime()||i>d.getTime())continue;let c=!!e.respectFutureAppointments&&await O(t,o.customerId),l=await y(t,o.customerId);if(!(await w({organizationId:t,appointmentStatus:"COMPLETED",phone:o.phone,marketingWhatsapp:o.marketingWhatsapp,returnDays:n,settings:e,hasFutureAppointment:c,lastMarketingSentAt:l,alreadyHasTask:!1})).ok)continue;let I=h(s.slug,o.serviceName),D=f({templateBody:a.body,org:{name:s.name,phone:s.phone??"",address:s.address??"",slug:s.slug},firstName:o.firstName,lastName:o.lastName,serviceName:o.serviceName,endAt:new Date(o.endAt),recommendedAt:u,bookingUrl:I}),E=m("wtask"),T=A(o.id);(await P.query(`INSERT INTO "WhatsAppTask" (
        id, "organizationId", "customerId", "appointmentId", "templateId", type, status,
        "messageSnapshot", "phoneSnapshot", "scheduledFor", "idempotencyKey", "updatedAt"
      ) VALUES (
        $1,$2,$3,$4,$5,'POST_VISIT'::"WhatsAppTaskType",'PENDING'::"WhatsAppTaskStatus",
        $6,$7,$8,$9,NOW()
      )
      ON CONFLICT ("organizationId", "idempotencyKey") DO NOTHING
      RETURNING id`,[E,t,o.customerId,o.id,a.id,D,o.phone,u,T])).rows[0]&&r++}return await k(t,e),{created:r}}async function k(t,e){e.respectOptIn&&await P.query(`UPDATE "WhatsAppTask" t
       SET status = 'CANCELLED'::"WhatsAppTaskStatus", "updatedAt" = NOW()
       FROM "Customer" c
       WHERE t."customerId" = c.id
         AND t."organizationId" = $1
         AND t.type = 'POST_VISIT'::"WhatsAppTaskType"
         AND t.status = 'PENDING'::"WhatsAppTaskStatus"
         AND c."marketingWhatsapp" = false`,[t]),e.respectFutureAppointments&&await P.query(`UPDATE "WhatsAppTask" t
       SET status = 'CANCELLED'::"WhatsAppTaskStatus", "updatedAt" = NOW()
       WHERE t."organizationId" = $1
         AND t.type = 'POST_VISIT'::"WhatsAppTaskType"
         AND t.status = 'PENDING'::"WhatsAppTaskStatus"
         AND EXISTS (
           SELECT 1 FROM "Appointment" a
           WHERE a."organizationId" = $1
             AND a."customerId" = t."customerId"
             AND a.status IN ('PENDING','CONFIRMED')
             AND a."startAt" > NOW()
         )`,[t]),await P.query(`UPDATE "WhatsAppTask" t
     SET status = 'CANCELLED'::"WhatsAppTaskStatus", "updatedAt" = NOW()
     FROM "Appointment" a
     WHERE t."appointmentId" = a.id
       AND t."organizationId" = $1
       AND t.type = 'POST_VISIT'::"WhatsAppTaskType"
       AND t.status = 'PENDING'::"WhatsAppTaskStatus"
       AND a.status <> 'COMPLETED'`,[t])}async function W(t,e){let a=await I(t);e?.sync!==!1&&a.enabled&&a.autoCreateWhatsAppTasks&&await R(t);let s=await E(t),n=await T(t),{rows:r}=await P.query(`SELECT t.id AS "taskId", t."appointmentId", t."customerId",
            c."firstName", c."lastName", c.phone,
            s.id AS "serviceId", s.name AS "serviceName",
            a."endAt", t."scheduledFor", t.status::text, t."messageSnapshot",
            s."recommendedReturnDays"
     FROM "WhatsAppTask" t
     JOIN "Appointment" a ON a.id = t."appointmentId"
     JOIN "Customer" c ON c.id = t."customerId"
     JOIN "Service" s ON s.id = a."serviceId"
     WHERE t."organizationId" = $1
       AND t.type = 'POST_VISIT'::"WhatsAppTaskType"
     ORDER BY t."scheduledFor" DESC
     LIMIT 100`,[t]),i=r.map(t=>{let e=t.status,n=N(t.recommendedReturnDays,a.defaultReturnDays)??a.defaultReturnDays,r=h(s.slug,t.serviceName);return{appointmentId:t.appointmentId,customerId:t.customerId,customerName:`${t.firstName} ${t.lastName}`.trim(),phone:t.phone,serviceId:t.serviceId,serviceName:t.serviceName,lastVisitAt:new Date(t.endAt).toISOString(),recommendedAt:new Date(t.scheduledFor).toISOString(),returnDays:n,status:e,statusLabel:d.m[e]??e,whatsappTaskId:t.taskId,messagePreview:t.messageSnapshot,waLink:"PENDING"===t.status&&t.phone?(0,u.FV)(t.phone,t.messageSnapshot):null,bookingUrl:r,blockReason:null,canPrepare:"PENDING"===t.status}}),{rows:o}=await P.query(`SELECT a.id, a."customerId", c."firstName", c."lastName", c.phone,
            c."marketingWhatsapp", s.id AS "serviceId", s.name AS "serviceName",
            s."recommendedReturnDays", a."endAt"
     FROM "Appointment" a
     JOIN "Customer" c ON c.id = a."customerId"
     JOIN "Service" s ON s.id = a."serviceId"
     WHERE a."organizationId" = $1
       AND a.status = 'COMPLETED'
       AND c."deletedAt" IS NULL
       AND NOT EXISTS (
         SELECT 1 FROM "WhatsAppTask" t
         WHERE t."organizationId" = $1 AND t."idempotencyKey" = 'postvisit:' || a.id
       )
     ORDER BY a."endAt" DESC
     LIMIT 50`,[t]);for(let t of o){let e=N(t.recommendedReturnDays,a.defaultReturnDays);if(null==e)continue;let r=g(new Date(t.endAt),e);if(r.getTime()<=Date.now())continue;let o=h(s.slug,t.serviceName),u=n?f({templateBody:n.body,org:{name:s.name,phone:s.phone??"",address:s.address??"",slug:s.slug},firstName:t.firstName,lastName:t.lastName,serviceName:t.serviceName,endAt:new Date(t.endAt),recommendedAt:r,bookingUrl:o}):null;i.push({appointmentId:t.id,customerId:t.customerId,customerName:`${t.firstName} ${t.lastName}`.trim(),phone:t.phone,serviceId:t.serviceId,serviceName:t.serviceName,lastVisitAt:new Date(t.endAt).toISOString(),recommendedAt:r.toISOString(),returnDays:e,status:"UPCOMING",statusLabel:d.m.UPCOMING,whatsappTaskId:null,messagePreview:u,waLink:null,bookingUrl:o,blockReason:null,canPrepare:!1})}i.sort((t,e)=>new Date(t.recommendedAt).getTime()-new Date(e.recommendedAt).getTime());let p={eligible:i.filter(t=>"PENDING"===t.status||"UPCOMING"===t.status).length,prepared:i.filter(t=>"PENDING"===t.status).length,sent:i.filter(t=>"SENT"===t.status).length,upcoming:i.filter(t=>"UPCOMING"===t.status).length};return{items:i,kpis:p,settings:a}}async function C(t,e,a){let s=A(e);await P.query(`UPDATE "WhatsAppTask"
     SET status = 'SKIPPED'::"WhatsAppTaskStatus", "updatedAt" = NOW()
     WHERE "organizationId" = $1
       AND "idempotencyKey" = $2
       AND status = 'PENDING'::"WhatsAppTaskStatus"`,[t,s]),await (0,i.writeAuditLog)({organizationId:t,entityType:"PostVisit",entityId:e,action:"SKIP",actorId:a.id,actorName:a.name})}async function v(t,e){let a=e?.start??new Date(Date.now()-2592e6),s=e?.end??new Date,{rows:n}=await P.query(`SELECT status::text, COUNT(*)::text AS n
     FROM "WhatsAppTask"
     WHERE "organizationId" = $1
       AND type = 'POST_VISIT'::"WhatsAppTaskType"
       AND "createdAt" >= $2 AND "createdAt" <= $3
     GROUP BY status`,[t,a,s]),r=Object.fromEntries(n.map(t=>[t.status,Number(t.n)])),i=(r.PENDING??0)+(r.SENT??0)+(r.SKIPPED??0)+(r.CANCELLED??0),o=r.SENT??0,{rows:u}=await P.query(`SELECT COUNT(*)::text AS n FROM "Appointment"
     WHERE "organizationId" = $1
       AND "attributionSource" = 'post_visit'
       AND "createdAt" >= $2 AND "createdAt" <= $3`,[t,a,s]),{rows:p}=await P.query(`SELECT COUNT(*)::text AS n FROM "Appointment"
     WHERE "organizationId" = $1
       AND "attributionSource" = 'post_visit'
       AND status = 'COMPLETED'
       AND "startAt" >= $2 AND "startAt" <= $3`,[t,a,s]);return{eligible:i,prepared:i,sent:o,bookingsAfter:parseInt(u[0]?.n??"0",10),completedAfter:parseInt(p[0]?.n??"0",10)}}s()}catch(t){s(t)}})},60168:(t,e,a)=>{a.d(e,{m:()=>s});let s={PENDING:"\xc0 pr\xe9parer",SENT:"Envoy\xe9e",SKIPPED:"Ignor\xe9e",CANCELLED:"Annul\xe9e",UPCOMING:"Planifi\xe9e"}}};