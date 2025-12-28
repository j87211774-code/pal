import express from 'express';
import cors from 'cors';

import healthRouter from './routes/health';
import authRouter from './routes/auth';
import usersRouter from './routes/users';
import reportsRouter from './routes/reports';
import ngosRouter from './routes/ngos';
import projectsRouter from './routes/projects';

const app = express();

app.use(cors());
app.use(express.json());

app.use('/health', healthRouter);
app.use('/api/auth', authRouter);
app.use('/api/users', usersRouter);
app.use('/api/reports', reportsRouter);
app.use('/api/ngos', ngosRouter);
app.use('/api/projects', projectsRouter);

app.get('/', (_req, res) => res.json({ status: 'ok', service: 'vision-ngo-backend' }));

// Basic error handler
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || 'Internal Server Error' });
});

export default app;
