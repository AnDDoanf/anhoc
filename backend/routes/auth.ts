import { Router, type Request, type Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "node:crypto";
import prisma from "../lib/db.ts";
import { authenticate } from "../middleware/auth.ts";
import { STUDENT_ROLE_NAMES, isStudentRoleName } from "../constants/roles.ts";
import { computeInactiveCleanupDeadline } from "../services/accountLifecycleService.ts";
import { createEmailVerificationToken, sendActivationEmail, sendPasswordResetEmail } from "../services/mailerService.ts";
import { createNotification, NotificationType } from "../services/notificationService.ts";
import { createDefaultLearnUnitName, createLearnUnitForSupervisor, normalizeLearnUnitCode } from "../services/learnUnitService.ts";
import { createRateLimiter } from "../middleware/rateLimiter.ts";

const router = Router();
const SELF_SERVICE_SIGNUP_ROLE_NAMES = ["free_student", "sub_student", "supervisor"] as const;

const loginLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: "Too many login attempts from this IP, please try again after 15 minutes",
});

const registerLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: "Too many registration attempts from this IP, please try again after 15 minutes",
});

const forgotPasswordLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 3,
  message: "Too many password reset requests from this IP, please try again after 15 minutes",
});

const resetPasswordLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: "Too many password reset attempts from this IP, please try again after 15 minutes",
});

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
  const normalizedRequestedRole = requestedRoleName?.trim().toLowerCase();

  if (normalizedRequestedRole) {
    if (!SELF_SERVICE_SIGNUP_ROLE_NAMES.includes(normalizedRequestedRole as (typeof SELF_SERVICE_SIGNUP_ROLE_NAMES)[number])) {
      return null;
    }

    return prisma.role.findUnique({ where: { name: normalizedRequestedRole } });
  }

  return prisma.role.findUnique({ where: { name: "free_student" } });
};

const serializeLearnUnit = (learnUnit?: {
  id: string;
  name: string;
  code: string;
  supervisor_id?: string | null;
  max_subjects?: number | null;
  max_grades?: number | null;
  max_lessons?: number | null;
  max_templates?: number | null;
  max_teachers?: number | null;
  max_students?: number | null;
} | null) => {
  if (!learnUnit) return null;

  return {
    id: learnUnit.id,
    name: learnUnit.name,
    code: learnUnit.code,
    supervisor_id: learnUnit.supervisor_id ?? null,
    max_subjects: learnUnit.max_subjects ?? null,
    max_grades: learnUnit.max_grades ?? null,
    max_lessons: learnUnit.max_lessons ?? null,
    max_templates: learnUnit.max_templates ?? null,
    max_teachers: learnUnit.max_teachers ?? null,
    max_students: learnUnit.max_students ?? null,
  };
};

const createAuthPayload = async (user: {
  id: string;
  email: string;
  username: string;
  country?: string | null;
  account_status: string;
  learning_profile?: {
    preferred_subject_id?: number | null;
  } | null;
  learn_unit_id?: string | null;
  slots_purchased?: number;
  learn_unit?: {
    id: string;
    name: string;
    code: string;
    supervisor_id?: string | null;
    max_subjects?: number | null;
    max_grades?: number | null;
    max_lessons?: number | null;
    max_templates?: number | null;
    max_teachers?: number | null;
    max_students?: number | null;
  } | null;
  supervised_learn_unit?: {
    id: string;
    name: string;
    code: string;
    supervisor_id?: string | null;
    max_subjects?: number | null;
    max_grades?: number | null;
    max_lessons?: number | null;
    max_templates?: number | null;
    max_teachers?: number | null;
    max_students?: number | null;
  } | null;
  role: {
    name: string;
    permissions: PermissionRow[];
  };
}) => {
  const permissions = formatPermissions(user.role.permissions);
  const preferred_subject_id = user.learning_profile?.preferred_subject_id ?? null;
  const requiresSubjectSelection = !preferred_subject_id;
  const learnUnit = serializeLearnUnit(user.learn_unit || user.supervised_learn_unit);

  const token = jwt.sign(
    {
      id: user.id,
      role: user.role.name,
      permissions,
      preferred_subject_id,
      requires_subject_selection: requiresSubjectSelection,
      account_status: user.account_status,
      supervisor_id: learnUnit?.supervisor_id ?? null,
      learn_unit_id: user.learn_unit_id ?? null,
      slots_purchased: user.slots_purchased ?? 0,
    },
    JWT_SECRET,
    { expiresIn: "15m" }
  );

  const refreshTokenString = crypto.randomBytes(40).toString("hex");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  await prisma.refreshToken.create({
    data: {
      token: refreshTokenString,
      user_id: user.id,
      expires_at: expiresAt,
    },
  });

  return {
    token,
    refreshToken: refreshTokenString,
    user: {
      id: user.id,
      email: user.email,
      username: user.username,
      country: user.country ?? null,
      role: user.role.name,
      account_status: user.account_status,
      preferred_subject_id,
      supervisor_id: learnUnit?.supervisor_id ?? null,
      learn_unit_id: user.learn_unit_id ?? null,
      learn_unit: learnUnit,
      slots_purchased: user.slots_purchased ?? 0,
      requires_subject_selection: requiresSubjectSelection,
      permissions,
    },
  };
};

router.post("/register", registerLimiter, async (req: Request, res: Response) => {
  try {
    const email = typeof req.body.email === "string" ? req.body.email.trim().toLowerCase() : "";
    const password = typeof req.body.password === "string" ? req.body.password : "";
    const country = typeof req.body.country === "string" ? req.body.country.trim() : "";
    const requestedUsername = typeof req.body.username === "string" ? req.body.username : "";
    const roleName = typeof req.body.role_name === "string" ? req.body.role_name : undefined;
    const learnUnitName = typeof req.body.learn_unit_name === "string" ? req.body.learn_unit_name.trim() : "";

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
    if (roleRecord.name === "supervisor" && !learnUnitName) {
      return res.status(400).json({ error: "Learn unit name is required for supervisor registration" });
    }

    const username = await createUniqueUsername(email, requestedUsername);
    const passwordHash = await bcrypt.hash(password, 10);
    const verificationToken = createEmailVerificationToken();
    const now = new Date();

    const registration = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          username,
          email,
          country: country || null,
          password_hash: passwordHash,
          role_id: roleRecord.id,
          account_status: "inactive",
          slots_purchased: roleRecord.name === "supervisor" ? 1 : 0,
          security: {
            create: {
              email_verification_token: verificationToken,
              email_verification_sent_at: now,
              inactive_cleanup_at: computeInactiveCleanupDeadline(now),
            }
          },
          learning_profile: {
            create: {}
          }
        },
      });

      await tx.studentStats.create({
        data: { user_id: newUser.id },
      });

      const learnUnit = roleRecord.name === "supervisor"
        ? await createLearnUnitForSupervisor(
            newUser.id,
            learnUnitName || createDefaultLearnUnitName(username),
            {},
            tx as typeof prisma
          )
        : null;

      if (learnUnit) {
        await tx.user.update({
          where: { id: newUser.id },
          data: { learn_unit_id: learnUnit.id },
        });
      }

      return { newUser, learnUnit };
    });

    await sendActivationEmail(email, verificationToken);

    res.status(201).json({
      message: "Registration successful. Check your email to activate the account.",
      userId: registration.newUser.id,
      learnUnit: serializeLearnUnit(registration.learnUnit),
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

    const security = await prisma.userSecurity.findUnique({
      where: { email_verification_token: token },
      select: { user_id: true, email_verified_at: true },
    });

    if (!security) {
      return res.status(404).json({ error: "Activation token is invalid or expired" });
    }

    if (!security.email_verified_at) {
      await prisma.userSecurity.update({
        where: { user_id: security.user_id },
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

router.post("/login", loginLimiter, async (req: Request, res: Response) => {
  try {
    const email = typeof req.body.email === "string" ? req.body.email.trim().toLowerCase() : "";
    const password = typeof req.body.password === "string" ? req.body.password : "";
    const learnUnitCode = normalizeLearnUnitCode(req.body.learn_unit_code);

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
        learn_unit: true,
        supervised_learn_unit: true,
        security: true,
        learning_profile: true,
      },
    });

    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    if (user.security?.lockout_until && user.security.lockout_until > new Date()) {
      const minutesLeft = Math.ceil((user.security.lockout_until.getTime() - Date.now()) / (60 * 1000));
      return res.status(403).json({
        error: `Account is temporarily locked due to repeated failed login attempts. Please try again in ${minutesLeft} minute(s).`,
      });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      const newAttempts = (user.security?.failed_login_attempts ?? 0) + 1;
      const dataToUpdate: any = {
        failed_login_attempts: newAttempts,
      };

      if (newAttempts >= 5) {
        dataToUpdate.lockout_until = new Date(Date.now() + 15 * 60 * 1000);
      }

      await prisma.userSecurity.update({
        where: { user_id: user.id },
        data: dataToUpdate,
      });

      if (newAttempts >= 5) {
        return res.status(403).json({
          error: "Too many failed login attempts. Your account has been locked for 15 minutes.",
        });
      }

      return res.status(401).json({
        error: `Invalid credentials. You have ${5 - newAttempts} attempt(s) remaining before your account is locked.`,
      });
    }

    if (!user.security?.email_verified_at) {
      return res.status(403).json({ error: "Please verify your email before logging in" });
    }
    if (user.learn_unit_id) {
      if (!learnUnitCode) {
        return res.status(403).json({ error: "Learn unit code is required for this account" });
      }
      if (normalizeLearnUnitCode(user.learn_unit?.code) !== learnUnitCode) {
        return res.status(403).json({ error: "Invalid learn unit code" });
      }
    }

    const shouldActivate = user.account_status === "inactive";
    const now = new Date();

    const normalizedUser = shouldActivate
      ? await prisma.user.update({
          where: { id: user.id },
          data: {
            account_status: "active",
            security: {
              update: {
                first_login_at: user.security?.first_login_at || now,
                inactive_cleanup_at: null,
                failed_login_attempts: 0,
                lockout_until: null,
              }
            },
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
            learn_unit: true,
            supervised_learn_unit: true,
            learning_profile: true,
            security: true,
          },
        })
      : await prisma.user.update({
          where: { id: user.id },
          data: {
            security: {
              update: {
                failed_login_attempts: 0,
                lockout_until: null,
              }
            },
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
            learn_unit: true,
            supervised_learn_unit: true,
            learning_profile: true,
            security: true,
          },
        });

    res.json(await createAuthPayload(normalizedUser));
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
        learning_profile: {
          upsert: {
            create: { preferred_subject_id: subjectId },
            update: { preferred_subject_id: subjectId },
          }
        },
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
        learn_unit: true,
        learning_profile: true,
      },
    });

    const authPayload = await createAuthPayload(updatedUser);
    res.json({
      message: "Subject preference saved",
      ...authPayload,
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
        learning_profile: {
          include: {
            preferred_subject: true,
          }
        },
        security: true,
        learn_unit: true,
        supervised_learn_unit: true,
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
      preferred_subject_id: user.learning_profile?.preferred_subject_id ?? null,
      requires_subject_selection: !user.learning_profile?.preferred_subject_id,
      role: user.role.name,
      permissions: formatPermissions(user.role.permissions),
      preferred_subject: user.learning_profile?.preferred_subject ?? null,
      student_stats: user.student_stats,
      created_at: user.created_at,
      email_verified_at: user.security?.email_verified_at ?? null,
      first_login_at: user.security?.first_login_at ?? null,
      supervisor_id: user.learn_unit?.supervisor_id ?? null,
      learn_unit_id: user.learn_unit_id,
      learn_unit: serializeLearnUnit(user.learn_unit || user.supervised_learn_unit),
      slots_purchased: user.slots_purchased,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch profile" });
  }
});

router.post("/refresh", async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ error: "Refresh token is required" });
    }

    const storedToken = await prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: {
        user: {
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
            learn_unit: true,
            supervised_learn_unit: true,
            learning_profile: true,
            security: true,
          },
        },
      },
    });

    if (!storedToken) {
      return res.status(401).json({ error: "Invalid refresh token" });
    }

    if (storedToken.revoked_at !== null) {
      await prisma.refreshToken.updateMany({
        where: { user_id: storedToken.user_id },
        data: { revoked_at: new Date() },
      });
      return res.status(403).json({ error: "Compromised refresh token. All sessions revoked." });
    }

    if (storedToken.expires_at < new Date()) {
      return res.status(401).json({ error: "Refresh token expired. Please log in again." });
    }

    await prisma.refreshToken.update({
      where: { id: storedToken.id },
      data: { revoked_at: new Date() },
    });

    const payload = await createAuthPayload(storedToken.user);
    res.json(payload);
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: "Failed to refresh token", details: error.message });
  }
});

router.post("/upgrade-role", authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as Request & { user: { id: string } }).user.id;
    const { roleName } = req.body;
    const learnUnitName = typeof req.body.learn_unit_name === "string" ? req.body.learn_unit_name.trim() : "";

    if (roleName !== "sub_student" && roleName !== "supervisor") {
      return res.status(400).json({ error: "Invalid role specified for upgrade" });
    }

    const [roleRecord, existingUser] = await Promise.all([
      prisma.role.findUnique({
        where: { name: roleName }
      }),
      prisma.user.findUnique({
        where: { id: userId },
        include: { learn_unit: true }
      })
    ]);

    if (!roleRecord) {
      return res.status(404).json({ error: "Target role not found" });
    }
    if (!existingUser) {
      return res.status(404).json({ error: "User not found" });
    }
    if (roleName === "supervisor") {
      if (existingUser.learn_unit_id) {
        return res.status(409).json({ error: "This account is already assigned to a learn unit" });
      }
      if (!learnUnitName) {
        return res.status(400).json({ error: "Learn unit name is required to upgrade to supervisor" });
      }
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        role_id: roleRecord.id
      },
      include: {
        learn_unit: true
      }
    });

    if (roleName === "supervisor" && (!user.slots_purchased || user.slots_purchased === 0)) {
      await prisma.user.update({
        where: { id: userId },
        data: { slots_purchased: 1 }
      });
    }

    if (roleName === "supervisor") {
      const learnUnit = await createLearnUnitForSupervisor(
        userId,
        learnUnitName || createDefaultLearnUnitName(user.username),
      );

      await prisma.user.update({
        where: { id: userId },
        data: { learn_unit_id: learnUnit.id }
      });

      return res.json({
        message: `Successfully upgraded to ${roleName}`,
        role: roleName,
        learnUnit: serializeLearnUnit(learnUnit)
      });
    }

    res.json({
      message: `Successfully upgraded to ${roleName}`,
      role: roleName
    });
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: "Failed to upgrade role", details: error.message });
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
          ...(isStudentRoleName(currentUser.role?.name)
            ? {
                role: {
                  name: {
                    in: [...STUDENT_ROLE_NAMES],
                  },
                },
              }
            : {}),
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

router.post("/forgot-password", forgotPasswordLimiter, async (req: Request, res: Response) => {
  try {
    const email = typeof req.body.email === "string" ? req.body.email.trim().toLowerCase() : "";
    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true },
    });

    if (user) {
      const resetToken = crypto.randomBytes(32).toString("hex");
      await prisma.userSecurity.update({
        where: { user_id: user.id },
        data: {
          password_reset_token: resetToken,
          password_reset_sent_at: new Date(),
        },
      });

      await sendPasswordResetEmail(email, resetToken);
    }

    res.json({ message: "If the email is registered, a password reset link has been sent." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to send password reset email" });
  }
});

router.post("/reset-password", resetPasswordLimiter, async (req: Request, res: Response) => {
  try {
    const token = typeof req.body.token === "string" ? req.body.token.trim() : "";
    const newPassword = typeof req.body.newPassword === "string" ? req.body.newPassword : "";

    if (!token) {
      return res.status(400).json({ error: "Token is required" });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters" });
    }

    const security = await prisma.userSecurity.findUnique({
      where: { password_reset_token: token },
      select: { user_id: true, password_reset_sent_at: true },
    });

    if (!security || !security.password_reset_sent_at) {
      return res.status(400).json({ error: "Invalid or expired reset token" });
    }

    const tokenAgeMs = Date.now() - security.password_reset_sent_at.getTime();
    const oneHourMs = 60 * 60 * 1000;
    if (tokenAgeMs > oneHourMs) {
      return res.status(400).json({ error: "Invalid or expired reset token" });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: security.user_id },
        data: { password_hash: passwordHash },
      }),
      prisma.userSecurity.update({
        where: { user_id: security.user_id },
        data: {
          password_reset_token: null,
          password_reset_sent_at: null,
          failed_login_attempts: 0,
          lockout_until: null,
        },
      }),
    ]);

    res.json({ message: "Password reset successful. You can now log in." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to reset password" });
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

