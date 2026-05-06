import express, { type Application, type Request } from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { authenticate } from './middleware/authenticate.js';
import authRouter from './routes/auth.js';

const RIDE_SERVICE_URL = process.env['RIDE_SERVICE_URL'] ?? 'http://localhost:3001';
const LOCATION_SERVICE_URL = process.env['LOCATION_SERVICE_URL'] ?? 'http://localhost:3002';
const NOTIFICATION_SERVICE_URL = process.env['NOTIFICATION_SERVICE_URL'] ?? 'http://localhost:3004';

function proxy(target: string) {
  return createProxyMiddleware({
    target,
    changeOrigin: true,
    on: {
      proxyReq: (proxyReq, req) => {
        const user = (req as Request).user;
        if (user) {
          proxyReq.setHeader('X-User-Id', user.userId);
          proxyReq.setHeader('X-User-Role', user.role);
        }
      },
    },
  });
}

const app: Application = express();
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/auth', authRouter);

app.use('/rides', authenticate, proxy(RIDE_SERVICE_URL));
app.use('/location', authenticate, proxy(LOCATION_SERVICE_URL));
app.use('/notifications', authenticate, proxy(NOTIFICATION_SERVICE_URL));

export default app;
