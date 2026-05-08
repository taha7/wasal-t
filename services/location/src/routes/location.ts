import { Router, type Request, type Response, type Router as RouterType } from 'express';
import { geoAdd, geoSearch } from '@wasal-t/redis';
import { getRedis } from '../redis.js';

const router: RouterType = Router();

const GEO_KEY = 'drivers:available';
const ALIVE_TTL = 10;

router.post('/drivers/location', async (req: Request, res: Response) => {
  const driverId = req.headers['x-user-id'] as string | undefined;
  const role = req.headers['x-user-role'] as string | undefined;

  if (!driverId || role !== 'driver') {
    res.status(403).json({ error: 'drivers only' });
    return;
  }

  const { lat, lon } = req.body as { lat?: unknown; lon?: unknown };
  if (typeof lat !== 'number' || typeof lon !== 'number') {
    res.status(400).json({ error: 'lat and lon must be numbers' });
    return;
  }

  const redis = getRedis();

  // TODO: Check if we need to make it one atomic operation
  await Promise.all([
    geoAdd(redis, GEO_KEY, lon, lat, driverId),
    redis.set(`driver:alive:${driverId}`, '1', 'EX', ALIVE_TTL),
  ]);

  res.status(204).end();
});

router.get('/nearby-drivers', async (req: Request, res: Response) => {
  const { lat, lon, radiusKm, limit } = req.query as Record<string, string | undefined>;

  const latNum = parseFloat(lat ?? '');
  const lonNum = parseFloat(lon ?? '');
  const radiusNum = parseFloat(radiusKm ?? '5');
  const limitNum = parseInt(limit ?? '10', 10);

  if (isNaN(latNum) || isNaN(lonNum)) {
    res.status(400).json({ error: 'lat and lon are required' });
    return;
  }

  const redis = getRedis();
  const candidates = await geoSearch(redis, GEO_KEY, lonNum, latNum, radiusNum, limitNum);

  if (candidates.length === 0) {
    res.json({ drivers: [] });
    return;
  }

  const aliveChecks = await Promise.all(
    candidates.map((id) => redis.exists(`driver:alive:${id}`)),
  );
  const drivers = candidates.filter((_, i) => aliveChecks[i] === 1);

  res.json({ drivers });
});

export default router;
