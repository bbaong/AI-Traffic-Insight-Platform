import 'dotenv/config';
import express, { Request, Response } from 'express';
import cors from 'cors';
import { jsonReplacer, ok } from './lib/http';
import userRoutes from './routes/user.route';
import predictionRoutes from './routes/prediction.route';
import insuranceRoutes from './routes/insurance';
import discountRiderRoutes from './routes/discountRider.route';
import consultationRoutes from './routes/consultation.route';
import customerRoutes from './routes/customer.route';
import govRoutes from './routes/gov.route';
import { closePdfBrowser } from './services/pdf/browser';

const app = express();
const port = 5000;

app.set('json replacer', jsonReplacer);

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api/user', userRoutes);
app.use('/api/prediction', predictionRoutes);
app.use('/api/insurance', insuranceRoutes);
app.use('/api/discount-riders', discountRiderRoutes);
app.use('/api/consultations', consultationRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/gov', govRoutes);


app.get('/health', (_req: Request, res: Response) => {
  return ok(res, { status: 'ok' }, 200);
});

app.get('/', (_req: Request, res: Response) => {
  res.send('Hello, TypeScript with Express!');
});

const server = app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});

let shuttingDown = false;

async function shutdown(signal: string) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`${signal} received, shutting down`);

  server.close();
  await closePdfBrowser();
  process.exit(0);
}

process.on('SIGTERM', () => {
  void shutdown('SIGTERM');
});
process.on('SIGINT', () => {
  void shutdown('SIGINT');
});
