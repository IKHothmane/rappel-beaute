import type { PoolClient } from "pg";
import { pool } from "@/lib/db/pool";

/**
 * Runs `work` inside BEGIN/COMMIT on a dedicated connection.
 * - A failing ROLLBACK never hides the original error.
 * - When ROLLBACK itself fails the connection is considered broken and is
 *   destroyed (release(err)) instead of going back to the pool.
 */
export async function withTransaction<T>(work: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  let brokenConnection: Error | undefined;
  try {
    await client.query("BEGIN");
    const result = await work(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch (rollbackError) {
      brokenConnection = rollbackError instanceof Error ? rollbackError : new Error(String(rollbackError));
    }
    throw error;
  } finally {
    client.release(brokenConnection);
  }
}
