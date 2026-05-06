import bcrypt from 'bcryptjs';
import { createDb, createPool, drivers, riders, users } from '../src/index.js';

const DATABASE_URL =
  process.env['DATABASE_URL'] ?? 'postgresql://wasal:wasal@localhost:5432/wasalt';

const SALT_ROUNDS = 12;

async function seed(): Promise<void> {
  const pool = createPool(DATABASE_URL);
  const db = createDb(pool);

  const passwordHash = await bcrypt.hash('password123', SALT_ROUNDS);

  const insertedRiderUsers = await db
    .insert(users)
    .values([
      { email: 'alice@example.com', passwordHash, role: 'rider' },
      { email: 'bob@example.com', passwordHash, role: 'rider' },
    ])
    .returning();

  const alice = insertedRiderUsers[0];
  const bob = insertedRiderUsers[1];
  if (!alice || !bob) throw new Error('Expected 2 rider users');

  await db.insert(riders).values([
    { userId: alice.id, displayName: 'Alice' },
    { userId: bob.id, displayName: 'Bob' },
  ]);

  const insertedDriverUsers = await db
    .insert(users)
    .values([
      { email: 'charlie@example.com', passwordHash, role: 'driver' },
      { email: 'diana@example.com', passwordHash, role: 'driver' },
    ])
    .returning();

  const charlie = insertedDriverUsers[0];
  const diana = insertedDriverUsers[1];
  if (!charlie || !diana) throw new Error('Expected 2 driver users');

  await db.insert(drivers).values([
    { userId: charlie.id, licenseNumber: 'LIC-001', vehicleMake: 'Toyota', vehiclePlate: 'ABC-001' },
    { userId: diana.id, licenseNumber: 'LIC-002', vehicleMake: 'Honda', vehiclePlate: 'ABC-002' },
  ]);

  console.log('Seeded: alice@example.com, bob@example.com (riders), charlie@example.com, diana@example.com (drivers) — password: password123');
  await pool.end();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
