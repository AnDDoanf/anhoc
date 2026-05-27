import { Router } from 'express';
import prisma from '../lib/db';
import { authenticate, authorize } from '../middleware/auth';
import { seedAchievements, checkAndAwardAchievements } from '../services/achievementService';

const router = Router();

const parsePositiveInt = (value: unknown, fallback: number, max = 100) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return Math.min(Math.floor(parsed), max);
};

// Seed achievements (idempotent) — call once on deploy or dev startup
router.post('/seed', authenticate, authorize('manage', 'achievement'), async (req, res) => {
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
    const page = parsePositiveInt(req.query.page, 1);
    const pageSize = parsePositiveInt(req.query.pageSize, 10);
    const category = typeof req.query.category === 'string' ? req.query.category.trim().toLowerCase() : '';
    const where = category && category !== 'all' ? { category } : {};
    const [all, userEarned] = await Promise.all([
      prisma.achievement.findMany({
        include: { theme: true },
        orderBy: [{ category: 'asc' }, { xp_reward: 'asc' }]
      }),
      prisma.userAchievement.findMany({ where: { user_id: userId }, include: { achievement: true } }),
    ]);

    const earnedMap = new Map(userEarned.map(e => [e.achievement_id, e.earned_at]));
    const filtered = all.filter((achievement) => !where.category || achievement.category === where.category);
    const start = (page - 1) * pageSize;
    const items = filtered.slice(start, start + pageSize).map(a => ({
      ...a,
      theme: a.theme
        ? {
            id: a.theme.id,
            slug: a.theme.slug,
            title_en: a.theme.title_en,
            title_vi: a.theme.title_vi,
            description_en: a.theme.description_en,
            description_vi: a.theme.description_vi,
            preview_color: a.theme.preview_color,
            light_variables: a.theme.light_variables,
            dark_variables: a.theme.dark_variables,
          }
        : null,
      earned: earnedMap.has(a.id),
      earned_at: earnedMap.get(a.id) ?? null,
    }));

    res.json({
      items,
      summary: {
        total: all.length,
        earned: all.filter((achievement) => earnedMap.has(achievement.id)).length,
      },
      pagination: {
        page,
        pageSize,
        total: filtered.length,
        totalPages: Math.max(1, Math.ceil(filtered.length / pageSize)),
        hasMore: start + items.length < filtered.length,
      }
    });
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
