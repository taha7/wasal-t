import Redis from 'ioredis';

export type { Redis };

export function createRedisClient(url: string): Redis {
  return new Redis(url);
}

export async function publish(redis: Redis, channel: string, payload: unknown): Promise<void> {
  await redis.publish(channel, JSON.stringify(payload));
}

export async function acquireLock(
  redis: Redis,
  key: string,
  value: string,
  ttlSeconds: number,
): Promise<boolean> {
  const result = await redis.set(key, value, 'EX', ttlSeconds, 'NX');
  return result === 'OK';
}

export async function releaseLock(redis: Redis, key: string): Promise<void> {
  await redis.del(key);
}

export async function geoAdd(
  redis: Redis,
  key: string,
  lon: number,
  lat: number,
  member: string,
): Promise<void> {
  await redis.geoadd(key, lon, lat, member);
}

export async function geoSearch(
  redis: Redis,
  key: string,
  lon: number,
  lat: number,
  radiusKm: number,
  limit: number,
): Promise<string[]> {
  const results = (await redis.call(
    'GEOSEARCH',
    key,
    'FROMLONLAT',
    String(lon),
    String(lat),
    'BYRADIUS',
    String(radiusKm),
    'km',
    'ASC',
    'COUNT',
    String(limit),
  )) as string[];
  return results;
}
