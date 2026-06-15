import { Router } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../lib/db';
import { authenticate, authorize, selfOrAdmin, isAdmin } from '../middleware/auth';
import { FIXED_ROLE_NAMES, STUDENT_ROLE_NAMES, isFixedRoleName } from '../constants/roles.ts';
import { createNotification, NotificationType } from '../services/notificationService.ts';
import { createLearnUnitForSupervisor, upsertSupervisorLearnUnit, createDefaultLearnUnitName } from '../services/learnUnitService.ts';

const router = Router();

const parsePositiveInt = (value: unknown, fallback: number, max = 100) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return Math.min(Math.floor(parsed), max);
};

const fixedRoleOrder = new Map(FIXED_ROLE_NAMES.map((roleName, index) => [roleName, index]));

const sortRolesByFixedOrder = <T extends { name: string }>(roles: T[]) => {
  return [...roles].sort((left, right) => {
    const leftOrder = fixedRoleOrder.get(left.name as any) ?? Number.MAX_SAFE_INTEGER;
    const rightOrder = fixedRoleOrder.get(right.name as any) ?? Number.MAX_SAFE_INTEGER;
    return leftOrder - rightOrder || left.name.localeCompare(right.name);
  });
};

const userSelect = {
  id: true,
  username: true,
  email: true,
  country: true,
  account_status: true,
  created_at: true,
  slots_purchased: true,
  learn_unit: {
    select: {
      id: true,
      supervisor_id: true
    }
  },
  supervised_learn_unit: {
    select: {
      id: true,
      max_subjects: true,
      max_grades: true,
      max_lessons: true,
      max_templates: true,
      max_teachers: true,
      max_students: true
    }
  },
  role: {
    select: {
      id: true,
      name: true
    }
  },
  student_stats: {
    select: {
      total_xp: true,
      level: true,
      average_score: true,
      last_active: true
    }
  },
  _count: {
    select: {
      test_attempts: true,
      lessons_created: true
    }
  }
};

const serializeUser = (user: any) => ({
  id: user.id,
  username: user.username,
  email: user.email,
  country: user.country,
  account_status: user.account_status,
  role: user.role,
  created_at: user.created_at,
  slots_purchased: user.slots_purchased ?? 0,
  supervisor_id: user.learn_unit?.supervisor_id ?? null,
  max_subjects: user.supervised_learn_unit?.max_subjects ?? null,
  max_grades: user.supervised_learn_unit?.max_grades ?? null,
  max_lessons: user.supervised_learn_unit?.max_lessons ?? null,
  max_templates: user.supervised_learn_unit?.max_templates ?? null,
  max_teachers: user.supervised_learn_unit?.max_teachers ?? null,
  max_students: user.supervised_learn_unit?.max_students ?? null,
  stats: user.student_stats,
  attempts: user._count?.test_attempts ?? 0,
  lessons_created: user._count?.lessons_created ?? 0
});

const parseUserPayload = (body: any, requirePassword = true) => {
  const username = typeof body.username === 'string' ? body.username.trim() : '';
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const password = typeof body.password === 'string' ? body.password : '';
  const roleName = typeof body.role_name === 'string' ? body.role_name.trim() : '';
  const country = typeof body.country === 'string' ? body.country.trim() : '';
  const slots_purchased = typeof body.slots_purchased !== 'undefined' ? Number(body.slots_purchased) : undefined;
  const max_subjects = typeof body.max_subjects !== 'undefined'
    ? (body.max_subjects === null ? null : Number(body.max_subjects))
    : undefined;
  const max_grades = typeof body.max_grades !== 'undefined'
    ? (body.max_grades === null ? null : Number(body.max_grades))
    : undefined;
  const max_lessons = typeof body.max_lessons !== 'undefined'
    ? (body.max_lessons === null ? null : Number(body.max_lessons))
    : undefined;
  const max_templates = typeof body.max_templates !== 'undefined' 
    ? (body.max_templates === null ? null : Number(body.max_templates)) 
    : undefined;
  const max_teachers = typeof body.max_teachers !== 'undefined' 
    ? (body.max_teachers === null ? null : Number(body.max_teachers)) 
    : undefined;
  const max_students = typeof body.max_students !== 'undefined' 
    ? (body.max_students === null ? null : Number(body.max_students)) 
    : undefined;

  if (!username) return { error: 'Username is required' };
  if (!email || !email.includes('@')) return { error: 'A valid email is required' };
  if (requirePassword && password.length < 6) {
    return { error: 'Password must be at least 6 characters' };
  }
  if (!requirePassword && password && password.length < 6) {
    return { error: 'Password must be at least 6 characters' };
  }
  if (!roleName) return { error: 'Role is required' };
  if (!isFixedRoleName(roleName)) return { error: 'Role must be one of the fixed system roles' };
  if (typeof slots_purchased !== 'undefined' && (isNaN(slots_purchased) || slots_purchased < 0)) {
    return { error: 'Supervisor seats must be a non-negative number' };
  }
  if (typeof max_subjects === 'number' && (isNaN(max_subjects) || max_subjects < 0)) {
    return { error: 'Subjects limit must be a non-negative number' };
  }
  if (typeof max_grades === 'number' && (isNaN(max_grades) || max_grades < 0)) {
    return { error: 'Grades limit must be a non-negative number' };
  }
  if (typeof max_lessons === 'number' && (isNaN(max_lessons) || max_lessons < 0)) {
    return { error: 'Lessons limit must be a non-negative number' };
  }
  if (typeof max_templates === 'number' && (isNaN(max_templates) || max_templates < 0)) {
    return { error: 'Templates limit must be a non-negative number' };
  }
  if (typeof max_teachers === 'number' && (isNaN(max_teachers) || max_teachers < 0)) {
    return { error: 'Teachers limit must be a non-negative number' };
  }
  if (typeof max_students === 'number' && (isNaN(max_students) || max_students < 0)) {
    return { error: 'Students limit must be a non-negative number' };
  }

  return {
    username,
    email,
    password,
    roleName,
    country,
    slots_purchased,
    max_subjects,
    max_grades,
    max_lessons,
    max_templates,
    max_teachers,
    max_students
  };
};

router.get('/roles', authenticate, isAdmin, async (req, res) => {
  try {
    const roles = await prisma.role.findMany({
      where: { name: { in: [...FIXED_ROLE_NAMES] } },
      select: { id: true, name: true }
    });

    res.json(sortRolesByFixedOrder(roles));
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch roles', details: error.message });
  }
});

router.get('/users', authenticate, isAdmin, async (req, res) => {
  try {
    const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
    const role = typeof req.query.role === 'string' ? req.query.role.trim() : '';
    const page = parsePositiveInt(req.query.page, 1);
    const pageSize = parsePositiveInt(req.query.pageSize, 10);
    const where = {
      ...(search
        ? {
            OR: [
              { username: { contains: search, mode: 'insensitive' as const } },
              { email: { contains: search, mode: 'insensitive' as const } }
            ]
          }
        : {}),
      ...(role ? { role: { name: role } } : {})
    };

    const [total, users, totalAdmins, totalStudents] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        orderBy: { created_at: 'desc' },
        select: userSelect,
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.user.count({ where: { ...where, role: { name: 'admin' } } }),
      prisma.user.count({ where: { ...where, role: { name: { in: [...STUDENT_ROLE_NAMES] } } } }),
    ]);

    res.json({
      items: users.map(serializeUser),
      summary: {
        total,
        admins: totalAdmins,
        students: totalStudents,
      },
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
        hasMore: page * pageSize < total,
      }
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch users', details: error.message });
  }
});

router.get('/subject-access-requests', authenticate, isAdmin, async (req, res) => {
  try {
    const status = typeof req.query.status === 'string' ? req.query.status.trim().toLowerCase() : 'pending';
    const where = status === 'all' ? {} : { status };

    const requests = await prisma.userSubjectAccessRequest.findMany({
      where,
      orderBy: [
        { requested_at: 'desc' },
        { id: 'desc' }
      ],
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true,
            role: { select: { id: true, name: true } }
          }
        },
        subject: true,
        reviewer: {
          select: {
            id: true,
            username: true,
            email: true
          }
        }
      }
    });

    res.json(requests);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch subject access requests', details: error.message });
  }
});

router.patch('/subject-access-requests/:id', authenticate, isAdmin, async (req, res) => {
  try {
    const requestId = Number(req.params.id);
    const status = typeof req.body.status === 'string' ? req.body.status.trim().toLowerCase() : '';
    const reviewerId = (req as any).user?.id as string;

    if (!Number.isInteger(requestId)) {
      return res.status(400).json({ error: 'Invalid request id' });
    }

    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Status must be approved or rejected' });
    }

    const request = await prisma.userSubjectAccessRequest.update({
      where: { id: requestId },
      data: {
        status,
        reviewed_at: new Date(),
        reviewed_by: reviewerId
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true,
            role: { select: { id: true, name: true } }
          }
        },
        subject: true,
        reviewer: {
          select: {
            id: true,
            username: true,
            email: true
          }
        }
      }
    });

    await createNotification({
      recipientId: request.user.id,
      actorId: reviewerId,
      type: status === 'approved' ? NotificationType.SubjectAccessApproved : NotificationType.SubjectAccessRejected,
      entityType: 'subject_access_request',
      entityId: String(request.id),
      payload: {
        request_id: request.id,
        subject_id: request.subject.id,
        subject_slug: request.subject.slug,
        subject_title_en: request.subject.title_en,
        subject_title_vi: request.subject.title_vi,
        status,
      }
    });

    res.json(request);
  } catch (error: any) {
    if (error?.code === 'P2025') {
      return res.status(404).json({ error: 'Request not found' });
    }
    res.status(500).json({ error: 'Failed to update subject access request', details: error.message });
  }
});

router.get('/users/:id/insights', authenticate, selfOrAdmin('id'), async (req, res) => {
  try {
    const userId = req.params.id as string;

    const [
      user,
      attemptSummary,
      bestAttempt,
      recentAttempts,
      mastery,
      achievements,
      xpLogs
    ] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: userSelect
      }) as any,
      prisma.testAttempt.aggregate({
        where: { user_id: userId },
        _count: { id: true },
        _avg: { total_score: true },
        _max: { total_score: true }
      }) as any,
      prisma.testAttempt.findFirst({
        where: { user_id: userId, total_score: { not: null } },
        orderBy: { total_score: 'desc' },
        include: {
          lesson: {
            select: {
              id: true,
              title_en: true,
              title_vi: true
            }
          }
        }
      }) as any,
      prisma.testAttempt.findMany({
        where: { user_id: userId },
        take: 8,
        orderBy: { started_at: 'desc' },
        include: {
          lesson: {
            select: {
              id: true,
              title_en: true,
              title_vi: true
            }
          },
          _count: {
            select: { snapshots: true }
          }
        }
      }),
      prisma.userLessonMastery.findMany({
        where: { user_id: userId },
        take: 8,
        orderBy: { last_activity_at: 'desc' },
        include: {
          lesson: {
            select: {
              id: true,
              title_en: true,
              title_vi: true
            }
          }
        }
      }),
      prisma.userAchievement.findMany({
        where: { user_id: userId },
        take: 6,
        orderBy: { earned_at: 'desc' },
        include: {
          achievement: {
            select: {
              id: true,
              slug: true,
              title_en: true,
              title_vi: true,
              category: true,
              xp_reward: true,
              icon: true
            }
          }
        }
      }) as any,
      prisma.xpLog.findMany({
        where: { user_id: userId },
        take: 6,
        orderBy: { occurred_at: 'desc' },
        select: {
          id: true,
          amount: true,
          reason: true,
          occurred_at: true
        }
      }) as any
    ]);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      user: serializeUser(user),
      summary: {
        attempts: (attemptSummary as any)._count.id,
        avgScore: Number((attemptSummary as any)._avg.total_score || 0),
        bestScore: Number((attemptSummary as any)._max.total_score || 0),
        completedLessons: (user as any).student_stats?.lessons_completed || 0,
        totalXp: (user as any).student_stats?.total_xp || 0,
        level: (user as any).student_stats?.level || 1,
        lastActive: (user as any).student_stats?.last_active || null
      },
      bestAttempt: bestAttempt
        ? {
            id: (bestAttempt as any).id,
            score: Number((bestAttempt as any).total_score || 0),
            started_at: (bestAttempt as any).started_at,
            completed_at: (bestAttempt as any).completed_at,
            is_practice: (bestAttempt as any).is_practice,
            lesson: (bestAttempt as any).lesson
          }
        : null,
      recentAttempts: (recentAttempts as any[]).map((attempt: any) => ({
        id: attempt.id,
        total_score: Number(attempt.total_score || 0),
        is_completed: attempt.is_completed,
        is_practice: attempt.is_practice,
        started_at: attempt.started_at,
        completed_at: attempt.completed_at,
        question_count: attempt._count?.snapshots || 0,
        lesson: attempt.lesson
      })),
      mastery: (mastery as any[]).map((record: any) => ({
        lesson_id: record.lesson_id,
        mastery_score: Number(record.mastery_score || 0),
        total_study_time: record.total_study_time,
        total_test_time: record.total_test_time,
        completion_status: record.completion_status,
        last_activity_at: record.last_activity_at,
        lesson: record.lesson
      })),
      achievements: (achievements as any[]).map((record: any) => ({
        earned_at: record.earned_at,
        achievement: record.achievement || record.achievement_id
      })),
      xpLogs
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch user insights', details: error.message });
  }
});


router.post('/users', authenticate, isAdmin, async (req, res) => {
  try {
    const payload = parseUserPayload(req.body, true);
    if ('error' in payload) return res.status(400).json({ error: payload.error });

    const roleRecord = await prisma.role.findUnique({ where: { name: payload.roleName } });
    if (!roleRecord) return res.status(400).json({ error: 'Invalid role specified' });

    const passwordHash = await bcrypt.hash(payload.password, 10);

    const user = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          username: payload.username,
          email: payload.email,
          country: payload.country || null,
          password_hash: passwordHash,
          role_id: roleRecord.id,
          slots_purchased: payload.slots_purchased ?? (payload.roleName === 'supervisor' ? 1 : 0),
          student_stats: {
            create: {}
          }
        }
      });

      if (payload.roleName === 'supervisor') {
        const learnUnit = await createLearnUnitForSupervisor(
          newUser.id,
          createDefaultLearnUnitName(payload.username),
          {
            max_subjects: payload.max_subjects,
            max_grades: payload.max_grades,
            max_lessons: payload.max_lessons,
            max_templates: payload.max_templates,
            max_teachers: payload.max_teachers,
            max_students: payload.max_students,
          },
          tx as typeof prisma
        );

        return tx.user.update({
          where: { id: newUser.id },
          data: { learn_unit_id: learnUnit.id },
          select: userSelect
        });
      }

      return tx.user.findUnique({
        where: { id: newUser.id },
        select: userSelect
      });
    });

    res.status(201).json(serializeUser(user));
  } catch (error: any) {
    if (error?.code === 'P2002') {
      return res.status(409).json({ error: 'Username or email already exists' });
    }
    res.status(500).json({ error: 'Failed to create user', details: error.message });
  }
});

router.patch('/users/:id', authenticate, selfOrAdmin('id'), async (req, res) => {
  try {
    const payload = parseUserPayload(req.body, false);
    if ('error' in payload) return res.status(400).json({ error: payload.error });

    const isAdmin = (req as any).user.role === 'admin';
    const roleRecord = await prisma.role.findUnique({ where: { name: payload.roleName } });
    if (!roleRecord) return res.status(400).json({ error: 'Invalid role specified' });

    // Security check: Only admins can change roles
    const existingUser = await prisma.user.findUnique({ where: { id: req.params.id as string } });
    if (!existingUser) return res.status(404).json({ error: 'User not found' });

    if (!isAdmin && existingUser.role_id !== roleRecord.id) {
      return res.status(403).json({ error: "You are not allowed to change your own role. Contact an administrator." });
    }

    const data: any = {
      username: payload.username,
      email: payload.email,
      country: payload.country || null,
    };

    // Only update role and slots_purchased and limits if user is admin
    if (isAdmin) {
      data.role_id = roleRecord.id;
      if (typeof payload.slots_purchased !== 'undefined') {
        data.slots_purchased = payload.slots_purchased;
      }
    }

    if (payload.password) {
      data.password_hash = await bcrypt.hash(payload.password, 10);
    }

    const user = await prisma.$transaction(async (tx) => {
      const isSupervisor = roleRecord.name === 'supervisor';
      if (isSupervisor && isAdmin) {
        const limits: any = {};
        if (typeof payload.max_subjects !== 'undefined') limits.max_subjects = payload.max_subjects;
        if (typeof payload.max_grades !== 'undefined') limits.max_grades = payload.max_grades;
        if (typeof payload.max_lessons !== 'undefined') limits.max_lessons = payload.max_lessons;
        if (typeof payload.max_templates !== 'undefined') limits.max_templates = payload.max_templates;
        if (typeof payload.max_teachers !== 'undefined') limits.max_teachers = payload.max_teachers;
        if (typeof payload.max_students !== 'undefined') limits.max_students = payload.max_students;

        if (Object.keys(limits).length > 0) {
          const learnUnit = await upsertSupervisorLearnUnit(
            req.params.id as string,
            createDefaultLearnUnitName(payload.username || existingUser.username),
            limits,
            tx as typeof prisma
          );
          data.learn_unit_id = learnUnit.id;
        }
      }

      const updatedUser = await tx.user.update({
        where: { id: req.params.id as string },
        data,
        select: userSelect
      });

      await tx.studentStats.upsert({
        where: { user_id: updatedUser.id },
        update: {},
        create: { user_id: updatedUser.id }
      });

      return updatedUser;
    });

    res.json(serializeUser(user));
  } catch (error: any) {
    if (error?.code === 'P2002') {
      return res.status(409).json({ error: 'Username or email already exists' });
    }
    if (error?.code === 'P2025') {
      return res.status(404).json({ error: 'User not found' });
    }
    res.status(500).json({ error: 'Failed to update user', details: error.message });
  }
});

router.delete('/users/:id', authenticate, isAdmin, async (req, res) => {
  try {
    const currentUserId = (req as any).user?.id;
    if (req.params.id === currentUserId) {
      return res.status(400).json({ error: 'You cannot delete your own account' });
    }

    await prisma.$transaction([
      prisma.auditLog.deleteMany({ where: { user_id: req.params.id as string } }),
      prisma.lesson.updateMany({ where: { created_by: req.params.id as string }, data: { created_by: null } }),
      prisma.user.delete({ where: { id: req.params.id as string } })
    ]);

    res.status(204).send();
  } catch (error: any) {
    if (error?.code === 'P2025') {
      return res.status(404).json({ error: 'User not found' });
    }
    res.status(500).json({ error: 'Failed to delete user', details: error.message });
  }
});

// Get Admin or Supervisor Statistics
router.get('/stats', authenticate, async (req, res) => {
  try {
    const userRole = (req as any).user.role;
    const userId = (req as any).user.id;

    if (userRole !== 'admin' && userRole !== 'supervisor') {
      return res.status(403).json({ message: "Admin or Supervisor access required" });
    }

    const recentActivityPage = parsePositiveInt(req.query.recentActivityPage, 1);
    const recentActivityPageSize = parsePositiveInt(req.query.recentActivityPageSize, 10);

    let userWhere: any = {};
    let lessonWhere: any = {};
    let attemptWhere: any = {};

    if (userRole === 'supervisor') {
      const learnUnit = await prisma.learnUnit.findUnique({
        where: { supervisor_id: userId }
      });
      if (!learnUnit) {
        return res.json({
          summary: { users: 0, lessons: 0, attempts: 0, avgScore: 0 },
          topUsers: [],
          recentActivity: [],
          recentActivityPagination: {
            page: recentActivityPage,
            pageSize: recentActivityPageSize,
            total: 0,
            totalPages: 1,
            hasMore: false,
          },
          activityHistory: []
        });
      }

      const members = await prisma.user.findMany({
        where: { learn_unit_id: learnUnit.id },
        select: { id: true }
      });
      const memberIds = [...members.map(m => m.id), userId];

      userWhere = { learn_unit_id: learnUnit.id };
      lessonWhere = { created_by: { in: memberIds } };
      attemptWhere = { user_id: { in: memberIds } };
    }

    const [
      userCount,
      lessonCount,
      attemptCount,
      topUsers,
      recentActivityTotal,
      recentAttempts
    ] = await Promise.all([
      prisma.user.count({ where: userWhere }),
      prisma.lesson.count({ where: lessonWhere }),
      prisma.testAttempt.count({ where: attemptWhere }),
      prisma.user.findMany({
        take: 5,
        where: userWhere,
        select: {
          id: true,
          username: true,
          email: true,
          student_stats: true,
          _count: {
            select: { test_attempts: true }
          }
        },
        orderBy: {
          test_attempts: { _count: 'desc' }
        }
      }),
      prisma.testAttempt.count({ where: attemptWhere }),
      prisma.testAttempt.findMany({
        take: recentActivityPageSize,
        skip: (recentActivityPage - 1) * recentActivityPageSize,
        where: attemptWhere,
        orderBy: { started_at: 'desc' },
        include: {
          user: { select: { id: true, username: true, email: true } },
          lesson: { select: { title_en: true, title_vi: true } }
        }
      })
    ]);

    // Get activity history for the last 14 days
    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

    const [dailyRegistrations, dailyAttempts] = await Promise.all([
      prisma.user.groupBy({
        by: ['created_at'],
        where: {
          ...userWhere,
          created_at: { gte: fourteenDaysAgo }
        },
        _count: { id: true }
      }),
      prisma.testAttempt.groupBy({
        by: ['started_at'],
        where: {
          ...attemptWhere,
          started_at: { gte: fourteenDaysAgo }
        },
        _count: { id: true }
      })
    ]);

    // Aggregate by day
    const historyMap = new Map();
    for (let i = 0; i < 14; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      historyMap.set(dateStr, { date: dateStr, users: 0, attempts: 0 });
    }

    dailyRegistrations.forEach(reg => {
      const dateStr = reg.created_at.toISOString().split('T')[0];
      if (historyMap.has(dateStr)) {
        historyMap.get(dateStr).users += reg._count.id;
      }
    });

    dailyAttempts.forEach(att => {
      const dateStr = att.started_at.toISOString().split('T')[0];
      if (historyMap.has(dateStr)) {
        historyMap.get(dateStr).attempts += att._count.id;
      }
    });

    const activityHistory = Array.from(historyMap.values()).sort((a, b) => a.date.localeCompare(b.date));

    // Average score across all attempts
    const avgScoreResult = await prisma.testAttempt.aggregate({
      where: {
        ...attemptWhere,
        is_completed: true
      },
      _avg: { total_score: true }
    });

    res.json({
      summary: {
        users: userCount,
        lessons: lessonCount,
        attempts: attemptCount,
        avgScore: avgScoreResult._avg.total_score || 0
      },
      topUsers: topUsers.map(u => ({
        id: u.id,
        username: u.username,
        email: u.email,
        attempts: u._count.test_attempts,
        xp: u.student_stats?.total_xp || 0
      })),
      recentActivity: recentAttempts,
      recentActivityPagination: {
        page: recentActivityPage,
        pageSize: recentActivityPageSize,
        total: recentActivityTotal,
        totalPages: Math.max(1, Math.ceil(recentActivityTotal / recentActivityPageSize)),
        hasMore: recentActivityPage * recentActivityPageSize < recentActivityTotal,
      },
      activityHistory
    });
  } catch (error: any) {
    res.status(500).json({ error: "Failed to fetch stats", details: error.message });
  }
});

export default router;
