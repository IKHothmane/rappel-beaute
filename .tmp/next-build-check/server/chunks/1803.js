"use strict";exports.id=1803,exports.ids=[1803],exports.modules={81842:(t,e,a)=>{a.a(t,async(t,r)=>{try{a.d(e,{R8:()=>c,jc:()=>T,op:()=>p,tn:()=>S,wd:()=>l,z2:()=>N});var i=a(84770),s=a(79549),n=a(71225),o=t([s]);function E(t){let e=t.metadata&&"object"==typeof t.metadata&&!Array.isArray(t.metadata)?t.metadata:null;return{id:t.id,organizationId:t.organizationId,userId:t.userId,type:t.type,title:t.title,message:t.message,severity:t.severity,entityType:t.entityType,entityId:t.entityId,readAt:t.readAt?.toISOString()??null,metadata:e,createdAt:t.createdAt.toISOString(),href:(0,n.Qw)(t.entityType,t.entityId,e)}}async function d(t,e,a){if(!e.length)return[];let r=a??s.pool,{rows:i}=await r.query(`SELECT id, role::text AS role FROM "User"
     WHERE "organizationId" = $1 AND role = ANY($2::"UserRole"[])`,[t,e]);return i}async function u(t,e,a){let r=a??s.pool,{rows:i}=await r.query(`SELECT email, "firstName", "lastName" FROM "Staff"
     WHERE id = $1 AND "organizationId" = $2 AND "deletedAt" IS NULL`,[e,t]),n=i[0];if(!n)return null;if(n.email){let e=await r.query(`SELECT id FROM "User"
       WHERE "organizationId" = $1 AND lower(email) = lower($2) LIMIT 1`,[t,n.email]);if(e.rows[0])return e.rows[0].id}let o=await r.query(`SELECT id FROM "User"
     WHERE "organizationId" = $1
       AND lower("firstName") = lower($2)
       AND lower("lastName") = lower($3)
     LIMIT 1`,[t,n.firstName,n.lastName]);return o.rows[0]?.id??null}async function I(t){var e,a,r;let o=t.client??s.pool,E=(e=t.eventKey,a=t.entityId??null,r=t.userId,`notification:${e}:${a??"none"}:${r}`),d=`ntf_${(0,i.randomBytes)(8).toString("hex")}`,u=t.severity??(0,n.IY)(t.type),I=await o.query(`INSERT INTO "Notification" (
      id, "organizationId", "userId", type, title, message, severity,
      "entityType", "entityId", "idempotencyKey", metadata
    ) VALUES (
      $1,$2,$3,$4::"NotificationType",$5,$6,$7::"NotificationSeverity",
      $8,$9,$10,$11::jsonb
    )
    ON CONFLICT ("organizationId", "idempotencyKey") DO NOTHING
    RETURNING id`,[d,t.organizationId,t.userId,t.type,t.title,t.message,u,t.entityType??null,t.entityId??null,E,null!=t.metadata?JSON.stringify(t.metadata):null]);if(I.rows[0])return{created:!0,id:I.rows[0].id};let N=await o.query(`SELECT id FROM "Notification"
     WHERE "organizationId" = $1 AND "idempotencyKey" = $2`,[t.organizationId,E]);return{created:!1,id:N.rows[0]?.id??null}}async function N(t){let e=new Set(t.recipientUserIds??[]),a=t.recipientRoles??(0,n.LQ)(t.type);for(let r of(await d(t.organizationId,a,t.client)))e.add(r.id);if(t.alsoStaffId){let a=await u(t.organizationId,t.alsoStaffId,t.client);a&&e.add(a)}let r=0;for(let a of Array.from(e))(await I({organizationId:t.organizationId,userId:a,type:t.type,title:t.title,message:t.message,eventKey:t.eventKey,entityType:t.entityType,entityId:t.entityId,severity:t.severity,metadata:t.metadata,client:t.client})).created&&r++;return r}async function l(t,e,a){let r=Math.max(1,a.page??1),i=Math.min(100,Math.max(1,a.limit??20)),o=a.category??"all",d=['n."organizationId" = $1','n."userId" = $2'],u=[t,e],I=3;if("unread"===o)d.push('n."readAt" IS NULL');else if("urgent"===o)d.push("n.severity::text = 'CRITICAL'");else{let t=(0,n.fh)(o);t?.length&&(d.push(`n.type = ANY($${I}::"NotificationType"[])`),u.push(t),I++)}let N=d.join(" AND "),{rows:l}=await s.pool.query(`SELECT COUNT(*)::text AS total FROM "Notification" n WHERE ${N}`,u),{rows:S}=await s.pool.query(`SELECT COUNT(*)::text AS c FROM "Notification"
     WHERE "organizationId" = $1 AND "userId" = $2 AND "readAt" IS NULL`,[t,e]),{rows:c}=await s.pool.query(`SELECT
      n.id, n."organizationId", n."userId", n.type::text AS type, n.title, n.message,
      n.severity::text AS severity, n."entityType", n."entityId", n."readAt", n.metadata, n."createdAt"
     FROM "Notification" n
     WHERE ${N}
     ORDER BY n."createdAt" DESC
     LIMIT $${I} OFFSET $${I+1}`,[...u,i,(r-1)*i]),p=parseInt(l[0]?.total??"0",10),T=parseInt(S[0]?.c??"0",10);return{data:c.map(t=>E(t)),unreadCount:T,pagination:{page:r,limit:i,total:p,totalPages:Math.max(1,Math.ceil(p/i))}}}async function S(t,e){let{rows:a}=await s.pool.query(`SELECT COUNT(*)::text AS c FROM "Notification"
     WHERE "organizationId" = $1 AND "userId" = $2 AND "readAt" IS NULL`,[t,e]);return parseInt(a[0]?.c??"0",10)}async function c(t,e,a){return((await s.pool.query(`UPDATE "Notification"
     SET "readAt" = NOW()
     WHERE id = $1 AND "organizationId" = $2 AND "userId" = $3 AND "readAt" IS NULL`,[a,t,e])).rowCount??0)>0}async function p(t,e){return(await s.pool.query(`UPDATE "Notification"
     SET "readAt" = NOW()
     WHERE "organizationId" = $1 AND "userId" = $2 AND "readAt" IS NULL`,[t,e])).rowCount??0}async function T(t,e,a){let{rows:r}=await s.pool.query(`SELECT
      id, "organizationId", "userId", type::text AS type, title, message,
      severity::text AS severity, "entityType", "entityId", "readAt", metadata, "createdAt"
     FROM "Notification"
     WHERE id = $1 AND "organizationId" = $2 AND "userId" = $3`,[a,t,e]),i=r[0];return i?E(i):null}s=(o.then?(await o)():o)[0],r()}catch(t){r(t)}})},71803:(t,e,a)=>{a.a(t,async(t,r)=>{try{a.d(e,{B:()=>R,Gj:()=>f,J4:()=>I,JB:()=>W,Mm:()=>D,Pz:()=>l,Wn:()=>N,a4:()=>c,aB:()=>P,adminSupportAnalytics:()=>M,adminSupportAttention:()=>m,adminSupportKpis:()=>y,ds:()=>C,i5:()=>g,jB:()=>O,k9:()=>T,s3:()=>L,tB:()=>$,uN:()=>U,wD:()=>w,yU:()=>A,zv:()=>p});var i=a(84770),s=a(79549),n=a(81842),o=a(2192),E=a(51161),d=t([s,n,o,E]);function u(t){return`${t}_${(0,i.randomBytes)(6).toString("hex")}`}[s,n,o,E]=d.then?(await d)():d;let h=new Set(["TECHNICAL","BILLING","ACCOUNT","FEATURE_REQUEST","BUG","OTHER","LOGIN","SUBSCRIPTION","PAYMENT","APPOINTMENTS","CUSTOMERS","STOCK","MARKETING","WHATSAPP","AI"]),H=new Set(["OPEN","IN_PROGRESS","WAITING_CUSTOMER","RESOLVED","CLOSED"]),k=new Set(["LOW","NORMAL","HIGH","URGENT"]);function I(t){let e=String(t??"").toUpperCase();return h.has(e)?e:null}function N(t){let e=String(t??"").toUpperCase();return H.has(e)?e:null}function l(t){let e=String(t??"").toUpperCase();return k.has(e)?e:null}function S(t,e){return null!=t&&t>0?`#RB-${t}`:e?`#${e.slice(-6).toUpperCase()}`:"#RB-????"}let _=`
  t.*,
  COALESCE(t."ticketNumber", 0) AS "ticketNumber",
  o.name AS "organizationName",
  (SELECT pl.code FROM "Subscription" s
    JOIN "Plan" pl ON pl.id = s."planId"
    WHERE s."organizationId" = t."organizationId" AND s.status = 'ACTIVE'
    ORDER BY s."updatedAt" DESC LIMIT 1) AS "planCode",
  u."firstName" || ' ' || u."lastName" AS "createdByName",
  u.email AS "createdByEmail",
  CASE WHEN ap.id IS NOT NULL
    THEN ap."firstName" || ' ' || ap."lastName"
    ELSE NULL END AS "assignedToName",
  (SELECT LEFT(m.message, 120) FROM "SupportMessage" m
    WHERE m."ticketId" = t.id AND COALESCE(m."isInternal", false) = false
    ORDER BY m."createdAt" DESC LIMIT 1) AS "lastMessagePreview",
  (SELECT m."createdAt" FROM "SupportMessage" m
    WHERE m."ticketId" = t.id AND COALESCE(m."isInternal", false) = false
    ORDER BY m."createdAt" DESC LIMIT 1) AS "lastMessageAt",
  (SELECT m."senderType"::text FROM "SupportMessage" m
    WHERE m."ticketId" = t.id AND COALESCE(m."isInternal", false) = false
    ORDER BY m."createdAt" DESC LIMIT 1) AS "lastSenderType"
`;async function c(t){let{rows:e}=await s.pool.query(`SELECT t.*,
       COALESCE(t."ticketNumber", 0) AS "ticketNumber",
       (SELECT LEFT(m.message, 120) FROM "SupportMessage" m
         WHERE m."ticketId" = t.id AND COALESCE(m."isInternal", false) = false
         ORDER BY m."createdAt" DESC LIMIT 1) AS "lastMessagePreview",
       (SELECT m."createdAt" FROM "SupportMessage" m
         WHERE m."ticketId" = t.id AND COALESCE(m."isInternal", false) = false
         ORDER BY m."createdAt" DESC LIMIT 1) AS "lastMessageAt",
       (SELECT m."senderType"::text FROM "SupportMessage" m
         WHERE m."ticketId" = t.id AND COALESCE(m."isInternal", false) = false
         ORDER BY m."createdAt" DESC LIMIT 1) AS "lastSenderType"
     FROM "SupportTicket" t
     WHERE t."organizationId" = $1
     ORDER BY t."updatedAt" DESC`,[t]);return e}async function p(t,e){let{rows:a}=await s.pool.query(`SELECT t.*,
       COALESCE(t."ticketNumber", 0) AS "ticketNumber",
       u."firstName" || ' ' || u."lastName" AS "createdByName",
       u.email AS "createdByEmail"
     FROM "SupportTicket" t
     JOIN "User" u ON u.id = t."createdByUserId"
     WHERE t.id = $1 AND t."organizationId" = $2
     LIMIT 1`,[e,t]);return a[0]??null}async function T(t,e){let a=e?.includeInternal??!1,{rows:r}=await s.pool.query(`SELECT m.*,
       COALESCE(m."isInternal", false) AS "isInternal",
       CASE
         WHEN m."senderType" = 'INSTITUT' THEN COALESCE(u."firstName" || ' ' || u."lastName", 'Institut')
         ELSE COALESCE(p."firstName" || ' ' || p."lastName", 'Support')
       END AS "senderName"
     FROM "SupportMessage" m
     LEFT JOIN "User" u ON u.id = m."senderUserId"
     LEFT JOIN "PlatformUser" p ON p.id = m."senderPlatformUserId"
     WHERE m."ticketId" = $1
       AND ($2::boolean OR COALESCE(m."isInternal", false) = false)
     ORDER BY m."createdAt" ASC`,[t,a]);return r}async function A(t){let e=t.subject.trim().slice(0,200),a=t.message.trim().slice(0,5e3);if(!e||!a)throw Error("INVALID_INPUT");let r=u("stk"),i=u("smsg"),n=await s.pool.connect();try{await n.query("BEGIN"),await n.query(`INSERT INTO "SupportTicket" (
        id, "organizationId", "createdByUserId", subject, category, status, priority
      ) VALUES ($1,$2,$3,$4,$5::"SupportTicketCategory",'OPEN'::"SupportTicketStatus",$6::"SupportTicketPriority")`,[r,t.organizationId,t.createdByUserId,e,t.category,t.priority??"NORMAL"]),await n.query(`INSERT INTO "SupportMessage" (
        id, "ticketId", "senderType", "senderUserId", message, "isInternal"
      ) VALUES ($1,$2,'INSTITUT'::"SupportMessageSenderType",$3,$4,false)`,[i,r,t.createdByUserId,a]),await n.query("COMMIT")}catch(t){throw await n.query("ROLLBACK"),t}finally{n.release()}await (0,o.writeAuditLog)({organizationId:t.organizationId,actorId:t.createdByUserId,actorName:t.actorName,entityType:"SupportTicket",entityId:r,action:"CREATE",after:{subject:e,category:t.category}}).catch(()=>void 0);let E=await p(t.organizationId,r),d=await T(r);return{ticket:E,message:d[0]}}async function O(t){let e=await p(t.organizationId,t.ticketId);if(!e)throw Error("NOT_FOUND");if("CLOSED"===e.status)throw Error("TICKET_CLOSED");let a=t.message.trim().slice(0,5e3);if(!a)throw Error("INVALID_INPUT");let r=u("smsg");await s.pool.query(`INSERT INTO "SupportMessage" (
      id, "ticketId", "senderType", "senderUserId", message, "isInternal"
    ) VALUES ($1,$2,'INSTITUT'::"SupportMessageSenderType",$3,$4,false)`,[r,t.ticketId,t.userId,a]);let i="WAITING_CUSTOMER"===e.status||"RESOLVED"===e.status?"OPEN":e.status;return await s.pool.query(`UPDATE "SupportTicket"
     SET status = $1::"SupportTicketStatus",
         "updatedAt" = NOW(),
         "resolvedAt" = CASE WHEN $1 IN ('RESOLVED','CLOSED') THEN "resolvedAt" ELSE NULL END
     WHERE id = $2 AND "organizationId" = $3`,[i,t.ticketId,t.organizationId]),await (0,o.writeAuditLog)({organizationId:t.organizationId,actorId:t.userId,actorName:t.actorName,entityType:"SupportMessage",entityId:r,action:"CREATE",after:{ticketId:t.ticketId}}).catch(()=>void 0),(await T(t.ticketId)).find(t=>t.id===r)}function R(t){return null==t||Number.isNaN(t)?"—":t<60?`${Math.round(t)} min`:`${Math.floor(t/60)}h ${String(Math.round(t%60)).padStart(2,"0")}`}async function y(){let{rows:t}=await s.pool.query(`SELECT status::text AS status, COUNT(*)::text AS n
     FROM "SupportTicket"
     GROUP BY status`),e=Object.fromEntries(t.map(t=>[t.status,Number(t.n)])),a=e.OPEN??0,r=e.IN_PROGRESS??0,i=e.WAITING_CUSTOMER??0,n=e.RESOLVED??0,o=e.CLOSED??0,{rows:E}=await s.pool.query(`SELECT
       AVG(EXTRACT(EPOCH FROM ("firstResponseAt" - "createdAt")) / 60)
         FILTER (WHERE "firstResponseAt" IS NOT NULL)::text AS "avgResponse",
       AVG(EXTRACT(EPOCH FROM ("resolvedAt" - "createdAt")) / 60)
         FILTER (WHERE "resolvedAt" IS NOT NULL)::text AS "avgResolve",
       AVG("satisfactionRating") FILTER (WHERE "satisfactionRating" IS NOT NULL)::text AS "avgSat"
     FROM "SupportTicket"`);return{total:a+r+i+n+o,open:a,inProgress:r,waitingCustomer:i,resolved:n+o,closed:o,avgFirstResponseMinutes:E[0]?.avgResponse?Number(E[0].avgResponse):null,avgResolutionMinutes:E[0]?.avgResolve?Number(E[0].avgResolve):null,avgSatisfaction:E[0]?.avgSat?Number(Number(E[0].avgSat).toFixed(1)):null}}async function m(){let{rows:t}=await s.pool.query(`SELECT
      COUNT(*) FILTER (
        WHERE priority = 'URGENT' AND status IN ('OPEN','IN_PROGRESS')
      )::text AS "urgentOpen",
      COUNT(*) FILTER (
        WHERE priority = 'HIGH' AND status IN ('OPEN','IN_PROGRESS')
      )::text AS "highOpen",
      COUNT(*) FILTER (WHERE status = 'WAITING_CUSTOMER')::text AS "waitingCustomer",
      COUNT(*) FILTER (
        WHERE status IN ('OPEN','IN_PROGRESS')
          AND (
            SELECT m."createdAt" FROM "SupportMessage" m
            WHERE m."ticketId" = t.id AND COALESCE(m."isInternal", false) = false
            ORDER BY m."createdAt" DESC LIMIT 1
          ) < NOW() - INTERVAL '2 hours'
          AND (
            SELECT m."senderType"::text FROM "SupportMessage" m
            WHERE m."ticketId" = t.id AND COALESCE(m."isInternal", false) = false
            ORDER BY m."createdAt" DESC LIMIT 1
          ) = 'INSTITUT'
      )::text AS "staleNoReply"
     FROM "SupportTicket" t`),e=t[0];return{urgentOpen:Number(e?.urgentOpen??0),highOpen:Number(e?.highOpen??0),waitingCustomer:Number(e?.waitingCustomer??0),staleNoReply:Number(e?.staleNoReply??0)}}async function g(t){let e=[],a=[];if(t?.status&&(e.push(t.status),a.push(`t.status = $${e.length}::"SupportTicketStatus"`)),t?.priority&&(e.push(t.priority),a.push(`t.priority = $${e.length}::"SupportTicketPriority"`)),t?.category&&(e.push(t.category),a.push(`t.category = $${e.length}::"SupportTicketCategory"`)),t?.organizationId&&(e.push(t.organizationId),a.push(`t."organizationId" = $${e.length}`)),t?.assignedToPlatformUserId===null?a.push('t."assignedToPlatformUserId" IS NULL'):t?.assignedToPlatformUserId&&(e.push(t.assignedToPlatformUserId),a.push(`t."assignedToPlatformUserId" = $${e.length}`)),t?.search?.trim()){e.push(`%${t.search.trim()}%`);let r=e.length;a.push(`(t.subject ILIKE $${r} OR o.name ILIKE $${r} OR CAST(t."ticketNumber" AS text) ILIKE $${r}
        OR u."firstName" || ' ' || u."lastName" ILIKE $${r} OR u.email ILIKE $${r})`)}t?.attention==="urgent"?a.push("t.priority = 'URGENT' AND t.status IN ('OPEN','IN_PROGRESS')"):t?.attention==="high"?a.push("t.priority = 'HIGH' AND t.status IN ('OPEN','IN_PROGRESS')"):t?.attention==="waiting"?a.push("t.status = 'WAITING_CUSTOMER'"):t?.attention==="stale"&&a.push(`t.status IN ('OPEN','IN_PROGRESS')
      AND (SELECT m."createdAt" FROM "SupportMessage" m
           WHERE m."ticketId" = t.id AND COALESCE(m."isInternal", false) = false
           ORDER BY m."createdAt" DESC LIMIT 1) < NOW() - INTERVAL '2 hours'
      AND (SELECT m."senderType"::text FROM "SupportMessage" m
           WHERE m."ticketId" = t.id AND COALESCE(m."isInternal", false) = false
           ORDER BY m."createdAt" DESC LIMIT 1) = 'INSTITUT'`);let r=a.length?`WHERE ${a.join(" AND ")}`:"",{rows:i}=await s.pool.query(`SELECT ${_}
     FROM "SupportTicket" t
     JOIN "Organization" o ON o.id = t."organizationId"
     JOIN "User" u ON u.id = t."createdByUserId"
     LEFT JOIN "PlatformUser" ap ON ap.id = t."assignedToPlatformUserId"
     ${r}
     ORDER BY
       CASE t.priority WHEN 'URGENT' THEN 0 WHEN 'HIGH' THEN 1 WHEN 'NORMAL' THEN 2 ELSE 3 END,
       t."updatedAt" DESC
     LIMIT 300`,e);return i}async function C(t){let{rows:e}=await s.pool.query(`SELECT ${_}
     FROM "SupportTicket" t
     JOIN "Organization" o ON o.id = t."organizationId"
     JOIN "User" u ON u.id = t."createdByUserId"
     LEFT JOIN "PlatformUser" ap ON ap.id = t."assignedToPlatformUserId"
     WHERE t.id = $1
     LIMIT 1`,[t]);return e[0]??null}async function f(){let{rows:t}=await s.pool.query(`SELECT id, "firstName", "lastName", email, role::text AS role
     FROM "PlatformUser"
     WHERE status = 'ACTIVE'
     ORDER BY "firstName", "lastName"`);return t.map(t=>({id:t.id,name:`${t.firstName} ${t.lastName}`.trim(),email:t.email,role:t.role}))}async function L(t){let e=await C(t.ticketId);if(!e)throw Error("NOT_FOUND");let a=t.status??e.status,r=t.priority??e.priority,i=t.category??e.category,n=void 0!==t.assignedToPlatformUserId?t.assignedToPlatformUserId:e.assignedToPlatformUserId;return await s.pool.query(`UPDATE "SupportTicket"
     SET status = $1::"SupportTicketStatus",
         priority = $2::"SupportTicketPriority",
         category = $3::"SupportTicketCategory",
         "assignedToPlatformUserId" = $4,
         "resolvedAt" = CASE
           WHEN $1 IN ('RESOLVED','CLOSED') THEN COALESCE("resolvedAt", NOW())
           ELSE NULL
         END,
         "updatedAt" = NOW()
     WHERE id = $5`,[a,r,i,n,t.ticketId]),await (0,E._)({platformUserId:t.platformUserId,platformUserName:t.platformUserName,organizationId:e.organizationId,entityType:"SupportTicket",entityId:t.ticketId,action:"UPDATE",before:{status:e.status,priority:e.priority,category:e.category,assignedToPlatformUserId:e.assignedToPlatformUserId},after:{status:a,priority:r,category:i,assignedToPlatformUserId:n}}).catch(()=>void 0),await C(t.ticketId)}async function U(t){let e=await C(t.ticketId);if(!e)throw Error("NOT_FOUND");if("CLOSED"===e.status&&!t.isInternal)throw Error("TICKET_CLOSED");let a=t.message.trim().slice(0,5e3);if(!a)throw Error("INVALID_INPUT");let r=!!t.isInternal,i=u("smsg");if(await s.pool.query(`INSERT INTO "SupportMessage" (
      id, "ticketId", "senderType", "senderPlatformUserId", message, "isInternal"
    ) VALUES ($1,$2,'PLATFORM'::"SupportMessageSenderType",$3,$4,$5)`,[i,t.ticketId,t.platformUserId,a,r]),r)await s.pool.query('UPDATE "SupportTicket" SET "updatedAt" = NOW() WHERE id = $1',[t.ticketId]);else{let a=t.setStatus??"WAITING_CUSTOMER";await s.pool.query(`UPDATE "SupportTicket"
       SET status = $1::"SupportTicketStatus",
           "assignedToPlatformUserId" = COALESCE("assignedToPlatformUserId", $2),
           "firstResponseAt" = COALESCE("firstResponseAt", NOW()),
           "updatedAt" = NOW(),
           "resolvedAt" = CASE
             WHEN $1 IN ('RESOLVED','CLOSED') THEN COALESCE("resolvedAt", NOW())
             ELSE "resolvedAt"
           END
       WHERE id = $3`,[a,t.platformUserId,t.ticketId]),await (0,n.z2)({organizationId:e.organizationId,type:"SUPPORT_MESSAGE",eventKey:`support_reply_${i}`,title:`Ticket ${S(e.ticketNumber,e.id)}`,message:`Votre demande a re\xe7u une r\xe9ponse : \xab ${e.subject} \xbb`,entityType:"SupportTicket",entityId:e.id,recipientUserIds:[e.createdByUserId],severity:"INFO"}).catch(()=>void 0)}return await (0,E._)({platformUserId:t.platformUserId,platformUserName:t.platformUserName,organizationId:e.organizationId,entityType:"SupportMessage",entityId:i,action:"CREATE",after:{ticketId:t.ticketId,isInternal:r}}).catch(()=>void 0),(await T(t.ticketId,{includeInternal:!0})).find(t=>t.id===i)}async function D(t){let e=t.subject.trim().slice(0,200),a=t.message.trim().slice(0,5e3);if(!e||!a)throw Error("INVALID_INPUT");let{rows:r}=await s.pool.query('SELECT id FROM "User" WHERE id = $1 AND "organizationId" = $2 LIMIT 1',[t.createdByUserId,t.organizationId]);if(!r[0])throw Error("USER_NOT_IN_ORG");let i=u("stk"),o=u("smsg"),d=await s.pool.connect();try{await d.query("BEGIN"),await d.query(`INSERT INTO "SupportTicket" (
        id, "organizationId", "createdByUserId", subject, category, status, priority,
        "assignedToPlatformUserId"
      ) VALUES (
        $1,$2,$3,$4,$5::"SupportTicketCategory",'OPEN'::"SupportTicketStatus",
        $6::"SupportTicketPriority",$7
      )`,[i,t.organizationId,t.createdByUserId,e,t.category,t.priority,t.assignedToPlatformUserId??t.platformUserId]),await d.query(`INSERT INTO "SupportMessage" (
        id, "ticketId", "senderType", "senderPlatformUserId", message, "isInternal"
      ) VALUES ($1,$2,'PLATFORM'::"SupportMessageSenderType",$3,$4,false)`,[o,i,t.platformUserId,a]),await d.query(`UPDATE "SupportTicket"
       SET "firstResponseAt" = NOW(), status = 'IN_PROGRESS'::"SupportTicketStatus"
       WHERE id = $1`,[i]),await d.query("COMMIT")}catch(t){throw await d.query("ROLLBACK"),t}finally{d.release()}return await (0,E._)({platformUserId:t.platformUserId,platformUserName:t.platformUserName,organizationId:t.organizationId,entityType:"SupportTicket",entityId:i,action:"CREATE",after:{subject:e,category:t.category,priority:t.priority}}).catch(()=>void 0),await (0,n.z2)({organizationId:t.organizationId,type:"SUPPORT_MESSAGE",eventKey:`support_created_${i}`,title:"Nouveau ticket support",message:`Un ticket a \xe9t\xe9 ouvert : \xab ${e} \xbb`,entityType:"SupportTicket",entityId:i,recipientUserIds:[t.createdByUserId],severity:"INFO"}).catch(()=>void 0),await C(i)}async function M(){let{rows:t}=await s.pool.query(`SELECT to_char(date_trunc('day', "createdAt" AT TIME ZONE 'Africa/Casablanca'), 'YYYY-MM-DD') AS d,
            COUNT(*)::text AS n
     FROM "SupportTicket"
     WHERE "createdAt" >= NOW() - INTERVAL '30 days'
     GROUP BY 1
     ORDER BY 1`),{rows:e}=await s.pool.query(`SELECT category::text AS category, COUNT(*)::text AS n
     FROM "SupportTicket"
     GROUP BY category
     ORDER BY n DESC`),{rows:a}=await s.pool.query(`SELECT priority::text AS priority, COUNT(*)::text AS n
     FROM "SupportTicket"
     GROUP BY priority`),r=a.reduce((t,e)=>t+Number(e.n),0)||1,i=["Dim","Lun","Mar","Mer","Jeu","Ven","Sam"],{rows:n}=await s.pool.query(`SELECT EXTRACT(DOW FROM "firstResponseAt" AT TIME ZONE 'Africa/Casablanca')::int AS dow,
            AVG(EXTRACT(EPOCH FROM ("firstResponseAt" - "createdAt")) / 60)::text AS avg
     FROM "SupportTicket"
     WHERE "firstResponseAt" IS NOT NULL
       AND "createdAt" >= NOW() - INTERVAL '60 days'
     GROUP BY 1`);return{byDay:t.map(t=>({date:t.d,label:t.d.slice(5),count:Number(t.n)})),byCategory:e.map(t=>({category:t.category,count:Number(t.n)})),byPriority:["URGENT","HIGH","NORMAL","LOW"].map(t=>{let e=Number(a.find(e=>e.priority===t)?.n??0);return{priority:t,count:e,percent:Math.round(e/r*1e3)/10}}),responseByWeekday:[1,2,3,4,5].map(t=>{let e=n.find(e=>Number(e.dow)===t);return{weekday:t,label:i[t],avgMinutes:e?.avg!=null?Number(e.avg):null}})}}async function $(t){let{rows:e}=await s.pool.query(`SELECT id,
            "firstName" || ' ' || "lastName" AS name,
            email,
            role::text AS role
     FROM "User"
     WHERE "organizationId" = $1 AND status = 'ACTIVE'
     ORDER BY
       CASE role WHEN 'OWNER' THEN 0 WHEN 'MANAGER' THEN 1 ELSE 2 END,
       "firstName"`,[t]);return e}async function P(){let{rows:t}=await s.pool.query(`SELECT id, name FROM "Organization"
     WHERE status != 'ARCHIVED'
     ORDER BY name
     LIMIT 500`);return t}function w(t){return{...t,ref:S(t.ticketNumber,t.id),createdAt:t.createdAt.toISOString(),updatedAt:t.updatedAt.toISOString(),resolvedAt:t.resolvedAt?.toISOString()??null,firstResponseAt:t.firstResponseAt?.toISOString()??null,satisfactionAt:t.satisfactionAt?.toISOString()??null,lastMessageAt:t.lastMessageAt?.toISOString()??null}}function W(t){return{...t,isInternal:!!t.isInternal,createdAt:t.createdAt.toISOString()}}r()}catch(t){r(t)}})},71225:(t,e,a)=>{function r(t){switch(t){case"STOCK_LOW":case"STOCK_OUT":case"PRODUCT_EXPIRING":case"APPOINTMENT_CREATED":case"APPOINTMENT_CANCELLED":case"APPOINTMENT_NO_SHOW":case"APPOINTMENT_RESCHEDULED":case"STAFF_LEAVE":case"REVIEW_PENDING":case"CAMPAIGN_READY":case"PACKAGE_EXPIRING":case"LOYALTY_REWARD":case"SUPPORT_MESSAGE":return["OWNER","MANAGER"];case"PAYMENT_RECEIVED":return["OWNER","ACCOUNTANT","CASHIER"];case"REFUND_CREATED":case"EXPENSE_CREATED":return["OWNER","ACCOUNTANT"];case"SYSTEM":return["OWNER","MANAGER","STAFF","CASHIER","ACCOUNTANT"];default:return["OWNER"]}}function i(t){switch(t){case"STOCK_OUT":case"APPOINTMENT_NO_SHOW":return"CRITICAL";case"STOCK_LOW":case"PRODUCT_EXPIRING":case"APPOINTMENT_CANCELLED":case"APPOINTMENT_RESCHEDULED":case"REFUND_CREATED":return"WARNING";case"PAYMENT_RECEIVED":case"APPOINTMENT_CREATED":return"SUCCESS";default:return"INFO"}}function s(t){switch(t){case"agenda":return["APPOINTMENT_CREATED","APPOINTMENT_CANCELLED","APPOINTMENT_NO_SHOW","APPOINTMENT_RESCHEDULED"];case"finance":return["PAYMENT_RECEIVED","REFUND_CREATED","EXPENSE_CREATED"];case"stock":return["STOCK_LOW","STOCK_OUT","PRODUCT_EXPIRING"];case"reviews":return["REVIEW_PENDING"];case"crm":return["LOYALTY_REWARD","PACKAGE_EXPIRING"];case"marketing":return["CAMPAIGN_READY"];case"staff":return["STAFF_LEAVE","SUPPORT_MESSAGE","SYSTEM"];default:return null}}function n(t,e,a){if(!t||!e)return null;switch(t){case"Product":return`/products/${e}/`;case"Appointment":return`/agenda/?appointmentId=${e}`;case"Payment":return`/cash-register/?paymentId=${e}`;case"Expense":return`/expenses/${e}/`;case"ReviewRequest":return`/reviews/?requestId=${e}`;case"Campaign":return"/dashboard/";case"SupportTicket":return`/support/${e}/`;default:return"string"==typeof a?.href?a.href:null}}a.d(e,{IY:()=>i,LQ:()=>r,Qw:()=>n,fh:()=>s})}};