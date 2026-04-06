import { Router, type Request, type Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../lib/db';

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

export default router;