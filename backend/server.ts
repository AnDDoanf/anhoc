import 'dotenv/config';
import express, { type Application, type Request, type Response, type NextFunction } from 'express';
import cors from 'cors';
import prisma from './lib/db.ts';

import authRoutes from './routes/auth.ts';
import lessonRoutes from './routes/lessons.ts';
import testRoutes from './routes/tests.ts';
import adminRoutes from './routes/admin.ts';
import achievementRoutes from './routes/achievements.ts';
import { seedAchievements } from './services/achievementService.ts';

const app: Application = express();

const PORT = process.env.SERVER_PORT || process.env.PORT || 5001;

app.use(cors({
  origin: 'http://localhost:5000', 
  credentials: true,               
}));
app.use(express.json()); 

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/lessons', lessonRoutes);
app.use('/api/v1/tests', testRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/achievements', achievementRoutes);

app.get('/api/v1/health', (req: Request, res: Response) => {
  res.json({ status: 'OK', message: 'Math App Backend is running' });
});

app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error(err.stack);
  res.status(500).json({
    error: 'Something went wrong!',
    message: err.message
  });
});

async function main() {
  try {
    
    await prisma.$connect();
    console.log('✅ Connected to PostgreSQL via Prisma');

    // Auto-seed achievements on startup (idempotent)
    await seedAchievements();
    console.log('🏆 Achievements seeded');

    app.listen(PORT, () => {
      console.log(`🚀 Server is flying at http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

main();
