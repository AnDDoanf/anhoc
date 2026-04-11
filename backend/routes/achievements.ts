import { Router } from 'express';
import prisma from '../lib/db';
import { authenticate } from '../middleware/auth';
import { seedAchievements, checkAndAwardAchievements } from '../services/achievementService';

const router = Router();

// Seed achievements (idempotent) — call once on deploy or dev startup
router.post('/seed', authenticate, async (req, res) => {
  try {
    await seedAchievements();
    res.json({ message: 'Achievements seeded successfully' });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/v1/achievements — all achievements with earned status for current user
router.get('/', authenticate, async (req, res) => {
  const userId = (req as any).user.id;
  try {
    const [all, userEarned] = await Promise.all([
      prisma.achievement.findMany({ orderBy: [{ category: 'asc' }, { xp_reward: 'asc' }] }),
      prisma.userAchievement.findMany({ where: { user_id: userId }, include: { achievement: true } }),
    ]);

    const earnedMap = new Map(userEarned.map(e => [e.achievement_id, e.earned_at]));

    res.json(all.map(a => ({
      ...a,
      earned: earnedMap.has(a.id),
      earned_at: earnedMap.get(a.id) ?? null,
    })));
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/v1/achievements/my — earned achievements for current user
router.get('/my', authenticate, async (req, res) => {
  const userId = (req as any).user.id;
  try {
    const earned = await prisma.userAchievement.findMany({
      where: { user_id: userId },
      include: { achievement: true },
      orderBy: { earned_at: 'desc' },
    });
    res.json(earned);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/v1/achievements/check — trigger achievement evaluation for current user
router.post('/check', authenticate, async (req, res) => {
  const userId = (req as any).user.id;
  try {
    const newlyEarned = await checkAndAwardAchievements(userId);
    res.json({ newlyEarned });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
