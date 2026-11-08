"use strict";exports.id=9103,exports.ids=[9103],exports.modules={69103:(t,e,a)=>{a.a(t,async(t,s)=>{try{a.d(e,{AB:()=>E,Gf:()=>c,Nw:()=>L,Qf:()=>R,Z6:()=>l,_z:()=>$,jK:()=>D,yK:()=>C});var i=a(84770),r=a(79549),n=a(51381),o=t([r]);function d(t){return`${t}_${(0,i.randomBytes)(8).toString("hex")}`}async function E(t){await r.pool.query(`UPDATE "Staff" st
     SET status = 'ACTIVE', "updatedAt" = NOW()
     WHERE st."organizationId" = $1
       AND st.status = 'ON_LEAVE'
       AND st."deletedAt" IS NULL
       AND NOT EXISTS (
         SELECT 1
         FROM "StaffLeave" l
         WHERE l."staffId" = st.id
           AND l.status = 'APPROVED'
           AND l."startAt" <= NOW()
           AND l."endAt" >= NOW()
       )`,[t]),await r.pool.query(`UPDATE "Staff" st
     SET status = 'ON_LEAVE', "updatedAt" = NOW()
     WHERE st."organizationId" = $1
       AND st.status = 'ACTIVE'
       AND st."deletedAt" IS NULL
       AND EXISTS (
         SELECT 1
         FROM "StaffLeave" l
         WHERE l."staffId" = st.id
           AND l.status = 'APPROVED'
           AND l."startAt" <= NOW()
           AND l."endAt" >= NOW()
       )`,[t])}function u(t,e,a){let s=t+e+a;return 0===s?null:Math.round(10*Math.max(5,Math.min(10,10-e/s*3-a/s*1)))/10}function f(t){let e=parseInt(t.appointmentCount,10)||0,a=parseInt(t.completedCount,10)||0,s=parseInt(t.noShowCount,10)||0,i=parseInt(t.cancelledCount,10)||0,r=parseFloat(t.revenue)||0;return{id:t.id,firstName:t.firstName,lastName:t.lastName,displayName:(0,n.$B)(t.firstName,t.lastName),phone:t.phone,email:t.email,position:t.position,status:t.status,hireDate:t.hireDate?.toISOString()??null,appointmentCount:e,revenue:r,rating:u(a,s,i),serviceNames:t.serviceNames??[],serviceIds:t.serviceIds??[]}}async function l(t,e){let{page:a,limit:s,search:i,status:o,serviceId:d,agenda:u}=e;await E(t);let l=['st."organizationId" = $1','st."deletedAt" IS NULL'],p=[t],c=2;i&&(l.push(`(st."firstName" ILIKE $${c} OR st."lastName" ILIKE $${c} OR COALESCE(st.phone, '') ILIKE $${c} OR COALESCE(st.email, '') ILIKE $${c} OR COALESCE(st.position, '') ILIKE $${c})`),p.push(`%${i}%`),c++),o&&(l.push(`st.status = $${c}`),p.push(o),c++),d&&(l.push(`EXISTS (SELECT 1 FROM "ServiceStaff" ss2 WHERE ss2."staffId" = st.id AND ss2."serviceId" = $${c})`),p.push(d),c++);let m=l.join(" AND ");if(u){let{rows:e}=await r.pool.query(`SELECT st.id, st."firstName", st."lastName", st.status
       FROM "Staff" st
       WHERE ${m} AND st.status IN ('ACTIVE', 'ON_LEAVE')
       ORDER BY st."firstName", st."lastName"`,p),a=[];for(let s of e){let[e,i,r,o,d,E]=await Promise.all([N(s.id),S(s.id),A(s.id,t),I(s.id,t),O(s.id,t),T(s.id,t)]);a.push({id:s.id,firstName:s.firstName,lastName:s.lastName,displayName:(0,n.$B)(s.firstName,s.lastName),status:s.status,schedules:e,breaks:i,leaves:r.filter(t=>"APPROVED"===t.status),overtimes:o,replacementsAsAbsent:d,replacementsAsSubstitute:E})}return{items:a,total:a.length}}let D=`SELECT COUNT(DISTINCT st.id)::int AS total FROM "Staff" st WHERE ${m}`,R=`
    SELECT
      st.id,
      st."firstName",
      st."lastName",
      st.phone,
      st.email,
      st.position,
      st.status,
      st."hireDate",
      st.notes,
      st."createdAt",
      st."updatedAt",
      COUNT(DISTINCT a.id)::text AS "appointmentCount",
      COUNT(DISTINCT a.id) FILTER (WHERE a.status = 'COMPLETED')::text AS "completedCount",
      COUNT(DISTINCT a.id) FILTER (WHERE a.status = 'CANCELLED')::text AS "cancelledCount",
      COUNT(DISTINCT a.id) FILTER (WHERE a.status = 'NO_SHOW')::text AS "noShowCount",
      COALESCE(SUM(a.price) FILTER (WHERE a.status = 'COMPLETED'), 0)::text AS revenue,
      COALESCE(array_agg(DISTINCT s.name) FILTER (WHERE s.name IS NOT NULL), '{}') AS "serviceNames",
      COALESCE(array_agg(DISTINCT s.id) FILTER (WHERE s.id IS NOT NULL), '{}') AS "serviceIds"
    FROM "Staff" st
    LEFT JOIN "Appointment" a ON a."staffId" = st.id
    LEFT JOIN "ServiceStaff" ss ON ss."staffId" = st.id
    LEFT JOIN "Service" s ON s.id = ss."serviceId"
    WHERE ${m}
    GROUP BY st.id
    ORDER BY st.status = 'ACTIVE' DESC, st."firstName", st."lastName"
    LIMIT $${c} OFFSET $${c+1}
  `,[C,L]=await Promise.all([r.pool.query(D,p),r.pool.query(R,[...p,s,(a-1)*s])]);return{items:L.rows.map(f),total:C.rows[0]?.total??0}}async function N(t){let{rows:e}=await r.pool.query(`SELECT id, "dayOfWeek", "startTime", "endTime", active
     FROM "StaffSchedule" WHERE "staffId" = $1 ORDER BY "dayOfWeek"`,[t]);return e.map(t=>({id:t.id,dayOfWeek:t.dayOfWeek,startTime:t.startTime,endTime:t.endTime,active:t.active}))}async function S(t){let{rows:e}=await r.pool.query(`SELECT id, "dayOfWeek", "startTime", "endTime"
     FROM "StaffBreak" WHERE "staffId" = $1 ORDER BY "dayOfWeek", "startTime"`,[t]);return e.map(t=>({id:t.id,dayOfWeek:t.dayOfWeek,startTime:t.startTime,endTime:t.endTime}))}async function A(t,e){let{rows:a}=await r.pool.query(`SELECT l.id, l."startAt", l."endAt", l.type::text, l.reason, l.status::text, l."createdAt"
     FROM "StaffLeave" l
     JOIN "Staff" st ON st.id = l."staffId"
     WHERE l."staffId" = $1 AND st."organizationId" = $2
     ORDER BY l."startAt" DESC`,[t,e]);return a.map(t=>({id:t.id,startAt:t.startAt.toISOString(),endAt:t.endAt.toISOString(),type:t.type,reason:t.reason,status:t.status,createdAt:t.createdAt.toISOString()}))}async function I(t,e){let a=new Date;a.setDate(a.getDate()-7);let s=new Date;s.setDate(s.getDate()+90);let{rows:i}=await r.pool.query(`SELECT id, "startAt", "endAt", reason FROM "StaffOvertime"
     WHERE "staffId" = $1 AND "organizationId" = $2
       AND "endAt" >= $3 AND "startAt" <= $4
     ORDER BY "startAt"`,[t,e,a,s]);return i.map(t=>({id:t.id,startAt:t.startAt.toISOString(),endAt:t.endAt.toISOString(),reason:t.reason}))}async function O(t,e){let a=new Date;a.setDate(a.getDate()-7);let s=new Date;s.setDate(s.getDate()+90);let{rows:i}=await r.pool.query(`SELECT r.id, r."startAt", r."endAt", r."substituteStaffId",
            CONCAT(s."firstName", ' ', s."lastName") AS "substituteName"
     FROM "StaffReplacement" r
     JOIN "Staff" s ON s.id = r."substituteStaffId"
     WHERE r."absentStaffId" = $1 AND r."organizationId" = $2 AND r.active = true
       AND r."endAt" >= $3 AND r."startAt" <= $4
     ORDER BY r."startAt"`,[t,e,a,s]);return i.map(t=>({id:t.id,startAt:t.startAt.toISOString(),endAt:t.endAt.toISOString(),substituteStaffId:t.substituteStaffId,substituteName:t.substituteName.trim()}))}async function T(t,e){let a=new Date;a.setDate(a.getDate()-7);let s=new Date;s.setDate(s.getDate()+90);let{rows:i}=await r.pool.query(`SELECT r.id, r."startAt", r."endAt", r."absentStaffId",
            CONCAT(a."firstName", ' ', a."lastName") AS "absentName"
     FROM "StaffReplacement" r
     JOIN "Staff" a ON a.id = r."absentStaffId"
     WHERE r."substituteStaffId" = $1 AND r."organizationId" = $2 AND r.active = true
       AND r."endAt" >= $3 AND r."startAt" <= $4
     ORDER BY r."startAt"`,[t,e,a,s]);return i.map(t=>({id:t.id,startAt:t.startAt.toISOString(),endAt:t.endAt.toISOString(),absentStaffId:t.absentStaffId,absentName:t.absentName.trim()}))}async function p(t){let{rows:e}=await r.pool.query(`SELECT
      COUNT(*)::text AS "appointmentCount",
      COUNT(*) FILTER (WHERE status = 'COMPLETED')::text AS "completedCount",
      COUNT(*) FILTER (WHERE status = 'CANCELLED')::text AS "cancelledCount",
      COUNT(*) FILTER (WHERE status = 'NO_SHOW')::text AS "noShowCount",
      COALESCE(SUM(price) FILTER (WHERE status = 'COMPLETED'), 0)::text AS revenue
     FROM "Appointment" WHERE "staffId" = $1`,[t]),a=await r.pool.query(`SELECT to_char("startAt", 'YYYY-MM') AS month,
            COALESCE(SUM(price), 0)::text AS revenue
     FROM "Appointment"
     WHERE "staffId" = $1 AND status = 'COMPLETED'
       AND "startAt" >= NOW() - INTERVAL '6 months'
     GROUP BY 1 ORDER BY 1`,[t]),s=parseInt(e[0]?.completedCount??"0",10),i=parseInt(e[0]?.noShowCount??"0",10),n=parseInt(e[0]?.cancelledCount??"0",10),o=parseFloat(e[0]?.revenue??"0")||0;return{appointmentCount:parseInt(e[0]?.appointmentCount??"0",10),completedCount:s,cancelledCount:n,noShowCount:i,revenue:o,averageTicket:s>0?Math.round(o/s*100)/100:0,rating:u(s,i,n),monthlyRevenue:a.rows.map(t=>({month:t.month,revenue:parseFloat(t.revenue)||0}))}}async function c(t,e){let{rows:a}=await r.pool.query(`SELECT
      st.id, st."firstName", st."lastName", st.phone, st.email, st.position,
      st.status, st."hireDate", st.notes, st."createdAt", st."updatedAt",
      COUNT(DISTINCT a.id)::text AS "appointmentCount",
      COUNT(DISTINCT a.id) FILTER (WHERE a.status = 'COMPLETED')::text AS "completedCount",
      COUNT(DISTINCT a.id) FILTER (WHERE a.status = 'CANCELLED')::text AS "cancelledCount",
      COUNT(DISTINCT a.id) FILTER (WHERE a.status = 'NO_SHOW')::text AS "noShowCount",
      COALESCE(SUM(a.price) FILTER (WHERE a.status = 'COMPLETED'), 0)::text AS revenue,
      COALESCE(array_agg(DISTINCT s.name) FILTER (WHERE s.name IS NOT NULL), '{}') AS "serviceNames",
      COALESCE(array_agg(DISTINCT s.id) FILTER (WHERE s.id IS NOT NULL), '{}') AS "serviceIds"
    FROM "Staff" st
    LEFT JOIN "Appointment" a ON a."staffId" = st.id
    LEFT JOIN "ServiceStaff" ss ON ss."staffId" = st.id
    LEFT JOIN "Service" s ON s.id = ss."serviceId"
    WHERE st.id = $1 AND st."organizationId" = $2 AND st."deletedAt" IS NULL
    GROUP BY st.id`,[e,t]);if(!a[0])return null;let s=f(a[0]),[i,n,o,d,E,u]=await Promise.all([N(e),S(e),A(e,t),r.pool.query(`SELECT s.id AS "serviceId", s.name AS "serviceName", s.category, s.active
       FROM "ServiceStaff" ss JOIN "Service" s ON s.id = ss."serviceId"
       WHERE ss."staffId" = $1 ORDER BY s.name`,[e]),r.pool.query(`SELECT sc.id, sc."serviceId", s.name AS "serviceName", sc.type::text,
              sc.percentage::text, sc."fixedAmount"::text
       FROM "ServiceCommission" sc
       JOIN "Service" s ON s.id = sc."serviceId"
       WHERE sc."staffId" = $1 ORDER BY s.name`,[e]),p(e)]);return{...s,notes:a[0].notes,schedules:i,breaks:n,leaves:o,services:d.rows.map(t=>({serviceId:t.serviceId,serviceName:t.serviceName,category:t.category,active:t.active})),commissions:E.rows.map(t=>({id:t.id,serviceId:t.serviceId,serviceName:t.serviceName,type:t.type,percentage:null!=t.percentage?parseFloat(t.percentage):null,fixedAmount:null!=t.fixedAmount?parseFloat(t.fixedAmount):null})),performance:u,createdAt:a[0].createdAt.toISOString(),updatedAt:a[0].updatedAt.toISOString()}}async function m(t,e,a){for(let s of(await r.pool.query('DELETE FROM "ServiceStaff" WHERE "staffId" = $1',[t]),e))await r.pool.query(`INSERT INTO "ServiceStaff" ("serviceId", "staffId")
       SELECT s.id, $2 FROM "Service" s
       WHERE s.id = $1 AND s."organizationId" = $3
       ON CONFLICT DO NOTHING`,[s,t,a])}async function D(t,e){let a=d("emp");await r.pool.query(`INSERT INTO "Staff" (
      id, "organizationId", "firstName", "lastName", phone, email, position,
      status, "hireDate", notes, "updatedAt"
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,NOW())`,[a,t,e.firstName,e.lastName??"",e.phone??null,e.email??null,e.position??null,e.status??"ACTIVE",e.hireDate?new Date(e.hireDate):null,e.notes??null]),e.serviceIds&&await m(a,e.serviceIds,t);let s=await c(t,a);if(!s)throw Error("Staff introuvable apr\xe8s cr\xe9ation.");return s}async function R(t,e,a){let s=[],i=[],n=1,o=(t,e)=>{s.push(`"${t}" = $${n}`),i.push(e),n++};void 0!==a.firstName&&o("firstName",a.firstName),void 0!==a.lastName&&o("lastName",a.lastName),void 0!==a.phone&&o("phone",a.phone??null),void 0!==a.email&&o("email",a.email??null),void 0!==a.position&&o("position",a.position??null),void 0!==a.status&&o("status",a.status),void 0!==a.hireDate&&o("hireDate",a.hireDate?new Date(a.hireDate):null),void 0!==a.notes&&o("notes",a.notes??null),void 0!==a.serviceIds&&await m(e,a.serviceIds,t),s.length>0&&(s.push('"updatedAt" = NOW()'),i.push(e,t),await r.pool.query(`UPDATE "Staff" SET ${s.join(", ")} WHERE id = $${n} AND "organizationId" = $${n+1} AND "deletedAt" IS NULL`,i));let d=await c(t,e);if(!d)throw Error("NOT_FOUND");return d}async function C(t,e,a){if(!(await r.pool.query('SELECT id FROM "Staff" WHERE id = $1 AND "organizationId" = $2 AND "deletedAt" IS NULL',[e,t])).rows[0])throw Error("NOT_FOUND");let s=await r.pool.connect();try{for(let t of(await s.query("BEGIN"),await s.query('DELETE FROM "StaffSchedule" WHERE "staffId" = $1',[e]),await s.query('DELETE FROM "StaffBreak" WHERE "staffId" = $1',[e]),a.schedules))await s.query(`INSERT INTO "StaffSchedule" (id, "staffId", "dayOfWeek", "startTime", "endTime", active)
         VALUES ($1,$2,$3,$4,$5,$6)`,[d("sch"),e,t.dayOfWeek,t.startTime,t.endTime,t.active]);for(let t of a.breaks)await s.query(`INSERT INTO "StaffBreak" (id, "staffId", "dayOfWeek", "startTime", "endTime")
         VALUES ($1,$2,$3,$4,$5)`,[d("brk"),e,t.dayOfWeek,t.startTime,t.endTime]);await s.query("COMMIT")}catch(t){throw await s.query("ROLLBACK"),t}finally{s.release()}let i=await c(t,e);if(!i)throw Error("NOT_FOUND");return i}async function L(t,e,a){if(!(await r.pool.query('SELECT id FROM "Staff" WHERE id = $1 AND "organizationId" = $2 AND "deletedAt" IS NULL',[e,t])).rows[0])throw Error("NOT_FOUND");let s=d("lv");await r.pool.query(`INSERT INTO "StaffLeave" (id, "staffId", "startAt", "endAt", type, reason, status, "updatedAt")
     VALUES ($1,$2,$3,$4,$5::"LeaveType",$6,$7::"LeaveStatus",NOW())`,[s,e,new Date(a.startAt),new Date(a.endAt),a.type??"CONGE",a.reason??null,a.status??"APPROVED"]),await E(t);let i=(await A(e,t)).find(t=>t.id===s);if(!i)throw Error("Leave introuvable.");return i}async function $(t,e,a,s){let i=[],n=[],o=1;if(void 0!==s.startAt&&(i.push(`"startAt" = $${o}`),n.push(new Date(s.startAt)),o++),void 0!==s.endAt&&(i.push(`"endAt" = $${o}`),n.push(new Date(s.endAt)),o++),void 0!==s.type&&(i.push(`type = $${o}::"LeaveType"`),n.push(s.type),o++),void 0!==s.reason&&(i.push(`reason = $${o}`),n.push(s.reason??null),o++),void 0!==s.status&&(i.push(`status = $${o}::"LeaveStatus"`),n.push(s.status),o++),0===i.length){let s=(await A(e,t)).find(t=>t.id===a);if(!s)throw Error("NOT_FOUND");return s}i.push('"updatedAt" = NOW()'),n.push(a,e,t);let{rowCount:d}=await r.pool.query(`UPDATE "StaffLeave" l SET ${i.join(", ")}
     FROM "Staff" st
     WHERE l.id = $${o} AND l."staffId" = $${o+1} AND st.id = l."staffId" AND st."organizationId" = $${o+2}`,n);if(!d)throw Error("NOT_FOUND");await E(t);let u=(await A(e,t)).find(t=>t.id===a);if(!u)throw Error("NOT_FOUND");return u}r=(o.then?(await o)():o)[0],s()}catch(t){s(t)}})},51381:(t,e,a)=>{a.d(e,{$B:()=>s});function s(t,e){return`${t} ${e}`.trim()}}};