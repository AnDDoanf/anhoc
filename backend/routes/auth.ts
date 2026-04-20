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
        username: user.username,
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

export default router;