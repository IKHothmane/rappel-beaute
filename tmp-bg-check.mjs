import pg from "pg";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 1 });
const result = await pool.query(`
  SELECT o.name, p."cardBackgroundUrl" AS url, p."cardBackgroundColor" AS color
  FROM "Organization" o
  LEFT JOIN "LoyaltyProgram" p ON p."organizationId" = o.id
  ORDER BY o.name
`);
for (const row of result.rows) {
  console.log(`${row.name}\t${row.color ?? ""}\t${row.url ?? ""}`);
}
await pool.end();
