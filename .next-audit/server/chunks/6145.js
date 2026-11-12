"use strict";!function(){try{var t="undefined"!=typeof window?window:"undefined"!=typeof global?global:"undefined"!=typeof self?self:{},e=(new t.Error).stack;e&&(t._sentryDebugIds=t._sentryDebugIds||{},t._sentryDebugIds[e]="c4041e53-da87-4be6-a2bd-4f0833990590",t._sentryDebugIdIdentifier="sentry-dbid-c4041e53-da87-4be6-a2bd-4f0833990590")}catch(t){}}(),exports.id=6145,exports.ids=[6145],exports.modules={26145:(t,e,a)=>{a.a(t,async(t,n)=>{try{a.d(e,{$9:()=>f,Ic:()=>y,YV:()=>N,b8:()=>m,eU:()=>A,redeemGiftCard:()=>S,tf:()=>I});var r=a(84770),i=a(8678),o=a(90831),d=a(66085),s=t([i,d]);[i,d]=s.then?(await s)():s;let T=(0,o.S)(new i.Pool({connectionString:process.env.DATABASE_URL}));function u(t){return`${t}_${(0,r.randomBytes)(8).toString("hex")}`}function E(){let t=()=>(0,r.randomBytes)(2).toString("hex").toUpperCase();return`BEAUTY-${t()}-${t()}`}let g=`g.id, g.code, g."initialValue"::text, g.balance::text, g.status::text,
              g."buyerCustomerId", g."beneficiaryCustomerId", g."expiresAt", g."createdAt", g.notes,
              b."firstName" AS "buyerFirst", b."lastName" AS "buyerLast", b.phone AS "buyerPhone",
              n."firstName" AS "benFirst", n."lastName" AS "benLast", n.phone AS "benPhone"`;function C(t){return{id:String(t.id),code:String(t.code),initialValue:parseFloat(String(t.initialValue))||0,balance:parseFloat(String(t.balance))||0,status:t.status,buyerName:t.buyerFirst||t.buyerLast?`${t.buyerFirst??""} ${t.buyerLast??""}`.trim():null,beneficiaryName:t.benFirst||t.benLast?`${t.benFirst??""} ${t.benLast??""}`.trim():null,buyerPhone:t.buyerPhone??null,beneficiaryPhone:t.benPhone??null,buyerCustomerId:t.buyerCustomerId??null,beneficiaryCustomerId:t.beneficiaryCustomerId??null,notes:t.notes??null,expiresAt:t.expiresAt?new Date(t.expiresAt).toISOString():null,createdAt:new Date(t.createdAt).toISOString()}}function c(t){return Math.round(100*(parseFloat(t??"0")||0))/100}async function l(t){let{rows:e}=await T.query(`SELECT
      (SELECT COUNT(*)::int FROM "GiftCard"
       WHERE "organizationId" = $1 AND status <> 'CANCELLED') AS "soldCount",
      COALESCE((SELECT SUM("initialValue") FROM "GiftCard"
        WHERE "organizationId" = $1 AND status <> 'CANCELLED'), 0)::text AS "soldValue",
      COALESCE((SELECT SUM(ABS(amount)) FROM "GiftCardTransaction"
        WHERE "organizationId" = $1 AND type = 'REDEEMED'), 0)::text AS "redeemedValue",
      COALESCE((SELECT SUM(balance) FROM "GiftCard"
        WHERE "organizationId" = $1 AND status = 'ACTIVE'), 0)::text AS "remainingBalance",
      (SELECT COUNT(*)::int FROM "GiftCard"
        WHERE "organizationId" = $1 AND status = 'ACTIVE') AS "activeCount",
      (SELECT COUNT(*)::int FROM "GiftCard"
        WHERE "organizationId" = $1 AND status = 'USED') AS "usedCount",
      (SELECT COUNT(*)::int FROM "GiftCard"
        WHERE "organizationId" = $1 AND status <> 'CANCELLED'
          AND notes IS NOT NULL AND BTRIM(notes) <> '') AS "ritualCount",
      (SELECT COUNT(*)::int FROM "GiftCard"
        WHERE "organizationId" = $1 AND status <> 'CANCELLED'
          AND timezone('Africa/Casablanca', "createdAt") >= date_trunc('month', timezone('Africa/Casablanca', now()))
          AND timezone('Africa/Casablanca', "createdAt") < date_trunc('month', timezone('Africa/Casablanca', now())) + interval '1 month'
      ) AS "soldThisMonth",
      (SELECT COUNT(*)::int FROM "GiftCard"
        WHERE "organizationId" = $1 AND status <> 'CANCELLED'
          AND timezone('Africa/Casablanca', "createdAt") >= date_trunc('month', timezone('Africa/Casablanca', now())) - interval '1 month'
          AND timezone('Africa/Casablanca', "createdAt") < date_trunc('month', timezone('Africa/Casablanca', now()))
      ) AS "soldPrevMonth",
      COALESCE((SELECT SUM("initialValue") FROM "GiftCard"
        WHERE "organizationId" = $1 AND status <> 'CANCELLED'
          AND timezone('Africa/Casablanca', "createdAt") >= date_trunc('month', timezone('Africa/Casablanca', now()))
          AND timezone('Africa/Casablanca', "createdAt") < date_trunc('month', timezone('Africa/Casablanca', now())) + interval '1 month'
      ), 0)::text AS "soldValueThisMonth",
      (SELECT COUNT(*)::int FROM "GiftCard"
        WHERE "organizationId" = $1 AND status = 'ACTIVE'
          AND "expiresAt" IS NOT NULL
          AND "expiresAt" >= now()
          AND "expiresAt" <= now() + interval '30 days') AS "expiringSoonCount",
      COALESCE((SELECT SUM(balance) FROM "GiftCard"
        WHERE "organizationId" = $1 AND status = 'ACTIVE'
          AND "expiresAt" IS NOT NULL
          AND "expiresAt" >= now()
          AND "expiresAt" <= now() + interval '30 days'), 0)::text AS "expiringSoonBalance"`,[t]),a=e[0];return{soldCount:a?.soldCount??0,soldValue:c(a?.soldValue),redeemedValue:c(a?.redeemedValue),remainingBalance:c(a?.remainingBalance),activeCount:a?.activeCount??0,usedCount:a?.usedCount??0,ritualCount:a?.ritualCount??0,soldThisMonth:a?.soldThisMonth??0,soldPrevMonth:a?.soldPrevMonth??0,soldValueThisMonth:c(a?.soldValueThisMonth),expiringSoonCount:a?.expiringSoonCount??0,expiringSoonBalance:c(a?.expiringSoonBalance)}}async function A(t,e){let a=['g."organizationId" = $1'],n=[t],r=2;e.status&&(a.push(`g.status = $${r}::"GiftCardStatus"`),n.push(e.status),r++),e.search&&(a.push(`(
      g.code ILIKE $${r}
      OR COALESCE(g.notes, '') ILIKE $${r}
      OR COALESCE(b."firstName", '') ILIKE $${r}
      OR COALESCE(b."lastName", '') ILIKE $${r}
      OR COALESCE(b.phone, '') ILIKE $${r}
      OR COALESCE(n."firstName", '') ILIKE $${r}
      OR COALESCE(n."lastName", '') ILIKE $${r}
      OR COALESCE(n.phone, '') ILIKE $${r}
    )`),n.push(`%${e.search}%`),r++);let i=a.join(" AND "),o=(e.page-1)*e.limit,[d,s,u]=await Promise.all([T.query(`SELECT COUNT(*)::int AS total
       FROM "GiftCard" g
       LEFT JOIN "Customer" b ON b.id = g."buyerCustomerId"
       LEFT JOIN "Customer" n ON n.id = g."beneficiaryCustomerId"
       WHERE ${i}`,n),T.query(`SELECT ${g}
       FROM "GiftCard" g
       LEFT JOIN "Customer" b ON b.id = g."buyerCustomerId"
       LEFT JOIN "Customer" n ON n.id = g."beneficiaryCustomerId"
       WHERE ${i}
       ORDER BY g."createdAt" DESC
       LIMIT $${r} OFFSET $${r+1}`,[...n,e.limit,o]),l(t)]);return{items:s.rows.map(t=>C(t)),total:d.rows[0]?.total??0,kpis:u}}async function I(t,e){let{rows:a}=await T.query(`SELECT ${g}
     FROM "GiftCard" g
     LEFT JOIN "Customer" b ON b.id = g."buyerCustomerId"
     LEFT JOIN "Customer" n ON n.id = g."beneficiaryCustomerId"
     WHERE g.id = $1 AND g."organizationId" = $2`,[e,t]);if(!a[0])return null;let n=await T.query(`SELECT id, type::text, amount::text, "balanceAfter"::text, reason, "paymentId", "createdAt"
     FROM "GiftCardTransaction" WHERE "giftCardId" = $1 ORDER BY "createdAt" ASC`,[e]);return{...C(a[0]),transactions:n.rows.map(t=>({id:t.id,type:t.type,amount:parseFloat(t.amount)||0,balanceAfter:parseFloat(t.balanceAfter)||0,reason:t.reason,paymentId:t.paymentId,createdAt:new Date(t.createdAt).toISOString()}))}}async function f(t,e){let{rows:a}=await T.query(`SELECT ${g}
     FROM "GiftCard" g
     LEFT JOIN "Customer" b ON b.id = g."buyerCustomerId"
     LEFT JOIN "Customer" n ON n.id = g."beneficiaryCustomerId"
     WHERE g."organizationId" = $1 AND upper(g.code) = upper($2)`,[t,e]);return a[0]?C(a[0]):null}async function y(t,e,a){let n=await T.connect(),r=E(),i=u("gc");try{await n.query("BEGIN");for(let o=0;o<5;o++)try{await n.query(`INSERT INTO "GiftCard" (
            id, "organizationId", code, "initialValue", balance,
            "buyerCustomerId", "beneficiaryCustomerId", status, "expiresAt",
            notes, "createdById", "updatedAt"
          ) VALUES (
            $1,$2,$3,$4,$4,$5,$6,'ACTIVE'::"GiftCardStatus",$7,$8,$9,NOW()
          )`,[i,t,r,e.amount,e.buyerCustomerId??null,e.beneficiaryCustomerId??null,function(t){if(t)return new Date(t);let e=new Date;return e.setFullYear(e.getFullYear()+1),e}(e.expiresAt),e.notes??null,a.id]);break}catch(t){if("object"==typeof t&&null!==t&&"code"in t&&"23505"===t.code&&o<4){r=E();continue}throw t}await n.query(`INSERT INTO "GiftCardTransaction" (
        id, "organizationId", "giftCardId", type, amount, "balanceAfter",
        reason, "createdById", "idempotencyKey"
      ) VALUES (
        $1,$2,$3,'ISSUED'::"GiftCardTxnType",$4,$4,'\xc9mission carte cadeau',$5,$6
      )`,[u("gctx"),t,i,e.amount,a.id,`issue:${i}`]),await (0,d.writeAuditLog)({organizationId:t,actorId:a.id,actorName:a.name,entityType:"GiftCard",entityId:i,action:"ISSUE",after:{code:r,amount:e.amount},client:n}),await n.query("COMMIT")}catch(t){throw await n.query("ROLLBACK"),t}finally{n.release()}let o=await I(t,i);if(!o)throw Error("NOT_FOUND");return o}async function m(t,e=20){let{rows:a}=await T.query(`SELECT t.id, g.code, t.type::text, t.amount::text, t."balanceAfter"::text,
            t.reason, t."paymentId", t."createdAt",
            NULLIF(TRIM(COALESCE(u."firstName", '') || ' ' || COALESCE(u."lastName", '')), '') AS "actorName"
     FROM "GiftCardTransaction" t
     JOIN "GiftCard" g ON g.id = t."giftCardId"
     LEFT JOIN "User" u ON u.id = t."createdById"
     WHERE t."organizationId" = $1
     ORDER BY t."createdAt" DESC
     LIMIT $2`,[t,e]);return a.map(t=>{var e;let a=parseFloat(t.amount)||0,n=parseFloat(t.balanceAfter)||0,i=new Date(t.createdAt).toISOString();return{id:t.id,code:t.code,type:t.type,amount:a,balanceAfter:n,reason:t.reason,paymentId:t.paymentId,actorName:t.actorName,createdAt:i,proofHash:(e=[t.id,t.type,t.amount,t.balanceAfter,i],(0,r.createHash)("sha256").update(e.join("|")).digest("hex"))}})}async function N(t,e,a){let n=await T.connect();try{await n.query("BEGIN");let{rows:r}=await n.query(`SELECT id, status::text, balance::text, code
       FROM "GiftCard"
       WHERE id = $1 AND "organizationId" = $2
       FOR UPDATE`,[e,t]);if(!r[0])throw Error("NOT_FOUND");if("ACTIVE"!==r[0].status)throw Error("GIFT_CARD_INACTIVE");await n.query(`UPDATE "GiftCard"
       SET status = 'CANCELLED'::"GiftCardStatus", "updatedAt" = NOW()
       WHERE id = $1`,[e]),await n.query(`INSERT INTO "GiftCardTransaction" (
        id, "organizationId", "giftCardId", type, amount, "balanceAfter",
        reason, "createdById", "idempotencyKey"
      ) VALUES (
        $1,$2,$3,'ADJUSTMENT'::"GiftCardTxnType",0,$4,'Suspension carte cadeau',$5,$6
      )`,[u("gctx"),t,e,parseFloat(r[0].balance)||0,a.id,`cancel:${e}:${Date.now()}`]),await (0,d.writeAuditLog)({organizationId:t,actorId:a.id,actorName:a.name,entityType:"GiftCard",entityId:e,action:"CANCEL",after:{code:r[0].code,status:"CANCELLED"},client:n}),await n.query("COMMIT")}catch(t){throw await n.query("ROLLBACK"),t}finally{n.release()}let r=await I(t,e);if(!r)throw Error("NOT_FOUND");return r}async function S(t){let e=t.client??T,a=`redeem:payment:${t.paymentId}`,n=await e.query(`SELECT "giftCardId", amount::text FROM "GiftCardTransaction"
     WHERE "organizationId" = $1 AND "idempotencyKey" = $2`,[t.organizationId,a]);if(n.rows[0])return{giftCardId:n.rows[0].giftCardId,redeemed:Math.abs(parseFloat(n.rows[0].amount)||0)};let r=t.giftCardId;if(!r&&t.code){let a=await e.query(`SELECT id FROM "GiftCard"
       WHERE "organizationId" = $1 AND upper(code) = upper($2)`,[t.organizationId,t.code]);r=a.rows[0]?.id}if(!r)throw Error("GIFT_CARD_NOT_FOUND");let{rows:i}=await e.query(`SELECT id, balance::text, status::text, "expiresAt"
     FROM "GiftCard"
     WHERE id = $1 AND "organizationId" = $2
     FOR UPDATE`,[r,t.organizationId]);if(!i[0])throw Error("GIFT_CARD_NOT_FOUND");if("ACTIVE"!==i[0].status)throw Error("GIFT_CARD_INACTIVE");if(i[0].expiresAt&&new Date(i[0].expiresAt)<new Date)throw await e.query(`UPDATE "GiftCard" SET status = 'EXPIRED'::"GiftCardStatus", "updatedAt" = NOW()
       WHERE id = $1`,[r]),Error("GIFT_CARD_EXPIRED");let o=parseFloat(i[0].balance)||0,d=Math.min(t.amount,o);if(d<=0)throw Error("GIFT_CARD_EMPTY");let s=Math.round((o-d)*100)/100,E=s<=0?"USED":"ACTIVE";return await e.query(`INSERT INTO "GiftCardTransaction" (
      id, "organizationId", "giftCardId", type, amount, "balanceAfter",
      reason, "paymentId", "createdById", "idempotencyKey"
    ) VALUES (
      $1,$2,$3,'REDEEMED'::"GiftCardTxnType",$4,$5,'Utilisation encaissement',$6,$7,$8
    )`,[u("gctx"),t.organizationId,r,-d,s,t.paymentId,t.userId??null,a]),await e.query(`UPDATE "GiftCard" SET
      balance = $1,
      status = $2::"GiftCardStatus",
      "updatedAt" = NOW()
     WHERE id = $3`,[s,E,r]),{giftCardId:r,redeemed:d}}n()}catch(t){n(t)}})}};