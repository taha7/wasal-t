import { comparePassword, hashPassword, signJwt } from '@wasal-t/auth';
import { createDb, createPool, drivers, eq, riders, users } from '@wasal-t/db';
import { type IRouter, Router } from 'express';

const DATABASE_URL =
  process.env['DATABASE_URL'] ?? 'postgresql://wasal:wasal@localhost:5432/wasalt';
const JWT_SECRET = process.env['JWT_SECRET'] ?? 'dev-secret';

const pool = createPool(DATABASE_URL);
const db = createDb(pool);

const router: IRouter = Router();

function isDuplicateEmail(err: unknown): boolean {
  return err instanceof Error &&
    (err.message.includes('unique') || err.message.includes('duplicate'));
}

router.post('/register/rider', async (req, res) => {
  const { email, password, displayName } = req.body as {
    email?: string;
    password?: string;
    displayName?: string;
  };

  if (!email || !password || !displayName) {
    res.status(400).json({ error: 'email, password, and displayName are required' });
    return;
  }

  try {
    const token = await db.transaction(async (tx) => {
      const passwordHash = await hashPassword(password);
      const [user] = await tx
        .insert(users)
        .values({ email, passwordHash, role: 'rider' })
        .returning();
      if (!user) throw new Error('Insert failed');
      await tx.insert(riders).values({ userId: user.id, displayName });
      return signJwt({ userId: user.id, role: 'rider' }, JWT_SECRET);
    });

    res.status(201).json({ token });
  } catch (err) {
    if (isDuplicateEmail(err)) {
      res.status(409).json({ error: 'Email already registered' });
      return;
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/register/driver', async (req, res) => {
  const { email, password, licenseNumber, vehicleMake, vehiclePlate } = req.body as {
    email?: string;
    password?: string;
    licenseNumber?: string;
    vehicleMake?: string;
    vehiclePlate?: string;
  };

  if (!email || !password || !licenseNumber || !vehicleMake || !vehiclePlate) {
    res
      .status(400)
      .json({ error: 'email, password, licenseNumber, vehicleMake, and vehiclePlate are required' });
    return;
  }

  try {
    const token = await db.transaction(async (tx) => {
      const passwordHash = await hashPassword(password);
      const [user] = await tx
        .insert(users)
        .values({ email, passwordHash, role: 'driver' })
        .returning();
      if (!user) throw new Error('Insert failed');
      await tx.insert(drivers).values({ userId: user.id, licenseNumber, vehicleMake, vehiclePlate });
      return signJwt({ userId: user.id, role: 'driver' }, JWT_SECRET);
    });

    res.status(201).json({ token });
  } catch (err) {
    if (isDuplicateEmail(err)) {
      res.status(409).json({ error: 'Email already registered' });
      return;
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body as { email?: string; password?: string };

  if (!email || !password) {
    res.status(400).json({ error: 'email and password are required' });
    return;
  }

  try {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    if (!user || !(await comparePassword(password, user.passwordHash))) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }
    res.json({ token: signJwt({ userId: user.id, role: user.role }, JWT_SECRET) });
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
