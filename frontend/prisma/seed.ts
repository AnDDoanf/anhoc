import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import bcrypt from 'bcryptjs';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Seeding database with Integrated Hierarchy...');
  const hashedPassword = await bcrypt.hash('123456', 10);

  // 1. 🔑 Actions
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
  const resourcesArr = ['user', 'lesson', 'test', 'stats', 'achievement', 'evidence', 'audit_log'];
  const resources: Record<string, any> = {};
  for (const name of resourcesArr) {
    resources[name] = await prisma.resource.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }

  // 3. 🛡️ Roles
  const adminRole = await prisma.role.upsert({
    where: { name: 'admin' },
    update: {},
    create: { name: 'admin' },
  });

  const teacherRole = await prisma.role.upsert({
    where: { name: 'teacher' },
    update: {},
    create: { name: 'teacher' },
  });

  const studentRole = await prisma.role.upsert({
    where: { name: 'student' },
    update: {},
    create: { name: 'student' },
  });

  // 4. 📜 Permissions Mapping
  // Admin: Manage everything
  for (const res of resourcesArr) {
    await prisma.rolePermission.upsert({
      where: { role_id_action_id_resource_id: { role_id: adminRole.id, action_id: actions['manage'].id, resource_id: resources[res].id } },
      update: {},
      create: { role_id: adminRole.id, action_id: actions['manage'].id, resource_id: resources[res].id },
    });
  }

  // Teacher Permissions
  const teacherPerms = [
    { a: 'manage', r: 'lesson' },
    { a: 'manage', r: 'test' },
    { a: 'read', r: 'evidence' },
    { a: 'read', r: 'audit_log' },
  ];

  for (const p of teacherPerms) {
    await prisma.rolePermission.upsert({
      where: { role_id_action_id_resource_id: { role_id: teacherRole.id, action_id: actions[p.a].id, resource_id: resources[p.r].id } },
      update: {},
      create: { role_id: teacherRole.id, action_id: actions[p.a].id, resource_id: resources[p.r].id },
    });
  }

  // Student Permissions
  const studentPerms = [
    { a: 'read', r: 'lesson' },
    { a: 'read', r: 'test' },
    { a: 'create', r: 'evidence' },
    { a: 'update', r: 'stats' },
  ];

  for (const p of studentPerms) {
    await prisma.rolePermission.upsert({
      where: { role_id_action_id_resource_id: { role_id: studentRole.id, action_id: actions[p.a].id, resource_id: resources[p.r].id } },
      update: {},
      create: { role_id: studentRole.id, action_id: actions[p.a].id, resource_id: resources[p.r].id },
    });
  }

  // 5. 🧑 Users
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

  const teacher = await prisma.user.upsert({
    where: { email: 'teacher@dev.com' },
    update: {},
    create: {
      username: 'teacher1',
      email: 'teacher@dev.com',
      password_hash: hashedPassword,
      role_id: teacherRole.id,
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

  // 6. 🎓 Grades & Subjects
  console.log('  - Seeding Grades & Subjects...');
  const grade1 = await prisma.grade.upsert({
    where: { slug: 'grade-1' },
    update: { subject_id: math.id },
    create: { slug: 'grade-1', title_en: 'Grade 1', title_vi: 'Lớp 1', subject_id: math.id },
  });

  const grade6 = await prisma.grade.upsert({
    where: { slug: 'grade-6' },
    update: { subject_id: math.id },
    create: { slug: 'grade-6', title_en: 'Grade 6', title_vi: 'Lớp 6', subject_id: math.id },
  });

  const math = await prisma.subject.upsert({
    where: { slug: 'math' },
    update: {},
    create: { slug: 'math', title_en: 'Mathematics', title_vi: 'Toán học', color: '#3b82f6' },
  });

  for (const role of [adminRole, teacherRole, studentRole]) {
    await prisma.roleSubjectPermission.upsert({
      where: { role_id_subject_id: { role_id: role.id, subject_id: math.id } },
      update: {},
      create: { role_id: role.id, subject_id: math.id },
    });
  }

  // 7. 📚 Lesson (Refactored)
  console.log('  - Seeding Lessons...');
  const lesson = await prisma.lesson.upsert({
    where: { id: '00000000-0000-0000-0000-000000000001' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000001',
      grade_id: grade1.id,
      subject_id: math.id,
      title_en: 'Basic Addition',
      title_vi: 'Phép cộng cơ bản',
      content_markdown_en: '## Learn Addition',
      content_markdown_vi: '## Học phép cộng',
      order_index: 1,
      created_by: admin.id,
    },
  });

  // 8. ❓ Question Templates (Refactored)
  console.log('  - Seeding Questions...');
  const template1 = await prisma.questionTemplate.create({
    data: {
      lesson_id: lesson.id,
      template_type: 'math_addition',
      body_template_en: 'Calculate {{a}} + {{b}}',
      body_template_vi: 'Tính {{a}} + {{b}}',
      logic_config: { min: 1, max: 10 },
      answer_formula: 'a + b',
      explanation_template_en: 'Add {{a}} and {{b}}',
      explanation_template_vi: 'Cộng {{a}} và {{b}}',
    },
  });

  // 9. 📝 Test (Refactored)
  console.log('  - Seeding Tests...');
  const test = await prisma.test.create({
    data: {
      title_en: 'Basic Operations Test',
      title_vi: 'Bài kiểm tra phép tính',
      time_limit_seconds: 600,
      passing_score: 50,
      is_active: true,
    },
  });

  await prisma.testTemplateMap.create({
    data: { test_id: test.id, template_id: template1.id, weight: 1, position: 1 },
  });

  // 10. 🏆 Achievements
  console.log('  - Seeding Achievements...');
  await prisma.achievement.upsert({
    where: { slug: 'first-lesson' },
    update: {},
    create: {
      slug: 'first-lesson',
      title_en: 'First Steps',
      title_vi: 'Những bước đầu tiên',
      xp_reward: 100,
    },
  });

  // 11. 📊 Student stats
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

  console.log('✅ Integrated Seeding completed!');
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
