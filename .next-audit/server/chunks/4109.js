"use strict";!function(){try{var t="undefined"!=typeof window?window:"undefined"!=typeof global?global:"undefined"!=typeof self?self:{},e=(new t.Error).stack;e&&(t._sentryDebugIds=t._sentryDebugIds||{},t._sentryDebugIds[e]="3d2ebb7c-ee5d-449b-9bf5-6e749d896c1a",t._sentryDebugIdIdentifier="sentry-dbid-3d2ebb7c-ee5d-449b-9bf5-6e749d896c1a")}catch(t){}}(),exports.id=4109,exports.ids=[4109],exports.modules={14109:(t,e,a)=>{a.a(t,async(t,i)=>{try{a.d(e,{Fh:()=>T,JF:()=>N,_g:()=>I,av:()=>m,dC:()=>c,wF:()=>l});var s=a(84770),n=a(8678),r=a(90831),o=a(66085),E=a(44162),u=t([n,o,E]);[n,o,E]=u.then?(await u)():u;let S=(0,r.S)(new n.Pool({connectionString:process.env.DATABASE_URL}));async function d(t,e){let{rows:a}=await S.query(`SELECT id FROM "Customer"
     WHERE id = $1 AND "organizationId" = $2 AND "deletedAt" IS NULL`,[t,e]);return!!a[0]}async function c(t,e){if(!await d(t,e))return null;let{rows:a}=await S.query(`SELECT
       COUNT(*) FILTER (WHERE status = 'COMPLETED')::text AS visits,
       COUNT(*)::text AS appointments,
       COUNT(*) FILTER (WHERE status = 'NO_SHOW')::text AS "noShows",
       COUNT(*) FILTER (WHERE status = 'CANCELLED')::text AS cancellations,
       MAX("startAt") FILTER (WHERE status = 'COMPLETED') AS "lastVisitAt",
       MIN("startAt") FILTER (
         WHERE status IN ('PENDING','CONFIRMED') AND "startAt" > NOW()
       ) AS "nextVisitAt"
     FROM "Appointment"
     WHERE "customerId" = $1 AND "organizationId" = $2`,[t,e]),{rows:i}=await S.query(`SELECT COALESCE(SUM(
       CASE WHEN kind = 'REFUND' THEN -amount ELSE amount END
     ), 0)::text AS net
     FROM "Payment"
     WHERE "customerId" = $1 AND "organizationId" = $2 AND status = 'COMPLETED'`,[t,e]),{rows:s}=await S.query(`SELECT balance FROM "LoyaltyAccount"
     WHERE "customerId" = $1 AND "organizationId" = $2
     LIMIT 1`,[t,e]),{rows:n}=await S.query(`SELECT COUNT(*)::text AS n FROM "Package"
     WHERE "customerId" = $1 AND "organizationId" = $2
       AND status = 'ACTIVE'
       AND ("expiresAt" IS NULL OR "expiresAt" > NOW())`,[t,e]),{rows:r}=await S.query(`SELECT COUNT(*)::text AS n FROM "GiftCard"
     WHERE "organizationId" = $1
       AND status = 'ACTIVE'
       AND ("buyerCustomerId" = $2 OR "beneficiaryCustomerId" = $2)
       AND ("expiresAt" IS NULL OR "expiresAt" > NOW())`,[e,t]),{rows:o}=await S.query(`SELECT COUNT(*)::text AS n FROM "Invoice"
     WHERE "customerId" = $1 AND "organizationId" = $2
       AND status IN ('DRAFT','ISSUED','PARTIALLY_PAID')`,[t,e]),E=parseInt(a[0]?.visits??"0",10),u=Math.round(100*parseFloat(i[0]?.net??"0"))/100;return{lifetimeNetRevenue:u,visits:E,appointments:parseInt(a[0]?.appointments??"0",10),averageTicket:E>0?Math.round(u/E*100)/100:0,lastVisitAt:a[0]?.lastVisitAt?.toISOString()??null,nextVisitAt:a[0]?.nextVisitAt?.toISOString()??null,noShowCount:parseInt(a[0]?.noShows??"0",10),cancellationCount:parseInt(a[0]?.cancellations??"0",10),loyaltyPoints:s[0]?.balance??0,activePackages:parseInt(n[0]?.n??"0",10),giftCardsActive:parseInt(r[0]?.n??"0",10),openInvoices:parseInt(o[0]?.n??"0",10)}}function A(t,e){t.push(e)}async function N(t,e,a=80){if(!await d(t,e))return null;let i=[],[s,n,r,o,E,u,c,N,I,m]=await Promise.all([S.query(`SELECT a.id, a."startAt", s.name AS "serviceName", a.price::text, a.status::text
         FROM "Appointment" a
         JOIN "Service" s ON s.id = a."serviceId"
         WHERE a."customerId" = $1 AND a."organizationId" = $2
         ORDER BY a."startAt" DESC LIMIT 40`,[t,e]),S.query(`SELECT id, "createdAt", amount::text, kind::text, method::text, status::text
         FROM "Payment"
         WHERE "customerId" = $1 AND "organizationId" = $2
         ORDER BY "createdAt" DESC LIMIT 40`,[t,e]),S.query(`SELECT id, "createdAt", number, total::text, status::text
         FROM "Invoice"
         WHERE "customerId" = $1 AND "organizationId" = $2
         ORDER BY "createdAt" DESC LIMIT 30`,[t,e]),S.query(`SELECT id, "createdAt", points::text, type::text, reason
         FROM "LoyaltyTransaction"
         WHERE "customerId" = $1 AND "organizationId" = $2
         ORDER BY "createdAt" DESC LIMIT 30`,[t,e]),S.query(`SELECT id, "scheduledFor", type::text, status::text
         FROM "WhatsAppTask"
         WHERE "customerId" = $1 AND "organizationId" = $2
         ORDER BY "scheduledFor" DESC LIMIT 30`,[t,e]),S.query(`SELECT id, "createdAt", status::text, satisfaction::text
         FROM "ReviewRequest"
         WHERE "customerId" = $1 AND "organizationId" = $2
         ORDER BY "createdAt" DESC LIMIT 20`,[t,e]),S.query(`SELECT pu.id, pu."createdAt" AS "usedAt", p.name AS "promoName",
                pu."discountAmount"::text AS discount
         FROM "PromotionUsage" pu
         JOIN "Promotion" p ON p.id = pu."promotionId"
         WHERE pu."customerId" = $1 AND pu."organizationId" = $2
         ORDER BY pu."createdAt" DESC LIMIT 20`,[t,e]),S.query(`SELECT id, "createdAt", name, status::text
         FROM "Package"
         WHERE "customerId" = $1 AND "organizationId" = $2
         ORDER BY "createdAt" DESC LIMIT 20`,[t,e]),S.query(`SELECT n.id, n."createdAt", n.content,
                CASE WHEN u.id IS NULL THEN NULL
                     ELSE TRIM(CONCAT(u."firstName", ' ', NULLIF(u."lastName", ''))) END AS "authorName"
         FROM "CustomerNote" n
         LEFT JOIN "User" u ON u.id = n."authorId"
         WHERE n."customerId" = $1 AND n."organizationId" = $2 AND n."deletedAt" IS NULL
         ORDER BY n."createdAt" DESC LIMIT 30`,[t,e]),S.query(`SELECT id, "createdAt", code, balance::text, status::text
         FROM "GiftCard"
         WHERE "organizationId" = $1
           AND ("buyerCustomerId" = $2 OR "beneficiaryCustomerId" = $2)
         ORDER BY "createdAt" DESC LIMIT 20`,[e,t])]);for(let t of s.rows)A(i,{id:`apt_${t.id}`,kind:"APPOINTMENT",at:t.startAt.toISOString(),title:t.serviceName,subtitle:t.status,amount:parseFloat(t.price),meta:{appointmentId:t.id,status:t.status}});for(let t of n.rows){let e="REFUND"===t.kind?-parseFloat(t.amount):parseFloat(t.amount);A(i,{id:`pay_${t.id}`,kind:"PAYMENT",at:t.createdAt.toISOString(),title:"REFUND"===t.kind?"Remboursement":"Paiement",subtitle:`${t.method} \xb7 ${t.status}`,amount:e,meta:{paymentId:t.id,kind:t.kind}})}for(let t of r.rows)A(i,{id:`inv_${t.id}`,kind:"INVOICE",at:t.createdAt.toISOString(),title:`Facture ${t.number}`,subtitle:t.status,amount:parseFloat(t.total),meta:{invoiceId:t.id}});for(let t of o.rows){let e=parseInt(t.points,10);A(i,{id:`loy_${t.id}`,kind:"LOYALTY",at:t.createdAt.toISOString(),title:`Fid\xe9lit\xe9 ${e>=0?"+":""}${e} pts`,subtitle:t.reason??t.type,amount:null,meta:{type:t.type}})}for(let t of E.rows)A(i,{id:`wa_${t.id}`,kind:"WHATSAPP",at:t.scheduledFor.toISOString(),title:`WhatsApp \xb7 ${t.type}`,subtitle:t.status,amount:null,meta:{type:t.type,status:t.status}});for(let t of u.rows)A(i,{id:`rev_${t.id}`,kind:"REVIEW",at:t.createdAt.toISOString(),title:"Demande d'avis",subtitle:t.satisfaction??t.status,amount:null,meta:{status:t.status}});for(let t of c.rows)A(i,{id:`promo_${t.id}`,kind:"PROMOTION",at:t.usedAt.toISOString(),title:t.promoName,subtitle:"Promotion utilis\xe9e",amount:null!=t.discount?parseFloat(t.discount):null,meta:{}});for(let t of N.rows)A(i,{id:`pkg_${t.id}`,kind:"PACKAGE",at:t.createdAt.toISOString(),title:t.name,subtitle:`Forfait \xb7 ${t.status}`,amount:null,meta:{status:t.status}});for(let t of I.rows)A(i,{id:`note_${t.id}`,kind:"NOTE",at:t.createdAt.toISOString(),title:"Note interne",subtitle:t.authorName??t.content.slice(0,80),amount:null,meta:{noteId:t.id}});for(let t of m.rows)A(i,{id:`gift_${t.id}`,kind:"GIFT_CARD",at:t.createdAt.toISOString(),title:`Carte cadeau ${t.code}`,subtitle:t.status,amount:parseFloat(t.balance),meta:{code:t.code}});return i.sort((t,e)=>new Date(e.at).getTime()-new Date(t.at).getTime()),i.slice(0,a)}async function I(t,e){if(!await d(t,e))return null;let{rows:a}=await S.query(`SELECT n.id, n."customerId", n.content, n."authorId",
            n."createdAt", n."updatedAt",
            CASE WHEN u.id IS NULL THEN NULL
                 ELSE TRIM(CONCAT(u."firstName", ' ', NULLIF(u."lastName", ''))) END AS "authorName"
     FROM "CustomerNote" n
     LEFT JOIN "User" u ON u.id = n."authorId"
     WHERE n."customerId" = $1 AND n."organizationId" = $2 AND n."deletedAt" IS NULL
     ORDER BY n."createdAt" DESC`,[t,e]);return a.map(t=>({id:String(t.id),customerId:String(t.customerId),content:String(t.content),authorId:t.authorId??null,authorName:t.authorName??null,createdAt:new Date(t.createdAt).toISOString(),updatedAt:new Date(t.updatedAt).toISOString()}))}async function m(t,e,a,i){if(!await d(t,e))return null;let n=a.content.trim();if(!n)throw Error("EMPTY_CONTENT");let r=`cnote_${(0,s.randomBytes)(8).toString("hex")}`;await S.query(`INSERT INTO "CustomerNote" (
      id, "organizationId", "customerId", "authorId", content, "updatedAt"
    ) VALUES ($1,$2,$3,$4,$5,NOW())`,[r,e,t,i.id,n]),await (0,o.writeAuditLog)({organizationId:e,actorId:i.id,actorName:i.name,entityType:"CustomerNote",entityId:r,action:"CREATE",after:{customerId:t,content:n}});let E=await I(t,e);return E?.find(t=>t.id===r)??null}async function l(t,e,a,i,s){let{rows:n}=await S.query(`SELECT id, content, "customerId" FROM "CustomerNote"
     WHERE id = $1 AND "organizationId" = $2 AND "customerId" = $3 AND "deletedAt" IS NULL`,[t,a,e]),r=n[0];if(!r)return null;let E=i.content.trim();if(!E)throw Error("EMPTY_CONTENT");await S.query(`UPDATE "CustomerNote" SET content = $1, "updatedAt" = NOW()
     WHERE id = $2 AND "organizationId" = $3 AND "deletedAt" IS NULL`,[E,t,a]),await (0,o.writeAuditLog)({organizationId:a,actorId:s.id,actorName:s.name,entityType:"CustomerNote",entityId:t,action:"UPDATE",before:{content:r.content},after:{content:E}});let u=await I(e,a);return u?.find(e=>e.id===t)??null}async function T(t,e,a,i){let{rows:s}=await S.query(`SELECT id, content FROM "CustomerNote"
     WHERE id = $1 AND "organizationId" = $2 AND "customerId" = $3 AND "deletedAt" IS NULL`,[t,a,e]),n=s[0];return!!n&&(await S.query(`UPDATE "CustomerNote" SET "deletedAt" = NOW(), "updatedAt" = NOW()
     WHERE id = $1 AND "organizationId" = $2`,[t,a]),await (0,o.writeAuditLog)({organizationId:a,actorId:i.id,actorName:i.name,entityType:"CustomerNote",entityId:t,action:"DELETE",before:{content:n.content,customerId:e}}),!0)}i()}catch(t){i(t)}})},44162:(t,e,a)=>{a.a(t,async(t,i)=>{try{a.d(e,{$L:()=>d,$k:()=>c,XA:()=>m,l4:()=>A,uG:()=>l,wK:()=>N,zp:()=>T});var s=a(8678),n=a(90831),r=a(11107),o=a(31244),E=t([s]);s=(E.then?(await E)():E)[0];let S=(0,n.S)(new s.Pool({connectionString:process.env.DATABASE_URL}));function u(t){let e=parseInt(t.visits,10)||0,a=parseInt(t.noShowCount,10)||0,i=parseFloat(t.revenue)||0,s=e>0?Math.round(i/e*100)/100:0;return{id:t.id,firstName:t.firstName,lastName:t.lastName,phone:t.phone,email:t.email,status:t.status,visits:e,noShowCount:a,revenue:i,averageTicket:s,lastVisitAt:t.lastVisitAt?.toISOString()??null,createdAt:t.createdAt.toISOString(),segment:function(t){if("INACTIVE"===t.status||"ARCHIVED"===t.status)return"INACTIVE";if("AT_RISK"===t.status)return"AT_RISK";if("NEW"===t.status)return"NEW";let e=(Date.now()-t.createdAt.getTime())/864e5;if(e<=r.TX&&t.visits<=1)return"NEW";if(t.revenue>=r.Fo||t.visits>=r.P9)return"VIP";if(t.lastVisitAt){if((Date.now()-t.lastVisitAt.getTime())/864e5>r.co)return"AT_RISK"}else if(e>r.co)return"AT_RISK";return"ACTIVE"}({status:t.status,visits:e,revenue:i,createdAt:t.createdAt,lastVisitAt:t.lastVisitAt})}}async function d(t,e){let{page:a,limit:i,search:s,status:n,segment:o="ALL"}=e,E=['c."organizationId" = $1','c."deletedAt" IS NULL'],d=[t],c=2;s&&(E.push(`(c."firstName" ILIKE $${c} OR c."lastName" ILIKE $${c} OR c.phone ILIKE $${c} OR COALESCE(c.email, '') ILIKE $${c})`),d.push(`%${s}%`),c++),n&&(E.push(`c.status = $${c}`),d.push(n),c++);let A=E.join(" AND "),N="ALL"!==o?function(t,e){switch(t){case"VIP":return`HAVING (
        COALESCE(SUM(a.price) FILTER (WHERE a.status = 'COMPLETED'), 0) >= ${r.Fo}
        OR COUNT(a.id) FILTER (WHERE a.status = 'COMPLETED') >= ${r.P9}
      )`;case"NEW":return`HAVING (
        c.status = 'NEW'
        OR (c."createdAt" >= NOW() - INTERVAL '${r.TX} days'
            AND COUNT(a.id) FILTER (WHERE a.status = 'COMPLETED') <= 1)
      )`;case"INACTIVE":return"HAVING c.status IN ('INACTIVE', 'ARCHIVED')";case"AT_RISK":return`HAVING (
        c.status = 'AT_RISK'
        OR (
          MAX(a."startAt") FILTER (WHERE a.status = 'COMPLETED') IS NOT NULL
          AND MAX(a."startAt") FILTER (WHERE a.status = 'COMPLETED') < NOW() - INTERVAL '${r.co} days'
        )
        OR (
          MAX(a."startAt") FILTER (WHERE a.status = 'COMPLETED') IS NULL
          AND c."createdAt" < NOW() - INTERVAL '${r.co} days'
          AND c.status NOT IN ('INACTIVE', 'ARCHIVED', 'NEW')
        )
      )`;case"ACTIVE":return"HAVING c.status = 'ACTIVE'";default:return""}}(o,0):"",I=`
    SELECT COUNT(*)::int AS total FROM (
      SELECT c.id
      FROM "Customer" c
      LEFT JOIN "Appointment" a ON a."customerId" = c.id AND a.status = 'COMPLETED'
      WHERE ${A}
      GROUP BY c.id, c.status, c."createdAt"
      ${N}
    ) sub
  `,m=`
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
    WHERE ${A}
    GROUP BY c.id
    ${N}
    ORDER BY c."createdAt" DESC, c."lastName", c."firstName"
    LIMIT $${c} OFFSET $${c+1}
  `,l=`
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
          WHEN c.status = 'NEW' OR (c."createdAt" >= NOW() - INTERVAL '${r.TX} days'
            AND COALESCE(v.visits, 0) <= 1) THEN 'NEW'
          WHEN COALESCE(v.revenue, 0) >= ${r.Fo} OR COALESCE(v.visits, 0) >= ${r.P9} THEN 'VIP'
          WHEN v."lastVisitAt" IS NOT NULL AND v."lastVisitAt" < NOW() - INTERVAL '${r.co} days' THEN 'AT_RISK'
          WHEN v."lastVisitAt" IS NULL AND c."createdAt" < NOW() - INTERVAL '${r.co} days'
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
  `,[T,R,C]=await Promise.all([S.query(I,d),S.query(m,[...d,i,(a-1)*i]),S.query(l,[t])]);return{items:R.rows.map(u),total:T.rows[0]?.total??0,kpis:C.rows[0]??{total:0,newCount:0,vipCount:0,inactiveCount:0,activeCount:0,atRiskCount:0}}}async function c(t,e){var i;let{rows:s}=await S.query(`SELECT
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
    GROUP BY c.id`,[e,t]),n=s[0]?(i=s[0],{...u(i),birthDate:i.birthDate?.toISOString()??null,address:i.address,instagram:i.instagram,notes:i.notes,marketingWhatsapp:i.marketingWhatsapp,marketingEmail:i.marketingEmail,marketingSms:i.marketingSms,updatedAt:i.updatedAt.toISOString()}):null;if(!n)return null;try{let{countCustomerNoShows:i,getOrCreateBookingPolicy:s,noShowRiskLevel:r}=await a.e(819).then(a.bind(a,50819)),o=await i(e,t),E=await s(e);n.noShowCount=o,n.noShowRisk=r(o,E)}catch{n.noShowCount=0,n.noShowRisk="NONE"}return n}async function A(t,e){let{rows:a}=await S.query(`SELECT a.id, a."startAt", COALESCE(s.name, 'Prestation') AS "serviceName", a.price::text, a.status,
            st."firstName" AS "staffFirstName"
     FROM "Appointment" a
     LEFT JOIN "Service" s ON s.id = a."serviceId"
     JOIN "Customer" c ON c.id = a."customerId"
     LEFT JOIN "Staff" st ON st.id = a."staffId"
     WHERE a."customerId" = $1 AND c."organizationId" = $2
     ORDER BY a."startAt" DESC
     LIMIT 50`,[t,e]);return a.map(t=>({id:t.id,startAt:t.startAt.toISOString(),serviceName:t.serviceName,price:parseFloat(t.price),status:t.status,staffFirstName:t.staffFirstName}))}async function N(t,e){let i=(0,o.UK)(e.phone),s=`cust-${Date.now()}`;await S.query(`INSERT INTO "Customer" (
      id, "organizationId", "firstName", "lastName", phone, email,
      "birthDate", address, instagram, notes, status,
      "marketingWhatsapp", "marketingEmail", "marketingSms", "updatedAt"
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'NEW',$11,$12,$13,NOW())`,[s,t,e.firstName,e.lastName,i,e.email??null,e.birthDate?new Date(e.birthDate):null,e.address??null,e.instagram??null,e.notes??null,e.marketingWhatsapp??!1,e.marketingEmail??!1,e.marketingSms??!1]);let n=await c(s,t);if(!n)throw Error("Cliente cr\xe9\xe9e introuvable.");try{let{writeAuditLog:e}=await Promise.resolve().then(a.bind(a,66085));await e({organizationId:t,entityType:"Customer",entityId:s,action:"CREATE",after:{firstName:n.firstName,lastName:n.lastName,phone:n.phone}})}catch{}return n}async function I(t,e,a){let i=(0,o.UK)(e),{rows:s}=await (a??S).query(`SELECT id, "marketingWhatsapp", "marketingEmail"
     FROM "Customer"
     WHERE "organizationId" = $1 AND phone = $2 AND "deletedAt" IS NULL
     LIMIT 1`,[t,i]);return s[0]??null}async function m(t,e,a){let i=a??S,s=(0,o.UK)(e.phone),n=await I(t,s,i);if(n){let t=e.marketingOptIn||n.marketingWhatsapp,a=e.marketingOptIn||n.marketingEmail;return await i.query(`UPDATE "Customer"
       SET "firstName" = $1, "lastName" = $2,
           email = COALESCE($3, email),
           "marketingWhatsapp" = $4, "marketingEmail" = $5, "updatedAt" = NOW()
       WHERE id = $6`,[e.firstName.trim(),e.lastName.trim(),e.email?.trim()||null,t,a,n.id]),{customerId:n.id,created:!1}}let r=`cust-${Date.now()}-${Math.random().toString(36).slice(2,7)}`,E=e.marketingOptIn??!1;return await i.query(`INSERT INTO "Customer" (
      id, "organizationId", "firstName", "lastName", phone, email, status,
      "marketingWhatsapp", "marketingEmail", "marketingSms", "updatedAt"
    ) VALUES ($1,$2,$3,$4,$5,$6,'NEW',$7,$8,false,NOW())`,[r,t,e.firstName.trim(),e.lastName.trim(),s,e.email?.trim()||null,E,E]),{customerId:r,created:!0}}async function l(t,e,i){let s=await c(t,e);if(!s&&!i.archived)return null;if(i.archived){await S.query(`UPDATE "Customer"
       SET status = 'ARCHIVED', "deletedAt" = NOW(), "updatedAt" = NOW()
       WHERE id = $1 AND "organizationId" = $2 AND "deletedAt" IS NULL`,[t,e]);try{let{writeAuditLog:i}=await Promise.resolve().then(a.bind(a,66085));await i({organizationId:e,entityType:"Customer",entityId:t,action:"ARCHIVE",before:s?{status:s.status}:void 0,after:{status:"ARCHIVED"}})}catch{}return c(t,e)}let n=[],r=[],E=1,u=(t,e)=>{n.push(`"${t}" = $${E++}`),r.push(e)};if(void 0!==i.firstName&&u("firstName",i.firstName),void 0!==i.lastName&&u("lastName",i.lastName),void 0!==i.phone&&u("phone",(0,o.UK)(i.phone)),void 0!==i.email&&u("email",i.email??null),void 0!==i.birthDate&&u("birthDate",i.birthDate?new Date(i.birthDate):null),void 0!==i.address&&u("address",i.address??null),void 0!==i.instagram&&u("instagram",i.instagram??null),void 0!==i.notes&&u("notes",i.notes??null),void 0!==i.status&&u("status",i.status),void 0!==i.marketingWhatsapp&&u("marketingWhatsapp",i.marketingWhatsapp),void 0!==i.marketingEmail&&u("marketingEmail",i.marketingEmail),void 0!==i.marketingSms&&u("marketingSms",i.marketingSms),0===n.length)return c(t,e);n.push('"updatedAt" = NOW()'),r.push(t,e);let d=await S.query(`UPDATE "Customer" SET ${n.join(", ")}
     WHERE id = $${E} AND "organizationId" = $${E+1} AND "deletedAt" IS NULL`,r);if(0===d.rowCount)return null;let A=await c(t,e);try{let{writeAuditLog:i}=await Promise.resolve().then(a.bind(a,66085));await i({organizationId:e,entityType:"Customer",entityId:t,action:"UPDATE",before:s?{firstName:s.firstName,lastName:s.lastName,phone:s.phone,status:s.status}:void 0,after:A?{firstName:A.firstName,lastName:A.lastName,phone:A.phone,status:A.status}:void 0})}catch{}return A}function T(t){return"object"==typeof t&&null!==t&&"code"in t&&"23505"===t.code}i()}catch(t){i(t)}})},11107:(t,e,a)=>{a.d(e,{Fo:()=>i,P9:()=>s,TX:()=>r,co:()=>n});let i=3e3,s=8,n=90,r=30}};