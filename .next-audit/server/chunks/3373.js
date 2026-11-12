"use strict";!function(){try{var t="undefined"!=typeof window?window:"undefined"!=typeof global?global:"undefined"!=typeof self?self:{},e=(new t.Error).stack;e&&(t._sentryDebugIds=t._sentryDebugIds||{},t._sentryDebugIds[e]="7b406496-9d03-46eb-b4fc-50851737169f",t._sentryDebugIdIdentifier="sentry-dbid-7b406496-9d03-46eb-b4fc-50851737169f")}catch(t){}}(),exports.id=3373,exports.ids=[3373],exports.modules={8832:(t,e,a)=>{a.d(e,{Nj:()=>u,Pi:()=>o,S9:()=>r});var s=a(30886);let n={getRevenue:"analytics",getDashboard:"analytics",getCustomers:"customers",getCustomerStats:"customers",getAppointments:"agenda",getStaffPerformance:"analytics",getInventory:"stock",getMarketingStats:"marketing",getLoyaltyStats:"loyalty",getReviewStats:"reviews",searchCustomers:"customers",searchServices:"services"},i=["getRevenue","getDashboard"];function r(t,e){let a=n[e];if(!(0,s.u3)(t,a))return!1;if(i.includes(e)){let e=(0,s.kp)(t,"analytics");if("STAFF"===t||"CASHIER"===t||"none"===e)return!1}return!!("getInventory"!==e||(0,s.u3)(t,"stock"))}function o(t){return Object.keys(n).filter(e=>r(t,e))}let u={getRevenue:"CA et paiements sur une p\xe9riode",getDashboard:"Vue d'ensemble KPI institut",getCustomers:"Statistiques clientes",getCustomerStats:"Alias getCustomers",getAppointments:"Stats rendez-vous / no-shows",getStaffPerformance:"Performance employ\xe9es",getInventory:"Stock, ruptures, consommation",getMarketingStats:"Campagnes marketing",getLoyaltyStats:"Fid\xe9lit\xe9 / forfaits",getReviewStats:"Avis clientes",searchCustomers:"Recherche clientes (nom / t\xe9l\xe9phone)",searchServices:"Recherche services"}},93373:(t,e,a)=>{a.a(t,async(t,s)=>{try{a.d(e,{$W:()=>O,GH:()=>C,Kq:()=>R,_A:()=>y,ad:()=>k,fJ:()=>v,my:()=>T,xd:()=>f});var n=a(84770),i=a(8678),r=a(90831),o=a(66085),u=a(27386),c=a(8832),l=a(63646),d=a(41365),m=a(45028),p=a(27949),E=a(70859),A=t([i,o,l,m,E]);[i,o,l,m,E]=A.then?(await A)():A;let w=(0,r.S)(new i.Pool({connectionString:process.env.DATABASE_URL}));function I(t){return`${t}_${(0,n.randomBytes)(8).toString("hex")}`}function g(t=new Date){return`${t.getFullYear()}-${String(t.getMonth()+1).padStart(2,"0")}`}function N(t){return`${t.toLocaleString("fr-MA",{maximumFractionDigits:2})} MAD`}async function f(t,e){let a=g(),{rows:s}=await w.query(`SELECT "messageCount", "promptTokens", "completionTokens", "estimatedCostMad"::text
     FROM "AIUsagePeriod"
     WHERE "organizationId" = $1 AND "periodKey" = $2`,[t,a]),n=s[0],i=e&&e in p.ri?p.ri[e]:p.ri.STARTER,r=n?.messageCount??0;return{periodKey:a,messageCount:r,promptTokens:n?.promptTokens??0,completionTokens:n?.completionTokens??0,estimatedCostMad:parseFloat(n?.estimatedCostMad??"0"),maxMessages:i,remainingMessages:null==i?null:Math.max(0,i-r)}}async function h(t,e){let a=await f(t,e);if(0===a.maxMessages)throw Error("AI_NOT_IN_PLAN");if(null!=a.maxMessages&&a.messageCount>=a.maxMessages)throw Error("AI_QUOTA_EXCEEDED")}async function S(t,e){let a=g(),s=Math.round((e.prompt+e.completion)/1e3*20)/1e4,n=I("aiu");await w.query(`INSERT INTO "AIUsagePeriod" (
      id, "organizationId", "periodKey", "messageCount",
      "promptTokens", "completionTokens", "estimatedCostMad", "updatedAt"
    ) VALUES ($1,$2,$3,1,$4,$5,$6,NOW())
    ON CONFLICT ("organizationId", "periodKey") DO UPDATE SET
      "messageCount" = "AIUsagePeriod"."messageCount" + 1,
      "promptTokens" = "AIUsagePeriod"."promptTokens" + EXCLUDED."promptTokens",
      "completionTokens" = "AIUsagePeriod"."completionTokens" + EXCLUDED."completionTokens",
      "estimatedCostMad" = "AIUsagePeriod"."estimatedCostMad" + EXCLUDED."estimatedCostMad",
      "updatedAt" = NOW()`,[n,t,a,e.prompt,e.completion,s])}async function T(t,e){let{rows:a}=await w.query(`SELECT c.id, c.title, c."createdAt", c."updatedAt",
            COUNT(m.id)::text AS "messageCount"
     FROM "AIConversation" c
     LEFT JOIN "AIMessage" m ON m."conversationId" = c.id
     WHERE c."organizationId" = $1 AND c."userId" = $2
     GROUP BY c.id
     ORDER BY c."updatedAt" DESC
     LIMIT 50`,[t,e]);return a.map(t=>({id:t.id,title:t.title,createdAt:t.createdAt.toISOString(),updatedAt:t.updatedAt.toISOString(),messageCount:parseInt(t.messageCount,10)}))}async function v(t,e,a){let{rows:s}=await w.query(`SELECT id, title, "createdAt", "updatedAt" FROM "AIConversation"
     WHERE id = $1 AND "organizationId" = $2 AND "userId" = $3`,[a,t,e]),n=s[0];if(!n)return null;let{rows:i}=await w.query(`SELECT role::text, content, metadata, "createdAt"
     FROM "AIMessage" WHERE "conversationId" = $1 ORDER BY "createdAt"`,[a]);return{id:n.id,title:n.title,createdAt:n.createdAt.toISOString(),updatedAt:n.updatedAt.toISOString(),messageCount:i.length,messages:i.map(t=>({role:t.role,content:t.content,metadata:t.metadata??null,createdAt:t.createdAt.toISOString()}))}}async function C(t,e,a){let{rowCount:s}=await w.query(`DELETE FROM "AIConversation"
     WHERE id = $1 AND "organizationId" = $2 AND "userId" = $3`,[a,t,e]);if(!s)throw Error("NOT_FOUND")}async function R(t,e){let a;await h(t.organizationId,t.planCode);let s=e.message.trim();if(!s)throw Error("EMPTY_MESSAGE");if(s.length>4e3)throw Error("MESSAGE_TOO_LONG");let n=e.conversationId?.trim()||"";if(n){if(!await v(t.organizationId,t.userId,n))throw Error("NOT_FOUND")}else{n=I("aic");let e=s.slice(0,80);await w.query(`INSERT INTO "AIConversation" (
        id, "organizationId", "userId", title, "updatedAt"
      ) VALUES ($1,$2,$3,$4,NOW())`,[n,t.organizationId,t.userId,e])}await w.query(`INSERT INTO "AIMessage" (id, "conversationId", role, content)
     VALUES ($1,$2,'USER'::"AIMessageRole",$3)`,[I("aim"),n,s]);let i=(0,l.Dg)(s),r=(0,l.kc)(s),d=[];for(let e of r)d.push(await (0,l.Fm)(t,e,{period:i}));let m=function(t){let e=[];for(let a of t){if(!a.ok||!a.data||"object"!=typeof a.data)continue;let t=a.data;if("getRevenue"===a.tool&&t.totals&&"object"==typeof t.totals){let a=t.totals,s=a.periodNet??a.month,n=a.prevMonth;if("number"==typeof s){let t=`Votre CA net est de ${N(s)}`;if("number"==typeof n&&n>0){let e=Math.round((s-n)/n*1e3)/10,a=e>=0?"+":"";t+=`, contre ${N(n)} sur la p\xe9riode de comparaison, soit ${a}${e} %`}t+=".",e.push(t)}}if("getDashboard"===a.tool&&t.revenue&&"object"==typeof t.revenue){let a=t.revenue;if("number"==typeof a.value&&!e.some(t=>t.includes("CA net"))){let t=a.changePercent;e.push(`CA (vue d'ensemble) : ${N(a.value)}${null!=t?` (${t>=0?"+":""}${t} % vs p\xe9riode pr\xe9c\xe9dente)`:""}.`)}}if("getInventory"===a.tool){let a=t.lowStockCount,s=t.outOfStockCount;"number"==typeof a&&e.push(a>0?`${a} produit(s) sous le stock minimum.`:"Aucun produit sous le stock minimum."),"number"==typeof s&&s>0&&e.push(`${s} produit(s) en rupture.`)}if("getAppointments"===a.tool&&t.noShow&&"object"==typeof t.noShow){let a=t.noShow;null!=a.rate&&e.push(`Taux de no-show : ${a.rate} % (${a.count??0} no-shows).`)}if("getCustomers"===a.tool&&t.kpis&&"object"==typeof t.kpis){let a=t.kpis;"number"==typeof a.inactive&&a.inactive>0&&e.push(`${a.inactive} clientes inactives d\xe9tect\xe9es.`),"number"==typeof a.atRisk&&a.atRisk>0&&e.push(`${a.atRisk} clientes \xe0 risque de perte.`)}}return e.length?e.join("\n\n")+"\n\nCes chiffres proviennent du moteur Analytics (PostgreSQL), pas d'une estimation du mod\xe8le.":null}(d),p=m?`${m}

---
Donn\xe9es brutes:
${(0,l.Y1)(d)}`:(0,l.Y1)(d),E=d.filter(t=>t.ok).map(t=>t.tool),A=d.map(t=>({tool:t.tool,ok:t.ok,label:c.Nj[t.tool]??t.tool})),g=(0,u.qI)(),f=!1;if("mock"===g.name)a={content:m??(d.some(t=>!t.ok&&t.error)?d.filter(t=>!t.ok).map(t=>t.error).join("\n"):"Je n'ai pas pu charger de donn\xe9es pour cette question."),promptTokens:Math.ceil(s.length/4),completionTokens:Math.ceil((m?.length??40)/4),provider:"mock"};else try{a=await g.chat({systemPrompt:function(t){let e=(0,c.Pi)(t.role).join(", ");return`Tu es l'assistant Rappel Beauty pour un institut de beaut\xe9 au Maroc.
Utilisateur: ${t.userDisplayName} (r\xf4le ${t.role}).
R\xe8gles strictes:
- Tu ne inventes JAMAIS de chiffres. Utilise uniquement les DONN\xc9ES R\xc9ELLES fournies.
- Les montants sont en MAD.
- organizationId n'est jamais fourni par l'utilisateur.
- Outils autoris\xe9s pour ce r\xf4le: ${e||"aucun"}.
- Si une donn\xe9e manque ou est refus\xe9e, dis-le clairement.
- Ne demande jamais et n'expose jamais mots de passe, tokens, secrets.`}(t),messages:[{role:"user",content:s}],toolContext:p})}catch(e){let t=e instanceof Error?e.message:"";if(t.startsWith("AI_PROVIDER_")||"AI_PROVIDER_NOT_CONFIGURED"===t||"AI_PROVIDER_TIMEOUT"===t)f=!0,g=new u.qg,a={content:(m??"Les donn\xe9es n'ont pas pu \xeatre interpr\xe9t\xe9es.")+"\n\n(R\xe9ponse de secours — provider IA indisponible.)",promptTokens:0,completionTokens:0,provider:"mock"};else throw e}return await w.query(`INSERT INTO "AIMessage" (id, "conversationId", role, content, metadata)
     VALUES ($1,$2,'ASSISTANT'::"AIMessageRole",$3,$4::jsonb)`,[I("aim"),n,a.content,JSON.stringify({provider:a.provider,toolsUsed:E,sources:A,fallback:f,promptTokens:a.promptTokens,completionTokens:a.completionTokens})]),await w.query('UPDATE "AIConversation" SET "updatedAt" = NOW() WHERE id = $1',[n]),await S(t.organizationId,{prompt:a.promptTokens,completion:a.completionTokens}),await (0,o.writeAuditLog)({organizationId:t.organizationId,actorId:t.userId,actorName:t.userDisplayName,entityType:"AIConversation",entityId:n,action:"AI_CHAT",after:{toolsUsed:E,provider:a.provider,fallback:f}}),{conversationId:n,reply:a.content,toolsUsed:E,provider:a.provider,sources:A,fallback:f}}async function O(t){let e={period:(0,d.jm)("week"),compare:!0,staffId:null,serviceId:null,resourceId:null};if("STAFF"===t.role||"CASHIER"===t.role)return{periodLabel:"cette semaine",empty:!0,kpis:{revenue:0,revenuePrevious:0,revenueChangePercent:null,customersDelta:null,customersNew:0,inactiveCustomers:0,lowStockCount:0,noShowRate:null,topServiceName:null,topServiceRevenueShare:null,revenueMonth:0,revenuePrevMonth:0,inactiveCustomers60d:0},bullets:["Votre r\xf4le n'a pas acc\xe8s \xe0 l'analyse financi\xe8re globale de l'institut."],opportunities:[],disclaimer:"Les chiffres affich\xe9s proviennent uniquement des KPI PostgreSQL autoris\xe9s pour votre r\xf4le."};let[a,s,n,i,r,o]=await Promise.all([(0,m.w3)(t.organizationId,e),(0,m.zH)(t.organizationId,e),(0,m.jw)(t.organizationId,e),(0,m.Jw)(t.organizationId,e),(0,m.oo)(t.organizationId,e),(0,l.nV)(t.organizationId,"week")]),u=a.revenue.value,c=a.revenue.previous??s.totals.prevMonth,p=a.revenue.changePercent,E=n.kpis.newInPeriod,A=null!=a.customers.previous?a.customers.value-a.customers.previous:E,I=n.kpis.inactive,g=i.lowStockCount,N=r.noShow.rate,f=0===u&&0===E&&0===I&&0===g&&(r.total??0)===0,h=[],S=[];return o.name&&null!=o.share&&(h.push(`${o.name} est votre service le plus performant (${o.share} % du CA services).`),S.push({text:`${o.name} est votre service le plus performant.`,href:"/analytics/"})),I>0&&S.push({text:`${I} clientes n'ont pas repris d'activit\xe9 r\xe9cente — pensez \xe0 une relance.`,href:"/customers/"}),g>0&&S.push({text:`${g} produits passent sous le stock minimum.`,href:"/stock/"}),null!=N&&N>=5&&S.push({text:`Le taux de no-show est de ${N} %.`,href:"/settings/"}),{periodLabel:"cette semaine",empty:f,kpis:{revenue:u,revenuePrevious:c,revenueChangePercent:p,customersDelta:A,customersNew:E,inactiveCustomers:I,lowStockCount:g,noShowRate:N,topServiceName:o.name,topServiceRevenueShare:o.share,revenueMonth:u,revenuePrevMonth:c,inactiveCustomers60d:I},bullets:h,opportunities:S,disclaimer:"Analyse bas\xe9e sur les KPI Analytics (PostgreSQL). Aucun chiffre g\xe9n\xe9r\xe9 par le mod\xe8le de langage."}}async function k(t){if("STAFF"===t.role||"CASHIER"===t.role)return[];let e=await O(t),a=[];return e.kpis.inactiveCustomers>0&&a.push({id:"reactivate-inactive",title:"Opportunit\xe9 relance",detail:`${e.kpis.inactiveCustomers} clientes inactives — cr\xe9ez une campagne WhatsApp de retour.`,actionHref:"/customers/",actionLabel:"Voir les clientes"}),e.kpis.lowStockCount>0&&a.push({id:"restock",title:"Stock bas",detail:`${e.kpis.lowStockCount} produits sous le minimum — planifiez un r\xe9assort.`,actionHref:"/stock/",actionLabel:"Voir le stock"}),(e.kpis.noShowRate??0)>=8&&a.push({id:"noshow",title:"No-shows",detail:`Taux de no-show \xe0 ${e.kpis.noShowRate} % — v\xe9rifiez acomptes / rappels WhatsApp.`,actionHref:"/settings/",actionLabel:"Politique r\xe9servation"}),e.kpis.topServiceName&&a.push({id:"push-service",title:"Campagne service phare",detail:`Mettez en avant ${e.kpis.topServiceName} aupr\xe8s des clientes dormantes.`,actionHref:"/whatsapp/",actionLabel:"Ouvrir WhatsApp"}),a}async function y(t,e){await h(t.organizationId,t.planCode);let a=await (0,E.o8)(t.organizationId,e),s=e.variantCount??3,n=await (0,E.f6)(t,a.facts,s);return await S(t.organizationId,{prompt:n.tokens.prompt,completion:n.tokens.completion}),await (0,o.writeAuditLog)({organizationId:t.organizationId,actorId:t.userId,actorName:t.userDisplayName,entityType:"AIMessage",entityId:a.customer?.id??t.userId,action:"AI_GENERATE_MESSAGE",after:{kind:e.kind,tone:e.tone??"warm",language:e.language??"fr",channel:e.channel??"whatsapp",variantCount:n.variants.length,customerId:a.customer?.id??null,provider:n.provider,fallback:n.fallback}}),{variants:n.variants,kind:e.kind,tone:e.tone??"warm",language:e.language??"fr",personalization:a.personalization,bookingUrl:a.bookingUrl,customer:a.customer,disclaimer:"Propositions \xe0 valider avant envoi. Aucun message WhatsApp n'est envoy\xe9 automatiquement."}}s()}catch(t){s(t)}})},63646:(t,e,a)=>{a.a(t,async(t,s)=>{try{a.d(e,{Dg:()=>I,Fm:()=>m,Y1:()=>E,kc:()=>p,nV:()=>A});var n=a(45028),i=a(44162),r=a(34642),o=a(8832),u=a(41365),c=t([n,i,r]);function l(t="month"){return{period:(0,u.jm)(t),compare:!0,staffId:null,serviceId:null,resourceId:null}}function d(t,e){return{ok:!1,tool:t,error:e}}async function m(t,e,a={}){if(!(0,o.S9)(t.role,e))return d(e,"getRevenue"===e||"getDashboard"===e?"Vous n'avez pas acc\xe8s aux donn\xe9es financi\xe8res globales.":"Outil non autoris\xe9 pour votre r\xf4le.");let s="string"==typeof a.period?a.period:"month",u=["today","week","month","prev_month","year"].includes(s)?s:"month",c=l(u),m=t.organizationId;try{switch(e){case"getRevenue":{let t=await (0,n.zH)(m,c);return{ok:!0,tool:e,data:t}}case"getDashboard":{let t=await (0,n.w3)(m,c);return{ok:!0,tool:e,data:t}}case"getCustomers":case"getCustomerStats":{let t=await (0,n.jw)(m,c);return{ok:!0,tool:e,data:t}}case"getAppointments":{let t=await (0,n.oo)(m,c);return{ok:!0,tool:e,data:t}}case"getStaffPerformance":{let t=await (0,n.zX)(m,c);return{ok:!0,tool:e,data:t}}case"getInventory":{let t=await (0,n.Jw)(m,c);return{ok:!0,tool:e,data:t}}case"getMarketingStats":{let[t,a,s]=await Promise.all([(0,n.Ug)(m,c),(0,n.i6)(m,c),(0,n.Go)(m,c)]);return{ok:!0,tool:e,data:{campaigns:t,postVisit:a,aiMarketing:s}}}case"getLoyaltyStats":{let t=await (0,n.Tw)(m,c);return{ok:!0,tool:e,data:t}}case"getReviewStats":{let t=await (0,n.YH)(m,c);return{ok:!0,tool:e,data:t}}case"searchCustomers":{let t=String(a.q??a.query??"").trim();if(t.length<2)return d(e,"Requ\xeate trop courte (min. 2 caract\xe8res).");let s=await (0,i.$L)(m,{page:1,limit:10,search:t});return{ok:!0,tool:e,data:{items:s.items.map(t=>({id:t.id,name:`${t.firstName} ${t.lastName}`.trim(),phone:t.phone,status:t.status})),total:s.total}}}case"searchServices":{let t=String(a.q??a.query??"").trim(),s=await (0,r.o3)(m,{page:1,limit:20,search:t||void 0,active:!0});return{ok:!0,tool:e,data:{items:s.items.map(t=>({id:t.id,name:t.name,price:t.price,durationMin:t.durationMin,active:t.active})),total:s.total}}}default:return d(e,"Outil inconnu.")}}catch(t){return console.error(`[executeAITool] ${e}`,t),d(e,"Erreur lors de la lecture des donn\xe9es.")}}function p(t){let e=t.toLowerCase(),a=[];return/ca\b|chiffre|revenu|recette|panier|paiement|r[eé]alis[eé]/.test(e)&&a.push("getRevenue","getDashboard"),/cliente|client\b|inactiv|relanc|vip|60\s*jours/.test(e)&&a.push("getCustomers"),/rdv|rendez|no-?show|occupation|cr[eé]neau/.test(e)&&a.push("getAppointments"),/service|hydrafacial|prestation/.test(e)&&a.push("getDashboard"),/stock|rupture|produit|inventaire/.test(e)&&a.push("getInventory"),/employ|staff|performance|book[eé]/.test(e)&&a.push("getStaffPerformance"),/marketing|campagne/.test(e)&&a.push("getMarketingStats"),/fid[eé]lit|loyalty|forfait/.test(e)&&a.push("getLoyaltyStats"),/avis|review|satisfaction/.test(e)&&a.push("getReviewStats"),/cherche|trouver|recherche/.test(e)&&/cliente|client/.test(e)&&a.push("searchCustomers"),0===a.length&&a.push("getDashboard"),Array.from(new Set(a))}function E(t){let e=[];for(let a of t){if(!a.ok){e.push(`• ${a.tool}: ${a.error}`);continue}e.push(`• ${a.tool}: ${JSON.stringify(a.data).slice(0,1200)}`)}return e.join("\n")}async function A(t,e="month"){let a=await (0,n.xD)(t,l(e)),s=a.reduce((t,e)=>t+(e.revenue??0),0),i=a[0];return!i||s<=0?{name:null,share:null}:{name:i.serviceName,share:Math.round(i.revenue/s*1e3)/10}}function I(t){let e=t.toLowerCase();return/aujourd|today/.test(e)?"today":/semaine|week/.test(e)?"week":/ann[eé]e|year/.test(e)?"year":"month"}[n,i,r]=c.then?(await c)():c,s()}catch(t){s(t)}})},44162:(t,e,a)=>{a.a(t,async(t,s)=>{try{a.d(e,{$L:()=>l,$k:()=>d,XA:()=>A,l4:()=>m,uG:()=>I,wK:()=>p,zp:()=>g});var n=a(8678),i=a(90831),r=a(11107),o=a(31244),u=t([n]);n=(u.then?(await u)():u)[0];let N=(0,i.S)(new n.Pool({connectionString:process.env.DATABASE_URL}));function c(t){let e=parseInt(t.visits,10)||0,a=parseInt(t.noShowCount,10)||0,s=parseFloat(t.revenue)||0,n=e>0?Math.round(s/e*100)/100:0;return{id:t.id,firstName:t.firstName,lastName:t.lastName,phone:t.phone,email:t.email,status:t.status,visits:e,noShowCount:a,revenue:s,averageTicket:n,lastVisitAt:t.lastVisitAt?.toISOString()??null,createdAt:t.createdAt.toISOString(),segment:function(t){if("INACTIVE"===t.status||"ARCHIVED"===t.status)return"INACTIVE";if("AT_RISK"===t.status)return"AT_RISK";if("NEW"===t.status)return"NEW";let e=(Date.now()-t.createdAt.getTime())/864e5;if(e<=r.TX&&t.visits<=1)return"NEW";if(t.revenue>=r.Fo||t.visits>=r.P9)return"VIP";if(t.lastVisitAt){if((Date.now()-t.lastVisitAt.getTime())/864e5>r.co)return"AT_RISK"}else if(e>r.co)return"AT_RISK";return"ACTIVE"}({status:t.status,visits:e,revenue:s,createdAt:t.createdAt,lastVisitAt:t.lastVisitAt})}}async function l(t,e){let{page:a,limit:s,search:n,status:i,segment:o="ALL"}=e,u=['c."organizationId" = $1','c."deletedAt" IS NULL'],l=[t],d=2;n&&(u.push(`(c."firstName" ILIKE $${d} OR c."lastName" ILIKE $${d} OR c.phone ILIKE $${d} OR COALESCE(c.email, '') ILIKE $${d})`),l.push(`%${n}%`),d++),i&&(u.push(`c.status = $${d}`),l.push(i),d++);let m=u.join(" AND "),p="ALL"!==o?function(t,e){switch(t){case"VIP":return`HAVING (
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
      )`;case"ACTIVE":return"HAVING c.status = 'ACTIVE'";default:return""}}(o,0):"",E=`
    SELECT COUNT(*)::int AS total FROM (
      SELECT c.id
      FROM "Customer" c
      LEFT JOIN "Appointment" a ON a."customerId" = c.id AND a.status = 'COMPLETED'
      WHERE ${m}
      GROUP BY c.id, c.status, c."createdAt"
      ${p}
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
    WHERE ${m}
    GROUP BY c.id
    ${p}
    ORDER BY c."createdAt" DESC, c."lastName", c."firstName"
    LIMIT $${d} OFFSET $${d+1}
  `,I=`
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
  `,[g,f,h]=await Promise.all([N.query(E,l),N.query(A,[...l,s,(a-1)*s]),N.query(I,[t])]);return{items:f.rows.map(c),total:g.rows[0]?.total??0,kpis:h.rows[0]??{total:0,newCount:0,vipCount:0,inactiveCount:0,activeCount:0,atRiskCount:0}}}async function d(t,e){var s;let{rows:n}=await N.query(`SELECT
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
    GROUP BY c.id`,[e,t]),i=n[0]?(s=n[0],{...c(s),birthDate:s.birthDate?.toISOString()??null,address:s.address,instagram:s.instagram,notes:s.notes,marketingWhatsapp:s.marketingWhatsapp,marketingEmail:s.marketingEmail,marketingSms:s.marketingSms,updatedAt:s.updatedAt.toISOString()}):null;if(!i)return null;try{let{countCustomerNoShows:s,getOrCreateBookingPolicy:n,noShowRiskLevel:r}=await a.e(819).then(a.bind(a,50819)),o=await s(e,t),u=await n(e);i.noShowCount=o,i.noShowRisk=r(o,u)}catch{i.noShowCount=0,i.noShowRisk="NONE"}return i}async function m(t,e){let{rows:a}=await N.query(`SELECT a.id, a."startAt", COALESCE(s.name, 'Prestation') AS "serviceName", a.price::text, a.status,
            st."firstName" AS "staffFirstName"
     FROM "Appointment" a
     LEFT JOIN "Service" s ON s.id = a."serviceId"
     JOIN "Customer" c ON c.id = a."customerId"
     LEFT JOIN "Staff" st ON st.id = a."staffId"
     WHERE a."customerId" = $1 AND c."organizationId" = $2
     ORDER BY a."startAt" DESC
     LIMIT 50`,[t,e]);return a.map(t=>({id:t.id,startAt:t.startAt.toISOString(),serviceName:t.serviceName,price:parseFloat(t.price),status:t.status,staffFirstName:t.staffFirstName}))}async function p(t,e){let s=(0,o.UK)(e.phone),n=`cust-${Date.now()}`;await N.query(`INSERT INTO "Customer" (
      id, "organizationId", "firstName", "lastName", phone, email,
      "birthDate", address, instagram, notes, status,
      "marketingWhatsapp", "marketingEmail", "marketingSms", "updatedAt"
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'NEW',$11,$12,$13,NOW())`,[n,t,e.firstName,e.lastName,s,e.email??null,e.birthDate?new Date(e.birthDate):null,e.address??null,e.instagram??null,e.notes??null,e.marketingWhatsapp??!1,e.marketingEmail??!1,e.marketingSms??!1]);let i=await d(n,t);if(!i)throw Error("Cliente cr\xe9\xe9e introuvable.");try{let{writeAuditLog:e}=await Promise.resolve().then(a.bind(a,66085));await e({organizationId:t,entityType:"Customer",entityId:n,action:"CREATE",after:{firstName:i.firstName,lastName:i.lastName,phone:i.phone}})}catch{}return i}async function E(t,e,a){let s=(0,o.UK)(e),{rows:n}=await (a??N).query(`SELECT id, "marketingWhatsapp", "marketingEmail"
     FROM "Customer"
     WHERE "organizationId" = $1 AND phone = $2 AND "deletedAt" IS NULL
     LIMIT 1`,[t,s]);return n[0]??null}async function A(t,e,a){let s=a??N,n=(0,o.UK)(e.phone),i=await E(t,n,s);if(i){let t=e.marketingOptIn||i.marketingWhatsapp,a=e.marketingOptIn||i.marketingEmail;return await s.query(`UPDATE "Customer"
       SET "firstName" = $1, "lastName" = $2,
           email = COALESCE($3, email),
           "marketingWhatsapp" = $4, "marketingEmail" = $5, "updatedAt" = NOW()
       WHERE id = $6`,[e.firstName.trim(),e.lastName.trim(),e.email?.trim()||null,t,a,i.id]),{customerId:i.id,created:!1}}let r=`cust-${Date.now()}-${Math.random().toString(36).slice(2,7)}`,u=e.marketingOptIn??!1;return await s.query(`INSERT INTO "Customer" (
      id, "organizationId", "firstName", "lastName", phone, email, status,
      "marketingWhatsapp", "marketingEmail", "marketingSms", "updatedAt"
    ) VALUES ($1,$2,$3,$4,$5,$6,'NEW',$7,$8,false,NOW())`,[r,t,e.firstName.trim(),e.lastName.trim(),n,e.email?.trim()||null,u,u]),{customerId:r,created:!0}}async function I(t,e,s){let n=await d(t,e);if(!n&&!s.archived)return null;if(s.archived){await N.query(`UPDATE "Customer"
       SET status = 'ARCHIVED', "deletedAt" = NOW(), "updatedAt" = NOW()
       WHERE id = $1 AND "organizationId" = $2 AND "deletedAt" IS NULL`,[t,e]);try{let{writeAuditLog:s}=await Promise.resolve().then(a.bind(a,66085));await s({organizationId:e,entityType:"Customer",entityId:t,action:"ARCHIVE",before:n?{status:n.status}:void 0,after:{status:"ARCHIVED"}})}catch{}return d(t,e)}let i=[],r=[],u=1,c=(t,e)=>{i.push(`"${t}" = $${u++}`),r.push(e)};if(void 0!==s.firstName&&c("firstName",s.firstName),void 0!==s.lastName&&c("lastName",s.lastName),void 0!==s.phone&&c("phone",(0,o.UK)(s.phone)),void 0!==s.email&&c("email",s.email??null),void 0!==s.birthDate&&c("birthDate",s.birthDate?new Date(s.birthDate):null),void 0!==s.address&&c("address",s.address??null),void 0!==s.instagram&&c("instagram",s.instagram??null),void 0!==s.notes&&c("notes",s.notes??null),void 0!==s.status&&c("status",s.status),void 0!==s.marketingWhatsapp&&c("marketingWhatsapp",s.marketingWhatsapp),void 0!==s.marketingEmail&&c("marketingEmail",s.marketingEmail),void 0!==s.marketingSms&&c("marketingSms",s.marketingSms),0===i.length)return d(t,e);i.push('"updatedAt" = NOW()'),r.push(t,e);let l=await N.query(`UPDATE "Customer" SET ${i.join(", ")}
     WHERE id = $${u} AND "organizationId" = $${u+1} AND "deletedAt" IS NULL`,r);if(0===l.rowCount)return null;let m=await d(t,e);try{let{writeAuditLog:s}=await Promise.resolve().then(a.bind(a,66085));await s({organizationId:e,entityType:"Customer",entityId:t,action:"UPDATE",before:n?{firstName:n.firstName,lastName:n.lastName,phone:n.phone,status:n.status}:void 0,after:m?{firstName:m.firstName,lastName:m.lastName,phone:m.phone,status:m.status}:void 0})}catch{}return m}function g(t){return"object"==typeof t&&null!==t&&"code"in t&&"23505"===t.code}s()}catch(t){s(t)}})}};