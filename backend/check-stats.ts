import prisma from './lib/db';

async function main() {
  const stats = await prisma.studentStats.findMany({
    include: {
      user: {
        select: {
          username: true,
          email: true,
          role: true
        }
      }
    }
  });
  
  console.log("=== Student Stats ===");
  for (const s of stats) {
    console.log(`User: ${s.user?.username} (${s.user?.email})`);
    console.log(`Level: ${s.level}, Coins: ${s.coins}, Lives: ${s.lives}`);
    console.log(`Level Points: ${s.level_points}`);
    console.log(`Upgrades:`, JSON.stringify(s.upgrades));
    console.log("-------------------");
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
