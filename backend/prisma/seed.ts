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
  const fixedRoleNames = ['admin', 'supervisor', 'teacher', 'sub_student', 'free_student'];

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

  const supervisorRole = await prisma.role.upsert({
    where: { name: 'supervisor' },
    update: {},
    create: { name: 'supervisor' },
  });

  const teacherRole = await prisma.role.upsert({
    where: { name: 'teacher' },
    update: {},
    create: { name: 'teacher' },
  });

  const subStudentRole = await prisma.role.upsert({
    where: { name: 'sub_student' },
    update: {},
    create: { name: 'sub_student' },
  });

  const freeStudentRole = await prisma.role.upsert({
    where: { name: 'free_student' },
    update: {},
    create: { name: 'free_student' },
  });

  const unsupportedRoles = await prisma.role.findMany({
    where: {
      name: {
        notIn: fixedRoleNames,
      },
    },
    select: { id: true },
  });

  if (unsupportedRoles.length > 0) {
    const unsupportedRoleIds = unsupportedRoles.map((role) => role.id);

    await prisma.user.updateMany({
      where: { role_id: { in: unsupportedRoleIds } },
      data: { role_id: freeStudentRole.id },
    });
    await prisma.roleSubjectPermission.deleteMany({ where: { role_id: { in: unsupportedRoleIds } } });
    await prisma.rolePermission.deleteMany({ where: { role_id: { in: unsupportedRoleIds } } });
    await prisma.role.deleteMany({ where: { id: { in: unsupportedRoleIds } } });
  }


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

  // Supervisor Permissions
  const supervisorPerms = [
    { a: 'read', r: 'lesson' },
    { a: 'manage', r: 'user' },
    { a: 'manage', r: 'lesson' },
    { a: 'manage', r: 'test' },
  ];

  for (const p of supervisorPerms) {
    await prisma.rolePermission.upsert({
      where: { role_id_action_id_resource_id: { role_id: supervisorRole.id, action_id: actions[p.a].id, resource_id: resources[p.r].id } },
      update: {},
      create: { role_id: supervisorRole.id, action_id: actions[p.a].id, resource_id: resources[p.r].id },
    });
  }

  // Student Permissions (shared for both free and sub students)
  const studentPerms = [
    { a: 'read', r: 'lesson' },
    { a: 'read', r: 'test' },
    { a: 'create', r: 'evidence' },
    { a: 'update', r: 'stats' },
  ];

  for (const role of [subStudentRole, freeStudentRole]) {
    for (const p of studentPerms) {
      await prisma.rolePermission.upsert({
        where: { role_id_action_id_resource_id: { role_id: role.id, action_id: actions[p.a].id, resource_id: resources[p.r].id } },
        update: {},
        create: { role_id: role.id, action_id: actions[p.a].id, resource_id: resources[p.r].id },
      });
    }
  }

  // 5. 🧑 Users
  const admin = await prisma.user.upsert({
    where: { email: 'admin@dev.com' },
    update: {
      role_id: adminRole.id,
      account_status: 'active',
      security: {
        upsert: {
          create: { email_verified_at: new Date(), inactive_cleanup_at: null },
          update: { email_verified_at: new Date(), inactive_cleanup_at: null },
        },
      },
    },
    create: {
      username: 'admin',
      email: 'admin@dev.com',
      country: 'Vietnam',
      password_hash: hashedPassword,
      role_id: adminRole.id,
      account_status: 'active',
      security: {
        create: { email_verified_at: new Date() },
      },
    },
  });

  const supervisor = await prisma.user.upsert({
    where: { email: 'supervisor@dev.com' },
    update: {
      role_id: supervisorRole.id,
      account_status: 'active',
      slots_purchased: 5,
      security: {
        upsert: {
          create: { email_verified_at: new Date(), inactive_cleanup_at: null },
          update: { email_verified_at: new Date(), inactive_cleanup_at: null },
        },
      },
    },
    create: {
      username: 'supervisor1',
      email: 'supervisor@dev.com',
      country: 'Vietnam',
      password_hash: hashedPassword,
      role_id: supervisorRole.id,
      account_status: 'active',
      slots_purchased: 5,
      security: {
        create: { email_verified_at: new Date() },
      },
    },
  });

  const teacher = await prisma.user.upsert({
    where: { email: 'teacher@dev.com' },
    update: {
      role_id: teacherRole.id,
      account_status: 'active',
      security: {
        upsert: {
          create: { email_verified_at: new Date(), inactive_cleanup_at: null },
          update: { email_verified_at: new Date(), inactive_cleanup_at: null },
        },
      },
    },
    create: {
      username: 'teacher1',
      email: 'teacher@dev.com',
      country: 'Vietnam',
      password_hash: hashedPassword,
      role_id: teacherRole.id,
      account_status: 'active',
      security: {
        create: { email_verified_at: new Date() },
      },
    },
  });

  const student = await prisma.user.upsert({
    where: { email: 'student@dev.com' },
    update: {
      role_id: subStudentRole.id,
      account_status: 'active',
      security: {
        upsert: {
          create: { email_verified_at: new Date(), inactive_cleanup_at: null },
          update: { email_verified_at: new Date(), inactive_cleanup_at: null },
        },
      },
    },
    create: {
      username: 'student1',
      email: 'student@dev.com',
      country: 'Vietnam',
      password_hash: hashedPassword,
      role_id: subStudentRole.id,
      account_status: 'active',
      security: {
        create: { email_verified_at: new Date() },
      },
    },
  });

  const studentTwo = await prisma.user.upsert({
    where: { email: 'student2@dev.com' },
    update: {
      role_id: freeStudentRole.id,
      account_status: 'active',
      security: {
        upsert: {
          create: { email_verified_at: new Date(), inactive_cleanup_at: null },
          update: { email_verified_at: new Date(), inactive_cleanup_at: null },
        },
      },
    },
    create: {
      username: 'student2',
      email: 'student2@dev.com',
      country: 'Vietnam',
      password_hash: hashedPassword,
      role_id: freeStudentRole.id,
      account_status: 'active',
      security: {
        create: { email_verified_at: new Date() },
      },
    },
  });

  const studentThree = await prisma.user.upsert({
    where: { email: 'student3@dev.com' },
    update: {
      role_id: freeStudentRole.id,
      account_status: 'active',
      security: {
        upsert: {
          create: { email_verified_at: new Date(), inactive_cleanup_at: null },
          update: { email_verified_at: new Date(), inactive_cleanup_at: null },
        },
      },
    },
    create: {
      username: 'student3',
      email: 'student3@dev.com',
      country: 'Singapore',
      password_hash: hashedPassword,
      role_id: freeStudentRole.id,
      account_status: 'active',
      security: {
        create: { email_verified_at: new Date() },
      },
    },
  });

  const learnUnit = await prisma.learnUnit.upsert({
    where: { supervisor_id: supervisor.id },
    update: {
      name: 'Supervisor Learn Unit',
      code: 'LU-SUPERV-001',
      max_subjects: 10,
      max_grades: 10,
      max_lessons: 10,
      max_templates: 20,
      max_teachers: 2,
      max_students: 5,
    },
    create: {
      name: 'Supervisor Learn Unit',
      code: 'LU-SUPERV-001',
      supervisor_id: supervisor.id,
      max_subjects: 10,
      max_grades: 10,
      max_lessons: 10,
      max_templates: 20,
      max_teachers: 2,
      max_students: 5,
      users: {
        connect: [
          { id: supervisor.id },
        ],
      },
    },
  });

  await prisma.user.update({
    where: { id: supervisor.id },
    data: { learn_unit_id: learnUnit.id },
  });

  await prisma.user.updateMany({
    where: { id: { in: [teacher.id, student.id] } },
    data: { learn_unit_id: learnUnit.id },
  });

  // 6. 🎓 Grades & Subjects
  console.log('  - Seeding Grades & Subjects...');
  const math = await prisma.subject.upsert({
    where: { slug: 'math' },
    update: {},
    create: { slug: 'math', title_en: 'Mathematics', title_vi: 'Toan hoc', color: '#3b82f6' },
  });

  const grade1 = await prisma.grade.upsert({
    where: { slug: 'grade-1' },
    update: { subject_id: math.id },
    create: { slug: 'grade-1', title_en: 'Grade 1', title_vi: 'Lop 1', subject_id: math.id },
  });

  const grade6 = await prisma.grade.upsert({
    where: { slug: 'grade-6' },
    update: { subject_id: math.id },
    create: { slug: 'grade-6', title_en: 'Grade 6', title_vi: 'Lop 6', subject_id: math.id },
  });

  for (const role of [adminRole, supervisorRole, teacherRole, subStudentRole, freeStudentRole]) {
    await prisma.roleSubjectPermission.upsert({
      where: { role_id_subject_id: { role_id: role.id, subject_id: math.id } },
      update: {},
      create: { role_id: role.id, subject_id: math.id },
    });
  }

  // Seed learning profiles (Option A)
  for (const u of [admin, supervisor, teacher, student, studentTwo, studentThree]) {
    await prisma.userLearningProfile.upsert({
      where: { user_id: u.id },
      update: { preferred_subject_id: math.id },
      create: { user_id: u.id, preferred_subject_id: math.id },
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

  const premiumLesson = await prisma.lesson.upsert({
    where: { id: '00000000-0000-0000-0000-000000000002' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000002',
      grade_id: grade1.id,
      subject_id: math.id,
      title_en: 'Premium Multiplication',
      title_vi: 'Phép nhân nâng cao',
      content_markdown_en: '## Learn Multiplication (Premium)',
      content_markdown_vi: '## Học phép nhân (Cao cấp)',
      order_index: 2,
      created_by: admin.id,
      is_premium: true,
    },
  });

  // 8. ❓ Question Templates (Refactored)
  console.log('  - Seeding Questions...');
  const ensureTemplate = async (data: any) => {
    const existing = await prisma.questionTemplate.findFirst({
      where: {
        lesson_id: data.lesson_id,
        template_type: data.template_type,
        body_template_en: data.body_template_en,
      },
    });

    if (existing) {
      return prisma.questionTemplate.update({
        where: { id: existing.id },
        data,
      });
    }

    return prisma.questionTemplate.create({ data });
  };

  const questionTemplates = await Promise.all([
    ensureTemplate({
      lesson_id: lesson.id,
      template_type: 'math_addition',
      difficulty: 'easy',
      body_template_en: 'Calculate {{a}} + {{b}}',
      body_template_vi: 'Tính {{a}} + {{b}}',
      logic_config: {
        variables: {
          a: { min: 1, max: 10 },
          b: { min: 1, max: 10 },
        },
      },
      accepted_formulas: ['a + b'],
      explanation_template_en: 'Add {{a}} and {{b}}.',
      explanation_template_vi: 'Cộng {{a}} và {{b}}.',
    }),
    ensureTemplate({
      lesson_id: lesson.id,
      template_type: 'math_subtraction',
      difficulty: 'easy',
      body_template_en: 'Calculate {{a}} - {{b}}',
      body_template_vi: 'Tính {{a}} - {{b}}',
      logic_config: {
        variables: {
          a: { min: 5, max: 30 },
          b: { min: 1, max: 20 },
        },
        constraints: ['a >= b'],
      },
      accepted_formulas: ['a - b'],
      explanation_template_en: 'Subtract {{b}} from {{a}}.',
      explanation_template_vi: 'Lấy {{a}} trừ {{b}}.',
    }),
    ensureTemplate({
      lesson_id: lesson.id,
      template_type: 'math_multiplication',
      difficulty: 'medium',
      body_template_en: 'Calculate {{a}} * {{b}}',
      body_template_vi: 'Tính {{a}} * {{b}}',
      logic_config: {
        variables: {
          a: { min: 2, max: 12 },
          b: { min: 2, max: 12 },
        },
      },
      accepted_formulas: ['a * b'],
      explanation_template_en: 'Multiply {{a}} by {{b}}.',
      explanation_template_vi: 'Nhân {{a}} với {{b}}.',
    }),
    ensureTemplate({
      lesson_id: lesson.id,
      template_type: 'math_exact_division',
      difficulty: 'medium',
      body_template_en: 'Calculate {{product}} / {{divisor}}',
      body_template_vi: 'Tính {{product}} / {{divisor}}',
      logic_config: {
        variables: {
          divisor: { min: 2, max: 12 },
          quotient: { min: 2, max: 12 },
        },
        derived: {
          product: 'divisor * quotient',
        },
      },
      accepted_formulas: ['quotient', 'product / divisor'],
      explanation_template_en: '{{product}} divided by {{divisor}} equals {{quotient}}.',
      explanation_template_vi: '{{product}} chia cho {{divisor}} bằng {{quotient}}.',
    }),
    ensureTemplate({
      lesson_id: lesson.id,
      template_type: 'math_missing_addend',
      difficulty: 'medium',
      body_template_en: '{{known}} + ___ = {{total}}',
      body_template_vi: '{{known}} + ___ = {{total}}',
      logic_config: {
        variables: {
          total: { min: 10, max: 50 },
          known: { min: 1, max: 49 },
        },
        derived: {
          missing: 'total - known',
        },
        constraints: ['missing > 0'],
      },
      accepted_formulas: ['missing', 'total - known'],
      explanation_template_en: 'Find the number that completes the sum.',
      explanation_template_vi: 'Tìm số còn thiếu để hoàn thành phép cộng.',
    }),
    ensureTemplate({
      lesson_id: lesson.id,
      template_type: 'math_difference_compare',
      difficulty: 'medium',
      body_template_en: 'How much greater is {{larger}} than {{smaller}}?',
      body_template_vi: '{{larger}} lớn hơn {{smaller}} bao nhiêu?',
      logic_config: {
        variables: {
          larger: { min: 10, max: 60 },
          smaller: { min: 1, max: 59 },
        },
        constraints: ['larger > smaller'],
      },
      accepted_formulas: ['larger - smaller'],
      explanation_template_en: 'Find the difference between the two numbers.',
      explanation_template_vi: 'Tìm hiệu của hai số.',
    }),
    ensureTemplate({
      lesson_id: lesson.id,
      template_type: 'true_false',
      difficulty: 'easy',
      body_template_en: 'True or false: {{a}} is greater than {{b}}.',
      body_template_vi: 'Đúng hay sai: {{a}} lớn hơn {{b}}.',
      logic_config: {
        variables: {
          a: { min: 1, max: 50 },
          b: { min: 1, max: 50 },
        },
        constraints: ['a != b'],
      },
      accepted_formulas: ['a > b'],
      explanation_template_en: 'Compare the two numbers. The answer is true when {{a}} is greater than {{b}}.',
      explanation_template_vi: 'So sánh hai số. Câu trả lời là đúng khi {{a}} lớn hơn {{b}}.',
    }),
    ensureTemplate({
      lesson_id: premiumLesson.id,
      template_type: 'geometry_rectangle_perimeter',
      difficulty: 'hard',
      is_premium: true,
      body_template_en: 'A rectangle has length {{length}} cm and width {{width}} cm. What is its perimeter?',
      body_template_vi: 'Một hình chữ nhật có chiều dài {{length}} cm và chiều rộng {{width}} cm. Chu vi là bao nhiêu?',
      logic_config: {
        variables: {
          length: { min: 3, max: 20 },
          width: { min: 2, max: 12 },
        },
        constraints: ['length >= width'],
      },
      accepted_formulas: ['2 * (length + width)', 'length + width + length + width'],
      explanation_template_en: 'Perimeter is 2 * (length + width).',
      explanation_template_vi: 'Chu vi bằng 2 * (chiều dài + chiều rộng).',
    }),
  ]);

  const template1 = questionTemplates[0];

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

  await prisma.studentStats.upsert({
    where: { user_id: studentTwo.id },
    update: {},
    create: {
      user_id: studentTwo.id,
      lessons_completed: 3,
      total_xp: 220,
      level: 2,
      average_score: 76,
    },
  });

  await prisma.studentStats.upsert({
    where: { user_id: studentThree.id },
    update: {},
    create: {
      user_id: studentThree.id,
      lessons_completed: 4,
      total_xp: 320,
      level: 2,
      average_score: 82,
    },
  });

  // 12. 💳 Plans Seeding
  console.log('  - Seeding Plans...');

  async function upsertPlan(name: string, data: any) {
    const activePlan = await prisma.plan.findFirst({
      where: { name, effect_to: null },
    });
    if (activePlan) {
      return prisma.plan.update({
        where: { id: activePlan.id },
        data,
      });
    } else {
      return prisma.plan.create({
        data: {
          name,
          effect_from: new Date(),
          effect_to: null,
          ...data,
        },
      });
    }
  }

  const freePlan = await upsertPlan('free', {
    en_name: 'Free Student',
    vi_name: 'Học Sinh Miễn Phí',
    description: 'Perfect for starting your math journey',
    price_monthly: 0,
    price_annually: 0,
    max_lessons: 5,
    max_templates: 5,
  });

  const proPlan = await upsertPlan('pro', {
    en_name: 'Premium Student',
    vi_name: 'Học Sinh Cao Cấp',
    description: 'Unlock your full potential with all premium features',
    price_monthly: 9.99,
    price_annually: 99.90,
  });

  const familyPlan = await upsertPlan('family', {
    en_name: 'Family Plan',
    vi_name: 'Gói Gia Đình',
    description: 'Supervisor account for families. Up to 5 students, 2 teachers.',
    price_monthly: 19.99,
    price_annually: 199.90,
    max_students: 5,
    max_teachers: 2,
  });

  const lcPlan = await upsertPlan('learning_center', {
    en_name: 'Learning Center',
    vi_name: 'Trung Tâm Học Tập',
    description: 'Supervisor account for learning centers. Pay-as-you-grow unlimited seats.',
    price_monthly: 49.99,
    price_annually: 499.90,
    max_students: 20,
    max_teachers: 5,
    max_subjects: 5,
    max_grades: 20,
    max_lessons: 50,
    max_templates: 200,
    price_per_student_monthly: 5.00,
    price_per_student_annually: 50.00,
    price_per_teacher_monthly: 10.00,
    price_per_teacher_annually: 100.00,
    price_per_lesson_monthly: 1.00,
    price_per_lesson_annually: 10.00,
    price_per_grade_monthly: 2.00,
    price_per_grade_annually: 20.00,
    price_per_template_monthly: 0.50,
    price_per_template_annually: 5.00,
  });

  // Create active subscription and mock invoices for the default supervisor
  const activeSub = await prisma.subscriptionPlan.upsert({
    where: { id: '00000000-0000-0000-0000-000000000001' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000001',
      user_id: supervisor.id,
      plan_id: familyPlan.id,
      status: 'active',
      billing_cycle: 'monthly',
      start_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
      end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      auto_renew: true,
      effect_from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      effect_to: null,
    }
  });

  await prisma.invoice.upsert({
    where: { id: '00000000-0000-0000-0000-000000000001' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000001',
      user_id: supervisor.id,
      subscription_plan_id: activeSub.id,
      amount: 19.99,
      billing_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      status: 'paid',
      description: 'Family Subscription Plan - Monthly Cycle',
    }
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
