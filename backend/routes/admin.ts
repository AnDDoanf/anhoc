import { Router } from 'express';
import prisma from '../lib/db';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

// Get Admin Statistics
router.get('/stats', authenticate, authorize('manage', 'lesson'), async (req, res) => {
  try {
    const [
      userCount,
      lessonCount,
      attemptCount,
      topUsers,
      recentAttempts
    ] = await Promise.all([
      prisma.user.count(),
      prisma.lesson.count(),
      prisma.testAttempt.count(),
      prisma.user.findMany({
        take: 5,
        select: {
          id: true,
          username: true,
          email: true,
          student_stats: true,
          _count: {
            select: { test_attempts: true }
          }
        },
        orderBy: {
          test_attempts: { _count: 'desc' }
        }
      }),
      prisma.testAttempt.findMany({
        take: 10,
        orderBy: { started_at: 'desc' },
        include: {
          user: { select: { username: true } },
          lesson: { select: { title_en: true, title_vi: true } }
        }
      })
    ]);

    // Average score across all attempts
    const avgScoreResult = await prisma.testAttempt.aggregate({
      where: { is_completed: true },
      _avg: { total_score: true }
    });

    res.json({
      summary: {
        users: userCount,
        lessons: lessonCount,
        attempts: attemptCount,
        avgScore: avgScoreResult._avg.total_score || 0
      },
      topUsers: topUsers.map(u => ({
        id: u.id,
        username: u.username,
        email: u.email,
        attempts: u._count.test_attempts,
        xp: u.student_stats?.total_xp || 0
      })),
      recentActivity: recentAttempts
    });
  } catch (error: any) {
    res.status(500).json({ error: "Failed to fetch admin stats", details: error.message });
  }
});

export default router;
