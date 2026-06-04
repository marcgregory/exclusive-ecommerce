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
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    const result = await callback(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function closePool(): Promise<void> {
  if (!pool) return;
  await pool.end();
  pool = undefined;
}
