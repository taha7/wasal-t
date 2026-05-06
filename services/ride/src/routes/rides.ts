import { eq, rides } from '@wasal-t/db';
import { sendMessage } from '@wasal-t/kafka';
import { publish } from '@wasal-t/redis';
import { type IRouter, Router } from 'express';
import { db } from '../db.js';
import { getProducer } from '../kafka.js';
import { getRedis } from '../redis.js';

const router: IRouter = Router();

router.post('/:rideId', async (req, res) => {
  const callerId = req.headers['x-user-id'] as string | undefined;
  const role = req.headers['x-user-role'] as string | undefined;

  if (!callerId || role !== 'rider') {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }

  const { rideId } = req.params as { rideId: string };

  try {
    const [ride] = await db.select().from(rides).where(eq(rides.id, rideId)).limit(1);

    if (!ride) {
      res.status(404).json({ error: 'Ride not found' });
      return;
    }

    if (ride.riderId !== callerId) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    if (ride.status !== 'draft') {
      res.status(409).json({ error: `Ride is already ${ride.status}` });
      return;
    }

    await db.update(rides).set({ status: 'pending' }).where(eq(rides.id, rideId));

    const producer = await getProducer();
    await sendMessage(producer, 'ride-requests', {
      rideId,
      origin: { lat: ride.originLat, lon: ride.originLon },
      destination: { lat: ride.destLat, lon: ride.destLon },
    });

    res.status(202).json({ rideId, status: 'pending' });
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.patch('/:rideId', async (req, res) => {
  const driverId = req.headers['x-user-id'] as string | undefined;
  const role = req.headers['x-user-role'] as string | undefined;

  if (!driverId || role !== 'driver') {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }

  const { rideId } = req.params as { rideId: string };
  const body = req.body as unknown;

  if (
    typeof body !== 'object' ||
    body === null ||
    !('accept' in body) ||
    typeof (body as Record<string, unknown>)['accept'] !== 'boolean'
  ) {
    res.status(400).json({ error: 'Body must be { accept: boolean }' });
    return;
  }

  const accept = (body as { accept: boolean }).accept;

  try {
    const [ride] = await db.select().from(rides).where(eq(rides.id, rideId)).limit(1);

    if (!ride) {
      res.status(404).json({ error: 'Ride not found' });
      return;
    }

    if (ride.status !== 'pending') {
      res.status(409).json({ error: `Ride is not pending (status: ${ride.status})` });
      return;
    }

    const redis = getRedis();

    if (accept) {
      await db
        .update(rides)
        .set({ status: 'matched', driverId })
        .where(eq(rides.id, rideId));

      await Promise.all([
        publish(redis, `offer-result:${rideId}:${driverId}`, { accepted: true }),
        publish(redis, `ride:${rideId}:matched`, { rideId, driverId }),
      ]);

      res.json({ rideId, status: 'matched' });
    } else {
      await publish(redis, `offer-result:${rideId}:${driverId}`, { accepted: false });
      res.json({ rideId, status: 'declined' });
    }
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
