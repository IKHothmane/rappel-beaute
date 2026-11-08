"use strict";exports.id=3889,exports.ids=[3889,1460],exports.modules={41460:(t,e,a)=>{a.a(t,async(t,r)=>{try{a.d(e,{$G:()=>s,Fz:()=>d,Tc:()=>m,XF:()=>p,fQ:()=>E,getAppointmentById:()=>l,listAppointmentsByOrg:()=>c});var n=a(79549),i=t([n]);n=(i.then?(await i)():i)[0];let A=`
  SELECT
    a.id,
    a."organizationId",
    a."customerId",
    c."firstName" AS "customerFirstName",
    c."lastName" AS "customerLastName",
    a."serviceId",
    COALESCE(s.name, a."serviceNameSnapshot") AS "serviceName",
    s.price::text AS "servicePrice",
    a."staffId",
    st."firstName" AS "staffFirstName",
    st."lastName" AS "staffLastName",
    a."resourceId",
    r.name AS "resourceName",
    a."startAt",
    a."endAt",
    a.price::text,
    a."promotionId",
    promo.code AS "promotionCode",
    promo.name AS "promotionName",
    promo.type::text AS "promotionType",
    promo.value::text AS "promotionValue",
    COALESCE((
      SELECT i.total::text
      FROM "Invoice" i
      WHERE i."appointmentId" = a.id
        AND i."organizationId" = a."organizationId"
        AND i.status <> 'VOID'
      ORDER BY i."createdAt" DESC
      LIMIT 1
    ), a.price::text) AS "amountDue",
    COALESCE((
      SELECT SUM(
        CASE WHEN p.kind = 'REFUND' THEN -p.amount ELSE p.amount END
      )::text
      FROM "Payment" p
      WHERE p."appointmentId" = a.id
        AND p."organizationId" = a."organizationId"
        AND p.status = 'COMPLETED'
    ), '0') AS "netPaid",
    a.deposit::text,
    a."depositState"::text AS "depositState",
    a."depositDueAt",
    a.status,
    a.notes
  FROM "Appointment" a
  LEFT JOIN "Customer" c ON c.id = a."customerId"
  LEFT JOIN "Service" s ON s.id = a."serviceId"
  LEFT JOIN "Staff" st ON st.id = a."staffId"
  LEFT JOIN "Resource" r ON r.id = a."resourceId"
  LEFT JOIN "Promotion" promo ON promo.id = a."promotionId" AND promo."deletedAt" IS NULL
`;function o(t,e,a){return`${t??""} ${e??""}`.trim()||a}function s(t,e,a,r){if(!a)return 0;let n=e>0?Math.min(t,e):t,i=null!=r?Number(r):0;return"FREE_SERVICE"===a?n:"PERCENTAGE"===a?Math.round(i/100*n*100)/100:"FIXED_AMOUNT"===a||"HAPPY_HOUR"===a||"PACKAGE"===a?Math.min(n,Math.max(0,i)):0}function d(t){let e=Number(t.price),a=Number(t.servicePrice??0),r=s(e,a,t.promotionType,t.promotionValue);return{id:t.id,organizationId:t.organizationId,customerId:t.customerId,customerName:o(t.customerFirstName,t.customerLastName,"Cliente inconnue"),serviceId:t.serviceId??"",serviceName:t.serviceName?.trim()||"Service inconnu",staffId:t.staffId??"",staffName:t.staffId?o(t.staffFirstName,t.staffLastName,"Employ\xe9e"):"Sans employ\xe9e",resourceId:t.resourceId??void 0,resourceName:t.resourceName??void 0,startAt:t.startAt.toISOString(),endAt:t.endAt.toISOString(),price:e,promotionId:t.promotionId,promotionCode:t.promotionCode,promotionName:t.promotionName,discount:r,amountDue:Number(t.amountDue??t.price),netPaid:Number(t.netPaid??0),paymentState:function(t,e){let a=Math.round(100*e)/100;return .01>=Math.max(0,Math.round((Math.round(100*Math.max(0,t))/100-a)*100)/100)?"paid":a>.009?"partial":"unpaid"}(Number(t.amountDue??t.price),Number(t.netPaid??0)),deposit:null!=t.deposit?Number(t.deposit):void 0,depositState:t.depositState??"NOT_REQUIRED",depositDueAt:t.depositDueAt?.toISOString()??null,status:t.status,notes:t.notes??void 0}}async function u(t){let{rows:e}=await n.pool.query(`UPDATE "Appointment"
     SET status = 'COMPLETED'::"AppointmentStatus", "updatedAt" = NOW()
     WHERE "organizationId" = $1
       AND "endAt" < NOW()
       AND "endAt" > NOW() - INTERVAL '2 days'
       AND status IN ('CONFIRMED', 'ARRIVED', 'IN_PROGRESS')
     RETURNING id, "serviceId"`,[t]);if(0===e.length)return;let{onAppointmentCompleted:r}=await Promise.all([a.e(836),a.e(2170)]).then(a.bind(a,92170)),{creditVisitIfEligible:i}=await Promise.all([a.e(8114),a.e(2433),a.e(8810)]).then(a.bind(a,26603));for(let a of e){if(a.serviceId)try{await r({organizationId:t,appointmentId:a.id,serviceId:a.serviceId,userId:null})}catch(t){console.error("[completeElapsedAppointments]",a.id,t)}try{await i({organizationId:t,appointmentId:a.id,actorId:null})}catch(t){console.error("[completeElapsedAppointments] loyalty visit",a.id,t)}}}async function c(t,e){try{let{expireOverdueDepositAppointments:e}=await a.e(4810).then(a.bind(a,54810));await e(t)}catch{}try{await u(t)}catch{}try{let{dispatchDueCustomerPushes:e}=await Promise.all([a.e(5739),a.e(3895)]).then(a.bind(a,55739));await e(t)}catch{}let r=[t],i='WHERE a."organizationId" = $1';e?.from&&(r.push(e.from),i+=` AND a."startAt" >= $${r.length}`),e?.to&&(r.push(e.to),i+=` AND a."startAt" < $${r.length}`);let{rows:o}=await n.pool.query(`${A} ${i} ORDER BY a."startAt" ASC`,r);return o.map(d)}async function p(t,e){let r=`apt-${Date.now()}`,i=e.deposit??null,o="NOT_REQUIRED",s=null;try{let{resolveDepositRequirement:r}=await a.e(4810).then(a.bind(a,54810)),d=e.deposit??null;if(null==d){let a=await n.pool.query('SELECT deposit::text FROM "Service" WHERE id = $1 AND "organizationId" = $2',[e.serviceId,t]);d=a.rows[0]?.deposit!=null?parseFloat(a.rows[0].deposit):null}let u=await r({organizationId:t,customerId:e.customerId,serviceDeposit:d,price:e.price});u.amount>0&&(i=u.amount,o=u.state,s=u.dueAt)}catch(t){console.error("[createAppointmentRow] deposit resolve",t)}await n.pool.query(`INSERT INTO "Appointment" (
      id, "organizationId", "customerId", "serviceId", "serviceNameSnapshot", "staffId", "resourceId",
      "startAt", "endAt", price, deposit, "depositState", "depositDueAt",
      status, source, notes, "updatedAt"
    ) VALUES (
      $1,$2,$3,$4,(SELECT name FROM "Service" WHERE id = $4),$5,$6,$7,$8,$9,$10,$11::"DepositState",$12,
      'PENDING',$13::"AppointmentSource",$14,NOW()
    )`,[r,t,e.customerId,e.serviceId,e.staffId||null,e.resourceId??null,new Date(e.startAt),new Date(e.endAt),e.price,i,o,s,e.source??"MANUAL",e.notes??null]);let{rows:u}=await n.pool.query(`${A} WHERE a.id = $1`,[r]),c=d(u[0]);try{let{notifyAppointmentCreated:e}=await a.e(5329).then(a.bind(a,45329));await e(t,c)}catch(t){console.error("[createAppointmentRow] notification",t)}try{let{syncAppointmentToGoogle:e}=await a.e(1226).then(a.bind(a,21226));e(t,c)}catch(t){console.error("[createAppointmentRow] google calendar",t)}return c}async function l(t,e){try{await u(e)}catch{}let{rows:a}=await n.pool.query(`${A} WHERE a.id = $1 AND a."organizationId" = $2`,[t,e]);return a[0]?d(a[0]):null}async function m(t,e,r,i){let o=await l(t,e),s=[],u=[],c=1,p=(t,e)=>{s.push(`"${t}" = $${c++}`),u.push(e)};if(r.customerId&&p("customerId",r.customerId),r.serviceId&&(p("serviceId",r.serviceId),s.push(`"serviceNameSnapshot" = (SELECT name FROM "Service" WHERE id = $${c-1})`)),void 0!==r.staffId&&p("staffId",r.staffId||null),void 0!==r.resourceId&&p("resourceId",r.resourceId??null),r.startAt&&p("startAt",new Date(r.startAt)),r.endAt&&p("endAt",new Date(r.endAt)),void 0!==r.price&&p("price",r.price),"promotionId"in r&&p("promotionId",r.promotionId??null),void 0!==r.deposit&&p("deposit",r.deposit??null),void 0!==r.notes&&p("notes",r.notes??null),r.status&&p("status",r.status),0===s.length)return null;s.push('"updatedAt" = NOW()'),u.push(t,e);let m=await n.pool.query(`UPDATE "Appointment" SET ${s.join(", ")} WHERE id = $${c} AND "organizationId" = $${c+1}`,u);if(0===m.rowCount)return null;let{rows:E}=await n.pool.query(`${A} WHERE a.id = $1 AND a."organizationId" = $2`,[t,e]),I=E[0]?d(E[0]):null;if(I&&o&&(r.startAt&&r.startAt!==o.startAt||r.endAt&&r.endAt!==o.endAt||r.staffId&&r.staffId!==o.staffId||void 0!==r.resourceId&&r.resourceId!==o.resourceId)){try{let{writeAuditLog:r}=await Promise.resolve().then(a.bind(a,2192));await r({organizationId:e,actorId:i?.actor?.id??"system",actorName:i?.actor?.name,entityType:"Appointment",entityId:t,action:"APPOINTMENT_RESCHEDULED",before:{startAt:o.startAt,endAt:o.endAt,staffId:o.staffId,resourceId:o.resourceId},after:{startAt:I.startAt,endAt:I.endAt,staffId:I.staffId,resourceId:I.resourceId}})}catch(t){console.error("[updateAppointmentRow] audit move",t)}try{let{notifyAppointmentRescheduled:t}=await a.e(5329).then(a.bind(a,45329));await t(e,I,{startAt:o.startAt,staffId:o.staffId,staffName:o.staffName})}catch(t){console.error("[updateAppointmentRow] notify move",t)}}if(I&&o&&r.status&&r.status!==o.status){try{let{notifyAppointmentStatusChange:t}=await a.e(5329).then(a.bind(a,45329));await t(e,I,o.status)}catch(t){console.error("[updateAppointmentRow] notification",t)}try{let{applyDepositOnStatusChange:n}=await a.e(4810).then(a.bind(a,54810));await n({organizationId:e,appointmentId:t,previousStatus:o.status,nextStatus:r.status,cancelledByInstitute:i?.cancelledByInstitute??("CANCELLED"===r.status||"NO_SHOW"===r.status),actor:i?.actor??{id:"system",name:"Syst\xe8me"}})}catch(t){console.error("[updateAppointmentRow] deposit policy",t)}if("COMPLETED"===r.status&&"COMPLETED"!==o.status)try{let{creditVisitIfEligible:r}=await Promise.all([a.e(8114),a.e(2433),a.e(8810)]).then(a.bind(a,26603));await r({organizationId:e,appointmentId:t,actorId:i?.actor?.id??null})}catch(t){console.error("[updateAppointmentRow] loyalty visit",t)}if("CANCELLED"===r.status&&"CANCELLED"!==o.status)try{let{notifyWaitingListOnCancellation:r}=await a.e(2616).then(a.bind(a,72616));await r({organizationId:e,appointmentId:t,serviceId:o.serviceId,staffId:o.staffId,startAt:new Date(o.startAt),actor:i?.actor??{id:"system",name:"Syst\xe8me"}})}catch(t){console.error("[updateAppointmentRow] waiting list",t)}}let N=I?await l(t,e):null;if(N)try{let{syncAppointmentToGoogle:t}=await a.e(1226).then(a.bind(a,21226));t(e,N)}catch(t){console.error("[updateAppointmentRow] google calendar",t)}return N}function E(t){return"object"==typeof t&&null!==t&&"code"in t&&"23P01"===t.code}r()}catch(t){r(t)}})},40440:(t,e,a)=>{a.a(t,async(t,r)=>{try{a.d(e,{B9:()=>f,Iu:()=>R,MB:()=>m,SN:()=>E,XN:()=>l,fg:()=>I,id:()=>A,lR:()=>N,oY:()=>S});var n=a(84770),i=a(79549),o=a(87084),s=t([i]);function d(t){return`${t}_${(0,n.randomBytes)(8).toString("hex")}`}i=(s.then?(await s)():s)[0];let O=`
  (
    SELECT rcd."imageUrl"
    FROM "ResourceCatalogDefault" rcd
    WHERE rcd.type = r.type
      AND rcd."imageUrl" IS NOT NULL
      AND rcd."imageUrl" <> ''
    LIMIT 1
  ) AS "imageUrl"
`;function u(t){return{id:t.id,name:t.name,type:t.type,capacity:t.capacity,location:t.location,notes:t.notes,active:t.active,imageUrl:t.imageUrl??null,serviceCount:parseInt(t.serviceCount,10)||0,serviceNames:t.serviceNames??[],upcomingMaintenance:!!t.upcomingMaintenance,appointmentCount:parseInt(t.appointmentCount,10)||0}}async function c(t){let{rows:e}=await i.pool.query(`SELECT id, "startAt", "endAt", type::text, reason, status::text, "createdAt"
     FROM "ResourceMaintenance"
     WHERE "resourceId" = $1
     ORDER BY "startAt" DESC`,[t]);return e.map(t=>({id:t.id,startAt:t.startAt.toISOString(),endAt:t.endAt.toISOString(),type:t.type,reason:t.reason,status:t.status,createdAt:t.createdAt.toISOString()}))}async function p(t,e,a){for(let r of(await i.pool.query('DELETE FROM "ServiceResource" WHERE "resourceId" = $1',[t]),e))await i.pool.query(`INSERT INTO "ServiceResource" ("serviceId", "resourceId", quantity)
       SELECT s.id, $2, 1 FROM "Service" s
       WHERE s.id = $1 AND s."organizationId" = $3
       ON CONFLICT DO NOTHING`,[r,t,a])}async function l(t,e){let{page:a,limit:r,search:n,type:s,active:d,serviceId:p,agenda:l}=e,m=['r."organizationId" = $1','r."deletedAt" IS NULL'],E=[t],A=2;n&&(m.push(`(r.name ILIKE $${A} OR COALESCE(r.location, '') ILIKE $${A} OR COALESCE(r.notes, '') ILIKE $${A})`),E.push(`%${n}%`),A++),s&&(m.push(`r.type = $${A}::"ResourceType"`),E.push(s),A++),null!=d&&(m.push(`r.active = $${A}`),E.push(d),A++),p&&(m.push(`EXISTS (SELECT 1 FROM "ServiceResource" sr WHERE sr."resourceId" = r.id AND sr."serviceId" = $${A})`),E.push(p),A++);let I=m.join(" AND ");if(l){let{rows:t}=await i.pool.query(`SELECT r.id, r.name, r.type, r.active
       FROM "Resource" r
       WHERE ${I} AND r.active = true
       ORDER BY r.name`,E),e=[];for(let a of t){let t=await c(a.id);e.push({id:a.id,name:a.name,type:a.type,active:a.active,maintenances:t.filter(t=>(0,o.VK)(t.status))})}return{items:e,total:e.length}}let N=`SELECT COUNT(*)::int AS total FROM "Resource" r WHERE ${I}`,S=`
    SELECT
      r.id, r.name, r.type, r.capacity, r.location, r.notes, r.active,
      ${O},
      r."createdAt", r."updatedAt",
      COUNT(DISTINCT sr."serviceId")::text AS "serviceCount",
      COALESCE(array_agg(DISTINCT s.name) FILTER (WHERE s.name IS NOT NULL), '{}') AS "serviceNames",
      COUNT(DISTINCT a.id)::text AS "appointmentCount",
      EXISTS (
        SELECT 1 FROM "ResourceMaintenance" m
        WHERE m."resourceId" = r.id
          AND m.status IN ('SCHEDULED', 'IN_PROGRESS')
          AND m."endAt" >= NOW()
      ) AS "upcomingMaintenance"
    FROM "Resource" r
    LEFT JOIN "ServiceResource" sr ON sr."resourceId" = r.id
    LEFT JOIN "Service" s ON s.id = sr."serviceId"
    LEFT JOIN "Appointment" a ON a."resourceId" = r.id AND a.status <> 'CANCELLED'
    WHERE ${I}
    GROUP BY r.id
    ORDER BY r.active DESC, r.name
    LIMIT $${A} OFFSET $${A+1}
  `,[f,R]=await Promise.all([i.pool.query(N,E),i.pool.query(S,[...E,r,(a-1)*r])]);return{items:R.rows.map(u),total:f.rows[0]?.total??0}}async function m(t,e){let{rows:a}=await i.pool.query(`SELECT
      r.id, r.name, r.type, r.capacity, r.location, r.notes, r.active,
      ${O},
      r."createdAt", r."updatedAt",
      COUNT(DISTINCT sr."serviceId")::text AS "serviceCount",
      COALESCE(array_agg(DISTINCT s.name) FILTER (WHERE s.name IS NOT NULL), '{}') AS "serviceNames",
      COUNT(DISTINCT a.id)::text AS "appointmentCount",
      EXISTS (
        SELECT 1 FROM "ResourceMaintenance" m
        WHERE m."resourceId" = r.id
          AND m.status IN ('SCHEDULED', 'IN_PROGRESS')
          AND m."endAt" >= NOW()
      ) AS "upcomingMaintenance"
    FROM "Resource" r
    LEFT JOIN "ServiceResource" sr ON sr."resourceId" = r.id
    LEFT JOIN "Service" s ON s.id = sr."serviceId"
    LEFT JOIN "Appointment" a ON a."resourceId" = r.id AND a.status <> 'CANCELLED'
    WHERE r.id = $1 AND r."organizationId" = $2 AND r."deletedAt" IS NULL
    GROUP BY r.id`,[e,t]);if(!a[0])return null;let[r,n,o]=await Promise.all([c(e),i.pool.query(`SELECT s.id AS "serviceId", s.name AS "serviceName", s.category, sr.quantity, s.active
       FROM "ServiceResource" sr
       JOIN "Service" s ON s.id = sr."serviceId"
       WHERE sr."resourceId" = $1
       ORDER BY s.name`,[e]),i.pool.query(`SELECT a.id, a."startAt", a."endAt", a.status::text,
              s.name AS "serviceName",
              st."firstName" AS "staffFirst", st."lastName" AS "staffLast",
              c."firstName" AS "customerFirst", c."lastName" AS "customerLast"
       FROM "Appointment" a
       JOIN "Service" s ON s.id = a."serviceId"
       JOIN "Staff" st ON st.id = a."staffId"
       JOIN "Customer" c ON c.id = a."customerId"
       WHERE a."resourceId" = $1 AND a.status <> 'CANCELLED'
       ORDER BY a."startAt" DESC
       LIMIT 40`,[e])]);return{...u(a[0]),services:n.rows,maintenances:r,reservations:o.rows.map(t=>({id:t.id,startAt:t.startAt.toISOString(),endAt:t.endAt.toISOString(),status:t.status,serviceName:t.serviceName,staffName:`${t.staffFirst} ${t.staffLast}`.trim(),customerName:`${t.customerFirst} ${t.customerLast}`.trim()})),createdAt:a[0].createdAt.toISOString(),updatedAt:a[0].updatedAt.toISOString()}}async function E(t,e){let a=d("res");await i.pool.query(`INSERT INTO "Resource" (
      id, "organizationId", name, type, capacity, location, notes, active, "updatedAt"
    ) VALUES ($1,$2,$3,$4::"ResourceType",$5,$6,$7,$8,NOW())`,[a,t,e.name,e.type??"CABINE",e.capacity??1,e.location??null,e.notes??null,!1!==e.active]),e.serviceIds?.length&&await p(a,e.serviceIds,t);let r=await m(t,a);if(!r)throw Error("Ressource introuvable apr\xe8s cr\xe9ation.");return r}async function A(t,e,a){let r=[],n=[],o=1,s=(t,e,a)=>{r.push(a?`"${t}" = $${o}${a}`:`"${t}" = $${o}`),n.push(e),o++};void 0!==a.name&&s("name",a.name),void 0!==a.type&&s("type",a.type,'::"ResourceType"'),void 0!==a.capacity&&s("capacity",a.capacity),void 0!==a.location&&s("location",a.location??null),void 0!==a.notes&&s("notes",a.notes??null),void 0!==a.active&&s("active",a.active),r.length>0&&(r.push('"updatedAt" = NOW()'),n.push(e,t),await i.pool.query(`UPDATE "Resource" SET ${r.join(", ")}
       WHERE id = $${o} AND "organizationId" = $${o+1} AND "deletedAt" IS NULL`,n)),void 0!==a.serviceIds&&await p(e,a.serviceIds,t);let d=await m(t,e);if(!d)throw Error("NOT_FOUND");return d}async function I(t,e){let a=await m(t,e);if(!a)throw Error("NOT_FOUND");let{rowCount:r}=await i.pool.query(`UPDATE "Resource"
     SET "deletedAt" = NOW(), active = false, "updatedAt" = NOW()
     WHERE id = $1 AND "organizationId" = $2 AND "deletedAt" IS NULL`,[e,t]);if(!r)throw Error("NOT_FOUND");return{name:a.name}}async function N(t,e,a){if(!(await i.pool.query('SELECT id FROM "Resource" WHERE id = $1 AND "organizationId" = $2 AND "deletedAt" IS NULL',[e,t])).rows[0])throw Error("NOT_FOUND");let r=d("mnt");await i.pool.query(`INSERT INTO "ResourceMaintenance" (id, "resourceId", "startAt", "endAt", type, reason, status, "updatedAt")
     VALUES ($1,$2,$3,$4,$5::"MaintenanceType",$6,$7::"MaintenanceStatus",NOW())`,[r,e,new Date(a.startAt),new Date(a.endAt),a.type??"PREVENTIVE",a.reason??null,a.status??"SCHEDULED"]);let n=(await c(e)).find(t=>t.id===r);if(!n)throw Error("Maintenance introuvable.");return n}async function S(t,e,a,r){let n=[],o=[],s=1;if(void 0!==r.startAt&&(n.push(`"startAt" = $${s}`),o.push(new Date(r.startAt)),s++),void 0!==r.endAt&&(n.push(`"endAt" = $${s}`),o.push(new Date(r.endAt)),s++),void 0!==r.type&&(n.push(`type = $${s}::"MaintenanceType"`),o.push(r.type),s++),void 0!==r.reason&&(n.push(`reason = $${s}`),o.push(r.reason??null),s++),void 0!==r.status&&(n.push(`status = $${s}::"MaintenanceStatus"`),o.push(r.status),s++),0===n.length){let t=(await c(e)).find(t=>t.id===a);if(!t)throw Error("NOT_FOUND");return t}n.push('"updatedAt" = NOW()'),o.push(a,e,t);let{rowCount:d}=await i.pool.query(`UPDATE "ResourceMaintenance" m SET ${n.join(", ")}
     FROM "Resource" r
     WHERE m.id = $${s} AND m."resourceId" = $${s+1}
       AND r.id = m."resourceId" AND r."organizationId" = $${s+2}`,o);if(!d)throw Error("NOT_FOUND");let u=(await c(e)).find(t=>t.id===a);if(!u)throw Error("NOT_FOUND");return u}async function f(t,e,a){let r=await i.pool.query(`SELECT id, name, active FROM "Resource"
     WHERE id = $1 AND "organizationId" = $2 AND "deletedAt" IS NULL`,[e,t]);if(!r.rows[0])return null;let n=new Date(`${a}T00:00:00`);if(Number.isNaN(n.getTime()))throw Error("INVALID_DATE");let o=new Date(n);o.setDate(o.getDate()+1);let[s,d]=await Promise.all([i.pool.query(`SELECT a."startAt", a."endAt", s.name AS "serviceName"
       FROM "Appointment" a
       JOIN "Service" s ON s.id = a."serviceId"
       WHERE a."resourceId" = $1
         AND a.status NOT IN ('CANCELLED')
         AND a."startAt" < $3 AND a."endAt" > $2
       ORDER BY a."startAt"`,[e,n,o]),i.pool.query(`SELECT "startAt", "endAt", type::text
       FROM "ResourceMaintenance"
       WHERE "resourceId" = $1
         AND status IN ('SCHEDULED', 'IN_PROGRESS')
         AND "startAt" < $3 AND "endAt" > $2
       ORDER BY "startAt"`,[e,n,o])]);return{resourceId:e,date:a,active:r.rows[0].active,slots:[...s.rows.map(t=>({startAt:t.startAt.toISOString(),endAt:t.endAt.toISOString(),kind:"appointment",label:t.serviceName})),...d.rows.map(t=>({startAt:t.startAt.toISOString(),endAt:t.endAt.toISOString(),kind:"maintenance",label:`Maintenance ${t.type}`}))]}}async function R(t){let{organizationId:e,resourceId:a,serviceId:r,startAt:n,endAt:o}=t,{rows:s}=await i.pool.query(`SELECT id, active FROM "Resource"
     WHERE id = $1 AND "organizationId" = $2 AND "deletedAt" IS NULL`,[a,e]);if(!s[0])throw Error("RESOURCE_NOT_FOUND");if(!s[0].active)throw Error("RESOURCE_INACTIVE");let d=await i.pool.query(`SELECT EXISTS (
      SELECT 1 FROM "ServiceResource" sr
      JOIN "Service" s ON s.id = sr."serviceId"
      WHERE sr."resourceId" = $1 AND sr."serviceId" = $2 AND s."organizationId" = $3
    ) AS ok`,[a,r,e]),u=await i.pool.query('SELECT COUNT(*)::text AS n FROM "ServiceResource" WHERE "serviceId" = $1',[r]);if((parseInt(u.rows[0]?.n??"0",10)||0)>0&&!d.rows[0]?.ok)throw Error("RESOURCE_NOT_ALLOWED");if((await i.pool.query(`SELECT id FROM "ResourceMaintenance"
     WHERE "resourceId" = $1
       AND status IN ('SCHEDULED', 'IN_PROGRESS')
       AND "startAt" < $3 AND "endAt" > $2
     LIMIT 1`,[a,n,o])).rows[0])throw Error("RESOURCE_MAINTENANCE")}r()}catch(t){r(t)}})},91829:(t,e,a)=>{a.d(e,{Ct:()=>p,Is:()=>m,Jp:()=>I,Ld:()=>o,bR:()=>u,db:()=>A,ho:()=>l,kG:()=>d,mv:()=>E,x:()=>r,xo:()=>c});let r=process.env.TIMEZONE?.trim()||"Africa/Casablanca",n=new Intl.DateTimeFormat("en-US",{timeZone:r,hour12:!1,year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",second:"2-digit",weekday:"short"}),i={Sun:0,Mon:1,Tue:2,Wed:3,Thu:4,Fri:5,Sat:6};function o(t){let e=n.formatToParts(t),a=t=>e.find(e=>e.type===t)?.value??"0";return{year:Number(a("year")),month:Number(a("month")),day:Number(a("day")),hour:Number(a("hour"))%24,minute:Number(a("minute")),second:Number(a("second")),weekday:i[a("weekday")]??0}}function s(t){let e=o(t);return Date.UTC(e.year,e.month-1,e.day,e.hour,e.minute,e.second,t.getUTCMilliseconds())-t.getTime()}function d(t,e,a,r=0,n=0){let i=Date.UTC(t.year,t.month-1,t.day,e,a,r,n),o=i-s(new Date(i));return new Date(i-s(new Date(o)))}function u(t){return o(t).weekday}function c(t,e){let[a,r]=e.split(":").map(Number);return d(o(t),a,r)}function p(t,e){let[a,r,n]=t.split("-").map(Number),[i,o]=e.split(":").map(Number);return d({year:a,month:r,day:n},i,o)}function l(t,e){let a=o(t),r=o(e);return a.year===r.year&&a.month===r.month&&a.day===r.day}function m(t){return d(o(t),0,0,0,0)}function E(t){return d(o(t),23,59,59,999)}function A(t){return t.toLocaleTimeString("fr-FR",{timeZone:r,hour:"2-digit",minute:"2-digit"})}function I(t){return t.toLocaleDateString("fr-FR",{timeZone:r})}},32096:(t,e,a)=>{a.d(e,{gR:()=>o,Xs:()=>s,o:()=>d});var r=a(87084),n=a(91829);function i(t){return new Date(t)}function o(t,e,a,o,s){let d=[],u=i(e.startAt),c=i(e.endAt);for(let p of(c<=u&&d.push("L'heure de fin doit \xeatre apr\xe8s l'heure de d\xe9but."),d.push(...function(t,e,a,r=!1){let o=[];if(!t)return o;if("ON_LEAVE"===t.status||"INACTIVE"===t.status||"ARCHIVED"===t.status)return o.push(`${t.displayName} n'est pas disponible (${t.status}).`),o;for(let r of t.replacementsAsAbsent??[]){let n=i(r.startAt);if(e<i(r.endAt)&&a>n)return o.push(`${t.displayName} remplac\xe9e par ${r.substituteName} sur ce cr\xe9neau.`),o}let s=(0,n.bR)(e),d=t.schedules.find(t=>t.dayOfWeek===s&&t.active),u=(t.overtimes??[]).some(t=>{let r=i(t.startAt),n=i(t.endAt);return e>=r&&a<=n}),c=(t.replacementsAsSubstitute??[]).some(t=>{let r=i(t.startAt),n=i(t.endAt);return e>=r&&a<=n}),p=u||c;if(!r){if(!d&&!p)return o.push(`${t.displayName} ne travaille pas ce jour.`),o;if(d){let r=(0,n.xo)(e,d.startTime),i=(0,n.xo)(e,d.endTime);e>=r&&a<=i||p||o.push(`Hors horaires de ${t.displayName} (${d.startTime}–${d.endTime}).`)}}for(let r of t.breaks){if(r.dayOfWeek!==s)continue;let i=(0,n.xo)(e,r.startTime),d=(0,n.xo)(e,r.endTime);e<d&&a>i&&o.push(`Pause ${t.displayName} (${r.startTime}–${r.endTime}).`)}for(let r of t.leaves){if("APPROVED"!==r.status)continue;let s=i(r.startAt),d=(0,n.mv)(i(r.endAt));e<d&&a>s&&o.push(`${t.displayName} en cong\xe9 jusqu'au ${(0,n.Jp)(d)}.`)}return o}(a,u,c,s?.ignoreStaffSchedule===!0)),e.resourceId&&d.push(...function(t,e,a){let o=[];if(!t)return o;if(!t.active)return o.push(`${t.name} est inactive.`),o;for(let s of t.maintenances){if(!(0,r.VK)(s.status))continue;let d=i(s.startAt),u=i(s.endAt);e<u&&a>d&&o.push(`${t.name} en maintenance jusqu'au ${(0,n.Jp)(u)}.`)}return o}(o,u,c)),t)){if(p.id===e.excludeAppointmentId||"CANCELLED"===p.status)continue;let t=i(p.startAt),a=i(p.endAt);(0,n.ho)(u,t)&&u<a&&c>t&&(e.staffId&&p.staffId===e.staffId&&d.push(`${p.staffName} occup\xe9e \xb7 ${p.serviceName} (${(0,n.db)(t)}–${(0,n.db)(a)}).`),e.resourceId&&p.resourceId===e.resourceId&&d.push(`${p.resourceName??"Ressource"} indisponible \xb7 ${(0,n.db)(t)}–${(0,n.db)(a)}.`))}return{available:0===d.length,conflicts:d}}function s(t,e){let a=[],r=(0,n.Ld)(e.date),i=(0,n.Ld)(new Date),s=i.year===r.year&&i.month===r.month&&i.day===r.day,d=60*i.hour+i.minute;for(let i=8;i<24;i++)for(let u=0;u<60;u+=30){if(s&&60*i+u<d)continue;let c=(0,n.kG)(r,i,u),p=new Date(c.getTime()+6e4*e.durationMinutes),l=o(t,{staffId:e.staffId,resourceId:e.resourceId,startAt:c.toISOString(),endAt:p.toISOString(),excludeAppointmentId:e.excludeAppointmentId},e.staffContext,e.resourceContext,{ignoreStaffSchedule:e.ignoreStaffSchedule});a.push({time:`${String(i).padStart(2,"0")}:${String(u).padStart(2,"0")}`,available:l.available,reason:l.conflicts[0]})}return a}function d(t,e){if("ACTIVE"!==t.status)return!1;let a=(0,n.bR)(e),r=t.schedules.some(t=>t.dayOfWeek===a&&t.active),o=(0,n.Is)(e),s=(0,n.mv)(e),d=(t.overtimes??[]).some(t=>{let e=i(t.startAt);return o<i(t.endAt)&&s>e}),u=(t.replacementsAsSubstitute??[]).some(t=>{var e;return e=i(t.startAt),o<i(t.endAt)&&s>e});if(!r&&!d&&!u)return!1;for(let e of t.leaves){if("APPROVED"!==e.status)continue;let t=i(e.startAt);if(o<(0,n.mv)(i(e.endAt))&&s>t)return!1}return!0}},87084:(t,e,a)=>{a.d(e,{Uk:()=>r,VK:()=>n});let r=["CABINE","SALLE","FAUTEUIL","TABLE","MACHINE","EQUIPEMENT","AUTRE"];function n(t){return"SCHEDULED"===t||"IN_PROGRESS"===t}}};