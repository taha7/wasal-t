import { rides } from '@wasal-t/db';
import { type IRouter, Router } from 'express';
import { db } from '../db.js';

const FARE_BASE = 2.0;
const FARE_PER_KM = 1.5;
const FARE_MIN = 3.0;

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function calcFare(distanceKm: number): number {
  return Math.max(FARE_MIN, FARE_BASE + distanceKm * FARE_PER_KM);
}

const router: IRouter = Router();

router.post('/', async (req, res) => {
  const riderId = req.headers['x-user-id'] as string | undefined;
  const role = req.headers['x-user-role'] as string | undefined;

  if (!riderId || role !== 'rider') {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }

  const { originLat, originLon, destLat, destLon } = req.body as {
    originLat?: unknown;
    originLon?: unknown;
    destLat?: unknown;
    destLon?: unknown;
  };

  if (
    typeof originLat !== 'number' ||
    typeof originLon !== 'number' ||
    typeof destLat !== 'number' ||
    typeof destLon !== 'number'
  ) {
    res.status(400).json({ error: 'originLat, originLon, destLat, destLon must be numbers' });
    return;
  }

  const distanceKm = haversineKm(originLat, originLon, destLat, destLon);
  const fare = Math.round(calcFare(distanceKm) * 100) / 100;

  try {
    const [ride] = await db
      .insert(rides)
      .values({ riderId, originLat, originLon, destLat, destLon, fare, status: 'draft' })
      .returning({ id: rides.id });

    if (!ride) throw new Error('Insert failed');

    res.status(201).json({ rideId: ride.id, fare });
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
