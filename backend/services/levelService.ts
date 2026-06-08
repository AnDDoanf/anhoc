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

    // Fetch user role
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: { select: { name: true } } }
    });
    const isFreeStudent = user?.role?.name === 'free_student';

    // Fetch current stats
    let stats = await prisma.studentStats.findUnique({
      where: { user_id: userId }
    });

    if (!stats) {
      stats = await prisma.studentStats.create({
        data: { user_id: userId, total_xp: 0, level: 1 }
      });
    }

    const currentXp = stats.total_xp || 0;
    let xpToAdd = amount;

    if (isFreeStudent) {
      if (currentXp >= 500) {
        return stats;
      }
      if (currentXp + amount > 500) {
        xpToAdd = 500 - currentXp;
      }
    }

    if (xpToAdd <= 0) return stats;

    // 1. Log the XP gain for history
    await prisma.xpLog.create({
      data: { user_id: userId, amount: xpToAdd, reason }
    });

    // 3. Recompute level from cumulative XP total
    const nextTotalXp = currentXp + xpToAdd;
    const nextLevel = levelService.getLevelFromTotalXp(nextTotalXp);

    // 4. Update stats
    return await prisma.studentStats.update({
      where: { user_id: userId },
      data: {
        total_xp: nextTotalXp,
        level: nextLevel,
        last_active: new Date()
      }
    });
  }
};
