"use strict";(()=>{var t={};t.id=7429,t.ids=[7429],t.modules={72934:t=>{t.exports=require("next/dist/client/components/action-async-storage.external.js")},54580:t=>{t.exports=require("next/dist/client/components/request-async-storage.external.js")},45869:t=>{t.exports=require("next/dist/client/components/static-generation-async-storage.external.js")},20399:t=>{t.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},30517:t=>{t.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},48927:t=>{t.exports=require("web-push")},84770:t=>{t.exports=require("crypto")},92048:t=>{t.exports=require("fs")},71568:t=>{t.exports=require("zlib")},8678:t=>{t.exports=import("pg")},6005:t=>{t.exports=require("node:crypto")},42725:t=>{t.exports=require("node:http2")},12349:(t,e,a)=>{a.a(t,async(t,s)=>{try{a.r(e),a.d(e,{originalPathname:()=>N,patchFetch:()=>E,requestAsyncStorage:()=>m,routeModule:()=>c,serverHooks:()=>d,staticGenerationAsyncStorage:()=>l});var r=a(49303),i=a(88716),n=a(60670),o=a(17258),u=t([o]);o=(u.then?(await u)():u)[0];let c=new r.AppRouteRouteModule({definition:{kind:i.x.APP_ROUTE,page:"/api/customers/[id]/route",pathname:"/api/customers/[id]",filename:"route",bundlePath:"app/api/customers/[id]/route"},resolvedPagePath:"C:\\Users\\LordOfTHeRings\\Desktop\\rappel beauty\\src\\app\\api\\customers\\[id]\\route.ts",nextConfigOutput:"",userland:o}),{requestAsyncStorage:m,staticGenerationAsyncStorage:l,serverHooks:d}=c,N="/api/customers/[id]/route";function E(){return(0,n.patchFetch)({serverHooks:d,staticGenerationAsyncStorage:l})}s()}catch(t){s(t)}})},49303:(t,e,a)=>{t.exports=a(30517)},17258:(t,e,a)=>{a.a(t,async(t,s)=>{try{a.r(e),a.d(e,{GET:()=>c,PATCH:()=>m});var r=a(87070),i=a(33568),n=a(37604),o=a(20673),u=a(47441),E=t([i,o]);async function c(t,e){let a=await (0,i.lr)(t,"customers");if(!a.ok)return a.response;let{id:s}=await e.params,{searchParams:n}=new URL(t.url),u="1"===n.get("history");try{let t=await (0,o.$k)(s,a.session.organizationId);if(!t)return r.NextResponse.json({error:"Cliente introuvable."},{status:404});if(u){let e=await (0,o.l4)(s,a.session.organizationId);return r.NextResponse.json({customer:t,history:e})}return r.NextResponse.json(t)}catch(t){return console.error(`[GET /api/customers/${s}]`,t),r.NextResponse.json({error:"Impossible de charger la cliente."},{status:500})}}async function m(t,e){let a=await (0,i.PX)(t,"customers");if(!a.ok)return a.response;let{id:s}=await e.params;try{let e=(0,i.stripOrganizationId)(await t.json()),E=(0,u.cs)(e);if(!E.ok)return r.NextResponse.json({error:"Donn\xe9es invalides.",details:E.errors},{status:400});let c=E.data;(0,n.KH)(a.session.role)||(delete c.marketingWhatsapp,delete c.marketingEmail,delete c.marketingSms);let m=await (0,o.uG)(s,a.session.organizationId,c);if(!m)return r.NextResponse.json({error:"Cliente introuvable."},{status:404});return r.NextResponse.json(m)}catch(t){if((0,o.zp)(t))return r.NextResponse.json({error:"Une cliente avec ce num\xe9ro existe d\xe9j\xe0 dans votre institut."},{status:409});return console.error(`[PATCH /api/customers/${s}]`,t),r.NextResponse.json({error:"Impossible de mettre \xe0 jour la cliente."},{status:500})}}[i,o]=E.then?(await E)():E,s()}catch(t){s(t)}})},20673:(t,e,a)=>{a.a(t,async(t,s)=>{try{a.d(e,{$L:()=>E,$k:()=>c,XA:()=>N,l4:()=>m,uG:()=>A,wK:()=>l,zp:()=>p});var r=a(8678),i=a(45269),n=a(47441),o=t([r]);let I=new(r=(o.then?(await o)():o)[0]).Pool({connectionString:process.env.DATABASE_URL});function u(t){let e=parseInt(t.visits,10)||0,a=parseInt(t.noShowCount,10)||0,s=parseFloat(t.revenue)||0,r=e>0?Math.round(s/e*100)/100:0;return{id:t.id,firstName:t.firstName,lastName:t.lastName,phone:t.phone,email:t.email,status:t.status,visits:e,noShowCount:a,revenue:s,averageTicket:r,lastVisitAt:t.lastVisitAt?.toISOString()??null,createdAt:t.createdAt.toISOString(),segment:function(t){if("INACTIVE"===t.status||"ARCHIVED"===t.status)return"INACTIVE";if("AT_RISK"===t.status)return"AT_RISK";if("NEW"===t.status)return"NEW";let e=(Date.now()-t.createdAt.getTime())/864e5;if(e<=i.TX&&t.visits<=1)return"NEW";if(t.revenue>=i.Fo||t.visits>=i.P9)return"VIP";if(t.lastVisitAt){if((Date.now()-t.lastVisitAt.getTime())/864e5>i.co)return"AT_RISK"}else if(e>i.co)return"AT_RISK";return"ACTIVE"}({status:t.status,visits:e,revenue:s,createdAt:t.createdAt,lastVisitAt:t.lastVisitAt})}}async function E(t,e){let{page:a,limit:s,search:r,status:n,segment:o="ALL"}=e,E=['c."organizationId" = $1','c."deletedAt" IS NULL'],c=[t],m=2;r&&(E.push(`(c."firstName" ILIKE $${m} OR c."lastName" ILIKE $${m} OR c.phone ILIKE $${m} OR COALESCE(c.email, '') ILIKE $${m})`),c.push(`%${r}%`),m++),n&&(E.push(`c.status = $${m}`),c.push(n),m++);let l=E.join(" AND "),d="ALL"!==o?function(t,e){switch(t){case"VIP":return`HAVING (
        COALESCE(SUM(a.price) FILTER (WHERE a.status = 'COMPLETED'), 0) >= ${i.Fo}
        OR COUNT(a.id) FILTER (WHERE a.status = 'COMPLETED') >= ${i.P9}
      )`;case"NEW":return`HAVING (
        c.status = 'NEW'
        OR (c."createdAt" >= NOW() - INTERVAL '${i.TX} days'
            AND COUNT(a.id) FILTER (WHERE a.status = 'COMPLETED') <= 1)
      )`;case"INACTIVE":return"HAVING c.status IN ('INACTIVE', 'ARCHIVED')";case"AT_RISK":return`HAVING (
        c.status = 'AT_RISK'
        OR (
          MAX(a."startAt") FILTER (WHERE a.status = 'COMPLETED') IS NOT NULL
          AND MAX(a."startAt") FILTER (WHERE a.status = 'COMPLETED') < NOW() - INTERVAL '${i.co} days'
        )
        OR (
          MAX(a."startAt") FILTER (WHERE a.status = 'COMPLETED') IS NULL
          AND c."createdAt" < NOW() - INTERVAL '${i.co} days'
          AND c.status NOT IN ('INACTIVE', 'ARCHIVED', 'NEW')
        )
      )`;case"ACTIVE":return"HAVING c.status = 'ACTIVE'";default:return""}}(o,0):"",N=`
    SELECT COUNT(*)::int AS total FROM (
      SELECT c.id
      FROM "Customer" c
      LEFT JOIN "Appointment" a ON a."customerId" = c.id AND a.status = 'COMPLETED'
      WHERE ${l}
      GROUP BY c.id, c.status, c."createdAt"
      ${d}
    ) sub
  `,A=`
    SELECT
      c.id,
      c."firstName",
      c."lastName",
      c.phone,
      c.email,
      c.status,
      c."birthDate",
      c.address,
      c.instagram,
      c.notes,
      c."marketingWhatsapp",
      c."marketingEmail",
      c."marketingSms",
      c."createdAt",
      c."updatedAt",
      c."deletedAt",
      COUNT(a.id) FILTER (WHERE a.status = 'COMPLETED')::text AS visits,
      COUNT(a.id) FILTER (WHERE a.status = 'NO_SHOW')::text AS "noShowCount",
      COALESCE(SUM(a.price) FILTER (WHERE a.status = 'COMPLETED'), 0)::text AS revenue,
      MAX(a."startAt") FILTER (WHERE a.status = 'COMPLETED') AS "lastVisitAt"
    FROM "Customer" c
    LEFT JOIN "Appointment" a ON a."customerId" = c.id
    WHERE ${l}
    GROUP BY c.id
    ${d}
    ORDER BY c."createdAt" DESC, c."lastName", c."firstName"
    LIMIT $${m} OFFSET $${m+1}
  `,p=`
    SELECT
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE seg = 'NEW')::int AS "newCount",
      COUNT(*) FILTER (WHERE seg = 'VIP')::int AS "vipCount",
      COUNT(*) FILTER (WHERE seg = 'INACTIVE')::int AS "inactiveCount",
      COUNT(*) FILTER (WHERE seg = 'ACTIVE')::int AS "activeCount",
      COUNT(*) FILTER (WHERE seg = 'AT_RISK')::int AS "atRiskCount"
    FROM (
      SELECT
        c.id,
        CASE
          WHEN c.status IN ('INACTIVE', 'ARCHIVED') THEN 'INACTIVE'
          WHEN c.status = 'AT_RISK' THEN 'AT_RISK'
          WHEN c.status = 'NEW' OR (c."createdAt" >= NOW() - INTERVAL '${i.TX} days'
            AND COALESCE(v.visits, 0) <= 1) THEN 'NEW'
          WHEN COALESCE(v.revenue, 0) >= ${i.Fo} OR COALESCE(v.visits, 0) >= ${i.P9} THEN 'VIP'
          WHEN v."lastVisitAt" IS NOT NULL AND v."lastVisitAt" < NOW() - INTERVAL '${i.co} days' THEN 'AT_RISK'
          WHEN v."lastVisitAt" IS NULL AND c."createdAt" < NOW() - INTERVAL '${i.co} days'
            AND c.status NOT IN ('INACTIVE', 'ARCHIVED', 'NEW') THEN 'AT_RISK'
          ELSE 'ACTIVE'
        END AS seg
      FROM "Customer" c
      LEFT JOIN LATERAL (
        SELECT
          COUNT(*) FILTER (WHERE status = 'COMPLETED')::int AS visits,
          COALESCE(SUM(price) FILTER (WHERE status = 'COMPLETED'), 0)::float AS revenue,
          MAX("startAt") FILTER (WHERE status = 'COMPLETED') AS "lastVisitAt"
        FROM "Appointment" a
        WHERE a."customerId" = c.id
      ) v ON true
      WHERE c."organizationId" = $1 AND c."deletedAt" IS NULL
    ) t
  `,[T,R,C]=await Promise.all([I.query(N,c),I.query(A,[...c,s,(a-1)*s]),I.query(p,[t])]);return{items:R.rows.map(u),total:T.rows[0]?.total??0,kpis:C.rows[0]??{total:0,newCount:0,vipCount:0,inactiveCount:0,activeCount:0,atRiskCount:0}}}async function c(t,e){var s;let{rows:r}=await I.query(`SELECT
      c.id,
      c."firstName",
      c."lastName",
      c.phone,
      c.email,
      c.status,
      c."birthDate",
      c.address,
      c.instagram,
      c.notes,
      c."marketingWhatsapp",
      c."marketingEmail",
      c."marketingSms",
      c."createdAt",
      c."updatedAt",
      c."deletedAt",
      COUNT(a.id) FILTER (WHERE a.status = 'COMPLETED')::text AS visits,
      COUNT(a.id) FILTER (WHERE a.status = 'NO_SHOW')::text AS "noShowCount",
      COALESCE(SUM(a.price) FILTER (WHERE a.status = 'COMPLETED'), 0)::text AS revenue,
      MAX(a."startAt") FILTER (WHERE a.status = 'COMPLETED') AS "lastVisitAt"
    FROM "Customer" c
    LEFT JOIN "Appointment" a ON a."customerId" = c.id
    WHERE c.id = $2 AND c."organizationId" = $1 AND c."deletedAt" IS NULL
    GROUP BY c.id`,[e,t]),i=r[0]?(s=r[0],{...u(s),birthDate:s.birthDate?.toISOString()??null,address:s.address,instagram:s.instagram,notes:s.notes,marketingWhatsapp:s.marketingWhatsapp,marketingEmail:s.marketingEmail,marketingSms:s.marketingSms,updatedAt:s.updatedAt.toISOString()}):null;if(!i)return null;try{let{countCustomerNoShows:s,getOrCreateBookingPolicy:r,noShowRiskLevel:n}=await a.e(4810).then(a.bind(a,54810)),o=await s(e,t),u=await r(e);i.noShowCount=o,i.noShowRisk=n(o,u)}catch{i.noShowCount=0,i.noShowRisk="NONE"}return i}async function m(t,e){let{rows:a}=await I.query(`SELECT a.id, a."startAt", COALESCE(s.name, 'Prestation') AS "serviceName", a.price::text, a.status,
            st."firstName" AS "staffFirstName"
     FROM "Appointment" a
     LEFT JOIN "Service" s ON s.id = a."serviceId"
     JOIN "Customer" c ON c.id = a."customerId"
     LEFT JOIN "Staff" st ON st.id = a."staffId"
     WHERE a."customerId" = $1 AND c."organizationId" = $2
     ORDER BY a."startAt" DESC
     LIMIT 50`,[t,e]);return a.map(t=>({id:t.id,startAt:t.startAt.toISOString(),serviceName:t.serviceName,price:parseFloat(t.price),status:t.status,staffFirstName:t.staffFirstName}))}async function l(t,e){let s=(0,n.UK)(e.phone),r=`cust-${Date.now()}`;await I.query(`INSERT INTO "Customer" (
      id, "organizationId", "firstName", "lastName", phone, email,
      "birthDate", address, instagram, notes, status,
      "marketingWhatsapp", "marketingEmail", "marketingSms", "updatedAt"
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'NEW',$11,$12,$13,NOW())`,[r,t,e.firstName,e.lastName,s,e.email??null,e.birthDate?new Date(e.birthDate):null,e.address??null,e.instagram??null,e.notes??null,e.marketingWhatsapp??!1,e.marketingEmail??!1,e.marketingSms??!1]);let i=await c(r,t);if(!i)throw Error("Cliente cr\xe9\xe9e introuvable.");try{let{writeAuditLog:e}=await Promise.resolve().then(a.bind(a,2192));await e({organizationId:t,entityType:"Customer",entityId:r,action:"CREATE",after:{firstName:i.firstName,lastName:i.lastName,phone:i.phone}})}catch{}return i}async function d(t,e,a){let s=(0,n.UK)(e),{rows:r}=await (a??I).query(`SELECT id, "marketingWhatsapp", "marketingEmail"
     FROM "Customer"
     WHERE "organizationId" = $1 AND phone = $2 AND "deletedAt" IS NULL
     LIMIT 1`,[t,s]);return r[0]??null}async function N(t,e,a){let s=a??I,r=(0,n.UK)(e.phone),i=await d(t,r,s);if(i){let t=e.marketingOptIn||i.marketingWhatsapp,a=e.marketingOptIn||i.marketingEmail;return await s.query(`UPDATE "Customer"
       SET "firstName" = $1, "lastName" = $2,
           email = COALESCE($3, email),
           "marketingWhatsapp" = $4, "marketingEmail" = $5, "updatedAt" = NOW()
       WHERE id = $6`,[e.firstName.trim(),e.lastName.trim(),e.email?.trim()||null,t,a,i.id]),{customerId:i.id,created:!1}}let o=`cust-${Date.now()}-${Math.random().toString(36).slice(2,7)}`,u=e.marketingOptIn??!1;return await s.query(`INSERT INTO "Customer" (
      id, "organizationId", "firstName", "lastName", phone, email, status,
      "marketingWhatsapp", "marketingEmail", "marketingSms", "updatedAt"
    ) VALUES ($1,$2,$3,$4,$5,$6,'NEW',$7,$8,false,NOW())`,[o,t,e.firstName.trim(),e.lastName.trim(),r,e.email?.trim()||null,u,u]),{customerId:o,created:!0}}async function A(t,e,s){let r=await c(t,e);if(!r&&!s.archived)return null;if(s.archived){await I.query(`UPDATE "Customer"
       SET status = 'ARCHIVED', "deletedAt" = NOW(), "updatedAt" = NOW()
       WHERE id = $1 AND "organizationId" = $2 AND "deletedAt" IS NULL`,[t,e]);try{let{writeAuditLog:s}=await Promise.resolve().then(a.bind(a,2192));await s({organizationId:e,entityType:"Customer",entityId:t,action:"ARCHIVE",before:r?{status:r.status}:void 0,after:{status:"ARCHIVED"}})}catch{}return c(t,e)}let i=[],o=[],u=1,E=(t,e)=>{i.push(`"${t}" = $${u++}`),o.push(e)};if(void 0!==s.firstName&&E("firstName",s.firstName),void 0!==s.lastName&&E("lastName",s.lastName),void 0!==s.phone&&E("phone",(0,n.UK)(s.phone)),void 0!==s.email&&E("email",s.email??null),void 0!==s.birthDate&&E("birthDate",s.birthDate?new Date(s.birthDate):null),void 0!==s.address&&E("address",s.address??null),void 0!==s.instagram&&E("instagram",s.instagram??null),void 0!==s.notes&&E("notes",s.notes??null),void 0!==s.status&&E("status",s.status),void 0!==s.marketingWhatsapp&&E("marketingWhatsapp",s.marketingWhatsapp),void 0!==s.marketingEmail&&E("marketingEmail",s.marketingEmail),void 0!==s.marketingSms&&E("marketingSms",s.marketingSms),0===i.length)return c(t,e);i.push('"updatedAt" = NOW()'),o.push(t,e);let m=await I.query(`UPDATE "Customer" SET ${i.join(", ")}
     WHERE id = $${u} AND "organizationId" = $${u+1} AND "deletedAt" IS NULL`,o);if(0===m.rowCount)return null;let l=await c(t,e);try{let{writeAuditLog:s}=await Promise.resolve().then(a.bind(a,2192));await s({organizationId:e,entityType:"Customer",entityId:t,action:"UPDATE",before:r?{firstName:r.firstName,lastName:r.lastName,phone:r.phone,status:r.status}:void 0,after:l?{firstName:l.firstName,lastName:l.lastName,phone:l.phone,status:l.status}:void 0})}catch{}return l}function p(t){return"object"==typeof t&&null!==t&&"code"in t&&"23505"===t.code}s()}catch(t){s(t)}})},45269:(t,e,a)=>{a.d(e,{Fo:()=>s,P9:()=>r,TX:()=>n,co:()=>i});let s=3e3,r=8,i=90,n=30}};var e=require("../../../../webpack-runtime.js");e.C(t);var a=t=>e(e.s=t),s=e.X(0,[8948,7070,3314,3376,3568],()=>a(12349));module.exports=s})();