import { Router, type Request, type Response } from "express";
import bcrypt from "bcryptjs";
import prisma from "../lib/db.ts";
import { authenticate } from "../middleware/auth.ts";

const router = Router();

const requireSupervisor = (req: Request, res: Response, next: () => void) => {
  const role = (req as any).user?.role;
  if (role !== "supervisor" && role !== "admin") {
    return res.status(403).json({ error: "Access denied: Supervisor or Admin role required" });
  }
  next();
};

const resolveLearnUnitContext = async (req: Request) => {
  const authUser = (req as any).user as { id: string; role: string; learn_unit_id?: string | null };
  const learnUnitIdFromQuery = typeof req.query.learnUnitId === "string" ? req.query.learnUnitId.trim() : "";

  let learnUnitId = authUser.role === "admin" && learnUnitIdFromQuery
    ? learnUnitIdFromQuery
    : authUser.learn_unit_id || (
        await prisma.user.findUnique({
          where: { id: authUser.id },
          select: { learn_unit_id: true },
        })
      )?.learn_unit_id || null;

  if (!learnUnitId && authUser.role === "supervisor") {
    const supervisedUnit = await prisma.learnUnit.findUnique({
      where: { supervisor_id: authUser.id },
    });
    if (supervisedUnit) {
      learnUnitId = supervisedUnit.id;
    }
  }

  if (!learnUnitId) return null;

  return prisma.learnUnit.findUnique({
    where: { id: learnUnitId },
    include: {
      supervisor: {
        select: {
          id: true,
          username: true,
          email: true,
          slots_purchased: true,
        },
      },
    },
  });
};

router.post("/buy-slots", authenticate, requireSupervisor, async (req: Request, res: Response) => {
  try {
    const authUserId = (req as any).user.id as string;
    const slotsCount = Number(req.body.slots);
    if (!Number.isInteger(slotsCount) || slotsCount <= 0) {
      return res.status(400).json({ error: "Invalid slots count specified" });
    }

    const learnUnit = await resolveLearnUnitContext(req);
    if (!learnUnit?.supervisor_id) {
      return res.status(400).json({ error: "Learn unit registration is required before buying seats" });
    }
    const supervisorId = learnUnit.supervisor_id;

    if ((req as any).user.role !== "admin" && supervisorId !== authUserId) {
      return res.status(403).json({ error: "Only the learn unit supervisor can buy seats" });
    }

    let updatedSlots = 0;
    await prisma.$transaction(async (tx) => {
      // 1. Update slots on the user
      const user = await tx.user.update({
        where: { id: supervisorId },
        data: {
          slots_purchased: {
            increment: slotsCount,
          },
        },
        select: {
          slots_purchased: true,
        },
      });
      updatedSlots = user.slots_purchased;

      // 2. Try to update active subscription plan if it exists
      const activeSub = await tx.subscriptionPlan.findFirst({
        where: {
          user_id: supervisorId,
          status: "active",
          effect_to: null,
        },
      });

      if (activeSub) {
        // a. Supersede the old subscription plan version
        await tx.subscriptionPlan.update({
          where: { id: activeSub.id },
          data: {
            status: "superseded",
            effect_to: new Date(),
          },
        });

        // b. Create a new subscription plan version with incremented slots
        const newSub = await tx.subscriptionPlan.create({
          data: {
            user_id: supervisorId,
            plan_id: activeSub.plan_id,
            status: "active",
            billing_cycle: activeSub.billing_cycle,
            start_date: activeSub.start_date,
            end_date: activeSub.end_date,
            auto_renew: activeSub.auto_renew,
            slots_purchased: activeSub.slots_purchased + slotsCount,
            effect_from: new Date(),
            effect_to: null,
          },
        });

        // 3. Create invoice for additional slots purchase
        const billingCycle = activeSub.billing_cycle || "monthly";
        const pricePerSeat = billingCycle === "annually" ? 50.00 : 5.00;
        const totalAmount = pricePerSeat * slotsCount;

        await tx.invoice.create({
          data: {
            user_id: supervisorId,
            subscription_plan_id: newSub.id, // Point to the NEW version of the subscription!
            amount: totalAmount,
            status: "paid",
            description: `Learning Center - Purchased ${slotsCount} Additional Seats (${billingCycle === "annually" ? "Annual" : "Monthly"} rate)`,
          },
        });
      }
    });

    res.json({ message: `Successfully purchased ${slotsCount} slot(s).`, slots_purchased: updatedSlots });
  } catch (error: any) {
    res.status(500).json({ error: "Failed to purchase slots", details: error.message });
  }
});

router.post("/members", authenticate, requireSupervisor, async (req: Request, res: Response) => {
  try {
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

    const learnUnit = await resolveLearnUnitContext(req);
    if (!learnUnit) {
      return res.status(400).json({ error: "Learn unit registration is required before adding members" });
    }

    const targetRoleName = role_name === "teacher" ? "teacher" : "free_student";
    const [existingUser, roleRecord] = await Promise.all([
      prisma.user.findUnique({ where: { email } }),
      prisma.role.findUnique({ where: { name: targetRoleName } }),
    ]);

    if (existingUser) {
      return res.status(400).json({ error: "Email already taken" });
    }
    if (!roleRecord) {
      return res.status(400).json({ error: "Specified role does not exist" });
    }

    if (targetRoleName === "teacher" && learnUnit.max_teachers !== null) {
      const activeTeachersCount = await prisma.user.count({
        where: {
          learn_unit_id: learnUnit.id,
          role: { name: "teacher" },
        },
      });
      if (activeTeachersCount >= learnUnit.max_teachers) {
        return res.status(403).json({ error: "Access denied: subscription limit for teacher accounts reached" });
      }
    }

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
        learn_unit_id: learnUnit.id,
        account_status: "active",
        security: {
          create: {
            email_verified_at: new Date(),
          }
        },
        learning_profile: {
          create: {}
        }
      },
      select: {
        id: true,
        username: true,
        email: true,
        learn_unit_id: true,
        role: { select: { name: true } },
        created_at: true,
      },
    });

    if (targetRoleName === "free_student") {
      await prisma.studentStats.create({
        data: { user_id: member.id },
      });
    }

    res.status(201).json({
      message: "Member created successfully",
      member,
      learnUnit: {
        id: learnUnit.id,
        name: learnUnit.name,
        code: learnUnit.code,
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: "Failed to create member", details: error.message });
  }
});

router.get("/members", authenticate, requireSupervisor, async (req: Request, res: Response) => {
  try {
    const learnUnit = await resolveLearnUnitContext(req);
    if (!learnUnit) {
      if ((req as any).user?.role === "admin") {
        return res.json({
          learnUnit: null,
          members: [],
        });
      }
      return res.status(400).json({ error: "Learn unit registration is required before listing members" });
    }

    const members = await prisma.user.findMany({
      where: {
        learn_unit_id: learnUnit.id,
        id: { not: learnUnit.supervisor_id ?? undefined },
      },
      select: {
        id: true,
        username: true,
        email: true,
        learn_unit_id: true,
        role: { select: { name: true } },
        created_at: true,
        student_stats: true,
      },
      orderBy: { created_at: "desc" },
    });

    res.json({
      learnUnit: {
        id: learnUnit.id,
        name: learnUnit.name,
        code: learnUnit.code,
        supervisor_id: learnUnit.supervisor_id,
      },
      members,
    });
  } catch (error: any) {
    res.status(500).json({ error: "Failed to retrieve members", details: error.message });
  }
});

router.post("/members/:id/assign-seat", authenticate, requireSupervisor, async (req: Request, res: Response) => {
  try {
    const memberId = req.params.id as string;
    const learnUnit = await resolveLearnUnitContext(req);

    if (!learnUnit) {
      return res.status(400).json({ error: "Learn unit registration is required before assigning seats" });
    }

    const member = await prisma.user.findUnique({
      where: { id: memberId },
      include: { role: true },
    });

    if (!member || member.learn_unit_id !== learnUnit.id) {
      return res.status(404).json({ error: "Managed member not found" });
    }
    if (member.role.name === "sub_student") {
      return res.status(400).json({ error: "Member is already a subscribed student" });
    }
    if (member.role.name !== "free_student") {
      return res.status(400).json({ error: "Seat can only be assigned to a free student" });
    }

    const activeSubStudentsCount = await prisma.user.count({
      where: {
        learn_unit_id: learnUnit.id,
        role: { name: "sub_student" },
      },
    });

    const limit = learnUnit.max_students !== null
      ? learnUnit.max_students
      : (learnUnit.supervisor?.slots_purchased ?? 0);
    if (activeSubStudentsCount >= limit) {
      return res.status(403).json({ error: "Access denied: subscription limit for student seats reached" });
    }

    const subStudentRole = await prisma.role.findUnique({
      where: { name: "sub_student" },
    });
    if (!subStudentRole) {
      return res.status(500).json({ error: "Subscribed student role record not found" });
    }

    const updatedMember = await prisma.user.update({
      where: { id: memberId },
      data: {
        role_id: subStudentRole.id,
      },
      select: {
        id: true,
        username: true,
        email: true,
        role: { select: { name: true } },
      },
    });

    res.json({ message: "Seat assigned successfully. User upgraded to subscribed student.", member: updatedMember });
  } catch (error: any) {
    res.status(500).json({ error: "Failed to assign seat", details: error.message });
  }
});

router.post("/members/:id/unassign-seat", authenticate, requireSupervisor, async (req: Request, res: Response) => {
  try {
    const memberId = req.params.id as string;
    const learnUnit = await resolveLearnUnitContext(req);

    if (!learnUnit) {
      return res.status(400).json({ error: "Learn unit registration is required before revoking seats" });
    }

    const member = await prisma.user.findUnique({
      where: { id: memberId },
      include: { role: true },
    });

    if (!member || member.learn_unit_id !== learnUnit.id) {
      return res.status(404).json({ error: "Managed member not found" });
    }
    if (member.role.name !== "sub_student") {
      return res.status(400).json({ error: "Member does not hold an active seat assignment" });
    }

    const freeStudentRole = await prisma.role.findUnique({
      where: { name: "free_student" },
    });
    if (!freeStudentRole) {
      return res.status(500).json({ error: "Free student role record not found" });
    }

    const updatedMember = await prisma.user.update({
      where: { id: memberId },
      data: {
        role_id: freeStudentRole.id,
      },
      select: {
        id: true,
        username: true,
        email: true,
        role: { select: { name: true } },
      },
    });

    res.json({ message: "Seat unassigned successfully. User downgraded to free student.", member: updatedMember });
  } catch (error: any) {
    res.status(500).json({ error: "Failed to revoke seat", details: error.message });
  }
});

export default router;
