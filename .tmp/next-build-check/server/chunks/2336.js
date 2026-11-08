"use strict";exports.id=2336,exports.ids=[2336,2355],exports.modules={49303:(t,e,a)=>{t.exports=a(30517)},68489:(t,e,a)=>{a.d(e,{ts:()=>o,l2:()=>s,kW:()=>u,W:()=>A,fi:()=>d,jm:()=>E});var n=a(45269);let r="Africa/Casablanca";function s(t){return new Date(`${t}T00:00:00+01:00`)}function o(t){return new Date(`${t}T23:59:59.999+01:00`)}function i(t){return t.toLocaleDateString("en-CA",{timeZone:r})}function E(t,e=new Date){let a=i(e),n=s(a);if("today"===t)return{from:a,to:a,startAt:n,endAt:o(a),preset:t};if("week"===t){let a={Mon:0,Tue:1,Wed:2,Thu:3,Fri:4,Sat:5,Sun:6}[e.toLocaleDateString("en-US",{weekday:"short",timeZone:r}).slice(0,3)]??0,s=new Date(n);s.setDate(s.getDate()-a);let E=new Date(s);return E.setDate(E.getDate()+6),{from:i(s),to:i(E),startAt:s,endAt:o(i(E)),preset:t}}if("month"===t){let e=a.split("-").map(Number),n=e[0],r=e[1],i=`${n}-${String(r).padStart(2,"0")}-01`,E=new Date(n,r,0).getDate(),d=`${n}-${String(r).padStart(2,"0")}-${String(E).padStart(2,"0")}`;return{from:i,to:d,startAt:s(i),endAt:o(d),preset:t}}if("prev_month"===t){let e=a.split("-").map(Number),n=e[0],r=e[1]-1;r<1&&(r=12,n-=1);let i=`${n}-${String(r).padStart(2,"0")}-01`,E=new Date(n,r,0).getDate(),d=`${n}-${String(r).padStart(2,"0")}-${String(E).padStart(2,"0")}`;return{from:i,to:d,startAt:s(i),endAt:o(d),preset:t}}let E=Number(a.slice(0,4)),d=`${E}-01-01`,A=`${E}-12-31`;return{from:d,to:A,startAt:s(d),endAt:o(A),preset:"year"}}function d(t,e){return{from:t,to:e,startAt:s(t),endAt:o(e),preset:"custom"}}function A(t){let e=t.endAt.getTime()-t.startAt.getTime()+1,a=new Date(t.startAt.getTime()-1),n=new Date(a.getTime()-e+1);return{from:i(n),to:i(a),startAt:n,endAt:a,preset:t.preset}}function u(t,e){return 0===e?0===t?0:null:Math.round((t-e)/e*1e3)/10}n.co,n.co,n.Fo,n.P9},69390:(t,e,a)=>{a.a(t,async(t,n)=>{try{a.d(e,{Bc:()=>w,Go:()=>f,JB:()=>g,Jw:()=>$,Tw:()=>P,Ug:()=>y,W8:()=>h,YH:()=>U,i6:()=>v,jw:()=>M,mD:()=>H,oo:()=>F,w3:()=>C,xD:()=>D,zH:()=>R,zX:()=>L});var r=a(79549),s=a(68489),o=a(45269),i=a(12355),E=t([r]);r=(E.then?(await E)():E)[0];let W=["Dim","Lun","Mar","Mer","Jeu","Ven","Sam"];function d(t,e){return{orgId:e,start:t.period.startAt,end:t.period.endAt,staffId:t.staffId,serviceId:t.serviceId,resourceId:t.resourceId}}function A(t){let e="";return(t.staffId||t.serviceId||t.resourceId)&&(e+=' JOIN "Appointment" a ON a.id = p."appointmentId"'),e}function u(t,e){let a=[t.orgId,t.start,t.end],n=e,r=['p."organizationId" = $1',"p.status = 'COMPLETED'::\"PaymentStatus\"",'p."paidAt" >= $2','p."paidAt" <= $3'];return t.staffId&&(r.push(`a."staffId" = $${n}`),a.push(t.staffId),n++),t.serviceId&&(r.push(`a."serviceId" = $${n}`),a.push(t.serviceId),n++),t.resourceId&&(r.push(`a."resourceId" = $${n}`),a.push(t.resourceId),n++),{sql:r.join(" AND "),params:a}}let x="CASE WHEN p.kind = 'REFUND'::\"PaymentKind\" THEN -p.amount ELSE p.amount END";async function p(t){let e=A(t),{sql:a,params:n}=u(t,4),{rows:s}=await r.pool.query(`SELECT COALESCE(SUM(${x}), 0)::text AS t
     FROM "Payment" p ${e}
     WHERE ${a}`,n);return Math.round(100*(parseFloat(s[0]?.t??"0")||0))/100}async function c(t){let e=A(t),{sql:a,params:n}=u(t,4),{rows:s}=await r.pool.query(`SELECT COALESCE(SUM(p.amount), 0)::text AS t
     FROM "Payment" p ${e}
     WHERE ${a} AND p.kind = 'PAYMENT'::"PaymentKind"`,n);return Math.round(100*(parseFloat(s[0]?.t??"0")||0))/100}async function S(t){let e=A(t),{sql:a,params:n}=u(t,4),{rows:s}=await r.pool.query(`SELECT COALESCE(SUM(p.amount), 0)::text AS t
     FROM "Payment" p ${e}
     WHERE ${a} AND p.kind = 'REFUND'::"PaymentKind"`,n);return Math.round(100*(parseFloat(s[0]?.t??"0")||0))/100}async function I(t){let{rows:e}=await r.pool.query(`SELECT COALESCE(SUM(amount), 0)::text AS t FROM "Expense"
     WHERE "organizationId" = $1 AND "deletedAt" IS NULL
       AND "expenseDate" >= $2 AND "expenseDate" <= $3`,[t.orgId,t.start,t.end]);return Math.round(100*(parseFloat(e[0]?.t??"0")||0))/100}async function N(t){let e=A(t),{sql:a,params:n}=u(t,4),{rows:s}=await r.pool.query(`SELECT COUNT(DISTINCT p."appointmentId")::text AS c
     FROM "Payment" p ${e}
     WHERE ${a} AND p."appointmentId" IS NOT NULL
       AND p.kind = 'PAYMENT'::"PaymentKind"`,n);return parseInt(s[0]?.c??"0",10)}async function m(t){let e=['a."organizationId" = $1','a."startAt" >= $2','a."startAt" <= $3'],a=[t.orgId,t.start,t.end],n=4;t.staffId&&(e.push(`a."staffId" = $${n++}`),a.push(t.staffId)),t.serviceId&&(e.push(`a."serviceId" = $${n++}`),a.push(t.serviceId)),t.resourceId&&(e.push(`a."resourceId" = $${n++}`),a.push(t.resourceId));let{rows:s}=await r.pool.query(`SELECT COUNT(*)::text AS c FROM "Appointment" a WHERE ${e.join(" AND ")}`,a);return parseInt(s[0]?.c??"0",10)}async function O(t){let{rows:e}=await r.pool.query(`SELECT COUNT(DISTINCT c.id)::text AS c
     FROM "Customer" c
     JOIN "Appointment" a ON a."customerId" = c.id AND a.status = 'COMPLETED'
     WHERE c."organizationId" = $1 AND c."deletedAt" IS NULL
       AND a."startAt" >= NOW() - ($2 || ' days')::interval`,[t,String(o.co)]);return parseInt(e[0]?.c??"0",10)}function T(t,e){return{value:t,previous:e,changePercent:null!=e?(0,s.kW)(t,e):null}}async function l(t,e,a){let[n,r]=await Promise.all([t(e),a?t(a):Promise.resolve(null)]);return T(n,r)}async function C(t,e){let a=d(e,t),n=e.compare?(0,s.W)(e.period):null,r=n?{...a,start:n.startAt,end:n.endAt}:null,[o,i,E,A,u,c]=await Promise.all([l(p,a,r),l(I,a,r),N(a),r?N(r):Promise.resolve(null),l(m,a,r),O(t)]),S=o.value-i.value,C=null!=o.previous&&null!=i.previous?o.previous-i.previous:null,R=E>0?Math.round(o.value/E*100)/100:0,D=A&&A>0&&null!=o.previous?Math.round(o.previous/A*100)/100:null,L=T(c,null);return{period:e.period,comparePeriod:n,revenue:o,expenses:i,margin:T(S,C),averageTicket:T(R,D),appointments:u,customers:L,scope:"full"}}async function R(t,e){let a=d(e,t),n=e.compare?(0,s.W)(e.period):null,o=(0,s.jm)("today"),E=(0,s.jm)("week"),I=(0,s.jm)("month"),N=(0,s.jm)("prev_month"),m=(0,s.jm)("year"),O={...a,staffId:e.staffId,serviceId:e.serviceId,resourceId:e.resourceId},[T,l,C,R,D,L,M,F]=await Promise.all([p({...O,start:o.startAt,end:o.endAt}),p({...O,start:E.startAt,end:E.endAt}),p({...O,start:I.startAt,end:I.endAt}),p({...O,start:N.startAt,end:N.endAt}),p({...O,start:m.startAt,end:m.endAt}),p(a),c(a),S(a)]),$=A(a),{sql:y,params:v}=u(a,4),{rows:f}=await r.pool.query(`SELECT (p."paidAt" AT TIME ZONE 'Africa/Casablanca')::date::text AS d,
            COALESCE(SUM(${x}), 0)::text AS t
     FROM "Payment" p ${$}
     WHERE ${y}
     GROUP BY 1 ORDER BY 1`,v),U=f.map(t=>{let e=new Date(t.d+"T12:00:00");return{date:t.d,label:e.toLocaleDateString("fr-FR",{weekday:"short",timeZone:"Africa/Casablanca"}),revenue:Math.round(100*parseFloat(t.t))/100}}),{rows:P}=await r.pool.query(`SELECT p.method::text AS method,
            COUNT(*)::text AS cnt,
            COALESCE(SUM(CASE WHEN p.kind = 'REFUND' THEN -p.amount ELSE p.amount END), 0)::text AS amt
     FROM "Payment" p ${$}
     WHERE ${y}
     GROUP BY p.method ORDER BY amt DESC`,v),h=P.reduce((t,e)=>t+Math.abs(parseFloat(e.amt)||0),0),w=P.map(t=>{let e=Math.round(100*parseFloat(t.amt))/100;return{method:t.method,label:i.PAYMENT_METHOD_LABEL[t.method]??t.method,count:parseInt(t.cnt,10),amount:e,percent:h>0?Math.round(Math.abs(e)/h*1e3)/10:0}});return{period:e.period,comparePeriod:n,totals:{today:T,week:l,month:C,prevMonth:R,year:D,periodNet:L,periodGross:M,refunds:F},daily:U,byPaymentMethod:w}}async function D(t,e){let a=d(e,t),n=['a."organizationId" = $1',"a.status = 'COMPLETED'",'a."startAt" >= $2','a."startAt" <= $3'],s=[a.orgId,a.start,a.end],o=4;a.staffId&&(n.push(`a."staffId" = $${o++}`),s.push(a.staffId)),a.serviceId&&(n.push(`a."serviceId" = $${o++}`),s.push(a.serviceId));let{rows:i}=await r.pool.query(`WITH apt AS (
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
      (SELECT COUNT(*)::text FROM first_in_period) AS newc`,[t,a.start,a.end]),A=parseInt(E[0]?.returningCount??"0",10),u=parseInt(E[0]?.newc??"0",10),p=A+u,{rows:c}=await r.pool.query(`SELECT c.id AS "customerId",
            c."firstName" || ' ' || c."lastName" AS "customerName",
            COALESCE(SUM(CASE WHEN p.kind = 'REFUND' THEN -p.amount ELSE p.amount END), 0)::text AS revenue,
            COUNT(DISTINCT a.id) FILTER (WHERE a.status = 'COMPLETED')::text AS visits
     FROM "Customer" c
     LEFT JOIN "Appointment" a ON a."customerId" = c.id
     LEFT JOIN "Payment" p ON p."appointmentId" = a.id AND p.status = 'COMPLETED'
     WHERE c."organizationId" = $1 AND c."deletedAt" IS NULL
     GROUP BY c.id, c."firstName", c."lastName"
     HAVING COALESCE(SUM(CASE WHEN p.kind = 'REFUND' THEN -p.amount ELSE p.amount END), 0) > 0
     ORDER BY revenue DESC LIMIT 10`,[t]);return{kpis:{total:parseInt(s?.total??"0",10),newInPeriod:parseInt(s?.newInPeriod??"0",10),active:parseInt(s?.active??"0",10),inactive:parseInt(s?.inactive??"0",10),vip:parseInt(s?.vip??"0",10),atRisk:parseInt(s?.atRisk??"0",10),reactivated:parseInt(s?.reactivated??"0",10)},newByMonth:i.reverse().map(t=>({month:t.month,label:new Date(t.month+"-01").toLocaleDateString("fr-FR",{month:"long",year:"numeric"}),count:parseInt(t.cnt,10)})),retention:{returning:A,newCustomers:u,retentionRate:p>0?Math.round(A/p*1e3)/10:null,reactivationRate:parseInt(s?.reactivated??"0",10)>0&&A>0?Math.round(parseInt(s?.reactivated??"0",10)/A*1e3)/10:null},topCustomers:c.map(t=>{let e=Math.round(100*parseFloat(t.revenue))/100,a=parseInt(t.visits,10);return{customerId:t.customerId,customerName:t.customerName,revenue:e,visits:a,averageTicket:a>0?Math.round(e/a*100)/100:0,ltv:e}})}}async function F(t,e){let a=d(e,t),n=['a."organizationId" = $1','a."startAt" >= $2','a."startAt" <= $3'],s=[a.orgId,a.start,a.end],o=4;a.staffId&&(n.push(`a."staffId" = $${o++}`),s.push(a.staffId)),a.serviceId&&(n.push(`a."serviceId" = $${o++}`),s.push(a.serviceId));let{rows:i}=await r.pool.query(`SELECT a.status::text, COUNT(*)::text AS cnt
     FROM "Appointment" a WHERE ${n.join(" AND ")}
     GROUP BY a.status ORDER BY cnt DESC`,s),{rows:E}=await r.pool.query(`SELECT
      COUNT(*) FILTER (WHERE a.status = 'NO_SHOW')::text AS "noShow",
      COUNT(*) FILTER (WHERE a.status IN ('COMPLETED','NO_SHOW'))::text AS concerned
     FROM "Appointment" a
     WHERE ${n.join(" AND ")} AND a."startAt" <= NOW()`,s),A=parseInt(E[0]?.noShow??"0",10),u=parseInt(E[0]?.concerned??"0",10),{rows:p}=await r.pool.query(`WITH booked AS (
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
     GROUP BY 1, 2`,s),m=N.map(t=>({weekday:parseInt(t.dow,10),hour:parseInt(t.hour,10),count:parseInt(t.cnt,10)}));return{total:i.reduce((t,e)=>t+parseInt(e.cnt,10),0),byStatus:i.map(t=>({status:t.status,count:parseInt(t.cnt,10)})),noShow:{count:A,concerned:u,rate:u>0?Math.round(A/u*1e3)/10:null},occupationByWeekday:c,byHour:I,heatmap:m}}async function $(t,e){let a=d(e,t),{rows:n}=await r.pool.query(`SELECT
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
     ORDER BY SUM(ABS(im.quantity)) DESC LIMIT 10`,[t,a.start,a.end]),E=["EXPIRATION","LOSS","DAMAGE"].map(t=>({reason:t,value:Math.round((o[t]??0)*100)/100})),{rows:A}=await r.pool.query(`SELECT
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
       ), 0)::text AS margin`,[t,a.start,a.end]),{rows:u}=await r.pool.query(`SELECT COALESCE(SUM(ABS(im.quantity)), 0)::text AS qty
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
     ORDER BY SUM(s.total) DESC`,[t,a.start,a.end]),N=Math.round(100*parseFloat(A[0]?.rev??"0"))/100,m=parseFloat(A[0]?.margin??"0"),O=Number.isFinite(m)?Math.round(100*m)/100:null;return{stockValue:Math.round(100*parseFloat(n[0]?.val??"0"))/100,consumptionValue:Math.round((o.SERVICE_CONSUMPTION??0)*100)/100,purchasesValue:Math.round((o.PURCHASE??0)*100)/100,lossesValue:Math.round(((o.LOSS??0)+(o.DAMAGE??0)+(o.EXPIRATION??0))*100)/100,adjustmentsValue:Math.round(((o.ADJUSTMENT_IN??0)+(o.ADJUSTMENT_OUT??0))*100)/100,outOfStockCount:parseInt(n[0]?.out??"0",10),lowStockCount:parseInt(n[0]?.low??"0",10),topConsumption:i.map(t=>({productId:t.productId,productName:t.productName,quantity:Math.round(100*parseFloat(t.qty))/100,unit:t.unit})),lossesByReason:E,posRevenue:N,posMargin:O,posStockConsumed:Math.round(100*parseFloat(u[0]?.qty??"0"))/100,topPosProducts:p.map(t=>({productId:t.productId,productName:t.productName,quantity:Math.round(100*parseFloat(t.qty))/100,revenue:Math.round(100*parseFloat(t.revenue))/100,margin:Math.round(100*parseFloat(t.margin))/100})),posByCategory:c.map(t=>({category:t.category,quantity:Math.round(100*parseFloat(t.qty))/100,revenue:Math.round(100*parseFloat(t.revenue))/100})),posByStaff:S.map(t=>({staffId:t.staffId,staffName:t.staffName,salesCount:parseInt(t.cnt,10),revenue:Math.round(100*parseFloat(t.revenue))/100})),posByPaymentMethod:I.map(t=>({method:t.method,count:parseInt(t.cnt,10),amount:Math.round(100*parseFloat(t.amount))/100}))}}async function y(t,e){let a=d(e,t),{rows:n}=await r.pool.query(`SELECT c.id AS "campaignId", c.name AS "campaignName",
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
     ORDER BY c."createdAt" DESC LIMIT 20`,[t,a.start,a.end]);return n.map(t=>({campaignId:t.campaignId,campaignName:t.campaignName,targeted:parseInt(t.targeted,10),sent:parseInt(t.sent,10),associatedAppointments:parseInt(t.appts,10),associatedRevenue:Math.round(100*parseFloat(t.revenue))/100}))}async function v(t,e){let n=d(e,t),{getPostVisitAnalytics:r}=await Promise.all([a.e(7729),a.e(9212),a.e(1027),a.e(3645)]).then(a.bind(a,21027));return r(t,{start:n.start,end:n.end})}async function f(t,e){let a=d(e,t),{rows:n}=await r.pool.query(`SELECT COUNT(*)::text AS n FROM "WhatsAppTask"
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
     GROUP BY satisfaction`,[t,a.start,a.end]),o={VERY_SATISFIED:"Tr\xe8s satisfaites",SATISFIED:"Satisfaites",DISSATISFIED:"Insatisfaites"},i=s.map(t=>({satisfaction:t.satisfaction,label:o[t.satisfaction]??t.satisfaction,count:parseInt(t.cnt,10)})),E=i.reduce((t,e)=>t+e.count,0),A=null;if(E>0){let t={VERY_SATISFIED:5,SATISFIED:4,DISSATISFIED:1},e=i.reduce((e,a)=>e+a.count*(t[a.satisfaction]??0),0);A=Math.round(e/E*10)/10}return{sentInPeriod:parseInt(n[0]?.c??"0",10),recordedSatisfaction:E,bySatisfaction:i,averageInternalScore:A}}async function P(t,e){let a=d(e,t),{rows:n}=await r.pool.query(`SELECT
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
       WHERE "organizationId" = $1 AND "createdAt" >= $2 AND "createdAt" <= $3) AS sessions`,[t,a.start,a.end,o.Fo,o.P9]),s=n[0];return{pointsEarned:parseInt(s?.earned??"0",10),pointsRedeemed:parseInt(s?.redeemed??"0",10),rewardsUsed:parseInt(s?.rewards??"0",10),vipCustomers:parseInt(s?.vip??"0",10),activePackages:parseInt(s?.packages??"0",10),sessionsUsed:parseInt(s?.sessions??"0",10)}}async function h(t){let{rows:e}=await r.pool.query('SELECT name FROM "Organization" WHERE id = $1',[t]);return e[0]?.name??"Institut"}async function w(t,e){let a=d(e,t),n=A(a),{sql:s,params:o}=u(a,4),{rows:i}=await r.pool.query(`SELECT COUNT(*)::text AS count, COALESCE(SUM(p.amount), 0)::text AS amount
     FROM "Payment" p ${n}
     WHERE ${s} AND p.kind = 'REFUND'::"PaymentKind"`,o);return{count:parseInt(i[0]?.count??"0",10),amount:Math.round(100*(parseFloat(i[0]?.amount??"0")||0))/100}}async function H(t,e){let{rows:a}=await r.pool.query(`SELECT c.id AS "customerId",
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
     LIMIT 200`,[t]);return a.map(t=>{let e=parseInt(t.visits,10),a=Math.round(100*parseFloat(t.revenue))/100,n=null!=t.lastVisitAt?(Date.now()-new Date(t.lastVisitAt).getTime())/864e5:1/0,r="ACTIVE";return a>=o.Fo||e>=o.P9?r="VIP":n>o.co?r="INACTIVE":n>.7*o.co&&(r="AT_RISK"),{customerId:t.customerId,customerName:t.customerName,phone:t.phone,visits:e,netRevenue:a,averageTicket:e>0?Math.round(a/e*100)/100:0,lastVisitAt:t.lastVisitAt?new Date(t.lastVisitAt).toISOString():null,segment:r}})}async function g(t,e){let a=d(e,t),{rows:n}=await r.pool.query(`SELECT p.id AS "productId", p.name AS "productName", p.unit::text AS unit,
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
     LIMIT 100`,[t,a.start,a.end]);return n.map(t=>({productId:t.productId,productName:t.productName,unit:t.unit,purchases:parseFloat(t.purchases)||0,consumption:parseFloat(t.consumption)||0,sales:parseFloat(t.sales)||0,losses:parseFloat(t.losses)||0,adjustments:parseFloat(t.adjustments)||0,ledgerBalance:Math.round(100*(parseFloat(t.ledgerBalance)||0))/100}))}n()}catch(t){n(t)}})},12355:(t,e,a)=>{a.d(e,{PAYMENT_METHOD_LABEL:()=>n});let n={CASH:"Esp\xe8ces",CARD:"Carte",TRANSFER:"Virement",ONLINE:"En ligne",GIFT_CARD:"Carte cadeau",CHECK:"Ch\xe8que",OTHER:"Autre"}},45269:(t,e,a)=>{a.d(e,{Fo:()=>n,P9:()=>r,TX:()=>o,co:()=>s});let n=3e3,r=8,s=90,o=30}};