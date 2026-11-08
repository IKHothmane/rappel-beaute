"use strict";(()=>{var t={};t.id=5192,t.ids=[5192,2616],t.modules={72934:t=>{t.exports=require("next/dist/client/components/action-async-storage.external.js")},54580:t=>{t.exports=require("next/dist/client/components/request-async-storage.external.js")},45869:t=>{t.exports=require("next/dist/client/components/static-generation-async-storage.external.js")},20399:t=>{t.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},30517:t=>{t.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},48927:t=>{t.exports=require("web-push")},84770:t=>{t.exports=require("crypto")},92048:t=>{t.exports=require("fs")},71568:t=>{t.exports=require("zlib")},8678:t=>{t.exports=import("pg")},6005:t=>{t.exports=require("node:crypto")},42725:t=>{t.exports=require("node:http2")},7797:(t,e,r)=>{r.a(t,async(t,i)=>{try{r.r(e),r.d(e,{originalPathname:()=>m,patchFetch:()=>u,requestAsyncStorage:()=>p,routeModule:()=>c,serverHooks:()=>l,staticGenerationAsyncStorage:()=>f});var a=r(49303),s=r(88716),n=r(60670),o=r(94721),d=t([o]);o=(d.then?(await d)():d)[0];let c=new a.AppRouteRouteModule({definition:{kind:s.x.APP_ROUTE,page:"/api/waiting-list/[id]/route",pathname:"/api/waiting-list/[id]",filename:"route",bundlePath:"app/api/waiting-list/[id]/route"},resolvedPagePath:"C:\\Users\\LordOfTHeRings\\Desktop\\rappel beauty\\src\\app\\api\\waiting-list\\[id]\\route.ts",nextConfigOutput:"",userland:o}),{requestAsyncStorage:p,staticGenerationAsyncStorage:f,serverHooks:l}=c,m="/api/waiting-list/[id]/route";function u(){return(0,n.patchFetch)({serverHooks:l,staticGenerationAsyncStorage:f})}i()}catch(t){i(t)}})},49303:(t,e,r)=>{t.exports=r(30517)},94721:(t,e,r)=>{r.a(t,async(t,i)=>{try{r.r(e),r.d(e,{PATCH:()=>d});var a=r(87070),s=r(33568),n=r(72616),o=t([s,n]);[s,n]=o.then?(await o)():o;let u=new Set(["WAITING","NOTIFIED","BOOKED","EXPIRED","CANCELLED"]);async function d(t,e){let r=await (0,s.PX)(t,"agenda");if(!r.ok)return r.response;let{id:i}=await e.params;try{let e=(0,s.stripOrganizationId)(await t.json()),o=String(e.status??"").toUpperCase();if(!u.has(o))return a.NextResponse.json({error:"Statut invalide."},{status:400});let d=await (0,n.A3)(r.session.organizationId,i,o,{id:r.session.id,name:`${r.session.firstName} ${r.session.lastName}`.trim()});if(!d)return a.NextResponse.json({error:"Entr\xe9e introuvable."},{status:404});return a.NextResponse.json({entry:d})}catch(t){return console.error("[PATCH /api/waiting-list/:id]",t),a.NextResponse.json({error:"Mise \xe0 jour impossible."},{status:500})}}i()}catch(t){i(t)}})},72616:(t,e,r)=>{r.a(t,async(t,i)=>{try{r.d(e,{A3:()=>p,EP:()=>c,n0:()=>u,notifyWaitingListOnCancellation:()=>l});var a=r(84770),s=r(8678),n=r(2192),o=t([s,n]);[s,n]=o.then?(await o)():o;let m=new s.Pool({connectionString:process.env.DATABASE_URL});function d(t){var e;return{id:String(t.id),organizationId:String(t.organizationId),customerId:String(t.customerId),customerName:`${t.customerFirstName??""} ${t.customerLastName??""}`.trim(),customerPhone:String(t.customerPhone??""),serviceId:String(t.serviceId),serviceName:String(t.serviceName??""),staffId:t.staffId??null,staffName:t.staffFirstName?`${t.staffFirstName} ${t.staffLastName??""}`.trim():null,preferredDate:(e=t.preferredDate,"string"==typeof e?e.slice(0,10):e.toLocaleDateString("en-CA",{timeZone:"Africa/Casablanca"})),preferredTimeFrom:t.preferredTimeFrom??null,preferredTimeTo:t.preferredTimeTo??null,status:t.status,notes:t.notes??null,notifiedAt:t.notifiedAt?new Date(t.notifiedAt).toISOString():null,expiresAt:t.expiresAt?new Date(t.expiresAt).toISOString():null,createdAt:new Date(t.createdAt).toISOString()}}let I=`
  SELECT w.*,
    c."firstName" AS "customerFirstName",
    c."lastName" AS "customerLastName",
    c.phone AS "customerPhone",
    s.name AS "serviceName",
    st."firstName" AS "staffFirstName",
    st."lastName" AS "staffLastName"
  FROM "WaitingListEntry" w
  JOIN "Customer" c ON c.id = w."customerId"
  JOIN "Service" s ON s.id = w."serviceId"
  LEFT JOIN "Staff" st ON st.id = w."staffId"
`;async function u(t,e){await f(t);let r=[t],i=['w."organizationId" = $1'],a=2;e?.status&&(i.push(`w.status = $${a++}::"WaitingListStatus"`),r.push(e.status)),e?.serviceId&&(i.push(`w."serviceId" = $${a++}`),r.push(e.serviceId));let{rows:s}=await m.query(`${I} WHERE ${i.join(" AND ")}
     ORDER BY w."preferredDate" ASC, w."createdAt" ASC
     LIMIT 200`,r);return s.map(t=>d(t))}async function c(t,e,r){if(!(await m.query(`SELECT id FROM "Customer"
     WHERE id = $1 AND "organizationId" = $2 AND "deletedAt" IS NULL`,[e.customerId,t])).rows[0])throw Error("CUSTOMER_NOT_FOUND");if(!(await m.query('SELECT id FROM "Service" WHERE id = $1 AND "organizationId" = $2 AND active = true',[e.serviceId,t])).rows[0])throw Error("SERVICE_NOT_FOUND");if(e.staffId&&!(await m.query('SELECT id FROM "Staff" WHERE id = $1 AND "organizationId" = $2 AND "deletedAt" IS NULL',[e.staffId,t])).rows[0])throw Error("STAFF_NOT_FOUND");let i=`wle_${(0,a.randomBytes)(6).toString("hex")}`,s=new Date(e.expiresAt?e.expiresAt:Date.now()+12096e5);await m.query(`INSERT INTO "WaitingListEntry" (
      id, "organizationId", "customerId", "serviceId", "staffId",
      "preferredDate", "preferredTimeFrom", "preferredTimeTo",
      status, notes, "expiresAt", "updatedAt"
    ) VALUES (
      $1,$2,$3,$4,$5,$6::date,$7,$8,'WAITING'::"WaitingListStatus",$9,$10,NOW()
    )`,[i,t,e.customerId,e.serviceId,e.staffId??null,e.preferredDate.slice(0,10),e.preferredTimeFrom??null,e.preferredTimeTo??null,e.notes?.trim()||null,s]),await (0,n.writeAuditLog)({organizationId:t,actorId:r.id,actorName:r.name??void 0,entityType:"WaitingListEntry",entityId:i,action:"CREATE",after:{serviceId:e.serviceId,customerId:e.customerId}}).catch(()=>void 0);let{rows:o}=await m.query(`${I} WHERE w.id = $1`,[i]);return d(o[0])}async function p(t,e,r,i){let{rowCount:a}=await m.query(`UPDATE "WaitingListEntry"
     SET status = $1::"WaitingListStatus",
         "notifiedAt" = CASE
           WHEN $1 = 'NOTIFIED' THEN COALESCE("notifiedAt", NOW())
           ELSE "notifiedAt"
         END,
         "updatedAt" = NOW()
     WHERE id = $2 AND "organizationId" = $3`,[r,e,t]);if(!a)return null;await (0,n.writeAuditLog)({organizationId:t,actorId:i.id,actorName:i.name??void 0,entityType:"WaitingListEntry",entityId:e,action:"UPDATE",after:{status:r}}).catch(()=>void 0);let{rows:s}=await m.query(`${I} WHERE w.id = $1 AND w."organizationId" = $2`,[e,t]);return s[0]?d(s[0]):null}async function f(t){let{rows:e}=await m.query(`UPDATE "WaitingListEntry"
     SET status = 'EXPIRED'::"WaitingListStatus", "updatedAt" = NOW()
     WHERE "organizationId" = $1
       AND status = 'WAITING'::"WaitingListStatus"
       AND "expiresAt" IS NOT NULL
       AND "expiresAt" < NOW()
     RETURNING id`,[t]);return e.length}async function l(t){await f(t.organizationId);let e=t.startAt.toISOString().slice(0,10),i=t.startAt.toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit",hour12:!1,timeZone:"Africa/Casablanca"}),{rows:a}=await m.query(`SELECT id, "customerId", "preferredTimeFrom", "preferredTimeTo", "staffId"
     FROM "WaitingListEntry"
     WHERE "organizationId" = $1
       AND status = 'WAITING'::"WaitingListStatus"
       AND "serviceId" = $2
       AND "preferredDate" = $3::date
       AND ("staffId" IS NULL OR "staffId" = $4)
     ORDER BY "createdAt" ASC
     LIMIT 5`,[t.organizationId,t.serviceId,e,t.staffId]),s=a.filter(t=>(!t.preferredTimeFrom||!(i<t.preferredTimeFrom))&&(!t.preferredTimeTo||!(i>t.preferredTimeTo)));if(!s.length)return{notified:0};let{enqueueWaitingListOffer:n}=await Promise.all([r.e(7729),r.e(9439)]).then(r.bind(r,17729)),o=0;for(let e of s)try{await n({organizationId:t.organizationId,customerId:e.customerId,appointmentId:t.appointmentId,waitingListEntryId:e.id,serviceId:t.serviceId,startAt:t.startAt}),await p(t.organizationId,e.id,"NOTIFIED",t.actor),o+=1}catch(t){console.error("[notifyWaitingListOnCancellation]",t)}return{notified:o}}i()}catch(t){i(t)}})}};var e=require("../../../../webpack-runtime.js");e.C(t);var r=t=>e(e.s=t),i=e.X(0,[8948,7070,3314,3376,3568],()=>r(7797));module.exports=i})();