"use strict";!function(){try{var e="undefined"!=typeof window?window:"undefined"!=typeof global?global:"undefined"!=typeof self?self:{},t=(new e.Error).stack;t&&(e._sentryDebugIds=e._sentryDebugIds||{},e._sentryDebugIds[t]="c8ffabae-4e6e-46cf-8dc1-51446c76bd6c",e._sentryDebugIdIdentifier="sentry-dbid-c8ffabae-4e6e-46cf-8dc1-51446c76bd6c")}catch(e){}}(),exports.id=163,exports.ids=[163,7487,528],exports.modules={88823:(e,t,a)=>{a.a(e,async(e,i)=>{try{a.d(t,{Ce:()=>L,Gx:()=>O,QF:()=>h,a_:()=>N,hm:()=>v,mA:()=>C,mK:()=>I});var s=a(84770),n=a(8678),r=a(90831),o=a(66085),u=a(90699),p=a(34239),c=e([n,o,u,p]);[n,o,u,p]=c.then?(await c)():c;let R=(0,r.S)(new n.Pool({connectionString:process.env.DATABASE_URL}));function l(e){return`${e}_${(0,s.randomBytes)(8).toString("hex")}`}let y=`
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
`;function d(e,t,a,i){if("WHATSAPP"===t){if(!e.marketingWhatsapp)return"Opt-in WhatsApp absent";if(!e.phone)return"Num\xe9ro manquant"}else{if(!e.marketingEmail)return"Opt-in e-mail absent";if(!e.email)return"E-mail manquant"}if(e.hasUpcoming)return"Rendez-vous \xe0 venir";if(i&&e.lastMarketingSentAt){let t=(Date.now()-new Date(e.lastMarketingSentAt).getTime())/864e5;if(t<a)return`Message marketing r\xe9cent (${Math.floor(t)} j, min. ${a} j)`}return null}async function m(e,t){if(!t)return null;let{rows:a}=await R.query(`SELECT name, code, value::text, type::text FROM "Promotion"
     WHERE id = $1 AND "organizationId" = $2 AND "deletedAt" IS NULL`,[t,e]),i=a[0];if(!i)return null;let s="";return"PERCENTAGE"===i.type&&i.value?s=`-${i.value}%`:i.value&&(s=`-${i.value} MAD`),{name:i.name,code:i.code??"",discount:s}}async function g(e,t,a,i){let s=(await R.query('SELECT name, phone, address FROM "Organization" WHERE id = $1',[e])).rows[0]??{name:"",phone:"",address:""},n=await m(e,i),r=a.lastVisitAt?new Date(a.lastVisitAt):null;return(0,p.O3)(t,{customer:{firstName:a.firstName,lastName:a.lastName},organization:{name:s.name,phone:s.phone??"",address:s.address??""},service:{name:a.lastServiceName??"",price:""},promotion:{code:n?.code??"",discount:n?.discount??""},lastVisit:{date:r?r.toLocaleDateString("fr-FR",{month:"long",year:"numeric"}):"",days:null!=a.daysSince?String(a.daysSince):""},lastService:{name:a.lastServiceName??""}})}async function E(e,t,a){let i=[e,u.sB],{sql:s,nextIdx:n}=function(e,t,a,i){let s=[],n=3;return e.customerStatuses?.length&&(s.push(`cs.status = ANY($${n}::text[])`),a.push(e.customerStatuses),n++),null!=e.minDaysSinceLastVisit&&(s.push('cs."lastVisitAt" IS NOT NULL'),s.push(`EXTRACT(DAY FROM NOW() - cs."lastVisitAt") >= $${n}`),a.push(e.minDaysSinceLastVisit),n++),null!=e.maxDaysSinceLastVisit&&(s.push('cs."lastVisitAt" IS NOT NULL'),s.push(`EXTRACT(DAY FROM NOW() - cs."lastVisitAt") <= $${n}`),a.push(e.maxDaysSinceLastVisit),n++),null!=e.minVisits&&(s.push(`cs.visits >= $${n}`),a.push(e.minVisits),n++),null!=e.maxVisits&&(s.push(`cs.visits <= $${n}`),a.push(e.maxVisits),n++),null!=e.minRevenue&&(s.push(`cs.revenue >= $${n}`),a.push(e.minRevenue),n++),null!=e.maxRevenue&&(s.push(`cs.revenue <= $${n}`),a.push(e.maxRevenue),n++),null!=e.minAverageTicket&&(s.push(`cs.visits > 0 AND (cs.revenue / cs.visits) >= $${n}`),a.push(e.minAverageTicket),n++),e.serviceIds?.length&&(s.push(`EXISTS (
      SELECT 1 FROM "Appointment" ax
      WHERE ax."customerId" = cs.id AND ax.status = 'COMPLETED'
        AND ax."serviceId" = ANY($${n}::text[])
    )`),a.push(e.serviceIds),n++),e.loyaltyLevels?.length&&(s.push(`COALESCE(cs."loyaltyLevel", 'BRONZE') = ANY($${n}::text[])`),a.push(e.loyaltyLevels),n++),!0===e.hasActivePackage&&s.push('cs."hasActivePackage" = true'),!0===e.packageExpiringSoon&&s.push('cs."packageExpiringSoon" = true'),!1!==e.noUpcomingAppointment&&s.push('cs."hasUpcoming" = false'),"WHATSAPP"===t||!0===e.marketingWhatsapp?(s.push('cs."marketingWhatsapp" = true'),s.push("cs.phone IS NOT NULL AND cs.phone <> ''")):!0===e.marketingEmail&&(s.push('cs."marketingEmail" = true'),s.push("cs.email IS NOT NULL AND cs.email <> ''")),{sql:s.length?` AND ${s.join(" AND ")}`:"",nextIdx:n}}(t,a,i,0),{rows:r}=await R.query(`${y}
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
     WHERE 1=1 ${s}
     ORDER BY cs.revenue DESC, cs."lastName"
     LIMIT 500`,i);return r}async function N(e,t,a,i,s){let n=await (0,u.WF)(e),r=!1!==t.excludeRecentMarketing,o=await E(e,t,a),p=[];"WHATSAPP"===a&&p.push("Opt-in WhatsApp"),!1!==t.noUpcomingAppointment&&p.push("Aucun RDV futur"),null!=t.minDaysSinceLastVisit&&p.push(`Derni\xe8re visite > ${t.minDaysSinceLastVisit} jours`),r&&p.push(`Pas de message marketing < ${n.minimumDaysBetweenMarketingMessages} j`);let c=o.map(e=>{let t=d(e,a,n.minimumDaysBetweenMarketingMessages,r);return{id:e.id,firstName:e.firstName,lastName:e.lastName,phone:e.phone,email:e.email,lastVisitAt:e.lastVisitAt?new Date(e.lastVisitAt).toISOString():null,daysSinceLastVisit:e.daysSince,excluded:!!t,excludeReason:t}}),l=c.filter(e=>!e.excluded),m=o.find(e=>!d(e,a,n.minimumDaysBetweenMarketingMessages,r)),N=null,A=null;return m&&(N=await g(e,i,m,s??null),A={id:m.id,name:`${m.firstName} ${m.lastName}`}),{eligibleCount:l.length,excludedCount:c.length-l.length,checks:p,sampleMessage:N,sampleCustomer:A,customers:c.slice(0,50)}}function A(e){return{id:String(e.id),name:String(e.name),channel:e.channel,status:e.status,audienceCount:Number(e.audienceCount)||0,pendingCount:Number(e.pendingCount)||0,sentCount:Number(e.sentCount)||0,promotionId:e.promotionId??null,promotionName:e.promotionName??null,promotionCode:e.promotionCode??null,attributedRevenue:Math.round(100*(parseFloat(String(e.attributedRevenue??"0"))||0))/100,scheduledFor:e.scheduledFor?new Date(e.scheduledFor).toISOString():null,preparedAt:e.preparedAt?new Date(e.preparedAt).toISOString():null,createdAt:new Date(e.createdAt).toISOString()}}async function S(e){let{rows:t}=await R.query(`SELECT
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
      ), 0)::text AS "attributedRevenue"`,[e]),a=t[0];return{activeCampaigns:a?.activeCampaigns??0,draftCampaigns:a?.draftCampaigns??0,pausedCampaigns:a?.pausedCampaigns??0,scheduledCampaigns:a?.scheduledCampaigns??0,totalCampaigns:a?.totalCampaigns??0,targetedCustomers:a?.targetedCustomers??0,pendingMessages:a?.pendingMessages??0,sentMessages:a?.sentMessages??0,attributedRevenue:Math.round(100*(parseFloat(a?.attributedRevenue??"0")||0))/100}}async function C(e){let[t,a]=await Promise.all([R.query(`SELECT c.*,
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
       LIMIT 50`,[e]),S(e)]);return{items:t.rows.map(e=>A(e)),kpis:a}}async function I(e,t,a){let i=l("camp");await R.query(`INSERT INTO "Campaign" (
      id, "organizationId", name, channel, status, "messageTemplate",
      "segmentFilters", "promotionId", "scheduledFor", "createdById", "updatedAt"
    ) VALUES (
      $1,$2,$3,$4::"CampaignChannel",'DRAFT'::"CampaignStatus",$5,$6::jsonb,$7,$8,$9,NOW()
    )`,[i,e,t.name,t.channel,t.messageTemplate,JSON.stringify(t.segmentFilters),t.promotionId??null,t.scheduledFor?new Date(t.scheduledFor):null,a.id]),await (0,o.writeAuditLog)({organizationId:e,entityType:"Campaign",entityId:i,action:"CREATE",actorId:a.id,actorName:a.name});let s=await h(e,i);if(!s)throw Error("Campagne introuvable apr\xe8s cr\xe9ation.");return s}async function h(e,t){let{rows:a}=await R.query(`SELECT c.*,
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
     WHERE c.id = $2 AND c."organizationId" = $1`,[e,t]),i=a[0];return i?{...A(i),messageTemplate:String(i.messageTemplate),segmentFilters:i.segmentFilters??{},skippedCount:Number(i.skippedCount)||0}:null}async function v(e,t,a,i){let s=await h(e,t);if(!s)return null;if("DRAFT"!==s.status&&a.segmentFilters)throw Error("Impossible de modifier l'audience d'une campagne pr\xe9par\xe9e.");let n=['"updatedAt" = NOW()'],r=[e,t],u=3;return void 0!==a.name&&(n.push(`name = $${u}`),r.push(a.name),u++),void 0!==a.status&&(n.push(`status = $${u}::"CampaignStatus"`),r.push(a.status),u++),void 0!==a.messageTemplate&&(n.push(`"messageTemplate" = $${u}`),r.push(a.messageTemplate),u++),void 0!==a.segmentFilters&&(n.push(`"segmentFilters" = $${u}::jsonb`),r.push(JSON.stringify(a.segmentFilters)),u++),void 0!==a.promotionId&&(n.push(`"promotionId" = $${u}`),r.push(a.promotionId),u++),void 0!==a.scheduledFor&&(n.push(`"scheduledFor" = $${u}`),r.push(a.scheduledFor?new Date(a.scheduledFor):null),u++),await R.query(`UPDATE "Campaign" SET ${n.join(", ")} WHERE "organizationId" = $1 AND id = $2`,r),await (0,o.writeAuditLog)({organizationId:e,entityType:"Campaign",entityId:t,action:"UPDATE",actorId:i.id,actorName:i.name,after:a}),h(e,t)}async function T(e,t,a,i,s,n){let r=l("crec"),o=`campaign:${a}:customer:${i.id}`;if("WHATSAPP"===n){let n=l("wtask");await e.query(`INSERT INTO "WhatsAppTask" (
        id, "organizationId", "customerId", "campaignId", type, status,
        "messageSnapshot", "phoneSnapshot", "scheduledFor", "idempotencyKey", "updatedAt"
      ) VALUES (
        $1,$2,$3,$4,'PROMOTION'::"WhatsAppTaskType",'PENDING'::"WhatsAppTaskStatus",
        $5,$6,NOW(),$7,NOW()
      )
      ON CONFLICT ("organizationId", "idempotencyKey") DO NOTHING`,[n,t,i.id,a,s,i.phone,o]);let u=await e.query('SELECT id FROM "WhatsAppTask" WHERE "organizationId" = $1 AND "idempotencyKey" = $2',[t,o]),p=u.rows[0]?.id??n;await e.query(`INSERT INTO "CampaignRecipient" (
        id, "campaignId", "customerId", status, "messageSnapshot",
        "phoneSnapshot", "whatsappTaskId", "updatedAt"
      ) VALUES (
        $1,$2,$3,'PENDING'::"CampaignRecipientStatus",$4,$5,$6,NOW()
      )
      ON CONFLICT ("campaignId", "customerId") DO NOTHING`,[r,a,i.id,s,i.phone,p])}else await e.query(`INSERT INTO "CampaignRecipient" (
        id, "campaignId", "customerId", status, "messageSnapshot",
        "emailSnapshot", "updatedAt"
      ) VALUES (
        $1,$2,$3,'PENDING'::"CampaignRecipientStatus",$4,$5,NOW()
      )
      ON CONFLICT ("campaignId", "customerId") DO NOTHING`,[r,a,i.id,s,i.email])}async function O(e,t,a){let i=await h(e,t);if(!i)throw Error("Campagne introuvable.");if("COMPLETED"===i.status||"CANCELLED"===i.status)throw Error("Campagne termin\xe9e ou annul\xe9e.");let s=await (0,u.WF)(e),n=!1!==i.segmentFilters.excludeRecentMarketing,r=await E(e,i.segmentFilters,i.channel),p=await R.connect(),c=0,l=0;try{for(let a of(await p.query("BEGIN"),r)){if(d(a,i.channel,s.minimumDaysBetweenMarketingMessages,n)){l++;continue}let r=await g(e,i.messageTemplate,a,i.promotionId);await T(p,e,t,a,r,i.channel),c++}let a=await p.query('SELECT COUNT(*)::int AS n FROM "CampaignRecipient" WHERE "campaignId" = $1',[t]),o=a.rows[0]?.n??0;await p.query(`UPDATE "Campaign"
       SET status = CASE WHEN $3 > 0 THEN 'ACTIVE'::"CampaignStatus" ELSE status END,
           "audienceCount" = $3,
           "preparedAt" = CASE WHEN $3 > 0 THEN NOW() ELSE "preparedAt" END,
           "updatedAt" = NOW()
       WHERE id = $1 AND "organizationId" = $2`,[t,e,o]),await p.query("COMMIT")}catch(e){throw await p.query("ROLLBACK"),e}finally{p.release()}return await (0,o.writeAuditLog)({organizationId:e,entityType:"Campaign",entityId:t,action:"PREPARE",actorId:a.id,actorName:a.name,after:{prepared:c,skipped:l}}),{prepared:c,skipped:l}}async function L(e,t){let{rows:a}=await R.query(`SELECT cr.*,
            c."firstName" || ' ' || c."lastName" AS "customerName",
            wt."sentAt"
     FROM "CampaignRecipient" cr
     JOIN "Campaign" camp ON camp.id = cr."campaignId"
     JOIN "Customer" c ON c.id = cr."customerId"
     LEFT JOIN "WhatsAppTask" wt ON wt.id = cr."whatsappTaskId"
     WHERE camp."organizationId" = $1 AND cr."campaignId" = $2
     ORDER BY cr."createdAt" ASC
     LIMIT 500`,[e,t]);return a.map(e=>({id:String(e.id),customerId:String(e.customerId),customerName:String(e.customerName),status:e.status,messageSnapshot:String(e.messageSnapshot),phoneSnapshot:e.phoneSnapshot??null,whatsappTaskId:e.whatsappTaskId??null,sentAt:e.sentAt?new Date(e.sentAt).toISOString():null}))}i()}catch(e){i(e)}})},67487:(e,t,a)=>{a.d(t,{Ey:()=>i,MX:()=>u,Pp:()=>r,T4:()=>o,bZ:()=>s,ff:()=>p,jG:()=>n});let i={name:"Rappel Beauty",version:"V1.2",url:"https://rappelbeauty.com",appUrl:"https://app.rappelbeauty.com",tagline:"Le logiciel de gestion pens\xe9 pour les instituts de beaut\xe9.",email:"contact@rappelbeauty.com",phone:"06 91 56 72 46",phoneInternational:"+212691567246"};function s(){let e="https://rappel-beaute-staging.up.railway.app".replace(/\/$/,""),t=/localhost|127\.0\.0\.1/i.test(e);return e&&!t?e:"staging"===n()?e&&!t?e:"":i.appUrl}function n(){return process.env.APP_ENV?.trim()||(/staging|\.up\.railway\.app/i.test("https://rappel-beaute-staging.up.railway.app")?"staging":"production")}let r={name:"Rappel Beauty",monthlyPrice:599,annualPrice:5990,annualSavings:1198,price:599,yearlyPrice:5990,currency:"MAD",trialDays:15,noCard:!0,noCommitment:!0};function o(e){return e.toLocaleString("fr-FR")}let u=["Casablanca","Rabat","Marrakech","Tanger","F\xe8s","Agadir","Mekn\xe8s","Oujda","T\xe9touan","Autre"],p=[{id:"presentation",category:"general",q:"Qu’est-ce que Rappel Beauty ?",a:"Rappel Beauty est un logiciel de gestion pour les instituts de beaut\xe9 au Maroc. Il r\xe9unit vos rendez-vous, vos clientes, votre \xe9quipe, vos services, vos produits, votre caisse, la fid\xe9lit\xe9 et la r\xe9servation en ligne."},{id:"essai",category:"tarifs",q:"Puis-je tester la plateforme gratuitement ?",a:`Oui. Vous disposez de ${r.trialDays} jours d’essai gratuit, sans carte bancaire et sans obligation de continuer. Vous pouvez d\xe9couvrir le logiciel avec les informations de votre institut.`},{id:"creation-site",category:"site",q:"Est-ce que je peux avoir un site web pour mon institut ?",a:"Oui. Rappel Beauty propose une cr\xe9ation de site web sur devis : site vitrine, site avec r\xe9servation, catalogue de produits ou projet complet. Le design, le contenu et les connexions sont d\xe9finis avec vous.",href:"/creation-site-web/",linkLabel:"D\xe9couvrir la cr\xe9ation de site web"},{id:"reservation-site",category:"site",q:"Le site web peut-il inclure la r\xe9servation en ligne ?",a:"Oui. Votre page de r\xe9servation pr\xe9sente vos services, leurs dur\xe9es et les cr\xe9neaux disponibles selon votre planning. La r\xe9servation rejoint le m\xeame agenda que les rendez-vous pris \xe0 l’accueil.",href:"/reservation-en-ligne/",linkLabel:"D\xe9couvrir la r\xe9servation en ligne"},{id:"vente-produits",category:"produits",q:"Puis-je vendre mes produits en ligne ?",a:"Vous pouvez pr\xe9senter vos produits et permettre des demandes de retrait \xe0 l’institut. Le r\xe8glement se fait actuellement \xe0 l’institut. Pour un site e-commerce avec paiement en ligne, les options sont \xe9tudi\xe9es s\xe9par\xe9ment dans le devis de cr\xe9ation de site."},{id:"donnees",category:"securite",q:"Un autre institut peut-il voir mes donn\xe9es ?",a:"Non. Chaque institut dispose de son propre espace. Les acc\xe8s aux informations sont contr\xf4l\xe9s selon les r\xf4les et les autorisations des utilisateurs."},{id:"prix",category:"tarifs",q:"Combien co\xfbte Rappel Beauty ?",a:`Rappel Beauty co\xfbte ${o(r.monthlyPrice)} DH par mois ou ${o(r.annualPrice)} DH par an. La formule annuelle permet d’\xe9conomiser ${o(r.annualSavings)} DH par rapport \xe0 douze mensualit\xe9s.`,href:"/tarifs/",linkLabel:"Consulter les tarifs"},{id:"engagement",category:"tarifs",q:"Y a-t-il un engagement ?",a:"La formule mensuelle est sans engagement. Vous gardez le contr\xf4le de votre abonnement. Vous pouvez consulter les formules ou contacter notre \xe9quipe pour une question sur votre situation."},{id:"accompagnement",category:"support",q:"Comment se passe l’accompagnement ?",a:"Le support en fran\xe7ais est inclus. Notre \xe9quipe peut r\xe9pondre \xe0 vos questions sur l’utilisation du logiciel et vous aider \xe0 prendre en main votre espace. Pour un site web, les \xe9tapes et l’accompagnement sont pr\xe9cis\xe9s dans le devis.",href:"/contact/",linkLabel:"Contacter notre \xe9quipe"},{id:"agenda",category:"agenda",q:"Comment organiser mes rendez-vous et mes cabines ?",a:"L’agenda affiche les rendez-vous par jour, sur trois jours, par semaine ou par mois. Chaque rendez-vous indique la cliente, le service, la praticienne et, si elle est assign\xe9e, la cabine. Vous pouvez ajuster l’horaire, la prestation et les notes.",href:"/gestion-rendez-vous/",linkLabel:"D\xe9couvrir l’agenda"},{id:"conflits",category:"agenda",q:"Le logiciel \xe9vite-t-il les doubles r\xe9servations ?",a:"Oui. Deux rendez-vous qui se chevauchent pour une m\xeame praticienne ou une m\xeame cabine assign\xe9e ne peuvent pas \xeatre enregistr\xe9s. Les cr\xe9neaux propos\xe9s en ligne tiennent compte du m\xeame planning."},{id:"whatsapp",category:"agenda",q:"Les rappels WhatsApp sont-ils automatiques ?",a:"Non. Le logiciel pr\xe9pare le message, puis une personne de l’institut le relit et l’envoie depuis le num\xe9ro WhatsApp de l’\xe9tablissement. Il n’y a pas d’envoi automatique de rappels WhatsApp, SMS ou e-mail dans ce fonctionnement.",href:"/whatsapp/",linkLabel:"Comprendre WhatsApp assist\xe9"},{id:"attente",category:"agenda",q:"Puis-je g\xe9rer une liste d’attente ?",a:"Oui. Lorsqu’une cliente souhaite un soin sans cr\xe9neau disponible, vous pouvez la suivre dans la liste d’attente. Si une place se lib\xe8re, l’institut peut pr\xe9parer un message WhatsApp et l’envoyer lui-m\xeame."},{id:"fiches-clientes",category:"clientes",q:"Quelles informations retrouve-t-on dans une fiche cliente ?",a:"La fiche regroupe les coordonn\xe9es, l’historique des rendez-vous et des soins, ainsi que les notes utiles au suivi de la cliente. Les fiches sont textuelles, sans photo cliente en V1.",href:"/gestion-clientes/",linkLabel:"D\xe9couvrir la gestion des clientes"},{id:"fidelite",category:"clientes",q:"Comment fonctionne la fid\xe9lit\xe9 ?",a:"Le programme de fid\xe9lit\xe9 suit les paiements enregistr\xe9s. Les points, forfaits et cartes cadeaux vous aident \xe0 suivre la relation avec vos clientes. Un rendez-vous annul\xe9 ou une absence ne cr\xe9e pas de points sans r\xe8glement.",href:"/fidelite/",linkLabel:"D\xe9couvrir la fid\xe9lit\xe9"},{id:"stock",category:"produits",q:"Puis-je suivre mon stock et mes achats ?",a:"Oui. Vous pouvez g\xe9rer les produits, les quantit\xe9s, les mouvements de stock, les achats et les fournisseurs, y compris les produits consomm\xe9s pendant les soins.",href:"/gestion-stock/",linkLabel:"D\xe9couvrir la gestion du stock"},{id:"paiement-clientes",category:"produits",q:"O\xf9 les clientes paient-elles leurs prestations et leurs produits ?",a:"Les clientes r\xe8glent directement \xe0 l’institut. Les paiements au comptoir peuvent \xeatre enregistr\xe9s en esp\xe8ces, par carte, virement, ch\xe8que ou carte cadeau. Rappel Beauty n’encaisse pas les prestations \xe0 la place de l’institut."},{id:"marketplace",category:"site",q:"Rappel Beauty est-il une marketplace ?",a:"Non. Chaque institut dispose de son propre espace de gestion et peut publier sa propre page de r\xe9servation. Vos clientes r\xe9servent aupr\xe8s de vous, pas dans un catalogue qui m\xe9lange plusieurs salons."},{id:"installation",category:"support",q:"Faut-il installer une application ?",a:"Non. Rappel Beauty fonctionne dans votre navigateur, sur ordinateur, tablette ou smartphone. Une connexion Internet suffit pour acc\xe9der \xe0 votre espace."},{id:"equipe",category:"support",q:"Combien d’utilisateurs sont inclus ?",a:"La formule est con\xe7ue pour votre \xe9quipe, sans frais suppl\xe9mentaires par praticienne. Vous pouvez attribuer des r\xf4les et des autorisations adapt\xe9s aux personnes qui utilisent le logiciel."},{id:"formule",category:"tarifs",q:"Que comprend la formule ?",a:"La formule donne acc\xe8s aux fonctionnalit\xe9s de gestion de Rappel Beauty : rendez-vous, clientes, \xe9quipe, services, stock, caisse, fid\xe9lit\xe9, r\xe9servation en ligne et outils de pilotage. La cr\xe9ation d’un site web fait l’objet d’un devis d\xe9taill\xe9."},{id:"carte-bancaire",category:"tarifs",q:"Faut-il une carte bancaire pour essayer ?",a:`Non. L’essai gratuit de ${r.trialDays} jours ne n\xe9cessite pas de carte bancaire.`},{id:"maroc",category:"general",q:"Rappel Beauty est-il adapt\xe9 aux instituts au Maroc ?",a:"Oui. Les prix et la caisse sont en dirhams, les clientes r\xe8glent directement \xe0 l’institut et chaque \xe9tablissement peut disposer de sa propre page publique de r\xe9servation."},{id:"site-devis",category:"site",q:"Comment demander un devis pour la cr\xe9ation de mon site ?",a:"Sur la page Cr\xe9ation de site web, choisissez un type de projet et d\xe9crivez vos besoins. Le formulaire pr\xe9pare un e-mail dans votre messagerie : vous le relisez et l’envoyez \xe0 notre \xe9quipe. Le devis pr\xe9cise les pages, les connexions, l’h\xe9bergement et l’accompagnement.",href:"/creation-site-web/#devis",linkLabel:"Pr\xe9parer une demande de devis"},{id:"photos",category:"securite",q:"Les photos des clientes sont-elles utilis\xe9es ?",a:"Non. Aucune photo cliente n’est utilis\xe9e dans les fiches en V1. Les informations de suivi restent textuelles."},{id:"autorisations",category:"securite",q:"Puis-je limiter les acc\xe8s de mon \xe9quipe ?",a:"Oui. Les r\xf4les et autorisations permettent d’adapter les acc\xe8s \xe0 chaque utilisateur de votre institut, selon ses responsabilit\xe9s."}]}};