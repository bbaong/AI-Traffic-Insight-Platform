import express, { Request, Response } from 'express';
import userRoutes from './routes/user.route';
import cors from 'cors';

const app = express();
const port = 5000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

//라우터 등록
app.use('/api/user', userRoutes);

app.get('/', (req: Request, res: Response) => {
  res.send('Hello, TypeScript with Express!');
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});