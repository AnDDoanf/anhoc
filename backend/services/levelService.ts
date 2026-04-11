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

    // 1. Log the XP gain for history
    await prisma.xpLog.create({
      data: { user_id: userId, amount, reason }
    });

    // 2. Fetch current stats
    let stats = await prisma.studentStats.findUnique({
      where: { user_id: userId }
    });

    if (!stats) {
      stats = await prisma.studentStats.create({
        data: { user_id: userId, total_xp: 0, level: 1 }
      });
    }
    // 3. Recompute level from cumulative XP total
    const nextTotalXp = (stats.total_xp || 0) + amount;
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
