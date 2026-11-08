"use strict";exports.id=7537,exports.ids=[7537],exports.modules={67537:(t,a,e)=>{e.a(t,async(t,r)=>{try{e.d(a,{$9:()=>c,FV:()=>w,I3:()=>W,Mg:()=>h,Mz:()=>g,Ov:()=>C,PQ:()=>y,TB:()=>D,X8:()=>f,ZC:()=>U,_d:()=>O,_u:()=>L,createOrganization:()=>R,dh:()=>F,m1:()=>z,s1:()=>S,zG:()=>$});var i=e(84770),n=e(8678),o=e(51161),s=e(16574),E=e(20051),d=e(70502),u=e(64389),l=e(53645),I=t([n,o,s,E,d,u]);[n,o,s,E,d,u]=I.then?(await I)():I;let H=new n.Pool({connectionString:process.env.DATABASE_URL});function N(t){return`${t}_${(0,i.randomBytes)(6).toString("hex")}`}function p(t){return`${t.firstName} ${t.lastName}`.trim()}async function A(t,a){await t.query(`INSERT INTO "ReactivationSettings" (id, "organizationId", "updatedAt")
     VALUES ($1, $2, NOW()) ON CONFLICT ("organizationId") DO NOTHING`,[N("rset"),a]),await t.query(`INSERT INTO "ReviewSettings" (id, "organizationId", "updatedAt")
     VALUES ($1, $2, NOW()) ON CONFLICT ("organizationId") DO NOTHING`,[N("rvset"),a]),await t.query(`INSERT INTO "LoyaltyProgram" (id, "organizationId", "updatedAt")
     VALUES ($1, $2, NOW()) ON CONFLICT ("organizationId") DO NOTHING`,[N("loy"),a])}async function O(){let{rows:t}=await H.query(`SELECT
      COUNT(*)::text AS total,
      COUNT(*) FILTER (WHERE status = 'ACTIVE')::text AS active,
      COUNT(*) FILTER (WHERE "createdAt" >= date_trunc('month', NOW()))::text AS month
     FROM "Organization"`),{rows:a}=await H.query(`SELECT
      COUNT(*)::text AS total,
      COUNT(*) FILTER (WHERE "createdAt" >= date_trunc('month', NOW()))::text AS month
     FROM "User"`),{rows:e}=await H.query(`SELECT
      COALESCE(SUM("priceSnapshot") FILTER (WHERE status IN ('ACTIVE', 'TRIAL', 'PAST_DUE')), 0)::text AS mrr,
      COUNT(*) FILTER (WHERE status IN ('ACTIVE', 'TRIAL'))::text AS active
     FROM "Subscription" s
     WHERE s.id = (
       SELECT s2.id FROM "Subscription" s2
       WHERE s2."organizationId" = s."organizationId"
       ORDER BY s2."createdAt" DESC LIMIT 1
     )`),{rows:r}=await H.query(`SELECT COUNT(*)::text AS c FROM "Appointment"
     WHERE "startAt" >= date_trunc('month', NOW())
       AND status NOT IN ('CANCELLED')`),{rows:i}=await H.query("SELECT COUNT(*)::text AS c FROM \"Customer\" WHERE status != 'ARCHIVED'"),n=parseFloat(e[0]?.mrr??"0");return{orgs:parseInt(t[0]?.total??"0",10),orgsActive:parseInt(t[0]?.active??"0",10),orgsDelta:parseInt(t[0]?.month??"0",10),users:parseInt(a[0]?.total??"0",10),usersDelta:parseInt(a[0]?.month??"0",10),mrr:n,arr:12*n,activeSubs:parseInt(e[0]?.active??"0",10),rdv:parseInt(r[0]?.c??"0",10),customers:parseInt(i[0]?.c??"0",10)}}function m(t){return{id:t.id,name:t.name,slug:t.slug,city:t.city,phone:t.phone,email:t.email,logoUrl:t.logoUrl??null,status:t.status,plan:t.plan,ownerName:t.ownerFirst&&t.ownerLast?`${t.ownerFirst} ${t.ownerLast}`.trim():null,ownerEmail:t.ownerEmail,createdAt:t.createdAt.toISOString(),mrr:t.subPrice?parseFloat(t.subPrice):0,usersCount:parseInt(t.usersCount??"0",10),subscriptionId:t.subscriptionId??null,subscriptionStatus:t.subStatus??null,renewAt:t.renewAt?t.renewAt.toISOString():null}}let M=`
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
`;async function S(t){let a=[],e=[];t?.search&&(a.push(`%${t.search.trim()}%`),e.push(`(o.name ILIKE $${a.length}
        OR o.slug ILIKE $${a.length}
        OR o.email ILIKE $${a.length}
        OR o.city ILIKE $${a.length}
        OR u.email ILIKE $${a.length}
        OR CONCAT(u."firstName", ' ', u."lastName") ILIKE $${a.length})`)),t?.status&&(a.push(t.status),e.push(`o.status = $${a.length}`)),t?.plan&&(a.push(t.plan),e.push(`p.code = $${a.length}`));let r=e.length?`WHERE ${e.join(" AND ")}`:"",{rows:i}=await H.query(`${M} ${r} ORDER BY o."createdAt" DESC`,a);return i.map(m)}async function c(t){let{rows:a}=await H.query(`SELECT
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
    WHERE o.id = $1`,[t]),e=a[0];if(!e)return null;let{rows:r}=await H.query(`SELECT
      (SELECT COUNT(*)::text FROM "Customer" WHERE "organizationId" = $1 AND status != 'ARCHIVED') AS customers,
      (SELECT COUNT(*)::text FROM "Appointment" WHERE "organizationId" = $1 AND status NOT IN ('CANCELLED')) AS appointments,
      (SELECT COALESCE(SUM(amount),0)::text FROM "Payment" WHERE "organizationId" = $1 AND status = 'COMPLETED') AS revenue,
      (SELECT COUNT(*)::text FROM "Product" WHERE "organizationId" = $1 AND active = true) AS products,
      (SELECT COUNT(*)::text FROM "Staff" WHERE "organizationId" = $1 AND status = 'ACTIVE') AS staff`,[t]),{rows:i}=await H.query(`SELECT s.id, p.code AS "planCode", s."priceSnapshot"::text, s.status,
            s."startedAt", s."currentPeriodEnd", s.paid, s."paidAt"
     FROM "Subscription" s
     JOIN "Plan" p ON p.id = s."planId"
     WHERE s."organizationId" = $1
     ORDER BY s."createdAt" DESC LIMIT 1`,[t]),n=i[0],o=await H.query('SELECT "cardBackgroundUrl" FROM "LoyaltyProgram" WHERE "organizationId" = $1',[t]);return{...m(e),address:e.address??null,ownerPhone:e.ownerPhone??null,cardBackgroundUrl:o.rows[0]?.cardBackgroundUrl??null,stats:{customers:parseInt(r[0]?.customers??"0",10),appointments:parseInt(r[0]?.appointments??"0",10),revenue:parseFloat(r[0]?.revenue??"0"),products:parseInt(r[0]?.products??"0",10),staff:parseInt(r[0]?.staff??"0",10)},subscription:n?{id:n.id,plan:n.planCode,price:parseFloat(n.priceSnapshot),status:n.status,startAt:n.startedAt.toISOString(),renewAt:n.currentPeriodEnd.toISOString(),paid:!!n.paid,paidAt:n.paidAt?n.paidAt.toISOString():null}:null}}async function T(t,a){let e=[t.trim().toLowerCase()],r='SELECT 1 FROM "Organization" WHERE LOWER(slug) = $1';a&&(e.push(a),r+=" AND id != $2"),r+=" LIMIT 1";let{rows:i}=await H.query(r,e);return i.length>0}async function R(t,a){let e=a.slug.trim().toLowerCase().replace(/[^a-z0-9-]/g,"-");if(await T(e))throw Error("SLUG_TAKEN");let r=await (0,E.Le)(a.plan);if(!r||!r.active)throw Error("PLAN_NOT_FOUND");let n=N("org"),s=N("u"),d=N("sub"),I=N("act"),O=(0,i.randomBytes)(32).toString("hex"),m=new Date(Date.now()+6048e5),S=new Date,c=(0,u.RY)(S),R=a.owner.email.trim().toLowerCase(),w=await H.connect();try{await w.query("BEGIN");let{rows:i}=await w.query('SELECT id FROM "User" WHERE LOWER(email) = $1 LIMIT 1',[R]);if(i.length>0)throw Error("OWNER_EMAIL_TAKEN");await w.query(`INSERT INTO "Organization" (
        id, name, slug, address, city, phone, email, status, "updatedAt"
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,'ACTIVE',NOW())`,[n,a.name.trim(),e,a.address?.trim()||null,a.city?.trim()||null,a.phone.trim(),a.email.trim().toLowerCase()]),await w.query(`INSERT INTO "User" (
        id, "organizationId", email, "firstName", "lastName", phone, role, status, "passwordHash", "updatedAt"
      ) VALUES ($1,$2,$3,$4,$5,$6,'OWNER','ACTIVE',NULL,NOW())`,[s,n,R,a.owner.firstName.trim(),a.owner.lastName.trim(),a.owner.phone?.trim()||null]),await w.query(`INSERT INTO "Subscription" (
        id, "organizationId", "planId", status, "priceSnapshot", "currencySnapshot",
        "startedAt", "currentPeriodStart", "currentPeriodEnd", "trialEndsAt", "updatedAt"
      ) VALUES ($1,$2,$3,'TRIAL',$4,$5,$6,$6,$7,$7,NOW())`,[d,n,r.id,r.price,r.currency,S,c]),await w.query(`INSERT INTO "ActivationToken" (id, "userId", token, "expiresAt")
       VALUES ($1,$2,$3,$4)`,[I,s,O,m]),await A(w,n),await (0,o._)({platformUserId:t.id,platformUserName:p(t),organizationId:n,entityType:"Organization",entityId:n,action:"ORGANIZATION_CREATED",after:{name:a.name,slug:e,plan:a.plan,ownerEmail:R,subscriptionStatus:"TRIAL",trialDays:7},client:w}),await (0,o._)({platformUserId:t.id,platformUserName:p(t),organizationId:n,entityType:"User",entityId:s,action:"OWNER_CREATED",after:{email:R,role:"OWNER"},client:w}),await w.query("COMMIT");let E=(0,l.bZ)()||"http://localhost:3000";return{organizationId:n,ownerUserId:s,subscriptionId:d,activationToken:O,activationUrl:`${E}/activate/?token=${O}&__host=app`}}catch(t){throw await w.query("ROLLBACK"),t}finally{w.release()}}async function w(t,a,e){let r=await c(a);if(!r)throw Error("NOT_FOUND");await H.query(`UPDATE "Organization" SET
      name = COALESCE($2, name),
      phone = COALESCE($3, phone),
      email = COALESCE($4, email),
      address = COALESCE($5, address),
      city = COALESCE($6, city),
      "updatedAt" = NOW()
     WHERE id = $1`,[a,e.name?.trim(),e.phone?.trim(),e.email?.trim()?.toLowerCase(),e.address,e.city]);let i=await c(a);await (0,o._)({platformUserId:t.id,platformUserName:p(t),organizationId:a,entityType:"Organization",entityId:a,action:"ORGANIZATION_UPDATED",before:{name:r.name,phone:r.phone,email:r.email},after:{name:i?.name,phone:i?.phone,email:i?.email}})}async function L(t,a){let e=await c(a);if(!e)throw Error("NOT_FOUND");"SUSPENDED"!==e.status&&(await H.query('UPDATE "Organization" SET status = \'SUSPENDED\', "updatedAt" = NOW() WHERE id = $1',[a]),await (0,o._)({platformUserId:t.id,platformUserName:p(t),organizationId:a,entityType:"Organization",entityId:a,action:"ORGANIZATION_SUSPENDED",before:{status:e.status},after:{status:"SUSPENDED"}}))}async function y(t,a){let e=await c(a);if(!e)throw Error("NOT_FOUND");"ACTIVE"!==e.status&&(await H.query('UPDATE "Organization" SET status = \'ACTIVE\', "updatedAt" = NOW() WHERE id = $1',[a]),await (0,o._)({platformUserId:t.id,platformUserName:p(t),organizationId:a,entityType:"Organization",entityId:a,action:"ORGANIZATION_REACTIVATED",before:{status:e.status},after:{status:"ACTIVE"}}))}let _=["LoyaltyEvent","LoyaltyRedemption","CommissionRecord","PosSale","Invoice","Purchase","Appointment","SupportTicket"];async function g(t,a){let e=await c(a);if(!e)throw Error("NOT_FOUND");let r=await H.connect();try{for(let i of(await r.query("BEGIN"),await (0,o._)({platformUserId:t.id,platformUserName:p(t),organizationId:a,entityType:"Organization",entityId:a,action:"ORGANIZATION_DELETED",before:{name:e.name,slug:e.slug,status:e.status,city:e.city},client:r}),_))await r.query(`DELETE FROM "${i}" WHERE "organizationId" = $1`,[a]);let i=await r.query('DELETE FROM "Organization" WHERE id = $1',[a]);if(0===i.rowCount)throw Error("NOT_FOUND");await r.query("COMMIT")}catch(t){throw await r.query("ROLLBACK"),t}finally{r.release()}}async function C(t,a){let e=await c(a);if(!e)throw Error("NOT_FOUND");await H.query('UPDATE "Organization" SET status = \'ARCHIVED\', "updatedAt" = NOW() WHERE id = $1',[a]),await (0,o._)({platformUserId:t.id,platformUserName:p(t),organizationId:a,entityType:"Organization",entityId:a,action:"ORGANIZATION_ARCHIVED",before:{status:e.status},after:{status:"ARCHIVED"}})}async function U(t){let{rows:a}=await H.query(`SELECT id, email, "firstName", "lastName", phone, role, status, "createdAt"
     FROM "User" WHERE "organizationId" = $1 ORDER BY
       CASE role WHEN 'OWNER' THEN 0 WHEN 'MANAGER' THEN 1 ELSE 2 END,
       "lastName"`,[t]);return a.map(t=>({id:t.id,email:t.email,firstName:t.firstName,lastName:t.lastName,phone:t.phone,role:t.role,status:t.status,createdAt:t.createdAt.toISOString()}))}async function f(t,a,e,r){let{rows:i}=await H.query('SELECT status, email FROM "User" WHERE id = $1 AND "organizationId" = $2',[e,a]);if(!i[0])throw Error("NOT_FOUND");await H.query('UPDATE "User" SET status = $3, "updatedAt" = NOW() WHERE id = $1 AND "organizationId" = $2',[e,a,r]),await (0,o._)({platformUserId:t.id,platformUserName:p(t),organizationId:a,entityType:"User",entityId:e,action:"DISABLED"===r?"USER_DISABLED":"USER_REACTIVATED",before:{status:i[0].status,email:i[0].email},after:{status:r,email:i[0].email}})}async function $(t,a){let{rows:e}=await H.query(`SELECT id, email FROM "User"
     WHERE "organizationId" = $1 AND role = 'OWNER'
     ORDER BY "createdAt" ASC LIMIT 1`,[a]),r=e[0];if(!r)throw Error("OWNER_NOT_FOUND");let n=N("act"),s=(0,i.randomBytes)(32).toString("hex"),E=new Date(Date.now()+6048e5);await H.query('UPDATE "User" SET "passwordHash" = NULL, "updatedAt" = NOW() WHERE id = $1',[r.id]),await H.query('UPDATE "ActivationToken" SET "usedAt" = NOW() WHERE "userId" = $1 AND "usedAt" IS NULL',[r.id]),await H.query('INSERT INTO "ActivationToken" (id, "userId", token, "expiresAt") VALUES ($1,$2,$3,$4)',[n,r.id,s,E]),await (0,o._)({platformUserId:t.id,platformUserName:p(t),organizationId:a,entityType:"User",entityId:r.id,action:"OWNER_ACCESS_RESET",after:{email:r.email}});let d=(0,l.bZ)()||"http://localhost:3000";return{activationToken:s,activationUrl:`${d}/activate/?token=${s}&__host=app`}}async function h(t,a,e){let r=await (0,E.Le)(e);if(!r)throw Error("PLAN_NOT_FOUND");let{rows:i}=await H.query('SELECT id FROM "Subscription" WHERE "organizationId" = $1 ORDER BY "createdAt" DESC LIMIT 1',[a]);if(!i[0])throw Error("SUB_NOT_FOUND");await (0,d.m)(t,i[0].id,r.id)}async function D(t,a,e){let r=await c(a);if(!r)throw Error("NOT_FOUND");let i=(0,s.Je)("sup");return await H.query(`INSERT INTO "SupportSession" (id, "platformUserId", "organizationId", reason)
     VALUES ($1,$2,$3,$4)`,[i,t.id,a,e?.trim()||null]),await (0,o._)({platformUserId:t.id,platformUserName:p(t),organizationId:a,entityType:"SupportSession",entityId:i,action:"SUPPORT_SESSION_STARTED",after:{reason:e??null,organizationName:r.name}}),{sessionId:i}}async function z(t,a){let{rows:e}=await H.query(`UPDATE "SupportSession" SET "endedAt" = NOW()
     WHERE id = $1 AND "platformUserId" = $2 AND "endedAt" IS NULL
     RETURNING "organizationId"`,[a,t.id]);if(!e[0])throw Error("NOT_FOUND");await (0,o._)({platformUserId:t.id,platformUserName:p(t),organizationId:e[0].organizationId,entityType:"SupportSession",entityId:a,action:"SUPPORT_SESSION_ENDED"})}async function W(t){let a=Math.min(t?.limit??50,200),e=[],r="";t?.openOnly&&(r='WHERE ss."endedAt" IS NULL'),e.push(a);let{rows:i}=await H.query(`SELECT ss.id, ss."organizationId", o.name AS "organizationName",
            TRIM(CONCAT(pu."firstName", ' ', pu."lastName")) AS "platformUserName",
            ss.reason, ss."startedAt", ss."endedAt"
     FROM "SupportSession" ss
     JOIN "Organization" o ON o.id = ss."organizationId"
     JOIN "PlatformUser" pu ON pu.id = ss."platformUserId"
     ${r}
     ORDER BY ss."startedAt" DESC
     LIMIT $${e.length}`,e);return i.map(t=>({id:t.id,organizationId:t.organizationId,organizationName:t.organizationName,platformUserName:t.platformUserName,reason:t.reason,startedAt:t.startedAt.toISOString(),endedAt:t.endedAt?.toISOString()??null,open:null==t.endedAt}))}async function F(t){let{rows:a}=await H.query(`SELECT ss.id, ss."organizationId", o.name AS "organizationName",
            TRIM(CONCAT(pu."firstName", ' ', pu."lastName")) AS "platformUserName",
            ss.reason, ss."startedAt", ss."endedAt"
     FROM "SupportSession" ss
     JOIN "Organization" o ON o.id = ss."organizationId"
     JOIN "PlatformUser" pu ON pu.id = ss."platformUserId"
     WHERE ss.id = $1
     LIMIT 1`,[t]),e=a[0];return e?{id:e.id,organizationId:e.organizationId,organizationName:e.organizationName,platformUserName:e.platformUserName,reason:e.reason,startedAt:e.startedAt.toISOString(),endedAt:e.endedAt?.toISOString()??null,open:null==e.endedAt}:null}r()}catch(t){r(t)}})},16574:(t,a,e)=>{e.a(t,async(t,r)=>{try{e.d(a,{Je:()=>d,hw:()=>E});var i=e(84770),n=e(8678),o=e(47041),s=t([n]);let u=new(n=(s.then?(await s)():s)[0]).Pool({connectionString:process.env.DATABASE_URL});async function E(t,a){let e=t.trim().toLowerCase(),{rows:r}=await u.query(`SELECT id, email, "firstName", "lastName", role, status, "passwordHash"
     FROM "PlatformUser"
     WHERE LOWER(email) = $1
     LIMIT 1`,[e]),i=r[0];return i&&"ACTIVE"===i.status&&i.passwordHash&&(0,o.Gv)(a,i.passwordHash)?{id:i.id,email:i.email,firstName:i.firstName,lastName:i.lastName,role:i.role,scope:"platform",accountType:"PLATFORM"}:null}function d(t){return`${t}_${(0,i.randomBytes)(6).toString("hex")}`}r()}catch(t){r(t)}})}};