"use strict";!function(){try{var t="undefined"!=typeof window?window:"undefined"!=typeof global?global:"undefined"!=typeof self?self:{},e=(new t.Error).stack;e&&(t._sentryDebugIds=t._sentryDebugIds||{},t._sentryDebugIds[e]="6960c091-4aac-4f93-b160-a8ccb487590f",t._sentryDebugIdIdentifier="sentry-dbid-6960c091-4aac-4f93-b160-a8ccb487590f")}catch(t){}}(),exports.id=2150,exports.ids=[2150],exports.modules={7590:(t,e,a)=>{a.d(e,{DY:()=>s,_b:()=>r,iT:()=>n});var i=a(67487);function s(t){return t.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"").slice(0,80)}function r(t){let e=((t.baseUrl??(0,i.bZ)())||i.Ey.appUrl).replace(/\/$/,""),a=new URL(`${e}/book/${encodeURIComponent(t.slug)}/`);return t.source?.trim()&&a.searchParams.set("source",t.source.trim().slice(0,40)),t.service?.trim()&&a.searchParams.set("service",t.service.trim().slice(0,80)),t.staff?.trim()&&a.searchParams.set("staff",t.staff.trim().slice(0,80)),a.toString()}function n(t){return t instanceof URLSearchParams?{service:t.get("service"),staff:t.get("staff"),source:t.get("source")}:{service:t.service??null,staff:t.staff??null,source:t.source??null}}},44162:(t,e,a)=>{a.a(t,async(t,i)=>{try{a.d(e,{$L:()=>u,$k:()=>l,XA:()=>I,l4:()=>m,uG:()=>f,wK:()=>E,zp:()=>A});var s=a(8678),r=a(90831),n=a(11107),o=a(31244),c=t([s]);s=(c.then?(await c)():c)[0];let p=(0,r.S)(new s.Pool({connectionString:process.env.DATABASE_URL}));function d(t){let e=parseInt(t.visits,10)||0,a=parseInt(t.noShowCount,10)||0,i=parseFloat(t.revenue)||0,s=e>0?Math.round(i/e*100)/100:0;return{id:t.id,firstName:t.firstName,lastName:t.lastName,phone:t.phone,email:t.email,status:t.status,visits:e,noShowCount:a,revenue:i,averageTicket:s,lastVisitAt:t.lastVisitAt?.toISOString()??null,createdAt:t.createdAt.toISOString(),segment:function(t){if("INACTIVE"===t.status||"ARCHIVED"===t.status)return"INACTIVE";if("AT_RISK"===t.status)return"AT_RISK";if("NEW"===t.status)return"NEW";let e=(Date.now()-t.createdAt.getTime())/864e5;if(e<=n.TX&&t.visits<=1)return"NEW";if(t.revenue>=n.Fo||t.visits>=n.P9)return"VIP";if(t.lastVisitAt){if((Date.now()-t.lastVisitAt.getTime())/864e5>n.co)return"AT_RISK"}else if(e>n.co)return"AT_RISK";return"ACTIVE"}({status:t.status,visits:e,revenue:i,createdAt:t.createdAt,lastVisitAt:t.lastVisitAt})}}async function u(t,e){let{page:a,limit:i,search:s,status:r,segment:o="ALL"}=e,c=['c."organizationId" = $1','c."deletedAt" IS NULL'],u=[t],l=2;s&&(c.push(`(c."firstName" ILIKE $${l} OR c."lastName" ILIKE $${l} OR c.phone ILIKE $${l} OR COALESCE(c.email, '') ILIKE $${l})`),u.push(`%${s}%`),l++),r&&(c.push(`c.status = $${l}`),u.push(r),l++);let m=c.join(" AND "),E="ALL"!==o?function(t,e){switch(t){case"VIP":return`HAVING (
        COALESCE(SUM(a.price) FILTER (WHERE a.status = 'COMPLETED'), 0) >= ${n.Fo}
        OR COUNT(a.id) FILTER (WHERE a.status = 'COMPLETED') >= ${n.P9}
      )`;case"NEW":return`HAVING (
        c.status = 'NEW'
        OR (c."createdAt" >= NOW() - INTERVAL '${n.TX} days'
            AND COUNT(a.id) FILTER (WHERE a.status = 'COMPLETED') <= 1)
      )`;case"INACTIVE":return"HAVING c.status IN ('INACTIVE', 'ARCHIVED')";case"AT_RISK":return`HAVING (
        c.status = 'AT_RISK'
        OR (
          MAX(a."startAt") FILTER (WHERE a.status = 'COMPLETED') IS NOT NULL
          AND MAX(a."startAt") FILTER (WHERE a.status = 'COMPLETED') < NOW() - INTERVAL '${n.co} days'
        )
        OR (
          MAX(a."startAt") FILTER (WHERE a.status = 'COMPLETED') IS NULL
          AND c."createdAt" < NOW() - INTERVAL '${n.co} days'
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
  `,f=`
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
          WHEN c.status = 'NEW' OR (c."createdAt" >= NOW() - INTERVAL '${n.TX} days'
            AND COALESCE(v.visits, 0) <= 1) THEN 'NEW'
          WHEN COALESCE(v.revenue, 0) >= ${n.Fo} OR COALESCE(v.visits, 0) >= ${n.P9} THEN 'VIP'
          WHEN v."lastVisitAt" IS NOT NULL AND v."lastVisitAt" < NOW() - INTERVAL '${n.co} days' THEN 'AT_RISK'
          WHEN v."lastVisitAt" IS NULL AND c."createdAt" < NOW() - INTERVAL '${n.co} days'
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
  `,[A,S,T]=await Promise.all([p.query(N,u),p.query(I,[...u,i,(a-1)*i]),p.query(f,[t])]);return{items:S.rows.map(d),total:A.rows[0]?.total??0,kpis:T.rows[0]??{total:0,newCount:0,vipCount:0,inactiveCount:0,activeCount:0,atRiskCount:0}}}async function l(t,e){var i;let{rows:s}=await p.query(`SELECT
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
    GROUP BY c.id`,[e,t]),r=s[0]?(i=s[0],{...d(i),birthDate:i.birthDate?.toISOString()??null,address:i.address,instagram:i.instagram,notes:i.notes,marketingWhatsapp:i.marketingWhatsapp,marketingEmail:i.marketingEmail,marketingSms:i.marketingSms,updatedAt:i.updatedAt.toISOString()}):null;if(!r)return null;try{let{countCustomerNoShows:i,getOrCreateBookingPolicy:s,noShowRiskLevel:n}=await a.e(819).then(a.bind(a,50819)),o=await i(e,t),c=await s(e);r.noShowCount=o,r.noShowRisk=n(o,c)}catch{r.noShowCount=0,r.noShowRisk="NONE"}return r}async function m(t,e){let{rows:a}=await p.query(`SELECT a.id, a."startAt", COALESCE(s.name, 'Prestation') AS "serviceName", a.price::text, a.status,
            st."firstName" AS "staffFirstName"
     FROM "Appointment" a
     LEFT JOIN "Service" s ON s.id = a."serviceId"
     JOIN "Customer" c ON c.id = a."customerId"
     LEFT JOIN "Staff" st ON st.id = a."staffId"
     WHERE a."customerId" = $1 AND c."organizationId" = $2
     ORDER BY a."startAt" DESC
     LIMIT 50`,[t,e]);return a.map(t=>({id:t.id,startAt:t.startAt.toISOString(),serviceName:t.serviceName,price:parseFloat(t.price),status:t.status,staffFirstName:t.staffFirstName}))}async function E(t,e){let i=(0,o.UK)(e.phone),s=`cust-${Date.now()}`;await p.query(`INSERT INTO "Customer" (
      id, "organizationId", "firstName", "lastName", phone, email,
      "birthDate", address, instagram, notes, status,
      "marketingWhatsapp", "marketingEmail", "marketingSms", "updatedAt"
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'NEW',$11,$12,$13,NOW())`,[s,t,e.firstName,e.lastName,i,e.email??null,e.birthDate?new Date(e.birthDate):null,e.address??null,e.instagram??null,e.notes??null,e.marketingWhatsapp??!1,e.marketingEmail??!1,e.marketingSms??!1]);let r=await l(s,t);if(!r)throw Error("Cliente cr\xe9\xe9e introuvable.");try{let{writeAuditLog:e}=await Promise.resolve().then(a.bind(a,66085));await e({organizationId:t,entityType:"Customer",entityId:s,action:"CREATE",after:{firstName:r.firstName,lastName:r.lastName,phone:r.phone}})}catch{}return r}async function N(t,e,a){let i=(0,o.UK)(e),{rows:s}=await (a??p).query(`SELECT id, "marketingWhatsapp", "marketingEmail"
     FROM "Customer"
     WHERE "organizationId" = $1 AND phone = $2 AND "deletedAt" IS NULL
     LIMIT 1`,[t,i]);return s[0]??null}async function I(t,e,a){let i=a??p,s=(0,o.UK)(e.phone),r=await N(t,s,i);if(r){let t=e.marketingOptIn||r.marketingWhatsapp,a=e.marketingOptIn||r.marketingEmail;return await i.query(`UPDATE "Customer"
       SET "firstName" = $1, "lastName" = $2,
           email = COALESCE($3, email),
           "marketingWhatsapp" = $4, "marketingEmail" = $5, "updatedAt" = NOW()
       WHERE id = $6`,[e.firstName.trim(),e.lastName.trim(),e.email?.trim()||null,t,a,r.id]),{customerId:r.id,created:!1}}let n=`cust-${Date.now()}-${Math.random().toString(36).slice(2,7)}`,c=e.marketingOptIn??!1;return await i.query(`INSERT INTO "Customer" (
      id, "organizationId", "firstName", "lastName", phone, email, status,
      "marketingWhatsapp", "marketingEmail", "marketingSms", "updatedAt"
    ) VALUES ($1,$2,$3,$4,$5,$6,'NEW',$7,$8,false,NOW())`,[n,t,e.firstName.trim(),e.lastName.trim(),s,e.email?.trim()||null,c,c]),{customerId:n,created:!0}}async function f(t,e,i){let s=await l(t,e);if(!s&&!i.archived)return null;if(i.archived){await p.query(`UPDATE "Customer"
       SET status = 'ARCHIVED', "deletedAt" = NOW(), "updatedAt" = NOW()
       WHERE id = $1 AND "organizationId" = $2 AND "deletedAt" IS NULL`,[t,e]);try{let{writeAuditLog:i}=await Promise.resolve().then(a.bind(a,66085));await i({organizationId:e,entityType:"Customer",entityId:t,action:"ARCHIVE",before:s?{status:s.status}:void 0,after:{status:"ARCHIVED"}})}catch{}return l(t,e)}let r=[],n=[],c=1,d=(t,e)=>{r.push(`"${t}" = $${c++}`),n.push(e)};if(void 0!==i.firstName&&d("firstName",i.firstName),void 0!==i.lastName&&d("lastName",i.lastName),void 0!==i.phone&&d("phone",(0,o.UK)(i.phone)),void 0!==i.email&&d("email",i.email??null),void 0!==i.birthDate&&d("birthDate",i.birthDate?new Date(i.birthDate):null),void 0!==i.address&&d("address",i.address??null),void 0!==i.instagram&&d("instagram",i.instagram??null),void 0!==i.notes&&d("notes",i.notes??null),void 0!==i.status&&d("status",i.status),void 0!==i.marketingWhatsapp&&d("marketingWhatsapp",i.marketingWhatsapp),void 0!==i.marketingEmail&&d("marketingEmail",i.marketingEmail),void 0!==i.marketingSms&&d("marketingSms",i.marketingSms),0===r.length)return l(t,e);r.push('"updatedAt" = NOW()'),n.push(t,e);let u=await p.query(`UPDATE "Customer" SET ${r.join(", ")}
     WHERE id = $${c} AND "organizationId" = $${c+1} AND "deletedAt" IS NULL`,n);if(0===u.rowCount)return null;let m=await l(t,e);try{let{writeAuditLog:i}=await Promise.resolve().then(a.bind(a,66085));await i({organizationId:e,entityType:"Customer",entityId:t,action:"UPDATE",before:s?{firstName:s.firstName,lastName:s.lastName,phone:s.phone,status:s.status}:void 0,after:m?{firstName:m.firstName,lastName:m.lastName,phone:m.phone,status:m.status}:void 0})}catch{}return m}function A(t){return"object"==typeof t&&null!==t&&"code"in t&&"23505"===t.code}i()}catch(t){i(t)}})},12150:(t,e,a)=>{a.a(t,async(t,i)=>{try{a.d(e,{HW:()=>C,L4:()=>v,LM:()=>y,U0:()=>M,_2:()=>W,_5:()=>S,bs:()=>$,iu:()=>U,m5:()=>T,oE:()=>p,vN:()=>h,w0:()=>F});var s=a(84770),r=a(8678),n=a(90831),o=a(50318),c=a(44162),d=a(2551),u=a(34642),l=a(22182),m=a(7750),E=a(36843),N=a(80437),I=a(7590),f=t([r,o,c,d,u,l,E]);[r,o,c,d,u,l,E]=f.then?(await f)():f;let H=(0,n.S)(new r.Pool({connectionString:process.env.DATABASE_URL}));function A(t){let e=(0,N.Ct)(t,"00:00"),a=new Date((0,N.Ct)(t,"23:59").getTime()+59999);return{start:e,end:a}}async function p(t){let{rows:e}=await H.query(`SELECT id, slug, name, address, city, phone, email
     FROM "Organization"
     WHERE slug = $1 AND status = 'ACTIVE'::"OrganizationStatus"
     LIMIT 1`,[t]);return e[0]??null}async function S(t,e){let a=await C(t),i=e.trim().toLowerCase();return i?a.find(t=>t.id.toLowerCase()===i)??a.find(t=>(0,I.DY)(t.name)===i)??null:null}async function T(t,e,a){if(!a){let{items:a}=await (0,l.Z6)(t,{page:1,limit:100,agenda:!0}),i=a.filter(t=>"ACTIVE"===t.status);return O(i,e)}let i=await h(t,a);return O(i.map(t=>({id:t.id,firstName:t.displayName.split(" ")[0]??t.displayName,lastName:t.displayName.split(" ").slice(1).join(" "),status:"ACTIVE",displayName:t.displayName,available:t.available})),e)}function O(t,e){let a=e.trim().toLowerCase();if(!a)return null;let i=t.find(t=>t.id.toLowerCase()===a)??t.find(t=>(0,I.DY)(t.firstName??"")===a)??t.find(t=>(0,I.DY)(t.displayName??`${t.firstName} ${t.lastName}`)===a);return i?{id:i.id,displayName:i.displayName??`${i.firstName??""} ${i.lastName??""}`.trim(),available:i.available??!0}:null}async function C(t){let{rows:e}=await H.query(`SELECT
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
     ORDER BY s.name`,[t]);return e.map(t=>({id:t.id,name:t.name,description:t.description,category:t.category,price:parseFloat(t.price),durationMin:t.durationMin,prepTimeMin:t.prepTimeMin,cleanupTimeMin:t.cleanupTimeMin,totalBlockMin:t.prepTimeMin+t.durationMin+t.cleanupTimeMin,deposit:null!=t.deposit?parseFloat(t.deposit):null,imageUrl:t.imageUrl??null}))}async function L(t,e){let{items:a}=await (0,u.o3)(t,{page:1,limit:200,active:!0,agenda:!0});return a.find(t=>t.id===e)??null}async function g(t,e){let{items:a}=await (0,l.Z6)(t,{page:1,limit:100,serviceId:e,agenda:!0});return a.filter(t=>"ACTIVE"===t.status)}async function R(t,e){let{items:a}=await (0,d.XN)(t,{page:1,limit:50,serviceId:e,agenda:!0});return a}async function w(t,e,a){let{start:i,end:s}=A(e),{rows:r}=await H.query(`SELECT
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
       AND ($4::text IS NULL OR a.id <> $4)`,[t,i,s,a??null]);return r.map(o.Fz)}function D(t,e){return t.resourceIds.length?t.resourceIds.filter(t=>e.some(e=>e.id===t)):[void 0]}async function h(t,e,a){if(!await L(t,e))return[];let i=await g(t,e),s=a?(0,N.Ct)(a,"12:00"):null;return i.map(t=>({id:t.id,displayName:t.displayName,available:s?(0,m.o)(t,s):"ACTIVE"===t.status}))}async function v(t,e){let{start:i,end:s}=A(e),{items:r}=await (0,l.Z6)(t,{page:1,limit:500,agenda:!0}),{getSalonClosedStatus:n}=await a.e(9789).then(a.bind(a,79789));return n(t,i,s,r)}async function $(t,e){let a=await L(t,e.serviceId);if(!a)throw Error("SERVICE_NOT_FOUND");let i=(0,N.Ct)(e.date,"12:00");if((await v(t,e.date)).closed)return[];let s=await g(t,e.serviceId),r=await R(t,e.serviceId),n=await w(t,e.date,e.excludeAppointmentId),o=e.staffId?s.filter(t=>t.id===e.staffId):s;if(!o.length)return[];let c=new Map;for(let t of o)if((0,m.o)(t,i))for(let e of D(a,r)){let s=e?r.find(t=>t.id===e):void 0;for(let r of(0,m.Xs)(n,{date:i,staffId:t.id,resourceId:e,durationMinutes:a.totalBlockMin,staffContext:t,resourceContext:s}))r.available&&c.set(r.time,!0)}let d=new Set;for(let t of o)for(let e of(0,m.Xs)(n,{date:i,staffId:t.id,durationMinutes:a.totalBlockMin,staffContext:t}))d.add(e.time);return Array.from(d).sort((t,e)=>t.localeCompare(e)).map(t=>({time:t,available:c.get(t)??!1}))}async function y(t,e){let a=[],i=e.from;for(;i<=e.to;)(await $(t,{serviceId:e.serviceId,date:i,staffId:e.staffId})).some(t=>t.available)&&a.push(i),i=function(t){let[e,a,i]=t.split("-").map(Number),s=new Date(Date.UTC(e,a-1,i+1)),r=String(s.getUTCMonth()+1).padStart(2,"0"),n=String(s.getUTCDate()).padStart(2,"0");return`${s.getUTCFullYear()}-${r}-${n}`}(i);return a}async function W(t,e){var a,i;let s=await L(t,e.serviceId);if(!s||!s.active)throw Error("SERVICE_NOT_FOUND");let r=(a=e.date,i=e.time,(0,N.Ct)(a,i)),n=new Date(r.getTime()+6e4*s.totalBlockMin);if(r.getTime()<Date.now()-6e4)throw Error("SLOT_PAST");if((await v(t,e.date)).closed)throw Error("SALON_CLOSED");let o=await g(t,e.serviceId),c=await R(t,e.serviceId),d=await w(t,e.date,e.excludeAppointmentId),u=e.staffId&&"any"!==e.staffId?e.staffId:null,l=function(t,e,a,i,s,r,n){for(let o of n?a.filter(t=>t.id===n).map(t=>t.id):a.map(t=>t.id)){let n=a.find(t=>t.id===o);if(n)for(let a of D(e,i)){let e=a?i.find(t=>t.id===a):void 0;if((0,m.gR)(t,{staffId:o,resourceId:a,startAt:s.toISOString(),endAt:r.toISOString()},n,e).available)return{staffId:o,resourceId:a}}}return null}(d,s,o,c,r,n,u);if(!l)throw Error("SLOT_UNAVAILABLE");return{service:s,staffId:l.staffId,resourceId:l.resourceId??null,startAt:r,endAt:n}}async function F(t,e,i,r){let n=await (0,E.o5)(e);if(!n.ok){if("LIMIT_REACHED"===n.code)throw Error("LIMIT_REACHED");if("FEATURE_NOT_INCLUDED"===n.code)throw Error("FEATURE_NOT_INCLUDED");throw Error("SUBSCRIPTION_INACTIVE")}let u=await W(e,i),l=u.service,m=u.startAt,N=u.endAt,I=`apt_${(0,s.randomBytes)(6).toString("hex")}`,f=function(){let t="ABCDEFGHJKLMNPQRSTUVWXYZ23456789",e=(0,s.randomBytes)(10),a="";for(let i=0;i<e.length;i++)a+=t[e[i]%t.length];return a}();u.resourceId&&await (0,d.Iu)({organizationId:e,resourceId:u.resourceId,serviceId:l.id,startAt:m,endAt:N});let A=r?.customerId,{customerId:p,created:S}=A?{customerId:A,created:!1}:await (0,c.XA)(e,{firstName:i.customer.firstName,lastName:i.customer.lastName,phone:i.customer.phone,email:i.customer.email,marketingOptIn:i.customer.marketingOptIn},t);if(A){let a=await t.query(`SELECT 1 FROM "Customer"
         WHERE id = $1 AND "organizationId" = $2 AND "deletedAt" IS NULL`,[A,e]);if(0===a.rowCount)throw Error("CUSTOMER_NOT_FOUND")}let{resolveDepositRequirement:T}=await a.e(819).then(a.bind(a,50819)),O=await T({organizationId:e,customerId:p,serviceDeposit:l.deposit,price:l.price,client:t});await t.query(`INSERT INTO "Appointment" (
        id, "organizationId", "customerId", "serviceId", "staffId", "resourceId",
        "startAt", "endAt", price, deposit, "depositState", "depositDueAt",
        status, source, "attributionSource", notes, "bookingRef", "updatedAt"
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::"DepositState",$12,
        'PENDING','ONLINE_BOOKING'::"AppointmentSource",$13,$14,$15,NOW()
      )`,[I,e,p,l.id,u.staffId,u.resourceId,m,N,l.price,O.amount>0?O.amount:null,O.state,O.dueAt,i.attributionSource?.trim().slice(0,40)||null,i.notes??null,f]);let{rows:C}=await t.query(`SELECT
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
       WHERE a.id = $1`,[I]),L=(0,o.Fz)(C[0]);return{appointmentId:I,bookingRef:f,customerId:p,customerCreated:S,staffId:u.staffId,staffName:L.staffName,serviceName:l.name,startAt:L.startAt,endAt:L.endAt,price:l.price,deposit:O.amount>0?O.amount:null,depositState:O.state,depositAwaiting:"AWAITING"===O.state,durationMin:l.durationMin,source:"ONLINE_BOOKING"}}async function M(t,e,i){let{rows:s}=await H.query(`SELECT
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
     WHERE a.id = $1`,[e.appointmentId]);if(!s[0])return;let r=(0,o.Fz)(s[0]);try{let{notifyAppointmentCreated:e}=await a.e(8702).then(a.bind(a,98702));await e(t,r)}catch(t){console.error("[createPublicBooking] notification",t)}try{let{syncAppointmentToGoogle:e}=await a.e(8092).then(a.bind(a,53538));e(t,r)}catch(t){console.error("[createPublicBooking] google calendar",t)}try{let{enqueueOnlineBookingConfirmation:i}=await a.e(4239).then(a.bind(a,34239));await i(t,e.appointmentId)}catch(t){console.error("[createPublicBooking] whatsapp",t)}if(i.attributionSource)try{let{recordPublicBookingEvent:s}=await a.e(1699).then(a.bind(a,11699));await s({organizationId:t,eventType:"BOOKED",source:i.attributionSource,serviceId:i.serviceId,staffId:e.staffId,appointmentId:e.appointmentId})}catch(t){console.error("[createPublicBooking] attribution event",t)}}async function U(t,e){let a=await p(t);if(!a)throw Error("ORG_NOT_FOUND");let i=await H.connect();try{await i.query("BEGIN");let t=await F(i,a.id,e);return await i.query("COMMIT"),await M(a.id,t,e),t}catch(t){if(await i.query("ROLLBACK"),(0,o.fQ)(t))throw Error("SLOT_CONFLICT");throw t}finally{i.release()}}i()}catch(t){i(t)}})},36843:(t,e,a)=>{a.a(t,async(t,i)=>{try{a.d(e,{D5:()=>l,iT:()=>d,o5:()=>m,qK:()=>u});var s=a(46485),r=a(40444),n=a(15960);a(16579);var o=t([r,n]);async function c(t,e){let a=await (0,r.Sz)(t);if(!a.ok)return a;let i="staff"===e?await (0,n.dk)(a.session.organizationId):"customers"===e?await (0,n.NR)(a.session.organizationId):"appointments"===e?await (0,n.HX)(a.session.organizationId):await (0,n.N7)(a.session.organizationId,"staff");return i.ok?a:{ok:!1,response:s.NextResponse.json({error:i.message,code:i.code,limit:i.limit,used:i.used,max:i.max,planCode:i.planCode,planName:i.planName},{status:403})}}async function d(t){return c(t,"staff")}async function u(t){return c(t,"customers")}async function l(t){return c(t,"appointments")}async function m(t){let e=await (0,n.N7)(t,"booking");return e.ok?(0,n.HX)(t):e}[r,n]=o.then?(await o)():o,i()}catch(t){i(t)}})},11107:(t,e,a)=>{a.d(e,{Fo:()=>i,P9:()=>s,TX:()=>n,co:()=>r});let i=3e3,s=8,r=90,n=30}};