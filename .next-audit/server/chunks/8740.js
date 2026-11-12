"use strict";!function(){try{var t="undefined"!=typeof window?window:"undefined"!=typeof global?global:"undefined"!=typeof self?self:{},e=(new t.Error).stack;e&&(t._sentryDebugIds=t._sentryDebugIds||{},t._sentryDebugIds[e]="8921f031-3401-4481-861e-c6aeed90760f",t._sentryDebugIdIdentifier="sentry-dbid-8921f031-3401-4481-861e-c6aeed90760f")}catch(t){}}(),exports.id=8740,exports.ids=[8740],exports.modules={18740:(t,e,r)=>{r.a(t,async(t,i)=>{try{r.d(e,{A3:()=>I,EP:()=>m,n0:()=>c,notifyWaitingListOnCancellation:()=>N});var a=r(84770),n=r(8678),o=r(90831),s=r(66085),d=r(80437),u=t([n,s]);[n,s]=u.then?(await u)():u;let A=(0,o.S)(new n.Pool({connectionString:process.env.DATABASE_URL}));function f(t){var e;return{id:String(t.id),organizationId:String(t.organizationId),customerId:String(t.customerId),customerName:`${t.customerFirstName??""} ${t.customerLastName??""}`.trim(),customerPhone:String(t.customerPhone??""),serviceId:String(t.serviceId),serviceName:String(t.serviceName??""),staffId:t.staffId??null,staffName:t.staffFirstName?`${t.staffFirstName} ${t.staffLastName??""}`.trim():null,preferredDate:(e=t.preferredDate,"string"==typeof e?e.slice(0,10):e.toLocaleDateString("en-CA",{timeZone:"Africa/Casablanca"})),preferredTimeFrom:t.preferredTimeFrom??null,preferredTimeTo:t.preferredTimeTo??null,status:t.status,notes:t.notes??null,notifiedAt:t.notifiedAt?new Date(t.notifiedAt).toISOString():null,expiresAt:t.expiresAt?new Date(t.expiresAt).toISOString():null,createdAt:new Date(t.createdAt).toISOString()}}let g=`
  SELECT w.*,
    c."firstName" AS "customerFirstName",
    c."lastName" AS "customerLastName",
    c.phone AS "customerPhone",
    s.name AS "serviceName",
    st."firstName" AS "staffFirstName",
    st."lastName" AS "staffLastName"
  FROM "WaitingListEntry" w
  JOIN "Customer" c ON c.id = w."customerId"
  JOIN "Service" s ON s.id = w."serviceId"
  LEFT JOIN "Staff" st ON st.id = w."staffId"
`;async function c(t,e){await l(t);let r=[t],i=['w."organizationId" = $1'],a=2;e?.status&&(i.push(`w.status = $${a++}::"WaitingListStatus"`),r.push(e.status)),e?.serviceId&&(i.push(`w."serviceId" = $${a++}`),r.push(e.serviceId));let{rows:n}=await A.query(`${g} WHERE ${i.join(" AND ")}
     ORDER BY w."preferredDate" ASC, w."createdAt" ASC
     LIMIT 200`,r);return n.map(t=>f(t))}async function m(t,e,r){if(!(await A.query(`SELECT id FROM "Customer"
     WHERE id = $1 AND "organizationId" = $2 AND "deletedAt" IS NULL`,[e.customerId,t])).rows[0])throw Error("CUSTOMER_NOT_FOUND");if(!(await A.query('SELECT id FROM "Service" WHERE id = $1 AND "organizationId" = $2 AND active = true',[e.serviceId,t])).rows[0])throw Error("SERVICE_NOT_FOUND");if(e.staffId&&!(await A.query('SELECT id FROM "Staff" WHERE id = $1 AND "organizationId" = $2 AND "deletedAt" IS NULL',[e.staffId,t])).rows[0])throw Error("STAFF_NOT_FOUND");let i=`wle_${(0,a.randomBytes)(6).toString("hex")}`,n=new Date(e.expiresAt?e.expiresAt:Date.now()+12096e5);await A.query(`INSERT INTO "WaitingListEntry" (
      id, "organizationId", "customerId", "serviceId", "staffId",
      "preferredDate", "preferredTimeFrom", "preferredTimeTo",
      status, notes, "expiresAt", "updatedAt"
    ) VALUES (
      $1,$2,$3,$4,$5,$6::date,$7,$8,'WAITING'::"WaitingListStatus",$9,$10,NOW()
    )`,[i,t,e.customerId,e.serviceId,e.staffId??null,e.preferredDate.slice(0,10),e.preferredTimeFrom??null,e.preferredTimeTo??null,e.notes?.trim()||null,n]),await (0,s.writeAuditLog)({organizationId:t,actorId:r.id,actorName:r.name??void 0,entityType:"WaitingListEntry",entityId:i,action:"CREATE",after:{serviceId:e.serviceId,customerId:e.customerId}}).catch(()=>void 0);let{rows:o}=await A.query(`${g} WHERE w.id = $1`,[i]);return f(o[0])}async function I(t,e,r,i){let{rowCount:a}=await A.query(`UPDATE "WaitingListEntry"
     SET status = $1::"WaitingListStatus",
         "notifiedAt" = CASE
           WHEN $1 = 'NOTIFIED' THEN COALESCE("notifiedAt", NOW())
           ELSE "notifiedAt"
         END,
         "updatedAt" = NOW()
     WHERE id = $2 AND "organizationId" = $3`,[r,e,t]);if(!a)return null;await (0,s.writeAuditLog)({organizationId:t,actorId:i.id,actorName:i.name??void 0,entityType:"WaitingListEntry",entityId:e,action:"UPDATE",after:{status:r}}).catch(()=>void 0);let{rows:n}=await A.query(`${g} WHERE w.id = $1 AND w."organizationId" = $2`,[e,t]);return n[0]?f(n[0]):null}async function l(t){let{rows:e}=await A.query(`UPDATE "WaitingListEntry"
     SET status = 'EXPIRED'::"WaitingListStatus", "updatedAt" = NOW()
     WHERE "organizationId" = $1
       AND status = 'WAITING'::"WaitingListStatus"
       AND "expiresAt" IS NOT NULL
       AND "expiresAt" < NOW()
     RETURNING id`,[t]);return e.length}async function N(t){await l(t.organizationId);let e=(0,d.Ao)(t.startAt),i=(0,d.db)(t.startAt),{rows:a}=await A.query(`SELECT id, "customerId", "preferredTimeFrom", "preferredTimeTo", "staffId"
     FROM "WaitingListEntry"
     WHERE "organizationId" = $1
       AND status = 'WAITING'::"WaitingListStatus"
       AND "serviceId" = $2
       AND "preferredDate" = $3::date
       AND ("staffId" IS NULL OR "staffId" = $4)
     ORDER BY "createdAt" ASC
     LIMIT 5`,[t.organizationId,t.serviceId,e,t.staffId]),n=a.filter(t=>(!t.preferredTimeFrom||!(i<t.preferredTimeFrom))&&(!t.preferredTimeTo||!(i>t.preferredTimeTo)));if(!n.length)return{notified:0};let{enqueueWaitingListOffer:o}=await Promise.all([r.e(4239),r.e(528)]).then(r.bind(r,34239)),s=0;for(let e of n)try{await o({organizationId:t.organizationId,customerId:e.customerId,appointmentId:t.appointmentId,waitingListEntryId:e.id,serviceId:t.serviceId,startAt:t.startAt}),await I(t.organizationId,e.id,"NOTIFIED",t.actor),s+=1}catch(t){console.error("[notifyWaitingListOnCancellation]",t)}return{notified:s}}i()}catch(t){i(t)}})},80437:(t,e,r)=>{r.d(e,{Ao:()=>E,Ct:()=>l,Is:()=>A,Jp:()=>T,Ld:()=>u,bR:()=>m,db:()=>y,ho:()=>N,kG:()=>c,mv:()=>g,x:()=>i,xo:()=>I});let i=process.env.TIMEZONE?.trim()||"Africa/Casablanca",a=Date.parse("2026-09-20T01:00:00.000Z"),n=new Set(["Africa/Casablanca","Africa/El_Aaiun"]),o=new Intl.DateTimeFormat("en-US",{timeZone:i,hour12:!1,year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",second:"2-digit",weekday:"short"}),s={Sun:0,Mon:1,Tue:2,Wed:3,Thu:4,Fri:5,Sat:6},d=null;function u(t){let e=o.formatToParts(t),r=t=>e.find(e=>e.type===t)?.value??"0",u={year:Number(r("year")),month:Number(r("month")),day:Number(r("day")),hour:Number(r("hour"))%24,minute:Number(r("minute")),second:Number(r("second")),weekday:s[r("weekday")]??0};return t.getTime()>=a&&function(){if(!n.has(i))return!1;if(null!==d)return d;let t=o.formatToParts(new Date("2026-10-14T12:00:00.000Z"));return d=13==Number(t.find(t=>"hour"===t.type)?.value??"0")%24}()?function(t){let e=new Date(Date.UTC(t.year,t.month-1,t.day,t.hour,t.minute,t.second)-36e5);return{year:e.getUTCFullYear(),month:e.getUTCMonth()+1,day:e.getUTCDate(),hour:e.getUTCHours(),minute:e.getUTCMinutes(),second:e.getUTCSeconds(),weekday:e.getUTCDay()}}(u):u}function f(t){let e=u(t);return Date.UTC(e.year,e.month-1,e.day,e.hour,e.minute,e.second,t.getUTCMilliseconds())-t.getTime()}function c(t,e,r,i=0,a=0){let n=Date.UTC(t.year,t.month-1,t.day,e,r,i,a),o=n-f(new Date(n));return new Date(n-f(new Date(o)))}function m(t){return u(t).weekday}function I(t,e){let[r,i]=e.split(":").map(Number);return c(u(t),r,i)}function l(t,e){let[r,i,a]=t.split("-").map(Number),[n,o]=e.split(":").map(Number);return c({year:r,month:i,day:a},n,o)}function N(t,e){let r=u(t),i=u(e);return r.year===i.year&&r.month===i.month&&r.day===i.day}function A(t){return c(u(t),0,0,0,0)}function g(t){return c(u(t),23,59,59,999)}function y(t){let e=u(t);return`${String(e.hour).padStart(2,"0")}:${String(e.minute).padStart(2,"0")}`}function T(t){let e=u(t);return`${String(e.day).padStart(2,"0")}/${String(e.month).padStart(2,"0")}/${e.year}`}function E(t=new Date){let e=u(t),r=String(e.month).padStart(2,"0"),i=String(e.day).padStart(2,"0");return`${e.year}-${r}-${i}`}}};