import { Router, type Request, type Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import prisma from "../lib/db.ts";
import { authenticate } from "../middleware/auth.ts";
import { computeInactiveCleanupDeadline } from "../services/accountLifecycleService.ts";
import { createEmailVerificationToken, sendActivationEmail } from "../services/mailerService.ts";
import { createNotification, NotificationType } from "../services/notificationService.ts";

const router = Router();

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error("JWT_SECRET environment variable is not defined");
}

type PermissionRow = {
  resource: { name: string };
  action: { name: string };
};

const formatPermissions = (permissions: PermissionRow[]) => {
  return permissions.reduce((acc, permission) => {
    const resource = permission.resource.name;
    const action = permission.action.name;

    if (!acc[resource]) {
      acc[resource] = [];
    }

    acc[resource].push(action);
    return acc;
  }, {} as Record<string, string[]>);
};

const createUniqueUsername = async (email: string, requestedUsername?: string) => {
  const base = (requestedUsername?.trim() || email.split("@")[0] || "student")
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 30) || "student";

  for (let suffix = 0; suffix < 200; suffix += 1) {
    const candidate = suffix === 0 ? base : `${base}_${suffix}`;
    const existing = await prisma.user.findUnique({ where: { username: candidate } });
    if (!existing) return candidate;
  }

  return `${base}_${Date.now()}`;
};

const resolveSignupRole = async (requestedRoleName?: string) => {
  const normalizedRequestedRole = requestedRoleName?.trim();

  if (normalizedRequestedRole) {
    const explicitRole = await prisma.role.findUnique({ where: { name: normalizedRequestedRole } });
    if (explicitRole) return explicitRole;
  }

  const preferredRoleNames = ["everything_student", "student"];
  for (const roleName of preferredRoleNames) {
    const role = await prisma.role.findUnique({ where: { name: roleName } });
    if (role) return role;
  }

  const fallbackRole = await prisma.role.findFirst({
    where: {
      name: {
        in: ["math_student", "isom_student"],
      },
    },
    orderBy: { id: "asc" },
  });

  if (fallbackRole) return fallbackRole;

  return prisma.role.findFirst({
    where: {
      name: {
        contains: "student",
        mode: "insensitive",
      },
    },
    orderBy: { id: "asc" },
  });
};

const createAuthPayload = (user: {
  id: string;
  email: string;
  username: string;
  country?: string | null;
  account_status: string;
  preferred_subject_id?: number | null;
  role: {
    name: string;
    permissions: PermissionRow[];
  };
}) => {
  const permissions = formatPermissions(user.role.permissions);
  const requiresSubjectSelection = !user.preferred_subject_id;

  const token = jwt.sign(
    {
      id: user.id,
      role: user.role.name,
      permissions,
      preferred_subject_id: user.preferred_subject_id ?? null,
      requires_subject_selection: requiresSubjectSelection,
      account_status: user.account_status,
    },
    JWT_SECRET,
    { expiresIn: "7d" }
  );

  return {
    token,
    user: {
      id: user.id,
      email: user.email,
      username: user.username,
      country: user.country ?? null,
      role: user.role.name,
      account_status: user.account_status,
      preferred_subject_id: user.preferred_subject_id ?? null,
      requires_subject_selection: requiresSubjectSelection,
      permissions,
    },
  };
};

router.post("/register", async (req: Request, res: Response) => {
  try {
    const email = typeof req.body.email === "string" ? req.body.email.trim().toLowerCase() : "";
    const password = typeof req.body.password === "string" ? req.body.password : "";
    const country = typeof req.body.country === "string" ? req.body.country.trim() : "";
    const requestedUsername = typeof req.body.username === "string" ? req.body.username : "";
    const roleName = typeof req.body.role_name === "string" ? req.body.role_name : undefined;

    if (!email || !email.includes("@")) {
      return res.status(400).json({ error: "A valid email is required" });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters" });
    }

    const [existingUser, roleRecord] = await Promise.all([
      prisma.user.findUnique({ where: { email } }),
      resolveSignupRole(roleName),
    ]);

    if (existingUser) {
      return res.status(400).json({ error: "Email already taken" });
    }

    if (!roleRecord) {
      return res.status(400).json({ error: "Invalid role specified" });
    }

    const username = await createUniqueUsername(email, requestedUsername);
    const passwordHash = await bcrypt.hash(password, 10);
    const verificationToken = createEmailVerificationToken();
    const now = new Date();

    const newUser = await prisma.user.create({
      data: {
        username,
        email,
        country: country || null,
        password_hash: passwordHash,
        role_id: roleRecord.id,
        account_status: "inactive",
        email_verification_token: verificationToken,
        email_verification_sent_at: now,
        inactive_cleanup_at: computeInactiveCleanupDeadline(now),
      },
    });

    await prisma.studentStats.create({
      data: { user_id: newUser.id },
    });

    await sendActivationEmail(email, verificationToken);

    res.status(201).json({
      message: "Registration successful. Check your email to activate the account.",
      userId: newUser.id,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Registration failed" });
  }
});

router.post("/activate", async (req: Request, res: Response) => {
  try {
    const token = typeof req.body.token === "string" ? req.body.token.trim() : "";
    if (!token) {
      return res.status(400).json({ error: "Activation token is required" });
    }

    const user = await prisma.user.findUnique({
      where: { email_verification_token: token },
      select: { id: true, email_verified_at: true },
    });

    if (!user) {
      return res.status(404).json({ error: "Activation token is invalid or expired" });
    }

    if (!user.email_verified_at) {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          email_verified_at: new Date(),
          email_verification_token: null,
        },
      });
    }

    res.json({ message: "Email verified. You can now log in." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Activation failed" });
  }
});

router.post("/login", async (req: Request, res: Response) => {
  try {
    const email = typeof req.body.email === "string" ? req.body.email.trim().toLowerCase() : "";
    const password = typeof req.body.password === "string" ? req.body.password : "";

    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        role: {
          include: {
            permissions: {
              include: {
                action: true,
                resource: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    if (!user.email_verified_at) {
      return res.status(403).json({ error: "Please verify your email before logging in" });
    }

    const shouldActivate = user.account_status === "inactive";
    const now = new Date();

    const normalizedUser = shouldActivate
      ? await prisma.user.update({
          where: { id: user.id },
          data: {
            account_status: "active",
            first_login_at: user.first_login_at || now,
            inactive_cleanup_at: null,
            audit_logs: {
              create: {
                event_type: "FIRST_LOGIN",
                metadata: { email_verified: true },
              },
            },
          },
          include: {
            role: {
              include: {
                permissions: {
                  include: {
                    action: true,
                    resource: true,
                  },
                },
              },
            },
          },
        })
      : await prisma.user.update({
          where: { id: user.id },
          data: {
            audit_logs: {
              create: {
                event_type: "LOGIN",
                metadata: {},
              },
            },
          },
          include: {
            role: {
              include: {
                permissions: {
                  include: {
                    action: true,
                    resource: true,
                  },
                },
              },
            },
          },
        });

    res.json(createAuthPayload(normalizedUser));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Login failed" });
  }
});

router.patch("/subject-preference", authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as Request & { user: { id: string } }).user.id;
    const subjectId = Number(req.body.subject_id);

    if (!Number.isInteger(subjectId)) {
      return res.status(400).json({ error: "subject_id is required" });
    }

    const subject = await prisma.subject.findUnique({ where: { id: subjectId } });
    if (!subject) {
      return res.status(404).json({ error: "Subject not found" });
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        preferred_subject_id: subjectId,
        audit_logs: {
          create: {
            event_type: "SUBJECT_SELECTED",
            metadata: { subject_id: subjectId },
          },
        },
      },
      include: {
        role: {
          include: {
            permissions: {
              include: {
                action: true,
                resource: true,
              },
            },
          },
        },
      },
    });

    res.json({
      message: "Subject preference saved",
      ...createAuthPayload(updatedUser),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to save subject preference" });
  }
});

router.get("/permissions/:userId", async (req: Request, res: Response) => {
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
                resource: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({
      role: user.role.name,
      permissions: formatPermissions(user.role.permissions),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch permissions" });
  }
});

router.get("/profile", authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as Request & { user: { id: string } }).user.id;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        role: {
          include: {
            permissions: {
              include: {
                action: true,
                resource: true,
              },
            },
          },
        },
        student_stats: true,
        preferred_subject: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({
      id: user.id,
      email: user.email,
      username: user.username,
      country: user.country,
      account_status: user.account_status,
      preferred_subject_id: user.preferred_subject_id,
      requires_subject_selection: !user.preferred_subject_id,
      role: user.role.name,
      permissions: formatPermissions(user.role.permissions),
      preferred_subject: user.preferred_subject,
      student_stats: user.student_stats,
      created_at: user.created_at,
      email_verified_at: user.email_verified_at,
      first_login_at: user.first_login_at,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch profile" });
  }
});

router.patch("/password", authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as Request & { user: { id: string } }).user.id;
    const { currentPassword, newPassword } = req.body;

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isMatch) {
      return res.status(400).json({ error: "Incorrect current password" });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { id: userId },
      data: { password_hash: passwordHash },
    });

    res.json({ message: "Password updated successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to update password" });
  }
});

router.get("/activity", authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as Request & { user: { id: string } }).user.id;
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const xpLogs = await prisma.xpLog.findMany({
      where: {
        user_id: userId,
        occurred_at: { gte: sevenDaysAgo },
      },
      orderBy: { occurred_at: "asc" },
    });

    const activity = xpLogs.reduce((acc: Record<string, number>, log) => {
      const date = log.occurred_at.toISOString().split("T")[0];
      acc[date] = (acc[date] || 0) + log.amount;
      return acc;
    }, {});

    const result = [];
    for (let i = 6; i >= 0; i -= 1) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split("T")[0];
      result.push({
        date: dateStr,
        xp: activity[dateStr] || 0,
      });
    }

    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch activity" });
  }
});

router.get("/socializing", authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as Request & { user: { id: string } }).user.id;

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
            last_active: true,
          },
        },
      },
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
        select: { following_id: true },
      }),
      prisma.userFollow.count({ where: { following_id: userId } }),
      prisma.userFollow.count({ where: { follower_id: userId } }),
      prisma.user.findMany({
        where: {
          id: { not: userId },
          ...(currentUser.role?.name === "student" ? { role: { name: "student" } } : {}),
          student_stats: {
            is: {
              level: {
                gte: candidateMinLevel,
                lte: candidateMaxLevel,
              },
            },
          },
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
              last_active: true,
            },
          },
        },
        orderBy: { username: "asc" },
      }),
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
          is_following: followingIds.has(candidate.id),
        };
      })
      .sort((a, b) => b.recommendation_score - a.recommendation_score || b.total_xp - a.total_xp || a.username.localeCompare(b.username));

    const recommendedUser = scoredCandidates.find((candidate) => !candidate.is_following) || null;
    const nearbyLearners = scoredCandidates.filter((candidate) => candidate.id !== recommendedUser?.id).slice(0, 6);

    res.json({
      summary: {
        followers: followerCount,
        following: followingCount,
      },
      recommendedUser,
      nearbyLearners,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch socializing data" });
  }
});

router.post("/follow/:targetUserId", authenticate, async (req: Request, res: Response) => {
  try {
    const followerId = (req as Request & { user: { id: string } }).user.id;
    const targetUserId = req.params.targetUserId as string;

    if (!targetUserId || targetUserId === followerId) {
      return res.status(400).json({ error: "Invalid follow target" });
    }

    const target = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true },
    });

    if (!target) {
      return res.status(404).json({ error: "User not found" });
    }

    await prisma.userFollow.upsert({
      where: {
        follower_id_following_id: {
          follower_id: followerId,
          following_id: targetUserId,
        },
      },
      update: {},
      create: {
        follower_id: followerId,
        following_id: targetUserId,
      },
    });

    await createNotification({
      recipientId: targetUserId,
      actorId: followerId,
      type: NotificationType.NewFollower,
      entityType: "user_follow",
      entityId: `${followerId}:${targetUserId}`,
      payload: {},
    });

    res.status(201).json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to follow user" });
  }
});

router.delete("/follow/:targetUserId", authenticate, async (req: Request, res: Response) => {
  try {
    const followerId = (req as Request & { user: { id: string } }).user.id;
    const targetUserId = req.params.targetUserId as string;

    await prisma.userFollow.deleteMany({
      where: {
        follower_id: followerId,
        following_id: targetUserId,
      },
    });

    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to unfollow user" });
  }
});

export default router;
