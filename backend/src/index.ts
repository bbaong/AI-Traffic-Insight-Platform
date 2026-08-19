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

//인증 미들웨어 적용
import { requireAuth } from './middleware/auth.middleware';

app.use('/api/user', userRoutes);
//예측 라우트 적용
app.use('/api/prediction', requireAuth, predictionRoutes);
//보험 라우트 적용
app.use('/api/insurance', requireAuth, insuranceRoutes);
//할인 라우트 적용
app.use('/api/discount-riders', requireAuth, discountRiderRoutes);
//상담 라우트 적용
app.use('/api/consultations', requireAuth, consultationRoutes);
//고객 라우트 적용
app.use('/api/customers', requireAuth, customerRoutes);
//행정 라우트 적용
app.use('/api/gov', requireAuth, govRoutes);

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
