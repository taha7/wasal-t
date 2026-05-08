import express, { type Application } from 'express';
import locationRouter from './routes/location.js';

const app: Application = express();
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use(locationRouter);

export default app;
