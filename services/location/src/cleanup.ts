import { getRedis } from './redis.js';

const GEO_KEY = 'drivers:available';
const INTERVAL_MS = 60_000;

export function startCleanup(): NodeJS.Timeout {
  return setInterval(async () => {
    const redis = getRedis();
    const members = (await redis.call('ZRANGE', GEO_KEY, '0', '-1')) as string[];
    if (members.length === 0) return;

    const aliveChecks = await Promise.all(members.map((id) => redis.exists(`driver:alive:${id}`)));
    const stale = members.filter((_, i) => aliveChecks[i] === 0);

    if (stale.length > 0) {
      await redis.zrem(GEO_KEY, ...stale);
    }
  }, INTERVAL_MS);
}
