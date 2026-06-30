import 'dotenv/config';
import { PrismaClient } from './prisma/client/index.js';

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      username: true,
      role: { select: { name: true } },
      learn_unit: { select: { id: true, code: true, name: true } },
    }
  });

  console.log("=== USERS ===");
  console.log(JSON.stringify(users, null, 2));

  await prisma.$disconnect();
}

main().catch(console.error);
