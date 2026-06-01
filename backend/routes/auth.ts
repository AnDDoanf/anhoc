import { Router, type Request, type Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../lib/db';
import { authenticate } from '../middleware/auth';

const router = Router();

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is not defined');
}

/**
 * Helper function to transform flat permissions into a grouped object
 * Example: { user: ["read", "write"], lesson: ["read"] }
 */
const formatPermissions = (permissions: any[]) => {
  return permissions.reduce((acc, p) => {
    const resource = p.resource.name;
    const action = p.action.name;

    if (!acc[resource]) {
      acc[resource] = [];
    }
    acc[resource].push(action);
    return acc;
  }, {} as Record<string, string[]>);
};

// --- 1. User Registration ---
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { username, email, password, role_name = 'student' } = req.body;
    const country = typeof req.body.country === 'string' ? req.body.country.trim() : '';

    const existingUser = await prisma.user.findFirst({
      where: { OR: [{ email }, { username }] }
    });

    if (existingUser) {
      return res.status(400).json({ error: "Username or Email already taken" });
    }

    const roleRecord = await prisma.role.findUnique({ where: { name: role_name } });
    if (!roleRecord) {
      return res.status(400).json({ error: "Invalid role specified" });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const newUser = await prisma.user.create({
      data: {
        username,
        email,
        country: country || null,
        password_hash: passwordHash,
        role_id: roleRecord.id,
      }
    });

    await prisma.studentStats.create({
      data: { user_id: newUser.id }
    });

    res.status(201).json({ message: "User registered successfully", userId: newUser.id });
  } catch (error) {
    res.status(500).json({ error: "Registration failed" });
  }
});

// --- 2. User Login ---
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        role: {
          include: {
            permissions: {
              include: {
                action: true,
                resource: true
              }
            }
          }
        }
      }
    });

    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Format permissions into grouped object
    const permissions = formatPermissions(user.role.permissions);

    const token = jwt.sign(
      { id: user.id, role: user.role.name, permissions },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        country: user.country,
        role: user.role.name,
        permissions
      }
    });
  } catch (error) {
    res.status(500).json({ error: "Login failed" });
  }
});

// --- 3. Get User Permissions ---
router.get('/permissions/:userId', async (req: Request, res: Response) => {
  try {
    const userId = Array.isArray(req.params.userId) ? req.params.userId[0] : req.params.userId;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        role: {
          select: {
            name: true,
            permissions: {
              include: {
                action: true,
                resource: true
              }
            }
          }
        }
      }
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Use the same helper for consistency
    const groupedPermissions = formatPermissions(user.role.permissions);

    res.json({
      role: user.role.name,
      permissions: groupedPermissions
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch permissions" });
  }
});

// --- 4. Get Current Profile ---
router.get('/profile', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        role: true,
        student_stats: true
      }
    });

    if (!user) return res.status(404).json({ error: "User not found" });

    res.json(user);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch profile" });
  }
});

// --- 5. Update Password ---
router.patch('/password', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { currentPassword, newPassword } = req.body;

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ error: "User not found" });

    const isMatch = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isMatch) {
      return res.status(400).json({ error: "Incorrect current password" });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(newPassword, salt);

    await prisma.user.update({
      where: { id: userId },
      data: { password_hash: passwordHash }
    });

    res.json({ message: "Password updated successfully" });
  } catch (err) {
    res.status(500).json({ error: "Failed to update password" });
  }
});

// --- 6. Get Activity Stats (for chart) ---
router.get('/activity', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    
    // Get last 7 days of XP logs
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const xpLogs = await prisma.xpLog.findMany({
      where: {
        user_id: userId,
        occurred_at: { gte: sevenDaysAgo }
      },
      orderBy: { occurred_at: 'asc' }
    });

    // Group by date
    const activity = xpLogs.reduce((acc: Record<string, number>, log) => {
      const date = log.occurred_at.toISOString().split('T')[0];
      acc[date] = (acc[date] || 0) + log.amount;
      return acc;
    }, {});

    // Ensure all 7 days are represented
    const result = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      result.push({
        date: dateStr,
        xp: activity[dateStr] || 0
      });
    }

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch activity" });
  }
});

// --- 7. Get Nearby Learners ---
router.get('/socializing', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id as string;

    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        country: true,
        role: { select: { name: true } },
        student_stats: {
          select: {
            level: true,
            total_xp: true,
            average_score: true,
            last_active: true
          }
        }
      }
    });

    if (!currentUser) {
      return res.status(404).json({ error: "User not found" });
    }

    const currentLevel = currentUser.student_stats?.level || 1;
    const currentScore = Number(currentUser.student_stats?.average_score || 0);
    const candidateMinLevel = Math.max(1, currentLevel - 3);
    const candidateMaxLevel = currentLevel + 3;

    const [followingRows, followerCount, followingCount, candidates] = await Promise.all([
      prisma.userFollow.findMany({
        where: { follower_id: userId },
        select: { following_id: true }
      }),
      prisma.userFollow.count({ where: { following_id: userId } }),
      prisma.userFollow.count({ where: { follower_id: userId } }),
      prisma.user.findMany({
        where: {
          id: { not: userId },
          ...(currentUser.role?.name === 'student' ? { role: { name: 'student' } } : {}),
          student_stats: {
            is: {
              level: {
                gte: candidateMinLevel,
                lte: candidateMaxLevel
              }
            }
          }
        },
        take: 40,
        select: {
          id: true,
          username: true,
          country: true,
          student_stats: {
            select: {
              level: true,
              total_xp: true,
              average_score: true,
              last_active: true
            }
          }
        },
        orderBy: { username: 'asc' }
      })
    ]);

    const followingIds = new Set(followingRows.map((row) => row.following_id));
    const scoredCandidates = candidates
      .map((candidate) => {
        const level = candidate.student_stats?.level || 1;
        const avgScore = Number(candidate.student_stats?.average_score || 0);
        const totalXp = candidate.student_stats?.total_xp || 0;
        const lastActiveTime = candidate.student_stats?.last_active ? new Date(candidate.student_stats.last_active).getTime() : 0;
        const now = Date.now();
        const daysSinceActive = lastActiveTime > 0 ? Math.max(0, Math.floor((now - lastActiveTime) / (1000 * 60 * 60 * 24))) : 30;
        const sameCountry = Boolean(currentUser.country && candidate.country && currentUser.country.toLowerCase() === candidate.country.toLowerCase());

        let recommendationScore = 0;
        recommendationScore += sameCountry ? 40 : 0;
        recommendationScore += Math.max(0, 25 - Math.abs(level - currentLevel) * 8);
        recommendationScore += Math.max(0, 20 - Math.abs(avgScore - currentScore) / 3);
        recommendationScore += Math.max(0, 15 - daysSinceActive * 3);
        recommendationScore += Math.min(10, Math.floor(totalXp / 250));

        return {
          id: candidate.id,
          username: candidate.username,
          country: candidate.country,
          level,
          total_xp: totalXp,
          average_score: avgScore,
          last_active: candidate.student_stats?.last_active || null,
          recommendation_score: Math.round(recommendationScore),
          is_following: followingIds.has(candidate.id)
        };
      })
      .sort((a, b) => b.recommendation_score - a.recommendation_score || b.total_xp - a.total_xp || a.username.localeCompare(b.username));

    const recommendedUser = scoredCandidates.find((candidate) => !candidate.is_following) || null;
    const nearbyLearners = scoredCandidates
      .filter((candidate) => candidate.id !== recommendedUser?.id)
      .slice(0, 6);

    res.json({
      summary: {
        followers: followerCount,
        following: followingCount
      },
      recommendedUser,
      nearbyLearners
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch socializing data" });
  }
});

router.post('/follow/:targetUserId', authenticate, async (req: Request, res: Response) => {
  try {
    const followerId = (req as any).user.id as string;
    const targetUserId = req.params.targetUserId as string;

    if (!targetUserId || targetUserId === followerId) {
      return res.status(400).json({ error: "Invalid follow target" });
    }

    const target = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true }
    });

    if (!target) {
      return res.status(404).json({ error: "User not found" });
    }

    await prisma.userFollow.upsert({
      where: {
        follower_id_following_id: {
          follower_id: followerId,
          following_id: targetUserId
        }
      },
      update: {},
      create: {
        follower_id: followerId,
        following_id: targetUserId
      }
    });

    res.status(201).json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to follow user" });
  }
});

router.delete('/follow/:targetUserId', authenticate, async (req: Request, res: Response) => {
  try {
    const followerId = (req as any).user.id as string;
    const targetUserId = req.params.targetUserId as string;

    await prisma.userFollow.deleteMany({
      where: {
        follower_id: followerId,
        following_id: targetUserId
      }
    });

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to unfollow user" });
  }
});

export default router;
