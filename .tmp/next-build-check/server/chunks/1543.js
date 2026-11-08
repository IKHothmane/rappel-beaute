"use strict";exports.id=1543,exports.ids=[1543],exports.modules={49303:(e,t,a)=>{e.exports=a(30517)},82503:(e,t,a)=>{a.a(e,async(e,n)=>{try{a.d(t,{Xj:()=>o,_V:()=>c,kF:()=>d,s3:()=>u});var i=a(87070),r=a(33568),s=e([r]);function o(e,t=200){return i.NextResponse.json(e,{status:t,headers:{"Cache-Control":"private, no-store"}})}function c(e,t){return i.NextResponse.json({error:e},{status:t})}function d(e){return(0,r.ZX)(e)}function u(e){let t=d(e);return t.ok&&t.session?.role!=="SUPER_ADMIN"?{ok:!1,response:c("R\xe9serv\xe9 au super administrateur.",403)}:t}r=(s.then?(await s)():s)[0],n()}catch(e){n(e)}})},51161:(e,t,a)=>{a.a(e,async(e,n)=>{try{a.d(t,{_:()=>o,g:()=>c});var i=a(84770),r=a(8678),s=e([r]);let d=new(r=(s.then?(await s)():s)[0]).Pool({connectionString:process.env.DATABASE_URL});async function o(e){let t=e.client??d;await t.query(`INSERT INTO "PlatformAuditLog" (
      id, "platformUserId", "platformUserName", "organizationId",
      "entityType", "entityId", action, "before", "after"
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9::jsonb)`,[`paud_${(0,i.randomBytes)(8).toString("hex")}`,e.platformUserId??null,e.platformUserName??null,e.organizationId??null,e.entityType,e.entityId,e.action,null!=e.before?JSON.stringify(e.before):null,null!=e.after?JSON.stringify(e.after):null])}async function c(e){let t=Math.min(e.limit??50,200),a=[],n=[];e.organizationId&&(a.push(e.organizationId),n.push(`a."organizationId" = $${a.length}`)),e.entityType&&(a.push(e.entityType),n.push(`a."entityType" = $${a.length}`)),e.entityId&&(a.push(e.entityId),n.push(`a."entityId" = $${a.length}`));let i=n.length?`WHERE ${n.join(" AND ")}`:"";a.push(t);let{rows:r}=await d.query(`SELECT a.id, a."platformUserName", a."organizationId", o.name AS "organizationName",
            a."entityType", a."entityId", a.action, a."before", a."after", a."createdAt"
     FROM "PlatformAuditLog" a
     LEFT JOIN "Organization" o ON o.id = a."organizationId"
     ${i}
     ORDER BY a."createdAt" DESC
     LIMIT $${a.length}`,a);return r.map(e=>({id:e.id,platformUserName:e.platformUserName,organizationId:e.organizationId,organizationName:e.organizationName,entityType:e.entityType,entityId:e.entityId,action:e.action,before:e.before,after:e.after,createdAt:e.createdAt.toISOString()}))}n()}catch(e){n(e)}})},49961:(e,t,a)=>{a.a(e,async(e,n)=>{try{a.d(t,{SU:()=>d,T6:()=>c,sm:()=>o});var i=a(69310),r=a(47365),s=e([r]);async function o(e){await (0,i.WW)(e,"PAUSED"),await (0,r.cn)(e,"PAUSED")}async function c(e){await (0,i.WW)(e,"ACTIVE"),await (0,r.cn)(e,"ACTIVE")}async function d(e){if(!e.budgetResourceName)throw Error("Budget journalier Meta introuvable pour cette campagne.");await (0,i.AU)(e.budgetResourceName,e.nextBudgetDh),await (0,r.ON)(e.externalId,e.nextBudgetDh)}r=(s.then?(await s)():s)[0],n()}catch(e){n(e)}})},18521:(e,t,a)=>{a.a(e,async(e,n)=>{try{a.d(t,{C:()=>o});var i=a(51161),r=a(47365),s=e([i,r]);async function o(e){await (0,r.ZI)({campaignId:e.campaignId,kind:e.kind,summary:e.summary,reason:e.reason,executed:e.executed,blocked:e.blocked,metrics:e.metrics}),await (0,i._)({platformUserId:e.platformUserId,platformUserName:e.platformUserName,entityType:"ADS_AGENT",entityId:e.externalId||e.campaignId||"account",action:e.executed?e.kind:`ADS_${e.kind}_HELD`,after:{summary:e.summary,reason:e.reason,executed:e.executed,blocked:e.blocked}})}[i,r]=s.then?(await s)():s,n()}catch(e){n(e)}})},47365:(e,t,a)=>{a.a(e,async(e,n)=>{try{a.d(t,{Ay:()=>c,ON:()=>p,Qi:()=>d,Vy:()=>E,ZI:()=>g,cT:()=>h,cn:()=>m,nl:()=>u,uv:()=>l});var i=a(84770),r=a(8678),s=e([r]);let C=new(r=(s.then?(await s)():s)[0]).Pool({connectionString:process.env.DATABASE_URL});function o(e){return`${e}_${(0,i.randomBytes)(8).toString("hex")}`}let S={agentEnabled:!1,mode:"OBSERVE",maxDailyBudgetDh:100,maxMonthlyBudgetDh:3e3,maxIncreasePercent:20,maxDecreasePercent:30,maxCostPerSignupDh:80,watchSpend:!0,watchConversions:!0,pauseOnBudget:!0,pauseOnHighCost:!0,reactivateWhenOk:!0,optimizeBudget:!1,autoPause:!0,autoReactivate:!0,allowCreateCampaign:!1,allowIncreaseOverCap:!1,allowBidChanges:!1};async function c(){let e=(await C.query("SELECT * FROM \"AdsAgentConfig\" WHERE id = 'default'")).rows[0];return e?{agentEnabled:!!e.agentEnabled,mode:e.mode,maxDailyBudgetDh:y(e.maxDailyBudgetDh),maxMonthlyBudgetDh:y(e.maxMonthlyBudgetDh),maxIncreasePercent:Number(e.maxIncreasePercent),maxDecreasePercent:Number(e.maxDecreasePercent),maxCostPerSignupDh:y(e.maxCostPerSignupDh),watchSpend:!!e.watchSpend,watchConversions:!!e.watchConversions,pauseOnBudget:!!e.pauseOnBudget,pauseOnHighCost:!!e.pauseOnHighCost,reactivateWhenOk:!!e.reactivateWhenOk,optimizeBudget:!!e.optimizeBudget,autoPause:!!e.autoPause,autoReactivate:!!e.autoReactivate,allowCreateCampaign:!!e.allowCreateCampaign,allowIncreaseOverCap:!!e.allowIncreaseOverCap,allowBidChanges:!!e.allowBidChanges}:S}async function d(e){let t={...await c(),...e};return await C.query(`INSERT INTO "AdsAgentConfig" (
      id, "agentEnabled", mode, "maxDailyBudgetDh", "maxMonthlyBudgetDh",
      "maxIncreasePercent", "maxDecreasePercent", "maxCostPerSignupDh",
      "watchSpend", "watchConversions", "pauseOnBudget", "pauseOnHighCost",
      "reactivateWhenOk", "optimizeBudget", "autoPause", "autoReactivate",
      "allowCreateCampaign", "allowIncreaseOverCap", "allowBidChanges", "updatedAt"
    ) VALUES (
      'default', $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
      "agentEnabled" = EXCLUDED."agentEnabled",
      mode = EXCLUDED.mode,
      "maxDailyBudgetDh" = EXCLUDED."maxDailyBudgetDh",
      "maxMonthlyBudgetDh" = EXCLUDED."maxMonthlyBudgetDh",
      "maxIncreasePercent" = EXCLUDED."maxIncreasePercent",
      "maxDecreasePercent" = EXCLUDED."maxDecreasePercent",
      "maxCostPerSignupDh" = EXCLUDED."maxCostPerSignupDh",
      "watchSpend" = EXCLUDED."watchSpend",
      "watchConversions" = EXCLUDED."watchConversions",
      "pauseOnBudget" = EXCLUDED."pauseOnBudget",
      "pauseOnHighCost" = EXCLUDED."pauseOnHighCost",
      "reactivateWhenOk" = EXCLUDED."reactivateWhenOk",
      "optimizeBudget" = EXCLUDED."optimizeBudget",
      "autoPause" = EXCLUDED."autoPause",
      "autoReactivate" = EXCLUDED."autoReactivate",
      "allowCreateCampaign" = EXCLUDED."allowCreateCampaign",
      "allowIncreaseOverCap" = EXCLUDED."allowIncreaseOverCap",
      "allowBidChanges" = EXCLUDED."allowBidChanges",
      "updatedAt" = NOW()`,[t.agentEnabled,t.mode,t.maxDailyBudgetDh,t.maxMonthlyBudgetDh,t.maxIncreasePercent,t.maxDecreasePercent,t.maxCostPerSignupDh,t.watchSpend,t.watchConversions,t.pauseOnBudget,t.pauseOnHighCost,t.reactivateWhenOk,t.optimizeBudget,t.autoPause,t.autoReactivate,t.allowCreateCampaign,t.allowIncreaseOverCap,t.allowBidChanges]),t}async function u(){return(await C.query('SELECT * FROM "AdsCampaignSnapshot" ORDER BY name ASC')).rows.map(D)}async function l(e){let t=await C.query(`INSERT INTO "AdsCampaignSnapshot" (
      id, "externalId", name, status, "budgetResourceName", "dailyBudgetDh",
      "todaySpendDh", "monthSpendDh", clicks, impressions, "cpcDh", ctr,
      "googleConversions", "syncedAt", "updatedAt"
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,NOW(),NOW())
    ON CONFLICT ("externalId") DO UPDATE SET
      name = EXCLUDED.name,
      status = EXCLUDED.status,
      "budgetResourceName" = EXCLUDED."budgetResourceName",
      "dailyBudgetDh" = EXCLUDED."dailyBudgetDh",
      "todaySpendDh" = EXCLUDED."todaySpendDh",
      "monthSpendDh" = EXCLUDED."monthSpendDh",
      clicks = EXCLUDED.clicks,
      impressions = EXCLUDED.impressions,
      "cpcDh" = EXCLUDED."cpcDh",
      ctr = EXCLUDED.ctr,
      "googleConversions" = EXCLUDED."googleConversions",
      "syncedAt" = NOW(),
      "updatedAt" = NOW()
    RETURNING *`,[o("adsc"),e.externalId,e.name,e.status,e.budgetResourceName,e.dailyBudgetDh,e.todaySpendDh,e.monthSpendDh,e.clicks,e.impressions,e.cpcDh,e.ctr,e.googleConversions]);return D(t.rows[0])}async function m(e,t){await C.query('UPDATE "AdsCampaignSnapshot" SET status = $2, "updatedAt" = NOW() WHERE "externalId" = $1',[e,t])}async function p(e,t){await C.query('UPDATE "AdsCampaignSnapshot" SET "dailyBudgetDh" = $2, "updatedAt" = NOW() WHERE "externalId" = $1',[e,t])}async function g(e){await C.query(`INSERT INTO "AdsAgentDecision" (
      id, "campaignId", kind, summary, reason, executed, blocked, metrics
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb)`,[o("adsd"),e.campaignId,e.kind,e.summary,e.reason,e.executed,e.blocked,null!=e.metrics?JSON.stringify(e.metrics):null])}async function E(e=40){return(await C.query(`SELECT d.*, c.name AS "campaignName"
     FROM "AdsAgentDecision" d
     LEFT JOIN "AdsCampaignSnapshot" c ON c.id = d."campaignId"
     ORDER BY d."createdAt" DESC
     LIMIT $1`,[Math.min(e,100)])).rows.map(e=>({id:String(e.id),campaignId:e.campaignId?String(e.campaignId):null,campaignName:e.campaignName?String(e.campaignName):null,kind:e.kind,summary:String(e.summary),reason:String(e.reason),executed:!!e.executed,blocked:!!e.blocked,createdAt:new Date(e.createdAt).toISOString(),metrics:e.metrics&&"object"==typeof e.metrics?e.metrics:null}))}async function h(){let e=(await C.query(`
    SELECT
      (SELECT COUNT(*)::int FROM "Organization"
        WHERE "createdAt" >= date_trunc('day', NOW() AT TIME ZONE 'Africa/Casablanca') AT TIME ZONE 'Africa/Casablanca') AS "signupsToday",
      (SELECT COUNT(*)::int FROM "Organization"
        WHERE "createdAt" >= date_trunc('month', NOW() AT TIME ZONE 'Africa/Casablanca') AT TIME ZONE 'Africa/Casablanca') AS "signupsMonth",
      (SELECT COUNT(*)::int FROM "Subscription" WHERE status = 'TRIAL') AS "activeTrials",
      (SELECT COUNT(*)::int FROM "Subscription" WHERE status = 'ACTIVE' AND paid = true) AS "subscriptions"
  `)).rows[0]??{};return{signupsToday:Number(e.signupsToday??0),signupsMonth:Number(e.signupsMonth??0),activeTrials:Number(e.activeTrials??0),subscriptions:Number(e.subscriptions??0)}}function D(e){return{id:String(e.id),externalId:String(e.externalId),name:String(e.name),status:e.status,budgetResourceName:e.budgetResourceName?String(e.budgetResourceName):null,dailyBudgetDh:y(e.dailyBudgetDh),todaySpendDh:y(e.todaySpendDh),monthSpendDh:y(e.monthSpendDh),clicks:Number(e.clicks??0),impressions:Number(e.impressions??0),cpcDh:y(e.cpcDh),ctr:y(e.ctr),googleConversions:y(e.googleConversions),syncedAt:e.syncedAt?new Date(String(e.syncedAt)).toISOString():null}}function y(e){return Number(e??0)}n()}catch(e){n(e)}})},69310:(e,t,a)=>{function n(){let e=process.env.META_ADS_ACCESS_TOKEN?.trim()??"",t=(process.env.META_AD_ACCOUNT_ID??"").replace(/^act_/i,"").replace(/\D/g,"");return{accessToken:e,accountId:t,writesEnabled:"true"===process.env.META_ADS_WRITES_ENABLED,connected:!!(e&&t)}}async function i(){let e=n();if(!e.connected)throw Error("Meta Ads n'est pas connect\xe9.");let t=await d(e,`act_${e.accountId}/campaigns`,{fields:"id,name,status,daily_budget",limit:"100"}),a=[];for(let n of t.data??[]){var i;if(!n.id)continue;let[t,r]=await Promise.all([c(e,n.id,"today"),c(e,n.id,"this_month")]);a.push({externalId:n.id,name:n.name?.trim()||"Campagne Meta",status:"ACTIVE"===(i=n.status)?"ACTIVE":"PAUSED"===i?"PAUSED":"UNKNOWN",budgetResourceName:n.daily_budget?n.id:null,dailyBudgetDh:function(e){let t=Number(e??0);return!Number.isFinite(t)||t<=0?0:Math.round(t)/100}(n.daily_budget),todaySpendDh:u(t?.spend),monthSpendDh:u(r?.spend),clicks:l(t?.clicks),impressions:l(t?.impressions),cpcDh:u(t?.cpc),ctr:u(t?.ctr),googleConversions:function(e){if(!e?.actions)return 0;let t=e.actions.reduce((e,t)=>{let a=t.action_type??"";return/lead|complete_registration|subscribe/i.test(a)?e+Number(t.value??0):e},0);return Number.isFinite(t)?Math.round(100*t)/100:0}(t)})}return a}async function r(e,t){let a=o(n());await d(a,e,{status:t},"POST")}async function s(e,t){let a=o(n()),i=String(Math.round(100*t));await d(a,e,{daily_budget:i},"POST")}function o(e){if(!e.connected)throw Error("Meta Ads n'est pas connect\xe9.");if(!e.writesEnabled)throw Error("Les \xe9critures Meta Ads restent d\xe9sactiv\xe9es tant que les chiffres r\xe9els ne sont pas valid\xe9s.");return e}async function c(e,t,a){let n=await d(e,`${t}/insights`,{date_preset:a,fields:"spend,impressions,clicks,cpc,ctr,actions"});return n.data?.[0]??null}async function d(e,t,a,n="GET"){let i=new URL(`https://graph.facebook.com/v21.0/${t}`),r={method:n};if("GET"===n)for(let[t,n]of(i.searchParams.set("access_token",e.accessToken),Object.entries(a)))i.searchParams.set(t,n);else r.headers={"Content-Type":"application/x-www-form-urlencoded"},r.body=new URLSearchParams({access_token:e.accessToken,...a}).toString();let s=await fetch(i,r),o=await s.json();if(!s.ok||o.error)throw Error(o.error?.message||"Lecture Meta Ads impossible.");return o}function u(e){let t=Number(e??0);return Number.isFinite(t)?Math.round(100*t)/100:0}function l(e){let t=Number(e??0);return Number.isFinite(t)?Math.round(t):0}a.d(t,{AU:()=>s,Mk:()=>i,WW:()=>r,yB:()=>n})}};