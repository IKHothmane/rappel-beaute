"use strict";!function(){try{var t="undefined"!=typeof window?window:"undefined"!=typeof global?global:"undefined"!=typeof self?self:{},e=(new t.Error).stack;e&&(t._sentryDebugIds=t._sentryDebugIds||{},t._sentryDebugIds[e]="d404a342-28e6-4622-bf70-a52d667cc980",t._sentryDebugIdIdentifier="sentry-dbid-d404a342-28e6-4622-bf70-a52d667cc980")}catch(t){}}(),exports.id=5272,exports.ids=[5272,318],exports.modules={50318:(t,e,a)=>{a.a(t,async(t,o)=>{try{a.d(e,{$G:()=>s,Fz:()=>d,Tc:()=>I,XF:()=>p,fQ:()=>E,getAppointmentById:()=>l,listAppointmentsByOrg:()=>c});var n=a(70653),i=t([n]);n=(i.then?(await i)():i)[0];let N=`
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
`;function r(t,e,a){return`${t??""} ${e??""}`.trim()||a}function s(t,e,a,o){if(!a)return 0;let n=e>0?Math.min(t,e):t,i=null!=o?Number(o):0;return"FREE_SERVICE"===a?n:"PERCENTAGE"===a?Math.round(i/100*n*100)/100:"FIXED_AMOUNT"===a||"HAPPY_HOUR"===a||"PACKAGE"===a?Math.min(n,Math.max(0,i)):0}function d(t){let e=Number(t.price),a=Number(t.servicePrice??0),o=s(e,a,t.promotionType,t.promotionValue);return{id:t.id,organizationId:t.organizationId,customerId:t.customerId,customerName:r(t.customerFirstName,t.customerLastName,"Cliente inconnue"),serviceId:t.serviceId??"",serviceName:t.serviceName?.trim()||"Service inconnu",staffId:t.staffId??"",staffName:t.staffId?r(t.staffFirstName,t.staffLastName,"Employ\xe9e"):"Sans employ\xe9e",resourceId:t.resourceId??void 0,resourceName:t.resourceName??void 0,startAt:t.startAt.toISOString(),endAt:t.endAt.toISOString(),price:e,promotionId:t.promotionId,promotionCode:t.promotionCode,promotionName:t.promotionName,discount:o,amountDue:Number(t.amountDue??t.price),netPaid:Number(t.netPaid??0),paymentState:function(t,e){let a=Math.round(100*e)/100;return .01>=Math.max(0,Math.round((Math.round(100*Math.max(0,t))/100-a)*100)/100)?"paid":a>.009?"partial":"unpaid"}(Number(t.amountDue??t.price),Number(t.netPaid??0)),deposit:null!=t.deposit?Number(t.deposit):void 0,depositState:t.depositState??"NOT_REQUIRED",depositDueAt:t.depositDueAt?.toISOString()??null,status:t.status,notes:t.notes??void 0}}async function u(t){let{rows:e}=await n.pool.query(`UPDATE "Appointment"
     SET status = 'COMPLETED'::"AppointmentStatus", "updatedAt" = NOW()
     WHERE "organizationId" = $1
       AND "endAt" < NOW()
       AND "endAt" > NOW() - INTERVAL '2 days'
       AND status IN ('CONFIRMED', 'ARRIVED', 'IN_PROGRESS')
     RETURNING id, "serviceId"`,[t]);if(0===e.length)return;let{onAppointmentCompleted:o}=await Promise.all([a.e(5683),a.e(182)]).then(a.bind(a,30182)),{creditVisitIfEligible:i}=await Promise.all([a.e(5136),a.e(7821),a.e(6614)]).then(a.bind(a,54437));for(let a of e){if(a.serviceId)try{await o({organizationId:t,appointmentId:a.id,serviceId:a.serviceId,userId:null})}catch(t){console.error("[completeElapsedAppointments]",a.id,t)}try{await i({organizationId:t,appointmentId:a.id,actorId:null})}catch(t){console.error("[completeElapsedAppointments] loyalty visit",a.id,t)}}}async function c(t,e){try{let{expireOverdueDepositAppointments:e}=await a.e(819).then(a.bind(a,50819));await e(t)}catch{}try{await u(t)}catch{}try{let{dispatchDueCustomerPushes:e}=await a.e(11).then(a.bind(a,70011));await e(t)}catch{}let o=[t],i='WHERE a."organizationId" = $1';e?.from&&(o.push(e.from),i+=` AND a."startAt" >= $${o.length}`),e?.to&&(o.push(e.to),i+=` AND a."startAt" < $${o.length}`);let{rows:r}=await n.pool.query(`${N} ${i} ORDER BY a."startAt" ASC`,o);return r.map(d)}async function m(t,e){for(let[a,o]of[["Customer",e.customerId],["Service",e.serviceId],["Staff",e.staffId],["Resource",e.resourceId]]){if(!o)continue;let{rowCount:e}=await n.pool.query(`SELECT 1 FROM "${a}" WHERE id = $1 AND "organizationId" = $2`,[o,t]);if(!e)throw Error("REFERENCE_NOT_FOUND")}}async function p(t,e){await m(t,e);let o=`apt-${Date.now()}`,i=e.deposit??null,r="NOT_REQUIRED",s=null;try{let{resolveDepositRequirement:o}=await a.e(819).then(a.bind(a,50819)),d=e.deposit??null;if(null==d){let a=await n.pool.query('SELECT deposit::text FROM "Service" WHERE id = $1 AND "organizationId" = $2',[e.serviceId,t]);d=a.rows[0]?.deposit!=null?parseFloat(a.rows[0].deposit):null}let u=await o({organizationId:t,customerId:e.customerId,serviceDeposit:d,price:e.price});u.amount>0&&(i=u.amount,r=u.state,s=u.dueAt)}catch(t){console.error("[createAppointmentRow] deposit resolve",t)}await n.pool.query(`INSERT INTO "Appointment" (
      id, "organizationId", "customerId", "serviceId", "serviceNameSnapshot", "staffId", "resourceId",
      "startAt", "endAt", price, deposit, "depositState", "depositDueAt",
      status, source, notes, "updatedAt"
    ) VALUES (
      $1,$2,$3,$4,(SELECT name FROM "Service" WHERE id = $4),$5,$6,$7,$8,$9,$10,$11::"DepositState",$12,
      'PENDING',$13::"AppointmentSource",$14,NOW()
    )`,[o,t,e.customerId,e.serviceId,e.staffId||null,e.resourceId??null,new Date(e.startAt),new Date(e.endAt),e.price,i,r,s,e.source??"MANUAL",e.notes??null]);let{rows:u}=await n.pool.query(`${N} WHERE a.id = $1`,[o]),c=d(u[0]);try{let{notifyAppointmentCreated:e}=await a.e(8702).then(a.bind(a,98702));await e(t,c)}catch(t){console.error("[createAppointmentRow] notification",t)}try{let{syncAppointmentToGoogle:e}=await a.e(3538).then(a.bind(a,53538));e(t,c)}catch(t){console.error("[createAppointmentRow] google calendar",t)}return c}async function l(t,e){try{await u(e)}catch{}let{rows:a}=await n.pool.query(`${N} WHERE a.id = $1 AND a."organizationId" = $2`,[t,e]);return a[0]?d(a[0]):null}async function I(t,e,o,i){await m(e,{customerId:o.customerId,serviceId:o.serviceId,staffId:o.staffId,resourceId:o.resourceId});let r=await l(t,e),s=[],u=[],c=1,p=(t,e)=>{s.push(`"${t}" = $${c++}`),u.push(e)};if(o.customerId&&p("customerId",o.customerId),o.serviceId&&(p("serviceId",o.serviceId),s.push(`"serviceNameSnapshot" = (SELECT name FROM "Service" WHERE id = $${c-1})`)),void 0!==o.staffId&&p("staffId",o.staffId||null),void 0!==o.resourceId&&p("resourceId",o.resourceId??null),o.startAt&&p("startAt",new Date(o.startAt)),o.endAt&&p("endAt",new Date(o.endAt)),void 0!==o.price&&p("price",o.price),"promotionId"in o&&p("promotionId",o.promotionId??null),void 0!==o.deposit&&p("deposit",o.deposit??null),void 0!==o.notes&&p("notes",o.notes??null),o.status&&p("status",o.status),0===s.length)return null;s.push('"updatedAt" = NOW()'),u.push(t,e);let I=await n.pool.query(`UPDATE "Appointment" SET ${s.join(", ")} WHERE id = $${c} AND "organizationId" = $${c+1}`,u);if(0===I.rowCount)return null;let{rows:E}=await n.pool.query(`${N} WHERE a.id = $1 AND a."organizationId" = $2`,[t,e]),A=E[0]?d(E[0]):null;if(A&&r&&(o.startAt&&o.startAt!==r.startAt||o.endAt&&o.endAt!==r.endAt||o.staffId&&o.staffId!==r.staffId||void 0!==o.resourceId&&o.resourceId!==r.resourceId)){try{let{writeAuditLog:o}=await Promise.resolve().then(a.bind(a,66085));await o({organizationId:e,actorId:i?.actor?.id??"system",actorName:i?.actor?.name,entityType:"Appointment",entityId:t,action:"APPOINTMENT_RESCHEDULED",before:{startAt:r.startAt,endAt:r.endAt,staffId:r.staffId,resourceId:r.resourceId},after:{startAt:A.startAt,endAt:A.endAt,staffId:A.staffId,resourceId:A.resourceId}})}catch(t){console.error("[updateAppointmentRow] audit move",t)}try{let{notifyAppointmentRescheduled:t}=await a.e(8702).then(a.bind(a,98702));await t(e,A,{startAt:r.startAt,staffId:r.staffId,staffName:r.staffName})}catch(t){console.error("[updateAppointmentRow] notify move",t)}}if(A&&r&&o.status&&o.status!==r.status){try{let{notifyAppointmentStatusChange:t}=await a.e(8702).then(a.bind(a,98702));await t(e,A,r.status)}catch(t){console.error("[updateAppointmentRow] notification",t)}try{let{applyDepositOnStatusChange:n}=await a.e(819).then(a.bind(a,50819));await n({organizationId:e,appointmentId:t,previousStatus:r.status,nextStatus:o.status,cancelledByInstitute:i?.cancelledByInstitute??("CANCELLED"===o.status||"NO_SHOW"===o.status),actor:i?.actor??{id:"system",name:"Syst\xe8me"}})}catch(t){console.error("[updateAppointmentRow] deposit policy",t)}if("COMPLETED"===o.status&&"COMPLETED"!==r.status)try{let{creditVisitIfEligible:o}=await Promise.all([a.e(5136),a.e(7821),a.e(6614)]).then(a.bind(a,54437));await o({organizationId:e,appointmentId:t,actorId:i?.actor?.id??null})}catch(t){console.error("[updateAppointmentRow] loyalty visit",t)}if("CANCELLED"===o.status&&"CANCELLED"!==r.status)try{let{notifyWaitingListOnCancellation:o}=await a.e(8740).then(a.bind(a,18740));await o({organizationId:e,appointmentId:t,serviceId:r.serviceId,staffId:r.staffId,startAt:new Date(r.startAt),actor:i?.actor??{id:"system",name:"Syst\xe8me"}})}catch(t){console.error("[updateAppointmentRow] waiting list",t)}}let y=A?await l(t,e):null;if(y)try{let{syncAppointmentToGoogle:t}=await a.e(3538).then(a.bind(a,53538));t(e,y)}catch(t){console.error("[updateAppointmentRow] google calendar",t)}return y}function E(t){return"object"==typeof t&&null!==t&&"code"in t&&"23P01"===t.code}o()}catch(t){o(t)}})},15272:(t,e,a)=>{a.a(t,async(t,o)=>{try{a.d(e,{$S:()=>R,Gd:()=>m,Rv:()=>A,UN:()=>L,Vd:()=>C,XB:()=>$,i2:()=>O,qE:()=>w,refundPayment:()=>T,uQ:()=>S,wi:()=>y,wv:()=>f});var n=a(84770),i=a(50318),r=a(70653),s=t([i,r]);function d(t){return`${t}_${(0,n.randomBytes)(8).toString("hex")}`}function u(t){return"object"==typeof t&&null!==t&&"code"in t&&"23505"===t.code}function c(t){let e=t.customerFirst||t.customerLast?`${t.customerFirst??""} ${t.customerLast??""}`.trim():"",a=String(t.invoiceCustomerName??"").trim();return{id:String(t.id),appointmentId:t.appointmentId??null,customerId:t.customerId??null,customerName:e||a||null,customerPhone:t.customerPhone??t.invoiceCustomerPhone??null,serviceName:t.serviceName??null,amount:parseFloat(String(t.amount))||0,method:t.method,kind:t.kind,status:t.status,parentPaymentId:t.parentPaymentId??null,giftCardId:t.giftCardId??null,ticketNumber:t.ticketNumber??null,notes:t.notes??null,userId:t.userId??null,userName:t.userFirst||t.userLast?`${t.userFirst??""} ${t.userLast??""}`.trim():null,paidAt:new Date(t.paidAt).toISOString(),createdAt:new Date(t.createdAt).toISOString()}}async function m(t,e){let{rows:a}=await e.query(`SELECT
       to_char((NOW() AT TIME ZONE 'Africa/Casablanca'), 'YYYY-MM-DD') AS "dayKey",
       to_char((NOW() AT TIME ZONE 'Africa/Casablanca'), 'DD/MM') AS "dayLabel"`),o=a[0]?.dayKey??new Date().toISOString().slice(0,10),n=a[0]?.dayLabel??new Date().toLocaleDateString("fr-FR",{day:"2-digit",month:"2-digit"});await e.query(`INSERT INTO "PaymentTicketSequence" ("organizationId", "dayKey", "lastValue", "updatedAt")
     VALUES ($1, $2, 0, NOW())
     ON CONFLICT ("organizationId", "dayKey") DO NOTHING`,[t,o]);let{rows:i}=await e.query(`UPDATE "PaymentTicketSequence"
     SET "lastValue" = "lastValue" + 1, "updatedAt" = NOW()
     WHERE "organizationId" = $1 AND "dayKey" = $2
     RETURNING "lastValue"`,[t,o]),r=i[0]?.lastValue??1;return`${n}-${String(r).padStart(3,"0")}`}async function p(t,e){let a=e??r.pool,{rows:o}=await a.query(`SELECT
      s.id, s.status::text, s."openingFloat"::text, s."openedAt", s."openedById",
      s."closedAt", s."closedById", s."closingCounted"::text, s."expectedBalance"::text,
      s.difference::text, s."closeReason", s.notes,
      ou."firstName" AS "openFirst", ou."lastName" AS "openLast",
      cu."firstName" AS "closeFirst", cu."lastName" AS "closeLast"
     FROM "CashRegisterSession" s
     LEFT JOIN "User" ou ON ou.id = s."openedById"
     LEFT JOIN "User" cu ON cu.id = s."closedById"
     WHERE s."organizationId" = $1 AND s.status = 'OPEN'
     LIMIT 1`,[t]);return o[0]??null}async function l(t,e){let a=e??r.pool,{rows:o}=await a.query(`SELECT
      COALESCE(SUM(amount) FILTER (WHERE amount > 0 AND type <> 'OPENING'), 0)::text AS "cashIn",
      COALESCE(SUM(ABS(amount)) FILTER (WHERE amount < 0 AND type <> 'CLOSING'), 0)::text AS "cashOut",
      COALESCE(SUM(amount), 0)::text AS balance
     FROM "CashRegisterTransaction"
     WHERE "sessionId" = $1 AND type <> 'CLOSING'`,[t]);return{cashIn:parseFloat(o[0]?.cashIn??"0")||0,cashOut:parseFloat(o[0]?.cashOut??"0")||0,balance:parseFloat(o[0]?.balance??"0")||0}}async function I(t){let{rows:e}=await r.pool.query(`SELECT method::text, COALESCE(SUM(
        CASE WHEN kind = 'REFUND' THEN -amount ELSE amount END
      ), 0)::text AS total
     FROM "Payment"
     WHERE "organizationId" = $1
       AND status = 'COMPLETED'
       AND "paidAt" >= date_trunc('day', NOW())
     GROUP BY method`,[t]),a={cash:0,card:0,transfer:0,online:0,other:0,total:0};for(let t of e){let e=parseFloat(t.total)||0;a.total+=e,"CASH"===t.method?a.cash+=e:"CARD"===t.method?a.card+=e:"TRANSFER"===t.method?a.transfer+=e:"ONLINE"===t.method?a.online+=e:a.other+=e}return a}async function E(t,e){let a=await l(String(e.id)),o=await I(t),n=parseFloat(String(e.openingFloat))||0;return{id:String(e.id),status:e.status,openingFloat:n,openedAt:new Date(e.openedAt).toISOString(),openedById:String(e.openedById),openedByName:e.openFirst||e.openLast?`${e.openFirst??""} ${e.openLast??""}`.trim():null,closedAt:e.closedAt?new Date(e.closedAt).toISOString():null,closedById:e.closedById??null,closedByName:e.closeFirst||e.closeLast?`${e.closeFirst??""} ${e.closeLast??""}`.trim():null,closingCounted:null!=e.closingCounted?parseFloat(String(e.closingCounted)):null,expectedBalance:null!=e.expectedBalance?parseFloat(String(e.expectedBalance)):null,difference:null!=e.difference?parseFloat(String(e.difference)):null,closeReason:e.closeReason??null,notes:e.notes??null,cashIn:a.cashIn,cashOut:a.cashOut,theoreticalBalance:a.balance,paymentsToday:o}}async function N(t,e=6){let{rows:a}=await r.pool.query(`SELECT
      s.id, s."openedAt", s."closedAt",
      s."closingCounted"::text, s."expectedBalance"::text, s.difference::text,
      cu."firstName" AS "closeFirst", cu."lastName" AS "closeLast"
     FROM "CashRegisterSession" s
     LEFT JOIN "User" cu ON cu.id = s."closedById"
     WHERE s."organizationId" = $1 AND s.status = 'CLOSED'
     ORDER BY COALESCE(s."closedAt", s."openedAt") DESC
     LIMIT $2`,[t,e]);return a.map(t=>({id:String(t.id),openedAt:new Date(t.openedAt).toISOString(),closedAt:t.closedAt?new Date(t.closedAt).toISOString():null,closedByName:t.closeFirst||t.closeLast?`${t.closeFirst??""} ${t.closeLast??""}`.trim():null,closingCounted:null!=t.closingCounted?parseFloat(String(t.closingCounted)):null,expectedBalance:null!=t.expectedBalance?parseFloat(String(t.expectedBalance)):null,difference:null!=t.difference?parseFloat(String(t.difference)):null}))}async function A(t){let e=await N(t),a=await p(t);if(!a){let{rows:a}=await r.pool.query(`SELECT
        s.id, s.status::text, s."openingFloat"::text, s."openedAt", s."openedById",
        s."closedAt", s."closedById", s."closingCounted"::text, s."expectedBalance"::text,
        s.difference::text, s."closeReason", s.notes,
        ou."firstName" AS "openFirst", ou."lastName" AS "openLast",
        cu."firstName" AS "closeFirst", cu."lastName" AS "closeLast"
       FROM "CashRegisterSession" s
       LEFT JOIN "User" ou ON ou.id = s."openedById"
       LEFT JOIN "User" cu ON cu.id = s."closedById"
       WHERE s."organizationId" = $1
       ORDER BY s."openedAt" DESC LIMIT 1`,[t]);if(!a[0])return{session:null,transactions:[],recentClosed:e};let o=await E(t,a[0]),n=await y(t,{sessionId:o.id,limit:50});return{session:o,transactions:n,recentClosed:e}}let o=await E(t,a),n=await y(t,{sessionId:o.id,limit:80});return{session:o,transactions:n,recentClosed:e}}async function y(t,e){let a=['t."organizationId" = $1'],o=[t],n=2;e.sessionId&&(a.push(`t."sessionId" = $${n}`),o.push(e.sessionId),n++),o.push(e.limit??50);let{rows:i}=await r.pool.query(`SELECT
      t.id, t."sessionId", t.type::text, t.amount::text, t.method::text,
      t.reason, t."paymentId", t."userId", t."createdAt",
      u."firstName" AS "userFirst", u."lastName" AS "userLast"
     FROM "CashRegisterTransaction" t
     LEFT JOIN "User" u ON u.id = t."userId"
     WHERE ${a.join(" AND ")}
     ORDER BY t."createdAt" DESC
     LIMIT $${n}`,o);return i.map(t=>({id:String(t.id),sessionId:String(t.sessionId),type:t.type,amount:parseFloat(String(t.amount))||0,method:t.method??null,reason:t.reason??null,paymentId:t.paymentId??null,userId:t.userId??null,userName:t.userFirst||t.userLast?`${t.userFirst??""} ${t.userLast??""}`.trim():null,createdAt:new Date(t.createdAt).toISOString()}))}async function S(t,e,a){if(await p(t))throw Error("ALREADY_OPEN");let o=await r.pool.connect();try{await o.query("BEGIN");let n=d("crs");await o.query(`INSERT INTO "CashRegisterSession" (
        id, "organizationId", "openedById", "openingFloat", status, notes, "updatedAt"
      ) VALUES ($1,$2,$3,$4,'OPEN'::"CashRegisterStatus",$5,NOW())`,[n,t,a,e.openingFloat,e.notes??null]),await o.query(`INSERT INTO "CashRegisterTransaction" (
        id, "organizationId", "sessionId", type, amount, method, reason, "userId", "idempotencyKey"
      ) VALUES ($1,$2,$3,'OPENING'::"CashTxnType",$4,'CASH'::"PaymentMethod",$5,$6,$7)`,[d("ctx"),t,n,e.openingFloat,"Fond de caisse",a,`open:${n}`]),await o.query("COMMIT")}catch(t){if(await o.query("ROLLBACK"),u(t))throw Error("ALREADY_OPEN");throw t}finally{o.release()}return A(t)}async function O(t,e,a){let o=await p(t);if(!o)throw Error("NO_OPEN_SESSION");let n=await r.pool.connect();try{await n.query("BEGIN");let i=(await l(String(o.id),n)).balance,r=Math.round((e.countedAmount-i)*100)/100;await n.query(`INSERT INTO "CashRegisterTransaction" (
        id, "organizationId", "sessionId", type, amount, method, reason, "userId", "idempotencyKey"
      ) VALUES ($1,$2,$3,'CLOSING'::"CashTxnType",$4,'CASH'::"PaymentMethod",$5,$6,$7)`,[d("ctx"),t,o.id,0,e.reason,a,`close:${o.id}`]),await n.query(`UPDATE "CashRegisterSession"
       SET status = 'CLOSED'::"CashRegisterStatus",
           "closedById" = $1,
           "closedAt" = NOW(),
           "closingCounted" = $2,
           "expectedBalance" = $3,
           difference = $4,
           "closeReason" = $5,
           "updatedAt" = NOW()
       WHERE id = $6`,[a,e.countedAmount,i,r,e.reason,o.id]),await n.query("COMMIT")}catch(t){if(await n.query("ROLLBACK"),u(t))throw Error("ALREADY_CLOSED");throw t}finally{n.release()}return A(t)}async function f(t,e,a){let o=await p(t);if(!o)throw Error("NO_OPEN_SESSION");let n="CASH_IN"===e.type?Math.abs(e.amount):-Math.abs(e.amount),i=e.idempotencyKey??`manual:${o.id}:${e.type}:${n}:${e.reason}:${Date.now()}`,s=await r.pool.query(`SELECT id FROM "CashRegisterTransaction"
     WHERE "organizationId" = $1 AND "idempotencyKey" = $2`,[t,i]);if(s.rows[0]){let e=(await y(t,{sessionId:String(o.id),limit:20})).find(t=>t.id===s.rows[0].id);if(e)return e}let u=d("ctx");await r.pool.query(`INSERT INTO "CashRegisterTransaction" (
      id, "organizationId", "sessionId", type, amount, method, reason, "userId", "idempotencyKey"
    ) VALUES ($1,$2,$3,$4::"CashTxnType",$5,'CASH'::"PaymentMethod",$6,$7,$8)`,[u,t,o.id,e.type,n,e.reason,a,i]);let c=(await y(t,{sessionId:String(o.id),limit:5})).find(t=>t.id===u);if(!c)throw Error("TXN_NOT_FOUND");return c}async function h(t,e){let a="SALE"===e.type?Math.abs(e.amount):-Math.abs(e.amount);await t.query(`INSERT INTO "CashRegisterTransaction" (
      id, "organizationId", "sessionId", type, amount, method, reason, "paymentId", "userId", "idempotencyKey"
    ) VALUES ($1,$2,$3,$4::"CashTxnType",$5,'CASH'::"PaymentMethod",$6,$7,$8,$9)
    ON CONFLICT ("organizationId", "idempotencyKey") DO NOTHING`,[d("ctx"),e.organizationId,e.sessionId,e.type,a,e.reason,e.paymentId,e.userId,e.idempotencyKey])}async function L(t,e){let a=await r.pool.query(`SELECT a.price::text, s.price::text AS "servicePrice",
            promo.type::text AS "promotionType", promo.value::text AS "promotionValue"
     FROM "Appointment" a
     LEFT JOIN "Service" s ON s.id = a."serviceId"
     LEFT JOIN "Promotion" promo ON promo.id = a."promotionId" AND promo."deletedAt" IS NULL
     WHERE a.id = $1 AND a."organizationId" = $2`,[e,t]);if(!a.rows[0])return null;let o=await r.pool.query(`SELECT total::text FROM "Invoice"
     WHERE "appointmentId" = $1 AND "organizationId" = $2
       AND status <> 'VOID'
     ORDER BY "createdAt" DESC LIMIT 1`,[e,t]),n=await w(t,{appointmentId:e,limit:100}),s=n.filter(t=>"REFUND"!==t.kind&&"COMPLETED"===t.status).reduce((t,e)=>t+e.amount,0),d=n.filter(t=>"REFUND"===t.kind&&"COMPLETED"===t.status).reduce((t,e)=>t+e.amount,0),u=Math.round((s-d)*100)/100,c=parseFloat(a.rows[0].price)||0,m=(0,i.$G)(c,parseFloat(a.rows[0].servicePrice??"")||0,a.rows[0].promotionType,a.rows[0].promotionValue),p=null!=o.rows[0]?parseFloat(o.rows[0].total)||0:Math.max(0,Math.round((c-m)*100)/100);return{appointmentId:e,price:p,paid:Math.round(100*s)/100,refunded:Math.round(100*d)/100,netPaid:u,remaining:Math.max(0,Math.round((p-u)*100)/100),payments:n}}async function w(t,e){let a=['p."organizationId" = $1'],o=[t],n=2;e.appointmentId&&(a.push(`p."appointmentId" = $${n}`),o.push(e.appointmentId),n++),e.customerId&&(a.push(`p."customerId" = $${n}`),o.push(e.customerId),n++);let i=e.limit??40;o.push(i);let{rows:s}=await r.pool.query(`SELECT
      p.id, p."appointmentId", p."customerId", p.amount::text, p.method::text,
      p.kind::text, p.status::text, p."parentPaymentId", p."giftCardId", p."ticketNumber",
      p.notes, p."userId",
      p."paidAt", p."createdAt",
      c."firstName" AS "customerFirst", c."lastName" AS "customerLast",
      c.phone AS "customerPhone",
      inv."customerNameSnapshot" AS "invoiceCustomerName",
      inv."customerPhoneSnapshot" AS "invoiceCustomerPhone",
      COALESCE(
        CASE
          WHEN p.notes ILIKE '%POS%' OR p.notes ILIKE '%vente%' THEN (
            SELECT NULLIF(string_agg(ii."nameSnapshot", ' + ' ORDER BY ii."sortOrder"), '')
            FROM "InvoiceItem" ii
            WHERE ii."invoiceId" = COALESCE(
              p."invoiceId",
              (SELECT s."invoiceId" FROM "PosSale" s WHERE s."paymentId" = p.id LIMIT 1)
            )
          )
          ELSE NULL
        END,
        NULLIF((
          SELECT trim(both FROM substr(line, 7))
          FROM unnest(string_to_array(COALESCE(a.notes, ''), E'
')) AS line
          WHERE line LIKE 'Soins:%'
          LIMIT 1
        ), ''),
        s.name,
        a."serviceNameSnapshot",
        (
          SELECT NULLIF(string_agg(ii."nameSnapshot", ' + ' ORDER BY ii."sortOrder"), '')
          FROM "InvoiceItem" ii
          WHERE ii."invoiceId" = p."invoiceId"
        ),
        CASE
          WHEN p.notes ILIKE '%POS%' OR p.notes ILIKE '%vente%' THEN 'Vente produits'
          ELSE NULL
        END
      ) AS "serviceName",
      u."firstName" AS "userFirst", u."lastName" AS "userLast"
     FROM "Payment" p
     LEFT JOIN "Customer" c ON c.id = p."customerId"
     LEFT JOIN "Appointment" a ON a.id = p."appointmentId"
     LEFT JOIN "Service" s ON s.id = a."serviceId"
     LEFT JOIN "Invoice" inv ON inv.id = p."invoiceId"
     LEFT JOIN "User" u ON u.id = p."userId"
     WHERE ${a.join(" AND ")}
     ORDER BY p."paidAt" DESC
     LIMIT $${n}`,o);return s.map(t=>c(t))}async function R(t,e){let{rows:a}=await r.pool.query(`SELECT
      p.id, p."appointmentId", p."customerId", p.amount::text, p.method::text,
      p.kind::text, p.status::text, p."parentPaymentId", p."giftCardId", p."ticketNumber",
      p.notes, p."userId",
      p."paidAt", p."createdAt",
      c."firstName" AS "customerFirst", c."lastName" AS "customerLast",
      c.phone AS "customerPhone",
      inv."customerNameSnapshot" AS "invoiceCustomerName",
      inv."customerPhoneSnapshot" AS "invoiceCustomerPhone",
      COALESCE(
        CASE
          WHEN p.notes ILIKE '%POS%' OR p.notes ILIKE '%vente%' THEN (
            SELECT NULLIF(string_agg(ii."nameSnapshot", ' + ' ORDER BY ii."sortOrder"), '')
            FROM "InvoiceItem" ii
            WHERE ii."invoiceId" = COALESCE(
              p."invoiceId",
              (SELECT s."invoiceId" FROM "PosSale" s WHERE s."paymentId" = p.id LIMIT 1)
            )
          )
          ELSE NULL
        END,
        NULLIF((
          SELECT trim(both FROM substr(line, 7))
          FROM unnest(string_to_array(COALESCE(a.notes, ''), E'
')) AS line
          WHERE line LIKE 'Soins:%'
          LIMIT 1
        ), ''),
        s.name,
        a."serviceNameSnapshot",
        (
          SELECT NULLIF(string_agg(ii."nameSnapshot", ' + ' ORDER BY ii."sortOrder"), '')
          FROM "InvoiceItem" ii
          WHERE ii."invoiceId" = p."invoiceId"
        ),
        CASE
          WHEN p.notes ILIKE '%POS%' OR p.notes ILIKE '%vente%' THEN 'Vente produits'
          ELSE NULL
        END
      ) AS "serviceName",
      u."firstName" AS "userFirst", u."lastName" AS "userLast"
     FROM "Payment" p
     LEFT JOIN "Customer" c ON c.id = p."customerId"
     LEFT JOIN "Appointment" a ON a.id = p."appointmentId"
     LEFT JOIN "Service" s ON s.id = a."serviceId"
     LEFT JOIN "Invoice" inv ON inv.id = p."invoiceId"
     LEFT JOIN "User" u ON u.id = p."userId"
     WHERE p.id = $1 AND p."organizationId" = $2`,[e,t]);return a[0]?c(a[0]):null}async function C(t,e,o){if(e.idempotencyKey&&(await r.pool.query(`SELECT id FROM "Payment"
       WHERE "organizationId" = $1 AND "idempotencyKey" = $2`,[t,e.idempotencyKey])).rows[0]){let a=await L(t,e.appointmentId);if(!a)throw Error("APPOINTMENT_NOT_FOUND");return{payments:a.payments,summary:a}}let n=await r.pool.query(`SELECT id, "customerId", price::text, status::text
     FROM "Appointment"
     WHERE id = $1 AND "organizationId" = $2`,[e.appointmentId,t]);if(!n.rows[0])throw Error("APPOINTMENT_NOT_FOUND");let i=e.items.some(t=>"CASH"===t.method),s=i?await p(t):null;if(i&&!s)throw Error("NO_OPEN_SESSION");let c=await L(t,e.appointmentId),l=e.items.reduce((t,e)=>t+e.amount,0);if(c&&l>c.remaining+.01)throw Error("OVERPAY");let I=[],E=await r.pool.connect();try{await E.query("BEGIN");for(let i=0;i<e.items.length;i++){let r=e.items[i],u=d("pay"),c=e.idempotencyKey&&0===i?e.idempotencyKey:e.idempotencyKey?`${e.idempotencyKey}:${i}`:null,p=r.giftCardId??null;if("GIFT_CARD"===r.method){let{redeemGiftCard:e}=await a.e(6145).then(a.bind(a,26145)),n=await e({organizationId:t,giftCardId:r.giftCardId,code:r.giftCardCode,amount:r.amount,paymentId:u,userId:o,client:E});p=n.giftCardId,Math.abs(n.redeemed-r.amount)>.01&&(r.amount=n.redeemed)}let l=await m(t,E);await E.query(`INSERT INTO "Payment" (
          id, "organizationId", "appointmentId", "customerId", amount, method, kind,
          status, "giftCardId", "ticketNumber", notes, "userId", "idempotencyKey", "paidAt", "updatedAt"
        ) VALUES (
          $1,$2,$3,$4,$5,$6::"PaymentMethod",$7::"PaymentKind",
          'COMPLETED'::"PaymentStatus",$8,$9,$10,$11,$12,NOW(),NOW()
        )`,[u,t,e.appointmentId,n.rows[0].customerId,r.amount,r.method,r.kind??"PAYMENT",p,l,e.notes??null,o,c]),I.push(u),"CASH"===r.method&&s&&await h(E,{organizationId:t,sessionId:String(s.id),type:"SALE",amount:r.amount,paymentId:u,userId:o,reason:"Encaissement RDV",idempotencyKey:`cashpay:${u}`})}await E.query("COMMIT")}catch(a){if(await E.query("ROLLBACK"),u(a)&&e.idempotencyKey){let a=await L(t,e.appointmentId);if(!a)throw Error("APPOINTMENT_NOT_FOUND");return{payments:a.payments,summary:a}}throw a}finally{E.release()}let N=await L(t,e.appointmentId);if(!N)throw Error("APPOINTMENT_NOT_FOUND");let A=N.payments.filter(t=>I.includes(t.id));try{let{refreshInvoiceStatusForAppointment:o}=await Promise.all([a.e(5683),a.e(182)]).then(a.bind(a,30182));await o(t,e.appointmentId)}catch{}try{let{creditVisitIfEligible:i}=await Promise.all([a.e(5136),a.e(7821),a.e(6614)]).then(a.bind(a,54437));"COMPLETED"===n.rows[0].status&&N.remaining<=.01&&await i({organizationId:t,appointmentId:e.appointmentId,actorId:o})}catch(t){console.error("[createPayments] loyalty visit",t)}try{let{earnPointsFromPayment:i}=await a.e(5136).then(a.bind(a,45136));for(let a of A)"REFUND"!==a.kind&&await i({organizationId:t,customerId:n.rows[0].customerId,paymentId:a.id,amountMad:a.amount,appointmentId:e.appointmentId,userId:o})}catch(t){console.error("[createPayments] loyalty earn",t)}try{let{notifyPaymentReceived:o}=await a.e(8702).then(a.bind(a,98702)),{PAYMENT_METHOD_LABEL:n}=await a.e(7036).then(a.bind(a,33810));for(let a of A)"PAYMENT"===a.kind&&await o(t,{paymentId:a.id,appointmentId:e.appointmentId,amount:a.amount,method:n[a.method]??a.method})}catch(t){console.error("[createPayments] notification",t)}if(A.some(t=>"DEPOSIT"===t.kind))try{let{applyDepositPaymentEffects:n}=await a.e(819).then(a.bind(a,50819));await n(t,e.appointmentId,{id:o,name:null})}catch(t){console.error("[createPayments] deposit effects",t)}return{payments:A,summary:N}}async function T(t,e,o,n){if(o.idempotencyKey){let e=await r.pool.query(`SELECT id FROM "Payment"
       WHERE "organizationId" = $1 AND "idempotencyKey" = $2`,[t,o.idempotencyKey]);if(e.rows[0]){let a=await R(t,e.rows[0].id);if(a)return a}}let i=await R(t,e);if(!i)throw Error("NOT_FOUND");if("REFUND"===i.kind)throw Error("CANNOT_REFUND_REFUND");if("COMPLETED"!==i.status)throw Error("NOT_REFUNDABLE");let{rows:s}=await r.pool.query(`SELECT COALESCE(SUM(amount), 0)::text AS t FROM "Payment"
     WHERE "parentPaymentId" = $1 AND kind = 'REFUND' AND status = 'COMPLETED'`,[e]),c=parseFloat(s[0]?.t??"0")||0;if(o.amount>i.amount-c+.01)throw Error("OVER_REFUND");let l="CASH"===o.method,I=l?await p(t):null;if(l&&!I)throw Error("NO_OPEN_SESSION");let E=d("pay"),N=await r.pool.connect();try{await N.query("BEGIN");let a=await m(t,N);await N.query(`INSERT INTO "Payment" (
        id, "organizationId", "appointmentId", "customerId", amount, method, kind,
        status, "parentPaymentId", "ticketNumber", notes, "userId", "idempotencyKey", "paidAt", "updatedAt"
      ) VALUES (
        $1,$2,$3,$4,$5,$6::"PaymentMethod",'REFUND'::"PaymentKind",
        'COMPLETED'::"PaymentStatus",$7,$8,$9,$10,$11,NOW(),NOW()
      )`,[E,t,i.appointmentId,i.customerId,o.amount,o.method,e,a,o.reason??"Remboursement",n,o.idempotencyKey??null]),l&&I&&await h(N,{organizationId:t,sessionId:String(I.id),type:"REFUND_OUT",amount:o.amount,paymentId:E,userId:n,reason:o.reason??"Remboursement esp\xe8ces",idempotencyKey:`cashrefund:${E}`}),await N.query("COMMIT")}catch(e){if(await N.query("ROLLBACK"),u(e)&&o.idempotencyKey){let e=await r.pool.query('SELECT id FROM "Payment" WHERE "organizationId" = $1 AND "idempotencyKey" = $2',[t,o.idempotencyKey]),a=e.rows[0]?await R(t,e.rows[0].id):null;if(a)return a}throw e}finally{N.release()}let A=await R(t,E);if(!A)throw Error("NOT_FOUND");try{let{adjustCommissionsForRefund:e}=await a.e(5683).then(a.bind(a,55683));await e({organizationId:t,appointmentId:i.appointmentId,refundPaymentId:E,refundAmount:o.amount,originalPaymentAmount:i.amount,actorId:n,reason:o.reason??"Remboursement cliente"})}catch(t){console.error("[refundPayment] commission adjustment",t)}if(i.customerId)try{let{adjustPointsForRefund:e}=await a.e(5136).then(a.bind(a,45136));await e({organizationId:t,customerId:i.customerId,refundPaymentId:E,refundAmount:o.amount,originalPaymentAmount:i.amount,userId:n})}catch(t){console.error("[refundPayment] loyalty adjustment",t)}try{let{notifyRefundCreated:e}=await a.e(8702).then(a.bind(a,98702)),{PAYMENT_METHOD_LABEL:o}=await a.e(7036).then(a.bind(a,33810));i.appointmentId&&await e(t,{paymentId:A.id,appointmentId:i.appointmentId,amount:A.amount,method:o[A.method]??A.method})}catch(t){console.error("[refundPayment] notification",t)}return A}async function $(t,e){let a=[t],o=e?"a.id = $2 OR":"";e&&a.push(e);let{rows:n}=await r.pool.query(`SELECT
      a.id, a."customerId", a."serviceId", a.status::text, a.price::text, a."startAt", a."createdAt",
      c."firstName" AS "customerFirst", c."lastName" AS "customerLast",
      c.phone AS "customerPhone",
      COALESCE(
        NULLIF((
          SELECT trim(both FROM substr(line, 7))
          FROM unnest(string_to_array(COALESCE(a.notes, ''), E'
')) AS line
          WHERE line LIKE 'Soins:%'
          LIMIT 1
        ), ''),
        s.name,
        a."serviceNameSnapshot",
        'Prestation'
      ) AS "serviceName",
      s.price::text AS "servicePrice",
      promo.code AS "promotionCode",
      promo.name AS "promotionName",
      promo.type::text AS "promotionType",
      promo.value::text AS "promotionValue",
      (
        SELECT i.total::text
        FROM "Invoice" i
        WHERE i."appointmentId" = a.id
          AND i."organizationId" = a."organizationId"
          AND i.status <> 'VOID'
        ORDER BY i."createdAt" DESC
        LIMIT 1
      ) AS "invoiceTotal",
      COALESCE((
        SELECT SUM(CASE WHEN p.kind = 'REFUND' THEN -p.amount ELSE p.amount END)
        FROM "Payment" p
        WHERE p."appointmentId" = a.id AND p.status = 'COMPLETED'
      ), 0)::text AS "netPaid"
     FROM "Appointment" a
     JOIN "Customer" c ON c.id = a."customerId"
     LEFT JOIN "Service" s ON s.id = a."serviceId"
     LEFT JOIN "Promotion" promo ON promo.id = a."promotionId" AND promo."deletedAt" IS NULL
     WHERE a."organizationId" = $1
       AND a.status NOT IN ('CANCELLED', 'NO_SHOW')
       AND (
         ${o}
         (
           a."startAt" >= (date_trunc('day', NOW() AT TIME ZONE 'Africa/Casablanca') AT TIME ZONE 'Africa/Casablanca') - INTERVAL '365 days'
           AND a."startAt" < (date_trunc('day', NOW() AT TIME ZONE 'Africa/Casablanca') AT TIME ZONE 'Africa/Casablanca') + INTERVAL '365 days'
         )
       )
     ORDER BY a."startAt" DESC
     LIMIT 200`,a);return n.map(t=>{let e=parseFloat(t.price)||0,a=parseFloat(t.netPaid)||0,o=null!=t.invoiceTotal?parseFloat(t.invoiceTotal)||0:null,n=(0,i.$G)(e,parseFloat(t.servicePrice??"")||0,t.promotionType??null,t.promotionValue??null),r=null!=o?o:Math.max(0,Math.round((e-n)*100)/100),s=null!=o?Math.max(0,Math.round((e-o)*100)/100):n;return{id:t.id,customerId:t.customerId,serviceId:t.serviceId??null,customerName:`${t.customerFirst} ${t.customerLast}`.trim(),serviceName:t.serviceName,price:e,remaining:Math.max(0,Math.round((r-a)*100)/100),discount:s,promotionCode:t.promotionCode??null,promotionName:t.promotionName??null,status:t.status,startAt:new Date(t.startAt).toISOString(),createdAt:new Date(t.createdAt).toISOString(),customerPhone:t.customerPhone??null}}).filter(t=>t.remaining>0||t.id===e)}[i,r]=s.then?(await s)():s,o()}catch(t){o(t)}})}};