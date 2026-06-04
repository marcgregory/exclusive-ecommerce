import "dotenv/config";
import { Pool, type PoolClient, type PoolConfig, type QueryResultRow } from "pg";

let pool: Pool | undefined;

export function getDatabaseUrl(): string {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is required for PostgreSQL persistence");
  }
  return connectionString;
}

export function getPool(): Pool {
  if (!pool) {
    const config: PoolConfig = { connectionString: getDatabaseUrl() };
    pool = new Pool(config);
  }
  return pool;
}

export async function query<T extends QueryResultRow = QueryResultRow>(sql: string, values: unknown[] = []) {
  return getPool().query<T>(sql, values);
}

export async function withTransaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
  const maxAttempts = 3;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const client = await getPool().connect();
    try {
      await client.query("BEGIN");
      const result = await callback(client);
      await client.query("COMMIT");
      return result;
    } catch (error: any) {
      await client.query("ROLLBACK");
      // Retry on Postgres deadlock (SQLSTATE 40P01)
      if (attempt < maxAttempts && error && error.code === "40P01") {
        const backoff = attempt * 50;
        await new Promise((r) => setTimeout(r, backoff));
        // release and retry
        client.release();
        continue;
      }
      client.release();
      throw error;
    } finally {
      // ensure release if not already released
      try { client.release(); } catch (_) {}
    }
  }
  throw new Error("Transaction failed after retries");
}

export async function closePool(): Promise<void> {
  if (!pool) return;
  await pool.end();
  pool = undefined;
}
