import express, { type Application } from 'express';
import faresRouter from './routes/fares.js';

const app: Application = express();
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/fares', faresRouter);

export default app;
