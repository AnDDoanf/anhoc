import { Router } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../lib/db';
import { authenticate, authorize, selfOrAdmin } from '../middleware/auth';

const router = Router();

const userSelect = {
  id: true,
  username: true,
  email: true,
  created_at: true,
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
  role: user.role,
  created_at: user.created_at,
  stats: user.student_stats,
  attempts: user._count?.test_attempts ?? 0,
  lessons_created: user._count?.lessons_created ?? 0
});

const roleInclude = {
  permissions: {
    include: {
      action: true,
      resource: true
    }
  },
  subject_permissions: {
    include: {
      subject: true
    }
  },
  _count: {
    select: { users: true }
  }
};

const serializeRole = (role: any) => ({
  id: role.id,
  name: role.name,
  users: role._count?.users ?? 0,
  permissions: role.permissions?.map((permission: any) => ({
    id: permission.id,
    action_id: permission.action_id,
    action: permission.action,
    resource_id: permission.resource_id,
    resource: permission.resource
  })) ?? [],
  subject_ids: role.subject_permissions?.map((permission: any) => permission.subject_id) ?? [],
  subjects: role.subject_permissions?.map((permission: any) => permission.subject) ?? []
});

const syncRoleAccess = async (
  roleId: number,
  permissionIds: Array<{ action_id: number; resource_id: number }>,
  subjectIds: number[]
) => {
  await prisma.$transaction([
    prisma.rolePermission.deleteMany({ where: { role_id: roleId } }),
    prisma.roleSubjectPermission.deleteMany({ where: { role_id: roleId } }),
    ...(permissionIds.length > 0
      ? [
          prisma.rolePermission.createMany({
            data: permissionIds.map((permission) => ({
              role_id: roleId,
              action_id: permission.action_id,
              resource_id: permission.resource_id
            })),
            skipDuplicates: true
          })
        ]
      : []),
    ...(subjectIds.length > 0
      ? [
          prisma.roleSubjectPermission.createMany({
            data: subjectIds.map((subjectId) => ({
              role_id: roleId,
              subject_id: subjectId
            })),
            skipDuplicates: true
          })
        ]
      : [])
  ]);
};

const parseUserPayload = (body: any, requirePassword = true) => {
  const username = typeof body.username === 'string' ? body.username.trim() : '';
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const password = typeof body.password === 'string' ? body.password : '';
  const roleName = typeof body.role_name === 'string' ? body.role_name.trim() : '';

  if (!username) return { error: 'Username is required' };
  if (!email || !email.includes('@')) return { error: 'A valid email is required' };
  if (requirePassword && password.length < 6) {
    return { error: 'Password must be at least 6 characters' };
  }
  if (!requirePassword && password && password.length < 6) {
    return { error: 'Password must be at least 6 characters' };
  }
  if (!roleName) return { error: 'Role is required' };

  return { username, email, password, roleName };
};

router.get('/roles', authenticate, authorize('manage', 'user'), async (req, res) => {
  try {
    const roles = await prisma.role.findMany({
      orderBy: { name: 'asc' },
      select: { id: true, name: true }
    });

    res.json(roles);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch roles', details: error.message });
  }
});

router.get('/access-control', authenticate, authorize('manage', 'user'), async (req, res) => {
  try {
    const [roles, actions, resources, subjects, users] = await Promise.all([
      prisma.role.findMany({
        orderBy: { name: 'asc' },
        include: roleInclude
      }),
      prisma.action.findMany({ orderBy: { name: 'asc' } }),
      prisma.resource.findMany({ orderBy: { name: 'asc' } }),
      prisma.subject.findMany({ orderBy: { id: 'asc' } }),
      prisma.user.findMany({
        orderBy: { created_at: 'desc' },
        select: {
          id: true,
          username: true,
          email: true,
          role: { select: { id: true, name: true } }
        }
      })
    ]);

    res.json({
      roles: roles.map(serializeRole),
      actions,
      resources,
      subjects,
      users
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch access control data', details: error.message });
  }
});

router.post('/roles', authenticate, authorize('manage', 'user'), async (req, res) => {
  try {
    const name = typeof req.body.name === 'string' ? req.body.name.trim().toLowerCase() : '';
    const permissions = Array.isArray(req.body.permissions) ? req.body.permissions : [];
    const subjectIds = Array.isArray(req.body.subject_ids)
      ? req.body.subject_ids.map((id: unknown) => Number(id)).filter(Number.isInteger)
      : [];

    if (!name) return res.status(400).json({ error: 'Role name is required' });

    const role = await prisma.role.create({ data: { name } });
    await syncRoleAccess(role.id, permissions, subjectIds);

    const freshRole = await prisma.role.findUnique({
      where: { id: role.id },
      include: roleInclude
    });

    res.status(201).json(serializeRole(freshRole));
  } catch (error: any) {
    if (error?.code === 'P2002') {
      return res.status(409).json({ error: 'Role name already exists' });
    }
    res.status(500).json({ error: 'Failed to create role', details: error.message });
  }
});

router.put('/roles/:id', authenticate, authorize('manage', 'user'), async (req, res) => {
  try {
    const roleId = Number(req.params.id);
    const name = typeof req.body.name === 'string' ? req.body.name.trim().toLowerCase() : '';
    const permissions = Array.isArray(req.body.permissions) ? req.body.permissions : [];
    const subjectIds = Array.isArray(req.body.subject_ids)
      ? req.body.subject_ids.map((id: unknown) => Number(id)).filter(Number.isInteger)
      : [];

    if (!Number.isInteger(roleId)) return res.status(400).json({ error: 'Invalid role id' });
    if (!name) return res.status(400).json({ error: 'Role name is required' });

    await prisma.role.update({
      where: { id: roleId },
      data: { name }
    });
    await syncRoleAccess(roleId, permissions, subjectIds);

    const freshRole = await prisma.role.findUnique({
      where: { id: roleId },
      include: roleInclude
    });

    res.json(serializeRole(freshRole));
  } catch (error: any) {
    if (error?.code === 'P2002') {
      return res.status(409).json({ error: 'Role name already exists' });
    }
    if (error?.code === 'P2025') {
      return res.status(404).json({ error: 'Role not found' });
    }
    res.status(500).json({ error: 'Failed to update role', details: error.message });
  }
});

router.patch('/users/:id/role', authenticate, authorize('manage', 'user'), async (req, res) => {
  try {
    const roleId = Number(req.body.role_id);
    if (!Number.isInteger(roleId)) return res.status(400).json({ error: 'Invalid role id' });

    const user = await prisma.user.update({
      where: { id: req.params.id as string },
      data: { role_id: roleId },
      select: userSelect
    });

    res.json(serializeUser(user as any));
  } catch (error: any) {
    if (error?.code === 'P2025') {
      return res.status(404).json({ error: 'User or role not found' });
    }
    res.status(500).json({ error: 'Failed to assign role', details: error.message });
  }
});

router.get('/users', authenticate, authorize('manage', 'user'), async (req, res) => {
  try {
    const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
    const role = typeof req.query.role === 'string' ? req.query.role.trim() : '';

    const users = await prisma.user.findMany({
      where: {
        ...(search
          ? {
              OR: [
                { username: { contains: search, mode: 'insensitive' } },
                { email: { contains: search, mode: 'insensitive' } }
              ]
            }
          : {}),
        ...(role ? { role: { name: role } } : {})
      },
      orderBy: { created_at: 'desc' },
      select: userSelect
    });

    res.json(users.map(serializeUser));
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch users', details: error.message });
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

router.post('/users', authenticate, authorize('manage', 'user'), async (req, res) => {
  try {
    const payload = parseUserPayload(req.body, true);
    if ('error' in payload) return res.status(400).json({ error: payload.error });

    const roleRecord = await prisma.role.findUnique({ where: { name: payload.roleName } });
    if (!roleRecord) return res.status(400).json({ error: 'Invalid role specified' });

    const passwordHash = await bcrypt.hash(payload.password, 10);

    const user = await prisma.user.create({
      data: {
        username: payload.username,
        email: payload.email,
        password_hash: passwordHash,
        role_id: roleRecord.id,
        student_stats: {
          create: {}
        }
      },
      select: userSelect
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
    };

    // Only update role if user is admin
    if (isAdmin) {
      data.role_id = roleRecord.id;
    }

    if (payload.password) {
      data.password_hash = await bcrypt.hash(payload.password, 10);
    }

    const user = await prisma.user.update({
      where: { id: req.params.id as string },
      data,
      select: userSelect
    });

    await prisma.studentStats.upsert({
      where: { user_id: user.id },
      update: {},
      create: { user_id: user.id }
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

router.delete('/users/:id', authenticate, authorize('manage', 'user'), async (req, res) => {
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

// Get Admin Statistics
router.get('/stats', authenticate, authorize('manage', 'lesson'), async (req, res) => {
  try {
    const [
      userCount,
      lessonCount,
      attemptCount,
      topUsers,
      recentAttempts
    ] = await Promise.all([
      prisma.user.count(),
      prisma.lesson.count(),
      prisma.testAttempt.count(),
      prisma.user.findMany({
        take: 5,
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
      prisma.testAttempt.findMany({
        take: 10,
        orderBy: { started_at: 'desc' },
        include: {
          user: { select: { id: true, username: true, email: true } },
          lesson: { select: { title_en: true, title_vi: true } }
        }
      })
    ]);

    // Average score across all attempts
    const avgScoreResult = await prisma.testAttempt.aggregate({
      where: { is_completed: true },
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
      recentActivity: recentAttempts
    });
  } catch (error: any) {
    res.status(500).json({ error: "Failed to fetch admin stats", details: error.message });
  }
});

export default router;
