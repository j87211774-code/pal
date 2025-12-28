import express from 'express';
import cors from 'cors';

import healthRouter from './routes/health';
import authRouter from './routes/auth';
import usersRouter from './routes/users';

const app = express();

app.use(cors());
app.use(express.json());

app.use('/health', healthRouter);
app.use('/api/auth', authRouter);
app.use('/api/users', usersRouter);

app.get('/', (_req, res) => res.json({ status: 'ok', service: 'vision-ngo-backend' }));

// Basic error handler
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || 'Internal Server Error' });
});

export default app;
