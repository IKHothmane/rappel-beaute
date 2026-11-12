"use strict";!function(){try{var e="undefined"!=typeof window?window:"undefined"!=typeof global?global:"undefined"!=typeof self?self:{},t=(new e.Error).stack;t&&(e._sentryDebugIds=e._sentryDebugIds||{},e._sentryDebugIds[t]="13f08f29-d45f-47fd-a313-1ef3f1019578",e._sentryDebugIdIdentifier="sentry-dbid-13f08f29-d45f-47fd-a313-1ef3f1019578")}catch(e){}}(),exports.id=9284,exports.ids=[9284],exports.modules={8713:(e,t,n)=>{n.a(e,async(e,a)=>{try{n.d(t,{E:()=>y,Fl:()=>m,OW:()=>c,RU:()=>A,XW:()=>l});var r=n(84770),o=n(8678),i=n(90831),u=n(66085),s=n(88885),d=e([o,u]);[o,u]=d.then?(await d)():d;let N=(0,i.S)(new o.Pool({connectionString:process.env.DATABASE_URL}));function p(e){return{id:String(e.id),category:e.category,amount:parseFloat(String(e.amount))||0,paymentMethod:e.paymentMethod,description:e.description??null,supplierId:e.supplierId??null,supplierName:e.supplierName??null,expenseDate:new Date(e.expenseDate).toISOString(),reference:e.reference??null,status:e.status,createdById:e.createdById??null,createdByName:e.userFirst||e.userLast?`${e.userFirst??""} ${e.userLast??""}`.trim():null,createdAt:new Date(e.createdAt).toISOString()}}let D=`
  SELECT
    e.id, e.category::text, e.amount::text, e."paymentMethod"::text,
    e.description, e."supplierId", s.name AS "supplierName",
    e."expenseDate", e.reference, e.status::text, e."createdById",
    e."createdAt", e."updatedAt",
    u."firstName" AS "userFirst", u."lastName" AS "userLast"
  FROM "Expense" e
  LEFT JOIN "Supplier" s ON s.id = e."supplierId"
  LEFT JOIN "User" u ON u.id = e."createdById"
`;async function E(e){let[t,n,a]=await Promise.all([N.query(`SELECT
        COALESCE(SUM(amount) FILTER (
          WHERE status = 'RECORDED'
            AND "expenseDate" >= date_trunc('month', NOW())
            AND "expenseDate" < date_trunc('month', NOW()) + INTERVAL '1 month'
        ), 0)::text AS "monthTotal",
        COALESCE(COUNT(*) FILTER (
          WHERE status = 'RECORDED'
            AND "expenseDate" >= date_trunc('month', NOW())
            AND "expenseDate" < date_trunc('month', NOW()) + INTERVAL '1 month'
        ), 0)::text AS "monthCount",
        COALESCE(SUM(amount) FILTER (
          WHERE status = 'RECORDED'
            AND "expenseDate" >= date_trunc('day', NOW())
            AND "expenseDate" < date_trunc('day', NOW()) + INTERVAL '1 day'
        ), 0)::text AS "todayTotal",
        COALESCE(COUNT(*) FILTER (
          WHERE status = 'RECORDED'
            AND "expenseDate" >= date_trunc('day', NOW())
            AND "expenseDate" < date_trunc('day', NOW()) + INTERVAL '1 day'
        ), 0)::text AS "todayCount",
        COALESCE(SUM(amount) FILTER (
          WHERE status = 'RECORDED'
            AND "expenseDate" >= date_trunc('month', NOW()) - INTERVAL '1 month'
            AND "expenseDate" < date_trunc('month', NOW())
        ), 0)::text AS "prevMonthTotal",
        COALESCE(SUM(amount) FILTER (
          WHERE status = 'VOID'
            AND "expenseDate" >= date_trunc('month', NOW())
            AND "expenseDate" < date_trunc('month', NOW()) + INTERVAL '1 month'
        ), 0)::text AS "voidMonthTotal",
        COALESCE(COUNT(*) FILTER (
          WHERE status = 'VOID'
            AND "expenseDate" >= date_trunc('month', NOW())
            AND "expenseDate" < date_trunc('month', NOW()) + INTERVAL '1 month'
        ), 0)::text AS "voidMonthCount"
       FROM "Expense"
       WHERE "organizationId" = $1 AND "deletedAt" IS NULL`,[e]),N.query(`SELECT category::text, COALESCE(SUM(amount), 0)::text AS amount, COUNT(*)::text AS count
       FROM "Expense"
       WHERE "organizationId" = $1 AND "deletedAt" IS NULL AND status = 'RECORDED'
         AND "expenseDate" >= date_trunc('month', NOW())
         AND "expenseDate" < date_trunc('month', NOW()) + INTERVAL '1 month'
       GROUP BY category
       ORDER BY SUM(amount) DESC`,[e]),N.query(`SELECT COALESCE(NULLIF(description, ''), category::text) AS label
       FROM "Expense"
       WHERE "organizationId" = $1 AND "deletedAt" IS NULL AND status = 'RECORDED'
         AND "expenseDate" >= date_trunc('day', NOW())
         AND "expenseDate" < date_trunc('day', NOW()) + INTERVAL '1 day'
       ORDER BY "expenseDate" DESC, "createdAt" DESC
       LIMIT 3`,[e])]),r=t.rows[0],o=parseFloat(r?.monthTotal??"0")||0,i=parseFloat(r?.todayTotal??"0")||0,u=parseFloat(r?.prevMonthTotal??"0")||0,d=parseFloat(r?.voidMonthTotal??"0")||0;return{monthTotal:Math.round(100*o)/100,monthCount:parseInt(r?.monthCount??"0",10)||0,todayTotal:Math.round(100*i)/100,todayCount:parseInt(r?.todayCount??"0",10)||0,todayLabels:a.rows.map(e=>{let t=e.label;return t&&t in s.Zp?s.Zp[t]:t}).filter(Boolean),prevMonthTotal:Math.round(100*u)/100,evolutionPct:u>0?Math.round((o-u)/u*1e3)/10:null,voidMonthTotal:Math.round(100*d)/100,voidMonthCount:parseInt(r?.voidMonthCount??"0",10)||0,byCategory:n.rows.map(e=>({category:e.category,amount:Math.round(100*(parseFloat(e.amount)||0))/100,count:parseInt(e.count,10)||0}))}}async function c(e,t){let n=['e."organizationId" = $1','e."deletedAt" IS NULL'],a=[e],r=2;t.includeVoid||n.push("e.status = 'RECORDED'"),t.category&&(n.push(`e.category = $${r}::"ExpenseCategory"`),a.push(t.category),r++),t.method&&(n.push(`e."paymentMethod" = $${r}::"PaymentMethod"`),a.push(t.method),r++),t.supplierId&&(n.push(`e."supplierId" = $${r}`),a.push(t.supplierId),r++),t.from&&(n.push(`e."expenseDate" >= $${r}::timestamptz`),a.push(t.from),r++),t.to&&(n.push(`e."expenseDate" < ($${r}::date + INTERVAL '1 day')`),a.push(t.to),r++),null!=t.minAmount&&(n.push(`e.amount >= $${r}`),a.push(t.minAmount),r++),null!=t.maxAmount&&(n.push(`e.amount <= $${r}`),a.push(t.maxAmount),r++),t.search&&(n.push(`(COALESCE(e.description,'') ILIKE $${r} OR COALESCE(e.reference,'') ILIKE $${r} OR COALESCE(s.name,'') ILIKE $${r})`),a.push(`%${t.search}%`),r++);let o=n.join(" AND "),i=(t.page-1)*t.limit,[u,s,d]=await Promise.all([N.query(`SELECT COUNT(*)::int AS total
       FROM "Expense" e
       LEFT JOIN "Supplier" s ON s.id = e."supplierId"
       WHERE ${o}`,a),N.query(`${D}
       WHERE ${o}
       ORDER BY e."expenseDate" DESC, e."createdAt" DESC
       LIMIT $${r} OFFSET $${r+1}`,[...a,t.limit,i]),E(e)]);return{items:s.rows.map(e=>p(e)),total:u.rows[0]?.total??0,kpis:d}}async function l(e,t){let{rows:n}=await N.query(`${D}
     WHERE e.id = $1 AND e."organizationId" = $2 AND e."deletedAt" IS NULL`,[t,e]);return n[0]?{...p(n[0]),updatedAt:new Date(n[0].updatedAt).toISOString()}:null}async function m(e,t,a){let o=await N.connect(),i=`exp_${(0,r.randomBytes)(8).toString("hex")}`;try{await o.query("BEGIN"),await o.query(`INSERT INTO "Expense" (
        id, "organizationId", category, amount, "paymentMethod", description,
        "supplierId", "expenseDate", reference, status, "createdById", "updatedAt"
      ) VALUES (
        $1,$2,$3::"ExpenseCategory",$4,$5::"PaymentMethod",$6,
        $7,$8,$9,'RECORDED'::"ExpenseStatus",$10,NOW()
      )`,[i,e,t.category,t.amount,t.paymentMethod,t.description??null,t.supplierId??null,new Date(t.expenseDate),t.reference??null,a.id]),await (0,u.writeAuditLog)({organizationId:e,actorId:a.id,actorName:a.name,entityType:"Expense",entityId:i,action:"CREATE",after:t,client:o}),await o.query("COMMIT")}catch(e){throw await o.query("ROLLBACK"),e}finally{o.release()}let s=await l(e,i);if(!s)throw Error("NOT_FOUND");try{let{notifyExpenseCreated:a}=await n.e(8702).then(n.bind(n,98702));await a(e,{expenseId:i,amount:t.amount,category:t.category,description:t.description})}catch(e){console.error("[createExpense] notification",e)}return s}async function y(e,t,n,a){let r=await l(e,t);if(!r)throw Error("NOT_FOUND");if("VOID"===r.status)throw Error("VOIDED");let o={category:n.category??r.category,amount:n.amount??r.amount,paymentMethod:n.paymentMethod??r.paymentMethod,description:void 0!==n.description?n.description:r.description,supplierId:void 0!==n.supplierId?n.supplierId:r.supplierId,expenseDate:n.expenseDate??r.expenseDate,reference:void 0!==n.reference?n.reference:r.reference},i=await N.connect();try{await i.query("BEGIN"),await i.query(`UPDATE "Expense" SET
        category = $1::"ExpenseCategory",
        amount = $2,
        "paymentMethod" = $3::"PaymentMethod",
        description = $4,
        "supplierId" = $5,
        "expenseDate" = $6,
        reference = $7,
        "updatedAt" = NOW()
       WHERE id = $8 AND "organizationId" = $9`,[o.category,o.amount,o.paymentMethod,o.description,o.supplierId,new Date(o.expenseDate),o.reference,t,e]),await (0,u.writeAuditLog)({organizationId:e,actorId:a.id,actorName:a.name,entityType:"Expense",entityId:t,action:"UPDATE",before:{amount:r.amount,category:r.category,paymentMethod:r.paymentMethod,description:r.description},after:o,client:i}),await i.query("COMMIT")}catch(e){throw await i.query("ROLLBACK"),e}finally{i.release()}let s=await l(e,t);if(!s)throw Error("NOT_FOUND");return s}async function A(e,t,n,a){let r=await l(e,t);if(!r)throw Error("NOT_FOUND");if("VOID"===r.status)return r;let o=await N.connect();try{await o.query("BEGIN"),await o.query(`UPDATE "Expense"
       SET status = 'VOID'::"ExpenseStatus",
           "updatedAt" = NOW()
       WHERE id = $1 AND "organizationId" = $2`,[t,e]),await (0,u.writeAuditLog)({organizationId:e,actorId:n.id,actorName:n.name,entityType:"Expense",entityId:t,action:"VOID",before:{amount:r.amount,status:r.status},after:{status:"VOID",reason:a??null},client:o}),await o.query("COMMIT")}catch(e){throw await o.query("ROLLBACK"),e}finally{o.release()}let i=await l(e,t);if(!i)throw Error("NOT_FOUND");return i}a()}catch(e){a(e)}})},52489:(e,t,n)=>{n.d(t,{Ev:()=>d,az:()=>E,g:()=>p});var a=n(88885),r=n(47566);function o(e){if("string"!=typeof e)return;let t=e.trim();return t.length?t:void 0}function i(e){return"number"==typeof e&&Number.isFinite(e)?e:"string"==typeof e&&""!==e.trim()&&Number.isFinite(Number(e))?Number(e):void 0}function u(e){let t=o(e);return t&&a.mc.includes(t)?t:void 0}function s(e){let t=o(e);return t&&(0,r.T4)(t)?t:void 0}function d(e){return{page:Math.max(1,Number(e.get("page"))||1),limit:Math.min(100,Math.max(1,Number(e.get("limit"))||40)),search:e.get("search")?.trim()||"",category:u(e.get("category")??void 0)??null,method:s(e.get("method")??void 0)??null,supplierId:e.get("supplierId")?.trim()||null,from:e.get("from")?.trim()||null,to:e.get("to")?.trim()||null,minAmount:i(e.get("minAmount")??void 0)??null,maxAmount:i(e.get("maxAmount")??void 0)??null,includeVoid:"1"===e.get("includeVoid")}}function p(e){let t=[],n=u(e.category),a=i(e.amount),r=s(e.paymentMethod),d=o(e.expenseDate);return(n||t.push("category"),(void 0===a||a<=0)&&t.push("amount"),r||t.push("paymentMethod"),d||t.push("expenseDate"),!t.length&&n&&void 0!==a&&r&&d)?{ok:!0,data:{category:n,amount:Math.round(100*a)/100,paymentMethod:r,description:o(e.description),supplierId:o(e.supplierId),expenseDate:d,reference:o(e.reference)}}:{ok:!1,errors:t.length?t:["invalid"]}}function E(e){let t={};if(void 0!==e.category){let n=u(e.category);if(!n)return{ok:!1,errors:["category"]};t.category=n}if(void 0!==e.amount){let n=i(e.amount);if(void 0===n||n<=0)return{ok:!1,errors:["amount"]};t.amount=Math.round(100*n)/100}if(void 0!==e.paymentMethod){let n=s(e.paymentMethod);if(!n)return{ok:!1,errors:["paymentMethod"]};t.paymentMethod=n}if(void 0!==e.description&&(t.description=o(e.description)??null),void 0!==e.supplierId&&(t.supplierId=o(e.supplierId)??null),void 0!==e.expenseDate){let n=o(e.expenseDate);if(!n)return{ok:!1,errors:["expenseDate"]};t.expenseDate=n}return void 0!==e.reference&&(t.reference=o(e.reference)??null),{ok:!0,data:t}}},88885:(e,t,n)=>{n.d(t,{Zp:()=>r,mc:()=>a});let a=["RENT","ELECTRICITY","WATER","INTERNET","SALARY","MARKETING","MAINTENANCE","TRANSPORT","OFFICE","PRODUCT_PURCHASE","OTHER"],r={RENT:"Loyer",ELECTRICITY:"\xc9lectricit\xe9",WATER:"Eau",INTERNET:"Internet",SALARY:"Salaires",MARKETING:"Marketing",MAINTENANCE:"Maintenance",TRANSPORT:"Transport",OFFICE:"Fournitures",PRODUCT_PURCHASE:"Achats produits (charge)",OTHER:"Autres"}},47566:(e,t,n)=>{n.d(t,{T4:()=>r,kh:()=>i});let a=["CASH","CARD","TRANSFER"];function r(e){return a.includes(e)}let o=["CASH","CARD","TRANSFER","CHECK","ONLINE","GIFT_CARD"];function i(e){return o.includes(e)}}};