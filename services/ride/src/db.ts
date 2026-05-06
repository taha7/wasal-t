import { createDb, createPool } from '@wasal-t/db';

const DATABASE_URL =
  process.env['DATABASE_URL'] ?? 'postgresql://wasal:wasal@localhost:5432/wasalt';

export const pool = createPool(DATABASE_URL);
export const db = createDb(pool);
