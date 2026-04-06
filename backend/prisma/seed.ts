import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import bcrypt from 'bcryptjs';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Seeding database...');
  const hashedPassword = await bcrypt.hash('123456', 10);

  // 1. 🔑 Actions
  console.log('  - Seeding actions...');
  const actionsArr = ['create', 'read', 'update', 'delete', 'manage'];
  const actions: Record<string, any> = {};
  for (const name of actionsArr) {
    actions[name] = await prisma.action.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }

  // 2. 📁 Resources
  console.log('  - Seeding resources...');
  const resourcesArr = ['user', 'lesson', 'test', 'stats'];
  const resources: Record<string, any> = {};
  for (const name of resourcesArr) {
    resources[name] = await prisma.resource.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }

  // 3. 🛡️ Roles
  console.log('  - Seeding roles...');
  const adminRole = await prisma.role.upsert({
    where: { name: 'admin' },
    update: {},
    create: { name: 'admin' },
  });

  const studentRole = await prisma.role.upsert({
    where: { name: 'student' },
    update: {},
    create: { name: 'student' },
  });

  // 4. 📜 Permissions Mapping
  console.log('  - Mapping permissions...');
  
  // Admin: manage everything
  for (const res of resourcesArr) {
    await prisma.rolePermission.upsert({
      where: {
        role_id_action_id_resource_id: {
          role_id: adminRole.id,
          action_id: actions['manage'].id,
          resource_id: resources[res].id,
        },
      },
      update: {},
      create: {
        role_id: adminRole.id,
        action_id: actions['manage'].id,
        resource_id: resources[res].id,
      },
    });
  }

  // Student: read lessons/tests, update stats
  const studentPerms = [
    { a: 'read', r: 'lesson' },
    { a: 'read', r: 'test' },
    { a: 'update', r: 'stats' },
  ];

  for (const p of studentPerms) {
    await prisma.rolePermission.upsert({
      where: {
        role_id_action_id_resource_id: {
          role_id: studentRole.id,
          action_id: actions[p.a].id,
          resource_id: resources[p.r].id,
        },
      },
      update: {},
      create: {
        role_id: studentRole.id,
        action_id: actions[p.a].id,
        resource_id: resources[p.r].id,
      },
    });
  }

  // 5. 🧑 Users (Updated to use role_id)
  console.log('  - Seeding users...');
  const admin = await prisma.user.upsert({
    where: { email: 'admin@dev.com' },
    update: {},
    create: {
      username: 'admin',
      email: 'admin@dev.com',
      password_hash: hashedPassword,
      role_id: adminRole.id,
    },
  });

  const student = await prisma.user.upsert({
    where: { email: 'student@dev.com' },
    update: {},
    create: {
      username: 'student1',
      email: 'student@dev.com',
      password_hash: hashedPassword,
      role_id: studentRole.id,
    },
  });

  // 6. 📚 Lesson
  const lesson = await prisma.lesson.upsert({
    where: { id: '00000000-0000-0000-0000-000000000001' }, // Fixed ID for idempotency
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000001',
      title_vi: 'Phép cộng cơ bản',
      content_markdown: '## Học phép cộng',
      grade_level: 1,
      order_index: 1,
      created_by: admin.id,
    },
  });

  // 7. ❓ Question Templates
  const template1 = await prisma.questionTemplate.create({
    data: {
      lesson_id: lesson.id,
      template_type: 'math_addition',
      body_template_vi: 'Tính {{a}} + {{b}}',
      logic_config: { min: 1, max: 10 },
      answer_formula: 'a + b',
      explanation_template_vi: 'Cộng {{a}} và {{b}}',
    },
  });

  const template2 = await prisma.questionTemplate.create({
    data: {
      lesson_id: lesson.id,
      template_type: 'math_subtraction',
      body_template_vi: 'Tính {{a}} - {{b}}',
      logic_config: { min: 1, max: 10 },
      answer_formula: 'a - b',
      explanation_template_vi: 'Trừ {{b}} từ {{a}}',
    },
  });

  // 8. 📝 Test
  const test = await prisma.test.create({
    data: {
      title_vi: 'Bài kiểm tra phép tính',
      time_limit_seconds: 600,
      passing_score: 50,
      is_active: true,
    },
  });

  // 9. 🔗 Map templates to test
  await prisma.testTemplateMap.createMany({
    data: [
      { test_id: test.id, template_id: template1.id, weight: 1, position: 1 },
      { test_id: test.id, template_id: template2.id, weight: 1, position: 2 },
    ],
  });

  // 10. 📊 Student stats
  await prisma.studentStats.upsert({
    where: { user_id: student.id },
    update: {},
    create: {
      user_id: student.id,
      lessons_completed: 0,
      total_xp: 0,
      average_score: 0,
    },
  });

  console.log('✅ Seeding completed!');
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

export default prisma;