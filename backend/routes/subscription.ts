import { Router, type Request, type Response } from "express";
import prisma from "../lib/db.ts";
import { authenticate } from "../middleware/auth.ts";
import {
  createLearnUnitForSupervisor,
  createDefaultLearnUnitName,
} from "../services/learnUnitService.ts";

const router = Router();

// List all available plans
router.get("/plans", async (req: Request, res: Response) => {
  try {
    const plans = await prisma.plan.findMany({
      where: { effect_to: null },
      orderBy: { price_monthly: "asc" },
    });
    res.json(plans);
  } catch (error: any) {
    res.status(500).json({ error: "Failed to load plans", details: error.message });
  }
});

// Retrieve active subscription and billing history (invoices)
router.get("/details", authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;

    // Fetch active subscription
    const activeSubscription = await prisma.subscriptionPlan.findFirst({
      where: {
        user_id: userId,
        status: "active",
        effect_to: null,
      },
      include: {
        plan: true,
      },
    });

    // Fetch invoices
    const invoices = await prisma.invoice.findMany({
      where: { user_id: userId },
      orderBy: { billing_date: "desc" },
    });

    res.json({
      activeSubscription: activeSubscription || null,
      invoices,
    });
  } catch (error: any) {
    res.status(500).json({ error: "Failed to load subscription details", details: error.message });
  }
});

// Toggle auto-renew (continuous payment / stop payment)
router.post("/toggle-auto-renew", authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;

    const activeSubscription = await prisma.subscriptionPlan.findFirst({
      where: {
        user_id: userId,
        status: "active",
        effect_to: null,
      },
    });

    if (!activeSubscription) {
      return res.status(400).json({ error: "No active subscription found to modify" });
    }

    const updated = await prisma.$transaction(async (tx) => {
      // 1. Supersede old subscription version
      await tx.subscriptionPlan.update({
        where: { id: activeSubscription.id },
        data: {
          status: "superseded",
          effect_to: new Date(),
        },
      });

      // 2. Create a new subscription version with toggled auto-renew
      return tx.subscriptionPlan.create({
        data: {
          user_id: userId,
          plan_id: activeSubscription.plan_id,
          status: "active",
          billing_cycle: activeSubscription.billing_cycle,
          start_date: activeSubscription.start_date,
          end_date: activeSubscription.end_date,
          auto_renew: !activeSubscription.auto_renew,
          slots_purchased: activeSubscription.slots_purchased,
          effect_from: new Date(),
          effect_to: null,
        },
        include: { plan: true },
      });
    });

    res.json({ activeSubscription: updated });
  } catch (error: any) {
    res.status(500).json({ error: "Failed to toggle auto-renew", details: error.message });
  }
});

// Upgrade/Downgrade subscription checkout
router.post("/checkout", authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { planId, billingCycle, learnUnitName } = req.body;

    if (!planId || !["monthly", "annually"].includes(billingCycle)) {
      return res.status(400).json({ error: "Invalid planId or billingCycle" });
    }

    // Resolve the target plan
    const plan = await prisma.plan.findFirst({
      where: { id: Number(planId) },
    });

    if (!plan) {
      return res.status(404).json({ error: "Target plan not found" });
    }

    // Resolve corresponding role record
    let roleName = "free_student";
    if (plan.name === "pro") {
      roleName = "sub_student";
    } else if (plan.name === "family" || plan.name === "learning_center") {
      roleName = "supervisor";
    }

    const roleRecord = await prisma.role.findUnique({
      where: { name: roleName },
    });

    if (!roleRecord) {
      return res.status(500).json({ error: `System role '${roleName}' not found` });
    }

    // Start database transaction to ensure billing consistency
    await prisma.$transaction(async (tx) => {
      // 1. Terminate any previous active subscriptions
      await tx.subscriptionPlan.updateMany({
        where: {
          user_id: userId,
          status: "active",
          effect_to: null,
        },
        data: {
          status: "cancelled",
          end_date: new Date(),
          effect_to: new Date(),
          auto_renew: false,
        },
      });

      // 2. Create the new active subscription
      const durationDays = billingCycle === "annually" ? 365 : 30;
      const startDate = new Date();
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + durationDays);

      const sub = await tx.subscriptionPlan.create({
        data: {
          user_id: userId,
          plan_id: plan.id,
          status: "active",
          billing_cycle: billingCycle,
          start_date: startDate,
          end_date: endDate,
          auto_renew: true,
          slots_purchased: plan.name === "learning_center" ? 10 : 0, // Default seats for LC base plan
          effect_from: new Date(),
          effect_to: null,
        },
      });

      // 3. Create the Invoice record
      const invoiceAmount = billingCycle === "annually" ? plan.price_annually : plan.price_monthly;
      const cycleLabel = billingCycle === "annually" ? "Annual" : "Monthly";
      await tx.invoice.create({
        data: {
          user_id: userId,
          subscription_plan_id: sub.id,
          amount: invoiceAmount,
          status: "paid",
          description: `${plan.name.toUpperCase()} Subscription Plan - ${cycleLabel} Cycle`,
        },
      });

      // 4. Update user role
      await tx.user.update({
        where: { id: userId },
        data: {
          role_id: roleRecord.id,
          slots_purchased: plan.name === "learning_center" ? 10 : 0, // Reset slots to LC defaults
        },
      });

      // 5. Manage Learn Unit if supervisor plan (Family or Learning Center)
      if (roleName === "supervisor") {
        const existingUnit = await tx.learnUnit.findUnique({
          where: { supervisor_id: userId },
        });

        const targetMaxStudents = plan.max_students;
        const targetMaxTeachers = plan.max_teachers;

        if (existingUnit) {
          // Update limits of existing learn unit
          await tx.learnUnit.update({
            where: { id: existingUnit.id },
            data: {
              max_students: targetMaxStudents,
              max_teachers: targetMaxTeachers,
            },
          });
        } else {
          // Provision a new learn unit
          const user = await tx.user.findUnique({ where: { id: userId } });
          const luName = learnUnitName?.trim() || createDefaultLearnUnitName(user?.username || "Supervisor");
          
          const newUnit = await createLearnUnitForSupervisor(
            userId,
            luName,
            {
              max_students: targetMaxStudents,
              max_teachers: targetMaxTeachers,
            },
            tx as any
          );

          // Update supervisor's learn unit ID
          await tx.user.update({
            where: { id: userId },
            data: { learn_unit_id: newUnit.id },
          });
        }
      }
    });

    res.json({ success: true, message: `Successfully subscribed to ${plan.name} plan` });
  } catch (error: any) {
    res.status(500).json({ error: "Failed to process subscription checkout", details: error.message });
  }
});

export default router;
