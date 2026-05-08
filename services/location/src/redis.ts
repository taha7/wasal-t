import { createRedisClient, type Redis } from '@wasal-t/redis';

const REDIS_URL = process.env['REDIS_URL'] ?? 'redis://localhost:6379';

let _client: Redis | null = null;

export function getRedis(): Redis {
  if (!_client) {
    _client = createRedisClient(REDIS_URL);
  }
  return _client;
}
