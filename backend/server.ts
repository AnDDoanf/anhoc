import 'dotenv/config';
import express, { type Application, type Request, type Response, type NextFunction } from 'express';
import cors from 'cors';
import prisma from './lib/db';
// Route Imports
import authRoutes from './routes/auth';
import lessonRoutes from './routes/lessons';
import testRoutes from './routes/tests';

const app: Application = express();

const PORT = process.env.PORT || 3001;

// --- Middleware ---
app.use(cors({
  origin: 'http://localhost:3000', // Allow your frontend port
  credentials: true,               // Required if you want to send cookies
}));
app.use(express.json()); // Parses incoming JSON requests

// --- Routes ---
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/lessons', lessonRoutes);
app.use('/api/v1/tests', testRoutes);

// --- Health Check ---
app.get('/api/v1/health', (req: Request, res: Response) => {
  res.json({ status: 'OK', message: 'Math App Backend is running' });
});

// --- Global Error Handler ---
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error(err.stack);
  res.status(500).json({
    error: 'Something went wrong!',
    message: err.message
  });
});

// --- Server Start ---
async function main() {
  try {
    // Test DB connection
    await prisma.$connect();
    console.log('✅ Connected to PostgreSQL via Prisma');

    app.listen(PORT, () => {
      console.log(`🚀 Server is flying at http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

main();