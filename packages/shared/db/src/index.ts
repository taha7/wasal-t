import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

export type { NodePgDatabase };
export { sql, eq, and, or, desc, asc } from 'drizzle-orm';

export function createPool(connectionString: string): Pool {
  return new Pool({ connectionString });
}

export function createDb(pool: Pool): NodePgDatabase {
  return drizzle(pool);
}
