import { Router, type Request, type Response } from "express";
import bcrypt from "bcryptjs";
import prisma from "../lib/db.ts";
import { authenticate } from "../middleware/auth.ts";

const router = Router();

// Middleware to authorize supervisor or admin roles
const requireSupervisor = (req: Request, res: Response, next: any) => {
  const role = (req as any).user?.role;
  if (role !== "supervisor" && role !== "admin") {
    return res.status(403).json({ error: "Access denied: Supervisor or Admin role required" });
  }
  next();
};

// POST /api/v1/supervisor/buy-slots: Increment slots_purchased for supervisor
router.post("/buy-slots", authenticate, requireSupervisor, async (req: Request, res: Response) => {
  try {
    const supervisorId = (req as any).user.id;
    const slotsCount = Number(req.body.slots);
    if (!Number.isInteger(slotsCount) || slotsCount <= 0) {
      return res.status(400).json({ error: "Invalid slots count specified" });
    }

    const updated = await prisma.user.update({
      where: { id: supervisorId },
      data: {
        slots_purchased: {
          increment: slotsCount
        }
      },
      select: {
        id: true,
        slots_purchased: true
      }
    });

    res.json({ message: `Successfully purchased ${slotsCount} slot(s).`, slots_purchased: updated.slots_purchased });
  } catch (error: any) {
    res.status(500).json({ error: "Failed to purchase slots", details: error.message });
  }
});

// POST /api/v1/supervisor/members: Create student/teacher accounts dynamically linked to supervisor_id
router.post("/members", authenticate, requireSupervisor, async (req: Request, res: Response) => {
  try {
    const supervisorId = (req as any).user.id;
    const { email, password, username, role_name } = req.body;

    if (!email || !email.includes("@")) {
      return res.status(400).json({ error: "A valid email is required" });
    }
    if (!password || password.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters" });
    }
    if (!username) {
      return res.status(400).json({ error: "Username is required" });
    }
    const targetRoleName = role_name === "teacher" ? "teacher" : "free_student";

    const [existingUser, roleRecord, supervisor] = await Promise.all([
      prisma.user.findUnique({ where: { email } }),
      prisma.role.findUnique({ where: { name: targetRoleName } }),
      prisma.user.findUnique({ where: { id: supervisorId } })
    ]);

    if (existingUser) {
      return res.status(400).json({ error: "Email already taken" });
    }
    if (!roleRecord) {
      return res.status(400).json({ error: "Specified role does not exist" });
    }
    if (!supervisor) {
      return res.status(404).json({ error: "Supervisor not found" });
    }

    if (targetRoleName === "teacher" && supervisor.max_teachers !== null) {
      const activeTeachersCount = await prisma.user.count({
        where: {
          supervisor_id: supervisorId,
          role: { name: "teacher" }
        }
      });
      if (activeTeachersCount >= supervisor.max_teachers) {
        return res.status(403).json({ error: "Access denied: subscription limit for teacher accounts reached" });
      }
    }

    if (existingUser) {
      return res.status(400).json({ error: "Email already taken" });
    }
    if (!roleRecord) {
      return res.status(400).json({ error: "Specified role does not exist" });
    }

    // Check username uniqueness
    const existingUsername = await prisma.user.findUnique({ where: { username } });
    if (existingUsername) {
      return res.status(400).json({ error: "Username already taken" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const member = await prisma.user.create({
      data: {
        username,
        email,
        password_hash: hashedPassword,
        role_id: roleRecord.id,
        supervisor_id: supervisorId,
        account_status: "active",
        email_verified_at: new Date()
      },
      select: {
        id: true,
        username: true,
        email: true,
        role: { select: { name: true } },
        created_at: true
      }
    });

    if (targetRoleName === "free_student") {
      await prisma.studentStats.create({
        data: { user_id: member.id }
      });
    }

    res.status(201).json({ message: "Member created successfully", member });
  } catch (error: any) {
    res.status(500).json({ error: "Failed to create member", details: error.message });
  }
});

// GET /api/v1/supervisor/members: List all managed members
router.get("/members", authenticate, requireSupervisor, async (req: Request, res: Response) => {
  try {
    const supervisorId = (req as any).user.id;
    const members = await prisma.user.findMany({
      where: { supervisor_id: supervisorId },
      select: {
        id: true,
        username: true,
        email: true,
        role: { select: { name: true } },
        created_at: true,
        student_stats: true
      },
      orderBy: { created_at: "desc" }
    });

    res.json(members);
  } catch (error: any) {
    res.status(500).json({ error: "Failed to retrieve members", details: error.message });
  }
});

// POST /api/v1/supervisor/members/:id/assign-seat: Assign seat to student (free_student -> sub_student)
router.post("/members/:id/assign-seat", authenticate, requireSupervisor, async (req: Request, res: Response) => {
  try {
    const supervisorId = (req as any).user.id;
    const memberId = req.params.id as string;

    // Fetch supervisor info
    const supervisor = await prisma.user.findUnique({
      where: { id: supervisorId },
      select: { slots_purchased: true, max_students: true }
    });

    if (!supervisor) {
      return res.status(404).json({ error: "Supervisor not found" });
    }

    // Fetch candidate member
    const member = await prisma.user.findUnique({
      where: { id: memberId },
      include: { role: true }
    });

    if (!member || member.supervisor_id !== supervisorId) {
      return res.status(404).json({ error: "Managed member not found" });
    }

    if (member.role.name === "sub_student") {
      return res.status(400).json({ error: "Member is already a subscribed student" });
    }

    if (member.role.name !== "free_student") {
      return res.status(400).json({ error: "Seat can only be assigned to a free student" });
    }

    // Calculate currently active sub_student seats
    const activeSubStudentsCount = await prisma.user.count({
      where: {
        supervisor_id: supervisorId,
        role: { name: "sub_student" }
      }
    });

    const limit = supervisor.max_students !== null ? supervisor.max_students : supervisor.slots_purchased;
    if (activeSubStudentsCount >= limit) {
      return res.status(403).json({ error: "Access denied: subscription limit for student seats reached" });
    }

    // Upgrade member to sub_student
    const subStudentRole = await prisma.role.findUnique({
      where: { name: "sub_student" }
    });

    if (!subStudentRole) {
      return res.status(500).json({ error: "Subscribed student role record not found" });
    }

    const updatedMember = await prisma.user.update({
      where: { id: memberId },
      data: {
        role_id: subStudentRole.id
      },
      select: {
        id: true,
        username: true,
        email: true,
        role: { select: { name: true } }
      }
    });

    res.json({ message: "Seat assigned successfully. User upgraded to subscribed student.", member: updatedMember });
  } catch (error: any) {
    res.status(500).json({ error: "Failed to assign seat", details: error.message });
  }
});

// POST /api/v1/supervisor/members/:id/unassign-seat: Revoke seat (sub_student -> free_student)
router.post("/members/:id/unassign-seat", authenticate, requireSupervisor, async (req: Request, res: Response) => {
  try {
    const supervisorId = (req as any).user.id;
    const memberId = req.params.id as string;

    // Fetch candidate member
    const member = await prisma.user.findUnique({
      where: { id: memberId },
      include: { role: true }
    });

    if (!member || member.supervisor_id !== supervisorId) {
      return res.status(404).json({ error: "Managed member not found" });
    }

    if (member.role.name !== "sub_student") {
      return res.status(400).json({ error: "Member does not hold an active seat assignment" });
    }

    // Downgrade to free_student
    const freeStudentRole = await prisma.role.findUnique({
      where: { name: "free_student" }
    });

    if (!freeStudentRole) {
      return res.status(500).json({ error: "Free student role record not found" });
    }

    const updatedMember = await prisma.user.update({
      where: { id: memberId },
      data: {
        role_id: freeStudentRole.id
      },
      select: {
        id: true,
        username: true,
        email: true,
        role: { select: { name: true } }
      }
    });

    res.json({ message: "Seat unassigned successfully. User downgraded to free student.", member: updatedMember });
  } catch (error: any) {
    res.status(500).json({ error: "Failed to revoke seat", details: error.message });
  }
});

export default router;
