import type { ServerResponse } from 'node:http';

export function initSse(res: ServerResponse): void {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  res.write('\n');
}

export function sendSseEvent(res: ServerResponse, event: string, data: unknown): void {
  res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

export function startHeartbeat(res: ServerResponse, intervalMs = 20_000): NodeJS.Timeout {
  return setInterval(() => {
    res.write(': heartbeat\n\n');
  }, intervalMs);
}
