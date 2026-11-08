"use strict";exports.id=5430,exports.ids=[5430],exports.modules={95430:(t,a,e)=>{e.a(t,async(t,n)=>{try{e.d(a,{$9:()=>I,Ic:()=>f,YV:()=>N,b8:()=>m,eU:()=>l,redeemGiftCard:()=>y,tf:()=>A});var r=e(84770),i=e(8678),o=e(2192),d=t([i,o]);[i,o]=d.then?(await d)():d;let S=new i.Pool({connectionString:process.env.DATABASE_URL});function s(t){return`${t}_${(0,r.randomBytes)(8).toString("hex")}`}function u(){let t=()=>(0,r.randomBytes)(2).toString("hex").toUpperCase();return`BEAUTY-${t()}-${t()}`}let T=`g.id, g.code, g."initialValue"::text, g.balance::text, g.status::text,
              g."buyerCustomerId", g."beneficiaryCustomerId", g."expiresAt", g."createdAt", g.notes,
              b."firstName" AS "buyerFirst", b."lastName" AS "buyerLast", b.phone AS "buyerPhone",
              n."firstName" AS "benFirst", n."lastName" AS "benLast", n.phone AS "benPhone"`;function E(t){return{id:String(t.id),code:String(t.code),initialValue:parseFloat(String(t.initialValue))||0,balance:parseFloat(String(t.balance))||0,status:t.status,buyerName:t.buyerFirst||t.buyerLast?`${t.buyerFirst??""} ${t.buyerLast??""}`.trim():null,beneficiaryName:t.benFirst||t.benLast?`${t.benFirst??""} ${t.benLast??""}`.trim():null,buyerPhone:t.buyerPhone??null,beneficiaryPhone:t.benPhone??null,buyerCustomerId:t.buyerCustomerId??null,beneficiaryCustomerId:t.beneficiaryCustomerId??null,notes:t.notes??null,expiresAt:t.expiresAt?new Date(t.expiresAt).toISOString():null,createdAt:new Date(t.createdAt).toISOString()}}function C(t){return Math.round(100*(parseFloat(t??"0")||0))/100}async function c(t){let{rows:a}=await S.query(`SELECT
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
          AND "expiresAt" <= now() + interval '30 days'), 0)::text AS "expiringSoonBalance"`,[t]),e=a[0];return{soldCount:e?.soldCount??0,soldValue:C(e?.soldValue),redeemedValue:C(e?.redeemedValue),remainingBalance:C(e?.remainingBalance),activeCount:e?.activeCount??0,usedCount:e?.usedCount??0,ritualCount:e?.ritualCount??0,soldThisMonth:e?.soldThisMonth??0,soldPrevMonth:e?.soldPrevMonth??0,soldValueThisMonth:C(e?.soldValueThisMonth),expiringSoonCount:e?.expiringSoonCount??0,expiringSoonBalance:C(e?.expiringSoonBalance)}}async function l(t,a){let e=['g."organizationId" = $1'],n=[t],r=2;a.status&&(e.push(`g.status = $${r}::"GiftCardStatus"`),n.push(a.status),r++),a.search&&(e.push(`(
      g.code ILIKE $${r}
      OR COALESCE(g.notes, '') ILIKE $${r}
      OR COALESCE(b."firstName", '') ILIKE $${r}
      OR COALESCE(b."lastName", '') ILIKE $${r}
      OR COALESCE(b.phone, '') ILIKE $${r}
      OR COALESCE(n."firstName", '') ILIKE $${r}
      OR COALESCE(n."lastName", '') ILIKE $${r}
      OR COALESCE(n.phone, '') ILIKE $${r}
    )`),n.push(`%${a.search}%`),r++);let i=e.join(" AND "),o=(a.page-1)*a.limit,[d,s,u]=await Promise.all([S.query(`SELECT COUNT(*)::int AS total
       FROM "GiftCard" g
       LEFT JOIN "Customer" b ON b.id = g."buyerCustomerId"
       LEFT JOIN "Customer" n ON n.id = g."beneficiaryCustomerId"
       WHERE ${i}`,n),S.query(`SELECT ${T}
       FROM "GiftCard" g
       LEFT JOIN "Customer" b ON b.id = g."buyerCustomerId"
       LEFT JOIN "Customer" n ON n.id = g."beneficiaryCustomerId"
       WHERE ${i}
       ORDER BY g."createdAt" DESC
       LIMIT $${r} OFFSET $${r+1}`,[...n,a.limit,o]),c(t)]);return{items:s.rows.map(t=>E(t)),total:d.rows[0]?.total??0,kpis:u}}async function A(t,a){let{rows:e}=await S.query(`SELECT ${T}
     FROM "GiftCard" g
     LEFT JOIN "Customer" b ON b.id = g."buyerCustomerId"
     LEFT JOIN "Customer" n ON n.id = g."beneficiaryCustomerId"
     WHERE g.id = $1 AND g."organizationId" = $2`,[a,t]);if(!e[0])return null;let n=await S.query(`SELECT id, type::text, amount::text, "balanceAfter"::text, reason, "paymentId", "createdAt"
     FROM "GiftCardTransaction" WHERE "giftCardId" = $1 ORDER BY "createdAt" ASC`,[a]);return{...E(e[0]),transactions:n.rows.map(t=>({id:t.id,type:t.type,amount:parseFloat(t.amount)||0,balanceAfter:parseFloat(t.balanceAfter)||0,reason:t.reason,paymentId:t.paymentId,createdAt:new Date(t.createdAt).toISOString()}))}}async function I(t,a){let{rows:e}=await S.query(`SELECT ${T}
     FROM "GiftCard" g
     LEFT JOIN "Customer" b ON b.id = g."buyerCustomerId"
     LEFT JOIN "Customer" n ON n.id = g."beneficiaryCustomerId"
     WHERE g."organizationId" = $1 AND upper(g.code) = upper($2)`,[t,a]);return e[0]?E(e[0]):null}async function f(t,a,e){let n=await S.connect(),r=u(),i=s("gc");try{await n.query("BEGIN");for(let o=0;o<5;o++)try{await n.query(`INSERT INTO "GiftCard" (
            id, "organizationId", code, "initialValue", balance,
            "buyerCustomerId", "beneficiaryCustomerId", status, "expiresAt",
            notes, "createdById", "updatedAt"
          ) VALUES (
            $1,$2,$3,$4,$4,$5,$6,'ACTIVE'::"GiftCardStatus",$7,$8,$9,NOW()
          )`,[i,t,r,a.amount,a.buyerCustomerId??null,a.beneficiaryCustomerId??null,function(t){if(t)return new Date(t);let a=new Date;return a.setFullYear(a.getFullYear()+1),a}(a.expiresAt),a.notes??null,e.id]);break}catch(t){if("object"==typeof t&&null!==t&&"code"in t&&"23505"===t.code&&o<4){r=u();continue}throw t}await n.query(`INSERT INTO "GiftCardTransaction" (
        id, "organizationId", "giftCardId", type, amount, "balanceAfter",
        reason, "createdById", "idempotencyKey"
      ) VALUES (
        $1,$2,$3,'ISSUED'::"GiftCardTxnType",$4,$4,'\xc9mission carte cadeau',$5,$6
      )`,[s("gctx"),t,i,a.amount,e.id,`issue:${i}`]),await (0,o.writeAuditLog)({organizationId:t,actorId:e.id,actorName:e.name,entityType:"GiftCard",entityId:i,action:"ISSUE",after:{code:r,amount:a.amount},client:n}),await n.query("COMMIT")}catch(t){throw await n.query("ROLLBACK"),t}finally{n.release()}let d=await A(t,i);if(!d)throw Error("NOT_FOUND");return d}async function m(t,a=20){let{rows:e}=await S.query(`SELECT t.id, g.code, t.type::text, t.amount::text, t."balanceAfter"::text,
            t.reason, t."paymentId", t."createdAt",
            NULLIF(TRIM(COALESCE(u."firstName", '') || ' ' || COALESCE(u."lastName", '')), '') AS "actorName"
     FROM "GiftCardTransaction" t
     JOIN "GiftCard" g ON g.id = t."giftCardId"
     LEFT JOIN "User" u ON u.id = t."createdById"
     WHERE t."organizationId" = $1
     ORDER BY t."createdAt" DESC
     LIMIT $2`,[t,a]);return e.map(t=>{var a;let e=parseFloat(t.amount)||0,n=parseFloat(t.balanceAfter)||0,i=new Date(t.createdAt).toISOString();return{id:t.id,code:t.code,type:t.type,amount:e,balanceAfter:n,reason:t.reason,paymentId:t.paymentId,actorName:t.actorName,createdAt:i,proofHash:(a=[t.id,t.type,t.amount,t.balanceAfter,i],(0,r.createHash)("sha256").update(a.join("|")).digest("hex"))}})}async function N(t,a,e){let n=await S.connect();try{await n.query("BEGIN");let{rows:r}=await n.query(`SELECT id, status::text, balance::text, code
       FROM "GiftCard"
       WHERE id = $1 AND "organizationId" = $2
       FOR UPDATE`,[a,t]);if(!r[0])throw Error("NOT_FOUND");if("ACTIVE"!==r[0].status)throw Error("GIFT_CARD_INACTIVE");await n.query(`UPDATE "GiftCard"
       SET status = 'CANCELLED'::"GiftCardStatus", "updatedAt" = NOW()
       WHERE id = $1`,[a]),await n.query(`INSERT INTO "GiftCardTransaction" (
        id, "organizationId", "giftCardId", type, amount, "balanceAfter",
        reason, "createdById", "idempotencyKey"
      ) VALUES (
        $1,$2,$3,'ADJUSTMENT'::"GiftCardTxnType",0,$4,'Suspension carte cadeau',$5,$6
      )`,[s("gctx"),t,a,parseFloat(r[0].balance)||0,e.id,`cancel:${a}:${Date.now()}`]),await (0,o.writeAuditLog)({organizationId:t,actorId:e.id,actorName:e.name,entityType:"GiftCard",entityId:a,action:"CANCEL",after:{code:r[0].code,status:"CANCELLED"},client:n}),await n.query("COMMIT")}catch(t){throw await n.query("ROLLBACK"),t}finally{n.release()}let r=await A(t,a);if(!r)throw Error("NOT_FOUND");return r}async function y(t){let a=t.client??S,e=`redeem:payment:${t.paymentId}`,n=await a.query(`SELECT "giftCardId", amount::text FROM "GiftCardTransaction"
     WHERE "organizationId" = $1 AND "idempotencyKey" = $2`,[t.organizationId,e]);if(n.rows[0])return{giftCardId:n.rows[0].giftCardId,redeemed:Math.abs(parseFloat(n.rows[0].amount)||0)};let r=t.giftCardId;if(!r&&t.code){let e=await a.query(`SELECT id FROM "GiftCard"
       WHERE "organizationId" = $1 AND upper(code) = upper($2)`,[t.organizationId,t.code]);r=e.rows[0]?.id}if(!r)throw Error("GIFT_CARD_NOT_FOUND");let{rows:i}=await a.query(`SELECT id, balance::text, status::text, "expiresAt"
     FROM "GiftCard"
     WHERE id = $1 AND "organizationId" = $2
     FOR UPDATE`,[r,t.organizationId]);if(!i[0])throw Error("GIFT_CARD_NOT_FOUND");if("ACTIVE"!==i[0].status)throw Error("GIFT_CARD_INACTIVE");if(i[0].expiresAt&&new Date(i[0].expiresAt)<new Date)throw await a.query(`UPDATE "GiftCard" SET status = 'EXPIRED'::"GiftCardStatus", "updatedAt" = NOW()
       WHERE id = $1`,[r]),Error("GIFT_CARD_EXPIRED");let o=parseFloat(i[0].balance)||0,d=Math.min(t.amount,o);if(d<=0)throw Error("GIFT_CARD_EMPTY");let u=Math.round((o-d)*100)/100,E=u<=0?"USED":"ACTIVE";return await a.query(`INSERT INTO "GiftCardTransaction" (
      id, "organizationId", "giftCardId", type, amount, "balanceAfter",
      reason, "paymentId", "createdById", "idempotencyKey"
    ) VALUES (
      $1,$2,$3,'REDEEMED'::"GiftCardTxnType",$4,$5,'Utilisation encaissement',$6,$7,$8
    )`,[s("gctx"),t.organizationId,r,-d,u,t.paymentId,t.userId??null,e]),await a.query(`UPDATE "GiftCard" SET
      balance = $1,
      status = $2::"GiftCardStatus",
      "updatedAt" = NOW()
     WHERE id = $3`,[u,E,r]),{giftCardId:r,redeemed:d}}n()}catch(t){n(t)}})}};