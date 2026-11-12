!function(){try{var e="undefined"!=typeof window?window:"undefined"!=typeof global?global:"undefined"!=typeof self?self:{},t=(new e.Error).stack;t&&(e._sentryDebugIds=e._sentryDebugIds||{},e._sentryDebugIds[t]="be821105-adbd-4d83-a92b-4c11da3953ae",e._sentryDebugIdIdentifier="sentry-dbid-be821105-adbd-4d83-a92b-4c11da3953ae")}catch(e){}}();"use strict";(()=>{var e={};e.id=7429,e.ids=[7429,1059,1759,4836,8644,9959,1716,3920,8556,347,2241,4506,327,1191,3110,339,1306,4126,3236],e.modules={72934:e=>{e.exports=require("next/dist/client/components/action-async-storage.external.js")},54580:e=>{e.exports=require("next/dist/client/components/request-async-storage.external.js")},45869:e=>{e.exports=require("next/dist/client/components/static-generation-async-storage.external.js")},20399:e=>{e.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},30517:e=>{e.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},48927:e=>{e.exports=require("web-push")},61212:e=>{e.exports=require("async_hooks")},61282:e=>{e.exports=require("child_process")},84770:e=>{e.exports=require("crypto")},27920:e=>{e.exports=require("diagnostics_channel")},17702:e=>{e.exports=require("events")},92048:e=>{e.exports=require("fs")},85807:e=>{e.exports=require("module")},19801:e=>{e.exports=require("os")},55315:e=>{e.exports=require("path")},96119:e=>{e.exports=require("perf_hooks")},35816:e=>{e.exports=require("process")},74175:e=>{e.exports=require("tty")},17360:e=>{e.exports=require("url")},21764:e=>{e.exports=require("util")},6162:e=>{e.exports=require("worker_threads")},71568:e=>{e.exports=require("zlib")},8678:e=>{e.exports=import("pg")},92761:e=>{e.exports=require("node:async_hooks")},17718:e=>{e.exports=require("node:child_process")},6005:e=>{e.exports=require("node:crypto")},92110:e=>{e.exports=require("node:diagnostics_channel")},87561:e=>{e.exports=require("node:fs")},88849:e=>{e.exports=require("node:http")},42725:e=>{e.exports=require("node:http2")},22286:e=>{e.exports=require("node:https")},85690:e=>{e.exports=require("node:inspector")},87503:e=>{e.exports=require("node:net")},70612:e=>{e.exports=require("node:os")},49411:e=>{e.exports=require("node:path")},51747:e=>{e.exports=require("node:readline")},84492:e=>{e.exports=require("node:stream")},31764:e=>{e.exports=require("node:tls")},47261:e=>{e.exports=require("node:util")},24086:e=>{e.exports=require("node:worker_threads")},65628:e=>{e.exports=require("node:zlib")},86579:(e,t,r)=>{r.a(e,async(e,a)=>{try{r.r(t),r.d(t,{DELETE:()=>S,GET:()=>I,HEAD:()=>y,OPTIONS:()=>C,PATCH:()=>T,POST:()=>R,PUT:()=>g});var s=r(98930),i=r(21967),n=r(54580),o=r(46485),u=r(40444),d=r(30886),c=r(44162),l=r(31244),p=r(73575),E=e([u,c]);[u,c]=E.then?(await E)():E;let A=(0,p.f_)(async function(e,t){let r=await (0,u.lr)(e,"customers");if(!r.ok)return r.response;let{id:a}=await t.params,{searchParams:s}=new URL(e.url),i="1"===s.get("history");try{let e=await (0,c.$k)(a,r.session.organizationId);if(!e)return o.NextResponse.json({error:"Cliente introuvable."},{status:404});if(i){let t=await (0,c.l4)(a,r.session.organizationId);return o.NextResponse.json({customer:e,history:t})}return o.NextResponse.json(e)}catch(e){return console.error(`[GET /api/customers/${a}]`,e),o.NextResponse.json({error:"Impossible de charger la cliente."},{status:500})}}),f=(0,p.f_)(async function(e,t){let r=await (0,u.PX)(e,"customers");if(!r.ok)return r.response;let{id:a}=await t.params;try{let t=(0,u.stripOrganizationId)(await e.json()),s=(0,l.cs)(t);if(!s.ok)return o.NextResponse.json({error:"Donn\xe9es invalides.",details:s.errors},{status:400});let i=s.data;(0,d.KH)(r.session.role)||(delete i.marketingWhatsapp,delete i.marketingEmail,delete i.marketingSms);let n=await (0,c.uG)(a,r.session.organizationId,i);if(!n)return o.NextResponse.json({error:"Cliente introuvable."},{status:404});return o.NextResponse.json(n)}catch(e){if((0,c.zp)(e))return o.NextResponse.json({error:"Une cliente avec ce num\xe9ro existe d\xe9j\xe0 dans votre institut."},{status:409});return console.error(`[PATCH /api/customers/${a}]`,e),o.NextResponse.json({error:"Impossible de mettre \xe0 jour la cliente."},{status:500})}}),N={...n},h="workUnitAsyncStorage"in N?N.workUnitAsyncStorage:"requestAsyncStorage"in N?N.requestAsyncStorage:void 0;function m(e,t){return"phase-production-build"===process.env.NEXT_PHASE||"function"!=typeof e?e:new Proxy(e,{apply:(e,r,a)=>{let n;try{let e=(0,s.x)([h,"optionalAccess",e=>e.getStore,"call",e=>e()]);n=(0,s.x)([e,"optionalAccess",e=>e.headers])}catch(e){}return i.wrapRouteHandlerWithSentry(e,{method:t,parameterizedRoute:"/api/customers/[id]",headers:n}).apply(r,a)}})}let I=m(A,"GET"),R=m(void 0,"POST"),g=m(void 0,"PUT"),T=m(f,"PATCH"),S=m(void 0,"DELETE"),y=m(void 0,"HEAD"),C=m(void 0,"OPTIONS");a()}catch(e){a(e)}})},66144:(e,t,r)=>{r.a(e,async(e,a)=>{try{r.r(t),r.d(t,{originalPathname:()=>m,patchFetch:()=>d,requestAsyncStorage:()=>l,routeModule:()=>c,serverHooks:()=>E,staticGenerationAsyncStorage:()=>p});var s=r(32829),i=r(85358),n=r(66806),o=r(86579),u=e([o]);o=(u.then?(await u)():u)[0];let c=new s.AppRouteRouteModule({definition:{kind:i.x.APP_ROUTE,page:"/api/customers/[id]/route",pathname:"/api/customers/[id]",filename:"route",bundlePath:"app/api/customers/[id]/route"},resolvedPagePath:"D:\\rappel beauty\\src\\app\\api\\customers\\[id]\\route.ts",nextConfigOutput:"",userland:o}),{requestAsyncStorage:l,staticGenerationAsyncStorage:p,serverHooks:E}=c,m="/api/customers/[id]/route";function d(){return(0,n.patchFetch)({serverHooks:E,staticGenerationAsyncStorage:p})}a()}catch(e){a(e)}})},37262:(e,t,r)=>{var a=r(60273);r.o(a,"cookies")&&r.d(t,{cookies:function(){return a.cookies}})},31905:(e,t,r)=>{Object.defineProperty(t,"__esModule",{value:!0}),Object.defineProperty(t,"DraftMode",{enumerable:!0,get:function(){return i}});let a=r(45869),s=r(53473);class i{get isEnabled(){return this._provider.isEnabled}enable(){let e=a.staticGenerationAsyncStorage.getStore();return e&&(0,s.trackDynamicDataAccessed)(e,"draftMode().enable()"),this._provider.enable()}disable(){let e=a.staticGenerationAsyncStorage.getStore();return e&&(0,s.trackDynamicDataAccessed)(e,"draftMode().disable()"),this._provider.disable()}constructor(e){this._provider=e}}("function"==typeof t.default||"object"==typeof t.default&&null!==t.default)&&void 0===t.default.__esModule&&(Object.defineProperty(t.default,"__esModule",{value:!0}),Object.assign(t.default,t),e.exports=t.default)},60273:(e,t,r)=>{Object.defineProperty(t,"__esModule",{value:!0}),function(e,t){for(var r in t)Object.defineProperty(e,r,{enumerable:!0,get:t[r]})}(t,{cookies:function(){return p},draftMode:function(){return E},headers:function(){return l}});let a=r(98338),s=r(42009),i=r(38711),n=r(72934),o=r(31905),u=r(53473),d=r(45869),c=r(54580);function l(){let e="headers",t=d.staticGenerationAsyncStorage.getStore();if(t){if(t.forceStatic)return s.HeadersAdapter.seal(new Headers({}));(0,u.trackDynamicDataAccessed)(t,e)}return(0,c.getExpectedRequestStore)(e).headers}function p(){let e="cookies",t=d.staticGenerationAsyncStorage.getStore();if(t){if(t.forceStatic)return a.RequestCookiesAdapter.seal(new i.RequestCookies(new Headers({})));(0,u.trackDynamicDataAccessed)(t,e)}let r=(0,c.getExpectedRequestStore)(e),s=n.actionAsyncStorage.getStore();return(null==s?void 0:s.isAction)||(null==s?void 0:s.isAppRoute)?r.mutableCookies:r.cookies}function E(){let e=(0,c.getExpectedRequestStore)("draftMode");return new o.DraftMode(e.draftMode)}("function"==typeof t.default||"object"==typeof t.default&&null!==t.default)&&void 0===t.default.__esModule&&(Object.defineProperty(t.default,"__esModule",{value:!0}),Object.assign(t.default,t),e.exports=t.default)},32829:(e,t,r)=>{e.exports=r(30517)},42009:(e,t,r)=>{Object.defineProperty(t,"__esModule",{value:!0}),function(e,t){for(var r in t)Object.defineProperty(e,r,{enumerable:!0,get:t[r]})}(t,{HeadersAdapter:function(){return i},ReadonlyHeadersError:function(){return s}});let a=r(19184);class s extends Error{constructor(){super("Headers cannot be modified. Read more: https://nextjs.org/docs/app/api-reference/functions/headers")}static callable(){throw new s}}class i extends Headers{constructor(e){super(),this.headers=new Proxy(e,{get(t,r,s){if("symbol"==typeof r)return a.ReflectAdapter.get(t,r,s);let i=r.toLowerCase(),n=Object.keys(e).find(e=>e.toLowerCase()===i);if(void 0!==n)return a.ReflectAdapter.get(t,n,s)},set(t,r,s,i){if("symbol"==typeof r)return a.ReflectAdapter.set(t,r,s,i);let n=r.toLowerCase(),o=Object.keys(e).find(e=>e.toLowerCase()===n);return a.ReflectAdapter.set(t,o??r,s,i)},has(t,r){if("symbol"==typeof r)return a.ReflectAdapter.has(t,r);let s=r.toLowerCase(),i=Object.keys(e).find(e=>e.toLowerCase()===s);return void 0!==i&&a.ReflectAdapter.has(t,i)},deleteProperty(t,r){if("symbol"==typeof r)return a.ReflectAdapter.deleteProperty(t,r);let s=r.toLowerCase(),i=Object.keys(e).find(e=>e.toLowerCase()===s);return void 0===i||a.ReflectAdapter.deleteProperty(t,i)}})}static seal(e){return new Proxy(e,{get(e,t,r){switch(t){case"append":case"delete":case"set":return s.callable;default:return a.ReflectAdapter.get(e,t,r)}}})}merge(e){return Array.isArray(e)?e.join(", "):e}static from(e){return e instanceof Headers?e:new i(e)}append(e,t){let r=this.headers[e];"string"==typeof r?this.headers[e]=[r,t]:Array.isArray(r)?r.push(t):this.headers[e]=t}delete(e){delete this.headers[e]}get(e){let t=this.headers[e];return void 0!==t?this.merge(t):null}has(e){return void 0!==this.headers[e]}set(e,t){this.headers[e]=t}forEach(e,t){for(let[r,a]of this.entries())e.call(t,a,r,this)}*entries(){for(let e of Object.keys(this.headers)){let t=e.toLowerCase(),r=this.get(t);yield[t,r]}}*keys(){for(let e of Object.keys(this.headers)){let t=e.toLowerCase();yield t}}*values(){for(let e of Object.keys(this.headers)){let t=this.get(e);yield t}}[Symbol.iterator](){return this.entries()}}},98338:(e,t,r)=>{Object.defineProperty(t,"__esModule",{value:!0}),function(e,t){for(var r in t)Object.defineProperty(e,r,{enumerable:!0,get:t[r]})}(t,{MutableRequestCookiesAdapter:function(){return l},ReadonlyRequestCookiesError:function(){return n},RequestCookiesAdapter:function(){return o},appendMutableCookies:function(){return c},getModifiedCookieValues:function(){return d}});let a=r(38711),s=r(19184),i=r(45869);class n extends Error{constructor(){super("Cookies can only be modified in a Server Action or Route Handler. Read more: https://nextjs.org/docs/app/api-reference/functions/cookies#cookiessetname-value-options")}static callable(){throw new n}}class o{static seal(e){return new Proxy(e,{get(e,t,r){switch(t){case"clear":case"delete":case"set":return n.callable;default:return s.ReflectAdapter.get(e,t,r)}}})}}let u=Symbol.for("next.mutated.cookies");function d(e){let t=e[u];return t&&Array.isArray(t)&&0!==t.length?t:[]}function c(e,t){let r=d(t);if(0===r.length)return!1;let s=new a.ResponseCookies(e),i=s.getAll();for(let e of r)s.set(e);for(let e of i)s.set(e);return!0}class l{static wrap(e,t){let r=new a.ResponseCookies(new Headers);for(let t of e.getAll())r.set(t);let n=[],o=new Set,d=()=>{let e=i.staticGenerationAsyncStorage.getStore();if(e&&(e.pathWasRevalidated=!0),n=r.getAll().filter(e=>o.has(e.name)),t){let e=[];for(let t of n){let r=new a.ResponseCookies(new Headers);r.set(t),e.push(r.toString())}t(e)}};return new Proxy(r,{get(e,t,r){switch(t){case u:return n;case"delete":return function(...t){o.add("string"==typeof t[0]?t[0]:t[0].name);try{e.delete(...t)}finally{d()}};case"set":return function(...t){o.add("string"==typeof t[0]?t[0]:t[0].name);try{return e.set(...t)}finally{d()}};default:return s.ReflectAdapter.get(e,t,r)}}})}}},44162:(e,t,r)=>{r.a(e,async(e,a)=>{try{r.d(t,{$L:()=>c,$k:()=>l,XA:()=>A,l4:()=>p,uG:()=>f,wK:()=>E,zp:()=>N});var s=r(8678),i=r(90831),n=r(11107),o=r(31244),u=e([s]);s=(u.then?(await u)():u)[0];let h=(0,i.S)(new s.Pool({connectionString:process.env.DATABASE_URL}));function d(e){let t=parseInt(e.visits,10)||0,r=parseInt(e.noShowCount,10)||0,a=parseFloat(e.revenue)||0,s=t>0?Math.round(a/t*100)/100:0;return{id:e.id,firstName:e.firstName,lastName:e.lastName,phone:e.phone,email:e.email,status:e.status,visits:t,noShowCount:r,revenue:a,averageTicket:s,lastVisitAt:e.lastVisitAt?.toISOString()??null,createdAt:e.createdAt.toISOString(),segment:function(e){if("INACTIVE"===e.status||"ARCHIVED"===e.status)return"INACTIVE";if("AT_RISK"===e.status)return"AT_RISK";if("NEW"===e.status)return"NEW";let t=(Date.now()-e.createdAt.getTime())/864e5;if(t<=n.TX&&e.visits<=1)return"NEW";if(e.revenue>=n.Fo||e.visits>=n.P9)return"VIP";if(e.lastVisitAt){if((Date.now()-e.lastVisitAt.getTime())/864e5>n.co)return"AT_RISK"}else if(t>n.co)return"AT_RISK";return"ACTIVE"}({status:e.status,visits:t,revenue:a,createdAt:e.createdAt,lastVisitAt:e.lastVisitAt})}}async function c(e,t){let{page:r,limit:a,search:s,status:i,segment:o="ALL"}=t,u=['c."organizationId" = $1','c."deletedAt" IS NULL'],c=[e],l=2;s&&(u.push(`(c."firstName" ILIKE $${l} OR c."lastName" ILIKE $${l} OR c.phone ILIKE $${l} OR COALESCE(c.email, '') ILIKE $${l})`),c.push(`%${s}%`),l++),i&&(u.push(`c.status = $${l}`),c.push(i),l++);let p=u.join(" AND "),E="ALL"!==o?function(e,t){switch(e){case"VIP":return`HAVING (
        COALESCE(SUM(a.price) FILTER (WHERE a.status = 'COMPLETED'), 0) >= ${n.Fo}
        OR COUNT(a.id) FILTER (WHERE a.status = 'COMPLETED') >= ${n.P9}
      )`;case"NEW":return`HAVING (
        c.status = 'NEW'
        OR (c."createdAt" >= NOW() - INTERVAL '${n.TX} days'
            AND COUNT(a.id) FILTER (WHERE a.status = 'COMPLETED') <= 1)
      )`;case"INACTIVE":return"HAVING c.status IN ('INACTIVE', 'ARCHIVED')";case"AT_RISK":return`HAVING (
        c.status = 'AT_RISK'
        OR (
          MAX(a."startAt") FILTER (WHERE a.status = 'COMPLETED') IS NOT NULL
          AND MAX(a."startAt") FILTER (WHERE a.status = 'COMPLETED') < NOW() - INTERVAL '${n.co} days'
        )
        OR (
          MAX(a."startAt") FILTER (WHERE a.status = 'COMPLETED') IS NULL
          AND c."createdAt" < NOW() - INTERVAL '${n.co} days'
          AND c.status NOT IN ('INACTIVE', 'ARCHIVED', 'NEW')
        )
      )`;case"ACTIVE":return"HAVING c.status = 'ACTIVE'";default:return""}}(o,0):"",m=`
    SELECT COUNT(*)::int AS total FROM (
      SELECT c.id
      FROM "Customer" c
      LEFT JOIN "Appointment" a ON a."customerId" = c.id AND a.status = 'COMPLETED'
      WHERE ${p}
      GROUP BY c.id, c.status, c."createdAt"
      ${E}
    ) sub
  `,A=`
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
    WHERE ${p}
    GROUP BY c.id
    ${E}
    ORDER BY c."createdAt" DESC, c."lastName", c."firstName"
    LIMIT $${l} OFFSET $${l+1}
  `,f=`
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
          WHEN c.status = 'NEW' OR (c."createdAt" >= NOW() - INTERVAL '${n.TX} days'
            AND COALESCE(v.visits, 0) <= 1) THEN 'NEW'
          WHEN COALESCE(v.revenue, 0) >= ${n.Fo} OR COALESCE(v.visits, 0) >= ${n.P9} THEN 'VIP'
          WHEN v."lastVisitAt" IS NOT NULL AND v."lastVisitAt" < NOW() - INTERVAL '${n.co} days' THEN 'AT_RISK'
          WHEN v."lastVisitAt" IS NULL AND c."createdAt" < NOW() - INTERVAL '${n.co} days'
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
  `,[N,I,R]=await Promise.all([h.query(m,c),h.query(A,[...c,a,(r-1)*a]),h.query(f,[e])]);return{items:I.rows.map(d),total:N.rows[0]?.total??0,kpis:R.rows[0]??{total:0,newCount:0,vipCount:0,inactiveCount:0,activeCount:0,atRiskCount:0}}}async function l(e,t){var a;let{rows:s}=await h.query(`SELECT
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
    GROUP BY c.id`,[t,e]),i=s[0]?(a=s[0],{...d(a),birthDate:a.birthDate?.toISOString()??null,address:a.address,instagram:a.instagram,notes:a.notes,marketingWhatsapp:a.marketingWhatsapp,marketingEmail:a.marketingEmail,marketingSms:a.marketingSms,updatedAt:a.updatedAt.toISOString()}):null;if(!i)return null;try{let{countCustomerNoShows:a,getOrCreateBookingPolicy:s,noShowRiskLevel:n}=await r.e(819).then(r.bind(r,50819)),o=await a(t,e),u=await s(t);i.noShowCount=o,i.noShowRisk=n(o,u)}catch{i.noShowCount=0,i.noShowRisk="NONE"}return i}async function p(e,t){let{rows:r}=await h.query(`SELECT a.id, a."startAt", COALESCE(s.name, 'Prestation') AS "serviceName", a.price::text, a.status,
            st."firstName" AS "staffFirstName"
     FROM "Appointment" a
     LEFT JOIN "Service" s ON s.id = a."serviceId"
     JOIN "Customer" c ON c.id = a."customerId"
     LEFT JOIN "Staff" st ON st.id = a."staffId"
     WHERE a."customerId" = $1 AND c."organizationId" = $2
     ORDER BY a."startAt" DESC
     LIMIT 50`,[e,t]);return r.map(e=>({id:e.id,startAt:e.startAt.toISOString(),serviceName:e.serviceName,price:parseFloat(e.price),status:e.status,staffFirstName:e.staffFirstName}))}async function E(e,t){let a=(0,o.UK)(t.phone),s=`cust-${Date.now()}`;await h.query(`INSERT INTO "Customer" (
      id, "organizationId", "firstName", "lastName", phone, email,
      "birthDate", address, instagram, notes, status,
      "marketingWhatsapp", "marketingEmail", "marketingSms", "updatedAt"
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'NEW',$11,$12,$13,NOW())`,[s,e,t.firstName,t.lastName,a,t.email??null,t.birthDate?new Date(t.birthDate):null,t.address??null,t.instagram??null,t.notes??null,t.marketingWhatsapp??!1,t.marketingEmail??!1,t.marketingSms??!1]);let i=await l(s,e);if(!i)throw Error("Cliente cr\xe9\xe9e introuvable.");try{let{writeAuditLog:t}=await Promise.resolve().then(r.bind(r,66085));await t({organizationId:e,entityType:"Customer",entityId:s,action:"CREATE",after:{firstName:i.firstName,lastName:i.lastName,phone:i.phone}})}catch{}return i}async function m(e,t,r){let a=(0,o.UK)(t),{rows:s}=await (r??h).query(`SELECT id, "marketingWhatsapp", "marketingEmail"
     FROM "Customer"
     WHERE "organizationId" = $1 AND phone = $2 AND "deletedAt" IS NULL
     LIMIT 1`,[e,a]);return s[0]??null}async function A(e,t,r){let a=r??h,s=(0,o.UK)(t.phone),i=await m(e,s,a);if(i){let e=t.marketingOptIn||i.marketingWhatsapp,r=t.marketingOptIn||i.marketingEmail;return await a.query(`UPDATE "Customer"
       SET "firstName" = $1, "lastName" = $2,
           email = COALESCE($3, email),
           "marketingWhatsapp" = $4, "marketingEmail" = $5, "updatedAt" = NOW()
       WHERE id = $6`,[t.firstName.trim(),t.lastName.trim(),t.email?.trim()||null,e,r,i.id]),{customerId:i.id,created:!1}}let n=`cust-${Date.now()}-${Math.random().toString(36).slice(2,7)}`,u=t.marketingOptIn??!1;return await a.query(`INSERT INTO "Customer" (
      id, "organizationId", "firstName", "lastName", phone, email, status,
      "marketingWhatsapp", "marketingEmail", "marketingSms", "updatedAt"
    ) VALUES ($1,$2,$3,$4,$5,$6,'NEW',$7,$8,false,NOW())`,[n,e,t.firstName.trim(),t.lastName.trim(),s,t.email?.trim()||null,u,u]),{customerId:n,created:!0}}async function f(e,t,a){let s=await l(e,t);if(!s&&!a.archived)return null;if(a.archived){await h.query(`UPDATE "Customer"
       SET status = 'ARCHIVED', "deletedAt" = NOW(), "updatedAt" = NOW()
       WHERE id = $1 AND "organizationId" = $2 AND "deletedAt" IS NULL`,[e,t]);try{let{writeAuditLog:a}=await Promise.resolve().then(r.bind(r,66085));await a({organizationId:t,entityType:"Customer",entityId:e,action:"ARCHIVE",before:s?{status:s.status}:void 0,after:{status:"ARCHIVED"}})}catch{}return l(e,t)}let i=[],n=[],u=1,d=(e,t)=>{i.push(`"${e}" = $${u++}`),n.push(t)};if(void 0!==a.firstName&&d("firstName",a.firstName),void 0!==a.lastName&&d("lastName",a.lastName),void 0!==a.phone&&d("phone",(0,o.UK)(a.phone)),void 0!==a.email&&d("email",a.email??null),void 0!==a.birthDate&&d("birthDate",a.birthDate?new Date(a.birthDate):null),void 0!==a.address&&d("address",a.address??null),void 0!==a.instagram&&d("instagram",a.instagram??null),void 0!==a.notes&&d("notes",a.notes??null),void 0!==a.status&&d("status",a.status),void 0!==a.marketingWhatsapp&&d("marketingWhatsapp",a.marketingWhatsapp),void 0!==a.marketingEmail&&d("marketingEmail",a.marketingEmail),void 0!==a.marketingSms&&d("marketingSms",a.marketingSms),0===i.length)return l(e,t);i.push('"updatedAt" = NOW()'),n.push(e,t);let c=await h.query(`UPDATE "Customer" SET ${i.join(", ")}
     WHERE id = $${u} AND "organizationId" = $${u+1} AND "deletedAt" IS NULL`,n);if(0===c.rowCount)return null;let p=await l(e,t);try{let{writeAuditLog:a}=await Promise.resolve().then(r.bind(r,66085));await a({organizationId:t,entityType:"Customer",entityId:e,action:"UPDATE",before:s?{firstName:s.firstName,lastName:s.lastName,phone:s.phone,status:s.status}:void 0,after:p?{firstName:p.firstName,lastName:p.lastName,phone:p.phone,status:p.status}:void 0})}catch{}return p}function N(e){return"object"==typeof e&&null!==e&&"code"in e&&"23505"===e.code}a()}catch(e){a(e)}})},11107:(e,t,r)=>{r.d(t,{Fo:()=>a,P9:()=>s,TX:()=>n,co:()=>i});let a=3e3,s=8,i=90,n=30}};var t=require("../../../../webpack-runtime.js");t.C(e);var r=e=>t(t.s=e),a=t.X(0,[9085,3192,6485,618,444],()=>r(66144));module.exports=a})();