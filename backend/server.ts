import './lib/env.ts';
import express, { type Application, type NextFunction, type Request, type Response } from 'express';
import cors from 'cors';
import prisma, { describeDatabaseTarget, shutdownPool, getPoolStats } from './lib/db.ts';

import authRoutes from './routes/auth.ts';
import lessonRoutes from './routes/lessons.ts';
import testRoutes from './routes/tests.ts';
import adminRoutes from './routes/admin.ts';
import achievementRoutes from './routes/achievements.ts';
import gameRoutes from './routes/games.ts';
import notificationRoutes from './routes/notifications.ts';
import supervisorRoutes from './routes/supervisor.ts';
import subscriptionRoutes from './routes/subscription.ts';
import studentEconomyRoutes from './routes/studentEconomy.ts';
import webhookRoutes from './routes/webhook.ts';
import { seedAchievements } from './services/achievementService.ts';
import { seedStreakRewards } from './services/streakRewardSeeder.ts';
import { scheduleInactiveAccountCleanup } from './services/accountLifecycleService.ts';
import { startQueueWorkers } from './workers/index.ts';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './swagger.ts';
import helmet from 'helmet';
import path from 'node:path';
// import { fileURLToPath } from 'node:url'; // not needed in CommonJS
import { correlationId } from './middleware/correlation.ts';
import { requestTimeout } from './middleware/timeout.ts';
import { requestLogger } from './middleware/logging.ts';
import { errorHandler } from './middleware/errorHandler.ts';

const app: Application = express();

// __filename and __dirname are provided by Node in CommonJS; no need to compute them.

// Set correlation ID header for request tracing
app.use(correlationId);

// Log HTTP requests
app.use(requestLogger);

// Request timeouts (15 seconds)
app.use(requestTimeout(15000));

// Secure Express apps by setting various HTTP headers (allowing cross-origin for static assets)
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

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

// Stripe webhook route needs raw body for signature verification
app.use('/api/v1/webhook', express.raw({ type: 'application/json' }), webhookRoutes);

// Apply body size limits (5mb for base64 uploads)
app.use(express.json({ limit: '5mb' }));

// Serve static uploaded files
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// Serve Swagger API Documentation at /api/docs
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/lessons', lessonRoutes);
app.use('/api/v1/tests', testRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/achievements', achievementRoutes);
app.use('/api/v1/games', gameRoutes);
app.use('/api/v1/notifications', notificationRoutes);
app.use('/api/v1/supervisor', supervisorRoutes);
app.use('/api/v1/subscription', subscriptionRoutes);
app.use('/api/v1/student-economy', studentEconomyRoutes);

app.get('/api/v1/health', (req: Request, res: Response) => {
  res.json({ status: 'OK', message: 'Math App Backend is running' });
});

// Centralized Error Handling Middleware (must be registered last)
app.use(errorHandler);

async function main() {
  try {
    await prisma.$connect();
    const dbTarget = describeDatabaseTarget();
    const poolStats = getPoolStats();
    console.log(`Connected to PostgreSQL via Prisma (${dbTarget.via})`);
    console.log(`Database target: host=${dbTarget.host} db=${dbTarget.database}`);
    console.log(`Pool stats: total=${poolStats.totalCount} idle=${poolStats.idleCount} waiting=${poolStats.waitingCount}`);
    scheduleInactiveAccountCleanup();
    startQueueWorkers();

    if (String(process.env.AUTO_SEED_ACHIEVEMENTS || '').toLowerCase() === 'true') {
      await seedAchievements();
      console.log('Achievements seeded');
    }
    await seedStreakRewards();

    const server = app.listen(PORT, () => {
      console.log(`Server is running at http://localhost:${PORT}`);
    });

    // ── Graceful Shutdown ──────────────────────────────────────────
    const shutdown = async (signal: string) => {
      console.log(`\n${signal} received — shutting down gracefully…`);
      server.close(async () => {
        await shutdownPool();
        console.log('Server closed.');
        process.exit(0);
      });
      // Force exit after 10 seconds if graceful shutdown stalls
      setTimeout(() => {
        console.error('Graceful shutdown timed out — forcing exit');
        process.exit(1);
      }, 10_000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

main();
