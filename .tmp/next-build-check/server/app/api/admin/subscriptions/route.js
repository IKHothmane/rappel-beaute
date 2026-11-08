"use strict";(()=>{var t={};t.id=3759,t.ids=[3759,3735],t.modules={72934:t=>{t.exports=require("next/dist/client/components/action-async-storage.external.js")},54580:t=>{t.exports=require("next/dist/client/components/request-async-storage.external.js")},45869:t=>{t.exports=require("next/dist/client/components/static-generation-async-storage.external.js")},20399:t=>{t.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},30517:t=>{t.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},48927:t=>{t.exports=require("web-push")},84770:t=>{t.exports=require("crypto")},92048:t=>{t.exports=require("fs")},71568:t=>{t.exports=require("zlib")},8678:t=>{t.exports=import("pg")},6005:t=>{t.exports=require("node:crypto")},42725:t=>{t.exports=require("node:http2")},80086:(t,e,a)=>{a.a(t,async(t,i)=>{try{a.r(e),a.d(e,{originalPathname:()=>I,patchFetch:()=>u,requestAsyncStorage:()=>E,routeModule:()=>d,serverHooks:()=>c,staticGenerationAsyncStorage:()=>m});var r=a(49303),n=a(88716),o=a(60670),s=a(36599),l=t([s]);s=(l.then?(await l)():l)[0];let d=new r.AppRouteRouteModule({definition:{kind:n.x.APP_ROUTE,page:"/api/admin/subscriptions/route",pathname:"/api/admin/subscriptions",filename:"route",bundlePath:"app/api/admin/subscriptions/route"},resolvedPagePath:"C:\\Users\\LordOfTHeRings\\Desktop\\rappel beauty\\src\\app\\api\\admin\\subscriptions\\route.ts",nextConfigOutput:"",userland:s}),{requestAsyncStorage:E,staticGenerationAsyncStorage:m,serverHooks:c}=d,I="/api/admin/subscriptions/route";function u(){return(0,o.patchFetch)({serverHooks:c,staticGenerationAsyncStorage:m})}i()}catch(t){i(t)}})},36599:(t,e,a)=>{a.a(t,async(t,i)=>{try{a.r(e),a.d(e,{GET:()=>u,POST:()=>d});var r=a(82503),n=a(70502),o=a(73735),s=a(20051),l=t([r,n,o,s]);async function u(t){let e=(0,r.kF)(t);if(!e.ok)return e.response;let a=t.nextUrl.searchParams,i=a.get("status")??void 0,[l,u,d,E,m]=await Promise.all([(0,n.oj)({search:a.get("search")??void 0,planCode:a.get("plan")??void 0,status:i,organizationId:a.get("organizationId")??void 0}),(0,n.getAdminSubscriptionsKpis)(),(0,n.du)(!0),(0,o.$L)(),(0,s.BU)()]);return(0,r.Xj)({items:l,kpis:u,plans:d,organizations:E,showcasePrice:m})}async function d(t){let e=(0,r.kF)(t);if(!e.ok)return e.response;try{let a=await t.json();if(!a.organizationId||!a.planCode)return(0,r._V)("organizationId et planCode requis.",400);let i=await (0,n.C3)(e.session,{organizationId:a.organizationId,planCode:a.planCode});return(0,r.Xj)({ok:!0,id:i},201)}catch(e){let t=e instanceof Error?e.message:"";if("PLAN_NOT_FOUND"===t)return(0,r._V)("Plan introuvable.",404);return console.error("[POST /api/admin/subscriptions]",e),(0,r._V)("Cr\xe9ation impossible.",500)}}[r,n,o,s]=l.then?(await l)():l,i()}catch(t){i(t)}})},73735:(t,e,a)=>{a.a(t,async(t,i)=>{try{a.d(e,{$L:()=>f,Eu:()=>g,Lb:()=>m,OW:()=>O,Ty:()=>A,ed:()=>h,gD:()=>T,getPlatformUsersKpis:()=>c,iH:()=>R,l6:()=>I,qQ:()=>p,yF:()=>N});var r=a(84770),n=a(8678),o=a(47041),s=a(2192),l=a(51161),u=t([n,s,l]);[n,s,l]=u.then?(await u)():u;let S=new n.Pool({connectionString:process.env.DATABASE_URL}),L=["OWNER","MANAGER","STAFF","CASHIER","ACCOUNTANT"];function d(t){return`${t.firstName} ${t.lastName}`.trim()}async function E(t,e){let a=d(t);await (0,l._)({platformUserId:t.id,platformUserName:a,organizationId:e.organizationId,entityType:"User",entityId:e.entityId,action:e.action,before:e.before,after:e.after}),await (0,s.writeAuditLog)({organizationId:e.organizationId,actorId:t.id,actorName:`Super Admin \xb7 ${a}`,entityType:"User",entityId:e.entityId,action:e.action,before:e.before,after:e.after}).catch(()=>null)}function m(t){return L.includes(t)}async function c(){let{rows:t}=await S.query(`SELECT
      COUNT(*)::text AS total,
      COUNT(*) FILTER (WHERE u.status = 'ACTIVE')::text AS active,
      COUNT(*) FILTER (WHERE u.status = 'DISABLED')::text AS disabled,
      COUNT(*) FILTER (WHERE u."createdAt" >= date_trunc('month', NOW()))::text AS month,
      COUNT(*) FILTER (
        WHERE u.status = 'ACTIVE'
          AND (login."createdAt" IS NULL OR login."createdAt" < NOW() - INTERVAL '30 days')
      )::text AS inactive,
      COUNT(*) FILTER (
        WHERE u.status = 'ACTIVE'
          AND login."createdAt" >= date_trunc('day', NOW())
      )::text AS onlineToday,
      COUNT(*) FILTER (
        WHERE u.status = 'ACTIVE' AND u."mustChangePassword" = true
      )::text AS watchlist
     FROM "User" u
     LEFT JOIN LATERAL (
       SELECT a."createdAt" FROM "AuditLog" a
       WHERE a."entityId" = u.id AND a.action = 'LOGIN'
       ORDER BY a."createdAt" DESC LIMIT 1
     ) login ON true`),{rows:e}=await S.query("SELECT COUNT(*)::text AS c FROM \"PlatformUser\" WHERE status = 'ACTIVE'"),{rows:a}=await S.query("SELECT COUNT(*)::text AS c FROM \"Organization\" WHERE status = 'ACTIVE'"),{rows:i}=await S.query('SELECT role::text AS role, COUNT(*)::text AS c FROM "User" GROUP BY role'),r=parseInt(e[0]?.c??"0",10),n=parseInt(t[0]?.total??"0",10)+r,o=parseInt(t[0]?.active??"0",10)+r,s={};for(let t of i)s[t.role]=parseInt(t.c??"0",10);return r>0&&(s.SUPER_ADMIN=(s.SUPER_ADMIN??0)+r),{total:n,active:o,disabled:parseInt(t[0]?.disabled??"0",10),thisMonth:parseInt(t[0]?.month??"0",10),inactive:parseInt(t[0]?.inactive??"0",10),onlineToday:parseInt(t[0]?.onlineToday??"0",10),watchlist:parseInt(t[0]?.watchlist??"0",10),orgsCount:parseInt(a[0]?.c??"0",10),roleShare:s}}async function I(t){let e=Math.min(t?.limit??200,500),a=[],i=[];t?.search?.trim()&&(a.push(`%${t.search.trim().toLowerCase()}%`),i.push(`(LOWER(u.email) LIKE $${a.length}
        OR LOWER(u."firstName") LIKE $${a.length}
        OR LOWER(u."lastName") LIKE $${a.length}
        OR LOWER(COALESCE(u.phone, '')) LIKE $${a.length}
        OR LOWER(u.id) LIKE $${a.length}
        OR LOWER(o.name) LIKE $${a.length})`)),t?.role&&"SUPER_ADMIN"!==t.role&&(a.push(t.role),i.push(`u.role = $${a.length}::"UserRole"`)),t?.status&&(a.push(t.status),i.push(`u.status = $${a.length}::"OrgUserStatus"`)),t?.organizationId&&(a.push(t.organizationId),i.push(`u."organizationId" = $${a.length}`));let r=i.length?`WHERE ${i.join(" AND ")}`:"";a.push(e);let n=t?.role!=="SUPER_ADMIN",o=!t?.organizationId&&(!t?.role||"SUPER_ADMIN"===t.role)&&(!t?.status||"ACTIVE"===t.status),s=[];if(n){let{rows:t}=await S.query(`SELECT u.id, u.email, u."firstName", u."lastName", u.phone, u.role::text, u.status::text,
              u."organizationId", o.name AS "organizationName", o.city AS "organizationCity",
              u."createdAt", u."mustChangePassword", u."sessionVersion",
              login."createdAt" AS "lastLoginAt"
       FROM "User" u
       JOIN "Organization" o ON o.id = u."organizationId"
       LEFT JOIN LATERAL (
         SELECT a."createdAt" FROM "AuditLog" a
         WHERE a."entityId" = u.id AND a.action = 'LOGIN'
         ORDER BY a."createdAt" DESC LIMIT 1
       ) login ON true
       ${r}
       ORDER BY COALESCE(login."createdAt", u."createdAt") DESC
       LIMIT $${a.length}`,a);for(let e of t)s.push({id:e.id,email:e.email??"",firstName:e.firstName,lastName:e.lastName,phone:e.phone,role:e.role,status:e.status,organizationId:e.organizationId,organizationName:e.organizationName,organizationCity:e.organizationCity,createdAt:e.createdAt.toISOString(),mustChangePassword:!!e.mustChangePassword,sessionVersion:e.sessionVersion??0,accountKind:"ORG",lastLoginAt:e.lastLoginAt?.toISOString()??null})}let l=[];if(o){let a=[],i=["status = 'ACTIVE'"];t?.search?.trim()&&(a.push(`%${t.search.trim().toLowerCase()}%`),i.push(`(LOWER(email) LIKE $${a.length}
          OR LOWER("firstName") LIKE $${a.length}
          OR LOWER("lastName") LIKE $${a.length})`)),a.push(Math.min(50,e));let{rows:r}=await S.query(`SELECT id, email, "firstName", "lastName", role::text, status::text, "createdAt"
       FROM "PlatformUser"
       WHERE ${i.join(" AND ")}
       ORDER BY "lastName", "firstName"
       LIMIT $${a.length}`,a);for(let t of r)l.push({id:t.id,email:t.email??"",firstName:t.firstName,lastName:t.lastName,phone:null,role:t.role,status:t.status,organizationId:null,organizationName:null,organizationCity:null,createdAt:t.createdAt.toISOString(),mustChangePassword:!1,sessionVersion:0,accountKind:"PLATFORM",lastLoginAt:null})}return[...l,...s].slice(0,e)}async function g(t){let{rows:e}=await S.query(`SELECT u.id, u.email, u."firstName", u."lastName", u.phone, u.role::text, u.status::text,
            u."organizationId", o.name AS "organizationName", o.city AS "organizationCity",
            u."createdAt", u."mustChangePassword", u."sessionVersion",
            login."createdAt" AS "lastLoginAt"
     FROM "User" u
     JOIN "Organization" o ON o.id = u."organizationId"
     LEFT JOIN LATERAL (
       SELECT a."createdAt" FROM "AuditLog" a
       WHERE a."entityId" = u.id AND a.action = 'LOGIN'
       ORDER BY a."createdAt" DESC LIMIT 1
     ) login ON true
     WHERE u.id = $1`,[t]),a=e[0];if(a)return{id:a.id,email:a.email??"",firstName:a.firstName,lastName:a.lastName,phone:a.phone,role:a.role,status:a.status,organizationId:a.organizationId,organizationName:a.organizationName,organizationCity:a.organizationCity,createdAt:a.createdAt.toISOString(),mustChangePassword:!!a.mustChangePassword,sessionVersion:a.sessionVersion??0,accountKind:"ORG",lastLoginAt:a.lastLoginAt?.toISOString()??null};let{rows:i}=await S.query(`SELECT id, email, "firstName", "lastName", role::text, status::text, "createdAt"
     FROM "PlatformUser" WHERE id = $1`,[t]),r=i[0];return r?{id:r.id,email:r.email,firstName:r.firstName,lastName:r.lastName,phone:null,role:r.role,status:r.status,organizationId:null,organizationName:null,organizationCity:null,createdAt:r.createdAt.toISOString(),mustChangePassword:!1,sessionVersion:0,accountKind:"PLATFORM",lastLoginAt:null}:null}async function A(t,e,a,i){let r=await g(e);if(!r||"ORG"!==r.accountKind||!r.organizationId)throw Error("NOT_FOUND");await S.query('UPDATE "User" SET status = $2::"OrgUserStatus", "updatedAt" = NOW() WHERE id = $1',[e,a]),"DISABLED"===a&&await S.query('UPDATE "User" SET "sessionVersion" = "sessionVersion" + 1, "updatedAt" = NOW() WHERE id = $1',[e]);let n="DISABLED"===a?i?.asDelete?"USER_DELETED":"USER_DISABLED":"USER_REACTIVATED";await E(t,{organizationId:r.organizationId,entityId:e,action:n,before:{status:r.status,email:r.email},after:{status:a,email:r.email,softDeleted:!!i?.asDelete}})}async function N(t,e,a){let i=await g(e);if(!i||"ORG"!==i.accountKind||!i.organizationId)throw Error("NOT_FOUND");await S.query('UPDATE "User" SET role = $2::"UserRole", "updatedAt" = NOW() WHERE id = $1',[e,a]),await E(t,{organizationId:i.organizationId,entityId:e,action:"USER_ROLE_CHANGED",before:{role:i.role,email:i.email},after:{role:a,email:i.email}})}async function p(t,e,a){let i=await g(e);if(!i||"ORG"!==i.accountKind||!i.organizationId)throw Error("NOT_FOUND");let r=a.firstName?.trim()||i.firstName,n=a.lastName?.trim()||i.lastName,o=a.email?.trim().toLowerCase()||i.email;return await S.query(`UPDATE "User"
     SET "firstName" = $2, "lastName" = $3, email = $4,
         phone = COALESCE($5, phone), "updatedAt" = NOW()
     WHERE id = $1`,[e,r,n,o,a.phone??null]),await (0,l._)({platformUserId:t.id,platformUserName:d(t),organizationId:i.organizationId,entityType:"User",entityId:e,action:"USER_UPDATED",before:{firstName:i.firstName,lastName:i.lastName,email:i.email},after:{firstName:r,lastName:n,email:o}}),g(e)}async function O(t,e){let a=e.email.trim().toLowerCase(),i=e.firstName.trim(),n=e.lastName.trim(),s=e.password;if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(a))throw Error("EMAIL_INVALID");if(s.length<8)throw Error("PASSWORD_SHORT");if(i.length<1||n.length<1)throw Error("NAME_REQUIRED");let{rows:u}=await S.query('SELECT id FROM "PlatformUser" WHERE LOWER(email) = $1 LIMIT 1',[a]);if(u[0])throw Error("EMAIL_TAKEN");let E=`pu_${(0,r.randomBytes)(8).toString("hex")}`;return await S.query(`INSERT INTO "PlatformUser" (
      id, email, "firstName", "lastName", role, status, "passwordHash", "updatedAt"
    ) VALUES ($1, $2, $3, $4, 'SUPER_ADMIN', 'ACTIVE', $5, NOW())`,[E,a,i,n,(0,o.c_)(s)]),await (0,l._)({platformUserId:t.id,platformUserName:d(t),entityType:"PlatformUser",entityId:E,action:"PLATFORM_ADMIN_CREATED",after:{email:a,firstName:i,lastName:n,role:"SUPER_ADMIN"}}),{id:E,email:a,firstName:i,lastName:n}}async function R(t,e){let a=await g(e);if(!a||"ORG"!==a.accountKind||!a.organizationId)throw Error("NOT_FOUND");if("ACTIVE"!==a.status)throw Error("USER_DISABLED");let i="Beauty2026!",r=(0,o.c_)(i);return await S.query(`UPDATE "User"
     SET "passwordHash" = $1,
         "mustChangePassword" = true,
         "sessionVersion" = "sessionVersion" + 1,
         "updatedAt" = NOW()
     WHERE id = $2`,[r,e]),await E(t,{organizationId:a.organizationId,entityId:e,action:"USER_PASSWORD_RESET",before:{email:a.email},after:{mustChangePassword:!0,temporaryPasswordIssued:!0}}),{temporaryPassword:i,email:a.email,firstName:a.firstName,lastName:a.lastName}}async function h(t,e){let a=await g(e);if(!a||"ORG"!==a.accountKind||!a.organizationId)throw Error("NOT_FOUND");await S.query(`UPDATE "User"
     SET "sessionVersion" = "sessionVersion" + 1, "updatedAt" = NOW()
     WHERE id = $1`,[e]),await E(t,{organizationId:a.organizationId,entityId:e,action:"USER_SESSIONS_INVALIDATED",before:{email:a.email},after:{sessionsInvalidated:!0}})}async function f(){let{rows:t}=await S.query("SELECT id, name FROM \"Organization\" WHERE status <> 'ARCHIVED' ORDER BY name");return t}async function T(t){let e=Math.min(t.limit??40,100),a=[],i=[];t.userId&&(a.push(t.userId),i.push(`a."entityId" = $${a.length}`)),t.organizationId&&(a.push(t.organizationId),i.push(`a."organizationId" = $${a.length}`)),a.push(e);let r=i.length?`WHERE ${i.join(" AND ")}`:"",{rows:n}=await S.query(`SELECT a.id, a."platformUserName", a."organizationId", o.name AS "organizationName",
            a.action, a."entityType", a."entityId", a."createdAt"
     FROM "PlatformAuditLog" a
     LEFT JOIN "Organization" o ON o.id = a."organizationId"
     ${r}
     ORDER BY a."createdAt" DESC
     LIMIT $${a.length}`,a);return n.map(t=>({id:t.id,platformUserName:t.platformUserName,organizationId:t.organizationId,organizationName:t.organizationName,action:t.action,entityType:t.entityType,entityId:t.entityId,createdAt:t.createdAt.toISOString()}))}i()}catch(t){i(t)}})}};var e=require("../../../../webpack-runtime.js");e.C(t);var a=t=>e(e.s=t),i=e.X(0,[8948,7070,3314,3376,3568,1568],()=>a(80086));module.exports=i})();