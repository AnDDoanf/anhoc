// src/services/levelService.ts
import prisma from '../lib/db';

const BASE_XP = 100;
const GROWTH_RATE = 1.3;

export const levelService = {
  // XP needed to go from currentLevel -> currentLevel + 1
  getXpRequired: (currentLevel: number) => {
    return Math.floor(BASE_XP * Math.pow(currentLevel, GROWTH_RATE));
  },

  getLevelFromTotalXp: (totalXp: number) => {
    let level = 1;
    let remainingXp = Math.max(0, totalXp);

    while (remainingXp >= levelService.getXpRequired(level)) {
      remainingXp -= levelService.getXpRequired(level);
      level++;
    }

    return level;
  },

  addXp: async (userId: string, amount: number, reason: string) => {
    if (amount <= 0) return null;

    // Fetch user role and student stats in a single DB call
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        role: { select: { name: true } },
        student_stats: true
      }
    });

    if (!user) return null;
    const isFreeStudent = user.role?.name === 'free_student';

    // Fetch current stats
    let stats = user.student_stats;

    if (!stats) {
      stats = await prisma.studentStats.create({
        data: { user_id: userId, total_xp: 0, level: 1 }
      });
    }

    const currentXp = stats.total_xp || 0;
    let xpToAdd = amount;

    // Apply XP bonus pct from upgrades if active
    const statsAny = stats as any;
    const upgrades = statsAny.upgrades && typeof statsAny.upgrades === 'object' ? statsAny.upgrades : {};
    const xpBonusPct = Number((upgrades as any).xp_bonus_pct || 0);
    if (xpBonusPct > 0) {
      xpToAdd = Math.floor(xpToAdd * (1 + xpBonusPct / 100));
    }

    if (isFreeStudent) {
      if (currentXp >= 500) {
        return stats;
      }
      if (currentXp + xpToAdd > 500) {
        xpToAdd = 500 - currentXp;
      }
    }

    if (xpToAdd <= 0) return stats;

    // Recompute level from cumulative XP total
    const nextTotalXp = currentXp + xpToAdd;
    const nextLevel = levelService.getLevelFromTotalXp(nextTotalXp);
    const levelDiff = nextLevel - stats.level;
    const levelPointsAwarded = levelDiff > 0 ? levelDiff * 2 : 0;

    // Log the XP gain for history and update stats in a single transaction
    const [_, updatedStats] = await prisma.$transaction([
      prisma.xpLog.create({
        data: { user_id: userId, amount: xpToAdd, reason }
      }),
      prisma.studentStats.update({
        where: { user_id: userId },
        data: {
          total_xp: nextTotalXp,
          level: nextLevel,
          level_points: { increment: levelPointsAwarded },
          last_active: new Date()
        } as any
      })
    ]);

    return updatedStats;
  }
};
