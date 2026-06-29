import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const plans = await prisma.plan.findMany();
  console.log(JSON.stringify(plans, null, 2));
  await prisma.$disconnect();
}

main().catch(console.error);
