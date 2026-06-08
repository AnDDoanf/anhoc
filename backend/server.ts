import 'dotenv/config';
import express, { type Application, type NextFunction, type Request, type Response } from 'express';
import cors from 'cors';
import prisma, { describeDatabaseTarget } from './lib/db.ts';

import authRoutes from './routes/auth.ts';
import lessonRoutes from './routes/lessons.ts';
import testRoutes from './routes/tests.ts';
import adminRoutes from './routes/admin.ts';
import achievementRoutes from './routes/achievements.ts';
import gameRoutes from './routes/games.ts';
import notificationRoutes from './routes/notifications.ts';
import supervisorRoutes from './routes/supervisor.ts';
import { seedAchievements } from './services/achievementService.ts';
import { scheduleInactiveAccountCleanup } from './services/accountLifecycleService.ts';

const app: Application = express();

const PORT = process.env.SERVER_PORT || process.env.PORT || 5001;
const normalizeOrigin = (origin: string) => origin.replace(/\/+$/, '');
const defaultAllowedOrigins = ['http://localhost:5000'].map(normalizeOrigin);
const allowedOrigins = (process.env.CORS_ORIGINS || process.env.FRONTEND_URL || '')
  .split(',')
  .map((origin) => normalizeOrigin(origin.trim()))
  .filter(Boolean);
const corsOrigins = allowedOrigins.length > 0 ? allowedOrigins : defaultAllowedOrigins;

app.use(cors({
  origin(origin, callback) {
    if (!origin || corsOrigins.includes(normalizeOrigin(origin))) {
      callback(null, true);
      return;
    }
    callback(new Error(`Origin ${origin} is not allowed by CORS`));
  },
  credentials: true,
}));
app.use(express.json());

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/lessons', lessonRoutes);
app.use('/api/v1/tests', testRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/achievements', achievementRoutes);
app.use('/api/v1/games', gameRoutes);
app.use('/api/v1/notifications', notificationRoutes);
app.use('/api/v1/supervisor', supervisorRoutes);

app.get('/api/v1/health', (req: Request, res: Response) => {
  res.json({ status: 'OK', message: 'Math App Backend is running' });
});

app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error(err.stack);
  res.status(500).json({
    error: 'Something went wrong!',
    message: err.message
  });
});

async function main() {
  try {
    await prisma.$connect();
    const dbTarget = describeDatabaseTarget();
    console.log(`Connected to PostgreSQL via Prisma (${dbTarget.via})`);
    console.log(`Database target: host=${dbTarget.host} db=${dbTarget.database}`);
    scheduleInactiveAccountCleanup();

    if (String(process.env.AUTO_SEED_ACHIEVEMENTS || '').toLowerCase() === 'true') {
      await seedAchievements();
      console.log('Achievements seeded');
    }

    app.listen(PORT, () => {
      console.log(`Server is running at http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

main();
