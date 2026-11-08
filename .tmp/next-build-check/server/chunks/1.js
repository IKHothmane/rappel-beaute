"use strict";exports.id=1,exports.ids=[1,3645,9439],exports.modules={49303:(e,t,a)=>{e.exports=a(30517)},11211:(e,t,a)=>{a.a(e,async(e,i)=>{try{a.d(t,{Ce:()=>O,Gx:()=>R,QF:()=>I,a_:()=>E,hm:()=>T,mA:()=>S,mK:()=>C});var n=a(84770),s=a(8678),r=a(2192),u=a(39212),o=a(17729),p=e([s,r,u,o]);[s,r,u,o]=p.then?(await p)():p;let D=new s.Pool({connectionString:process.env.DATABASE_URL});function c(e){return`${e}_${(0,n.randomBytes)(8).toString("hex")}`}let L=`
  WITH customer_stats AS (
    SELECT
      cu.id,
      cu."firstName",
      cu."lastName",
      cu.phone,
      cu.email,
      cu.status::text AS status,
      cu."marketingWhatsapp",
      cu."marketingEmail",
      COUNT(DISTINCT CASE WHEN a.status = 'COMPLETED' THEN a.id END)::int AS visits,
      COALESCE(SUM(CASE WHEN a.status = 'COMPLETED' THEN a.price ELSE 0 END), 0)::float AS revenue,
      MAX(CASE WHEN a.status = 'COMPLETED' THEN a."startAt" END) AS "lastVisitAt",
      la.level::text AS "loyaltyLevel",
      EXISTS (
        SELECT 1 FROM "Appointment" ua
        WHERE ua."customerId" = cu.id
          AND ua.status IN ('PENDING','CONFIRMED')
          AND ua."startAt" >= NOW()
      ) AS "hasUpcoming",
      (
        SELECT wt."sentAt" FROM "WhatsAppTask" wt
        WHERE wt."customerId" = cu.id
          AND wt."organizationId" = cu."organizationId"
          AND wt.type::text = ANY($2::text[])
          AND wt.status = 'SENT'::"WhatsAppTaskStatus"
          AND wt."sentAt" IS NOT NULL
        ORDER BY wt."sentAt" DESC LIMIT 1
      ) AS "lastMarketingSentAt",
      (
        SELECT s.name FROM "Appointment" la2
        JOIN "Service" s ON s.id = la2."serviceId"
        WHERE la2."customerId" = cu.id AND la2.status = 'COMPLETED'
        ORDER BY la2."startAt" DESC LIMIT 1
      ) AS "lastServiceName",
      EXISTS (
        SELECT 1 FROM "Package" p
        WHERE p."customerId" = cu.id AND p."organizationId" = cu."organizationId"
          AND p.status = 'ACTIVE'::"PackageStatus"
      ) AS "hasActivePackage",
      EXISTS (
        SELECT 1 FROM "Package" p
        WHERE p."customerId" = cu.id AND p."organizationId" = cu."organizationId"
          AND p.status = 'ACTIVE'::"PackageStatus"
          AND (p."sessionTotal" - p."sessionUsed") <= 1
      ) AS "packageExpiringSoon"
    FROM "Customer" cu
    LEFT JOIN "Appointment" a ON a."customerId" = cu.id
    LEFT JOIN "LoyaltyAccount" la ON la."customerId" = cu.id AND la."organizationId" = cu."organizationId"
    WHERE cu."organizationId" = $1 AND cu."deletedAt" IS NULL
    GROUP BY cu.id, cu."firstName", cu."lastName", cu.phone, cu.email, cu.status,
             cu."marketingWhatsapp", cu."marketingEmail", la.level
  )
`;function l(e,t,a,i){if("WHATSAPP"===t){if(!e.marketingWhatsapp)return"Opt-in WhatsApp absent";if(!e.phone)return"Num\xe9ro manquant"}else{if(!e.marketingEmail)return"Opt-in e-mail absent";if(!e.email)return"E-mail manquant"}if(e.hasUpcoming)return"Rendez-vous \xe0 venir";if(i&&e.lastMarketingSentAt){let t=(Date.now()-new Date(e.lastMarketingSentAt).getTime())/864e5;if(t<a)return`Message marketing r\xe9cent (${Math.floor(t)} j, min. ${a} j)`}return null}async function m(e,t){if(!t)return null;let{rows:a}=await D.query(`SELECT name, code, value::text, type::text FROM "Promotion"
     WHERE id = $1 AND "organizationId" = $2 AND "deletedAt" IS NULL`,[t,e]),i=a[0];if(!i)return null;let n="";return"PERCENTAGE"===i.type&&i.value?n=`-${i.value}%`:i.value&&(n=`-${i.value} MAD`),{name:i.name,code:i.code??"",discount:n}}async function d(e,t,a,i){let n=(await D.query('SELECT name, phone, address FROM "Organization" WHERE id = $1',[e])).rows[0]??{name:"",phone:"",address:""},s=await m(e,i),r=a.lastVisitAt?new Date(a.lastVisitAt):null;return(0,o.O3)(t,{customer:{firstName:a.firstName,lastName:a.lastName},organization:{name:n.name,phone:n.phone??"",address:n.address??""},service:{name:a.lastServiceName??"",price:""},promotion:{code:s?.code??"",discount:s?.discount??""},lastVisit:{date:r?r.toLocaleDateString("fr-FR",{month:"long",year:"numeric"}):"",days:null!=a.daysSince?String(a.daysSince):""},lastService:{name:a.lastServiceName??""}})}async function g(e,t,a){let i=[e,u.sB],{sql:n,nextIdx:s}=function(e,t,a,i){let n=[],s=3;return e.customerStatuses?.length&&(n.push(`cs.status = ANY($${s}::text[])`),a.push(e.customerStatuses),s++),null!=e.minDaysSinceLastVisit&&(n.push('cs."lastVisitAt" IS NOT NULL'),n.push(`EXTRACT(DAY FROM NOW() - cs."lastVisitAt") >= $${s}`),a.push(e.minDaysSinceLastVisit),s++),null!=e.maxDaysSinceLastVisit&&(n.push('cs."lastVisitAt" IS NOT NULL'),n.push(`EXTRACT(DAY FROM NOW() - cs."lastVisitAt") <= $${s}`),a.push(e.maxDaysSinceLastVisit),s++),null!=e.minVisits&&(n.push(`cs.visits >= $${s}`),a.push(e.minVisits),s++),null!=e.maxVisits&&(n.push(`cs.visits <= $${s}`),a.push(e.maxVisits),s++),null!=e.minRevenue&&(n.push(`cs.revenue >= $${s}`),a.push(e.minRevenue),s++),null!=e.maxRevenue&&(n.push(`cs.revenue <= $${s}`),a.push(e.maxRevenue),s++),null!=e.minAverageTicket&&(n.push(`cs.visits > 0 AND (cs.revenue / cs.visits) >= $${s}`),a.push(e.minAverageTicket),s++),e.serviceIds?.length&&(n.push(`EXISTS (
      SELECT 1 FROM "Appointment" ax
      WHERE ax."customerId" = cs.id AND ax.status = 'COMPLETED'
        AND ax."serviceId" = ANY($${s}::text[])
    )`),a.push(e.serviceIds),s++),e.loyaltyLevels?.length&&(n.push(`COALESCE(cs."loyaltyLevel", 'BRONZE') = ANY($${s}::text[])`),a.push(e.loyaltyLevels),s++),!0===e.hasActivePackage&&n.push('cs."hasActivePackage" = true'),!0===e.packageExpiringSoon&&n.push('cs."packageExpiringSoon" = true'),!1!==e.noUpcomingAppointment&&n.push('cs."hasUpcoming" = false'),"WHATSAPP"===t||!0===e.marketingWhatsapp?(n.push('cs."marketingWhatsapp" = true'),n.push("cs.phone IS NOT NULL AND cs.phone <> ''")):!0===e.marketingEmail&&(n.push('cs."marketingEmail" = true'),n.push("cs.email IS NOT NULL AND cs.email <> ''")),{sql:n.length?` AND ${n.join(" AND ")}`:"",nextIdx:s}}(t,a,i,0),{rows:r}=await D.query(`${L}
     SELECT
       cs.id,
       cs."firstName",
       cs."lastName",
       cs.phone,
       cs.email,
       cs."marketingWhatsapp",
       cs."marketingEmail",
       cs.visits,
       cs.revenue,
       cs."lastVisitAt",
       CASE WHEN cs."lastVisitAt" IS NOT NULL
         THEN GREATEST(0, EXTRACT(DAY FROM NOW() - cs."lastVisitAt")::int)
         ELSE NULL END AS "daysSince",
       cs."hasUpcoming",
       cs."lastMarketingSentAt",
       cs."lastServiceName"
     FROM customer_stats cs
     WHERE 1=1 ${n}
     ORDER BY cs.revenue DESC, cs."lastName"
     LIMIT 500`,i);return r}async function E(e,t,a,i,n){let s=await (0,u.WF)(e),r=!1!==t.excludeRecentMarketing,o=await g(e,t,a),p=[];"WHATSAPP"===a&&p.push("Opt-in WhatsApp"),!1!==t.noUpcomingAppointment&&p.push("Aucun RDV futur"),null!=t.minDaysSinceLastVisit&&p.push(`Derni\xe8re visite > ${t.minDaysSinceLastVisit} jours`),r&&p.push(`Pas de message marketing < ${s.minimumDaysBetweenMarketingMessages} j`);let c=o.map(e=>{let t=l(e,a,s.minimumDaysBetweenMarketingMessages,r);return{id:e.id,firstName:e.firstName,lastName:e.lastName,phone:e.phone,email:e.email,lastVisitAt:e.lastVisitAt?new Date(e.lastVisitAt).toISOString():null,daysSinceLastVisit:e.daysSince,excluded:!!t,excludeReason:t}}),m=c.filter(e=>!e.excluded),E=o.find(e=>!l(e,a,s.minimumDaysBetweenMarketingMessages,r)),N=null,A=null;return E&&(N=await d(e,i,E,n??null),A={id:E.id,name:`${E.firstName} ${E.lastName}`}),{eligibleCount:m.length,excludedCount:c.length-m.length,checks:p,sampleMessage:N,sampleCustomer:A,customers:c.slice(0,50)}}function N(e){return{id:String(e.id),name:String(e.name),channel:e.channel,status:e.status,audienceCount:Number(e.audienceCount)||0,pendingCount:Number(e.pendingCount)||0,sentCount:Number(e.sentCount)||0,promotionId:e.promotionId??null,promotionName:e.promotionName??null,promotionCode:e.promotionCode??null,attributedRevenue:Math.round(100*(parseFloat(String(e.attributedRevenue??"0"))||0))/100,scheduledFor:e.scheduledFor?new Date(e.scheduledFor).toISOString():null,preparedAt:e.preparedAt?new Date(e.preparedAt).toISOString():null,createdAt:new Date(e.createdAt).toISOString()}}async function A(e){let{rows:t}=await D.query(`SELECT
      (SELECT COUNT(*)::int FROM "Campaign"
       WHERE "organizationId" = $1 AND status = 'ACTIVE'::"CampaignStatus") AS "activeCampaigns",
      (SELECT COUNT(*)::int FROM "Campaign"
       WHERE "organizationId" = $1 AND status = 'DRAFT'::"CampaignStatus") AS "draftCampaigns",
      (SELECT COUNT(*)::int FROM "Campaign"
       WHERE "organizationId" = $1 AND status = 'PAUSED'::"CampaignStatus") AS "pausedCampaigns",
      (SELECT COUNT(*)::int FROM "Campaign"
       WHERE "organizationId" = $1 AND "scheduledFor" IS NOT NULL AND "scheduledFor" > NOW()
         AND status IN ('DRAFT'::"CampaignStatus", 'ACTIVE'::"CampaignStatus")) AS "scheduledCampaigns",
      (SELECT COUNT(*)::int FROM "Campaign" WHERE "organizationId" = $1) AS "totalCampaigns",
      (SELECT COALESCE(SUM("audienceCount"), 0)::int FROM "Campaign"
       WHERE "organizationId" = $1 AND status IN ('ACTIVE','COMPLETED')) AS "targetedCustomers",
      (SELECT COUNT(*)::int FROM "CampaignRecipient" cr
       JOIN "Campaign" c ON c.id = cr."campaignId"
       WHERE c."organizationId" = $1 AND cr.status = 'PENDING'::"CampaignRecipientStatus") AS "pendingMessages",
      (SELECT COUNT(*)::int FROM "CampaignRecipient" cr
       JOIN "Campaign" c ON c.id = cr."campaignId"
       WHERE c."organizationId" = $1 AND cr.status = 'SENT'::"CampaignRecipientStatus") AS "sentMessages",
      COALESCE((
        SELECT SUM(i.total)::float FROM "Invoice" i
        JOIN "Campaign" camp ON camp."promotionId" = i."promotionId"
        JOIN "CampaignRecipient" cr ON cr."campaignId" = camp.id AND cr."customerId" = i."customerId"
        WHERE camp."organizationId" = $1
          AND camp."preparedAt" IS NOT NULL
          AND i."issuedAt" >= camp."preparedAt"
          AND i.status <> 'VOID'
      ), 0)::text AS "attributedRevenue"`,[e]),a=t[0];return{activeCampaigns:a?.activeCampaigns??0,draftCampaigns:a?.draftCampaigns??0,pausedCampaigns:a?.pausedCampaigns??0,scheduledCampaigns:a?.scheduledCampaigns??0,totalCampaigns:a?.totalCampaigns??0,targetedCustomers:a?.targetedCustomers??0,pendingMessages:a?.pendingMessages??0,sentMessages:a?.sentMessages??0,attributedRevenue:Math.round(100*(parseFloat(a?.attributedRevenue??"0")||0))/100}}async function S(e){let[t,a]=await Promise.all([D.query(`SELECT c.*,
              p.name AS "promotionName",
              p.code AS "promotionCode",
              (SELECT COUNT(*)::int FROM "CampaignRecipient" cr
               WHERE cr."campaignId" = c.id AND cr.status = 'PENDING'::"CampaignRecipientStatus") AS "pendingCount",
              (SELECT COUNT(*)::int FROM "CampaignRecipient" cr
               WHERE cr."campaignId" = c.id AND cr.status = 'SENT'::"CampaignRecipientStatus") AS "sentCount",
              COALESCE((
                SELECT SUM(i.total)::float FROM "Invoice" i
                WHERE i."promotionId" = c."promotionId"
                  AND c."preparedAt" IS NOT NULL
                  AND i."issuedAt" >= c."preparedAt"
                  AND i.status <> 'VOID'
                  AND EXISTS (
                    SELECT 1 FROM "CampaignRecipient" cr
                    WHERE cr."campaignId" = c.id AND cr."customerId" = i."customerId"
                  )
              ), 0)::text AS "attributedRevenue"
       FROM "Campaign" c
       LEFT JOIN "Promotion" p ON p.id = c."promotionId"
       WHERE c."organizationId" = $1
       ORDER BY c."createdAt" DESC
       LIMIT 50`,[e]),A(e)]);return{items:t.rows.map(e=>N(e)),kpis:a}}async function C(e,t,a){let i=c("camp");await D.query(`INSERT INTO "Campaign" (
      id, "organizationId", name, channel, status, "messageTemplate",
      "segmentFilters", "promotionId", "scheduledFor", "createdById", "updatedAt"
    ) VALUES (
      $1,$2,$3,$4::"CampaignChannel",'DRAFT'::"CampaignStatus",$5,$6::jsonb,$7,$8,$9,NOW()
    )`,[i,e,t.name,t.channel,t.messageTemplate,JSON.stringify(t.segmentFilters),t.promotionId??null,t.scheduledFor?new Date(t.scheduledFor):null,a.id]),await (0,r.writeAuditLog)({organizationId:e,entityType:"Campaign",entityId:i,action:"CREATE",actorId:a.id,actorName:a.name});let n=await I(e,i);if(!n)throw Error("Campagne introuvable apr\xe8s cr\xe9ation.");return n}async function I(e,t){let{rows:a}=await D.query(`SELECT c.*,
            p.name AS "promotionName",
            p.code AS "promotionCode",
            (SELECT COUNT(*)::int FROM "CampaignRecipient" cr
             WHERE cr."campaignId" = c.id AND cr.status = 'PENDING'::"CampaignRecipientStatus") AS "pendingCount",
            (SELECT COUNT(*)::int FROM "CampaignRecipient" cr
             WHERE cr."campaignId" = c.id AND cr.status = 'SENT'::"CampaignRecipientStatus") AS "sentCount",
            (SELECT COUNT(*)::int FROM "CampaignRecipient" cr
             WHERE cr."campaignId" = c.id AND cr.status = 'SKIPPED'::"CampaignRecipientStatus") AS "skippedCount",
            COALESCE((
              SELECT SUM(i.total)::float FROM "Invoice" i
              WHERE i."promotionId" = c."promotionId"
                AND c."preparedAt" IS NOT NULL
                AND i."issuedAt" >= c."preparedAt"
                AND i.status <> 'VOID'
                AND EXISTS (
                  SELECT 1 FROM "CampaignRecipient" cr
                  WHERE cr."campaignId" = c.id AND cr."customerId" = i."customerId"
                )
            ), 0)::text AS "attributedRevenue"
     FROM "Campaign" c
     LEFT JOIN "Promotion" p ON p.id = c."promotionId"
     WHERE c.id = $2 AND c."organizationId" = $1`,[e,t]),i=a[0];return i?{...N(i),messageTemplate:String(i.messageTemplate),segmentFilters:i.segmentFilters??{},skippedCount:Number(i.skippedCount)||0}:null}async function T(e,t,a,i){let n=await I(e,t);if(!n)return null;if("DRAFT"!==n.status&&a.segmentFilters)throw Error("Impossible de modifier l'audience d'une campagne pr\xe9par\xe9e.");let s=['"updatedAt" = NOW()'],u=[e,t],o=3;return void 0!==a.name&&(s.push(`name = $${o}`),u.push(a.name),o++),void 0!==a.status&&(s.push(`status = $${o}::"CampaignStatus"`),u.push(a.status),o++),void 0!==a.messageTemplate&&(s.push(`"messageTemplate" = $${o}`),u.push(a.messageTemplate),o++),void 0!==a.segmentFilters&&(s.push(`"segmentFilters" = $${o}::jsonb`),u.push(JSON.stringify(a.segmentFilters)),o++),void 0!==a.promotionId&&(s.push(`"promotionId" = $${o}`),u.push(a.promotionId),o++),void 0!==a.scheduledFor&&(s.push(`"scheduledFor" = $${o}`),u.push(a.scheduledFor?new Date(a.scheduledFor):null),o++),await D.query(`UPDATE "Campaign" SET ${s.join(", ")} WHERE "organizationId" = $1 AND id = $2`,u),await (0,r.writeAuditLog)({organizationId:e,entityType:"Campaign",entityId:t,action:"UPDATE",actorId:i.id,actorName:i.name,after:a}),I(e,t)}async function h(e,t,a,i,n,s){let r=c("crec"),u=`campaign:${a}:customer:${i.id}`;if("WHATSAPP"===s){let s=c("wtask");await e.query(`INSERT INTO "WhatsAppTask" (
        id, "organizationId", "customerId", "campaignId", type, status,
        "messageSnapshot", "phoneSnapshot", "scheduledFor", "idempotencyKey", "updatedAt"
      ) VALUES (
        $1,$2,$3,$4,'PROMOTION'::"WhatsAppTaskType",'PENDING'::"WhatsAppTaskStatus",
        $5,$6,NOW(),$7,NOW()
      )
      ON CONFLICT ("organizationId", "idempotencyKey") DO NOTHING`,[s,t,i.id,a,n,i.phone,u]);let o=await e.query('SELECT id FROM "WhatsAppTask" WHERE "organizationId" = $1 AND "idempotencyKey" = $2',[t,u]),p=o.rows[0]?.id??s;await e.query(`INSERT INTO "CampaignRecipient" (
        id, "campaignId", "customerId", status, "messageSnapshot",
        "phoneSnapshot", "whatsappTaskId", "updatedAt"
      ) VALUES (
        $1,$2,$3,'PENDING'::"CampaignRecipientStatus",$4,$5,$6,NOW()
      )
      ON CONFLICT ("campaignId", "customerId") DO NOTHING`,[r,a,i.id,n,i.phone,p])}else await e.query(`INSERT INTO "CampaignRecipient" (
        id, "campaignId", "customerId", status, "messageSnapshot",
        "emailSnapshot", "updatedAt"
      ) VALUES (
        $1,$2,$3,'PENDING'::"CampaignRecipientStatus",$4,$5,NOW()
      )
      ON CONFLICT ("campaignId", "customerId") DO NOTHING`,[r,a,i.id,n,i.email])}async function R(e,t,a){let i=await I(e,t);if(!i)throw Error("Campagne introuvable.");if("COMPLETED"===i.status||"CANCELLED"===i.status)throw Error("Campagne termin\xe9e ou annul\xe9e.");let n=await (0,u.WF)(e),s=!1!==i.segmentFilters.excludeRecentMarketing,o=await g(e,i.segmentFilters,i.channel),p=await D.connect(),c=0,m=0;try{for(let a of(await p.query("BEGIN"),o)){if(l(a,i.channel,n.minimumDaysBetweenMarketingMessages,s)){m++;continue}let r=await d(e,i.messageTemplate,a,i.promotionId);await h(p,e,t,a,r,i.channel),c++}let a=await p.query('SELECT COUNT(*)::int AS n FROM "CampaignRecipient" WHERE "campaignId" = $1',[t]),r=a.rows[0]?.n??0;await p.query(`UPDATE "Campaign"
       SET status = CASE WHEN $3 > 0 THEN 'ACTIVE'::"CampaignStatus" ELSE status END,
           "audienceCount" = $3,
           "preparedAt" = CASE WHEN $3 > 0 THEN NOW() ELSE "preparedAt" END,
           "updatedAt" = NOW()
       WHERE id = $1 AND "organizationId" = $2`,[t,e,r]),await p.query("COMMIT")}catch(e){throw await p.query("ROLLBACK"),e}finally{p.release()}return await (0,r.writeAuditLog)({organizationId:e,entityType:"Campaign",entityId:t,action:"PREPARE",actorId:a.id,actorName:a.name,after:{prepared:c,skipped:m}}),{prepared:c,skipped:m}}async function O(e,t){let{rows:a}=await D.query(`SELECT cr.*,
            c."firstName" || ' ' || c."lastName" AS "customerName",
            wt."sentAt"
     FROM "CampaignRecipient" cr
     JOIN "Campaign" camp ON camp.id = cr."campaignId"
     JOIN "Customer" c ON c.id = cr."customerId"
     LEFT JOIN "WhatsAppTask" wt ON wt.id = cr."whatsappTaskId"
     WHERE camp."organizationId" = $1 AND cr."campaignId" = $2
     ORDER BY cr."createdAt" ASC
     LIMIT 500`,[e,t]);return a.map(e=>({id:String(e.id),customerId:String(e.customerId),customerName:String(e.customerName),status:e.status,messageSnapshot:String(e.messageSnapshot),phoneSnapshot:e.phoneSnapshot??null,whatsappTaskId:e.whatsappTaskId??null,sentAt:e.sentAt?new Date(e.sentAt).toISOString():null}))}i()}catch(e){i(e)}})},53645:(e,t,a)=>{a.d(t,{Ey:()=>i,Lc:()=>r,MX:()=>p,Pp:()=>u,T4:()=>o,bZ:()=>n,ff:()=>c,jG:()=>s});let i={name:"Rappel Beauty",version:"V1.2",url:"https://rappelbeauty.com",appUrl:"https://app.rappelbeauty.com",tagline:"Le logiciel de gestion pens\xe9 pour les instituts de beaut\xe9.",email:"contact@rappelbeauty.com",phone:"06 91 56 72 46",phoneInternational:"+212691567246"};function n(){let e="https://rappelbeauty.com".replace(/\/$/,""),t=/localhost|127\.0\.0\.1/i.test(e);return e&&!t?e:"staging"===s()?e&&!t?e:"":i.appUrl}function s(){return process.env.APP_ENV?.trim()||(/staging|\.up\.railway\.app/i.test("https://rappelbeauty.com")?"staging":"production")}let r="/connexion/",u={name:"Rappel Beauty",monthlyPrice:799,annualPrice:7990,annualSavings:1598,price:799,yearlyPrice:7990,currency:"MAD",trialDays:7,noCard:!0,noCommitment:!0};function o(e){return e.toLocaleString("fr-FR")}let p=["Casablanca","Rabat","Marrakech","Tanger","F\xe8s","Agadir","Mekn\xe8s","Oujda","T\xe9touan","Autre"],c=[{q:"Quel logiciel utiliser pour g\xe9rer un institut de beaut\xe9 au Maroc ?",a:"Rappel Beauty est un logiciel SaaS con\xe7u pour les instituts de beaut\xe9 au Maroc. Il permet de g\xe9rer les rendez-vous, clientes, \xe9quipe, stock, caisse, fid\xe9lit\xe9 et r\xe9servation en ligne depuis une seule plateforme."},{q:"Qu'est-ce que Rappel Beauty ?",a:"Rappel Beauty est un logiciel de gestion pour les instituts de beaut\xe9 au Maroc. Il sert \xe0 g\xe9rer les rendez-vous, les clientes, l'\xe9quipe, les services, le stock, la caisse, la fid\xe9lit\xe9 et la r\xe9servation en ligne."},{q:"Combien co\xfbte Rappel Beauty ?",a:`Rappel Beauty co\xfbte ${u.monthlyPrice} DH par mois ou ${o(u.annualPrice)} DH par an. Une p\xe9riode d'essai gratuite de ${u.trialDays} jours est propos\xe9e, sans engagement et sans carte bancaire.`},{q:"Que comprend la formule ?",a:"La formule donne acc\xe8s aux fonctionnalit\xe9s de gestion propos\xe9es par Rappel Beauty pour les instituts de beaut\xe9 : rendez-vous, clientes, \xe9quipe, services, stock, caisse, fid\xe9lit\xe9, r\xe9servation en ligne et outils de pilotage."},{q:"Combien de temps dure l'essai gratuit ?",a:`L'essai gratuit dure ${u.trialDays} jours.`},{q:"Faut-il une carte bancaire pour essayer ?",a:"Non. L'essai gratuit de 7 jours ne n\xe9cessite pas de carte bancaire."},{q:"Y a-t-il un engagement ?",a:"Non. La formule est sans engagement."},{q:"Les clientes paient-elles Rappel Beauty ?",a:"Non. Rappel Beauty est le logiciel utilis\xe9 par l'institut. Les clientes r\xe8glent directement leurs prestations aupr\xe8s de l'institut."},{q:"Comment fonctionne la r\xe9servation en ligne ?",a:"Chaque institut peut publier sa page : services, dur\xe9es et cr\xe9neaux issus du planning. La cliente r\xe9serve aupr\xe8s de l'institut, et le rendez-vous arrive dans le m\xeame agenda."},{q:"O\xf9 les clientes paient-elles leurs prestations ?",a:"Les clientes paient directement \xe0 l'institut. Les r\xe8glements se font au comptoir : esp\xe8ces, carte, virement, ch\xe8que ou carte cadeau."},{q:"Rappel Beauty est-il une marketplace ?",a:"Non. Rappel Beauty est un logiciel SaaS destin\xe9 aux instituts de beaut\xe9. Chaque institut dispose de son propre espace de gestion et peut avoir sa propre page publique de r\xe9servation."},{q:"Comment fonctionne WhatsApp avec Rappel Beauty ?",a:"Le logiciel pr\xe9pare le message. Depuis la page WhatsApp, un clic sur Envoyer le transmet depuis le num\xe9ro WhatsApp de l'institut."},{q:"Les photos des clientes sont-elles utilis\xe9es ?",a:"Non. Aucune photo cliente en V1. Les fiches restent textuelles."}]}};