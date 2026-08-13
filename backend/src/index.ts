import 'dotenv/config';
import express, { Request, Response } from 'express';
import cors from 'cors';
import { jsonReplacer } from './lib/http';
import userRoutes from './routes/user.route';
import predictionRoutes from './routes/prediction.route';
import insuranceRoutes from './routes/insurance';
import discountRiderRoutes from './routes/discountRider.route';
import consultationRoutes from './routes/consultation.route';
import customerRoutes from './routes/customer.route';
import govRoutes from './routes/gov.route';

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
  res.status(200).json({ success: true, data: { status: 'ok' } });
});

app.get('/', (_req: Request, res: Response) => {
  res.send('Hello, TypeScript with Express!');
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
