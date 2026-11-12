"use strict";!function(){try{var t="undefined"!=typeof window?window:"undefined"!=typeof global?global:"undefined"!=typeof self?self:{},e=(new t.Error).stack;e&&(t._sentryDebugIds=t._sentryDebugIds||{},t._sentryDebugIds[e]="2e369949-fef3-41fb-8d8e-1882e384a33b",t._sentryDebugIdIdentifier="sentry-dbid-2e369949-fef3-41fb-8d8e-1882e384a33b")}catch(t){}}(),exports.id=318,exports.ids=[318],exports.modules={50318:(t,e,a)=>{a.a(t,async(t,o)=>{try{a.d(e,{$G:()=>s,Fz:()=>d,Tc:()=>I,XF:()=>l,fQ:()=>f,getAppointmentById:()=>m,listAppointmentsByOrg:()=>u});var r=a(70653),i=t([r]);r=(i.then?(await i)():i)[0];let A=`
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
`;function n(t,e,a){return`${t??""} ${e??""}`.trim()||a}function s(t,e,a,o){if(!a)return 0;let r=e>0?Math.min(t,e):t,i=null!=o?Number(o):0;return"FREE_SERVICE"===a?r:"PERCENTAGE"===a?Math.round(i/100*r*100)/100:"FIXED_AMOUNT"===a||"HAPPY_HOUR"===a||"PACKAGE"===a?Math.min(r,Math.max(0,i)):0}function d(t){let e=Number(t.price),a=Number(t.servicePrice??0),o=s(e,a,t.promotionType,t.promotionValue);return{id:t.id,organizationId:t.organizationId,customerId:t.customerId,customerName:n(t.customerFirstName,t.customerLastName,"Cliente inconnue"),serviceId:t.serviceId??"",serviceName:t.serviceName?.trim()||"Service inconnu",staffId:t.staffId??"",staffName:t.staffId?n(t.staffFirstName,t.staffLastName,"Employ\xe9e"):"Sans employ\xe9e",resourceId:t.resourceId??void 0,resourceName:t.resourceName??void 0,startAt:t.startAt.toISOString(),endAt:t.endAt.toISOString(),price:e,promotionId:t.promotionId,promotionCode:t.promotionCode,promotionName:t.promotionName,discount:o,amountDue:Number(t.amountDue??t.price),netPaid:Number(t.netPaid??0),paymentState:function(t,e){let a=Math.round(100*e)/100;return .01>=Math.max(0,Math.round((Math.round(100*Math.max(0,t))/100-a)*100)/100)?"paid":a>.009?"partial":"unpaid"}(Number(t.amountDue??t.price),Number(t.netPaid??0)),deposit:null!=t.deposit?Number(t.deposit):void 0,depositState:t.depositState??"NOT_REQUIRED",depositDueAt:t.depositDueAt?.toISOString()??null,status:t.status,notes:t.notes??void 0}}async function c(t){let{rows:e}=await r.pool.query(`UPDATE "Appointment"
     SET status = 'COMPLETED'::"AppointmentStatus", "updatedAt" = NOW()
     WHERE "organizationId" = $1
       AND "endAt" < NOW()
       AND "endAt" > NOW() - INTERVAL '2 days'
       AND status IN ('CONFIRMED', 'ARRIVED', 'IN_PROGRESS')
     RETURNING id, "serviceId"`,[t]);if(0===e.length)return;let{onAppointmentCompleted:o}=await Promise.all([a.e(5683),a.e(182)]).then(a.bind(a,30182)),{creditVisitIfEligible:i}=await Promise.all([a.e(5136),a.e(7821),a.e(6614)]).then(a.bind(a,54437));for(let a of e){if(a.serviceId)try{await o({organizationId:t,appointmentId:a.id,serviceId:a.serviceId,userId:null})}catch(t){console.error("[completeElapsedAppointments]",a.id,t)}try{await i({organizationId:t,appointmentId:a.id,actorId:null})}catch(t){console.error("[completeElapsedAppointments] loyalty visit",a.id,t)}}}async function u(t,e){try{let{expireOverdueDepositAppointments:e}=await a.e(819).then(a.bind(a,50819));await e(t)}catch{}try{await c(t)}catch{}try{let{dispatchDueCustomerPushes:e}=await a.e(11).then(a.bind(a,70011));await e(t)}catch{}let o=[t],i='WHERE a."organizationId" = $1';e?.from&&(o.push(e.from),i+=` AND a."startAt" >= $${o.length}`),e?.to&&(o.push(e.to),i+=` AND a."startAt" < $${o.length}`);let{rows:n}=await r.pool.query(`${A} ${i} ORDER BY a."startAt" ASC`,o);return n.map(d)}async function p(t,e){for(let[a,o]of[["Customer",e.customerId],["Service",e.serviceId],["Staff",e.staffId],["Resource",e.resourceId]]){if(!o)continue;let{rowCount:e}=await r.pool.query(`SELECT 1 FROM "${a}" WHERE id = $1 AND "organizationId" = $2`,[o,t]);if(!e)throw Error("REFERENCE_NOT_FOUND")}}async function l(t,e){await p(t,e);let o=`apt-${Date.now()}`,i=e.deposit??null,n="NOT_REQUIRED",s=null;try{let{resolveDepositRequirement:o}=await a.e(819).then(a.bind(a,50819)),d=e.deposit??null;if(null==d){let a=await r.pool.query('SELECT deposit::text FROM "Service" WHERE id = $1 AND "organizationId" = $2',[e.serviceId,t]);d=a.rows[0]?.deposit!=null?parseFloat(a.rows[0].deposit):null}let c=await o({organizationId:t,customerId:e.customerId,serviceDeposit:d,price:e.price});c.amount>0&&(i=c.amount,n=c.state,s=c.dueAt)}catch(t){console.error("[createAppointmentRow] deposit resolve",t)}await r.pool.query(`INSERT INTO "Appointment" (
      id, "organizationId", "customerId", "serviceId", "serviceNameSnapshot", "staffId", "resourceId",
      "startAt", "endAt", price, deposit, "depositState", "depositDueAt",
      status, source, notes, "updatedAt"
    ) VALUES (
      $1,$2,$3,$4,(SELECT name FROM "Service" WHERE id = $4),$5,$6,$7,$8,$9,$10,$11::"DepositState",$12,
      'PENDING',$13::"AppointmentSource",$14,NOW()
    )`,[o,t,e.customerId,e.serviceId,e.staffId||null,e.resourceId??null,new Date(e.startAt),new Date(e.endAt),e.price,i,n,s,e.source??"MANUAL",e.notes??null]);let{rows:c}=await r.pool.query(`${A} WHERE a.id = $1`,[o]),u=d(c[0]);try{let{notifyAppointmentCreated:e}=await a.e(8702).then(a.bind(a,98702));await e(t,u)}catch(t){console.error("[createAppointmentRow] notification",t)}try{let{syncAppointmentToGoogle:e}=await a.e(3538).then(a.bind(a,53538));e(t,u)}catch(t){console.error("[createAppointmentRow] google calendar",t)}return u}async function m(t,e){try{await c(e)}catch{}let{rows:a}=await r.pool.query(`${A} WHERE a.id = $1 AND a."organizationId" = $2`,[t,e]);return a[0]?d(a[0]):null}async function I(t,e,o,i){await p(e,{customerId:o.customerId,serviceId:o.serviceId,staffId:o.staffId,resourceId:o.resourceId});let n=await m(t,e),s=[],c=[],u=1,l=(t,e)=>{s.push(`"${t}" = $${u++}`),c.push(e)};if(o.customerId&&l("customerId",o.customerId),o.serviceId&&(l("serviceId",o.serviceId),s.push(`"serviceNameSnapshot" = (SELECT name FROM "Service" WHERE id = $${u-1})`)),void 0!==o.staffId&&l("staffId",o.staffId||null),void 0!==o.resourceId&&l("resourceId",o.resourceId??null),o.startAt&&l("startAt",new Date(o.startAt)),o.endAt&&l("endAt",new Date(o.endAt)),void 0!==o.price&&l("price",o.price),"promotionId"in o&&l("promotionId",o.promotionId??null),void 0!==o.deposit&&l("deposit",o.deposit??null),void 0!==o.notes&&l("notes",o.notes??null),o.status&&l("status",o.status),0===s.length)return null;s.push('"updatedAt" = NOW()'),c.push(t,e);let I=await r.pool.query(`UPDATE "Appointment" SET ${s.join(", ")} WHERE id = $${u} AND "organizationId" = $${u+1}`,c);if(0===I.rowCount)return null;let{rows:f}=await r.pool.query(`${A} WHERE a.id = $1 AND a."organizationId" = $2`,[t,e]),E=f[0]?d(f[0]):null;if(E&&n&&(o.startAt&&o.startAt!==n.startAt||o.endAt&&o.endAt!==n.endAt||o.staffId&&o.staffId!==n.staffId||void 0!==o.resourceId&&o.resourceId!==n.resourceId)){try{let{writeAuditLog:o}=await Promise.resolve().then(a.bind(a,66085));await o({organizationId:e,actorId:i?.actor?.id??"system",actorName:i?.actor?.name,entityType:"Appointment",entityId:t,action:"APPOINTMENT_RESCHEDULED",before:{startAt:n.startAt,endAt:n.endAt,staffId:n.staffId,resourceId:n.resourceId},after:{startAt:E.startAt,endAt:E.endAt,staffId:E.staffId,resourceId:E.resourceId}})}catch(t){console.error("[updateAppointmentRow] audit move",t)}try{let{notifyAppointmentRescheduled:t}=await a.e(8702).then(a.bind(a,98702));await t(e,E,{startAt:n.startAt,staffId:n.staffId,staffName:n.staffName})}catch(t){console.error("[updateAppointmentRow] notify move",t)}}if(E&&n&&o.status&&o.status!==n.status){try{let{notifyAppointmentStatusChange:t}=await a.e(8702).then(a.bind(a,98702));await t(e,E,n.status)}catch(t){console.error("[updateAppointmentRow] notification",t)}try{let{applyDepositOnStatusChange:r}=await a.e(819).then(a.bind(a,50819));await r({organizationId:e,appointmentId:t,previousStatus:n.status,nextStatus:o.status,cancelledByInstitute:i?.cancelledByInstitute??("CANCELLED"===o.status||"NO_SHOW"===o.status),actor:i?.actor??{id:"system",name:"Syst\xe8me"}})}catch(t){console.error("[updateAppointmentRow] deposit policy",t)}if("COMPLETED"===o.status&&"COMPLETED"!==n.status)try{let{creditVisitIfEligible:o}=await Promise.all([a.e(5136),a.e(7821),a.e(6614)]).then(a.bind(a,54437));await o({organizationId:e,appointmentId:t,actorId:i?.actor?.id??null})}catch(t){console.error("[updateAppointmentRow] loyalty visit",t)}if("CANCELLED"===o.status&&"CANCELLED"!==n.status)try{let{notifyWaitingListOnCancellation:o}=await a.e(8740).then(a.bind(a,18740));await o({organizationId:e,appointmentId:t,serviceId:n.serviceId,staffId:n.staffId,startAt:new Date(n.startAt),actor:i?.actor??{id:"system",name:"Syst\xe8me"}})}catch(t){console.error("[updateAppointmentRow] waiting list",t)}}let N=E?await m(t,e):null;if(N)try{let{syncAppointmentToGoogle:t}=await a.e(3538).then(a.bind(a,53538));t(e,N)}catch(t){console.error("[updateAppointmentRow] google calendar",t)}return N}function f(t){return"object"==typeof t&&null!==t&&"code"in t&&"23P01"===t.code}o()}catch(t){o(t)}})}};