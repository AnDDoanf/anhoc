const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const snaps = await prisma.questionSnapshot.findMany({
    take: 2,
    orderBy: { id: 'desc' },
    include: { template: true }
  });
  console.log(JSON.stringify(snaps, null, 2));
}

main().finally(() => prisma.$disconnect());
