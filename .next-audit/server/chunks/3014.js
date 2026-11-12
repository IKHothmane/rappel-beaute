"use strict";!function(){try{var t="undefined"!=typeof window?window:"undefined"!=typeof global?global:"undefined"!=typeof self?self:{},a=(new t.Error).stack;a&&(t._sentryDebugIds=t._sentryDebugIds||{},t._sentryDebugIds[a]="28960590-4b83-4693-9d78-022c6c01affc",t._sentryDebugIdIdentifier="sentry-dbid-28960590-4b83-4693-9d78-022c6c01affc")}catch(t){}}(),exports.id=3014,exports.ids=[3014],exports.modules={3014:(t,a,e)=>{e.a(t,async(t,i)=>{try{e.d(a,{$L:()=>L,Eu:()=>g,Lb:()=>m,OW:()=>f,Ty:()=>c,ed:()=>T,gD:()=>h,getPlatformUsersKpis:()=>A,iH:()=>S,l6:()=>N,qQ:()=>O,yF:()=>R});var n=e(84770),r=e(8678),o=e(90831),s=e(8530),l=e(66085),d=e(74157),u=t([r,l,d]);[r,l,d]=u.then?(await u)():u;let y=(0,o.S)(new r.Pool({connectionString:process.env.DATABASE_URL})),p=["OWNER","MANAGER","STAFF","CASHIER","ACCOUNTANT"];function E(t){return`${t.firstName} ${t.lastName}`.trim()}async function I(t,a){let e=E(t);await (0,d._)({platformUserId:t.id,platformUserName:e,organizationId:a.organizationId,entityType:"User",entityId:a.entityId,action:a.action,before:a.before,after:a.after}),await (0,l.writeAuditLog)({organizationId:a.organizationId,actorId:t.id,actorName:`Super Admin \xb7 ${e}`,entityType:"User",entityId:a.entityId,action:a.action,before:a.before,after:a.after}).catch(()=>null)}function m(t){return p.includes(t)}async function A(){let{rows:t}=await y.query(`SELECT
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
     ) login ON true`),{rows:a}=await y.query("SELECT COUNT(*)::text AS c FROM \"PlatformUser\" WHERE status = 'ACTIVE'"),{rows:e}=await y.query("SELECT COUNT(*)::text AS c FROM \"Organization\" WHERE status = 'ACTIVE'"),{rows:i}=await y.query('SELECT role::text AS role, COUNT(*)::text AS c FROM "User" GROUP BY role'),n=parseInt(a[0]?.c??"0",10),r=parseInt(t[0]?.total??"0",10)+n,o=parseInt(t[0]?.active??"0",10)+n,s={};for(let t of i)s[t.role]=parseInt(t.c??"0",10);return n>0&&(s.SUPER_ADMIN=(s.SUPER_ADMIN??0)+n),{total:r,active:o,disabled:parseInt(t[0]?.disabled??"0",10),thisMonth:parseInt(t[0]?.month??"0",10),inactive:parseInt(t[0]?.inactive??"0",10),onlineToday:parseInt(t[0]?.onlineToday??"0",10),watchlist:parseInt(t[0]?.watchlist??"0",10),orgsCount:parseInt(e[0]?.c??"0",10),roleShare:s}}async function N(t){let a=Math.min(t?.limit??200,500),e=[],i=[];t?.search?.trim()&&(e.push(`%${t.search.trim().toLowerCase()}%`),i.push(`(LOWER(u.email) LIKE $${e.length}
        OR LOWER(u."firstName") LIKE $${e.length}
        OR LOWER(u."lastName") LIKE $${e.length}
        OR LOWER(COALESCE(u.phone, '')) LIKE $${e.length}
        OR LOWER(u.id) LIKE $${e.length}
        OR LOWER(o.name) LIKE $${e.length})`)),t?.role&&"SUPER_ADMIN"!==t.role&&(e.push(t.role),i.push(`u.role = $${e.length}::"UserRole"`)),t?.status&&(e.push(t.status),i.push(`u.status = $${e.length}::"OrgUserStatus"`)),t?.organizationId&&(e.push(t.organizationId),i.push(`u."organizationId" = $${e.length}`));let n=i.length?`WHERE ${i.join(" AND ")}`:"";e.push(a);let r=t?.role!=="SUPER_ADMIN",o=!t?.organizationId&&(!t?.role||"SUPER_ADMIN"===t.role)&&(!t?.status||"ACTIVE"===t.status),s=[];if(r){let{rows:t}=await y.query(`SELECT u.id, u.email, u."firstName", u."lastName", u.phone, u.role::text, u.status::text,
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
       ${n}
       ORDER BY COALESCE(login."createdAt", u."createdAt") DESC
       LIMIT $${e.length}`,e);for(let a of t)s.push({id:a.id,email:a.email??"",firstName:a.firstName,lastName:a.lastName,phone:a.phone,role:a.role,status:a.status,organizationId:a.organizationId,organizationName:a.organizationName,organizationCity:a.organizationCity,createdAt:a.createdAt.toISOString(),mustChangePassword:!!a.mustChangePassword,sessionVersion:a.sessionVersion??0,accountKind:"ORG",lastLoginAt:a.lastLoginAt?.toISOString()??null})}let l=[];if(o){let e=[],i=["status = 'ACTIVE'"];t?.search?.trim()&&(e.push(`%${t.search.trim().toLowerCase()}%`),i.push(`(LOWER(email) LIKE $${e.length}
          OR LOWER("firstName") LIKE $${e.length}
          OR LOWER("lastName") LIKE $${e.length})`)),e.push(Math.min(50,a));let{rows:n}=await y.query(`SELECT id, email, "firstName", "lastName", role::text, status::text, "createdAt"
       FROM "PlatformUser"
       WHERE ${i.join(" AND ")}
       ORDER BY "lastName", "firstName"
       LIMIT $${e.length}`,e);for(let t of n)l.push({id:t.id,email:t.email??"",firstName:t.firstName,lastName:t.lastName,phone:null,role:t.role,status:t.status,organizationId:null,organizationName:null,organizationCity:null,createdAt:t.createdAt.toISOString(),mustChangePassword:!1,sessionVersion:0,accountKind:"PLATFORM",lastLoginAt:null})}return[...l,...s].slice(0,a)}async function g(t){let{rows:a}=await y.query(`SELECT u.id, u.email, u."firstName", u."lastName", u.phone, u.role::text, u.status::text,
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
     WHERE u.id = $1`,[t]),e=a[0];if(e)return{id:e.id,email:e.email??"",firstName:e.firstName,lastName:e.lastName,phone:e.phone,role:e.role,status:e.status,organizationId:e.organizationId,organizationName:e.organizationName,organizationCity:e.organizationCity,createdAt:e.createdAt.toISOString(),mustChangePassword:!!e.mustChangePassword,sessionVersion:e.sessionVersion??0,accountKind:"ORG",lastLoginAt:e.lastLoginAt?.toISOString()??null};let{rows:i}=await y.query(`SELECT id, email, "firstName", "lastName", role::text, status::text, "createdAt"
     FROM "PlatformUser" WHERE id = $1`,[t]),n=i[0];return n?{id:n.id,email:n.email,firstName:n.firstName,lastName:n.lastName,phone:null,role:n.role,status:n.status,organizationId:null,organizationName:null,organizationCity:null,createdAt:n.createdAt.toISOString(),mustChangePassword:!1,sessionVersion:0,accountKind:"PLATFORM",lastLoginAt:null}:null}async function c(t,a,e,i){let n=await g(a);if(!n||"ORG"!==n.accountKind||!n.organizationId)throw Error("NOT_FOUND");await y.query('UPDATE "User" SET status = $2::"OrgUserStatus", "updatedAt" = NOW() WHERE id = $1',[a,e]),"DISABLED"===e&&await y.query('UPDATE "User" SET "sessionVersion" = "sessionVersion" + 1, "updatedAt" = NOW() WHERE id = $1',[a]);let r="DISABLED"===e?i?.asDelete?"USER_DELETED":"USER_DISABLED":"USER_REACTIVATED";await I(t,{organizationId:n.organizationId,entityId:a,action:r,before:{status:n.status,email:n.email},after:{status:e,email:n.email,softDeleted:!!i?.asDelete}})}async function R(t,a,e){let i=await g(a);if(!i||"ORG"!==i.accountKind||!i.organizationId)throw Error("NOT_FOUND");await y.query('UPDATE "User" SET role = $2::"UserRole", "updatedAt" = NOW() WHERE id = $1',[a,e]),await I(t,{organizationId:i.organizationId,entityId:a,action:"USER_ROLE_CHANGED",before:{role:i.role,email:i.email},after:{role:e,email:i.email}})}async function O(t,a,e){let i=await g(a);if(!i||"ORG"!==i.accountKind||!i.organizationId)throw Error("NOT_FOUND");let n=e.firstName?.trim()||i.firstName,r=e.lastName?.trim()||i.lastName,o=e.email?.trim().toLowerCase()||i.email;return await y.query(`UPDATE "User"
     SET "firstName" = $2, "lastName" = $3, email = $4,
         phone = COALESCE($5, phone), "updatedAt" = NOW()
     WHERE id = $1`,[a,n,r,o,e.phone??null]),await (0,d._)({platformUserId:t.id,platformUserName:E(t),organizationId:i.organizationId,entityType:"User",entityId:a,action:"USER_UPDATED",before:{firstName:i.firstName,lastName:i.lastName,email:i.email},after:{firstName:n,lastName:r,email:o}}),g(a)}async function f(t,a){let e=a.email.trim().toLowerCase(),i=a.firstName.trim(),r=a.lastName.trim(),o=a.password;if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e))throw Error("EMAIL_INVALID");if(o.length<8)throw Error("PASSWORD_SHORT");if(i.length<1||r.length<1)throw Error("NAME_REQUIRED");let{rows:l}=await y.query('SELECT id FROM "PlatformUser" WHERE LOWER(email) = $1 LIMIT 1',[e]);if(l[0])throw Error("EMAIL_TAKEN");let u=`pu_${(0,n.randomBytes)(8).toString("hex")}`;return await y.query(`INSERT INTO "PlatformUser" (
      id, email, "firstName", "lastName", role, status, "passwordHash", "updatedAt"
    ) VALUES ($1, $2, $3, $4, 'SUPER_ADMIN', 'ACTIVE', $5, NOW())`,[u,e,i,r,(0,s.c_)(o)]),await (0,d._)({platformUserId:t.id,platformUserName:E(t),entityType:"PlatformUser",entityId:u,action:"PLATFORM_ADMIN_CREATED",after:{email:e,firstName:i,lastName:r,role:"SUPER_ADMIN"}}),{id:u,email:e,firstName:i,lastName:r}}async function S(t,a){let e=await g(a);if(!e||"ORG"!==e.accountKind||!e.organizationId)throw Error("NOT_FOUND");if("ACTIVE"!==e.status)throw Error("USER_DISABLED");let i="Beauty2026!",n=(0,s.c_)(i);return await y.query(`UPDATE "User"
     SET "passwordHash" = $1,
         "mustChangePassword" = true,
         "sessionVersion" = "sessionVersion" + 1,
         "updatedAt" = NOW()
     WHERE id = $2`,[n,a]),await I(t,{organizationId:e.organizationId,entityId:a,action:"USER_PASSWORD_RESET",before:{email:e.email},after:{mustChangePassword:!0,temporaryPasswordIssued:!0}}),{temporaryPassword:i,email:e.email,firstName:e.firstName,lastName:e.lastName}}async function T(t,a){let e=await g(a);if(!e||"ORG"!==e.accountKind||!e.organizationId)throw Error("NOT_FOUND");await y.query(`UPDATE "User"
     SET "sessionVersion" = "sessionVersion" + 1, "updatedAt" = NOW()
     WHERE id = $1`,[a]),await I(t,{organizationId:e.organizationId,entityId:a,action:"USER_SESSIONS_INVALIDATED",before:{email:e.email},after:{sessionsInvalidated:!0}})}async function L(){let{rows:t}=await y.query("SELECT id, name FROM \"Organization\" WHERE status <> 'ARCHIVED' ORDER BY name");return t}async function h(t){let a=Math.min(t.limit??40,100),e=[],i=[];t.userId&&(e.push(t.userId),i.push(`a."entityId" = $${e.length}`)),t.organizationId&&(e.push(t.organizationId),i.push(`a."organizationId" = $${e.length}`)),e.push(a);let n=i.length?`WHERE ${i.join(" AND ")}`:"",{rows:r}=await y.query(`SELECT a.id, a."platformUserName", a."organizationId", o.name AS "organizationName",
            a.action, a."entityType", a."entityId", a."createdAt"
     FROM "PlatformAuditLog" a
     LEFT JOIN "Organization" o ON o.id = a."organizationId"
     ${n}
     ORDER BY a."createdAt" DESC
     LIMIT $${e.length}`,e);return r.map(t=>({id:t.id,platformUserName:t.platformUserName,organizationId:t.organizationId,organizationName:t.organizationName,action:t.action,entityType:t.entityType,entityId:t.entityId,createdAt:t.createdAt.toISOString()}))}i()}catch(t){i(t)}})}};