import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import pg from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

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
  await pool.end();
}

main().catch(console.error);
