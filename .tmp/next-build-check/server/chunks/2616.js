"use strict";exports.id=2616,exports.ids=[2616],exports.modules={72616:(t,e,i)=>{i.a(t,async(t,r)=>{try{i.d(e,{A3:()=>f,EP:()=>I,n0:()=>c,notifyWaitingListOnCancellation:()=>m});var a=i(84770),n=i(8678),s=i(2192),o=t([n,s]);[n,s]=o.then?(await o)():o;let A=new n.Pool({connectionString:process.env.DATABASE_URL});function d(t){var e;return{id:String(t.id),organizationId:String(t.organizationId),customerId:String(t.customerId),customerName:`${t.customerFirstName??""} ${t.customerLastName??""}`.trim(),customerPhone:String(t.customerPhone??""),serviceId:String(t.serviceId),serviceName:String(t.serviceName??""),staffId:t.staffId??null,staffName:t.staffFirstName?`${t.staffFirstName} ${t.staffLastName??""}`.trim():null,preferredDate:(e=t.preferredDate,"string"==typeof e?e.slice(0,10):e.toLocaleDateString("en-CA",{timeZone:"Africa/Casablanca"})),preferredTimeFrom:t.preferredTimeFrom??null,preferredTimeTo:t.preferredTimeTo??null,status:t.status,notes:t.notes??null,notifiedAt:t.notifiedAt?new Date(t.notifiedAt).toISOString():null,expiresAt:t.expiresAt?new Date(t.expiresAt).toISOString():null,createdAt:new Date(t.createdAt).toISOString()}}let N=`
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
`;async function c(t,e){await u(t);let i=[t],r=['w."organizationId" = $1'],a=2;e?.status&&(r.push(`w.status = $${a++}::"WaitingListStatus"`),i.push(e.status)),e?.serviceId&&(r.push(`w."serviceId" = $${a++}`),i.push(e.serviceId));let{rows:n}=await A.query(`${N} WHERE ${r.join(" AND ")}
     ORDER BY w."preferredDate" ASC, w."createdAt" ASC
     LIMIT 200`,i);return n.map(t=>d(t))}async function I(t,e,i){if(!(await A.query(`SELECT id FROM "Customer"
     WHERE id = $1 AND "organizationId" = $2 AND "deletedAt" IS NULL`,[e.customerId,t])).rows[0])throw Error("CUSTOMER_NOT_FOUND");if(!(await A.query('SELECT id FROM "Service" WHERE id = $1 AND "organizationId" = $2 AND active = true',[e.serviceId,t])).rows[0])throw Error("SERVICE_NOT_FOUND");if(e.staffId&&!(await A.query('SELECT id FROM "Staff" WHERE id = $1 AND "organizationId" = $2 AND "deletedAt" IS NULL',[e.staffId,t])).rows[0])throw Error("STAFF_NOT_FOUND");let r=`wle_${(0,a.randomBytes)(6).toString("hex")}`,n=new Date(e.expiresAt?e.expiresAt:Date.now()+12096e5);await A.query(`INSERT INTO "WaitingListEntry" (
      id, "organizationId", "customerId", "serviceId", "staffId",
      "preferredDate", "preferredTimeFrom", "preferredTimeTo",
      status, notes, "expiresAt", "updatedAt"
    ) VALUES (
      $1,$2,$3,$4,$5,$6::date,$7,$8,'WAITING'::"WaitingListStatus",$9,$10,NOW()
    )`,[r,t,e.customerId,e.serviceId,e.staffId??null,e.preferredDate.slice(0,10),e.preferredTimeFrom??null,e.preferredTimeTo??null,e.notes?.trim()||null,n]),await (0,s.writeAuditLog)({organizationId:t,actorId:i.id,actorName:i.name??void 0,entityType:"WaitingListEntry",entityId:r,action:"CREATE",after:{serviceId:e.serviceId,customerId:e.customerId}}).catch(()=>void 0);let{rows:o}=await A.query(`${N} WHERE w.id = $1`,[r]);return d(o[0])}async function f(t,e,i,r){let{rowCount:a}=await A.query(`UPDATE "WaitingListEntry"
     SET status = $1::"WaitingListStatus",
         "notifiedAt" = CASE
           WHEN $1 = 'NOTIFIED' THEN COALESCE("notifiedAt", NOW())
           ELSE "notifiedAt"
         END,
         "updatedAt" = NOW()
     WHERE id = $2 AND "organizationId" = $3`,[i,e,t]);if(!a)return null;await (0,s.writeAuditLog)({organizationId:t,actorId:r.id,actorName:r.name??void 0,entityType:"WaitingListEntry",entityId:e,action:"UPDATE",after:{status:i}}).catch(()=>void 0);let{rows:n}=await A.query(`${N} WHERE w.id = $1 AND w."organizationId" = $2`,[e,t]);return n[0]?d(n[0]):null}async function u(t){let{rows:e}=await A.query(`UPDATE "WaitingListEntry"
     SET status = 'EXPIRED'::"WaitingListStatus", "updatedAt" = NOW()
     WHERE "organizationId" = $1
       AND status = 'WAITING'::"WaitingListStatus"
       AND "expiresAt" IS NOT NULL
       AND "expiresAt" < NOW()
     RETURNING id`,[t]);return e.length}async function m(t){await u(t.organizationId);let e=t.startAt.toISOString().slice(0,10),r=t.startAt.toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit",hour12:!1,timeZone:"Africa/Casablanca"}),{rows:a}=await A.query(`SELECT id, "customerId", "preferredTimeFrom", "preferredTimeTo", "staffId"
     FROM "WaitingListEntry"
     WHERE "organizationId" = $1
       AND status = 'WAITING'::"WaitingListStatus"
       AND "serviceId" = $2
       AND "preferredDate" = $3::date
       AND ("staffId" IS NULL OR "staffId" = $4)
     ORDER BY "createdAt" ASC
     LIMIT 5`,[t.organizationId,t.serviceId,e,t.staffId]),n=a.filter(t=>(!t.preferredTimeFrom||!(r<t.preferredTimeFrom))&&(!t.preferredTimeTo||!(r>t.preferredTimeTo)));if(!n.length)return{notified:0};let{enqueueWaitingListOffer:s}=await Promise.all([i.e(7729),i.e(9439)]).then(i.bind(i,17729)),o=0;for(let e of n)try{await s({organizationId:t.organizationId,customerId:e.customerId,appointmentId:t.appointmentId,waitingListEntryId:e.id,serviceId:t.serviceId,startAt:t.startAt}),await f(t.organizationId,e.id,"NOTIFIED",t.actor),o+=1}catch(t){console.error("[notifyWaitingListOnCancellation]",t)}return{notified:o}}r()}catch(t){r(t)}})}};