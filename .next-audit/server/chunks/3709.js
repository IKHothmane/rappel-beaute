"use strict";!function(){try{var t="undefined"!=typeof window?window:"undefined"!=typeof global?global:"undefined"!=typeof self?self:{},e=(new t.Error).stack;e&&(t._sentryDebugIds=t._sentryDebugIds||{},t._sentryDebugIds[e]="c180fb87-59ba-4599-8ea8-87cf90326c9a",t._sentryDebugIdIdentifier="sentry-dbid-c180fb87-59ba-4599-8ea8-87cf90326c9a")}catch(t){}}(),exports.id=3709,exports.ids=[3709,318],exports.modules={50318:(t,e,a)=>{a.a(t,async(t,r)=>{try{a.d(e,{$G:()=>s,Fz:()=>d,Tc:()=>E,XF:()=>p,fQ:()=>A,getAppointmentById:()=>m,listAppointmentsByOrg:()=>c});var n=a(70653),o=t([n]);n=(o.then?(await o)():o)[0];let I=`
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
`;function i(t,e,a){return`${t??""} ${e??""}`.trim()||a}function s(t,e,a,r){if(!a)return 0;let n=e>0?Math.min(t,e):t,o=null!=r?Number(r):0;return"FREE_SERVICE"===a?n:"PERCENTAGE"===a?Math.round(o/100*n*100)/100:"FIXED_AMOUNT"===a||"HAPPY_HOUR"===a||"PACKAGE"===a?Math.min(n,Math.max(0,o)):0}function d(t){let e=Number(t.price),a=Number(t.servicePrice??0),r=s(e,a,t.promotionType,t.promotionValue);return{id:t.id,organizationId:t.organizationId,customerId:t.customerId,customerName:i(t.customerFirstName,t.customerLastName,"Cliente inconnue"),serviceId:t.serviceId??"",serviceName:t.serviceName?.trim()||"Service inconnu",staffId:t.staffId??"",staffName:t.staffId?i(t.staffFirstName,t.staffLastName,"Employ\xe9e"):"Sans employ\xe9e",resourceId:t.resourceId??void 0,resourceName:t.resourceName??void 0,startAt:t.startAt.toISOString(),endAt:t.endAt.toISOString(),price:e,promotionId:t.promotionId,promotionCode:t.promotionCode,promotionName:t.promotionName,discount:r,amountDue:Number(t.amountDue??t.price),netPaid:Number(t.netPaid??0),paymentState:function(t,e){let a=Math.round(100*e)/100;return .01>=Math.max(0,Math.round((Math.round(100*Math.max(0,t))/100-a)*100)/100)?"paid":a>.009?"partial":"unpaid"}(Number(t.amountDue??t.price),Number(t.netPaid??0)),deposit:null!=t.deposit?Number(t.deposit):void 0,depositState:t.depositState??"NOT_REQUIRED",depositDueAt:t.depositDueAt?.toISOString()??null,status:t.status,notes:t.notes??void 0}}async function u(t){let{rows:e}=await n.pool.query(`UPDATE "Appointment"
     SET status = 'COMPLETED'::"AppointmentStatus", "updatedAt" = NOW()
     WHERE "organizationId" = $1
       AND "endAt" < NOW()
       AND "endAt" > NOW() - INTERVAL '2 days'
       AND status IN ('CONFIRMED', 'ARRIVED', 'IN_PROGRESS')
     RETURNING id, "serviceId"`,[t]);if(0===e.length)return;let{onAppointmentCompleted:r}=await Promise.all([a.e(5683),a.e(182)]).then(a.bind(a,30182)),{creditVisitIfEligible:o}=await Promise.all([a.e(5136),a.e(7821),a.e(6614)]).then(a.bind(a,54437));for(let a of e){if(a.serviceId)try{await r({organizationId:t,appointmentId:a.id,serviceId:a.serviceId,userId:null})}catch(t){console.error("[completeElapsedAppointments]",a.id,t)}try{await o({organizationId:t,appointmentId:a.id,actorId:null})}catch(t){console.error("[completeElapsedAppointments] loyalty visit",a.id,t)}}}async function c(t,e){try{let{expireOverdueDepositAppointments:e}=await a.e(819).then(a.bind(a,50819));await e(t)}catch{}try{await u(t)}catch{}try{let{dispatchDueCustomerPushes:e}=await a.e(11).then(a.bind(a,70011));await e(t)}catch{}let r=[t],o='WHERE a."organizationId" = $1';e?.from&&(r.push(e.from),o+=` AND a."startAt" >= $${r.length}`),e?.to&&(r.push(e.to),o+=` AND a."startAt" < $${r.length}`);let{rows:i}=await n.pool.query(`${I} ${o} ORDER BY a."startAt" ASC`,r);return i.map(d)}async function l(t,e){for(let[a,r]of[["Customer",e.customerId],["Service",e.serviceId],["Staff",e.staffId],["Resource",e.resourceId]]){if(!r)continue;let{rowCount:e}=await n.pool.query(`SELECT 1 FROM "${a}" WHERE id = $1 AND "organizationId" = $2`,[r,t]);if(!e)throw Error("REFERENCE_NOT_FOUND")}}async function p(t,e){await l(t,e);let r=`apt-${Date.now()}`,o=e.deposit??null,i="NOT_REQUIRED",s=null;try{let{resolveDepositRequirement:r}=await a.e(819).then(a.bind(a,50819)),d=e.deposit??null;if(null==d){let a=await n.pool.query('SELECT deposit::text FROM "Service" WHERE id = $1 AND "organizationId" = $2',[e.serviceId,t]);d=a.rows[0]?.deposit!=null?parseFloat(a.rows[0].deposit):null}let u=await r({organizationId:t,customerId:e.customerId,serviceDeposit:d,price:e.price});u.amount>0&&(o=u.amount,i=u.state,s=u.dueAt)}catch(t){console.error("[createAppointmentRow] deposit resolve",t)}await n.pool.query(`INSERT INTO "Appointment" (
      id, "organizationId", "customerId", "serviceId", "serviceNameSnapshot", "staffId", "resourceId",
      "startAt", "endAt", price, deposit, "depositState", "depositDueAt",
      status, source, notes, "updatedAt"
    ) VALUES (
      $1,$2,$3,$4,(SELECT name FROM "Service" WHERE id = $4),$5,$6,$7,$8,$9,$10,$11::"DepositState",$12,
      'PENDING',$13::"AppointmentSource",$14,NOW()
    )`,[r,t,e.customerId,e.serviceId,e.staffId||null,e.resourceId??null,new Date(e.startAt),new Date(e.endAt),e.price,o,i,s,e.source??"MANUAL",e.notes??null]);let{rows:u}=await n.pool.query(`${I} WHERE a.id = $1`,[r]),c=d(u[0]);try{let{notifyAppointmentCreated:e}=await a.e(8702).then(a.bind(a,98702));await e(t,c)}catch(t){console.error("[createAppointmentRow] notification",t)}try{let{syncAppointmentToGoogle:e}=await a.e(3538).then(a.bind(a,53538));e(t,c)}catch(t){console.error("[createAppointmentRow] google calendar",t)}return c}async function m(t,e){try{await u(e)}catch{}let{rows:a}=await n.pool.query(`${I} WHERE a.id = $1 AND a."organizationId" = $2`,[t,e]);return a[0]?d(a[0]):null}async function E(t,e,r,o){await l(e,{customerId:r.customerId,serviceId:r.serviceId,staffId:r.staffId,resourceId:r.resourceId});let i=await m(t,e),s=[],u=[],c=1,p=(t,e)=>{s.push(`"${t}" = $${c++}`),u.push(e)};if(r.customerId&&p("customerId",r.customerId),r.serviceId&&(p("serviceId",r.serviceId),s.push(`"serviceNameSnapshot" = (SELECT name FROM "Service" WHERE id = $${c-1})`)),void 0!==r.staffId&&p("staffId",r.staffId||null),void 0!==r.resourceId&&p("resourceId",r.resourceId??null),r.startAt&&p("startAt",new Date(r.startAt)),r.endAt&&p("endAt",new Date(r.endAt)),void 0!==r.price&&p("price",r.price),"promotionId"in r&&p("promotionId",r.promotionId??null),void 0!==r.deposit&&p("deposit",r.deposit??null),void 0!==r.notes&&p("notes",r.notes??null),r.status&&p("status",r.status),0===s.length)return null;s.push('"updatedAt" = NOW()'),u.push(t,e);let E=await n.pool.query(`UPDATE "Appointment" SET ${s.join(", ")} WHERE id = $${c} AND "organizationId" = $${c+1}`,u);if(0===E.rowCount)return null;let{rows:A}=await n.pool.query(`${I} WHERE a.id = $1 AND a."organizationId" = $2`,[t,e]),N=A[0]?d(A[0]):null;if(N&&i&&(r.startAt&&r.startAt!==i.startAt||r.endAt&&r.endAt!==i.endAt||r.staffId&&r.staffId!==i.staffId||void 0!==r.resourceId&&r.resourceId!==i.resourceId)){try{let{writeAuditLog:r}=await Promise.resolve().then(a.bind(a,66085));await r({organizationId:e,actorId:o?.actor?.id??"system",actorName:o?.actor?.name,entityType:"Appointment",entityId:t,action:"APPOINTMENT_RESCHEDULED",before:{startAt:i.startAt,endAt:i.endAt,staffId:i.staffId,resourceId:i.resourceId},after:{startAt:N.startAt,endAt:N.endAt,staffId:N.staffId,resourceId:N.resourceId}})}catch(t){console.error("[updateAppointmentRow] audit move",t)}try{let{notifyAppointmentRescheduled:t}=await a.e(8702).then(a.bind(a,98702));await t(e,N,{startAt:i.startAt,staffId:i.staffId,staffName:i.staffName})}catch(t){console.error("[updateAppointmentRow] notify move",t)}}if(N&&i&&r.status&&r.status!==i.status){try{let{notifyAppointmentStatusChange:t}=await a.e(8702).then(a.bind(a,98702));await t(e,N,i.status)}catch(t){console.error("[updateAppointmentRow] notification",t)}try{let{applyDepositOnStatusChange:n}=await a.e(819).then(a.bind(a,50819));await n({organizationId:e,appointmentId:t,previousStatus:i.status,nextStatus:r.status,cancelledByInstitute:o?.cancelledByInstitute??("CANCELLED"===r.status||"NO_SHOW"===r.status),actor:o?.actor??{id:"system",name:"Syst\xe8me"}})}catch(t){console.error("[updateAppointmentRow] deposit policy",t)}if("COMPLETED"===r.status&&"COMPLETED"!==i.status)try{let{creditVisitIfEligible:r}=await Promise.all([a.e(5136),a.e(7821),a.e(6614)]).then(a.bind(a,54437));await r({organizationId:e,appointmentId:t,actorId:o?.actor?.id??null})}catch(t){console.error("[updateAppointmentRow] loyalty visit",t)}if("CANCELLED"===r.status&&"CANCELLED"!==i.status)try{let{notifyWaitingListOnCancellation:r}=await a.e(8740).then(a.bind(a,18740));await r({organizationId:e,appointmentId:t,serviceId:i.serviceId,staffId:i.staffId,startAt:new Date(i.startAt),actor:o?.actor??{id:"system",name:"Syst\xe8me"}})}catch(t){console.error("[updateAppointmentRow] waiting list",t)}}let f=N?await m(t,e):null;if(f)try{let{syncAppointmentToGoogle:t}=await a.e(3538).then(a.bind(a,53538));t(e,f)}catch(t){console.error("[updateAppointmentRow] google calendar",t)}return f}function A(t){return"object"==typeof t&&null!==t&&"code"in t&&"23P01"===t.code}r()}catch(t){r(t)}})},2551:(t,e,a)=>{a.a(t,async(t,r)=>{try{a.d(e,{B9:()=>S,Iu:()=>y,MB:()=>m,SN:()=>E,XN:()=>p,fg:()=>I,id:()=>A,lR:()=>N,oY:()=>f});var n=a(84770),o=a(70653),i=a(66250),s=t([o]);function d(t){return`${t}_${(0,n.randomBytes)(8).toString("hex")}`}o=(s.then?(await s)():s)[0];let $=`
  (
    SELECT rcd."imageUrl"
    FROM "ResourceCatalogDefault" rcd
    WHERE rcd.type = r.type
      AND rcd."imageUrl" IS NOT NULL
      AND rcd."imageUrl" <> ''
    LIMIT 1
  ) AS "imageUrl"
`;function u(t){return{id:t.id,name:t.name,type:t.type,capacity:t.capacity,location:t.location,notes:t.notes,active:t.active,imageUrl:t.imageUrl??null,serviceCount:parseInt(t.serviceCount,10)||0,serviceNames:t.serviceNames??[],upcomingMaintenance:!!t.upcomingMaintenance,appointmentCount:parseInt(t.appointmentCount,10)||0}}async function c(t){let{rows:e}=await o.pool.query(`SELECT id, "startAt", "endAt", type::text, reason, status::text, "createdAt"
     FROM "ResourceMaintenance"
     WHERE "resourceId" = $1
     ORDER BY "startAt" DESC`,[t]);return e.map(t=>({id:t.id,startAt:t.startAt.toISOString(),endAt:t.endAt.toISOString(),type:t.type,reason:t.reason,status:t.status,createdAt:t.createdAt.toISOString()}))}async function l(t,e,a){for(let r of(await o.pool.query('DELETE FROM "ServiceResource" WHERE "resourceId" = $1',[t]),e))await o.pool.query(`INSERT INTO "ServiceResource" ("serviceId", "resourceId", quantity)
       SELECT s.id, $2, 1 FROM "Service" s
       WHERE s.id = $1 AND s."organizationId" = $3
       ON CONFLICT DO NOTHING`,[r,t,a])}async function p(t,e){let{page:a,limit:r,search:n,type:s,active:d,serviceId:l,agenda:p}=e,m=['r."organizationId" = $1','r."deletedAt" IS NULL'],E=[t],A=2;n&&(m.push(`(r.name ILIKE $${A} OR COALESCE(r.location, '') ILIKE $${A} OR COALESCE(r.notes, '') ILIKE $${A})`),E.push(`%${n}%`),A++),s&&(m.push(`r.type = $${A}::"ResourceType"`),E.push(s),A++),null!=d&&(m.push(`r.active = $${A}`),E.push(d),A++),l&&(m.push(`EXISTS (SELECT 1 FROM "ServiceResource" sr WHERE sr."resourceId" = r.id AND sr."serviceId" = $${A})`),E.push(l),A++);let I=m.join(" AND ");if(p){let{rows:t}=await o.pool.query(`SELECT r.id, r.name, r.type, r.active
       FROM "Resource" r
       WHERE ${I} AND r.active = true
       ORDER BY r.name`,E),e=[];for(let a of t){let t=await c(a.id);e.push({id:a.id,name:a.name,type:a.type,active:a.active,maintenances:t.filter(t=>(0,i.VK)(t.status))})}return{items:e,total:e.length}}let N=`SELECT COUNT(*)::int AS total FROM "Resource" r WHERE ${I}`,f=`
    SELECT
      r.id, r.name, r.type, r.capacity, r.location, r.notes, r.active,
      ${$},
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
  `,[S,y]=await Promise.all([o.pool.query(N,E),o.pool.query(f,[...E,r,(a-1)*r])]);return{items:y.rows.map(u),total:S.rows[0]?.total??0}}async function m(t,e){let{rows:a}=await o.pool.query(`SELECT
      r.id, r.name, r.type, r.capacity, r.location, r.notes, r.active,
      ${$},
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
    GROUP BY r.id`,[e,t]);if(!a[0])return null;let[r,n,i]=await Promise.all([c(e),o.pool.query(`SELECT s.id AS "serviceId", s.name AS "serviceName", s.category, sr.quantity, s.active
       FROM "ServiceResource" sr
       JOIN "Service" s ON s.id = sr."serviceId"
       WHERE sr."resourceId" = $1
       ORDER BY s.name`,[e]),o.pool.query(`SELECT a.id, a."startAt", a."endAt", a.status::text,
              s.name AS "serviceName",
              st."firstName" AS "staffFirst", st."lastName" AS "staffLast",
              c."firstName" AS "customerFirst", c."lastName" AS "customerLast"
       FROM "Appointment" a
       JOIN "Service" s ON s.id = a."serviceId"
       JOIN "Staff" st ON st.id = a."staffId"
       JOIN "Customer" c ON c.id = a."customerId"
       WHERE a."resourceId" = $1 AND a.status <> 'CANCELLED'
       ORDER BY a."startAt" DESC
       LIMIT 40`,[e])]);return{...u(a[0]),services:n.rows,maintenances:r,reservations:i.rows.map(t=>({id:t.id,startAt:t.startAt.toISOString(),endAt:t.endAt.toISOString(),status:t.status,serviceName:t.serviceName,staffName:`${t.staffFirst} ${t.staffLast}`.trim(),customerName:`${t.customerFirst} ${t.customerLast}`.trim()})),createdAt:a[0].createdAt.toISOString(),updatedAt:a[0].updatedAt.toISOString()}}async function E(t,e){let a=d("res");await o.pool.query(`INSERT INTO "Resource" (
      id, "organizationId", name, type, capacity, location, notes, active, "updatedAt"
    ) VALUES ($1,$2,$3,$4::"ResourceType",$5,$6,$7,$8,NOW())`,[a,t,e.name,e.type??"CABINE",e.capacity??1,e.location??null,e.notes??null,!1!==e.active]),e.serviceIds?.length&&await l(a,e.serviceIds,t);let r=await m(t,a);if(!r)throw Error("Ressource introuvable apr\xe8s cr\xe9ation.");return r}async function A(t,e,a){let r=[],n=[],i=1,s=(t,e,a)=>{r.push(a?`"${t}" = $${i}${a}`:`"${t}" = $${i}`),n.push(e),i++};void 0!==a.name&&s("name",a.name),void 0!==a.type&&s("type",a.type,'::"ResourceType"'),void 0!==a.capacity&&s("capacity",a.capacity),void 0!==a.location&&s("location",a.location??null),void 0!==a.notes&&s("notes",a.notes??null),void 0!==a.active&&s("active",a.active),r.length>0&&(r.push('"updatedAt" = NOW()'),n.push(e,t),await o.pool.query(`UPDATE "Resource" SET ${r.join(", ")}
       WHERE id = $${i} AND "organizationId" = $${i+1} AND "deletedAt" IS NULL`,n)),void 0!==a.serviceIds&&await l(e,a.serviceIds,t);let d=await m(t,e);if(!d)throw Error("NOT_FOUND");return d}async function I(t,e){let a=await m(t,e);if(!a)throw Error("NOT_FOUND");let{rowCount:r}=await o.pool.query(`UPDATE "Resource"
     SET "deletedAt" = NOW(), active = false, "updatedAt" = NOW()
     WHERE id = $1 AND "organizationId" = $2 AND "deletedAt" IS NULL`,[e,t]);if(!r)throw Error("NOT_FOUND");return{name:a.name}}async function N(t,e,a){if(!(await o.pool.query('SELECT id FROM "Resource" WHERE id = $1 AND "organizationId" = $2 AND "deletedAt" IS NULL',[e,t])).rows[0])throw Error("NOT_FOUND");let r=d("mnt");await o.pool.query(`INSERT INTO "ResourceMaintenance" (id, "resourceId", "startAt", "endAt", type, reason, status, "updatedAt")
     VALUES ($1,$2,$3,$4,$5::"MaintenanceType",$6,$7::"MaintenanceStatus",NOW())`,[r,e,new Date(a.startAt),new Date(a.endAt),a.type??"PREVENTIVE",a.reason??null,a.status??"SCHEDULED"]);let n=(await c(e)).find(t=>t.id===r);if(!n)throw Error("Maintenance introuvable.");return n}async function f(t,e,a,r){let n=[],i=[],s=1;if(void 0!==r.startAt&&(n.push(`"startAt" = $${s}`),i.push(new Date(r.startAt)),s++),void 0!==r.endAt&&(n.push(`"endAt" = $${s}`),i.push(new Date(r.endAt)),s++),void 0!==r.type&&(n.push(`type = $${s}::"MaintenanceType"`),i.push(r.type),s++),void 0!==r.reason&&(n.push(`reason = $${s}`),i.push(r.reason??null),s++),void 0!==r.status&&(n.push(`status = $${s}::"MaintenanceStatus"`),i.push(r.status),s++),0===n.length){let t=(await c(e)).find(t=>t.id===a);if(!t)throw Error("NOT_FOUND");return t}n.push('"updatedAt" = NOW()'),i.push(a,e,t);let{rowCount:d}=await o.pool.query(`UPDATE "ResourceMaintenance" m SET ${n.join(", ")}
     FROM "Resource" r
     WHERE m.id = $${s} AND m."resourceId" = $${s+1}
       AND r.id = m."resourceId" AND r."organizationId" = $${s+2}`,i);if(!d)throw Error("NOT_FOUND");let u=(await c(e)).find(t=>t.id===a);if(!u)throw Error("NOT_FOUND");return u}async function S(t,e,a){let r=await o.pool.query(`SELECT id, name, active FROM "Resource"
     WHERE id = $1 AND "organizationId" = $2 AND "deletedAt" IS NULL`,[e,t]);if(!r.rows[0])return null;let n=new Date(`${a}T00:00:00`);if(Number.isNaN(n.getTime()))throw Error("INVALID_DATE");let i=new Date(n);i.setDate(i.getDate()+1);let[s,d]=await Promise.all([o.pool.query(`SELECT a."startAt", a."endAt", s.name AS "serviceName"
       FROM "Appointment" a
       JOIN "Service" s ON s.id = a."serviceId"
       WHERE a."resourceId" = $1
         AND a.status NOT IN ('CANCELLED')
         AND a."startAt" < $3 AND a."endAt" > $2
       ORDER BY a."startAt"`,[e,n,i]),o.pool.query(`SELECT "startAt", "endAt", type::text
       FROM "ResourceMaintenance"
       WHERE "resourceId" = $1
         AND status IN ('SCHEDULED', 'IN_PROGRESS')
         AND "startAt" < $3 AND "endAt" > $2
       ORDER BY "startAt"`,[e,n,i])]);return{resourceId:e,date:a,active:r.rows[0].active,slots:[...s.rows.map(t=>({startAt:t.startAt.toISOString(),endAt:t.endAt.toISOString(),kind:"appointment",label:t.serviceName})),...d.rows.map(t=>({startAt:t.startAt.toISOString(),endAt:t.endAt.toISOString(),kind:"maintenance",label:`Maintenance ${t.type}`}))]}}async function y(t){let{organizationId:e,resourceId:a,serviceId:r,startAt:n,endAt:i}=t,{rows:s}=await o.pool.query(`SELECT id, active FROM "Resource"
     WHERE id = $1 AND "organizationId" = $2 AND "deletedAt" IS NULL`,[a,e]);if(!s[0])throw Error("RESOURCE_NOT_FOUND");if(!s[0].active)throw Error("RESOURCE_INACTIVE");let d=await o.pool.query(`SELECT EXISTS (
      SELECT 1 FROM "ServiceResource" sr
      JOIN "Service" s ON s.id = sr."serviceId"
      WHERE sr."resourceId" = $1 AND sr."serviceId" = $2 AND s."organizationId" = $3
    ) AS ok`,[a,r,e]),u=await o.pool.query('SELECT COUNT(*)::text AS n FROM "ServiceResource" WHERE "serviceId" = $1',[r]);if((parseInt(u.rows[0]?.n??"0",10)||0)>0&&!d.rows[0]?.ok)throw Error("RESOURCE_NOT_ALLOWED");if((await o.pool.query(`SELECT id FROM "ResourceMaintenance"
     WHERE "resourceId" = $1
       AND status IN ('SCHEDULED', 'IN_PROGRESS')
       AND "startAt" < $3 AND "endAt" > $2
     LIMIT 1`,[a,n,i])).rows[0])throw Error("RESOURCE_MAINTENANCE")}r()}catch(t){r(t)}})},80437:(t,e,a)=>{a.d(e,{Ao:()=>y,Ct:()=>E,Is:()=>I,Jp:()=>S,Ld:()=>u,bR:()=>p,db:()=>f,ho:()=>A,kG:()=>l,mv:()=>N,x:()=>r,xo:()=>m});let r=process.env.TIMEZONE?.trim()||"Africa/Casablanca",n=Date.parse("2026-09-20T01:00:00.000Z"),o=new Set(["Africa/Casablanca","Africa/El_Aaiun"]),i=new Intl.DateTimeFormat("en-US",{timeZone:r,hour12:!1,year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",second:"2-digit",weekday:"short"}),s={Sun:0,Mon:1,Tue:2,Wed:3,Thu:4,Fri:5,Sat:6},d=null;function u(t){let e=i.formatToParts(t),a=t=>e.find(e=>e.type===t)?.value??"0",u={year:Number(a("year")),month:Number(a("month")),day:Number(a("day")),hour:Number(a("hour"))%24,minute:Number(a("minute")),second:Number(a("second")),weekday:s[a("weekday")]??0};return t.getTime()>=n&&function(){if(!o.has(r))return!1;if(null!==d)return d;let t=i.formatToParts(new Date("2026-10-14T12:00:00.000Z"));return d=13==Number(t.find(t=>"hour"===t.type)?.value??"0")%24}()?function(t){let e=new Date(Date.UTC(t.year,t.month-1,t.day,t.hour,t.minute,t.second)-36e5);return{year:e.getUTCFullYear(),month:e.getUTCMonth()+1,day:e.getUTCDate(),hour:e.getUTCHours(),minute:e.getUTCMinutes(),second:e.getUTCSeconds(),weekday:e.getUTCDay()}}(u):u}function c(t){let e=u(t);return Date.UTC(e.year,e.month-1,e.day,e.hour,e.minute,e.second,t.getUTCMilliseconds())-t.getTime()}function l(t,e,a,r=0,n=0){let o=Date.UTC(t.year,t.month-1,t.day,e,a,r,n),i=o-c(new Date(o));return new Date(o-c(new Date(i)))}function p(t){return u(t).weekday}function m(t,e){let[a,r]=e.split(":").map(Number);return l(u(t),a,r)}function E(t,e){let[a,r,n]=t.split("-").map(Number),[o,i]=e.split(":").map(Number);return l({year:a,month:r,day:n},o,i)}function A(t,e){let a=u(t),r=u(e);return a.year===r.year&&a.month===r.month&&a.day===r.day}function I(t){return l(u(t),0,0,0,0)}function N(t){return l(u(t),23,59,59,999)}function f(t){let e=u(t);return`${String(e.hour).padStart(2,"0")}:${String(e.minute).padStart(2,"0")}`}function S(t){let e=u(t);return`${String(e.day).padStart(2,"0")}/${String(e.month).padStart(2,"0")}/${e.year}`}function y(t=new Date){let e=u(t),a=String(e.month).padStart(2,"0"),r=String(e.day).padStart(2,"0");return`${e.year}-${a}-${r}`}},7750:(t,e,a)=>{a.d(e,{gR:()=>i,Xs:()=>s,o:()=>d});var r=a(66250),n=a(80437);function o(t){return new Date(t)}function i(t,e,a,i,s){let d=[],u=o(e.startAt),c=o(e.endAt);for(let l of(c<=u&&d.push("L'heure de fin doit \xeatre apr\xe8s l'heure de d\xe9but."),d.push(...function(t,e,a,r=!1){let i=[];if(!t)return i;if("ON_LEAVE"===t.status||"INACTIVE"===t.status||"ARCHIVED"===t.status)return i.push(`${t.displayName} n'est pas disponible (${t.status}).`),i;for(let r of t.replacementsAsAbsent??[]){let n=o(r.startAt);if(e<o(r.endAt)&&a>n)return i.push(`${t.displayName} remplac\xe9e par ${r.substituteName} sur ce cr\xe9neau.`),i}let s=(0,n.bR)(e),d=t.schedules.find(t=>t.dayOfWeek===s&&t.active),u=(t.overtimes??[]).some(t=>{let r=o(t.startAt),n=o(t.endAt);return e>=r&&a<=n}),c=(t.replacementsAsSubstitute??[]).some(t=>{let r=o(t.startAt),n=o(t.endAt);return e>=r&&a<=n}),l=u||c;if(!r){if(!d&&!l)return i.push(`${t.displayName} ne travaille pas ce jour.`),i;if(d){let r=(0,n.xo)(e,d.startTime),o=(0,n.xo)(e,d.endTime);e>=r&&a<=o||l||i.push(`Hors horaires de ${t.displayName} (${d.startTime}–${d.endTime}).`)}}for(let r of t.breaks){if(r.dayOfWeek!==s)continue;let o=(0,n.xo)(e,r.startTime),d=(0,n.xo)(e,r.endTime);e<d&&a>o&&i.push(`Pause ${t.displayName} (${r.startTime}–${r.endTime}).`)}for(let r of t.leaves){if("APPROVED"!==r.status)continue;let s=o(r.startAt),d=(0,n.mv)(o(r.endAt));e<d&&a>s&&i.push(`${t.displayName} en cong\xe9 jusqu'au ${(0,n.Jp)(d)}.`)}return i}(a,u,c,s?.ignoreStaffSchedule===!0)),e.resourceId&&d.push(...function(t,e,a){let i=[];if(!t)return i;if(!t.active)return i.push(`${t.name} est inactive.`),i;for(let s of t.maintenances){if(!(0,r.VK)(s.status))continue;let d=o(s.startAt),u=o(s.endAt);e<u&&a>d&&i.push(`${t.name} en maintenance jusqu'au ${(0,n.Jp)(u)}.`)}return i}(i,u,c)),t)){if(l.id===e.excludeAppointmentId||"CANCELLED"===l.status)continue;let t=o(l.startAt),a=o(l.endAt);(0,n.ho)(u,t)&&u<a&&c>t&&(e.staffId&&l.staffId===e.staffId&&d.push(`${l.staffName} occup\xe9e \xb7 ${l.serviceName} (${(0,n.db)(t)}–${(0,n.db)(a)}).`),e.resourceId&&l.resourceId===e.resourceId&&d.push(`${l.resourceName??"Ressource"} indisponible \xb7 ${(0,n.db)(t)}–${(0,n.db)(a)}.`))}return{available:0===d.length,conflicts:d}}function s(t,e){let a=[],r=(0,n.Ld)(e.date),o=(0,n.Ld)(new Date),s=o.year===r.year&&o.month===r.month&&o.day===r.day,d=60*o.hour+o.minute;for(let o=8;o<24;o++)for(let u=0;u<60;u+=30){if(s&&60*o+u<d)continue;let c=(0,n.kG)(r,o,u),l=new Date(c.getTime()+6e4*e.durationMinutes),p=i(t,{staffId:e.staffId,resourceId:e.resourceId,startAt:c.toISOString(),endAt:l.toISOString(),excludeAppointmentId:e.excludeAppointmentId},e.staffContext,e.resourceContext,{ignoreStaffSchedule:e.ignoreStaffSchedule});a.push({time:`${String(o).padStart(2,"0")}:${String(u).padStart(2,"0")}`,available:p.available,reason:p.conflicts[0]})}return a}function d(t,e){if("ACTIVE"!==t.status)return!1;let a=(0,n.bR)(e),r=t.schedules.some(t=>t.dayOfWeek===a&&t.active),i=(0,n.Is)(e),s=(0,n.mv)(e),d=(t.overtimes??[]).some(t=>{let e=o(t.startAt);return i<o(t.endAt)&&s>e}),u=(t.replacementsAsSubstitute??[]).some(t=>{var e;return e=o(t.startAt),i<o(t.endAt)&&s>e});if(!r&&!d&&!u)return!1;for(let e of t.leaves){if("APPROVED"!==e.status)continue;let t=o(e.startAt);if(i<(0,n.mv)(o(e.endAt))&&s>t)return!1}return!(t.replacementsAsAbsent??[]).some(t=>{var e;return e=o(t.startAt),i<o(t.endAt)&&s>e})}},66250:(t,e,a)=>{a.d(e,{Uk:()=>r,VK:()=>n});let r=["CABINE","SALLE","FAUTEUIL","TABLE","MACHINE","EQUIPEMENT","AUTRE"];function n(t){return"SCHEDULED"===t||"IN_PROGRESS"===t}}};