"use strict";!function(){try{var e="undefined"!=typeof window?window:"undefined"!=typeof global?global:"undefined"!=typeof self?self:{},t=(new e.Error).stack;t&&(e._sentryDebugIds=e._sentryDebugIds||{},e._sentryDebugIds[t]="e18c1b30-765e-44df-8894-f117e42d2866",e._sentryDebugIdIdentifier="sentry-dbid-e18c1b30-765e-44df-8894-f117e42d2866")}catch(e){}}(),exports.id=2315,exports.ids=[2315],exports.modules={2551:(e,t,r)=>{r.a(e,async(e,a)=>{try{r.d(t,{B9:()=>O,Iu:()=>v,MB:()=>N,SN:()=>l,XN:()=>A,fg:()=>I,id:()=>p,lR:()=>S,oY:()=>m});var i=r(84770),n=r(70653),s=r(66250),o=e([n]);function c(e){return`${e}_${(0,i.randomBytes)(8).toString("hex")}`}n=(o.then?(await o)():o)[0];let R=`
  (
    SELECT rcd."imageUrl"
    FROM "ResourceCatalogDefault" rcd
    WHERE rcd.type = r.type
      AND rcd."imageUrl" IS NOT NULL
      AND rcd."imageUrl" <> ''
    LIMIT 1
  ) AS "imageUrl"
`;function d(e){return{id:e.id,name:e.name,type:e.type,capacity:e.capacity,location:e.location,notes:e.notes,active:e.active,imageUrl:e.imageUrl??null,serviceCount:parseInt(e.serviceCount,10)||0,serviceNames:e.serviceNames??[],upcomingMaintenance:!!e.upcomingMaintenance,appointmentCount:parseInt(e.appointmentCount,10)||0}}async function u(e){let{rows:t}=await n.pool.query(`SELECT id, "startAt", "endAt", type::text, reason, status::text, "createdAt"
     FROM "ResourceMaintenance"
     WHERE "resourceId" = $1
     ORDER BY "startAt" DESC`,[e]);return t.map(e=>({id:e.id,startAt:e.startAt.toISOString(),endAt:e.endAt.toISOString(),type:e.type,reason:e.reason,status:e.status,createdAt:e.createdAt.toISOString()}))}async function E(e,t,r){for(let a of(await n.pool.query('DELETE FROM "ServiceResource" WHERE "resourceId" = $1',[e]),t))await n.pool.query(`INSERT INTO "ServiceResource" ("serviceId", "resourceId", quantity)
       SELECT s.id, $2, 1 FROM "Service" s
       WHERE s.id = $1 AND s."organizationId" = $3
       ON CONFLICT DO NOTHING`,[a,e,r])}async function A(e,t){let{page:r,limit:a,search:i,type:o,active:c,serviceId:E,agenda:A}=t,N=['r."organizationId" = $1','r."deletedAt" IS NULL'],l=[e],p=2;i&&(N.push(`(r.name ILIKE $${p} OR COALESCE(r.location, '') ILIKE $${p} OR COALESCE(r.notes, '') ILIKE $${p})`),l.push(`%${i}%`),p++),o&&(N.push(`r.type = $${p}::"ResourceType"`),l.push(o),p++),null!=c&&(N.push(`r.active = $${p}`),l.push(c),p++),E&&(N.push(`EXISTS (SELECT 1 FROM "ServiceResource" sr WHERE sr."resourceId" = r.id AND sr."serviceId" = $${p})`),l.push(E),p++);let I=N.join(" AND ");if(A){let{rows:e}=await n.pool.query(`SELECT r.id, r.name, r.type, r.active
       FROM "Resource" r
       WHERE ${I} AND r.active = true
       ORDER BY r.name`,l),t=[];for(let r of e){let e=await u(r.id);t.push({id:r.id,name:r.name,type:r.type,active:r.active,maintenances:e.filter(e=>(0,s.VK)(e.status))})}return{items:t,total:t.length}}let S=`SELECT COUNT(*)::int AS total FROM "Resource" r WHERE ${I}`,m=`
    SELECT
      r.id, r.name, r.type, r.capacity, r.location, r.notes, r.active,
      ${R},
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
    LIMIT $${p} OFFSET $${p+1}
  `,[O,v]=await Promise.all([n.pool.query(S,l),n.pool.query(m,[...l,a,(r-1)*a])]);return{items:v.rows.map(d),total:O.rows[0]?.total??0}}async function N(e,t){let{rows:r}=await n.pool.query(`SELECT
      r.id, r.name, r.type, r.capacity, r.location, r.notes, r.active,
      ${R},
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
    GROUP BY r.id`,[t,e]);if(!r[0])return null;let[a,i,s]=await Promise.all([u(t),n.pool.query(`SELECT s.id AS "serviceId", s.name AS "serviceName", s.category, sr.quantity, s.active
       FROM "ServiceResource" sr
       JOIN "Service" s ON s.id = sr."serviceId"
       WHERE sr."resourceId" = $1
       ORDER BY s.name`,[t]),n.pool.query(`SELECT a.id, a."startAt", a."endAt", a.status::text,
              s.name AS "serviceName",
              st."firstName" AS "staffFirst", st."lastName" AS "staffLast",
              c."firstName" AS "customerFirst", c."lastName" AS "customerLast"
       FROM "Appointment" a
       JOIN "Service" s ON s.id = a."serviceId"
       JOIN "Staff" st ON st.id = a."staffId"
       JOIN "Customer" c ON c.id = a."customerId"
       WHERE a."resourceId" = $1 AND a.status <> 'CANCELLED'
       ORDER BY a."startAt" DESC
       LIMIT 40`,[t])]);return{...d(r[0]),services:i.rows,maintenances:a,reservations:s.rows.map(e=>({id:e.id,startAt:e.startAt.toISOString(),endAt:e.endAt.toISOString(),status:e.status,serviceName:e.serviceName,staffName:`${e.staffFirst} ${e.staffLast}`.trim(),customerName:`${e.customerFirst} ${e.customerLast}`.trim()})),createdAt:r[0].createdAt.toISOString(),updatedAt:r[0].updatedAt.toISOString()}}async function l(e,t){let r=c("res");await n.pool.query(`INSERT INTO "Resource" (
      id, "organizationId", name, type, capacity, location, notes, active, "updatedAt"
    ) VALUES ($1,$2,$3,$4::"ResourceType",$5,$6,$7,$8,NOW())`,[r,e,t.name,t.type??"CABINE",t.capacity??1,t.location??null,t.notes??null,!1!==t.active]),t.serviceIds?.length&&await E(r,t.serviceIds,e);let a=await N(e,r);if(!a)throw Error("Ressource introuvable apr\xe8s cr\xe9ation.");return a}async function p(e,t,r){let a=[],i=[],s=1,o=(e,t,r)=>{a.push(r?`"${e}" = $${s}${r}`:`"${e}" = $${s}`),i.push(t),s++};void 0!==r.name&&o("name",r.name),void 0!==r.type&&o("type",r.type,'::"ResourceType"'),void 0!==r.capacity&&o("capacity",r.capacity),void 0!==r.location&&o("location",r.location??null),void 0!==r.notes&&o("notes",r.notes??null),void 0!==r.active&&o("active",r.active),a.length>0&&(a.push('"updatedAt" = NOW()'),i.push(t,e),await n.pool.query(`UPDATE "Resource" SET ${a.join(", ")}
       WHERE id = $${s} AND "organizationId" = $${s+1} AND "deletedAt" IS NULL`,i)),void 0!==r.serviceIds&&await E(t,r.serviceIds,e);let c=await N(e,t);if(!c)throw Error("NOT_FOUND");return c}async function I(e,t){let r=await N(e,t);if(!r)throw Error("NOT_FOUND");let{rowCount:a}=await n.pool.query(`UPDATE "Resource"
     SET "deletedAt" = NOW(), active = false, "updatedAt" = NOW()
     WHERE id = $1 AND "organizationId" = $2 AND "deletedAt" IS NULL`,[t,e]);if(!a)throw Error("NOT_FOUND");return{name:r.name}}async function S(e,t,r){if(!(await n.pool.query('SELECT id FROM "Resource" WHERE id = $1 AND "organizationId" = $2 AND "deletedAt" IS NULL',[t,e])).rows[0])throw Error("NOT_FOUND");let a=c("mnt");await n.pool.query(`INSERT INTO "ResourceMaintenance" (id, "resourceId", "startAt", "endAt", type, reason, status, "updatedAt")
     VALUES ($1,$2,$3,$4,$5::"MaintenanceType",$6,$7::"MaintenanceStatus",NOW())`,[a,t,new Date(r.startAt),new Date(r.endAt),r.type??"PREVENTIVE",r.reason??null,r.status??"SCHEDULED"]);let i=(await u(t)).find(e=>e.id===a);if(!i)throw Error("Maintenance introuvable.");return i}async function m(e,t,r,a){let i=[],s=[],o=1;if(void 0!==a.startAt&&(i.push(`"startAt" = $${o}`),s.push(new Date(a.startAt)),o++),void 0!==a.endAt&&(i.push(`"endAt" = $${o}`),s.push(new Date(a.endAt)),o++),void 0!==a.type&&(i.push(`type = $${o}::"MaintenanceType"`),s.push(a.type),o++),void 0!==a.reason&&(i.push(`reason = $${o}`),s.push(a.reason??null),o++),void 0!==a.status&&(i.push(`status = $${o}::"MaintenanceStatus"`),s.push(a.status),o++),0===i.length){let e=(await u(t)).find(e=>e.id===r);if(!e)throw Error("NOT_FOUND");return e}i.push('"updatedAt" = NOW()'),s.push(r,t,e);let{rowCount:c}=await n.pool.query(`UPDATE "ResourceMaintenance" m SET ${i.join(", ")}
     FROM "Resource" r
     WHERE m.id = $${o} AND m."resourceId" = $${o+1}
       AND r.id = m."resourceId" AND r."organizationId" = $${o+2}`,s);if(!c)throw Error("NOT_FOUND");let d=(await u(t)).find(e=>e.id===r);if(!d)throw Error("NOT_FOUND");return d}async function O(e,t,r){let a=await n.pool.query(`SELECT id, name, active FROM "Resource"
     WHERE id = $1 AND "organizationId" = $2 AND "deletedAt" IS NULL`,[t,e]);if(!a.rows[0])return null;let i=new Date(`${r}T00:00:00`);if(Number.isNaN(i.getTime()))throw Error("INVALID_DATE");let s=new Date(i);s.setDate(s.getDate()+1);let[o,c]=await Promise.all([n.pool.query(`SELECT a."startAt", a."endAt", s.name AS "serviceName"
       FROM "Appointment" a
       JOIN "Service" s ON s.id = a."serviceId"
       WHERE a."resourceId" = $1
         AND a.status NOT IN ('CANCELLED')
         AND a."startAt" < $3 AND a."endAt" > $2
       ORDER BY a."startAt"`,[t,i,s]),n.pool.query(`SELECT "startAt", "endAt", type::text
       FROM "ResourceMaintenance"
       WHERE "resourceId" = $1
         AND status IN ('SCHEDULED', 'IN_PROGRESS')
         AND "startAt" < $3 AND "endAt" > $2
       ORDER BY "startAt"`,[t,i,s])]);return{resourceId:t,date:r,active:a.rows[0].active,slots:[...o.rows.map(e=>({startAt:e.startAt.toISOString(),endAt:e.endAt.toISOString(),kind:"appointment",label:e.serviceName})),...c.rows.map(e=>({startAt:e.startAt.toISOString(),endAt:e.endAt.toISOString(),kind:"maintenance",label:`Maintenance ${e.type}`}))]}}async function v(e){let{organizationId:t,resourceId:r,serviceId:a,startAt:i,endAt:s}=e,{rows:o}=await n.pool.query(`SELECT id, active FROM "Resource"
     WHERE id = $1 AND "organizationId" = $2 AND "deletedAt" IS NULL`,[r,t]);if(!o[0])throw Error("RESOURCE_NOT_FOUND");if(!o[0].active)throw Error("RESOURCE_INACTIVE");let c=await n.pool.query(`SELECT EXISTS (
      SELECT 1 FROM "ServiceResource" sr
      JOIN "Service" s ON s.id = sr."serviceId"
      WHERE sr."resourceId" = $1 AND sr."serviceId" = $2 AND s."organizationId" = $3
    ) AS ok`,[r,a,t]),d=await n.pool.query('SELECT COUNT(*)::text AS n FROM "ServiceResource" WHERE "serviceId" = $1',[a]);if((parseInt(d.rows[0]?.n??"0",10)||0)>0&&!c.rows[0]?.ok)throw Error("RESOURCE_NOT_ALLOWED");if((await n.pool.query(`SELECT id FROM "ResourceMaintenance"
     WHERE "resourceId" = $1
       AND status IN ('SCHEDULED', 'IN_PROGRESS')
       AND "startAt" < $3 AND "endAt" > $2
     LIMIT 1`,[r,i,s])).rows[0])throw Error("RESOURCE_MAINTENANCE")}a()}catch(e){a(e)}})},53637:(e,t,r)=>{r.d(t,{CW:()=>c,FA:()=>s,hb:()=>n,jr:()=>d,oq:()=>o});var a=r(66250);function i(e){let t=String(e??"");return a.Uk.includes(t)?t:void 0}function n(e){let t={};if(!e||"object"!=typeof e)return{ok:!1,errors:{_form:"Corps invalide."}};let r=String(e.name??"").trim();r||(t.name="Le nom est obligatoire.");let a=void 0!==e.capacity&&null!==e.capacity&&""!==e.capacity?Number(e.capacity):1;return((!Number.isInteger(a)||a<1)&&(t.capacity="La capacit\xe9 doit \xeatre un entier ≥ 1."),Object.keys(t).length>0)?{ok:!1,errors:t}:{ok:!0,data:{name:r,type:i(e.type)??"CABINE",capacity:a,location:e.location?String(e.location).trim():void 0,notes:e.notes?String(e.notes).trim():void 0,active:!1!==e.active,serviceIds:Array.isArray(e.serviceIds)?e.serviceIds.map(String):[]}}}function s(e){let t={};if(!e||"object"!=typeof e)return{ok:!1,errors:{_form:"Corps invalide."}};let r={};if(void 0!==e.name){let a=String(e.name).trim();a?r.name=a:t.name="Le nom est obligatoire."}if(void 0!==e.type&&(r.type=i(e.type)??"CABINE"),void 0!==e.capacity){let a=Number(e.capacity);!Number.isInteger(a)||a<1?t.capacity="La capacit\xe9 doit \xeatre un entier ≥ 1.":r.capacity=a}return(void 0!==e.location&&(r.location=String(e.location).trim()||void 0),void 0!==e.notes&&(r.notes=String(e.notes).trim()||void 0),void 0!==e.active&&(r.active=!!e.active),void 0!==e.serviceIds&&(r.serviceIds=Array.isArray(e.serviceIds)?e.serviceIds.map(String):[]),Object.keys(t).length>0)?{ok:!1,errors:t}:{ok:!0,data:r}}function o(e){let t={};if(!e||"object"!=typeof e)return{ok:!1,errors:{_form:"Corps invalide."}};let r=String(e.startAt??""),a=String(e.endAt??"");return(r||(t.startAt="D\xe9but obligatoire."),a||(t.endAt="Fin obligatoire."),r&&a&&new Date(a)<new Date(r)&&(t.endAt="La fin doit \xeatre apr\xe8s le d\xe9but."),Object.keys(t).length>0)?{ok:!1,errors:t}:{ok:!0,data:{startAt:r,endAt:a,type:e.type??"PREVENTIVE",reason:e.reason?String(e.reason).trim():void 0,status:e.status??"SCHEDULED"}}}function c(e){if(!e||"object"!=typeof e)return{ok:!1,errors:{_form:"Corps invalide."}};let t={};return void 0!==e.startAt&&(t.startAt=String(e.startAt)),void 0!==e.endAt&&(t.endAt=String(e.endAt)),void 0!==e.type&&(t.type=e.type),void 0!==e.reason&&(t.reason=String(e.reason).trim()||void 0),void 0!==e.status&&(t.status=e.status),{ok:!0,data:t}}function d(e){let t=Math.max(1,parseInt(e.get("page")??"1",10)||1),r=Math.min(100,Math.max(1,parseInt(e.get("limit")??"20",10)||20)),a=(e.get("search")??"").trim(),n=i(e.get("type")),s=e.get("active");return{page:t,limit:r,search:a,type:n??null,active:"false"!==s&&("true"===s||null),serviceId:(e.get("serviceId")??"").trim()||null,agenda:"1"===e.get("agenda")}}},66250:(e,t,r)=>{r.d(t,{Uk:()=>a,VK:()=>i});let a=["CABINE","SALLE","FAUTEUIL","TABLE","MACHINE","EQUIPEMENT","AUTRE"];function i(e){return"SCHEDULED"===e||"IN_PROGRESS"===e}}};