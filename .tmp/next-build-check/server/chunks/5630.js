"use strict";exports.id=5630,exports.ids=[5630],exports.modules={45630:(e,t,r)=>{r.a(e,async(e,i)=>{try{r.d(t,{G6:()=>f,Pg:()=>T,TO:()=>S,a7:()=>p,o3:()=>u,wo:()=>R});var a=r(84770),s=r(8678),n=e([s]);let O=new(s=(n.then?(await n)():n)[0]).Pool({connectionString:process.env.DATABASE_URL});function o(e){return`${e}_${(0,a.randomBytes)(8).toString("hex")}`}function c(e,t){if(void 0===e)return;if(null===e||""===e)return null;if(e.includes(".."))throw Error("INVALID_IMAGE");let r=`/services/${t}/`;if(!e.includes(r)&&!e.includes("/services/platform/"))throw Error("INVALID_IMAGE");return e}function d(e){return{id:e.id,name:e.name,category:e.category,description:e.description,price:parseFloat(e.price),durationMin:e.durationMin,prepTimeMin:e.prepTimeMin,cleanupTimeMin:e.cleanupTimeMin,deposit:null!=e.deposit?parseFloat(e.deposit):null,recommendedReturnDays:e.recommendedReturnDays,imageUrl:e.imageUrl??null,active:e.active,staffCount:parseInt(e.staffCount,10)||0,staffNames:e.staffNames??[],resourceCount:parseInt(e.resourceCount,10)||0,productCount:parseInt(e.productCount,10)||0}}let y=`
  SELECT
    s.id,
    s.name,
    s.description,
    s.category,
    s.price::text,
    s."durationMin",
    s."prepTimeMin",
    s."cleanupTimeMin",
    s.deposit::text,
    s."recommendedReturnDays",
    COALESCE(
      NULLIF(TRIM(s."imageUrl"), ''),
      (
        SELECT scd."imageUrl"
        FROM "ServiceCatalogDefault" scd
        WHERE scd.name = s.name
          AND scd."imageUrl" IS NOT NULL
          AND scd."imageUrl" <> ''
        LIMIT 1
      )
    ) AS "imageUrl",
    s.active,
    s."createdAt",
    s."updatedAt",
    COUNT(DISTINCT ss."staffId")::text AS "staffCount",
    COALESCE(array_agg(DISTINCT TRIM(CONCAT(st."firstName", ' ', NULLIF(st."lastName", '')))) FILTER (WHERE st."firstName" IS NOT NULL), '{}') AS "staffNames",
    COUNT(DISTINCT sr."resourceId")::text AS "resourceCount",
    COUNT(DISTINCT sp."productId")::text AS "productCount"
  FROM "Service" s
  LEFT JOIN "ServiceStaff" ss ON ss."serviceId" = s.id
  LEFT JOIN "Staff" st ON st.id = ss."staffId"
  LEFT JOIN "ServiceResource" sr ON sr."serviceId" = s.id
  LEFT JOIN "ServiceProduct" sp ON sp."serviceId" = s.id
`;async function u(e,t){let{page:r,limit:i,search:a,category:s,active:n,agenda:o}=t,c=['s."organizationId" = $1'],u=[e],E=2;a&&(c.push(`(s.name ILIKE $${E} OR COALESCE(s.category, '') ILIKE $${E} OR COALESCE(s.description, '') ILIKE $${E})`),u.push(`%${a}%`),E++),s&&(c.push(`s.category = $${E}`),u.push(s),E++),null!=n&&(c.push(`s.active = $${E}`),u.push(n),E++);let p=c.join(" AND "),{rows:I}=await O.query(`SELECT DISTINCT category FROM "Service"
     WHERE "organizationId" = $1 AND category IS NOT NULL AND category <> ''
     ORDER BY category`,[e]);if(o){let{rows:e}=await O.query(`SELECT
        s.id,
        s.name,
        s.price::text,
        s."durationMin",
        s."prepTimeMin",
        s."cleanupTimeMin",
        s.deposit::text,
        s.active,
        COALESCE(array_agg(DISTINCT ss."staffId") FILTER (WHERE ss."staffId" IS NOT NULL), '{}') AS "staffIds",
        COALESCE(array_agg(DISTINCT sr."resourceId") FILTER (WHERE sr."resourceId" IS NOT NULL), '{}') AS "resourceIds"
      FROM "Service" s
      LEFT JOIN "ServiceStaff" ss ON ss."serviceId" = s.id
      LEFT JOIN "ServiceResource" sr ON sr."serviceId" = s.id
      WHERE ${p} AND s.active = true
      GROUP BY s.id
      ORDER BY s.name`,u);return{items:e.map(e=>({id:e.id,name:e.name,price:parseFloat(e.price),durationMin:e.durationMin,prepTimeMin:e.prepTimeMin,cleanupTimeMin:e.cleanupTimeMin,totalBlockMin:e.prepTimeMin+e.durationMin+e.cleanupTimeMin,deposit:null!=e.deposit?parseFloat(e.deposit):null,active:e.active,staffIds:e.staffIds??[],resourceIds:e.resourceIds??[]})),total:e.length,categories:I.map(e=>e.category)}}let m=`
    SELECT COUNT(DISTINCT s.id)::int AS total
    FROM "Service" s
    WHERE ${p}
  `,l=`
    ${y}
    WHERE ${p}
    GROUP BY s.id
    ORDER BY s.active DESC, s.name ASC
    LIMIT $${E} OFFSET $${E+1}
  `,[N,f]=await Promise.all([O.query(m,u),O.query(l,[...u,i,(r-1)*i])]);return{items:f.rows.map(d),total:N.rows[0]?.total??0,categories:I.map(e=>e.category)}}async function E(e,t){let[r,i,a,s]=await Promise.all([O.query(`SELECT ss."staffId", TRIM(CONCAT(st."firstName", ' ', NULLIF(st."lastName", ''))) AS "staffName"
       FROM "ServiceStaff" ss
       JOIN "Staff" st ON st.id = ss."staffId"
       WHERE ss."serviceId" = $1 AND st."organizationId" = $2
       ORDER BY st."firstName", st."lastName"`,[e,t]),O.query(`SELECT sr."resourceId", r.name AS "resourceName", r.type AS "resourceType", sr.quantity
       FROM "ServiceResource" sr
       JOIN "Resource" r ON r.id = sr."resourceId"
       WHERE sr."serviceId" = $1 AND r."organizationId" = $2
       ORDER BY r.name`,[e,t]),O.query(`SELECT sp."productId", p.name AS "productName", p.sku AS "productSku", sp.quantity::text, sp.unit
       FROM "ServiceProduct" sp
       JOIN "Product" p ON p.id = sp."productId"
       WHERE sp."serviceId" = $1 AND p."organizationId" = $2
       ORDER BY p.name`,[e,t]),O.query(`SELECT sc.id, sc."staffId", TRIM(CONCAT(st."firstName", ' ', NULLIF(st."lastName", ''))) AS "staffName", sc.type::text,
              sc.percentage::text, sc."fixedAmount"::text
       FROM "ServiceCommission" sc
       JOIN "Staff" st ON st.id = sc."staffId"
       WHERE sc."serviceId" = $1 AND st."organizationId" = $2
       ORDER BY st."firstName", st."lastName"`,[e,t])]);return{staff:r.rows,resources:i.rows,products:a.rows,commissions:s.rows}}async function p(e,t){let{rows:r}=await O.query(`${y}
     WHERE s.id = $1 AND s."organizationId" = $2
     GROUP BY s.id`,[t,e]);if(!r[0])return null;let i=d(r[0]),a=await E(t,e);return{...i,totalBlockMin:i.prepTimeMin+i.durationMin+i.cleanupTimeMin,createdAt:r[0].createdAt.toISOString(),updatedAt:r[0].updatedAt.toISOString(),staff:a.staff.map(e=>({staffId:e.staffId,staffName:e.staffName})),resources:a.resources.map(e=>({resourceId:e.resourceId,resourceName:e.resourceName,resourceType:e.resourceType,quantity:e.quantity})),products:a.products.map(e=>({productId:e.productId,productName:e.productName,productSku:e.productSku,quantity:parseFloat(e.quantity),unit:e.unit})),commissions:a.commissions.map(e=>({id:e.id,staffId:e.staffId,staffName:e.staffName,type:e.type,percentage:null!=e.percentage?parseFloat(e.percentage):null,fixedAmount:null!=e.fixedAmount?parseFloat(e.fixedAmount):null}))}}async function I(e,t,r,i){for(let a of(await e.query('DELETE FROM "ServiceStaff" WHERE "serviceId" = $1',[t]),r))await e.query(`INSERT INTO "ServiceStaff" ("serviceId", "staffId")
       SELECT $1, st.id FROM "Staff" st
       WHERE st.id = $2 AND st."organizationId" = $3
       ON CONFLICT DO NOTHING`,[t,a,i])}async function m(e,t,r,i){for(let a of(await e.query('DELETE FROM "ServiceResource" WHERE "serviceId" = $1',[t]),r))await e.query(`INSERT INTO "ServiceResource" ("serviceId", "resourceId", quantity)
       SELECT $1, res.id, $3 FROM "Resource" res
       WHERE res.id = $2 AND res."organizationId" = $4
       ON CONFLICT DO NOTHING`,[t,a.resourceId,a.quantity??1,i])}async function l(e,t,r,i){for(let a of(await e.query('DELETE FROM "ServiceProduct" WHERE "serviceId" = $1',[t]),r))await e.query(`INSERT INTO "ServiceProduct" ("serviceId", "productId", quantity, unit)
       SELECT $1, pr.id, $3, $4 FROM "Product" pr
       WHERE pr.id = $2 AND pr."organizationId" = $5
       ON CONFLICT DO NOTHING`,[t,a.productId,a.quantity,a.unit,i])}async function N(e,t,r,i){for(let a of(await e.query('DELETE FROM "ServiceCommission" WHERE "serviceId" = $1',[t]),r)){let r=o("sc");await e.query(`INSERT INTO "ServiceCommission" (id, "serviceId", "staffId", type, percentage, "fixedAmount")
       SELECT $1, $2, st.id, $4::"CommissionType", $5, $6
       FROM "Staff" st
       WHERE st.id = $3 AND st."organizationId" = $7`,[r,t,a.staffId,a.type,"PERCENTAGE"===a.type?a.percentage??null:null,"FIXED"===a.type?a.fixedAmount??null:null,i])}}async function f(e,t){let r=o("svc"),i=await O.connect();try{await i.query("BEGIN");let a=c(t.imageUrl,e)??null;await i.query(`INSERT INTO "Service" (
        id, "organizationId", name, description, category, price, "durationMin",
        "prepTimeMin", "cleanupTimeMin", deposit, "recommendedReturnDays", "imageUrl", active, "updatedAt"
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,NOW())`,[r,e,t.name,t.description??null,t.category??null,t.price,t.durationMin,t.prepTimeMin??0,t.cleanupTimeMin??0,t.deposit??null,null!=t.recommendedReturnDays&&t.recommendedReturnDays>0?t.recommendedReturnDays:null,a,!1!==t.active]),t.staffIds?.length&&await I(i,r,t.staffIds,e),t.resources?.length&&await m(i,r,t.resources,e),t.products?.length&&await l(i,r,t.products,e),t.commissions?.length&&await N(i,r,t.commissions,e),await i.query("COMMIT")}catch(e){throw await i.query("ROLLBACK"),e}finally{i.release()}let a=await p(e,r);if(!a)throw Error("Service introuvable apr\xe8s cr\xe9ation.");return a}async function T(e,t,r){let i=await p(e,t);if(!i)throw Error("NOT_FOUND");let a=await O.connect(),s=null;try{await a.query("BEGIN");let n=[],o=[],d=1,u=(e,t)=>{n.push(`"${e}" = $${d}`),o.push(t),d++};void 0!==r.name&&u("name",r.name),void 0!==r.description&&u("description",r.description??null),void 0!==r.category&&u("category",r.category??null),void 0!==r.price&&(r.price!==i.price&&(s={serviceId:t,serviceName:i.name,oldPrice:i.price,newPrice:r.price}),u("price",r.price)),void 0!==r.durationMin&&u("durationMin",r.durationMin),void 0!==r.prepTimeMin&&u("prepTimeMin",r.prepTimeMin),void 0!==r.cleanupTimeMin&&u("cleanupTimeMin",r.cleanupTimeMin),void 0!==r.deposit&&u("deposit",r.deposit??null),void 0!==r.recommendedReturnDays&&u("recommendedReturnDays",null!=r.recommendedReturnDays&&r.recommendedReturnDays>0?r.recommendedReturnDays:null),void 0!==r.active&&u("active",r.active),void 0!==r.imageUrl&&u("imageUrl",c(r.imageUrl,e)??null),n.length>0&&(n.push('"updatedAt" = NOW()'),o.push(t,e),await a.query(`UPDATE "Service" SET ${n.join(", ")} WHERE id = $${d} AND "organizationId" = $${d+1}`,o)),void 0!==r.staffIds&&await I(a,t,r.staffIds,e),void 0!==r.resources&&await m(a,t,r.resources,e),void 0!==r.products&&await l(a,t,r.products,e),void 0!==r.commissions&&await N(a,t,r.commissions,e),await a.query("COMMIT")}catch(e){throw await a.query("ROLLBACK"),e}finally{a.release()}let n=await p(e,t);if(!n)throw Error("NOT_FOUND");return{service:n,priceChange:s}}async function R(e,t){let r=await p(e,t);if(!r)throw Error("NOT_FOUND");let i=await O.connect();try{await i.query("BEGIN"),await i.query(`UPDATE "Appointment"
       SET "serviceNameSnapshot" = COALESCE(NULLIF("serviceNameSnapshot", ''), $3),
           "serviceId" = NULL,
           "updatedAt" = NOW()
       WHERE "serviceId" = $1 AND "organizationId" = $2`,[t,e,r.name]),await i.query('UPDATE "PackageItem" SET "serviceId" = NULL WHERE "serviceId" = $1',[t]),await i.query('UPDATE "Package" SET "serviceId" = NULL WHERE "serviceId" = $1',[t]),await i.query('DELETE FROM "WaitingListEntry" WHERE "serviceId" = $1 AND "organizationId" = $2',[t,e]),await i.query('DELETE FROM "ServiceStaff" WHERE "serviceId" = $1',[t]),await i.query('DELETE FROM "ServiceResource" WHERE "serviceId" = $1',[t]),await i.query('DELETE FROM "ServiceProduct" WHERE "serviceId" = $1',[t]),await i.query('DELETE FROM "ServiceCommission" WHERE "serviceId" = $1',[t]);let{rowCount:a}=await i.query('DELETE FROM "Service" WHERE id = $1 AND "organizationId" = $2',[t,e]);if(!a)throw Error("NOT_FOUND");await i.query("COMMIT")}catch(e){throw await i.query("ROLLBACK"),e}finally{i.release()}return{name:r.name}}async function S(e){let[t,r,i]=await Promise.all([O.query(`SELECT id, "firstName", "lastName", position, status::text AS status FROM "Staff"
       WHERE "organizationId" = $1 AND "deletedAt" IS NULL AND status <> 'ARCHIVED'
       ORDER BY status = 'ACTIVE' DESC, "firstName", "lastName"`,[e]),O.query(`SELECT id, name, type::text AS type FROM "Resource"
       WHERE "organizationId" = $1 AND active = true AND "deletedAt" IS NULL
       ORDER BY name`,[e]),O.query(`SELECT id, name, sku, unit::text AS unit FROM "Product"
       WHERE "organizationId" = $1 AND "deletedAt" IS NULL AND active = true
       ORDER BY name`,[e])]);return{staff:t.rows.map(e=>({id:e.id,name:`${e.firstName} ${e.lastName}`.trim(),role:e.position,status:e.status})),resources:r.rows,products:i.rows}}i()}catch(e){i(e)}})}};