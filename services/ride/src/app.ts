import express, { type Application } from 'express';
import faresRouter from './routes/fares.js';
import ridesRouter from './routes/rides.js';

const app: Application = express();
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/fares', faresRouter);
app.use('/rides', ridesRouter);

export default app;
