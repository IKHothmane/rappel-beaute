"use strict";!function(){try{var t="undefined"!=typeof window?window:"undefined"!=typeof global?global:"undefined"!=typeof self?self:{},a=(new t.Error).stack;a&&(t._sentryDebugIds=t._sentryDebugIds||{},t._sentryDebugIds[a]="3cf17180-6f43-44cd-b01b-29b7d5631291",t._sentryDebugIdIdentifier="sentry-dbid-3cf17180-6f43-44cd-b01b-29b7d5631291")}catch(t){}}(),exports.id=6893,exports.ids=[6893],exports.modules={66893:(t,a,e)=>{e.a(t,async(t,r)=>{try{e.d(a,{$9:()=>T,FV:()=>y,I3:()=>F,Mg:()=>h,Mz:()=>f,Ov:()=>C,PQ:()=>g,TB:()=>z,X8:()=>$,ZC:()=>U,_d:()=>S,_u:()=>L,createOrganization:()=>w,dh:()=>_,m1:()=>W,s1:()=>c,zG:()=>D});var i=e(84770),n=e(8678),o=e(90831),s=e(74157),E=e(34793),d=e(16340),u=e(31916),l=e(79333),I=e(67487),N=t([n,s,E,d,u,l]);[n,s,E,d,u,l]=N.then?(await N)():N;let M=(0,o.S)(new n.Pool({connectionString:process.env.DATABASE_URL}));function p(t){return`${t}_${(0,i.randomBytes)(6).toString("hex")}`}function A(t){return`${t.firstName} ${t.lastName}`.trim()}async function O(t,a){await t.query(`INSERT INTO "ReactivationSettings" (id, "organizationId", "updatedAt")
     VALUES ($1, $2, NOW()) ON CONFLICT ("organizationId") DO NOTHING`,[p("rset"),a]),await t.query(`INSERT INTO "ReviewSettings" (id, "organizationId", "updatedAt")
     VALUES ($1, $2, NOW()) ON CONFLICT ("organizationId") DO NOTHING`,[p("rvset"),a]),await t.query(`INSERT INTO "LoyaltyProgram" (id, "organizationId", "updatedAt")
     VALUES ($1, $2, NOW()) ON CONFLICT ("organizationId") DO NOTHING`,[p("loy"),a])}async function S(){let{rows:t}=await M.query(`SELECT
      COUNT(*)::text AS total,
      COUNT(*) FILTER (WHERE status = 'ACTIVE')::text AS active,
      COUNT(*) FILTER (WHERE "createdAt" >= date_trunc('month', NOW()))::text AS month
     FROM "Organization"`),{rows:a}=await M.query(`SELECT
      COUNT(*)::text AS total,
      COUNT(*) FILTER (WHERE "createdAt" >= date_trunc('month', NOW()))::text AS month
     FROM "User"`),{rows:e}=await M.query(`SELECT
      COALESCE(SUM("priceSnapshot") FILTER (WHERE status IN ('ACTIVE', 'TRIAL', 'PAST_DUE')), 0)::text AS mrr,
      COUNT(*) FILTER (WHERE status IN ('ACTIVE', 'TRIAL'))::text AS active
     FROM "Subscription" s
     WHERE s.id = (
       SELECT s2.id FROM "Subscription" s2
       WHERE s2."organizationId" = s."organizationId"
       ORDER BY s2."createdAt" DESC LIMIT 1
     )`),{rows:r}=await M.query(`SELECT COUNT(*)::text AS c FROM "Appointment"
     WHERE "startAt" >= date_trunc('month', NOW())
       AND status NOT IN ('CANCELLED')`),{rows:i}=await M.query("SELECT COUNT(*)::text AS c FROM \"Customer\" WHERE status != 'ARCHIVED'"),n=parseFloat(e[0]?.mrr??"0");return{orgs:parseInt(t[0]?.total??"0",10),orgsActive:parseInt(t[0]?.active??"0",10),orgsDelta:parseInt(t[0]?.month??"0",10),users:parseInt(a[0]?.total??"0",10),usersDelta:parseInt(a[0]?.month??"0",10),mrr:n,arr:12*n,activeSubs:parseInt(e[0]?.active??"0",10),rdv:parseInt(r[0]?.c??"0",10),customers:parseInt(i[0]?.c??"0",10)}}function m(t){return{id:t.id,name:t.name,slug:t.slug,city:t.city,phone:t.phone,email:t.email,logoUrl:t.logoUrl??null,status:t.status,plan:t.plan,ownerName:t.ownerFirst&&t.ownerLast?`${t.ownerFirst} ${t.ownerLast}`.trim():null,ownerEmail:t.ownerEmail,createdAt:t.createdAt.toISOString(),mrr:t.subPrice?parseFloat(t.subPrice):0,usersCount:parseInt(t.usersCount??"0",10),subscriptionId:t.subscriptionId??null,subscriptionStatus:t.subStatus??null,renewAt:t.renewAt?t.renewAt.toISOString():null}}let H=`
  SELECT
    o.id, o.name, o.slug, o.city, o.phone, o.email, o."logoUrl", o.status, o."createdAt",
    p.code AS plan, s."priceSnapshot"::text AS "subPrice",
    s.id AS "subscriptionId",
    s.status AS "subStatus", s."currentPeriodEnd" AS "renewAt",
    u."firstName" AS "ownerFirst", u."lastName" AS "ownerLast", u.email AS "ownerEmail",
    (SELECT COUNT(*)::text FROM "User" WHERE "organizationId" = o.id) AS "usersCount"
  FROM "Organization" o
  LEFT JOIN LATERAL (
    SELECT id, "planId", "priceSnapshot", status, "currentPeriodEnd" FROM "Subscription"
    WHERE "organizationId" = o.id
    ORDER BY "createdAt" DESC LIMIT 1
  ) s ON true
  LEFT JOIN "Plan" p ON p.id = s."planId"
  LEFT JOIN LATERAL (
    SELECT "firstName", "lastName", email FROM "User"
    WHERE "organizationId" = o.id AND role = 'OWNER'
    ORDER BY "createdAt" ASC LIMIT 1
  ) u ON true
`;async function c(t){let a=[],e=[];t?.search&&(a.push(`%${t.search.trim()}%`),e.push(`(o.name ILIKE $${a.length}
        OR o.slug ILIKE $${a.length}
        OR o.email ILIKE $${a.length}
        OR o.city ILIKE $${a.length}
        OR u.email ILIKE $${a.length}
        OR CONCAT(u."firstName", ' ', u."lastName") ILIKE $${a.length})`)),t?.status&&(a.push(t.status),e.push(`o.status = $${a.length}`)),t?.plan&&(a.push(t.plan),e.push(`p.code = $${a.length}`));let r=e.length?`WHERE ${e.join(" AND ")}`:"",{rows:i}=await M.query(`${H} ${r} ORDER BY o."createdAt" DESC`,a);return i.map(m)}async function T(t){let{rows:a}=await M.query(`SELECT
      o.id, o.name, o.slug, o.city, o.phone, o.email, o."logoUrl", o.status, o.address, o."createdAt",
      p.code AS plan, s."priceSnapshot"::text AS "subPrice",
      s.id AS "subscriptionId",
      s.status AS "subStatus", s."currentPeriodEnd" AS "renewAt",
      u."firstName" AS "ownerFirst", u."lastName" AS "ownerLast", u.email AS "ownerEmail",
      u.phone AS "ownerPhone",
      (SELECT COUNT(*)::text FROM "User" WHERE "organizationId" = o.id) AS "usersCount"
    FROM "Organization" o
    LEFT JOIN LATERAL (
      SELECT id, "planId", "priceSnapshot", status, "currentPeriodEnd" FROM "Subscription"
      WHERE "organizationId" = o.id ORDER BY "createdAt" DESC LIMIT 1
    ) s ON true
    LEFT JOIN "Plan" p ON p.id = s."planId"
    LEFT JOIN LATERAL (
      SELECT "firstName", "lastName", email, phone FROM "User"
      WHERE "organizationId" = o.id AND role = 'OWNER'
      ORDER BY "createdAt" ASC LIMIT 1
    ) u ON true
    WHERE o.id = $1`,[t]),e=a[0];if(!e)return null;let{rows:r}=await M.query(`SELECT
      (SELECT COUNT(*)::text FROM "Customer" WHERE "organizationId" = $1 AND status != 'ARCHIVED') AS customers,
      (SELECT COUNT(*)::text FROM "Appointment" WHERE "organizationId" = $1 AND status NOT IN ('CANCELLED')) AS appointments,
      (SELECT COALESCE(SUM(amount),0)::text FROM "Payment" WHERE "organizationId" = $1 AND status = 'COMPLETED') AS revenue,
      (SELECT COUNT(*)::text FROM "Product" WHERE "organizationId" = $1 AND active = true) AS products,
      (SELECT COUNT(*)::text FROM "Staff" WHERE "organizationId" = $1 AND status = 'ACTIVE') AS staff`,[t]),{rows:i}=await M.query(`SELECT s.id, p.code AS "planCode", s."priceSnapshot"::text, s.status,
            s."startedAt", s."currentPeriodEnd", s.paid, s."paidAt"
     FROM "Subscription" s
     JOIN "Plan" p ON p.id = s."planId"
     WHERE s."organizationId" = $1
     ORDER BY s."createdAt" DESC LIMIT 1`,[t]),n=i[0],o=await M.query('SELECT "cardBackgroundUrl" FROM "LoyaltyProgram" WHERE "organizationId" = $1',[t]);return{...m(e),address:e.address??null,ownerPhone:e.ownerPhone??null,cardBackgroundUrl:o.rows[0]?.cardBackgroundUrl??null,stats:{customers:parseInt(r[0]?.customers??"0",10),appointments:parseInt(r[0]?.appointments??"0",10),revenue:parseFloat(r[0]?.revenue??"0"),products:parseInt(r[0]?.products??"0",10),staff:parseInt(r[0]?.staff??"0",10)},subscription:n?{id:n.id,plan:n.planCode,price:parseFloat(n.priceSnapshot),status:n.status,startAt:n.startedAt.toISOString(),renewAt:n.currentPeriodEnd.toISOString(),paid:!!n.paid,paidAt:n.paidAt?n.paidAt.toISOString():null}:null}}async function R(t,a){let e=[t.trim().toLowerCase()],r='SELECT 1 FROM "Organization" WHERE LOWER(slug) = $1';a&&(e.push(a),r+=" AND id != $2"),r+=" LIMIT 1";let{rows:i}=await M.query(r,e);return i.length>0}async function w(t,a){let e=a.slug.trim().toLowerCase().replace(/[^a-z0-9-]/g,"-");if(await R(e))throw Error("SLUG_TAKEN");let r=await (0,d.Le)(a.plan);if(!r||!r.active)throw Error("PLAN_NOT_FOUND");let n=p("org"),o=p("u"),E=p("sub"),u=p("act"),N=(0,i.randomBytes)(32).toString("hex"),S=new Date(Date.now()+6048e5),m=new Date,c=(0,l.RY)(m),T=a.owner.email.trim().toLowerCase(),w=await M.connect();try{await w.query("BEGIN");let{rows:i}=await w.query('SELECT id FROM "User" WHERE LOWER(email) = $1 LIMIT 1',[T]);if(i.length>0)throw Error("OWNER_EMAIL_TAKEN");await w.query(`INSERT INTO "Organization" (
        id, name, slug, address, city, phone, email, status, "updatedAt"
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,'ACTIVE',NOW())`,[n,a.name.trim(),e,a.address?.trim()||null,a.city?.trim()||null,a.phone.trim(),a.email.trim().toLowerCase()]),await w.query(`INSERT INTO "User" (
        id, "organizationId", email, "firstName", "lastName", phone, role, status, "passwordHash", "updatedAt"
      ) VALUES ($1,$2,$3,$4,$5,$6,'OWNER','ACTIVE',NULL,NOW())`,[o,n,T,a.owner.firstName.trim(),a.owner.lastName.trim(),a.owner.phone?.trim()||null]),await w.query(`INSERT INTO "Subscription" (
        id, "organizationId", "planId", status, "priceSnapshot", "currencySnapshot",
        "startedAt", "currentPeriodStart", "currentPeriodEnd", "trialEndsAt", "updatedAt"
      ) VALUES ($1,$2,$3,'TRIAL',$4,$5,$6,$6,$7,$7,NOW())`,[E,n,r.id,r.price,r.currency,m,c]),await w.query(`INSERT INTO "ActivationToken" (id, "userId", token, "expiresAt")
       VALUES ($1,$2,$3,$4)`,[u,o,N,S]),await O(w,n),await (0,s._)({platformUserId:t.id,platformUserName:A(t),organizationId:n,entityType:"Organization",entityId:n,action:"ORGANIZATION_CREATED",after:{name:a.name,slug:e,plan:a.plan,ownerEmail:T,subscriptionStatus:"TRIAL",trialDays:l.kr},client:w}),await (0,s._)({platformUserId:t.id,platformUserName:A(t),organizationId:n,entityType:"User",entityId:o,action:"OWNER_CREATED",after:{email:T,role:"OWNER"},client:w}),await w.query("COMMIT");let d=(0,I.bZ)()||"http://localhost:3000";return{organizationId:n,ownerUserId:o,subscriptionId:E,activationToken:N,activationUrl:`${d}/activate/?token=${N}&__host=app`}}catch(t){throw await w.query("ROLLBACK"),t}finally{w.release()}}async function y(t,a,e){let r=await T(a);if(!r)throw Error("NOT_FOUND");await M.query(`UPDATE "Organization" SET
      name = COALESCE($2, name),
      phone = COALESCE($3, phone),
      email = COALESCE($4, email),
      address = COALESCE($5, address),
      city = COALESCE($6, city),
      "updatedAt" = NOW()
     WHERE id = $1`,[a,e.name?.trim(),e.phone?.trim(),e.email?.trim()?.toLowerCase(),e.address,e.city]);let i=await T(a);await (0,s._)({platformUserId:t.id,platformUserName:A(t),organizationId:a,entityType:"Organization",entityId:a,action:"ORGANIZATION_UPDATED",before:{name:r.name,phone:r.phone,email:r.email},after:{name:i?.name,phone:i?.phone,email:i?.email}})}async function L(t,a){let e=await T(a);if(!e)throw Error("NOT_FOUND");"SUSPENDED"!==e.status&&(await M.query('UPDATE "Organization" SET status = \'SUSPENDED\', "updatedAt" = NOW() WHERE id = $1',[a]),await (0,s._)({platformUserId:t.id,platformUserName:A(t),organizationId:a,entityType:"Organization",entityId:a,action:"ORGANIZATION_SUSPENDED",before:{status:e.status},after:{status:"SUSPENDED"}}))}async function g(t,a){let e=await T(a);if(!e)throw Error("NOT_FOUND");"ACTIVE"!==e.status&&(await M.query('UPDATE "Organization" SET status = \'ACTIVE\', "updatedAt" = NOW() WHERE id = $1',[a]),await (0,s._)({platformUserId:t.id,platformUserName:A(t),organizationId:a,entityType:"Organization",entityId:a,action:"ORGANIZATION_REACTIVATED",before:{status:e.status},after:{status:"ACTIVE"}}))}let P=["LoyaltyEvent","LoyaltyRedemption","CommissionRecord","PosSale","Invoice","Purchase","Appointment","SupportTicket"];async function f(t,a){let e=await T(a);if(!e)throw Error("NOT_FOUND");let r=await M.connect();try{for(let i of(await r.query("BEGIN"),await (0,s._)({platformUserId:t.id,platformUserName:A(t),organizationId:a,entityType:"Organization",entityId:a,action:"ORGANIZATION_DELETED",before:{name:e.name,slug:e.slug,status:e.status,city:e.city},client:r}),P))await r.query(`DELETE FROM "${i}" WHERE "organizationId" = $1`,[a]);let i=await r.query('DELETE FROM "Organization" WHERE id = $1',[a]);if(0===i.rowCount)throw Error("NOT_FOUND");await r.query("COMMIT")}catch(t){throw await r.query("ROLLBACK"),t}finally{r.release()}}async function C(t,a){let e=await T(a);if(!e)throw Error("NOT_FOUND");await M.query('UPDATE "Organization" SET status = \'ARCHIVED\', "updatedAt" = NOW() WHERE id = $1',[a]),await (0,s._)({platformUserId:t.id,platformUserName:A(t),organizationId:a,entityType:"Organization",entityId:a,action:"ORGANIZATION_ARCHIVED",before:{status:e.status},after:{status:"ARCHIVED"}})}async function U(t){let{rows:a}=await M.query(`SELECT id, email, "firstName", "lastName", phone, role, status, "createdAt"
     FROM "User" WHERE "organizationId" = $1 ORDER BY
       CASE role WHEN 'OWNER' THEN 0 WHEN 'MANAGER' THEN 1 ELSE 2 END,
       "lastName"`,[t]);return a.map(t=>({id:t.id,email:t.email,firstName:t.firstName,lastName:t.lastName,phone:t.phone,role:t.role,status:t.status,createdAt:t.createdAt.toISOString()}))}async function $(t,a,e,r){let{rows:i}=await M.query('SELECT status, email FROM "User" WHERE id = $1 AND "organizationId" = $2',[e,a]);if(!i[0])throw Error("NOT_FOUND");await M.query('UPDATE "User" SET status = $3, "updatedAt" = NOW() WHERE id = $1 AND "organizationId" = $2',[e,a,r]),await (0,s._)({platformUserId:t.id,platformUserName:A(t),organizationId:a,entityType:"User",entityId:e,action:"DISABLED"===r?"USER_DISABLED":"USER_REACTIVATED",before:{status:i[0].status,email:i[0].email},after:{status:r,email:i[0].email}})}async function D(t,a){let{rows:e}=await M.query(`SELECT id, email FROM "User"
     WHERE "organizationId" = $1 AND role = 'OWNER'
     ORDER BY "createdAt" ASC LIMIT 1`,[a]),r=e[0];if(!r)throw Error("OWNER_NOT_FOUND");let n=p("act"),o=(0,i.randomBytes)(32).toString("hex"),E=new Date(Date.now()+6048e5);await M.query('UPDATE "User" SET "passwordHash" = NULL, "updatedAt" = NOW() WHERE id = $1',[r.id]),await M.query('UPDATE "ActivationToken" SET "usedAt" = NOW() WHERE "userId" = $1 AND "usedAt" IS NULL',[r.id]),await M.query('INSERT INTO "ActivationToken" (id, "userId", token, "expiresAt") VALUES ($1,$2,$3,$4)',[n,r.id,o,E]),await (0,s._)({platformUserId:t.id,platformUserName:A(t),organizationId:a,entityType:"User",entityId:r.id,action:"OWNER_ACCESS_RESET",after:{email:r.email}});let d=(0,I.bZ)()||"http://localhost:3000";return{activationToken:o,activationUrl:`${d}/activate/?token=${o}&__host=app`}}async function h(t,a,e){let r=await (0,d.Le)(e);if(!r)throw Error("PLAN_NOT_FOUND");let{rows:i}=await M.query('SELECT id FROM "Subscription" WHERE "organizationId" = $1 ORDER BY "createdAt" DESC LIMIT 1',[a]);if(!i[0])throw Error("SUB_NOT_FOUND");await (0,u.m)(t,i[0].id,r.id)}async function z(t,a,e){let r=await T(a);if(!r)throw Error("NOT_FOUND");let i=(0,E.Je)("sup");return await M.query(`INSERT INTO "SupportSession" (id, "platformUserId", "organizationId", reason)
     VALUES ($1,$2,$3,$4)`,[i,t.id,a,e?.trim()||null]),await (0,s._)({platformUserId:t.id,platformUserName:A(t),organizationId:a,entityType:"SupportSession",entityId:i,action:"SUPPORT_SESSION_STARTED",after:{reason:e??null,organizationName:r.name}}),{sessionId:i}}async function W(t,a){let{rows:e}=await M.query(`UPDATE "SupportSession" SET "endedAt" = NOW()
     WHERE id = $1 AND "platformUserId" = $2 AND "endedAt" IS NULL
     RETURNING "organizationId"`,[a,t.id]);if(!e[0])throw Error("NOT_FOUND");await (0,s._)({platformUserId:t.id,platformUserName:A(t),organizationId:e[0].organizationId,entityType:"SupportSession",entityId:a,action:"SUPPORT_SESSION_ENDED"})}async function F(t){let a=Math.min(t?.limit??50,200),e=[],r="";t?.openOnly&&(r='WHERE ss."endedAt" IS NULL'),e.push(a);let{rows:i}=await M.query(`SELECT ss.id, ss."organizationId", o.name AS "organizationName",
            TRIM(CONCAT(pu."firstName", ' ', pu."lastName")) AS "platformUserName",
            ss.reason, ss."startedAt", ss."endedAt"
     FROM "SupportSession" ss
     JOIN "Organization" o ON o.id = ss."organizationId"
     JOIN "PlatformUser" pu ON pu.id = ss."platformUserId"
     ${r}
     ORDER BY ss."startedAt" DESC
     LIMIT $${e.length}`,e);return i.map(t=>({id:t.id,organizationId:t.organizationId,organizationName:t.organizationName,platformUserName:t.platformUserName,reason:t.reason,startedAt:t.startedAt.toISOString(),endedAt:t.endedAt?.toISOString()??null,open:null==t.endedAt}))}async function _(t){let{rows:a}=await M.query(`SELECT ss.id, ss."organizationId", o.name AS "organizationName",
            TRIM(CONCAT(pu."firstName", ' ', pu."lastName")) AS "platformUserName",
            ss.reason, ss."startedAt", ss."endedAt"
     FROM "SupportSession" ss
     JOIN "Organization" o ON o.id = ss."organizationId"
     JOIN "PlatformUser" pu ON pu.id = ss."platformUserId"
     WHERE ss.id = $1
     LIMIT 1`,[t]),e=a[0];return e?{id:e.id,organizationId:e.organizationId,organizationName:e.organizationName,platformUserName:e.platformUserName,reason:e.reason,startedAt:e.startedAt.toISOString(),endedAt:e.endedAt?.toISOString()??null,open:null==e.endedAt}:null}r()}catch(t){r(t)}})}};