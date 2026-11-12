"use strict";!function(){try{var t="undefined"!=typeof window?window:"undefined"!=typeof global?global:"undefined"!=typeof self?self:{},e=(new t.Error).stack;e&&(t._sentryDebugIds=t._sentryDebugIds||{},t._sentryDebugIds[e]="f44c87e6-28d4-4465-9c0d-83a56362f2af",t._sentryDebugIdIdentifier="sentry-dbid-f44c87e6-28d4-4465-9c0d-83a56362f2af")}catch(t){}}(),exports.id=7235,exports.ids=[7235],exports.modules={7235:(t,e,r)=>{r.a(t,async(t,n)=>{try{r.d(e,{Dw:()=>c,Yn:()=>d,u0:()=>A});var a=r(8678),s=r(90831),o=r(66893),i=t([a,o]);[a,o]=i.then?(await i)():i;let S=(0,s.S)(new a.Pool({connectionString:process.env.DATABASE_URL})),p=`s.id = (
  SELECT s2.id FROM "Subscription" s2
  WHERE s2."organizationId" = s."organizationId"
  ORDER BY s2."createdAt" DESC LIMIT 1
)`;async function E(){let{rows:t}=await S.query(`SELECT p.code AS plan, COUNT(*)::text AS cnt
     FROM "Subscription" s
     JOIN "Plan" p ON p.id = s."planId"
     WHERE ${p}
       AND s.status IN ('ACTIVE', 'TRIAL', 'PAST_DUE')
     GROUP BY p.code`),e=t.reduce((t,e)=>t+parseInt(e.cnt,10),0),r={STARTER:0,INSTITUT:0,PREMIUM:0};if(0===e)return r;for(let n of t)n.plan in r&&(r[n.plan]=Math.round(parseInt(n.cnt,10)/e*1e3)/10);return r}async function u(t=6){let e=[],r=new Date;for(let n=t-1;n>=0;n--){let t=new Date(r.getFullYear(),r.getMonth()-n,1),a=new Date(t.getFullYear(),t.getMonth()+1,0,23,59,59,999),{rows:s}=await S.query(`SELECT COALESCE(SUM(s."priceSnapshot"), 0)::text AS mrr
       FROM "Subscription" s
       WHERE ${p}
         AND s."startedAt" <= $1
         AND (s."cancelledAt" IS NULL OR s."cancelledAt" > $2)`,[a,t]);e.push({label:t.toLocaleDateString("fr-FR",{month:"short"}),value:Math.round(100*parseFloat(s[0]?.mrr??"0"))/100})}return e}async function d(){let[t,e,r,n]=await Promise.all([(0,o._d)(),E(),u(6),S.query(`SELECT
        (SELECT COUNT(*)::text FROM "Service" WHERE active = true) AS services,
        (SELECT COUNT(*)::text FROM "Customer" WHERE "deletedAt" IS NULL AND status != 'ARCHIVED') AS customers,
        (SELECT COUNT(*)::text FROM "Staff" WHERE "deletedAt" IS NULL) AS staff`)]),a=r.length>=2?r[r.length-2].value:null,s=null!=a&&a>0?Math.round((t.mrr-a)/a*1e3)/10:t.mrr>0?100:0,i=t.orgsActive>0?Math.round(t.mrr/t.orgsActive*100)/100:0;return{...t,planShare:e,mrrSeries:r,mrrGrowthPercent:s,arpu:i,services:parseInt(n.rows[0]?.services??"0",10),customersTotal:parseInt(n.rows[0]?.customers??"0",10),staffTotal:parseInt(n.rows[0]?.staff??"0",10)}}async function c(){let[t,e,r,n,a,s,i,d,c,A,l]=await Promise.all([(0,o._d)(),u(6),E(),S.query(`SELECT s.id, o.id AS "orgId", o.name AS "orgName", o.city AS "orgCity", o.phone AS "orgPhone",
              s."priceSnapshot"::text AS amount, p.code AS plan,
              s."currentPeriodStart" AS "periodStart",
              s."currentPeriodEnd" AS "periodEnd",
              s.status::text
       FROM "Subscription" s
       JOIN "Organization" o ON o.id = s."organizationId"
       JOIN "Plan" p ON p.id = s."planId"
       WHERE ${p}
       ORDER BY
         CASE s.status
           WHEN 'ACTIVE' THEN 0
           WHEN 'TRIAL' THEN 1
           WHEN 'PAST_DUE' THEN 2
           ELSE 3
         END,
         s."currentPeriodStart" DESC
       LIMIT 80`),S.query(`SELECT
        COUNT(*)::text AS total,
        COUNT(*) FILTER (WHERE s.status = 'ACTIVE')::text AS active,
        COUNT(*) FILTER (WHERE s.status = 'TRIAL')::text AS trial,
        COUNT(*) FILTER (
          WHERE s.status = 'CANCELLED'
            AND s."cancelledAt" >= date_trunc('month', NOW())
        )::text AS cancelled,
        COUNT(*) FILTER (WHERE s.status = 'PAUSED')::text AS suspended,
        COUNT(*) FILTER (
          WHERE s.status IN ('ACTIVE', 'TRIAL', 'PAST_DUE')
            AND s."currentPeriodEnd" > NOW()
            AND s."currentPeriodEnd" <= NOW() + INTERVAL '7 days'
        )::text AS soon
       FROM "Subscription" s
       WHERE ${p}`),S.query(`SELECT COALESCE(SUM(s."priceSnapshot"), 0)::text AS amount,
              COUNT(*)::text AS cnt
       FROM "Subscription" s
       WHERE ${p} AND s.status = 'PAST_DUE'`),S.query(`SELECT
        COUNT(*) FILTER (
          WHERE s.status IN ('ACTIVE', 'TRIAL')
            AND s."startedAt" >= date_trunc('month', NOW())
        )::text AS "newCount",
        COALESCE(SUM(s."priceSnapshot") FILTER (
          WHERE s.status IN ('ACTIVE', 'TRIAL')
            AND s."startedAt" >= date_trunc('month', NOW())
        ), 0)::text AS "newMrr",
        COUNT(*) FILTER (
          WHERE s.status = 'CANCELLED'
            AND s."cancelledAt" >= date_trunc('month', NOW())
        )::text AS "churnCount"
       FROM "Subscription" s
       WHERE ${p}`),S.query(`SELECT
        COUNT(*) FILTER (
          WHERE s."currentPeriodEnd"::date = CURRENT_DATE
            AND s.status IN ('ACTIVE', 'TRIAL', 'PAST_DUE')
        )::text AS "todayCount",
        COALESCE(SUM(s."priceSnapshot") FILTER (
          WHERE s."currentPeriodEnd"::date = CURRENT_DATE
            AND s.status IN ('ACTIVE', 'TRIAL', 'PAST_DUE')
        ), 0)::text AS "todayAmount",
        COUNT(*) FILTER (
          WHERE s."currentPeriodEnd" > NOW()
            AND s."currentPeriodEnd" <= NOW() + INTERVAL '7 days'
            AND s.status IN ('ACTIVE', 'TRIAL', 'PAST_DUE')
        )::text AS "d7Count",
        COALESCE(SUM(s."priceSnapshot") FILTER (
          WHERE s."currentPeriodEnd" > NOW()
            AND s."currentPeriodEnd" <= NOW() + INTERVAL '7 days'
            AND s.status IN ('ACTIVE', 'TRIAL', 'PAST_DUE')
        ), 0)::text AS "d7Amount",
        COUNT(*) FILTER (
          WHERE s."currentPeriodEnd" > NOW()
            AND s."currentPeriodEnd" <= NOW() + INTERVAL '30 days'
            AND s.status IN ('ACTIVE', 'TRIAL', 'PAST_DUE')
        )::text AS "d30Count",
        COALESCE(SUM(s."priceSnapshot") FILTER (
          WHERE s."currentPeriodEnd" > NOW()
            AND s."currentPeriodEnd" <= NOW() + INTERVAL '30 days'
            AND s.status IN ('ACTIVE', 'TRIAL', 'PAST_DUE')
        ), 0)::text AS "d30Amount"
       FROM "Subscription" s
       WHERE ${p}`),S.query(`SELECT COALESCE(NULLIF(TRIM(o.city), ''), 'Autres') AS city,
              COALESCE(SUM(s."priceSnapshot"), 0)::text AS mrr
       FROM "Subscription" s
       JOIN "Organization" o ON o.id = s."organizationId"
       WHERE ${p}
         AND s.status IN ('ACTIVE', 'TRIAL')
       GROUP BY 1
       ORDER BY SUM(s."priceSnapshot") DESC
       LIMIT 8`),S.query(`SELECT s.id, o.id AS "orgId", o.name AS "orgName", o.city AS "orgCity", o.phone AS "orgPhone",
              s."priceSnapshot"::text AS amount, s."currentPeriodEnd" AS "dueAt"
       FROM "Subscription" s
       JOIN "Organization" o ON o.id = s."organizationId"
       WHERE ${p} AND s.status = 'PAST_DUE'
       ORDER BY s."currentPeriodEnd" ASC
       LIMIT 20`),S.query(`SELECT COALESCE(SUM(s."priceSnapshot"), 0)::text AS "churnMrr"
       FROM "Subscription" s
       WHERE ${p}
         AND s.status = 'CANCELLED'
         AND s."cancelledAt" >= date_trunc('month', NOW())`)]),I=e.length>=2?e[e.length-2].value:0,C=I>0?Math.round((t.mrr-I)/I*1e3)/10:t.mrr>0?100:0,T=Math.round(100*parseFloat(s.rows[0]?.amount??"0"))/100,R=parseInt(s.rows[0]?.cnt??"0",10),h=Math.max(0,Math.round((t.mrr-T)*100)/100),N=t.mrr>0?Math.round(h/t.mrr*1e3)/10:100,m=I>0?Math.round(N/100*I*100)/100:0,O=Math.round(100*parseFloat(i.rows[0]?.newMrr??"0"))/100,g=Math.round(100*parseFloat(l.rows[0]?.churnMrr??"0"))/100,L=parseInt(i.rows[0]?.newCount??"0",10),D=parseInt(i.rows[0]?.churnCount??"0",10),M=c.rows.reduce((t,e)=>t+parseFloat(e.mrr),0)||1,y=c.rows.map(t=>{let e=Math.round(100*parseFloat(t.mrr))/100;return{city:t.city,mrr:e,pct:Math.round(e/M*1e3)/10}}),w=e.map((r,n)=>{let a=n===e.length-1,s=r.value,o=t.mrr>0?T/t.mrr:0,i=a?T:Math.round(s*o*100)/100,E=Math.max(0,Math.round((s-i)*100)/100);return{label:r.label,mrr:s,collected:E,pastDue:i,rate:s>0?Math.round(E/s*1e3)/10:100}}),U=["Carte / provision","\xc9chec pr\xe9l\xe8vement","\xc0 relancer","En souffrance"];return{mrr:t.mrr,arr:t.arr,mrrGrowthPercent:C,activeSubs:t.activeSubs,mrrSeries:e,collected:h,collectedGrowthPercent:m>0?Math.round((h-m)/m*1e3)/10:h>0?100:0,pastDueAmount:T,pastDueCount:R,collectionRate:N,fleet:{total:parseInt(a.rows[0]?.total??"0",10),active:parseInt(a.rows[0]?.active??"0",10),trial:parseInt(a.rows[0]?.trial??"0",10),cancelledThisMonth:parseInt(a.rows[0]?.cancelled??"0",10),suspended:parseInt(a.rows[0]?.suspended??"0",10),expiringSoon:parseInt(a.rows[0]?.soon??"0",10)},movements:{newThisMonth:L,newMrr:O,churnThisMonth:D,churnMrr:g,netMrr:Math.round((O-g)*100)/100},renewals:{todayCount:parseInt(d.rows[0]?.todayCount??"0",10),todayAmount:Math.round(100*parseFloat(d.rows[0]?.todayAmount??"0"))/100,next7Count:parseInt(d.rows[0]?.d7Count??"0",10),next7Amount:Math.round(100*parseFloat(d.rows[0]?.d7Amount??"0"))/100,next30Count:parseInt(d.rows[0]?.d30Count??"0",10),next30Amount:Math.round(100*parseFloat(d.rows[0]?.d30Amount??"0"))/100},cityMrr:y,unpaid:A.rows.map((t,e)=>({id:t.id,organizationId:t.orgId,organizationName:t.orgName,organizationCity:t.orgCity,organizationPhone:t.orgPhone,amount:parseFloat(t.amount),dueAt:t.dueAt.toISOString(),attemptsHint:`${Math.min(3,e+1)} \xe9chec${0===e?"":"s"}`,statusLabel:U[Math.min(e,U.length-1)]})),history:w,planShare:r,lines:n.rows.map(t=>({id:t.id,organizationId:t.orgId,organizationName:t.orgName,organizationCity:t.orgCity,organizationPhone:t.orgPhone,amount:parseFloat(t.amount),plan:t.plan,periodStart:t.periodStart.toISOString(),periodEnd:t.periodEnd?.toISOString()??null,status:t.status}))}}async function A(){let{getAdminSubscriptionsKpis:t}=await Promise.resolve().then(r.bind(r,31916)),{getPlatformUsersKpis:e}=await r.e(3014).then(r.bind(r,3014)),{adminSupportKpis:n,adminSupportAttention:a,adminSupportAnalytics:s}=await r.e(6208).then(r.bind(r,36208)),{getIntegrationsStatus:i}=await Promise.all([r.e(4239),r.e(4641),r.e(8e3)]).then(r.bind(r,58e3)),E=Date.now(),d=!0;try{await S.query("SELECT 1")}catch{d=!1}let[c,A,l,I,C,T,R,h,N,m,O,g]=await Promise.all([(0,o._d)(),u(12),t().catch(()=>({total:0,active:0,expiringSoon:0,expired:0,mrr:0})),e().catch(()=>({total:0,active:0,disabled:0,thisMonth:0,inactive:0,onlineToday:0,watchlist:0,orgsCount:0,roleShare:{}})),n().catch(()=>null),a().catch(()=>null),s().catch(()=>null),S.query('SELECT status::text, COUNT(*)::text AS n FROM "Organization" GROUP BY status'),S.query(`SELECT to_char(date_trunc('month', "createdAt"), 'YYYY-MM') AS ym,
                COUNT(*)::text AS n
         FROM "Organization"
         WHERE "createdAt" >= date_trunc('month', NOW()) - INTERVAL '5 months'
         GROUP BY 1
         ORDER BY 1`),S.query(`SELECT o.id, o.name,
           COALESCE((
             SELECT s."priceSnapshot" FROM "Subscription" s
             WHERE s."organizationId" = o.id
             ORDER BY s."createdAt" DESC LIMIT 1
           ), 0)::text AS mrr,
           (SELECT COUNT(*)::text FROM "Appointment" a
             WHERE a."organizationId" = o.id
               AND a."startAt" >= date_trunc('month', NOW())
               AND a.status != 'CANCELLED') AS appointments,
           (SELECT COUNT(*)::text FROM "Customer" c
             WHERE c."organizationId" = o.id AND c."deletedAt" IS NULL) AS customers,
           (SELECT MAX(a."createdAt") FROM "PlatformAuditLog" a
             WHERE a."organizationId" = o.id) AS "lastActivity"
         FROM "Organization" o
         WHERE o.status = 'ACTIVE'
         ORDER BY COALESCE((
           SELECT s."priceSnapshot" FROM "Subscription" s
           WHERE s."organizationId" = o.id
           ORDER BY s."createdAt" DESC LIMIT 1
         ), 0) DESC, o."createdAt" DESC
         LIMIT 5`),S.query(`SELECT status::text, COUNT(*)::text AS n
         FROM "Subscription" s
         WHERE ${p}
         GROUP BY status`),S.query(`SELECT COUNT(*)::text AS n FROM "Subscription" s
         WHERE ${p} AND s.status = 'PAST_DUE'`)]),L=Object.fromEntries(h.rows.map(t=>[t.status,parseInt(t.n,10)])),D=Object.fromEntries(O.rows.map(t=>[t.status,parseInt(t.n,10)])),M=A.length>=2?A[A.length-2].value:0,y=M>0?Math.round((c.mrr-M)/M*1e3)/10:c.mrr>0?100:0,w=L.SUSPENDED??0,U=parseInt(g.rows[0]?.n??"0",10),P=[];(T?.urgentOpen??0)>0&&P.push({id:"urgent-tickets",severity:"critical",label:"tickets urgents",count:T.urgentOpen,href:"/support/tickets/?attention=urgent"}),U>0&&P.push({id:"failed-payments",severity:"high",label:"paiements / abonnements en retard",count:U,href:"/subscriptions/?status=PAST_DUE"}),l.expiringSoon>0&&P.push({id:"expiring",severity:"medium",label:"abonnements arrivent \xe0 \xe9ch\xe9ance",count:l.expiringSoon,href:"/subscriptions/"}),w>0&&P.push({id:"suspended",severity:"low",label:"organisations suspendues",count:w,href:"/organizations/?status=SUSPENDED"});let F=[],W=new Date;for(let t=5;t>=0;t--){let e=new Date(W.getFullYear(),W.getMonth()-t,1);F.push({key:`${e.getFullYear()}-${String(e.getMonth()+1).padStart(2,"0")}`,label:e.toLocaleDateString("fr-FR",{month:"short"})})}let x=F.map(t=>{let e=N.rows.find(e=>e.ym===t.key);return{label:t.label,newOrgs:parseInt(e?.n??"0",10),active:L.ACTIVE??c.orgsActive,suspended:w}}),b=i();return{stats:{...c,mrrGrowthPercent:y,suspendedOrgs:w},alerts:P,mrrSeries:A,orgsSeries:x,orgStatus:{active:L.ACTIVE??0,suspended:w,archived:L.ARCHIVED??0},subscriptions:{active:D.ACTIVE??0,pending:(D.TRIAL??0)+(D.PAST_DUE??0),expired:D.EXPIRED??l.expired,suspended:(D.PAUSED??0)+(D.CANCELLED??0),expiringSoon:l.expiringSoon,mrr:c.mrr,arr:c.arr},users:{total:I.total,active:I.active,disabled:I.disabled,thisMonth:I.thisMonth,pending:0},support:{open:C?.open??0,inProgress:C?.inProgress??0,waitingCustomer:C?.waitingCustomer??0,resolved:C?.resolved??0,urgentOpen:T?.urgentOpen??0,highOpen:T?.highOpen??0,avgFirstResponseMinutes:C?.avgFirstResponseMinutes??null,avgSatisfaction:C?.avgSatisfaction??null,byCategory:(R?.byCategory??[]).slice(0,6).map(t=>({category:t.category,count:t.count}))},topOrgs:m.rows.map(t=>({id:t.id,name:t.name,mrr:parseFloat(t.mrr),appointments:parseInt(t.appointments,10),customers:parseInt(t.customers,10),lastActivityAt:t.lastActivity?.toISOString()??null})),health:{api:Date.now()-E<5e3?"ok":"degraded",database:d?"ok":"down",auth:"ok",email:b.email.resendConfigured?"ok":"degraded",whatsapp:b.whatsapp.autoSendEnabled?"ok":(b.whatsapp.webhookConfigured,"manual"),storage:"ok",checkedAt:new Date().toISOString()},payments:{failed:U,pastDue:U}}}n()}catch(t){n(t)}})}};