import prisma from './lib/db';

async function main() {
  const stats = await prisma.studentStats.findMany();
  
  console.log("=== Adjusting Student Level Points ===");
  for (const s of stats) {
    const level = s.level || 1;
    const upgrades = s.upgrades && typeof s.upgrades === 'object' ? (s.upgrades as any) : {};
    
    // Calculate spent points
    const xpBonusPoints = Math.floor((upgrades.xp_bonus_pct || 0) / 5);
    const coinBonusPoints = Math.floor((upgrades.coin_bonus_pct || 0) / 5);
    const gameDurationPoints = Math.floor((upgrades.game_duration_bonus || 0) / 5);
    const extraLivesPoints = (upgrades.extra_lives_from_points || 0) * 10;
    const extraAttemptsPoints = (upgrades.extra_game_attempts || 0) * 10;
    
    const totalSpent = xpBonusPoints + coinBonusPoints + gameDurationPoints + extraLivesPoints + extraAttemptsPoints;
    const expectedTotal = (level - 1) * 2;
    const expectedCurrent = Math.max(0, expectedTotal - totalSpent);
    
    if (s.level_points < expectedCurrent) {
      console.log(`Updating user ${s.user_id}: current level_points ${s.level_points} -> expected ${expectedCurrent} (level ${level}, spent ${totalSpent})`);
      await prisma.studentStats.update({
        where: { user_id: s.user_id },
        data: { level_points: expectedCurrent }
      });
    } else {
      console.log(`User ${s.user_id}: current level_points ${s.level_points} is already >= expected ${expectedCurrent}`);
    }
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
