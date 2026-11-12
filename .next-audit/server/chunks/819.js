"use strict";!function(){try{var t="undefined"!=typeof window?window:"undefined"!=typeof global?global:"undefined"!=typeof self?self:{},e=(new t.Error).stack;e&&(t._sentryDebugIds=t._sentryDebugIds||{},t._sentryDebugIds[e]="7f96aafe-2dad-4310-b80d-f73c7c2efcb5",t._sentryDebugIdIdentifier="sentry-dbid-7f96aafe-2dad-4310-b80d-f73c7c2efcb5")}catch(t){}}(),exports.id=819,exports.ids=[819],exports.modules={50819:(t,e,o)=>{o.a(t,async(t,n)=>{try{o.d(e,{applyDepositOnStatusChange:()=>D,applyDepositPaymentEffects:()=>m,assertCanConfirmWithoutDeposit:()=>f,countCustomerNoShows:()=>l,expireOverdueDepositAppointments:()=>N,f:()=>E,getOrCreateBookingPolicy:()=>p,noShowRiskLevel:()=>S,resolveDepositRequirement:()=>A});var a=o(84770),i=o(8678),d=o(90831),r=o(66085),s=t([i,r]);[i,r]=s.then?(await s)():s;let w=(0,d.S)(new i.Pool({connectionString:process.env.DATABASE_URL})),T={depositsEnabled:!1,defaultMode:"NONE",defaultFixedAmount:null,defaultPercent:null,confirmDeadlineHours:24,lateCancelHours:24,onCustomerLateCancel:"KEEP",onNoShow:"KEEP",onInstituteCancel:"REFUND",noShowWarnAt:1,noShowRequireDepositAt:2,noShowStrictAt:3};function u(t){return{depositsEnabled:!!t.depositsEnabled,defaultMode:t.defaultMode||"NONE",defaultFixedAmount:null!=t.defaultFixedAmount?Number(t.defaultFixedAmount):null,defaultPercent:null!=t.defaultPercent?Number(t.defaultPercent):null,confirmDeadlineHours:Number(t.confirmDeadlineHours)||24,lateCancelHours:Number(t.lateCancelHours)||24,onCustomerLateCancel:t.onCustomerLateCancel||"KEEP",onNoShow:t.onNoShow||"KEEP",onInstituteCancel:t.onInstituteCancel||"REFUND",noShowWarnAt:Number(t.noShowWarnAt)||1,noShowRequireDepositAt:Number(t.noShowRequireDepositAt)||2,noShowStrictAt:Number(t.noShowStrictAt)||3}}async function p(t,e){let o=e??w,{rows:n}=await o.query('SELECT * FROM "BookingPolicySettings" WHERE "organizationId" = $1',[t]);if(n[0])return u(n[0]);let i=`bpol_${(0,a.randomBytes)(6).toString("hex")}`;await o.query(`INSERT INTO "BookingPolicySettings" (id, "organizationId", "updatedAt")
     VALUES ($1,$2,NOW())
     ON CONFLICT ("organizationId") DO NOTHING`,[i,t]);let d=await o.query('SELECT * FROM "BookingPolicySettings" WHERE "organizationId" = $1',[t]);return d.rows[0]?u(d.rows[0]):{...T}}async function E(t,e,o){let n=await p(t),a=['"updatedAt" = NOW()'],i=[t],d=2,s=(t,e)=>{a.push(`"${t}" = $${d++}`),i.push(e)};void 0!==e.depositsEnabled&&s("depositsEnabled",e.depositsEnabled),void 0!==e.defaultMode&&s("defaultMode",e.defaultMode),void 0!==e.defaultFixedAmount&&s("defaultFixedAmount",e.defaultFixedAmount),void 0!==e.defaultPercent&&s("defaultPercent",e.defaultPercent),void 0!==e.confirmDeadlineHours&&s("confirmDeadlineHours",e.confirmDeadlineHours),void 0!==e.lateCancelHours&&s("lateCancelHours",e.lateCancelHours),void 0!==e.onCustomerLateCancel&&s("onCustomerLateCancel",e.onCustomerLateCancel),void 0!==e.onNoShow&&s("onNoShow",e.onNoShow),void 0!==e.onInstituteCancel&&s("onInstituteCancel",e.onInstituteCancel),void 0!==e.noShowWarnAt&&s("noShowWarnAt",e.noShowWarnAt),void 0!==e.noShowRequireDepositAt&&s("noShowRequireDepositAt",e.noShowRequireDepositAt),void 0!==e.noShowStrictAt&&s("noShowStrictAt",e.noShowStrictAt),await w.query(`UPDATE "BookingPolicySettings" SET ${a.join(", ")} WHERE "organizationId" = $1`,i);let u=await p(t);return await (0,r.writeAuditLog)({organizationId:t,actorId:o.id,actorName:o.name??void 0,entityType:"BookingPolicySettings",entityId:t,action:"UPDATE",before:n,after:u}).catch(()=>void 0),u}async function l(t,e,o){let{rows:n}=await (o??w).query(`SELECT COUNT(*)::text AS n FROM "Appointment"
     WHERE "organizationId" = $1 AND "customerId" = $2 AND status = 'NO_SHOW'`,[t,e]);return parseInt(n[0]?.n??"0",10)}function S(t,e){return t>=e.noShowStrictAt?"STRICT":t>=e.noShowRequireDepositAt?"REQUIRE_DEPOSIT":t>=e.noShowWarnAt?"WARN":"NONE"}function c(t,e){return"FIXED"===t.defaultMode&&null!=t.defaultFixedAmount?Math.max(0,Math.round(100*t.defaultFixedAmount)/100):"PERCENT"===t.defaultMode&&null!=t.defaultPercent?Math.max(0,Math.round(t.defaultPercent/100*e*100)/100):0}async function A(t){let e=await p(t.organizationId,t.client),o=await l(t.organizationId,t.customerId,t.client),n=S(o,e),a="REQUIRE_DEPOSIT"===n||"STRICT"===n,i=0;if(e.depositsEnabled&&(i=null!=t.serviceDeposit&&t.serviceDeposit>0?t.serviceDeposit:c(e,t.price)),a){let o=c(e,t.price),n=o>0?o:e.defaultFixedAmount&&e.defaultFixedAmount>0?e.defaultFixedAmount:Math.max(50,Math.round(20*t.price)/100);i=Math.max(i,n)}if((i=Math.round(100*i)/100)<=0)return{amount:0,state:"NOT_REQUIRED",dueAt:null,forcedByNoShow:!1};let d=new Date(Date.now()+36e5*Math.max(1,e.confirmDeadlineHours));return{amount:i,state:"AWAITING",dueAt:d,forcedByNoShow:a}}async function I(t,e,o){let{rows:n}=await (o??w).query(`SELECT COALESCE(SUM(
       CASE
         WHEN kind = 'DEPOSIT'::"PaymentKind" AND status = 'COMPLETED'::"PaymentStatus" THEN amount
         WHEN kind = 'REFUND'::"PaymentKind" AND status = 'COMPLETED'::"PaymentStatus"
           AND "parentPaymentId" IN (
             SELECT id FROM "Payment"
             WHERE "appointmentId" = $2 AND kind = 'DEPOSIT'::"PaymentKind"
           ) THEN -amount
         ELSE 0
       END
     ), 0)::text AS paid
     FROM "Payment"
     WHERE "organizationId" = $1 AND "appointmentId" = $2`,[t,e]);return Math.round(100*parseFloat(n[0]?.paid??"0"))/100}async function m(t,e,o){let{rows:n}=await w.query(`SELECT status::text, deposit::text, "depositState"::text AS "depositState"
     FROM "Appointment"
     WHERE id = $1 AND "organizationId" = $2`,[e,t]),a=n[0];if(!a)throw Error("APPOINTMENT_NOT_FOUND");let i=null!=a.deposit?parseFloat(a.deposit):0;if(i<=0||"NOT_REQUIRED"===a.depositState||await I(t,e)+.01<i)return{depositState:a.depositState,statusChanged:!1};let d=!1;return await w.query(`UPDATE "Appointment"
     SET "depositState" = 'PAID'::"DepositState",
         status = CASE
           WHEN status = 'PENDING'::"AppointmentStatus"
           THEN 'CONFIRMED'::"AppointmentStatus"
           ELSE status
         END,
         "updatedAt" = NOW()
     WHERE id = $1 AND "organizationId" = $2`,[e,t]),d="PENDING"===a.status,await (0,r.writeAuditLog)({organizationId:t,actorId:o.id,actorName:o.name??void 0,entityType:"Appointment",entityId:e,action:"UPDATE",before:{depositState:a.depositState,status:a.status},after:{depositState:"PAID",status:d?"CONFIRMED":a.status}}).catch(()=>void 0),{depositState:"PAID",statusChanged:d}}async function D(t){let e=await p(t.organizationId),{rows:n}=await w.query(`SELECT deposit::text, "depositState"::text AS "depositState", "startAt"
     FROM "Appointment"
     WHERE id = $1 AND "organizationId" = $2`,[t.appointmentId,t.organizationId]),a=n[0];if(!a||"PAID"!==a.depositState&&"AWAITING"!==a.depositState)return;let i=null;if("NO_SHOW"===t.nextStatus)i=e.onNoShow;else{if("CANCELLED"!==t.nextStatus)return;i=t.cancelledByInstitute?e.onInstituteCancel:(a.startAt.getTime()-Date.now())/36e5<e.lateCancelHours?e.onCustomerLateCancel:"REFUND"}if("AWAITING"===a.depositState){await w.query(`UPDATE "Appointment"
       SET "depositState" = 'NOT_REQUIRED'::"DepositState", "updatedAt" = NOW()
       WHERE id = $1 AND "organizationId" = $2 AND "depositState" = 'AWAITING'::"DepositState"`,[t.appointmentId,t.organizationId]);return}if("KEEP"===i){await w.query(`UPDATE "Appointment"
       SET "depositState" = 'FORFEITED'::"DepositState", "updatedAt" = NOW()
       WHERE id = $1 AND "organizationId" = $2`,[t.appointmentId,t.organizationId]),await (0,r.writeAuditLog)({organizationId:t.organizationId,actorId:t.actor.id,actorName:t.actor.name??void 0,entityType:"Appointment",entityId:t.appointmentId,action:"UPDATE",after:{depositState:"FORFEITED",reason:t.nextStatus}}).catch(()=>void 0);return}let{rows:d}=await w.query(`SELECT p.id, p.amount::text, p.method::text,
       COALESCE((
         SELECT SUM(r.amount) FROM "Payment" r
         WHERE r."parentPaymentId" = p.id AND r.kind = 'REFUND'::"PaymentKind"
           AND r.status = 'COMPLETED'::"PaymentStatus"
       ), 0)::text AS refunded
     FROM "Payment" p
     WHERE p."organizationId" = $1 AND p."appointmentId" = $2
       AND p.kind = 'DEPOSIT'::"PaymentKind"
       AND p.status = 'COMPLETED'::"PaymentStatus"`,[t.organizationId,t.appointmentId]);for(let e of d){let n=Math.round((parseFloat(e.amount)-parseFloat(e.refunded))*100)/100;if(!(n<=.01))try{let{refundPayment:a}=await o.e(5272).then(o.bind(o,15272));await a(t.organizationId,e.id,{amount:n,method:e.method,reason:`Remboursement acompte (${t.nextStatus})`},t.actor.id)}catch(t){console.error("[applyDepositOnStatusChange] refund",t)}}await w.query(`UPDATE "Appointment"
     SET "depositState" = 'REFUNDED'::"DepositState", "updatedAt" = NOW()
     WHERE id = $1 AND "organizationId" = $2`,[t.appointmentId,t.organizationId])}async function N(t){let{rows:e}=await w.query(`UPDATE "Appointment"
     SET status = 'CANCELLED'::"AppointmentStatus",
         "depositState" = CASE
           WHEN "depositState" = 'AWAITING'::"DepositState"
           THEN 'NOT_REQUIRED'::"DepositState"
           ELSE "depositState"
         END,
         "updatedAt" = NOW()
     WHERE "organizationId" = $1
       AND status = 'PENDING'::"AppointmentStatus"
       AND "depositState" = 'AWAITING'::"DepositState"
       AND "depositDueAt" IS NOT NULL
       AND "depositDueAt" < NOW()
     RETURNING id`,[t]);return e.length}async function f(t){if("CONFIRMED"!==t.nextStatus)return{ok:!0};let{rows:e}=await w.query(`SELECT "depositState"::text AS "depositState", deposit::text, "customerId"
     FROM "Appointment"
     WHERE id = $1 AND "organizationId" = $2`,[t.appointmentId,t.organizationId]),o=e[0];if(!o)return{ok:!1,error:"RDV introuvable."};if("AWAITING"===o.depositState){let e=null!=o.deposit?parseFloat(o.deposit):0;if(await I(t.organizationId,t.appointmentId)+.01<e)return{ok:!1,error:`Acompte de ${e.toLocaleString("fr-MA")} MAD requis avant confirmation.`}}let n=await p(t.organizationId),a=await l(t.organizationId,o.customerId);if("STRICT"===S(a,n)&&!("PAID"===o.depositState||"FORFEITED"===o.depositState)){let e=null!=o.deposit?parseFloat(o.deposit):0,n=await I(t.organizationId,t.appointmentId);if(e>0&&n+.01<e||e<=0&&"NOT_REQUIRED"!==o.depositState)return{ok:!1,error:"Cliente \xe0 risque no-show : acompte obligatoire avant confirmation."};let a=await A({organizationId:t.organizationId,customerId:o.customerId,serviceDeposit:null!=o.deposit?parseFloat(o.deposit):null,price:e>0?5*e:500});if(a.amount>0&&n+.01<a.amount)return{ok:!1,error:"Cliente \xe0 risque no-show : acompte obligatoire avant confirmation."}}return{ok:!0}}n()}catch(t){n(t)}})}};