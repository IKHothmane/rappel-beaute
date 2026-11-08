"use strict";exports.id=8903,exports.ids=[8903],exports.modules={95846:(t,e,a)=>{a.d(e,{DY:()=>s,_b:()=>r,iT:()=>n});var i=a(53645);function s(t){return t.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"").slice(0,80)}function r(t){let e=((t.baseUrl??(0,i.bZ)())||i.Ey.appUrl).replace(/\/$/,""),a=new URL(`${e}/book/${encodeURIComponent(t.slug)}/`);return t.source?.trim()&&a.searchParams.set("source",t.source.trim().slice(0,40)),t.service?.trim()&&a.searchParams.set("service",t.service.trim().slice(0,80)),t.staff?.trim()&&a.searchParams.set("staff",t.staff.trim().slice(0,80)),a.toString()}function n(t){return t instanceof URLSearchParams?{service:t.get("service"),staff:t.get("staff"),source:t.get("source")}:{service:t.service??null,staff:t.staff??null,source:t.source??null}}},20673:(t,e,a)=>{a.a(t,async(t,i)=>{try{a.d(e,{$L:()=>u,$k:()=>d,XA:()=>N,l4:()=>l,uG:()=>I,wK:()=>m,zp:()=>A});var s=a(8678),r=a(45269),n=a(47441),o=t([s]);let f=new(s=(o.then?(await o)():o)[0]).Pool({connectionString:process.env.DATABASE_URL});function c(t){let e=parseInt(t.visits,10)||0,a=parseInt(t.noShowCount,10)||0,i=parseFloat(t.revenue)||0,s=e>0?Math.round(i/e*100)/100:0;return{id:t.id,firstName:t.firstName,lastName:t.lastName,phone:t.phone,email:t.email,status:t.status,visits:e,noShowCount:a,revenue:i,averageTicket:s,lastVisitAt:t.lastVisitAt?.toISOString()??null,createdAt:t.createdAt.toISOString(),segment:function(t){if("INACTIVE"===t.status||"ARCHIVED"===t.status)return"INACTIVE";if("AT_RISK"===t.status)return"AT_RISK";if("NEW"===t.status)return"NEW";let e=(Date.now()-t.createdAt.getTime())/864e5;if(e<=r.TX&&t.visits<=1)return"NEW";if(t.revenue>=r.Fo||t.visits>=r.P9)return"VIP";if(t.lastVisitAt){if((Date.now()-t.lastVisitAt.getTime())/864e5>r.co)return"AT_RISK"}else if(e>r.co)return"AT_RISK";return"ACTIVE"}({status:t.status,visits:e,revenue:i,createdAt:t.createdAt,lastVisitAt:t.lastVisitAt})}}async function u(t,e){let{page:a,limit:i,search:s,status:n,segment:o="ALL"}=e,u=['c."organizationId" = $1','c."deletedAt" IS NULL'],d=[t],l=2;s&&(u.push(`(c."firstName" ILIKE $${l} OR c."lastName" ILIKE $${l} OR c.phone ILIKE $${l} OR COALESCE(c.email, '') ILIKE $${l})`),d.push(`%${s}%`),l++),n&&(u.push(`c.status = $${l}`),d.push(n),l++);let m=u.join(" AND "),E="ALL"!==o?function(t,e){switch(t){case"VIP":return`HAVING (
        COALESCE(SUM(a.price) FILTER (WHERE a.status = 'COMPLETED'), 0) >= ${r.Fo}
        OR COUNT(a.id) FILTER (WHERE a.status = 'COMPLETED') >= ${r.P9}
      )`;case"NEW":return`HAVING (
        c.status = 'NEW'
        OR (c."createdAt" >= NOW() - INTERVAL '${r.TX} days'
            AND COUNT(a.id) FILTER (WHERE a.status = 'COMPLETED') <= 1)
      )`;case"INACTIVE":return"HAVING c.status IN ('INACTIVE', 'ARCHIVED')";case"AT_RISK":return`HAVING (
        c.status = 'AT_RISK'
        OR (
          MAX(a."startAt") FILTER (WHERE a.status = 'COMPLETED') IS NOT NULL
          AND MAX(a."startAt") FILTER (WHERE a.status = 'COMPLETED') < NOW() - INTERVAL '${r.co} days'
        )
        OR (
          MAX(a."startAt") FILTER (WHERE a.status = 'COMPLETED') IS NULL
          AND c."createdAt" < NOW() - INTERVAL '${r.co} days'
          AND c.status NOT IN ('INACTIVE', 'ARCHIVED', 'NEW')
        )
      )`;case"ACTIVE":return"HAVING c.status = 'ACTIVE'";default:return""}}(o,0):"",N=`
    SELECT COUNT(*)::int AS total FROM (
      SELECT c.id
      FROM "Customer" c
      LEFT JOIN "Appointment" a ON a."customerId" = c.id AND a.status = 'COMPLETED'
      WHERE ${m}
      GROUP BY c.id, c.status, c."createdAt"
      ${E}
    ) sub
  `,I=`
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
    WHERE ${m}
    GROUP BY c.id
    ${E}
    ORDER BY c."createdAt" DESC, c."lastName", c."firstName"
    LIMIT $${l} OFFSET $${l+1}
  `,A=`
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
          WHEN c.status = 'NEW' OR (c."createdAt" >= NOW() - INTERVAL '${r.TX} days'
            AND COALESCE(v.visits, 0) <= 1) THEN 'NEW'
          WHEN COALESCE(v.revenue, 0) >= ${r.Fo} OR COALESCE(v.visits, 0) >= ${r.P9} THEN 'VIP'
          WHEN v."lastVisitAt" IS NOT NULL AND v."lastVisitAt" < NOW() - INTERVAL '${r.co} days' THEN 'AT_RISK'
          WHEN v."lastVisitAt" IS NULL AND c."createdAt" < NOW() - INTERVAL '${r.co} days'
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
  `,[p,T,S]=await Promise.all([f.query(N,d),f.query(I,[...d,i,(a-1)*i]),f.query(A,[t])]);return{items:T.rows.map(c),total:p.rows[0]?.total??0,kpis:S.rows[0]??{total:0,newCount:0,vipCount:0,inactiveCount:0,activeCount:0,atRiskCount:0}}}async function d(t,e){var i;let{rows:s}=await f.query(`SELECT
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
    GROUP BY c.id`,[e,t]),r=s[0]?(i=s[0],{...c(i),birthDate:i.birthDate?.toISOString()??null,address:i.address,instagram:i.instagram,notes:i.notes,marketingWhatsapp:i.marketingWhatsapp,marketingEmail:i.marketingEmail,marketingSms:i.marketingSms,updatedAt:i.updatedAt.toISOString()}):null;if(!r)return null;try{let{countCustomerNoShows:i,getOrCreateBookingPolicy:s,noShowRiskLevel:n}=await a.e(4810).then(a.bind(a,54810)),o=await i(e,t),c=await s(e);r.noShowCount=o,r.noShowRisk=n(o,c)}catch{r.noShowCount=0,r.noShowRisk="NONE"}return r}async function l(t,e){let{rows:a}=await f.query(`SELECT a.id, a."startAt", COALESCE(s.name, 'Prestation') AS "serviceName", a.price::text, a.status,
            st."firstName" AS "staffFirstName"
     FROM "Appointment" a
     LEFT JOIN "Service" s ON s.id = a."serviceId"
     JOIN "Customer" c ON c.id = a."customerId"
     LEFT JOIN "Staff" st ON st.id = a."staffId"
     WHERE a."customerId" = $1 AND c."organizationId" = $2
     ORDER BY a."startAt" DESC
     LIMIT 50`,[t,e]);return a.map(t=>({id:t.id,startAt:t.startAt.toISOString(),serviceName:t.serviceName,price:parseFloat(t.price),status:t.status,staffFirstName:t.staffFirstName}))}async function m(t,e){let i=(0,n.UK)(e.phone),s=`cust-${Date.now()}`;await f.query(`INSERT INTO "Customer" (
      id, "organizationId", "firstName", "lastName", phone, email,
      "birthDate", address, instagram, notes, status,
      "marketingWhatsapp", "marketingEmail", "marketingSms", "updatedAt"
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'NEW',$11,$12,$13,NOW())`,[s,t,e.firstName,e.lastName,i,e.email??null,e.birthDate?new Date(e.birthDate):null,e.address??null,e.instagram??null,e.notes??null,e.marketingWhatsapp??!1,e.marketingEmail??!1,e.marketingSms??!1]);let r=await d(s,t);if(!r)throw Error("Cliente cr\xe9\xe9e introuvable.");try{let{writeAuditLog:e}=await Promise.resolve().then(a.bind(a,2192));await e({organizationId:t,entityType:"Customer",entityId:s,action:"CREATE",after:{firstName:r.firstName,lastName:r.lastName,phone:r.phone}})}catch{}return r}async function E(t,e,a){let i=(0,n.UK)(e),{rows:s}=await (a??f).query(`SELECT id, "marketingWhatsapp", "marketingEmail"
     FROM "Customer"
     WHERE "organizationId" = $1 AND phone = $2 AND "deletedAt" IS NULL
     LIMIT 1`,[t,i]);return s[0]??null}async function N(t,e,a){let i=a??f,s=(0,n.UK)(e.phone),r=await E(t,s,i);if(r){let t=e.marketingOptIn||r.marketingWhatsapp,a=e.marketingOptIn||r.marketingEmail;return await i.query(`UPDATE "Customer"
       SET "firstName" = $1, "lastName" = $2,
           email = COALESCE($3, email),
           "marketingWhatsapp" = $4, "marketingEmail" = $5, "updatedAt" = NOW()
       WHERE id = $6`,[e.firstName.trim(),e.lastName.trim(),e.email?.trim()||null,t,a,r.id]),{customerId:r.id,created:!1}}let o=`cust-${Date.now()}-${Math.random().toString(36).slice(2,7)}`,c=e.marketingOptIn??!1;return await i.query(`INSERT INTO "Customer" (
      id, "organizationId", "firstName", "lastName", phone, email, status,
      "marketingWhatsapp", "marketingEmail", "marketingSms", "updatedAt"
    ) VALUES ($1,$2,$3,$4,$5,$6,'NEW',$7,$8,false,NOW())`,[o,t,e.firstName.trim(),e.lastName.trim(),s,e.email?.trim()||null,c,c]),{customerId:o,created:!0}}async function I(t,e,i){let s=await d(t,e);if(!s&&!i.archived)return null;if(i.archived){await f.query(`UPDATE "Customer"
       SET status = 'ARCHIVED', "deletedAt" = NOW(), "updatedAt" = NOW()
       WHERE id = $1 AND "organizationId" = $2 AND "deletedAt" IS NULL`,[t,e]);try{let{writeAuditLog:i}=await Promise.resolve().then(a.bind(a,2192));await i({organizationId:e,entityType:"Customer",entityId:t,action:"ARCHIVE",before:s?{status:s.status}:void 0,after:{status:"ARCHIVED"}})}catch{}return d(t,e)}let r=[],o=[],c=1,u=(t,e)=>{r.push(`"${t}" = $${c++}`),o.push(e)};if(void 0!==i.firstName&&u("firstName",i.firstName),void 0!==i.lastName&&u("lastName",i.lastName),void 0!==i.phone&&u("phone",(0,n.UK)(i.phone)),void 0!==i.email&&u("email",i.email??null),void 0!==i.birthDate&&u("birthDate",i.birthDate?new Date(i.birthDate):null),void 0!==i.address&&u("address",i.address??null),void 0!==i.instagram&&u("instagram",i.instagram??null),void 0!==i.notes&&u("notes",i.notes??null),void 0!==i.status&&u("status",i.status),void 0!==i.marketingWhatsapp&&u("marketingWhatsapp",i.marketingWhatsapp),void 0!==i.marketingEmail&&u("marketingEmail",i.marketingEmail),void 0!==i.marketingSms&&u("marketingSms",i.marketingSms),0===r.length)return d(t,e);r.push('"updatedAt" = NOW()'),o.push(t,e);let l=await f.query(`UPDATE "Customer" SET ${r.join(", ")}
     WHERE id = $${c} AND "organizationId" = $${c+1} AND "deletedAt" IS NULL`,o);if(0===l.rowCount)return null;let m=await d(t,e);try{let{writeAuditLog:i}=await Promise.resolve().then(a.bind(a,2192));await i({organizationId:e,entityType:"Customer",entityId:t,action:"UPDATE",before:s?{firstName:s.firstName,lastName:s.lastName,phone:s.phone,status:s.status}:void 0,after:m?{firstName:m.firstName,lastName:m.lastName,phone:m.phone,status:m.status}:void 0})}catch{}return m}function A(t){return"object"==typeof t&&null!==t&&"code"in t&&"23505"===t.code}i()}catch(t){i(t)}})},8903:(t,e,a)=>{a.a(t,async(t,i)=>{try{a.d(e,{HW:()=>S,L4:()=>D,LM:()=>h,U0:()=>W,_2:()=>v,_5:()=>f,bs:()=>$,iu:()=>F,m5:()=>p,oE:()=>A,vN:()=>w,w0:()=>y});var s=a(84770),r=a(8678),n=a(41460),o=a(20673),c=a(40440),u=a(45630),d=a(69103),l=a(32096),m=a(1676),E=a(91829),N=a(95846),I=t([r,n,o,c,u,d,m]);[r,n,o,c,u,d,m]=I.then?(await I)():I;let M=new r.Pool({connectionString:process.env.DATABASE_URL});async function A(t){let{rows:e}=await M.query(`SELECT id, slug, name, address, city, phone, email
     FROM "Organization"
     WHERE slug = $1 AND status = 'ACTIVE'::"OrganizationStatus"
     LIMIT 1`,[t]);return e[0]??null}async function f(t,e){let a=await S(t),i=e.trim().toLowerCase();return i?a.find(t=>t.id.toLowerCase()===i)??a.find(t=>(0,N.DY)(t.name)===i)??null:null}async function p(t,e,a){if(!a){let{items:a}=await (0,d.Z6)(t,{page:1,limit:100,agenda:!0}),i=a.filter(t=>"ACTIVE"===t.status);return T(i,e)}let i=await w(t,a);return T(i.map(t=>({id:t.id,firstName:t.displayName.split(" ")[0]??t.displayName,lastName:t.displayName.split(" ").slice(1).join(" "),status:"ACTIVE",displayName:t.displayName,available:t.available})),e)}function T(t,e){let a=e.trim().toLowerCase();if(!a)return null;let i=t.find(t=>t.id.toLowerCase()===a)??t.find(t=>(0,N.DY)(t.firstName??"")===a)??t.find(t=>(0,N.DY)(t.displayName??`${t.firstName} ${t.lastName}`)===a);return i?{id:i.id,displayName:i.displayName??`${i.firstName??""} ${i.lastName??""}`.trim(),available:i.available??!0}:null}async function S(t){let{rows:e}=await M.query(`SELECT
       s.id,
       s.name,
       s.description,
       s.category,
       s.price::text,
       s."durationMin",
       s."prepTimeMin",
       s."cleanupTimeMin",
       s.deposit::text,
       COALESCE(
         NULLIF(TRIM(s."imageUrl"), ''),
         (
           SELECT scd."imageUrl"
           FROM "ServiceCatalogDefault" scd
           WHERE scd.name = s.name
             AND scd."imageUrl" IS NOT NULL
             AND scd."imageUrl" <> ''
           LIMIT 1
         )
       ) AS "imageUrl"
     FROM "Service" s
     WHERE s."organizationId" = $1 AND s.active = true
     ORDER BY s.name`,[t]);return e.map(t=>({id:t.id,name:t.name,description:t.description,category:t.category,price:parseFloat(t.price),durationMin:t.durationMin,prepTimeMin:t.prepTimeMin,cleanupTimeMin:t.cleanupTimeMin,totalBlockMin:t.prepTimeMin+t.durationMin+t.cleanupTimeMin,deposit:null!=t.deposit?parseFloat(t.deposit):null,imageUrl:t.imageUrl??null}))}async function O(t,e){let{items:a}=await (0,u.o3)(t,{page:1,limit:200,active:!0,agenda:!0});return a.find(t=>t.id===e)??null}async function C(t,e){let{items:a}=await (0,d.Z6)(t,{page:1,limit:100,serviceId:e,agenda:!0});return a.filter(t=>"ACTIVE"===t.status)}async function L(t,e){let{items:a}=await (0,c.XN)(t,{page:1,limit:50,serviceId:e,agenda:!0});return a}async function R(t,e,a){let{start:i,end:s}=function(t){let e=(0,E.Ct)(t,"00:00"),a=new Date((0,E.Ct)(t,"23:59").getTime()+59999);return{start:e,end:a}}(e),{rows:r}=await M.query(`SELECT
      a.id, a."organizationId", a."customerId",
      c."firstName" AS "customerFirstName", c."lastName" AS "customerLastName",
      a."serviceId", s.name AS "serviceName",
      a."staffId", st."firstName" AS "staffFirstName", st."lastName" AS "staffLastName",
      a."resourceId", r.name AS "resourceName",
      a."startAt", a."endAt", a.price::text, a.deposit::text,
      a."depositState"::text AS "depositState", a."depositDueAt",
      a.status, a.notes
     FROM "Appointment" a
     JOIN "Customer" c ON c.id = a."customerId"
     JOIN "Service" s ON s.id = a."serviceId"
     JOIN "Staff" st ON st.id = a."staffId"
     LEFT JOIN "Resource" r ON r.id = a."resourceId"
     WHERE a."organizationId" = $1
       AND a."startAt" >= $2 AND a."startAt" <= $3
       AND a.status NOT IN ('CANCELLED', 'NO_SHOW')
       AND ($4::text IS NULL OR a.id <> $4)`,[t,i,s,a??null]);return r.map(n.Fz)}function g(t,e){return t.resourceIds.length?t.resourceIds.filter(t=>e.some(e=>e.id===t)):[void 0]}async function w(t,e,a){if(!await O(t,e))return[];let i=await C(t,e),s=a?new Date(`${a}T12:00:00+01:00`):null;return i.map(t=>({id:t.id,displayName:t.displayName,available:s?(0,l.o)(t,s):"ACTIVE"===t.status}))}async function D(t,e){let i=new Date(`${e}T00:00:00+01:00`),s=new Date(`${e}T23:59:59+01:00`),{items:r}=await (0,d.Z6)(t,{page:1,limit:500,agenda:!0}),{getSalonClosedStatus:n}=await a.e(7936).then(a.bind(a,37936));return n(t,i,s,r)}async function $(t,e){let a=await O(t,e.serviceId);if(!a)throw Error("SERVICE_NOT_FOUND");let i=new Date(`${e.date}T12:00:00+01:00`);if((await D(t,e.date)).closed)return[];let s=await C(t,e.serviceId),r=await L(t,e.serviceId),n=await R(t,e.date,e.excludeAppointmentId),o=e.staffId?s.filter(t=>t.id===e.staffId):s;if(!o.length)return[];let c=new Map;for(let t of o)if((0,l.o)(t,i))for(let e of g(a,r)){let s=e?r.find(t=>t.id===e):void 0;for(let r of(0,l.Xs)(n,{date:i,staffId:t.id,resourceId:e,durationMinutes:a.totalBlockMin,staffContext:t,resourceContext:s}))r.available&&c.set(r.time,!0)}let u=new Set;for(let t of o)for(let e of(0,l.Xs)(n,{date:i,staffId:t.id,durationMinutes:a.totalBlockMin,staffContext:t}))u.add(e.time);return Array.from(u).sort((t,e)=>t.localeCompare(e)).map(t=>({time:t,available:c.get(t)??!1}))}async function h(t,e){let a=new Date(`${e.from}T00:00:00+01:00`),i=new Date(`${e.to}T23:59:59+01:00`),s=[],r=new Date(a);for(;r<=i;){let a=r.toISOString().slice(0,10);(await $(t,{serviceId:e.serviceId,date:a,staffId:e.staffId})).some(t=>t.available)&&s.push(a),r.setDate(r.getDate()+1)}return s}async function v(t,e){var a,i;let s=await O(t,e.serviceId);if(!s||!s.active)throw Error("SERVICE_NOT_FOUND");let r=(a=e.date,i=e.time,(0,E.Ct)(a,i)),n=new Date(r.getTime()+6e4*s.totalBlockMin);if(r.getTime()<Date.now()-6e4)throw Error("SLOT_PAST");if((await D(t,e.date)).closed)throw Error("SALON_CLOSED");let o=await C(t,e.serviceId),c=await L(t,e.serviceId),u=await R(t,e.date,e.excludeAppointmentId),d=e.staffId&&"any"!==e.staffId?e.staffId:null,m=function(t,e,a,i,s,r,n){for(let o of n?a.filter(t=>t.id===n).map(t=>t.id):a.map(t=>t.id)){let n=a.find(t=>t.id===o);if(n)for(let a of g(e,i)){let e=a?i.find(t=>t.id===a):void 0;if((0,l.gR)(t,{staffId:o,resourceId:a,startAt:s.toISOString(),endAt:r.toISOString()},n,e).available)return{staffId:o,resourceId:a}}}return null}(u,s,o,c,r,n,d);if(!m)throw Error("SLOT_UNAVAILABLE");return{service:s,staffId:m.staffId,resourceId:m.resourceId??null,startAt:r,endAt:n}}async function y(t,e,i,r){let u=await (0,m.o5)(e);if(!u.ok){if("LIMIT_REACHED"===u.code)throw Error("LIMIT_REACHED");if("FEATURE_NOT_INCLUDED"===u.code)throw Error("FEATURE_NOT_INCLUDED");throw Error("SUBSCRIPTION_INACTIVE")}let d=await v(e,i),l=d.service,E=d.startAt,N=d.endAt,I=`apt_${(0,s.randomBytes)(6).toString("hex")}`,A=function(){let t="ABCDEFGHJKLMNPQRSTUVWXYZ23456789",e=(0,s.randomBytes)(10),a="";for(let i=0;i<e.length;i++)a+=t[e[i]%t.length];return a}();d.resourceId&&await (0,c.Iu)({organizationId:e,resourceId:d.resourceId,serviceId:l.id,startAt:E,endAt:N});let f=r?.customerId,{customerId:p,created:T}=f?{customerId:f,created:!1}:await (0,o.XA)(e,{firstName:i.customer.firstName,lastName:i.customer.lastName,phone:i.customer.phone,email:i.customer.email,marketingOptIn:i.customer.marketingOptIn},t);if(f){let a=await t.query(`SELECT 1 FROM "Customer"
         WHERE id = $1 AND "organizationId" = $2 AND "deletedAt" IS NULL`,[f,e]);if(0===a.rowCount)throw Error("CUSTOMER_NOT_FOUND")}let{resolveDepositRequirement:S}=await a.e(4810).then(a.bind(a,54810)),O=await S({organizationId:e,customerId:p,serviceDeposit:l.deposit,price:l.price,client:t});await t.query(`INSERT INTO "Appointment" (
        id, "organizationId", "customerId", "serviceId", "staffId", "resourceId",
        "startAt", "endAt", price, deposit, "depositState", "depositDueAt",
        status, source, "attributionSource", notes, "bookingRef", "updatedAt"
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::"DepositState",$12,
        'PENDING','ONLINE_BOOKING'::"AppointmentSource",$13,$14,$15,NOW()
      )`,[I,e,p,l.id,d.staffId,d.resourceId,E,N,l.price,O.amount>0?O.amount:null,O.state,O.dueAt,i.attributionSource?.trim().slice(0,40)||null,i.notes??null,A]);let{rows:C}=await t.query(`SELECT
        a.id, a."organizationId", a."customerId",
        c."firstName" AS "customerFirstName", c."lastName" AS "customerLastName",
        a."serviceId", s.name AS "serviceName",
        a."staffId", st."firstName" AS "staffFirstName", st."lastName" AS "staffLastName",
        a."resourceId", r.name AS "resourceName",
        a."startAt", a."endAt", a.price::text, a.deposit::text,
        a."depositState"::text AS "depositState", a."depositDueAt",
        a.status, a.notes
       FROM "Appointment" a
       JOIN "Customer" c ON c.id = a."customerId"
       JOIN "Service" s ON s.id = a."serviceId"
       JOIN "Staff" st ON st.id = a."staffId"
       LEFT JOIN "Resource" r ON r.id = a."resourceId"
       WHERE a.id = $1`,[I]),L=(0,n.Fz)(C[0]);return{appointmentId:I,bookingRef:A,customerId:p,customerCreated:T,staffId:d.staffId,staffName:L.staffName,serviceName:l.name,startAt:L.startAt,endAt:L.endAt,price:l.price,deposit:O.amount>0?O.amount:null,depositState:O.state,depositAwaiting:"AWAITING"===O.state,durationMin:l.durationMin,source:"ONLINE_BOOKING"}}async function W(t,e,i){let{rows:s}=await M.query(`SELECT
      a.id, a."organizationId", a."customerId",
      c."firstName" AS "customerFirstName", c."lastName" AS "customerLastName",
      a."serviceId", s.name AS "serviceName",
      a."staffId", st."firstName" AS "staffFirstName", st."lastName" AS "staffLastName",
      a."resourceId", r.name AS "resourceName",
      a."startAt", a."endAt", a.price::text, a.deposit::text,
      a."depositState"::text AS "depositState", a."depositDueAt",
      a.status, a.notes
     FROM "Appointment" a
     JOIN "Customer" c ON c.id = a."customerId"
     JOIN "Service" s ON s.id = a."serviceId"
     JOIN "Staff" st ON st.id = a."staffId"
     LEFT JOIN "Resource" r ON r.id = a."resourceId"
     WHERE a.id = $1`,[e.appointmentId]);if(!s[0])return;let r=(0,n.Fz)(s[0]);try{let{notifyAppointmentCreated:e}=await a.e(5329).then(a.bind(a,45329));await e(t,r)}catch(t){console.error("[createPublicBooking] notification",t)}try{let{syncAppointmentToGoogle:e}=await a.e(702).then(a.bind(a,21226));e(t,r)}catch(t){console.error("[createPublicBooking] google calendar",t)}try{let{enqueueOnlineBookingConfirmation:i}=await a.e(7729).then(a.bind(a,17729));await i(t,e.appointmentId)}catch(t){console.error("[createPublicBooking] whatsapp",t)}if(i.attributionSource)try{let{recordPublicBookingEvent:s}=await a.e(2459).then(a.bind(a,22459));await s({organizationId:t,eventType:"BOOKED",source:i.attributionSource,serviceId:i.serviceId,staffId:e.staffId,appointmentId:e.appointmentId})}catch(t){console.error("[createPublicBooking] attribution event",t)}}async function F(t,e){let a=await A(t);if(!a)throw Error("ORG_NOT_FOUND");let i=await M.connect();try{await i.query("BEGIN");let t=await y(i,a.id,e);return await i.query("COMMIT"),await W(a.id,t,e),t}catch(t){if(await i.query("ROLLBACK"),(0,n.fQ)(t))throw Error("SLOT_CONFLICT");throw t}finally{i.release()}}i()}catch(t){i(t)}})},1676:(t,e,a)=>{a.a(t,async(t,i)=>{try{a.d(e,{D5:()=>l,iT:()=>u,o5:()=>m,qK:()=>d});var s=a(87070),r=a(33568),n=a(38183);a(2591);var o=t([r,n]);async function c(t,e){let a=await (0,r.Sz)(t);if(!a.ok)return a;let i="staff"===e?await (0,n.dk)(a.session.organizationId):"customers"===e?await (0,n.NR)(a.session.organizationId):"appointments"===e?await (0,n.HX)(a.session.organizationId):await (0,n.N7)(a.session.organizationId,"staff");return i.ok?a:{ok:!1,response:s.NextResponse.json({error:i.message,code:i.code,limit:i.limit,used:i.used,max:i.max,planCode:i.planCode,planName:i.planName},{status:403})}}async function u(t){return c(t,"staff")}async function d(t){return c(t,"customers")}async function l(t){return c(t,"appointments")}async function m(t){let e=await (0,n.N7)(t,"booking");return e.ok?(0,n.HX)(t):e}[r,n]=o.then?(await o)():o,i()}catch(t){i(t)}})},45269:(t,e,a)=>{a.d(e,{Fo:()=>i,P9:()=>s,TX:()=>n,co:()=>r});let i=3e3,s=8,r=90,n=30}};