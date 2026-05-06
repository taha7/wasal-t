import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema.js';

export * from './schema.js';
export type { NodePgDatabase };
export { sql, eq, and, or, desc, asc } from 'drizzle-orm';

export type AppDb = NodePgDatabase<typeof schema>;

export function createPool(connectionString: string): Pool {
  return new Pool({ connectionString });
}

export function createDb(pool: Pool): AppDb {
  return drizzle(pool, { schema });
}
