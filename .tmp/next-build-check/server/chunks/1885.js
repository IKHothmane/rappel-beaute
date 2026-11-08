"use strict";exports.id=1885,exports.ids=[1885],exports.modules={49303:(t,e,r)=>{t.exports=r(30517)},40440:(t,e,r)=>{r.a(t,async(t,a)=>{try{r.d(e,{B9:()=>O,Iu:()=>v,MB:()=>N,SN:()=>p,XN:()=>A,fg:()=>I,id:()=>l,lR:()=>S,oY:()=>m});var i=r(84770),s=r(79549),n=r(87084),o=t([s]);function c(t){return`${t}_${(0,i.randomBytes)(8).toString("hex")}`}s=(o.then?(await o)():o)[0];let R=`
  (
    SELECT rcd."imageUrl"
    FROM "ResourceCatalogDefault" rcd
    WHERE rcd.type = r.type
      AND rcd."imageUrl" IS NOT NULL
      AND rcd."imageUrl" <> ''
    LIMIT 1
  ) AS "imageUrl"
`;function d(t){return{id:t.id,name:t.name,type:t.type,capacity:t.capacity,location:t.location,notes:t.notes,active:t.active,imageUrl:t.imageUrl??null,serviceCount:parseInt(t.serviceCount,10)||0,serviceNames:t.serviceNames??[],upcomingMaintenance:!!t.upcomingMaintenance,appointmentCount:parseInt(t.appointmentCount,10)||0}}async function u(t){let{rows:e}=await s.pool.query(`SELECT id, "startAt", "endAt", type::text, reason, status::text, "createdAt"
     FROM "ResourceMaintenance"
     WHERE "resourceId" = $1
     ORDER BY "startAt" DESC`,[t]);return e.map(t=>({id:t.id,startAt:t.startAt.toISOString(),endAt:t.endAt.toISOString(),type:t.type,reason:t.reason,status:t.status,createdAt:t.createdAt.toISOString()}))}async function E(t,e,r){for(let a of(await s.pool.query('DELETE FROM "ServiceResource" WHERE "resourceId" = $1',[t]),e))await s.pool.query(`INSERT INTO "ServiceResource" ("serviceId", "resourceId", quantity)
       SELECT s.id, $2, 1 FROM "Service" s
       WHERE s.id = $1 AND s."organizationId" = $3
       ON CONFLICT DO NOTHING`,[a,t,r])}async function A(t,e){let{page:r,limit:a,search:i,type:o,active:c,serviceId:E,agenda:A}=e,N=['r."organizationId" = $1','r."deletedAt" IS NULL'],p=[t],l=2;i&&(N.push(`(r.name ILIKE $${l} OR COALESCE(r.location, '') ILIKE $${l} OR COALESCE(r.notes, '') ILIKE $${l})`),p.push(`%${i}%`),l++),o&&(N.push(`r.type = $${l}::"ResourceType"`),p.push(o),l++),null!=c&&(N.push(`r.active = $${l}`),p.push(c),l++),E&&(N.push(`EXISTS (SELECT 1 FROM "ServiceResource" sr WHERE sr."resourceId" = r.id AND sr."serviceId" = $${l})`),p.push(E),l++);let I=N.join(" AND ");if(A){let{rows:t}=await s.pool.query(`SELECT r.id, r.name, r.type, r.active
       FROM "Resource" r
       WHERE ${I} AND r.active = true
       ORDER BY r.name`,p),e=[];for(let r of t){let t=await u(r.id);e.push({id:r.id,name:r.name,type:r.type,active:r.active,maintenances:t.filter(t=>(0,n.VK)(t.status))})}return{items:e,total:e.length}}let S=`SELECT COUNT(*)::int AS total FROM "Resource" r WHERE ${I}`,m=`
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
    LIMIT $${l} OFFSET $${l+1}
  `,[O,v]=await Promise.all([s.pool.query(S,p),s.pool.query(m,[...p,a,(r-1)*a])]);return{items:v.rows.map(d),total:O.rows[0]?.total??0}}async function N(t,e){let{rows:r}=await s.pool.query(`SELECT
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
    GROUP BY r.id`,[e,t]);if(!r[0])return null;let[a,i,n]=await Promise.all([u(e),s.pool.query(`SELECT s.id AS "serviceId", s.name AS "serviceName", s.category, sr.quantity, s.active
       FROM "ServiceResource" sr
       JOIN "Service" s ON s.id = sr."serviceId"
       WHERE sr."resourceId" = $1
       ORDER BY s.name`,[e]),s.pool.query(`SELECT a.id, a."startAt", a."endAt", a.status::text,
              s.name AS "serviceName",
              st."firstName" AS "staffFirst", st."lastName" AS "staffLast",
              c."firstName" AS "customerFirst", c."lastName" AS "customerLast"
       FROM "Appointment" a
       JOIN "Service" s ON s.id = a."serviceId"
       JOIN "Staff" st ON st.id = a."staffId"
       JOIN "Customer" c ON c.id = a."customerId"
       WHERE a."resourceId" = $1 AND a.status <> 'CANCELLED'
       ORDER BY a."startAt" DESC
       LIMIT 40`,[e])]);return{...d(r[0]),services:i.rows,maintenances:a,reservations:n.rows.map(t=>({id:t.id,startAt:t.startAt.toISOString(),endAt:t.endAt.toISOString(),status:t.status,serviceName:t.serviceName,staffName:`${t.staffFirst} ${t.staffLast}`.trim(),customerName:`${t.customerFirst} ${t.customerLast}`.trim()})),createdAt:r[0].createdAt.toISOString(),updatedAt:r[0].updatedAt.toISOString()}}async function p(t,e){let r=c("res");await s.pool.query(`INSERT INTO "Resource" (
      id, "organizationId", name, type, capacity, location, notes, active, "updatedAt"
    ) VALUES ($1,$2,$3,$4::"ResourceType",$5,$6,$7,$8,NOW())`,[r,t,e.name,e.type??"CABINE",e.capacity??1,e.location??null,e.notes??null,!1!==e.active]),e.serviceIds?.length&&await E(r,e.serviceIds,t);let a=await N(t,r);if(!a)throw Error("Ressource introuvable apr\xe8s cr\xe9ation.");return a}async function l(t,e,r){let a=[],i=[],n=1,o=(t,e,r)=>{a.push(r?`"${t}" = $${n}${r}`:`"${t}" = $${n}`),i.push(e),n++};void 0!==r.name&&o("name",r.name),void 0!==r.type&&o("type",r.type,'::"ResourceType"'),void 0!==r.capacity&&o("capacity",r.capacity),void 0!==r.location&&o("location",r.location??null),void 0!==r.notes&&o("notes",r.notes??null),void 0!==r.active&&o("active",r.active),a.length>0&&(a.push('"updatedAt" = NOW()'),i.push(e,t),await s.pool.query(`UPDATE "Resource" SET ${a.join(", ")}
       WHERE id = $${n} AND "organizationId" = $${n+1} AND "deletedAt" IS NULL`,i)),void 0!==r.serviceIds&&await E(e,r.serviceIds,t);let c=await N(t,e);if(!c)throw Error("NOT_FOUND");return c}async function I(t,e){let r=await N(t,e);if(!r)throw Error("NOT_FOUND");let{rowCount:a}=await s.pool.query(`UPDATE "Resource"
     SET "deletedAt" = NOW(), active = false, "updatedAt" = NOW()
     WHERE id = $1 AND "organizationId" = $2 AND "deletedAt" IS NULL`,[e,t]);if(!a)throw Error("NOT_FOUND");return{name:r.name}}async function S(t,e,r){if(!(await s.pool.query('SELECT id FROM "Resource" WHERE id = $1 AND "organizationId" = $2 AND "deletedAt" IS NULL',[e,t])).rows[0])throw Error("NOT_FOUND");let a=c("mnt");await s.pool.query(`INSERT INTO "ResourceMaintenance" (id, "resourceId", "startAt", "endAt", type, reason, status, "updatedAt")
     VALUES ($1,$2,$3,$4,$5::"MaintenanceType",$6,$7::"MaintenanceStatus",NOW())`,[a,e,new Date(r.startAt),new Date(r.endAt),r.type??"PREVENTIVE",r.reason??null,r.status??"SCHEDULED"]);let i=(await u(e)).find(t=>t.id===a);if(!i)throw Error("Maintenance introuvable.");return i}async function m(t,e,r,a){let i=[],n=[],o=1;if(void 0!==a.startAt&&(i.push(`"startAt" = $${o}`),n.push(new Date(a.startAt)),o++),void 0!==a.endAt&&(i.push(`"endAt" = $${o}`),n.push(new Date(a.endAt)),o++),void 0!==a.type&&(i.push(`type = $${o}::"MaintenanceType"`),n.push(a.type),o++),void 0!==a.reason&&(i.push(`reason = $${o}`),n.push(a.reason??null),o++),void 0!==a.status&&(i.push(`status = $${o}::"MaintenanceStatus"`),n.push(a.status),o++),0===i.length){let t=(await u(e)).find(t=>t.id===r);if(!t)throw Error("NOT_FOUND");return t}i.push('"updatedAt" = NOW()'),n.push(r,e,t);let{rowCount:c}=await s.pool.query(`UPDATE "ResourceMaintenance" m SET ${i.join(", ")}
     FROM "Resource" r
     WHERE m.id = $${o} AND m."resourceId" = $${o+1}
       AND r.id = m."resourceId" AND r."organizationId" = $${o+2}`,n);if(!c)throw Error("NOT_FOUND");let d=(await u(e)).find(t=>t.id===r);if(!d)throw Error("NOT_FOUND");return d}async function O(t,e,r){let a=await s.pool.query(`SELECT id, name, active FROM "Resource"
     WHERE id = $1 AND "organizationId" = $2 AND "deletedAt" IS NULL`,[e,t]);if(!a.rows[0])return null;let i=new Date(`${r}T00:00:00`);if(Number.isNaN(i.getTime()))throw Error("INVALID_DATE");let n=new Date(i);n.setDate(n.getDate()+1);let[o,c]=await Promise.all([s.pool.query(`SELECT a."startAt", a."endAt", s.name AS "serviceName"
       FROM "Appointment" a
       JOIN "Service" s ON s.id = a."serviceId"
       WHERE a."resourceId" = $1
         AND a.status NOT IN ('CANCELLED')
         AND a."startAt" < $3 AND a."endAt" > $2
       ORDER BY a."startAt"`,[e,i,n]),s.pool.query(`SELECT "startAt", "endAt", type::text
       FROM "ResourceMaintenance"
       WHERE "resourceId" = $1
         AND status IN ('SCHEDULED', 'IN_PROGRESS')
         AND "startAt" < $3 AND "endAt" > $2
       ORDER BY "startAt"`,[e,i,n])]);return{resourceId:e,date:r,active:a.rows[0].active,slots:[...o.rows.map(t=>({startAt:t.startAt.toISOString(),endAt:t.endAt.toISOString(),kind:"appointment",label:t.serviceName})),...c.rows.map(t=>({startAt:t.startAt.toISOString(),endAt:t.endAt.toISOString(),kind:"maintenance",label:`Maintenance ${t.type}`}))]}}async function v(t){let{organizationId:e,resourceId:r,serviceId:a,startAt:i,endAt:n}=t,{rows:o}=await s.pool.query(`SELECT id, active FROM "Resource"
     WHERE id = $1 AND "organizationId" = $2 AND "deletedAt" IS NULL`,[r,e]);if(!o[0])throw Error("RESOURCE_NOT_FOUND");if(!o[0].active)throw Error("RESOURCE_INACTIVE");let c=await s.pool.query(`SELECT EXISTS (
      SELECT 1 FROM "ServiceResource" sr
      JOIN "Service" s ON s.id = sr."serviceId"
      WHERE sr."resourceId" = $1 AND sr."serviceId" = $2 AND s."organizationId" = $3
    ) AS ok`,[r,a,e]),d=await s.pool.query('SELECT COUNT(*)::text AS n FROM "ServiceResource" WHERE "serviceId" = $1',[a]);if((parseInt(d.rows[0]?.n??"0",10)||0)>0&&!c.rows[0]?.ok)throw Error("RESOURCE_NOT_ALLOWED");if((await s.pool.query(`SELECT id FROM "ResourceMaintenance"
     WHERE "resourceId" = $1
       AND status IN ('SCHEDULED', 'IN_PROGRESS')
       AND "startAt" < $3 AND "endAt" > $2
     LIMIT 1`,[r,i,n])).rows[0])throw Error("RESOURCE_MAINTENANCE")}a()}catch(t){a(t)}})},21281:(t,e,r)=>{r.d(e,{CW:()=>c,FA:()=>n,hb:()=>s,jr:()=>d,oq:()=>o});var a=r(87084);function i(t){let e=String(t??"");return a.Uk.includes(e)?e:void 0}function s(t){let e={};if(!t||"object"!=typeof t)return{ok:!1,errors:{_form:"Corps invalide."}};let r=String(t.name??"").trim();r||(e.name="Le nom est obligatoire.");let a=void 0!==t.capacity&&null!==t.capacity&&""!==t.capacity?Number(t.capacity):1;return((!Number.isInteger(a)||a<1)&&(e.capacity="La capacit\xe9 doit \xeatre un entier ≥ 1."),Object.keys(e).length>0)?{ok:!1,errors:e}:{ok:!0,data:{name:r,type:i(t.type)??"CABINE",capacity:a,location:t.location?String(t.location).trim():void 0,notes:t.notes?String(t.notes).trim():void 0,active:!1!==t.active,serviceIds:Array.isArray(t.serviceIds)?t.serviceIds.map(String):[]}}}function n(t){let e={};if(!t||"object"!=typeof t)return{ok:!1,errors:{_form:"Corps invalide."}};let r={};if(void 0!==t.name){let a=String(t.name).trim();a?r.name=a:e.name="Le nom est obligatoire."}if(void 0!==t.type&&(r.type=i(t.type)??"CABINE"),void 0!==t.capacity){let a=Number(t.capacity);!Number.isInteger(a)||a<1?e.capacity="La capacit\xe9 doit \xeatre un entier ≥ 1.":r.capacity=a}return(void 0!==t.location&&(r.location=String(t.location).trim()||void 0),void 0!==t.notes&&(r.notes=String(t.notes).trim()||void 0),void 0!==t.active&&(r.active=!!t.active),void 0!==t.serviceIds&&(r.serviceIds=Array.isArray(t.serviceIds)?t.serviceIds.map(String):[]),Object.keys(e).length>0)?{ok:!1,errors:e}:{ok:!0,data:r}}function o(t){let e={};if(!t||"object"!=typeof t)return{ok:!1,errors:{_form:"Corps invalide."}};let r=String(t.startAt??""),a=String(t.endAt??"");return(r||(e.startAt="D\xe9but obligatoire."),a||(e.endAt="Fin obligatoire."),r&&a&&new Date(a)<new Date(r)&&(e.endAt="La fin doit \xeatre apr\xe8s le d\xe9but."),Object.keys(e).length>0)?{ok:!1,errors:e}:{ok:!0,data:{startAt:r,endAt:a,type:t.type??"PREVENTIVE",reason:t.reason?String(t.reason).trim():void 0,status:t.status??"SCHEDULED"}}}function c(t){if(!t||"object"!=typeof t)return{ok:!1,errors:{_form:"Corps invalide."}};let e={};return void 0!==t.startAt&&(e.startAt=String(t.startAt)),void 0!==t.endAt&&(e.endAt=String(t.endAt)),void 0!==t.type&&(e.type=t.type),void 0!==t.reason&&(e.reason=String(t.reason).trim()||void 0),void 0!==t.status&&(e.status=t.status),{ok:!0,data:e}}function d(t){let e=Math.max(1,parseInt(t.get("page")??"1",10)||1),r=Math.min(100,Math.max(1,parseInt(t.get("limit")??"20",10)||20)),a=(t.get("search")??"").trim(),s=i(t.get("type")),n=t.get("active");return{page:e,limit:r,search:a,type:s??null,active:"false"!==n&&("true"===n||null),serviceId:(t.get("serviceId")??"").trim()||null,agenda:"1"===t.get("agenda")}}},87084:(t,e,r)=>{r.d(e,{Uk:()=>a,VK:()=>i});let a=["CABINE","SALLE","FAUTEUIL","TABLE","MACHINE","EQUIPEMENT","AUTRE"];function i(t){return"SCHEDULED"===t||"IN_PROGRESS"===t}}};