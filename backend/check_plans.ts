import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import pg from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const plans = await prisma.plan.findMany();
  console.log(JSON.stringify(plans, null, 2));
  await prisma.$disconnect();
  await pool.end();
}

main().catch(console.error);
