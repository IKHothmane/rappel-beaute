"use strict";!function(){try{var t="undefined"!=typeof window?window:"undefined"!=typeof global?global:"undefined"!=typeof self?self:{},e=(new t.Error).stack;e&&(t._sentryDebugIds=t._sentryDebugIds||{},t._sentryDebugIds[e]="a169a87e-a270-4879-9561-86cd68190dd5",t._sentryDebugIdIdentifier="sentry-dbid-a169a87e-a270-4879-9561-86cd68190dd5")}catch(t){}}(),exports.id=5028,exports.ids=[5028,7036],exports.modules={41365:(t,e,a)=>{a.d(e,{W:()=>d,fi:()=>E,jm:()=>i,kW:()=>u,l2:()=>r,ts:()=>s});var n=a(80437);function r(t){return(0,n.Ct)(t,"00:00")}function s(t){return(0,n.mv)((0,n.Ct)(t,"12:00"))}function o(t){let e=(0,n.Ld)(t);return`${e.year}-${String(e.month).padStart(2,"0")}-${String(e.day).padStart(2,"0")}`}function i(t,e=new Date){let a=o(e),i=r(a);if("today"===t)return{from:a,to:a,startAt:i,endAt:s(a),preset:t};if("week"===t){let a=(0,n.Ld)(e),o=(a.weekday+6)%7,i=new Date(Date.UTC(a.year,a.month-1,a.day-o)),E=new Date(Date.UTC(a.year,a.month-1,a.day-o+6)),d=i.toISOString().slice(0,10),u=E.toISOString().slice(0,10);return{from:d,to:u,startAt:r(d),endAt:s(u),preset:t}}if("month"===t){let e=a.split("-").map(Number),n=e[0],o=e[1],i=`${n}-${String(o).padStart(2,"0")}-01`,E=new Date(n,o,0).getDate(),d=`${n}-${String(o).padStart(2,"0")}-${String(E).padStart(2,"0")}`;return{from:i,to:d,startAt:r(i),endAt:s(d),preset:t}}if("prev_month"===t){let e=a.split("-").map(Number),n=e[0],o=e[1]-1;o<1&&(o=12,n-=1);let i=`${n}-${String(o).padStart(2,"0")}-01`,E=new Date(n,o,0).getDate(),d=`${n}-${String(o).padStart(2,"0")}-${String(E).padStart(2,"0")}`;return{from:i,to:d,startAt:r(i),endAt:s(d),preset:t}}let E=Number(a.slice(0,4)),d=`${E}-01-01`,u=`${E}-12-31`;return{from:d,to:u,startAt:r(d),endAt:s(u),preset:"year"}}function E(t,e){return{from:t,to:e,startAt:r(t),endAt:s(e),preset:"custom"}}function d(t){let e=t.endAt.getTime()-t.startAt.getTime()+1,a=new Date(t.startAt.getTime()-1),n=new Date(a.getTime()-e+1);return{from:o(n),to:o(a),startAt:n,endAt:a,preset:t.preset}}function u(t,e){return 0===e?0===t?0:null:Math.round((t-e)/e*1e3)/10}},45028:(t,e,a)=>{a.a(t,async(t,n)=>{try{a.d(e,{Bc:()=>w,Go:()=>v,JB:()=>H,Jw:()=>f,Tw:()=>h,Ug:()=>$,W8:()=>g,YH:()=>U,i6:()=>F,jw:()=>M,mD:()=>P,oo:()=>y,w3:()=>C,xD:()=>D,zH:()=>R,zX:()=>L});var r=a(70653),s=a(41365),o=a(11107),i=a(33810),E=t([r]);r=(E.then?(await E)():E)[0];let W=["Dim","Lun","Mar","Mer","Jeu","Ven","Sam"];function d(t,e){return{orgId:e,start:t.period.startAt,end:t.period.endAt,staffId:t.staffId,serviceId:t.serviceId,resourceId:t.resourceId}}function u(t){let e="";return(t.staffId||t.serviceId||t.resourceId)&&(e+=' JOIN "Appointment" a ON a.id = p."appointmentId"'),e}function A(t,e){let a=[t.orgId,t.start,t.end],n=e,r=['p."organizationId" = $1',"p.status = 'COMPLETED'::\"PaymentStatus\"",'p."paidAt" >= $2','p."paidAt" <= $3'];return t.staffId&&(r.push(`a."staffId" = $${n}`),a.push(t.staffId),n++),t.serviceId&&(r.push(`a."serviceId" = $${n}`),a.push(t.serviceId),n++),t.resourceId&&(r.push(`a."resourceId" = $${n}`),a.push(t.resourceId),n++),{sql:r.join(" AND "),params:a}}let x="CASE WHEN p.kind = 'REFUND'::\"PaymentKind\" THEN -p.amount ELSE p.amount END";async function p(t){let e=u(t),{sql:a,params:n}=A(t,4),{rows:s}=await r.pool.query(`SELECT COALESCE(SUM(${x}), 0)::text AS t
     FROM "Payment" p ${e}
     WHERE ${a}`,n);return Math.round(100*(parseFloat(s[0]?.t??"0")||0))/100}async function c(t){let e=u(t),{sql:a,params:n}=A(t,4),{rows:s}=await r.pool.query(`SELECT COALESCE(SUM(p.amount), 0)::text AS t
     FROM "Payment" p ${e}
     WHERE ${a} AND p.kind = 'PAYMENT'::"PaymentKind"`,n);return Math.round(100*(parseFloat(s[0]?.t??"0")||0))/100}async function S(t){let e=u(t),{sql:a,params:n}=A(t,4),{rows:s}=await r.pool.query(`SELECT COALESCE(SUM(p.amount), 0)::text AS t
     FROM "Payment" p ${e}
     WHERE ${a} AND p.kind = 'REFUND'::"PaymentKind"`,n);return Math.round(100*(parseFloat(s[0]?.t??"0")||0))/100}async function I(t){let{rows:e}=await r.pool.query(`SELECT COALESCE(SUM(amount), 0)::text AS t FROM "Expense"
     WHERE "organizationId" = $1 AND "deletedAt" IS NULL
       AND "expenseDate" >= $2 AND "expenseDate" <= $3`,[t.orgId,t.start,t.end]);return Math.round(100*(parseFloat(e[0]?.t??"0")||0))/100}async function N(t){let e=u(t),{sql:a,params:n}=A(t,4),{rows:s}=await r.pool.query(`SELECT COUNT(DISTINCT p."appointmentId")::text AS c
     FROM "Payment" p ${e}
     WHERE ${a} AND p."appointmentId" IS NOT NULL
       AND p.kind = 'PAYMENT'::"PaymentKind"`,n);return parseInt(s[0]?.c??"0",10)}async function m(t){let e=['a."organizationId" = $1','a."startAt" >= $2','a."startAt" <= $3'],a=[t.orgId,t.start,t.end],n=4;t.staffId&&(e.push(`a."staffId" = $${n++}`),a.push(t.staffId)),t.serviceId&&(e.push(`a."serviceId" = $${n++}`),a.push(t.serviceId)),t.resourceId&&(e.push(`a."resourceId" = $${n++}`),a.push(t.resourceId));let{rows:s}=await r.pool.query(`SELECT COUNT(*)::text AS c FROM "Appointment" a WHERE ${e.join(" AND ")}`,a);return parseInt(s[0]?.c??"0",10)}async function l(t){let{rows:e}=await r.pool.query(`SELECT COUNT(DISTINCT c.id)::text AS c
     FROM "Customer" c
     JOIN "Appointment" a ON a."customerId" = c.id AND a.status = 'COMPLETED'
     WHERE c."organizationId" = $1 AND c."deletedAt" IS NULL
       AND a."startAt" >= NOW() - ($2 || ' days')::interval`,[t,String(o.co)]);return parseInt(e[0]?.c??"0",10)}function O(t,e){return{value:t,previous:e,changePercent:null!=e?(0,s.kW)(t,e):null}}async function T(t,e,a){let[n,r]=await Promise.all([t(e),a?t(a):Promise.resolve(null)]);return O(n,r)}async function C(t,e){let a=d(e,t),n=e.compare?(0,s.W)(e.period):null,r=n?{...a,start:n.startAt,end:n.endAt}:null,[o,i,E,u,A,c]=await Promise.all([T(p,a,r),T(I,a,r),N(a),r?N(r):Promise.resolve(null),T(m,a,r),l(t)]),S=o.value-i.value,C=null!=o.previous&&null!=i.previous?o.previous-i.previous:null,R=E>0?Math.round(o.value/E*100)/100:0,D=u&&u>0&&null!=o.previous?Math.round(o.previous/u*100)/100:null,L=O(c,null);return{period:e.period,comparePeriod:n,revenue:o,expenses:i,margin:O(S,C),averageTicket:O(R,D),appointments:A,customers:L,scope:"full"}}async function R(t,e){let a=d(e,t),n=e.compare?(0,s.W)(e.period):null,o=(0,s.jm)("today"),E=(0,s.jm)("week"),I=(0,s.jm)("month"),N=(0,s.jm)("prev_month"),m=(0,s.jm)("year"),l={...a,staffId:e.staffId,serviceId:e.serviceId,resourceId:e.resourceId},[O,T,C,R,D,L,M,y]=await Promise.all([p({...l,start:o.startAt,end:o.endAt}),p({...l,start:E.startAt,end:E.endAt}),p({...l,start:I.startAt,end:I.endAt}),p({...l,start:N.startAt,end:N.endAt}),p({...l,start:m.startAt,end:m.endAt}),p(a),c(a),S(a)]),f=u(a),{sql:$,params:F}=A(a,4),{rows:v}=await r.pool.query(`SELECT (p."paidAt" AT TIME ZONE 'Africa/Casablanca')::date::text AS d,
            COALESCE(SUM(${x}), 0)::text AS t
     FROM "Payment" p ${f}
     WHERE ${$}
     GROUP BY 1 ORDER BY 1`,F),U=v.map(t=>{let e=new Date(t.d+"T12:00:00");return{date:t.d,label:e.toLocaleDateString("fr-FR",{weekday:"short",timeZone:"Africa/Casablanca"}),revenue:Math.round(100*parseFloat(t.t))/100}}),{rows:h}=await r.pool.query(`SELECT p.method::text AS method,
            COUNT(*)::text AS cnt,
            COALESCE(SUM(CASE WHEN p.kind = 'REFUND' THEN -p.amount ELSE p.amount END), 0)::text AS amt
     FROM "Payment" p ${f}
     WHERE ${$}
     GROUP BY p.method ORDER BY amt DESC`,F),g=h.reduce((t,e)=>t+Math.abs(parseFloat(e.amt)||0),0),w=h.map(t=>{let e=Math.round(100*parseFloat(t.amt))/100;return{method:t.method,label:i.PAYMENT_METHOD_LABEL[t.method]??t.method,count:parseInt(t.cnt,10),amount:e,percent:g>0?Math.round(Math.abs(e)/g*1e3)/10:0}});return{period:e.period,comparePeriod:n,totals:{today:O,week:T,month:C,prevMonth:R,year:D,periodNet:L,periodGross:M,refunds:y},daily:U,byPaymentMethod:w}}async function D(t,e){let a=d(e,t),n=['a."organizationId" = $1',"a.status = 'COMPLETED'",'a."startAt" >= $2','a."startAt" <= $3'],s=[a.orgId,a.start,a.end],o=4;a.staffId&&(n.push(`a."staffId" = $${o++}`),s.push(a.staffId)),a.serviceId&&(n.push(`a."serviceId" = $${o++}`),s.push(a.serviceId));let{rows:i}=await r.pool.query(`WITH apt AS (
      SELECT a.id, a."serviceId", s.name AS "serviceName", a.price
      FROM "Appointment" a
      JOIN "Service" s ON s.id = a."serviceId"
      WHERE ${n.join(" AND ")}
    ),
    rev AS (
      SELECT a."serviceId",
             COUNT(DISTINCT a.id)::int AS appointments,
             COALESCE(SUM(
               CASE WHEN p.kind = 'REFUND' THEN -p.amount ELSE p.amount END
             ), 0) AS revenue
      FROM apt a
      LEFT JOIN "Payment" p ON p."appointmentId" = a.id AND p.status = 'COMPLETED'
      GROUP BY a."serviceId"
    ),
    cons AS (
      SELECT a."serviceId",
             COALESCE(SUM(ABS(im.quantity) * pr."purchasePrice"), 0) AS cost
      FROM apt a
      JOIN "InventoryMovement" im ON im."referenceId" = a.id
        AND im."referenceType" = 'APPOINTMENT' AND im.type = 'SERVICE_CONSUMPTION'
      JOIN "Product" pr ON pr.id = im."productId"
      GROUP BY a."serviceId"
    )
    SELECT r."serviceId", a."serviceName",
           r.appointments::text,
           r.revenue::text,
           COALESCE(c.cost, 0)::text AS "consumableCost"
    FROM rev r
    JOIN (SELECT DISTINCT "serviceId", "serviceName" FROM apt) a ON a."serviceId" = r."serviceId"
    LEFT JOIN cons c ON c."serviceId" = r."serviceId"
    ORDER BY r.revenue DESC
    LIMIT 50`,s);return i.map(t=>{let e=Math.round(100*parseFloat(t.revenue))/100,a=Math.round(100*parseFloat(t.consumableCost))/100,n=parseInt(t.appointments,10);return{serviceId:t.serviceId,serviceName:t.serviceName,appointments:n,revenue:e,averageTicket:n>0?Math.round(e/n*100)/100:0,consumableCost:a,estimatedMargin:Math.round((e-a)*100)/100}})}async function L(t,e){let a=d(e,t),n=['a."organizationId" = $1',"a.status = 'COMPLETED'",'a."startAt" >= $2','a."startAt" <= $3'],s=[a.orgId,a.start,a.end];a.staffId&&(n.push('a."staffId" = $4'),s.push(a.staffId));let{rows:o}=await r.pool.query(`SELECT st.id AS "staffId",
            st."firstName" || ' ' || st."lastName" AS "staffName",
            COUNT(DISTINCT a.id)::text AS appointments,
            COALESCE(SUM(
              CASE WHEN p.kind = 'REFUND' THEN -p.amount ELSE p.amount END
            ), 0)::text AS revenue,
            COALESCE(SUM(cr."commissionAmount"), 0)::text AS commission
     FROM "Appointment" a
     JOIN "Staff" st ON st.id = a."staffId"
     LEFT JOIN "Payment" p ON p."appointmentId" = a.id AND p.status = 'COMPLETED'
     LEFT JOIN "CommissionRecord" cr ON cr."appointmentId" = a.id
     WHERE ${n.join(" AND ")}
     GROUP BY st.id, st."firstName", st."lastName"
     ORDER BY revenue DESC`,s);return o.map(t=>({staffId:t.staffId,staffName:t.staffName,appointments:parseInt(t.appointments,10),revenue:Math.round(100*parseFloat(t.revenue))/100,commission:Math.round(100*parseFloat(t.commission))/100}))}async function M(t,e){let a=d(e,t),{rows:n}=await r.pool.query(`WITH stats AS (
      SELECT c.id,
             c."createdAt",
             COUNT(a.id) FILTER (WHERE a.status = 'COMPLETED') AS visits,
             COALESCE(SUM(a.price) FILTER (WHERE a.status = 'COMPLETED'), 0) AS revenue,
             MAX(a."startAt") FILTER (WHERE a.status = 'COMPLETED') AS "lastVisitAt",
             MIN(a."startAt") FILTER (WHERE a.status = 'COMPLETED') AS "firstVisitAt"
      FROM "Customer" c
      LEFT JOIN "Appointment" a ON a."customerId" = c.id
      WHERE c."organizationId" = $1 AND c."deletedAt" IS NULL
      GROUP BY c.id, c."createdAt"
    )
    SELECT
      COUNT(*)::text AS total,
      COUNT(*) FILTER (
        WHERE "firstVisitAt" >= $2 AND "firstVisitAt" <= $3
      )::text AS "newInPeriod",
      COUNT(*) FILTER (
        WHERE "lastVisitAt" >= NOW() - ($4 || ' days')::interval
      )::text AS active,
      COUNT(*) FILTER (
        WHERE "lastVisitAt" IS NULL OR "lastVisitAt" < NOW() - ($4 || ' days')::interval
      )::text AS inactive,
      COUNT(*) FILTER (
        WHERE revenue >= $5 OR visits >= $6
      )::text AS vip,
      COUNT(*) FILTER (
        WHERE "lastVisitAt" IS NOT NULL
          AND "lastVisitAt" < NOW() - ($4 || ' days')::interval
          AND visits > 0
      )::text AS "atRisk",
      COUNT(*) FILTER (
        WHERE EXISTS (
          SELECT 1 FROM "Appointment" ax
          WHERE ax."customerId" = stats.id AND ax.status = 'COMPLETED'
            AND ax."startAt" >= $2 AND ax."startAt" <= $3
            AND EXISTS (
              SELECT 1 FROM "Appointment" prev
              WHERE prev."customerId" = stats.id AND prev.status = 'COMPLETED'
                AND prev."startAt" < ax."startAt" - ($4 || ' days')::interval
            )
        )
      )::text AS reactivated
    FROM stats`,[t,a.start,a.end,String(o.co),o.Fo,o.P9]),s=n[0],{rows:i}=await r.pool.query(`SELECT to_char(a."startAt" AT TIME ZONE 'Africa/Casablanca', 'YYYY-MM') AS month,
            COUNT(DISTINCT a."customerId")::text AS cnt
     FROM "Appointment" a
     JOIN "Customer" c ON c.id = a."customerId"
     WHERE a."organizationId" = $1 AND a.status = 'COMPLETED'
       AND c."deletedAt" IS NULL
       AND a."startAt" >= NOW() - INTERVAL '6 months'
       AND a."startAt" = (
         SELECT MIN(a2."startAt") FROM "Appointment" a2
         WHERE a2."customerId" = a."customerId" AND a2.status = 'COMPLETED'
       )
     GROUP BY 1 ORDER BY 1 DESC LIMIT 6`,[t]),{rows:E}=await r.pool.query(`WITH first_in_period AS (
      SELECT DISTINCT a."customerId"
      FROM "Appointment" a
      WHERE a."organizationId" = $1 AND a.status = 'COMPLETED'
        AND a."startAt" >= $2 AND a."startAt" <= $3
        AND NOT EXISTS (
          SELECT 1 FROM "Appointment" prev
          WHERE prev."customerId" = a."customerId" AND prev.status = 'COMPLETED'
            AND prev."startAt" < $2
        )
    ),
    repeat_visitors AS (
      SELECT DISTINCT a."customerId"
      FROM "Appointment" a
      WHERE a."organizationId" = $1 AND a.status = 'COMPLETED'
        AND a."startAt" >= $2 AND a."startAt" <= $3
        AND EXISTS (
          SELECT 1 FROM "Appointment" prev
          WHERE prev."customerId" = a."customerId" AND prev.status = 'COMPLETED'
            AND prev."startAt" < $2
        )
    )
    SELECT
      (SELECT COUNT(*)::text FROM repeat_visitors) AS "returningCount",
      (SELECT COUNT(*)::text FROM first_in_period) AS newc`,[t,a.start,a.end]),u=parseInt(E[0]?.returningCount??"0",10),A=parseInt(E[0]?.newc??"0",10),p=u+A,{rows:c}=await r.pool.query(`SELECT c.id AS "customerId",
            c."firstName" || ' ' || c."lastName" AS "customerName",
            COALESCE(SUM(CASE WHEN p.kind = 'REFUND' THEN -p.amount ELSE p.amount END), 0)::text AS revenue,
            COUNT(DISTINCT a.id) FILTER (WHERE a.status = 'COMPLETED')::text AS visits
     FROM "Customer" c
     LEFT JOIN "Appointment" a ON a."customerId" = c.id
     LEFT JOIN "Payment" p ON p."appointmentId" = a.id AND p.status = 'COMPLETED'
     WHERE c."organizationId" = $1 AND c."deletedAt" IS NULL
     GROUP BY c.id, c."firstName", c."lastName"
     HAVING COALESCE(SUM(CASE WHEN p.kind = 'REFUND' THEN -p.amount ELSE p.amount END), 0) > 0
     ORDER BY revenue DESC LIMIT 10`,[t]);return{kpis:{total:parseInt(s?.total??"0",10),newInPeriod:parseInt(s?.newInPeriod??"0",10),active:parseInt(s?.active??"0",10),inactive:parseInt(s?.inactive??"0",10),vip:parseInt(s?.vip??"0",10),atRisk:parseInt(s?.atRisk??"0",10),reactivated:parseInt(s?.reactivated??"0",10)},newByMonth:i.reverse().map(t=>({month:t.month,label:new Date(t.month+"-01").toLocaleDateString("fr-FR",{month:"long",year:"numeric"}),count:parseInt(t.cnt,10)})),retention:{returning:u,newCustomers:A,retentionRate:p>0?Math.round(u/p*1e3)/10:null,reactivationRate:parseInt(s?.reactivated??"0",10)>0&&u>0?Math.round(parseInt(s?.reactivated??"0",10)/u*1e3)/10:null},topCustomers:c.map(t=>{let e=Math.round(100*parseFloat(t.revenue))/100,a=parseInt(t.visits,10);return{customerId:t.customerId,customerName:t.customerName,revenue:e,visits:a,averageTicket:a>0?Math.round(e/a*100)/100:0,ltv:e}})}}async function y(t,e){let a=d(e,t),n=['a."organizationId" = $1','a."startAt" >= $2','a."startAt" <= $3'],s=[a.orgId,a.start,a.end],o=4;a.staffId&&(n.push(`a."staffId" = $${o++}`),s.push(a.staffId)),a.serviceId&&(n.push(`a."serviceId" = $${o++}`),s.push(a.serviceId));let{rows:i}=await r.pool.query(`SELECT a.status::text, COUNT(*)::text AS cnt
     FROM "Appointment" a WHERE ${n.join(" AND ")}
     GROUP BY a.status ORDER BY cnt DESC`,s),{rows:E}=await r.pool.query(`SELECT
      COUNT(*) FILTER (WHERE a.status = 'NO_SHOW')::text AS "noShow",
      COUNT(*) FILTER (WHERE a.status IN ('COMPLETED','NO_SHOW'))::text AS concerned
     FROM "Appointment" a
     WHERE ${n.join(" AND ")} AND a."startAt" <= NOW()`,s),u=parseInt(E[0]?.noShow??"0",10),A=parseInt(E[0]?.concerned??"0",10),{rows:p}=await r.pool.query(`WITH booked AS (
      SELECT EXTRACT(DOW FROM a."startAt" AT TIME ZONE 'Africa/Casablanca')::int AS dow,
             SUM(EXTRACT(EPOCH FROM (a."endAt" - a."startAt")) / 60)::float AS mins
      FROM "Appointment" a
      WHERE ${n.join(" AND ")}
        AND a.status IN ('CONFIRMED','ARRIVED','IN_PROGRESS','COMPLETED')
      GROUP BY 1
    ),
    avail AS (
      SELECT ss."dayOfWeek" AS dow,
             SUM(
               EXTRACT(EPOCH FROM (
                 (ss."endTime"::time - ss."startTime"::time)
               )) / 60
             ) * GREATEST(1, (
               SELECT COUNT(DISTINCT date_trunc('week', d)::date)
               FROM generate_series($2::timestamptz, $3::timestamptz, '1 day') d
               WHERE EXTRACT(DOW FROM d AT TIME ZONE 'Africa/Casablanca') = ss."dayOfWeek"
             )) AS mins
      FROM "StaffSchedule" ss
      JOIN "Staff" st ON st.id = ss."staffId"
      WHERE st."organizationId" = $1 AND st."deletedAt" IS NULL AND ss.active = true
      GROUP BY ss."dayOfWeek"
    )
    SELECT COALESCE(b.dow, a.dow)::text AS dow,
           COALESCE(b.mins, 0)::text AS booked,
           COALESCE(a.mins, 0)::text AS available
    FROM avail a
    FULL OUTER JOIN booked b ON b.dow = a.dow
    ORDER BY dow`,s),c=[1,2,3,4,5,6,0].map(t=>{let e=p.find(e=>parseInt(e.dow,10)===t),a=parseFloat(e?.booked??"0")||0,n=parseFloat(e?.available??"0")||0,r=n>0?Math.round(a/n*1e3)/10:null,s="low";return null!=r&&(r>=80?s="high":r>=50&&(s="medium")),{weekday:t,label:W[t],bookedMinutes:Math.round(a),availableMinutes:Math.round(n),rate:r,level:s}}),{rows:S}=await r.pool.query(`SELECT EXTRACT(HOUR FROM a."startAt" AT TIME ZONE 'Africa/Casablanca')::int AS hour,
            COUNT(*)::text AS cnt
     FROM "Appointment" a
     WHERE ${n.join(" AND ")}
       AND a.status NOT IN ('CANCELLED')
     GROUP BY 1
     ORDER BY 1`,s),I=Array.from({length:16},(t,e)=>{let a=e+8,n=S.find(t=>parseInt(t.hour,10)===a);return{hour:a,label:`${String(a).padStart(2,"0")}h`,count:parseInt(n?.cnt??"0",10)}}),{rows:N}=await r.pool.query(`SELECT EXTRACT(DOW FROM a."startAt" AT TIME ZONE 'Africa/Casablanca')::int AS dow,
            EXTRACT(HOUR FROM a."startAt" AT TIME ZONE 'Africa/Casablanca')::int AS hour,
            COUNT(*)::text AS cnt
     FROM "Appointment" a
     WHERE ${n.join(" AND ")}
       AND a.status NOT IN ('CANCELLED')
     GROUP BY 1, 2`,s),m=N.map(t=>({weekday:parseInt(t.dow,10),hour:parseInt(t.hour,10),count:parseInt(t.cnt,10)}));return{total:i.reduce((t,e)=>t+parseInt(e.cnt,10),0),byStatus:i.map(t=>({status:t.status,count:parseInt(t.cnt,10)})),noShow:{count:u,concerned:A,rate:A>0?Math.round(u/A*1e3)/10:null},occupationByWeekday:c,byHour:I,heatmap:m}}async function f(t,e){let a=d(e,t),{rows:n}=await r.pool.query(`SELECT
      COALESCE(SUM(stock * "purchasePrice") FILTER (WHERE active), 0)::text AS val,
      COUNT(*) FILTER (WHERE active AND stock <= 0)::text AS out,
      COUNT(*) FILTER (WHERE active AND stock > 0 AND stock < "minStock")::text AS low
     FROM "Product" WHERE "organizationId" = $1 AND "deletedAt" IS NULL`,[t]),{rows:s}=await r.pool.query(`SELECT im.type::text,
            COALESCE(SUM(ABS(im.quantity) * p."purchasePrice"), 0)::text AS val
     FROM "InventoryMovement" im
     JOIN "Product" p ON p.id = im."productId"
     WHERE im."organizationId" = $1 AND im."createdAt" >= $2 AND im."createdAt" <= $3
     GROUP BY im.type`,[t,a.start,a.end]),o=Object.fromEntries(s.map(t=>[t.type,parseFloat(t.val)||0])),{rows:i}=await r.pool.query(`SELECT p.id AS "productId", p.name AS "productName",
            SUM(ABS(im.quantity))::text AS qty, p.unit::text AS unit
     FROM "InventoryMovement" im
     JOIN "Product" p ON p.id = im."productId"
     WHERE im."organizationId" = $1 AND im."createdAt" >= $2 AND im."createdAt" <= $3
       AND im.type = 'SERVICE_CONSUMPTION'
     GROUP BY p.id, p.name, p.unit
     ORDER BY SUM(ABS(im.quantity)) DESC LIMIT 10`,[t,a.start,a.end]),E=["EXPIRATION","LOSS","DAMAGE"].map(t=>({reason:t,value:Math.round((o[t]??0)*100)/100})),{rows:u}=await r.pool.query(`SELECT
       COALESCE((
         SELECT SUM(s.total) FROM "PosSale" s
         WHERE s."organizationId" = $1
           AND s.status = 'COMPLETED'::"PosSaleStatus"
           AND s."createdAt" >= $2 AND s."createdAt" <= $3
       ), 0)::text AS rev,
       COALESCE((
         SELECT SUM(ii.total - ii.quantity * COALESCE(pr."purchasePrice", 0))
         FROM "PosSale" s
         JOIN "InvoiceItem" ii ON ii."invoiceId" = s."invoiceId"
         LEFT JOIN "Product" pr ON pr.id = ii."productId"
         WHERE s."organizationId" = $1
           AND s.status = 'COMPLETED'::"PosSaleStatus"
           AND s."createdAt" >= $2 AND s."createdAt" <= $3
       ), 0)::text AS margin`,[t,a.start,a.end]),{rows:A}=await r.pool.query(`SELECT COALESCE(SUM(ABS(im.quantity)), 0)::text AS qty
     FROM "InventoryMovement" im
     WHERE im."organizationId" = $1
       AND im.type = 'SALE'::"MovementType"
       AND im."createdAt" >= $2 AND im."createdAt" <= $3`,[t,a.start,a.end]),{rows:p}=await r.pool.query(`SELECT COALESCE(ii."productId", 'unknown') AS "productId",
            ii."nameSnapshot" AS "productName",
            SUM(ii.quantity)::text AS qty,
            SUM(ii.total)::text AS revenue,
            SUM(ii.total - ii.quantity * COALESCE(pr."purchasePrice", 0))::text AS margin
     FROM "PosSale" s
     JOIN "InvoiceItem" ii ON ii."invoiceId" = s."invoiceId"
     LEFT JOIN "Product" pr ON pr.id = ii."productId"
     WHERE s."organizationId" = $1
       AND s.status = 'COMPLETED'::"PosSaleStatus"
       AND s."createdAt" >= $2 AND s."createdAt" <= $3
     GROUP BY ii."productId", ii."nameSnapshot"
     ORDER BY SUM(ii.total) DESC
     LIMIT 10`,[t,a.start,a.end]),{rows:c}=await r.pool.query(`SELECT COALESCE(pr.category::text, 'AUTRE') AS category,
            SUM(ii.quantity)::text AS qty,
            SUM(ii.total)::text AS revenue
     FROM "PosSale" s
     JOIN "InvoiceItem" ii ON ii."invoiceId" = s."invoiceId"
     LEFT JOIN "Product" pr ON pr.id = ii."productId"
     WHERE s."organizationId" = $1
       AND s.status = 'COMPLETED'::"PosSaleStatus"
       AND s."createdAt" >= $2 AND s."createdAt" <= $3
     GROUP BY pr.category
     ORDER BY SUM(ii.total) DESC`,[t,a.start,a.end]),{rows:S}=await r.pool.query(`SELECT COALESCE(s."soldById", 'unknown') AS "staffId",
            COALESCE(
              NULLIF(TRIM(CONCAT(u."firstName", ' ', u."lastName")), ''),
              'Non attribu\xe9'
            ) AS "staffName",
            COUNT(*)::text AS cnt,
            COALESCE(SUM(s.total), 0)::text AS revenue
     FROM "PosSale" s
     LEFT JOIN "User" u ON u.id = s."soldById"
     WHERE s."organizationId" = $1
       AND s.status = 'COMPLETED'::"PosSaleStatus"
       AND s."createdAt" >= $2 AND s."createdAt" <= $3
     GROUP BY s."soldById", u."firstName", u."lastName"
     ORDER BY SUM(s.total) DESC
     LIMIT 10`,[t,a.start,a.end]),{rows:I}=await r.pool.query(`SELECT s."paymentMethod"::text AS method,
            COUNT(*)::text AS cnt,
            COALESCE(SUM(s.total), 0)::text AS amount
     FROM "PosSale" s
     WHERE s."organizationId" = $1
       AND s.status = 'COMPLETED'::"PosSaleStatus"
       AND s."createdAt" >= $2 AND s."createdAt" <= $3
     GROUP BY s."paymentMethod"
     ORDER BY SUM(s.total) DESC`,[t,a.start,a.end]),N=Math.round(100*parseFloat(u[0]?.rev??"0"))/100,m=parseFloat(u[0]?.margin??"0"),l=Number.isFinite(m)?Math.round(100*m)/100:null;return{stockValue:Math.round(100*parseFloat(n[0]?.val??"0"))/100,consumptionValue:Math.round((o.SERVICE_CONSUMPTION??0)*100)/100,purchasesValue:Math.round((o.PURCHASE??0)*100)/100,lossesValue:Math.round(((o.LOSS??0)+(o.DAMAGE??0)+(o.EXPIRATION??0))*100)/100,adjustmentsValue:Math.round(((o.ADJUSTMENT_IN??0)+(o.ADJUSTMENT_OUT??0))*100)/100,outOfStockCount:parseInt(n[0]?.out??"0",10),lowStockCount:parseInt(n[0]?.low??"0",10),topConsumption:i.map(t=>({productId:t.productId,productName:t.productName,quantity:Math.round(100*parseFloat(t.qty))/100,unit:t.unit})),lossesByReason:E,posRevenue:N,posMargin:l,posStockConsumed:Math.round(100*parseFloat(A[0]?.qty??"0"))/100,topPosProducts:p.map(t=>({productId:t.productId,productName:t.productName,quantity:Math.round(100*parseFloat(t.qty))/100,revenue:Math.round(100*parseFloat(t.revenue))/100,margin:Math.round(100*parseFloat(t.margin))/100})),posByCategory:c.map(t=>({category:t.category,quantity:Math.round(100*parseFloat(t.qty))/100,revenue:Math.round(100*parseFloat(t.revenue))/100})),posByStaff:S.map(t=>({staffId:t.staffId,staffName:t.staffName,salesCount:parseInt(t.cnt,10),revenue:Math.round(100*parseFloat(t.revenue))/100})),posByPaymentMethod:I.map(t=>({method:t.method,count:parseInt(t.cnt,10),amount:Math.round(100*parseFloat(t.amount))/100}))}}async function $(t,e){let a=d(e,t),{rows:n}=await r.pool.query(`SELECT c.id AS "campaignId", c.name AS "campaignName",
            c."audienceCount"::text AS targeted,
            COUNT(cr.id) FILTER (WHERE cr.status = 'SENT')::text AS sent,
            COUNT(DISTINCT a.id)::text AS appts,
            COALESCE(SUM(
              CASE WHEN pay.kind = 'REFUND' THEN -pay.amount ELSE pay.amount END
            ), 0)::text AS revenue
     FROM "Campaign" c
     LEFT JOIN "CampaignRecipient" cr ON cr."campaignId" = c.id
     LEFT JOIN "Appointment" a ON a."customerId" = cr."customerId"
       AND a.status = 'COMPLETED'
       AND a."startAt" >= COALESCE(
         (SELECT wt."sentAt" FROM "WhatsAppTask" wt WHERE wt.id = cr."whatsappTaskId"),
         cr."updatedAt"
       )
       AND a."startAt" >= $2 AND a."startAt" <= $3
     LEFT JOIN "Payment" pay ON pay."appointmentId" = a.id AND pay.status = 'COMPLETED'
     WHERE c."organizationId" = $1
       AND c."createdAt" >= $2 - INTERVAL '90 days'
     GROUP BY c.id, c.name, c."audienceCount"
     ORDER BY c."createdAt" DESC LIMIT 20`,[t,a.start,a.end]);return n.map(t=>({campaignId:t.campaignId,campaignName:t.campaignName,targeted:parseInt(t.targeted,10),sent:parseInt(t.sent,10),associatedAppointments:parseInt(t.appts,10),associatedRevenue:Math.round(100*parseFloat(t.revenue))/100}))}async function F(t,e){let n=d(e,t),{getPostVisitAnalytics:r}=await Promise.all([a.e(4239),a.e(699),a.e(3336),a.e(7487)]).then(a.bind(a,53336));return r(t,{start:n.start,end:n.end})}async function v(t,e){let a=d(e,t),{rows:n}=await r.pool.query(`SELECT COUNT(*)::text AS n FROM "WhatsAppTask"
     WHERE "organizationId" = $1
       AND "attributionSource" = 'ai_marketing'
       AND "createdAt" >= $2 AND "createdAt" <= $3`,[t,a.start,a.end]),{rows:s}=await r.pool.query(`SELECT COUNT(*)::text AS n FROM "WhatsAppTask"
     WHERE "organizationId" = $1
       AND "attributionSource" = 'ai_marketing'
       AND status = 'SENT'::"WhatsAppTaskStatus"
       AND "sentAt" >= $2 AND "sentAt" <= $3`,[t,a.start,a.end]),{rows:o}=await r.pool.query(`SELECT COUNT(*)::text AS n FROM "Appointment"
     WHERE "organizationId" = $1
       AND "attributionSource" = 'ai_marketing'
       AND "createdAt" >= $2 AND "createdAt" <= $3`,[t,a.start,a.end]),{rows:i}=await r.pool.query(`SELECT COUNT(*)::text AS n FROM "Appointment"
     WHERE "organizationId" = $1
       AND "attributionSource" = 'ai_marketing'
       AND status = 'COMPLETED'
       AND "startAt" >= $2 AND "startAt" <= $3`,[t,a.start,a.end]);return{generated:parseInt(n[0]?.n??"0",10),sent:parseInt(s[0]?.n??"0",10),bookings:parseInt(o[0]?.n??"0",10),completed:parseInt(i[0]?.n??"0",10)}}async function U(t,e){let a=d(e,t),{rows:n}=await r.pool.query(`SELECT COUNT(*)::text AS c FROM "ReviewRequest"
     WHERE "organizationId" = $1 AND status IN ('SENT','RECORDED')
       AND "sentAt" >= $2 AND "sentAt" <= $3`,[t,a.start,a.end]),{rows:s}=await r.pool.query(`SELECT satisfaction::text, COUNT(*)::text AS cnt
     FROM "ReviewRequest"
     WHERE "organizationId" = $1 AND satisfaction IS NOT NULL
       AND "satisfactionRecordedAt" >= $2 AND "satisfactionRecordedAt" <= $3
     GROUP BY satisfaction`,[t,a.start,a.end]),o={VERY_SATISFIED:"Tr\xe8s satisfaites",SATISFIED:"Satisfaites",DISSATISFIED:"Insatisfaites"},i=s.map(t=>({satisfaction:t.satisfaction,label:o[t.satisfaction]??t.satisfaction,count:parseInt(t.cnt,10)})),E=i.reduce((t,e)=>t+e.count,0),u=null;if(E>0){let t={VERY_SATISFIED:5,SATISFIED:4,DISSATISFIED:1},e=i.reduce((e,a)=>e+a.count*(t[a.satisfaction]??0),0);u=Math.round(e/E*10)/10}return{sentInPeriod:parseInt(n[0]?.c??"0",10),recordedSatisfaction:E,bySatisfaction:i,averageInternalScore:u}}async function h(t,e){let a=d(e,t),{rows:n}=await r.pool.query(`SELECT
      (SELECT COALESCE(SUM(lt.points), 0)::text FROM "LoyaltyTransaction" lt
       WHERE lt."organizationId" = $1 AND lt.type = 'EARN'
         AND lt."createdAt" >= $2 AND lt."createdAt" <= $3) AS earned,
      (SELECT COALESCE(SUM(ABS(lt.points)), 0)::text FROM "LoyaltyTransaction" lt
       WHERE lt."organizationId" = $1 AND lt.type = 'REDEEM'
         AND lt."createdAt" >= $2 AND lt."createdAt" <= $3) AS redeemed,
      (SELECT COUNT(*)::text FROM "LoyaltyTransaction"
       WHERE "organizationId" = $1 AND type = 'REDEEM'
         AND reason ILIKE '%r\xe9compense%' AND "createdAt" >= $2 AND "createdAt" <= $3) AS rewards,
      (SELECT COUNT(*)::text FROM (
        SELECT c.id FROM "Customer" c
        LEFT JOIN "Appointment" a ON a."customerId" = c.id AND a.status = 'COMPLETED'
        WHERE c."organizationId" = $1 AND c."deletedAt" IS NULL
        GROUP BY c.id
        HAVING COALESCE(SUM(a.price), 0) >= $4 OR COUNT(a.id) >= $5
      ) x) AS vip,
      (SELECT COUNT(*)::text FROM "Package"
       WHERE "organizationId" = $1 AND status = 'ACTIVE') AS packages,
      (SELECT COUNT(*)::text FROM "PackageSession"
       WHERE "organizationId" = $1 AND "createdAt" >= $2 AND "createdAt" <= $3) AS sessions`,[t,a.start,a.end,o.Fo,o.P9]),s=n[0];return{pointsEarned:parseInt(s?.earned??"0",10),pointsRedeemed:parseInt(s?.redeemed??"0",10),rewardsUsed:parseInt(s?.rewards??"0",10),vipCustomers:parseInt(s?.vip??"0",10),activePackages:parseInt(s?.packages??"0",10),sessionsUsed:parseInt(s?.sessions??"0",10)}}async function g(t){let{rows:e}=await r.pool.query('SELECT name FROM "Organization" WHERE id = $1',[t]);return e[0]?.name??"Institut"}async function w(t,e){let a=d(e,t),n=u(a),{sql:s,params:o}=A(a,4),{rows:i}=await r.pool.query(`SELECT COUNT(*)::text AS count, COALESCE(SUM(p.amount), 0)::text AS amount
     FROM "Payment" p ${n}
     WHERE ${s} AND p.kind = 'REFUND'::"PaymentKind"`,o);return{count:parseInt(i[0]?.count??"0",10),amount:Math.round(100*(parseFloat(i[0]?.amount??"0")||0))/100}}async function P(t,e){let{rows:a}=await r.pool.query(`SELECT c.id AS "customerId",
            c."firstName" || ' ' || c."lastName" AS "customerName",
            c.phone,
            COUNT(a.id) FILTER (WHERE a.status = 'COMPLETED')::text AS visits,
            COALESCE(SUM(
              CASE WHEN p.kind = 'REFUND' THEN -p.amount ELSE p.amount END
            ) FILTER (WHERE p.status = 'COMPLETED'), 0)::text AS revenue,
            MAX(a."startAt") FILTER (WHERE a.status = 'COMPLETED') AS "lastVisitAt",
            c."createdAt"
     FROM "Customer" c
     LEFT JOIN "Appointment" a ON a."customerId" = c.id
     LEFT JOIN "Payment" p ON p."appointmentId" = a.id
     WHERE c."organizationId" = $1 AND c."deletedAt" IS NULL
     GROUP BY c.id, c."firstName", c."lastName", c.phone, c."createdAt"
     HAVING COALESCE(SUM(
       CASE WHEN p.kind = 'REFUND' THEN -p.amount ELSE p.amount END
     ) FILTER (WHERE p.status = 'COMPLETED'), 0) > 0
        OR COUNT(a.id) FILTER (WHERE a.status = 'COMPLETED') > 0
     ORDER BY revenue DESC
     LIMIT 200`,[t]);return a.map(t=>{let e=parseInt(t.visits,10),a=Math.round(100*parseFloat(t.revenue))/100,n=null!=t.lastVisitAt?(Date.now()-new Date(t.lastVisitAt).getTime())/864e5:1/0,r="ACTIVE";return a>=o.Fo||e>=o.P9?r="VIP":n>o.co?r="INACTIVE":n>.7*o.co&&(r="AT_RISK"),{customerId:t.customerId,customerName:t.customerName,phone:t.phone,visits:e,netRevenue:a,averageTicket:e>0?Math.round(a/e*100)/100:0,lastVisitAt:t.lastVisitAt?new Date(t.lastVisitAt).toISOString():null,segment:r}})}async function H(t,e){let a=d(e,t),{rows:n}=await r.pool.query(`SELECT p.id AS "productId", p.name AS "productName", p.unit::text AS unit,
      COALESCE(SUM(im.quantity) FILTER (
        WHERE im.type = 'PURCHASE' AND im."createdAt" >= $2 AND im."createdAt" <= $3
      ), 0)::text AS purchases,
      COALESCE(SUM(im.quantity) FILTER (
        WHERE im.type = 'SERVICE_CONSUMPTION' AND im."createdAt" >= $2 AND im."createdAt" <= $3
      ), 0)::text AS consumption,
      COALESCE(SUM(im.quantity) FILTER (
        WHERE im.type = 'SALE' AND im."createdAt" >= $2 AND im."createdAt" <= $3
      ), 0)::text AS sales,
      COALESCE(SUM(im.quantity) FILTER (
        WHERE im.type IN ('LOSS','DAMAGE','EXPIRATION') AND im."createdAt" >= $2 AND im."createdAt" <= $3
      ), 0)::text AS losses,
      COALESCE(SUM(im.quantity) FILTER (
        WHERE im.type IN ('ADJUSTMENT_IN','ADJUSTMENT_OUT') AND im."createdAt" >= $2 AND im."createdAt" <= $3
      ), 0)::text AS adjustments,
      COALESCE(SUM(im.quantity), 0)::text AS "ledgerBalance"
     FROM "Product" p
     LEFT JOIN "InventoryMovement" im ON im."productId" = p.id AND im."organizationId" = p."organizationId"
     WHERE p."organizationId" = $1 AND p."deletedAt" IS NULL
     GROUP BY p.id, p.name, p.unit
     HAVING COUNT(im.id) FILTER (WHERE im."createdAt" >= $2 AND im."createdAt" <= $3) > 0
        OR COALESCE(SUM(im.quantity), 0) <> 0
     ORDER BY p.name
     LIMIT 100`,[t,a.start,a.end]);return n.map(t=>({productId:t.productId,productName:t.productName,unit:t.unit,purchases:parseFloat(t.purchases)||0,consumption:parseFloat(t.consumption)||0,sales:parseFloat(t.sales)||0,losses:parseFloat(t.losses)||0,adjustments:parseFloat(t.adjustments)||0,ledgerBalance:Math.round(100*(parseFloat(t.ledgerBalance)||0))/100}))}n()}catch(t){n(t)}})},80437:(t,e,a)=>{a.d(e,{Ao:()=>T,Ct:()=>S,Is:()=>N,Jp:()=>O,Ld:()=>d,bR:()=>p,db:()=>l,ho:()=>I,kG:()=>A,mv:()=>m,x:()=>n,xo:()=>c});let n=process.env.TIMEZONE?.trim()||"Africa/Casablanca",r=Date.parse("2026-09-20T01:00:00.000Z"),s=new Set(["Africa/Casablanca","Africa/El_Aaiun"]),o=new Intl.DateTimeFormat("en-US",{timeZone:n,hour12:!1,year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",second:"2-digit",weekday:"short"}),i={Sun:0,Mon:1,Tue:2,Wed:3,Thu:4,Fri:5,Sat:6},E=null;function d(t){let e=o.formatToParts(t),a=t=>e.find(e=>e.type===t)?.value??"0",d={year:Number(a("year")),month:Number(a("month")),day:Number(a("day")),hour:Number(a("hour"))%24,minute:Number(a("minute")),second:Number(a("second")),weekday:i[a("weekday")]??0};return t.getTime()>=r&&function(){if(!s.has(n))return!1;if(null!==E)return E;let t=o.formatToParts(new Date("2026-10-14T12:00:00.000Z"));return E=13==Number(t.find(t=>"hour"===t.type)?.value??"0")%24}()?function(t){let e=new Date(Date.UTC(t.year,t.month-1,t.day,t.hour,t.minute,t.second)-36e5);return{year:e.getUTCFullYear(),month:e.getUTCMonth()+1,day:e.getUTCDate(),hour:e.getUTCHours(),minute:e.getUTCMinutes(),second:e.getUTCSeconds(),weekday:e.getUTCDay()}}(d):d}function u(t){let e=d(t);return Date.UTC(e.year,e.month-1,e.day,e.hour,e.minute,e.second,t.getUTCMilliseconds())-t.getTime()}function A(t,e,a,n=0,r=0){let s=Date.UTC(t.year,t.month-1,t.day,e,a,n,r),o=s-u(new Date(s));return new Date(s-u(new Date(o)))}function p(t){return d(t).weekday}function c(t,e){let[a,n]=e.split(":").map(Number);return A(d(t),a,n)}function S(t,e){let[a,n,r]=t.split("-").map(Number),[s,o]=e.split(":").map(Number);return A({year:a,month:n,day:r},s,o)}function I(t,e){let a=d(t),n=d(e);return a.year===n.year&&a.month===n.month&&a.day===n.day}function N(t){return A(d(t),0,0,0,0)}function m(t){return A(d(t),23,59,59,999)}function l(t){let e=d(t);return`${String(e.hour).padStart(2,"0")}:${String(e.minute).padStart(2,"0")}`}function O(t){let e=d(t);return`${String(e.day).padStart(2,"0")}/${String(e.month).padStart(2,"0")}/${e.year}`}function T(t=new Date){let e=d(t),a=String(e.month).padStart(2,"0"),n=String(e.day).padStart(2,"0");return`${e.year}-${a}-${n}`}},33810:(t,e,a)=>{a.d(e,{PAYMENT_METHOD_LABEL:()=>n});let n={CASH:"Esp\xe8ces",CARD:"Carte",TRANSFER:"Virement",ONLINE:"En ligne",GIFT_CARD:"Carte cadeau",CHECK:"Ch\xe8que",OTHER:"Autre"}},11107:(t,e,a)=>{a.d(e,{Fo:()=>n,P9:()=>r,TX:()=>o,co:()=>s});let n=3e3,r=8,s=90,o=30}};