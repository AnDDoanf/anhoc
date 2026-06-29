import { Router, type Request, type Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
// import { fileURLToPath } from 'node:url'; // not needed in CommonJS
import prisma from "../lib/db.ts";
import { cacheGet, cacheSet, cacheInvalidateUser, cacheDel } from "../lib/redis.ts";
import { authenticate } from "../middleware/auth.ts";
import { STUDENT_ROLE_NAMES, isStudentRoleName } from "../constants/roles.ts";
import { computeInactiveCleanupDeadline } from "../services/accountLifecycleService.ts";
import { createEmailVerificationToken, sendActivationEmail, sendPasswordResetEmail } from "../services/mailerService.ts";
import { createNotification, NotificationType } from "../services/notificationService.ts";
import { createDefaultLearnUnitName, createLearnUnitForSupervisor, normalizeLearnUnitCode } from "../services/learnUnitService.ts";
import {
  buildFullName,
  createUniqueDisplayName,
  createUniqueLoginId,
  findUserIdByIdentifier,
  getUserIdentity,
  normalizeHumanName,
  normalizeLoginIdValue,
  saveUserIdentity,
} from "../services/userIdentityService.ts";
import { createRateLimiter } from "../middleware/rateLimiter.ts";
import {
  getGoogleAuthUrl,
  getGoogleProfile,
  getFacebookAuthUrl,
  getFacebookProfile,
  getMicrosoftAuthUrl,
  getMicrosoftProfile,
} from "../services/oauthService.ts";

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

const getRoleRecordCached = async (roleName: string) => {
  const cacheKey = `role:record:${roleName}`;
  let role = await cacheGet<any>(cacheKey);
  if (!role) {
    role = await prisma.role.findUnique({ where: { name: roleName } });
    if (role) {
      await cacheSet(cacheKey, role, 86400); // 24 hours
    }
  }
  return role;
};

const resolveSignupRole = async (requestedRoleName?: string) => {
  const normalizedRequestedRole = requestedRoleName?.trim().toLowerCase();

  if (normalizedRequestedRole) {
    if (!SELF_SERVICE_SIGNUP_ROLE_NAMES.includes(normalizedRequestedRole as (typeof SELF_SERVICE_SIGNUP_ROLE_NAMES)[number])) {
      return null;
    }

    return getRoleRecordCached(normalizedRequestedRole);
  }

  return getRoleRecordCached("free_student");
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
  avatar_url?: string | null;
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
  const identity = await getUserIdentity(user.id, user.username);

  const activeSessionId = crypto.randomUUID();
  await prisma.user.update({
    where: { id: user.id },
    data: { active_session_id: activeSessionId },
  });

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
      active_session_id: activeSessionId,
    },
    JWT_SECRET,
    { expiresIn: "15m" }
  );

  const refreshTokenString = crypto.randomBytes(40).toString("hex");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  const tokenRecord = await prisma.refreshToken.create({
    data: {
      token: refreshTokenString,
      user_id: user.id,
      expires_at: expiresAt,
    },
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

  await cacheSet(`session:token:${refreshTokenString}`, tokenRecord, 7 * 24 * 3600);

  return {
    token,
    refreshToken: refreshTokenString,
    user: {
      id: user.id,
      email: user.email,
      username: user.username,
      avatar_url: user.avatar_url ?? null,
      full_name: identity.full_name,
      first_name: identity.first_name,
      last_name: identity.last_name,
      login_id: identity.login_id,
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
    const firstName = normalizeHumanName(typeof req.body.first_name === "string" ? req.body.first_name : "");
    const lastName = normalizeHumanName(typeof req.body.last_name === "string" ? req.body.last_name : "");
    const requestedFullName = typeof req.body.full_name === "string"
      ? req.body.full_name
      : typeof req.body.username === "string"
      ? req.body.username
      : "";
    const roleName = typeof req.body.role_name === "string" ? req.body.role_name : undefined;
    const learnUnitName = typeof req.body.learn_unit_name === "string" ? req.body.learn_unit_name.trim() : "";
    const requestedLoginId = typeof req.body.login_id === "string" ? req.body.login_id.trim() : "";

    if (!email || !email.includes("@")) {
      return res.status(400).json({ error: "A valid email is required" });
    }

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z0-9]).{8,}$/;
    if (!passwordRegex.test(password)) {
      return res.status(400).json({
        error: "Password must be at least 8 characters and contain at least one lowercase letter, one uppercase letter, one number, and one special character"
      });
    }
    if (!firstName) {
      return res.status(400).json({ error: "First name is required" });
    }
    if (!lastName) {
      return res.status(400).json({ error: "Last name is required" });
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

    const fullName = buildFullName(firstName, lastName, requestedFullName);
    if (!fullName) {
      return res.status(400).json({ error: "Full name is required" });
    }

    const username = await createUniqueDisplayName(fullName, email.split("@")[0] || "Student");
    const passwordHash = await bcrypt.hash(password, 10);
    const verificationToken = createEmailVerificationToken();
    const now = new Date();

    let loginId = "";
    if (requestedLoginId) {
      const normalizedLoginId = normalizeLoginIdValue(requestedLoginId);
      const existing = await prisma.$queryRaw<Array<{ id: string }>>`
        SELECT id FROM users WHERE LOWER(login_id) = LOWER(${normalizedLoginId}) LIMIT 1
      `;
      if (existing.length > 0) {
        loginId = await createUniqueLoginId(firstName, lastName, normalizedLoginId);
      } else {
        loginId = normalizedLoginId;
      }
    } else {
      loginId = await createUniqueLoginId(firstName, lastName, username);
    }

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

      await saveUserIdentity(tx as typeof prisma, newUser.id, {
        firstName,
        lastName,
        loginId,
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

    const learnUnitCode = registration.learnUnit?.code ?? undefined;
    await sendActivationEmail(email, verificationToken, loginId, password, learnUnitCode);

    res.status(201).json({
      message: "Registration successful. Check your email to activate the account.",
      userId: registration.newUser.id,
      fullName: username,
      loginId,
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

    const user = await prisma.user.findUnique({
      where: { id: security.user_id },
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
      return res.status(404).json({ error: "User not found" });
    }

    const now = new Date();
    const isAlreadyVerified = !!user.security?.email_verified_at;

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        account_status: "active",
        security: {
          upsert: {
            update: {
              email_verified_at: user.security?.email_verified_at || now,
              email_verification_token: null,
              first_login_at: user.security?.first_login_at || now,
              inactive_cleanup_at: null,
              failed_login_attempts: 0,
              lockout_until: null,
            },
            create: {
              email_verified_at: user.security?.email_verified_at || now,
              email_verification_token: null,
              first_login_at: user.security?.first_login_at || now,
              inactive_cleanup_at: null,
              failed_login_attempts: 0,
              lockout_until: null,
            },
          },
        },
        ...(!isAlreadyVerified ? {
          audit_logs: {
            create: {
              event_type: "FIRST_LOGIN",
              metadata: { email_verified: true },
            },
          },
        } : {})
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

    const authPayload = await createAuthPayload(updatedUser);
    res.json({
      message: "Email verified successfully.",
      ...authPayload,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Activation failed" });
  }
});

router.post("/login", loginLimiter, async (req: Request, res: Response) => {
  try {
    const identifier = typeof req.body.identifier === "string"
      ? req.body.identifier.trim().toLowerCase()
      : typeof req.body.email === "string"
      ? req.body.email.trim().toLowerCase()
      : "";
    const password = typeof req.body.password === "string" ? req.body.password : "";
    const learnUnitCode = normalizeLearnUnitCode(req.body.learn_unit_code);
    const userId = await findUserIdByIdentifier(identifier);

    const user = userId ? await prisma.user.findUnique({
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
        learn_unit: true,
        supervised_learn_unit: true,
        security: true,
        learning_profile: true,
      },
    }) : null;

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

      await prisma.userSecurity.upsert({
        where: { user_id: user.id },
        update: dataToUpdate,
        create: {
          user_id: user.id,
          failed_login_attempts: newAttempts,
          lockout_until: dataToUpdate.lockout_until ?? null,
        },
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
              upsert: {
                update: {
                  first_login_at: user.security?.first_login_at || now,
                  inactive_cleanup_at: null,
                  failed_login_attempts: 0,
                  lockout_until: null,
                },
                create: {
                  first_login_at: user.security?.first_login_at || now,
                  inactive_cleanup_at: null,
                  failed_login_attempts: 0,
                  lockout_until: null,
                },
              },
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
              upsert: {
                update: {
                  failed_login_attempts: 0,
                  lockout_until: null,
                },
                create: {
                  failed_login_attempts: 0,
                  lockout_until: null,
                },
              },
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

// Helper for handling OAuth login/registration
const handleOAuthUserLogin = async (
  profile: { id: string; email: string; name: string; avatarUrl?: string },
  provider: "google" | "facebook" | "microsoft"
) => {
  const email = profile.email.toLowerCase().trim();

  const userIncludes = {
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
    oauth_accounts: true,
  };

  // Prioritize finding user by explicit OAuth account link
  let user = await prisma.user.findFirst({
    where: {
      oauth_accounts: {
        some: { provider, provider_user_id: profile.id }
      }
    },
    include: userIncludes
  });

  // Fallback to finding user by matching email if no direct link exists yet
  if (!user) {
    user = await prisma.user.findFirst({
      where: { email },
      include: userIncludes
    });
  }

  const now = new Date();

  if (user) {
    // User exists. Update avatar if missing.
    const updates: any = {};
    if (!user.avatar_url && profile.avatarUrl) {
      updates.avatar_url = profile.avatarUrl;
    }

    // Link this provider if not already linked
    const alreadyLinked = user.oauth_accounts.some(acc => acc.provider === provider && acc.provider_user_id === profile.id);
    if (!alreadyLinked) {
      updates.oauth_accounts = {
        create: {
          provider,
          provider_user_id: profile.id
        }
      };
    }

    if (user.account_status === "inactive") {
      updates.account_status = "active";
      if (!user.security?.email_verified_at) {
        updates.security = {
          update: {
            email_verified_at: now,
            first_login_at: now,
            inactive_cleanup_at: null,
          }
        };
      }
    }

    let updatedUser = user;
    if (Object.keys(updates).length > 0) {
      updatedUser = await prisma.user.update({
        where: { id: user.id },
        data: updates,
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
          oauth_accounts: true,
        }
      });
    }

    await prisma.auditLog.create({
      data: {
        user_id: user.id,
        event_type: "LOGIN",
        metadata: { oauth_provider: provider },
      }
    });

    return await createAuthPayload(updatedUser);
  } else {
    // New user registration
    const roleRecord = await prisma.role.findUnique({
      where: { name: "free_student" }
    });

    if (!roleRecord) {
      throw new Error("Default role 'free_student' not found in database");
    }

    const firstName = profile.name.split(" ")[0] || "Student";
    const lastName = profile.name.split(" ").slice(1).join(" ") || "User";
    const username = await createUniqueDisplayName(profile.name, email.split("@")[0]);
    const loginId = await createUniqueLoginId(firstName, lastName, username);

    const randomPassword = crypto.randomBytes(32).toString("hex");
    const passwordHash = await bcrypt.hash(randomPassword, 10);

    const newUser = await prisma.$transaction(async (tx) => {
      const createdUser = await tx.user.create({
        data: {
          username,
          email,
          password_hash: passwordHash,
          role_id: roleRecord.id,
          account_status: "active",
          avatar_url: profile.avatarUrl || null,
          oauth_accounts: {
            create: {
              provider,
              provider_user_id: profile.id
            }
          },
          security: {
            create: {
              email_verified_at: now,
              first_login_at: now,
              inactive_cleanup_at: null,
            }
          },
          learning_profile: {
            create: {}
          }
        }
      });

      await saveUserIdentity(tx as typeof prisma, createdUser.id, {
        firstName,
        lastName,
        loginId,
      });

      await tx.studentStats.create({
        data: { user_id: createdUser.id },
      });

      return createdUser;
    });

    const userWithRelations = await prisma.user.findUnique({
      where: { id: newUser.id },
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
        oauth_accounts: true,
      }
    });

    if (!userWithRelations) {
      throw new Error("Failed to load newly created OAuth user");
    }

    await prisma.auditLog.create({
      data: {
        user_id: userWithRelations.id,
        event_type: "FIRST_LOGIN",
        metadata: { oauth_provider: provider, register: true },
      }
    });

    return await createAuthPayload(userWithRelations);
  }
};

// OAuth redirect endpoints
router.get("/google", (req: Request, res: Response) => {
  const backendUrl = process.env.BACKEND_URL || "http://localhost:5001";
  const redirectUri = `${backendUrl}/api/v1/auth/google/callback`;
  const stateVal = (req.query.state as string) || "login";
  const frontendUrl = (req.query.frontendUrl as string) || process.env.FRONTEND_URL || "http://localhost:5000";

  const oauthState = jwt.sign(
    {
      state: stateVal,
      frontendUrl,
    },
    JWT_SECRET!,
    { expiresIn: "10m" }
  );

  if (!process.env.GOOGLE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID === "your_google_client_id") {
    return res.redirect(`${redirectUri}?code=mock_code&state=${oauthState}`);
  }

  const url = getGoogleAuthUrl(redirectUri, oauthState);
  res.redirect(url);
});

router.get("/facebook", (req: Request, res: Response) => {
  const backendUrl = process.env.BACKEND_URL || "http://localhost:5001";
  const redirectUri = `${backendUrl}/api/v1/auth/facebook/callback`;
  const stateVal = (req.query.state as string) || "login";
  const frontendUrl = (req.query.frontendUrl as string) || process.env.FRONTEND_URL || "http://localhost:5000";

  const oauthState = jwt.sign(
    {
      state: stateVal,
      frontendUrl,
    },
    JWT_SECRET!,
    { expiresIn: "10m" }
  );

  if (!process.env.FACEBOOK_CLIENT_ID || process.env.FACEBOOK_CLIENT_ID === "your_facebook_client_id") {
    return res.redirect(`${redirectUri}?code=mock_code&state=${oauthState}`);
  }

  const url = getFacebookAuthUrl(redirectUri, oauthState);
  res.redirect(url);
});

router.get("/microsoft", (req: Request, res: Response) => {
  const backendUrl = process.env.BACKEND_URL || "http://localhost:5001";
  const redirectUri = `${backendUrl}/api/v1/auth/microsoft/callback`;
  const stateVal = (req.query.state as string) || "login";
  const frontendUrl = (req.query.frontendUrl as string) || process.env.FRONTEND_URL || "http://localhost:5000";

  const oauthState = jwt.sign(
    {
      state: stateVal,
      frontendUrl,
    },
    JWT_SECRET!,
    { expiresIn: "10m" }
  );

  if (!process.env.MICROSOFT_CLIENT_ID || process.env.MICROSOFT_CLIENT_ID === "your_microsoft_client_id") {
    return res.redirect(`${redirectUri}?code=mock_code&state=${oauthState}`);
  }

  const url = getMicrosoftAuthUrl(redirectUri, oauthState);
  res.redirect(url);
});

// Deduplication helper to prevent concurrent/duplicate OAuth requests (e.g., from browser double-requests)
const oauthPendingRequests = new Map<string, Promise<string>>();

async function deduplicateOAuth(
  code: string,
  execute: () => Promise<string>
): Promise<string> {
  // 1. Check in-memory map first (covers concurrent requests on the same instance)
  if (oauthPendingRequests.has(code)) {
    return oauthPendingRequests.get(code)!;
  }

  // 2. Check Redis cache for already processed codes (covers requests that completed, or different instances)
  const redisKey = `oauth:code:${code}`;
  try {
    const cachedUrl = await cacheGet<string>(redisKey);
    if (cachedUrl) {
      return cachedUrl;
    }
  } catch (err) {
    console.warn("Failed to read from Redis cache in oauth deduplication:", err);
  }

  const promise = (async () => {
    const url = await execute();
    // Cache the result in Redis for 60 seconds
    try {
      await cacheSet(redisKey, url, 60);
    } catch (err) {
      console.warn("Failed to write to Redis cache in oauth deduplication:", err);
    }
    return url;
  })().catch((err) => {
    oauthPendingRequests.delete(code);
    throw err;
  });

  oauthPendingRequests.set(code, promise);

  // Clean up in-memory map after 60 seconds to avoid memory leaks
  setTimeout(() => {
    oauthPendingRequests.delete(code);
  }, 60000);

  return promise;
}

// Common logic to handle linked accounts flow vs login flow
const handleOAuthCallback = async (
  req: Request,
  provider: "google" | "facebook" | "microsoft",
  profile: { id: string; email: string; name: string; avatarUrl?: string },
  state: string,
  frontendUrl: string
): Promise<string> => {
  let linkUserId: string | null = null;
  if (state && state !== "login") {
    try {
      const decoded = jwt.verify(state, JWT_SECRET!) as { id: string };
      linkUserId = decoded.id;
      try {
        fs.appendFileSync(
          path.join(process.cwd(), "oauth_debug.log"),
          `[${new Date().toISOString()}] Successfully decoded JWT: ${linkUserId}\n`
        );
      } catch {}
    } catch (err) {
      console.warn("Invalid JWT in OAuth state parameter, ignoring linking:", err);
      try {
        fs.appendFileSync(
          path.join(process.cwd(), "oauth_debug.log"),
          `[${new Date().toISOString()}] State: ${state}\nError: ${err instanceof Error ? err.stack : err}\n`
        );
      } catch {}
    }
  }

  if (linkUserId) {
    // linking flow
    const existingLink = await prisma.oAuthAccount.findUnique({
      where: {
        provider_provider_user_id: {
          provider,
          provider_user_id: profile.id
        }
      }
    });

    if (existingLink) {
      if (existingLink.user_id === linkUserId) {
        return `${frontendUrl}/student/settings?success=linked`;
      } else {
        return `${frontendUrl}/student/settings?error=already_linked_to_other`;
      }
    }

    await prisma.oAuthAccount.create({
      data: {
        user_id: linkUserId,
        provider,
        provider_user_id: profile.id
      }
    });

    await cacheDel(`user:profile:${linkUserId}`);
    return `${frontendUrl}/student/settings?success=linked`;
  } else {
    // normal login/signup flow
    const authPayload = await handleOAuthUserLogin(profile, provider);
    return `${frontendUrl}/oauth-success?token=${authPayload.token}&refreshToken=${authPayload.refreshToken}`;
  }
};

// OAuth callback endpoints
router.get("/google/callback", async (req: Request, res: Response) => {
  const code = req.query.code as string;
  const oauthState = req.query.state as string;
  const backendUrl = process.env.BACKEND_URL || "http://localhost:5001";
  const redirectUri = `${backendUrl}/api/v1/auth/google/callback`;

  let frontendUrl = (process.env.FRONTEND_URL || "http://localhost:5000").replace(/\/+$/, "");
  let state = "login";

  if (oauthState) {
    try {
      const decodedState = jwt.verify(oauthState, JWT_SECRET!) as { state: string; frontendUrl: string };
      state = decodedState.state;
      if (decodedState.frontendUrl) {
        frontendUrl = decodedState.frontendUrl.replace(/\/+$/, "");
      }
    } catch (err) {
      console.warn("Invalid OAuth state JWT:", err);
    }
  }

  if (!code) {
    return res.redirect(`${frontendUrl}/login?error=no_code_provided`);
  }

  try {
    const redirectUrl = await deduplicateOAuth(code, async () => {
      const profile = await getGoogleProfile(code, redirectUri);
      return await handleOAuthCallback(req, "google", profile, state, frontendUrl);
    });
    return res.redirect(redirectUrl);
  } catch (error) {
    console.error("Google OAuth Callback Error:", error);
    return res.redirect(`${frontendUrl}/login?error=google_oauth_failed`);
  }
});

router.get("/facebook/callback", async (req: Request, res: Response) => {
  const code = req.query.code as string;
  const oauthState = req.query.state as string;
  const backendUrl = process.env.BACKEND_URL || "http://localhost:5001";
  const redirectUri = `${backendUrl}/api/v1/auth/facebook/callback`;

  let frontendUrl = (process.env.FRONTEND_URL || "http://localhost:5000").replace(/\/+$/, "");
  let state = "login";

  if (oauthState) {
    try {
      const decodedState = jwt.verify(oauthState, JWT_SECRET!) as { state: string; frontendUrl: string };
      state = decodedState.state;
      if (decodedState.frontendUrl) {
        frontendUrl = decodedState.frontendUrl.replace(/\/+$/, "");
      }
    } catch (err) {
      console.warn("Invalid OAuth state JWT:", err);
    }
  }

  if (!code) {
    return res.redirect(`${frontendUrl}/login?error=no_code_provided`);
  }

  try {
    const redirectUrl = await deduplicateOAuth(code, async () => {
      const profile = await getFacebookProfile(code, redirectUri);
      return await handleOAuthCallback(req, "facebook", profile, state, frontendUrl);
    });
    return res.redirect(redirectUrl);
  } catch (error) {
    console.error("Facebook OAuth Callback Error:", error);
    return res.redirect(`${frontendUrl}/login?error=facebook_oauth_failed`);
  }
});

router.get("/microsoft/callback", async (req: Request, res: Response) => {
  const code = req.query.code as string;
  const oauthState = req.query.state as string;
  const backendUrl = process.env.BACKEND_URL || "http://localhost:5001";
  const redirectUri = `${backendUrl}/api/v1/auth/microsoft/callback`;

  let frontendUrl = (process.env.FRONTEND_URL || "http://localhost:5000").replace(/\/+$/, "");
  let state = "login";

  if (oauthState) {
    try {
      const decodedState = jwt.verify(oauthState, JWT_SECRET!) as { state: string; frontendUrl: string };
      state = decodedState.state;
      if (decodedState.frontendUrl) {
        frontendUrl = decodedState.frontendUrl.replace(/\/+$/, "");
      }
    } catch (err) {
      console.warn("Invalid OAuth state JWT:", err);
    }
  }

  if (!code) {
    return res.redirect(`${frontendUrl}/login?error=no_code_provided`);
  }

  try {
    const redirectUrl = await deduplicateOAuth(code, async () => {
      const profile = await getMicrosoftProfile(code, redirectUri);
      return await handleOAuthCallback(req, "microsoft", profile, state, frontendUrl);
    });
    return res.redirect(redirectUrl);
  } catch (error) {
    console.error("Microsoft OAuth Callback Error:", error);
    return res.redirect(`${frontendUrl}/login?error=microsoft_oauth_failed`);
  }
});

// OAuth unlink endpoint
router.delete("/oauth/:provider", authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as Request & { user: { id: string } }).user.id;
    const provider = String(req.params.provider);

    await prisma.oAuthAccount.deleteMany({
      where: {
        user_id: userId,
        provider: provider
      }
    });

    await cacheDel(`user:profile:${userId}`);
    res.json({ message: `Successfully unlinked ${provider} account.` });
  } catch (error) {
    console.error("Unlink OAuth account error:", error);
    res.status(500).json({ error: "Failed to unlink account" });
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
    const cacheKey = `user:profile:${userId}`;
    const cachedProfile = await cacheGet<any>(cacheKey);
    if (cachedProfile) {
      return res.json(cachedProfile);
    }

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
        oauth_accounts: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    let studentStats = user.student_stats;
    if (studentStats) {
      const { economyService } = await import("../services/economyService.ts");
      studentStats = await economyService.getStats(user.id);
    }

    const profilePayload = {
      id: user.id,
      email: user.email,
      username: user.username,
      avatar_url: user.avatar_url ?? null,
      ...(await getUserIdentity(user.id, user.username)),
      country: user.country,
      account_status: user.account_status,
      preferred_subject_id: user.learning_profile?.preferred_subject_id ?? null,
      requires_subject_selection: !user.learning_profile?.preferred_subject_id,
      role: user.role.name,
      permissions: formatPermissions(user.role.permissions),
      preferred_subject: user.learning_profile?.preferred_subject ?? null,
      student_stats: studentStats,
      created_at: user.created_at,
      email_verified_at: user.security?.email_verified_at ?? null,
      first_login_at: user.security?.first_login_at ?? null,
      supervisor_id: user.learn_unit?.supervisor_id ?? null,
      learn_unit_id: user.learn_unit_id,
      learn_unit: serializeLearnUnit(user.learn_unit || user.supervised_learn_unit),
      slots_purchased: user.slots_purchased,
      oauth_accounts: user.oauth_accounts.map(acc => ({
        id: acc.id,
        provider: acc.provider,
        provider_user_id: acc.provider_user_id,
        created_at: acc.created_at,
      })),
    };

    await cacheSet(cacheKey, profilePayload, 3600);
    res.json(profilePayload);
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

    const cacheKey = `session:token:${refreshToken}`;
    let storedToken = await cacheGet<any>(cacheKey);

    if (!storedToken) {
      storedToken = await prisma.refreshToken.findUnique({
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

      if (storedToken) {
        await cacheSet(cacheKey, storedToken, 7 * 24 * 3600);
      }
    }

    if (!storedToken) {
      return res.status(401).json({ error: "Invalid refresh token" });
    }

    if (storedToken.revoked_at !== null) {
      await prisma.refreshToken.updateMany({
        where: { user_id: storedToken.user_id },
        data: { revoked_at: new Date() },
      });
      await cacheDel(cacheKey);
      return res.status(403).json({ error: "Compromised refresh token. All sessions revoked." });
    }

    const expiresAt = new Date(storedToken.expires_at);
    if (expiresAt < new Date()) {
      await cacheDel(cacheKey);
      return res.status(401).json({ error: "Refresh token expired. Please log in again." });
    }

    await prisma.refreshToken.update({
      where: { id: storedToken.id },
      data: { revoked_at: new Date() },
    });

    await cacheDel(cacheKey);

    const freshUser = await prisma.user.findUnique({
      where: { id: storedToken.user_id },
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

    if (!freshUser) {
      return res.status(401).json({ error: "User associated with token not found" });
    }

    const payload = await createAuthPayload(freshUser);
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
      getRoleRecordCached(roleName),
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

    await cacheInvalidateUser(userId);

    res.json({ message: "Password updated successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to update password" });
  }
});

router.patch("/username", authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as Request & { user: { id: string } }).user.id;
    const { username } = req.body;

    if (!username || typeof username !== "string") {
      return res.status(400).json({ error: "Username is required" });
    }

    const normalized = username.trim().toLowerCase().replace(/[^a-z0-9_]+/g, "_").replace(/^_+|_+$/g, "");

    if (normalized.length < 3) {
      return res.status(400).json({ error: "Username must be at least 3 characters" });
    }
    if (normalized.length > 30) {
      return res.status(400).json({ error: "Username must be at most 30 characters" });
    }

    const existing = await prisma.user.findUnique({ where: { username: normalized } });
    if (existing && existing.id !== userId) {
      return res.status(409).json({ error: "Username is already taken" });
    }

    await prisma.user.update({
      where: { id: userId },
      data: { username: normalized },
    });

    await cacheInvalidateUser(userId);

    res.json({ message: "Username updated successfully", username: normalized });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to update username" });
  }
});

router.post("/avatar", authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as Request & { user: { id: string } }).user.id;
    const { avatar } = req.body;

    if (!avatar || typeof avatar !== "string") {
      return res.status(400).json({ error: "Avatar image data is required" });
    }

    const matches = avatar.match(/^data:image\/([a-zA-Z+]+);base64,(.+)$/);
    if (!matches || !matches[1] || !matches[2]) {
      return res.status(400).json({ error: "Invalid image format. Only PNG, JPEG, JPG, and WEBP are supported." });
    }

    const ext = matches[1].toLowerCase();
    const base64Data = matches[2];

    const allowedExtensions = ["png", "jpeg", "jpg", "webp"];
    if (!allowedExtensions.includes(ext)) {
      return res.status(400).json({ error: `Unsupported image type: ${ext}` });
    }

    const buffer = Buffer.from(base64Data, "base64");
    if (buffer.length > 5 * 1024 * 1024) {
      return res.status(400).json({ error: "Image size must be less than 5MB" });
    }

    const uploadsDir = path.join(process.cwd(), "uploads", "avatars");

    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    try {
      const files = fs.readdirSync(uploadsDir);
      for (const file of files) {
        if (file.startsWith(userId)) {
          fs.unlinkSync(path.join(uploadsDir, file));
        }
      }
    } catch (err) {
      console.error("Failed to delete old avatar files:", err);
    }

    const fileName = `${userId}.${ext}`;
    const filePath = path.join(uploadsDir, fileName);
    fs.writeFileSync(filePath, buffer);

    const avatarUrl = `/uploads/avatars/${fileName}`;

    await prisma.user.update({
      where: { id: userId },
      data: { avatar_url: avatarUrl },
    });

    await cacheInvalidateUser(userId);

    res.json({ message: "Avatar updated successfully", avatar_url: avatarUrl });
  } catch (error) {
    console.error("Failed to upload avatar:", error);
    res.status(500).json({ error: "Failed to upload avatar" });
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
      if (date) {
        acc[date] = (acc[date] || 0) + log.amount;
      }
      return acc;
    }, {});

    const result = [];
    for (let i = 6; i >= 0; i -= 1) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split("T")[0] || "";
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
      await prisma.userSecurity.upsert({
        where: { user_id: user.id },
        update: {
          password_reset_token: resetToken,
          password_reset_sent_at: new Date(),
        },
        create: {
          user_id: user.id,
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
      prisma.userSecurity.upsert({
        where: { user_id: security.user_id },
        update: {
          password_reset_token: null,
          password_reset_sent_at: null,
          failed_login_attempts: 0,
          lockout_until: null,
        },
        create: {
          user_id: security.user_id,
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

