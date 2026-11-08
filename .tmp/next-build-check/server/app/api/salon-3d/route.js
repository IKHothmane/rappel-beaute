"use strict";(()=>{var t={};t.id=8185,t.ids=[8185],t.modules={72934:t=>{t.exports=require("next/dist/client/components/action-async-storage.external.js")},54580:t=>{t.exports=require("next/dist/client/components/request-async-storage.external.js")},45869:t=>{t.exports=require("next/dist/client/components/static-generation-async-storage.external.js")},20399:t=>{t.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},30517:t=>{t.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},48927:t=>{t.exports=require("web-push")},84770:t=>{t.exports=require("crypto")},92048:t=>{t.exports=require("fs")},71568:t=>{t.exports=require("zlib")},8678:t=>{t.exports=import("pg")},6005:t=>{t.exports=require("node:crypto")},42725:t=>{t.exports=require("node:http2")},62646:(t,e,a)=>{a.a(t,async(t,r)=>{try{a.r(e),a.d(e,{originalPathname:()=>E,patchFetch:()=>c,requestAsyncStorage:()=>d,routeModule:()=>l,serverHooks:()=>m,staticGenerationAsyncStorage:()=>p});var s=a(49303),n=a(88716),i=a(60670),o=a(94582),u=t([o]);o=(u.then?(await u)():u)[0];let l=new s.AppRouteRouteModule({definition:{kind:n.x.APP_ROUTE,page:"/api/salon-3d/route",pathname:"/api/salon-3d",filename:"route",bundlePath:"app/api/salon-3d/route"},resolvedPagePath:"C:\\Users\\LordOfTHeRings\\Desktop\\rappel beauty\\src\\app\\api\\salon-3d\\route.ts",nextConfigOutput:"",userland:o}),{requestAsyncStorage:d,staticGenerationAsyncStorage:p,serverHooks:m}=l,E="/api/salon-3d/route";function c(){return(0,i.patchFetch)({serverHooks:m,staticGenerationAsyncStorage:p})}r()}catch(t){r(t)}})},94582:(t,e,a)=>{a.a(t,async(t,r)=>{try{a.r(e),a.d(e,{GET:()=>c});var s=a(87070),n=a(33568),i=a(6153),o=a(27489),u=t([n,o]);async function c(t){let e=await (0,n.lr)(t,"resources");if(!e.ok)return e.response;if(!(0,i.TC)(e.session.orgSlug))return s.NextResponse.json({error:"Le plan 3D n’est pas disponible pour cet institut."},{status:403});try{let t=await (0,o.J)(e.session.organizationId);return s.NextResponse.json(t,{headers:{"Cache-Control":"no-store"}})}catch(t){return console.error("[GET /api/salon-3d]",t),s.NextResponse.json({error:"Impossible de charger le plan 3D."},{status:500})}}[n,o]=u.then?(await u)():u,r()}catch(t){r(t)}})},6153:(t,e,a)=>{a.d(e,{TC:()=>r});function r(t){return!1}},27489:(t,e,a)=>{a.a(t,async(t,r)=>{try{a.d(e,{J:()=>p});var s=a(79549),n=a(45304),i=a(69103),o=a(64231),u=t([s,n,i]);function c(t,e){return"SALLE"===e&&/attente/i.test(t)}[s,n,i]=u.then?(await u)():u;let m=["#C9A84C","#C49292","#6B8CAE","#4F7A57","#B07A7A","#8F6A8F"];function l(t){return t.toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit"})}function d(t,e,a){return e.getTime()<=t.getTime()&&a.getTime()>t.getTime()}async function p(t){let{from:e,to:a,now:r}=function(t=new Date){let e=new Date(t);e.setHours(0,0,0,0);let a=new Date(t);return a.setHours(23,59,59,999),{from:e,to:a,now:t}}(),u=await s.pool.query('SELECT name FROM "Organization" WHERE id = $1 LIMIT 1',[t]),p=await s.pool.query(`SELECT id, name, type::text AS type, capacity
     FROM "Resource"
     WHERE "organizationId" = $1 AND active = true AND "deletedAt" IS NULL
       AND type IN ('CABINE', 'FAUTEUIL', 'TABLE', 'SALLE')
     ORDER BY
       CASE type::text
         WHEN 'CABINE' THEN 0
         WHEN 'FAUTEUIL' THEN 1
         WHEN 'TABLE' THEN 2
         ELSE 3
       END,
       name ASC
     LIMIT 24`,[t]),E=p.rows.filter(t=>c(t.name,t.type)).map(t=>({id:t.id,name:t.name,capacity:Math.max(1,t.capacity||1)})),A=p.rows.filter(t=>!c(t.name,t.type)),N=await s.pool.query(`SELECT
       a.id,
       TRIM(BOTH FROM CONCAT(COALESCE(c."firstName", ''), ' ', COALESCE(c."lastName", ''))) AS "customerName",
       COALESCE(s.name, a."serviceNameSnapshot", 'Soin') AS "serviceName",
       a."staffId",
       CASE WHEN a."staffId" IS NULL THEN NULL
            ELSE TRIM(BOTH FROM CONCAT(COALESCE(st."firstName", ''), ' ', COALESCE(st."lastName", ''))) END AS "staffName",
       a."resourceId",
       a."startAt",
       a."endAt",
       a.price::text,
       a.status::text AS status
     FROM "Appointment" a
     JOIN "Customer" c ON c.id = a."customerId"
     LEFT JOIN "Service" s ON s.id = a."serviceId"
     LEFT JOIN "Staff" st ON st.id = a."staffId"
     WHERE a."organizationId" = $1
       AND a."startAt" < $3
       AND a."endAt" > $2
       AND a.status IN ('PENDING', 'CONFIRMED', 'ARRIVED', 'IN_PROGRESS')
     ORDER BY a."startAt" ASC`,[t,e,a]),f=new Set(["ARRIVED","IN_PROGRESS"]),I=new Set(["PENDING","CONFIRMED","ARRIVED","IN_PROGRESS"]),S=A.map(t=>{var e;let a=function(t){let e=N.rows.filter(e=>e.resourceId===t&&I.has(e.status));return e.find(t=>d(r,t.startAt,t.endAt)||f.has(t.status))||(e.find(t=>t.startAt.getTime()>=r.getTime())??null)}(t.id),s=!!(a&&(f.has(a.status)||d(r,a.startAt,a.endAt)));return{id:t.id,name:t.name,status:s?"occupied":"free",client:s&&a&&a.customerName.trim()||null,treatment:s&&a?a.serviceName:null,staff:s&&a&&a.staffName?.trim()||null,staffId:s&&a?a.staffId:null,time:s&&a?`${l(a.startAt)} - ${l(a.endAt)}`:null,price:s&&a?(e=Number(a.price),`${e.toLocaleString("fr-MA")} DH`):null,appointmentId:s&&a?a.id:null}}),C=new Set(S.filter(t=>"occupied"===t.status).map(t=>t.id)),R=new Set(S.filter(t=>"occupied"===t.status&&t.staffId).map(t=>t.staffId)),T=N.rows.filter(t=>{if("ARRIVED"===t.status)return!t.resourceId||!C.has(t.resourceId)||!d(r,t.startAt,t.endAt);if("PENDING"===t.status||"CONFIRMED"===t.status){let e=t.startAt.getTime()-r.getTime()<=72e5,a=t.startAt.getTime()>=r.getTime()-9e5;return e&&a&&!d(r,t.startAt,t.endAt)}return!1}).slice(0,16).map(t=>({id:t.id,name:t.customerName,arrivalTime:"ARRIVED"===t.status?l(r):"—",apptTime:l(t.startAt),treatment:t.serviceName,status:"ARRIVED"===t.status?"Arriv\xe9e":"En attente"}));await (0,i.AB)(t);let g=(await (0,i.Z6)(t,{page:1,limit:50})).items.filter(t=>"ACTIVE"===t.status||"ON_LEAVE"===t.status),D=await s.pool.query(`SELECT DISTINCT l."staffId"
     FROM "StaffLeave" l
     JOIN "Staff" st ON st.id = l."staffId"
     WHERE st."organizationId" = $1
       AND st."deletedAt" IS NULL
       AND l.status = 'APPROVED'
       AND l."startAt" <= $2
       AND l."endAt" >= $2`,[t,r]),L=new Set(D.rows.map(t=>t.staffId)),O=g.map((t,e)=>{let a=(t.displayName||`${t.firstName} ${t.lastName}`.trim()).replace(/\s+/g," ").trim(),r=L.has(t.id),s=!r&&R.has(t.id),n=S.find(e=>e.staffId===t.id),i=t.position?.trim()||"\xc9quipe",o=i.toLowerCase(),u=s?"busy":"available",c=s&&n?n.name:"Disponible";return r?(u="away",c="En cong\xe9"):!s&&(o.includes("accueil")||o.includes("r\xe9ception")||o.includes("reception"))?(u="reception",c="Comptoir Accueil"):!s&&(o.includes("stock")||o.includes("magasin"))&&(u="stock",c="R\xe9serve & Stock"),{id:t.id,name:a||t.firstName||"Employ\xe9e",firstName:t.firstName||a||"Employ\xe9e",role:i,status:u,location:c,color:m[e%m.length]}}),y=await (0,n.Bl)(t),{items:h}=await (0,n.tr)(t,{page:1,limit:48,active:!0}),w=[...h].sort((t,e)=>{let a=t=>t.stock<=0?0:t.stock<t.minStock?1:2,r=a(t)-a(e);return 0!==r?r:t.name.localeCompare(e.name,"fr")}).map(t=>{let e=Number(t.stock)||0,a=Number(t.minStock)||0,r=t.category;return{id:t.id,name:t.name,qty:e,min:a,status:e<=0?"out":e<a?"low":"ok",unit:o.Sz[t.unit]||t.unit||"u.",category:r,categoryLabel:o._3[r]||r,sku:t.sku||null,brand:t.brand||null}}),x=y.activeCount>0?Math.max(0,Math.min(100,Math.round((y.activeCount-y.lowStockCount-y.outOfStockCount)/y.activeCount*100))):100,v=await s.pool.query(`SELECT COALESCE(SUM(CASE WHEN kind = 'REFUND' THEN -amount ELSE amount END), 0)::text AS total
     FROM "Payment"
     WHERE "organizationId" = $1
       AND status = 'COMPLETED'
       AND "paidAt" >= $2
       AND "paidAt" <= $3`,[t,e,a]),M=await s.pool.query(`SELECT COUNT(*)::text AS count
     FROM "Appointment"
     WHERE "organizationId" = $1
       AND status = 'COMPLETED'
       AND "startAt" >= $2
       AND "startAt" <= $3`,[t,e,a]),H=S.filter(t=>"occupied"===t.status).length,F=S.length>0?Math.round(H/S.length*100):0;return{organizationName:u.rows[0]?.name??"Institut",refreshedAt:r.toISOString(),chairs:S,staff:O,waiting:T,waitingRooms:E,stock:w,stockPercent:x,stats:{revenueToday:Math.round(100*(Number(v.rows[0]?.total??0)||0))/100,occupationPercent:F,careDone:parseInt(M.rows[0]?.count??"0",10),satisfaction:null}}}r()}catch(t){r(t)}})}};var e=require("../../../webpack-runtime.js");e.C(t);var a=t=>e(e.s=t),r=e.X(0,[8948,7070,3314,3376,3568,9103,3097],()=>a(62646));module.exports=r})();