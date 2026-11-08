"use strict";(()=>{var e={};e.id=7995,e.ids=[7995],e.modules={72934:e=>{e.exports=require("next/dist/client/components/action-async-storage.external.js")},54580:e=>{e.exports=require("next/dist/client/components/request-async-storage.external.js")},45869:e=>{e.exports=require("next/dist/client/components/static-generation-async-storage.external.js")},20399:e=>{e.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},30517:e=>{e.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},48927:e=>{e.exports=require("web-push")},84770:e=>{e.exports=require("crypto")},92048:e=>{e.exports=require("fs")},71568:e=>{e.exports=require("zlib")},8678:e=>{e.exports=import("pg")},6005:e=>{e.exports=require("node:crypto")},42725:e=>{e.exports=require("node:http2")},57157:(e,t,r)=>{r.a(e,async(e,a)=>{try{r.r(t),r.d(t,{originalPathname:()=>l,patchFetch:()=>u,requestAsyncStorage:()=>E,routeModule:()=>d,serverHooks:()=>N,staticGenerationAsyncStorage:()=>p});var s=r(49303),i=r(88716),n=r(60670),o=r(95787),c=e([o]);o=(c.then?(await c)():c)[0];let d=new s.AppRouteRouteModule({definition:{kind:i.x.APP_ROUTE,page:"/api/resources/[id]/availability/route",pathname:"/api/resources/[id]/availability",filename:"route",bundlePath:"app/api/resources/[id]/availability/route"},resolvedPagePath:"C:\\Users\\LordOfTHeRings\\Desktop\\rappel beauty\\src\\app\\api\\resources\\[id]\\availability\\route.ts",nextConfigOutput:"",userland:o}),{requestAsyncStorage:E,staticGenerationAsyncStorage:p,serverHooks:N}=d,l="/api/resources/[id]/availability/route";function u(){return(0,n.patchFetch)({serverHooks:N,staticGenerationAsyncStorage:p})}a()}catch(e){a(e)}})},49303:(e,t,r)=>{e.exports=r(30517)},95787:(e,t,r)=>{r.a(e,async(e,a)=>{try{r.r(t),r.d(t,{GET:()=>c});var s=r(87070),i=r(33568),n=r(40440),o=e([i,n]);async function c(e,t){let r=await (0,i.lr)(e,"resources");if(!r.ok)return r.response;try{let{id:a}=await t.params,i=new URL(e.url).searchParams.get("date")??new Date().toISOString().slice(0,10),o=await (0,n.B9)(r.session.organizationId,a,i);if(!o)return s.NextResponse.json({error:"Ressource introuvable."},{status:404});return s.NextResponse.json(o)}catch(e){if(e instanceof Error&&"INVALID_DATE"===e.message)return s.NextResponse.json({error:"Date invalide."},{status:400});return console.error("[GET /api/resources/:id/availability]",e),s.NextResponse.json({error:"Impossible de charger la disponibilit\xe9."},{status:500})}}[i,n]=o.then?(await o)():o,a()}catch(e){a(e)}})},40440:(e,t,r)=>{r.a(e,async(e,a)=>{try{r.d(t,{B9:()=>O,Iu:()=>m,MB:()=>N,SN:()=>l,XN:()=>p,fg:()=>I,id:()=>A,lR:()=>S,oY:()=>R});var s=r(84770),i=r(79549),n=r(87084),o=e([i]);function c(e){return`${e}_${(0,s.randomBytes)(8).toString("hex")}`}i=(o.then?(await o)():o)[0];let $=`
  (
    SELECT rcd."imageUrl"
    FROM "ResourceCatalogDefault" rcd
    WHERE rcd.type = r.type
      AND rcd."imageUrl" IS NOT NULL
      AND rcd."imageUrl" <> ''
    LIMIT 1
  ) AS "imageUrl"
`;function u(e){return{id:e.id,name:e.name,type:e.type,capacity:e.capacity,location:e.location,notes:e.notes,active:e.active,imageUrl:e.imageUrl??null,serviceCount:parseInt(e.serviceCount,10)||0,serviceNames:e.serviceNames??[],upcomingMaintenance:!!e.upcomingMaintenance,appointmentCount:parseInt(e.appointmentCount,10)||0}}async function d(e){let{rows:t}=await i.pool.query(`SELECT id, "startAt", "endAt", type::text, reason, status::text, "createdAt"
     FROM "ResourceMaintenance"
     WHERE "resourceId" = $1
     ORDER BY "startAt" DESC`,[e]);return t.map(e=>({id:e.id,startAt:e.startAt.toISOString(),endAt:e.endAt.toISOString(),type:e.type,reason:e.reason,status:e.status,createdAt:e.createdAt.toISOString()}))}async function E(e,t,r){for(let a of(await i.pool.query('DELETE FROM "ServiceResource" WHERE "resourceId" = $1',[e]),t))await i.pool.query(`INSERT INTO "ServiceResource" ("serviceId", "resourceId", quantity)
       SELECT s.id, $2, 1 FROM "Service" s
       WHERE s.id = $1 AND s."organizationId" = $3
       ON CONFLICT DO NOTHING`,[a,e,r])}async function p(e,t){let{page:r,limit:a,search:s,type:o,active:c,serviceId:E,agenda:p}=t,N=['r."organizationId" = $1','r."deletedAt" IS NULL'],l=[e],A=2;s&&(N.push(`(r.name ILIKE $${A} OR COALESCE(r.location, '') ILIKE $${A} OR COALESCE(r.notes, '') ILIKE $${A})`),l.push(`%${s}%`),A++),o&&(N.push(`r.type = $${A}::"ResourceType"`),l.push(o),A++),null!=c&&(N.push(`r.active = $${A}`),l.push(c),A++),E&&(N.push(`EXISTS (SELECT 1 FROM "ServiceResource" sr WHERE sr."resourceId" = r.id AND sr."serviceId" = $${A})`),l.push(E),A++);let I=N.join(" AND ");if(p){let{rows:e}=await i.pool.query(`SELECT r.id, r.name, r.type, r.active
       FROM "Resource" r
       WHERE ${I} AND r.active = true
       ORDER BY r.name`,l),t=[];for(let r of e){let e=await d(r.id);t.push({id:r.id,name:r.name,type:r.type,active:r.active,maintenances:e.filter(e=>(0,n.VK)(e.status))})}return{items:t,total:t.length}}let S=`SELECT COUNT(*)::int AS total FROM "Resource" r WHERE ${I}`,R=`
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
  `,[O,m]=await Promise.all([i.pool.query(S,l),i.pool.query(R,[...l,a,(r-1)*a])]);return{items:m.rows.map(u),total:O.rows[0]?.total??0}}async function N(e,t){let{rows:r}=await i.pool.query(`SELECT
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
    GROUP BY r.id`,[t,e]);if(!r[0])return null;let[a,s,n]=await Promise.all([d(t),i.pool.query(`SELECT s.id AS "serviceId", s.name AS "serviceName", s.category, sr.quantity, s.active
       FROM "ServiceResource" sr
       JOIN "Service" s ON s.id = sr."serviceId"
       WHERE sr."resourceId" = $1
       ORDER BY s.name`,[t]),i.pool.query(`SELECT a.id, a."startAt", a."endAt", a.status::text,
              s.name AS "serviceName",
              st."firstName" AS "staffFirst", st."lastName" AS "staffLast",
              c."firstName" AS "customerFirst", c."lastName" AS "customerLast"
       FROM "Appointment" a
       JOIN "Service" s ON s.id = a."serviceId"
       JOIN "Staff" st ON st.id = a."staffId"
       JOIN "Customer" c ON c.id = a."customerId"
       WHERE a."resourceId" = $1 AND a.status <> 'CANCELLED'
       ORDER BY a."startAt" DESC
       LIMIT 40`,[t])]);return{...u(r[0]),services:s.rows,maintenances:a,reservations:n.rows.map(e=>({id:e.id,startAt:e.startAt.toISOString(),endAt:e.endAt.toISOString(),status:e.status,serviceName:e.serviceName,staffName:`${e.staffFirst} ${e.staffLast}`.trim(),customerName:`${e.customerFirst} ${e.customerLast}`.trim()})),createdAt:r[0].createdAt.toISOString(),updatedAt:r[0].updatedAt.toISOString()}}async function l(e,t){let r=c("res");await i.pool.query(`INSERT INTO "Resource" (
      id, "organizationId", name, type, capacity, location, notes, active, "updatedAt"
    ) VALUES ($1,$2,$3,$4::"ResourceType",$5,$6,$7,$8,NOW())`,[r,e,t.name,t.type??"CABINE",t.capacity??1,t.location??null,t.notes??null,!1!==t.active]),t.serviceIds?.length&&await E(r,t.serviceIds,e);let a=await N(e,r);if(!a)throw Error("Ressource introuvable apr\xe8s cr\xe9ation.");return a}async function A(e,t,r){let a=[],s=[],n=1,o=(e,t,r)=>{a.push(r?`"${e}" = $${n}${r}`:`"${e}" = $${n}`),s.push(t),n++};void 0!==r.name&&o("name",r.name),void 0!==r.type&&o("type",r.type,'::"ResourceType"'),void 0!==r.capacity&&o("capacity",r.capacity),void 0!==r.location&&o("location",r.location??null),void 0!==r.notes&&o("notes",r.notes??null),void 0!==r.active&&o("active",r.active),a.length>0&&(a.push('"updatedAt" = NOW()'),s.push(t,e),await i.pool.query(`UPDATE "Resource" SET ${a.join(", ")}
       WHERE id = $${n} AND "organizationId" = $${n+1} AND "deletedAt" IS NULL`,s)),void 0!==r.serviceIds&&await E(t,r.serviceIds,e);let c=await N(e,t);if(!c)throw Error("NOT_FOUND");return c}async function I(e,t){let r=await N(e,t);if(!r)throw Error("NOT_FOUND");let{rowCount:a}=await i.pool.query(`UPDATE "Resource"
     SET "deletedAt" = NOW(), active = false, "updatedAt" = NOW()
     WHERE id = $1 AND "organizationId" = $2 AND "deletedAt" IS NULL`,[t,e]);if(!a)throw Error("NOT_FOUND");return{name:r.name}}async function S(e,t,r){if(!(await i.pool.query('SELECT id FROM "Resource" WHERE id = $1 AND "organizationId" = $2 AND "deletedAt" IS NULL',[t,e])).rows[0])throw Error("NOT_FOUND");let a=c("mnt");await i.pool.query(`INSERT INTO "ResourceMaintenance" (id, "resourceId", "startAt", "endAt", type, reason, status, "updatedAt")
     VALUES ($1,$2,$3,$4,$5::"MaintenanceType",$6,$7::"MaintenanceStatus",NOW())`,[a,t,new Date(r.startAt),new Date(r.endAt),r.type??"PREVENTIVE",r.reason??null,r.status??"SCHEDULED"]);let s=(await d(t)).find(e=>e.id===a);if(!s)throw Error("Maintenance introuvable.");return s}async function R(e,t,r,a){let s=[],n=[],o=1;if(void 0!==a.startAt&&(s.push(`"startAt" = $${o}`),n.push(new Date(a.startAt)),o++),void 0!==a.endAt&&(s.push(`"endAt" = $${o}`),n.push(new Date(a.endAt)),o++),void 0!==a.type&&(s.push(`type = $${o}::"MaintenanceType"`),n.push(a.type),o++),void 0!==a.reason&&(s.push(`reason = $${o}`),n.push(a.reason??null),o++),void 0!==a.status&&(s.push(`status = $${o}::"MaintenanceStatus"`),n.push(a.status),o++),0===s.length){let e=(await d(t)).find(e=>e.id===r);if(!e)throw Error("NOT_FOUND");return e}s.push('"updatedAt" = NOW()'),n.push(r,t,e);let{rowCount:c}=await i.pool.query(`UPDATE "ResourceMaintenance" m SET ${s.join(", ")}
     FROM "Resource" r
     WHERE m.id = $${o} AND m."resourceId" = $${o+1}
       AND r.id = m."resourceId" AND r."organizationId" = $${o+2}`,n);if(!c)throw Error("NOT_FOUND");let u=(await d(t)).find(e=>e.id===r);if(!u)throw Error("NOT_FOUND");return u}async function O(e,t,r){let a=await i.pool.query(`SELECT id, name, active FROM "Resource"
     WHERE id = $1 AND "organizationId" = $2 AND "deletedAt" IS NULL`,[t,e]);if(!a.rows[0])return null;let s=new Date(`${r}T00:00:00`);if(Number.isNaN(s.getTime()))throw Error("INVALID_DATE");let n=new Date(s);n.setDate(n.getDate()+1);let[o,c]=await Promise.all([i.pool.query(`SELECT a."startAt", a."endAt", s.name AS "serviceName"
       FROM "Appointment" a
       JOIN "Service" s ON s.id = a."serviceId"
       WHERE a."resourceId" = $1
         AND a.status NOT IN ('CANCELLED')
         AND a."startAt" < $3 AND a."endAt" > $2
       ORDER BY a."startAt"`,[t,s,n]),i.pool.query(`SELECT "startAt", "endAt", type::text
       FROM "ResourceMaintenance"
       WHERE "resourceId" = $1
         AND status IN ('SCHEDULED', 'IN_PROGRESS')
         AND "startAt" < $3 AND "endAt" > $2
       ORDER BY "startAt"`,[t,s,n])]);return{resourceId:t,date:r,active:a.rows[0].active,slots:[...o.rows.map(e=>({startAt:e.startAt.toISOString(),endAt:e.endAt.toISOString(),kind:"appointment",label:e.serviceName})),...c.rows.map(e=>({startAt:e.startAt.toISOString(),endAt:e.endAt.toISOString(),kind:"maintenance",label:`Maintenance ${e.type}`}))]}}async function m(e){let{organizationId:t,resourceId:r,serviceId:a,startAt:s,endAt:n}=e,{rows:o}=await i.pool.query(`SELECT id, active FROM "Resource"
     WHERE id = $1 AND "organizationId" = $2 AND "deletedAt" IS NULL`,[r,t]);if(!o[0])throw Error("RESOURCE_NOT_FOUND");if(!o[0].active)throw Error("RESOURCE_INACTIVE");let c=await i.pool.query(`SELECT EXISTS (
      SELECT 1 FROM "ServiceResource" sr
      JOIN "Service" s ON s.id = sr."serviceId"
      WHERE sr."resourceId" = $1 AND sr."serviceId" = $2 AND s."organizationId" = $3
    ) AS ok`,[r,a,t]),u=await i.pool.query('SELECT COUNT(*)::text AS n FROM "ServiceResource" WHERE "serviceId" = $1',[a]);if((parseInt(u.rows[0]?.n??"0",10)||0)>0&&!c.rows[0]?.ok)throw Error("RESOURCE_NOT_ALLOWED");if((await i.pool.query(`SELECT id FROM "ResourceMaintenance"
     WHERE "resourceId" = $1
       AND status IN ('SCHEDULED', 'IN_PROGRESS')
       AND "startAt" < $3 AND "endAt" > $2
     LIMIT 1`,[r,s,n])).rows[0])throw Error("RESOURCE_MAINTENANCE")}a()}catch(e){a(e)}})},87084:(e,t,r)=>{r.d(t,{Uk:()=>a,VK:()=>s});let a=["CABINE","SALLE","FAUTEUIL","TABLE","MACHINE","EQUIPEMENT","AUTRE"];function s(e){return"SCHEDULED"===e||"IN_PROGRESS"===e}}};var t=require("../../../../../webpack-runtime.js");t.C(e);var r=e=>t(t.s=e),a=t.X(0,[8948,7070,3314,3376,3568],()=>r(57157));module.exports=a})();