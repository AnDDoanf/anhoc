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

    let activeSubResponse: any = activeSubscription;
    if (activeSubscription && activeSubscription.plan.name === "learning_center") {
      const plan = activeSubscription.plan as any;
      const billingCycle = activeSubscription.billing_cycle;
      const numStudents = (activeSubscription as any).max_students ?? 20;
      const numTeachers = (activeSubscription as any).max_teachers ?? 5;
      const numLessons = (activeSubscription as any).max_lessons ?? 50;
      const numGrades = (activeSubscription as any).max_grades ?? 20;
      const numTemplates = (activeSubscription as any).max_templates ?? 200;

      const pStudent = Number(billingCycle === "annually" ? plan.price_per_student_annually : plan.price_per_student_monthly);
      const pTeacher = Number(billingCycle === "annually" ? plan.price_per_teacher_annually : plan.price_per_teacher_monthly);
      const pLesson = Number(billingCycle === "annually" ? plan.price_per_lesson_annually : plan.price_per_lesson_monthly);
      const pGrade = Number(billingCycle === "annually" ? plan.price_per_grade_annually : plan.price_per_grade_monthly);
      const pTemplate = Number(billingCycle === "annually" ? plan.price_per_template_annually : plan.price_per_template_monthly);

      const basePrice = Number(billingCycle === "annually" ? plan.price_annually : plan.price_monthly);

      const calculatedPrice = basePrice +
        (numStudents * pStudent) +
        (numTeachers * pTeacher) +
        (numLessons * pLesson) +
        (numGrades * pGrade) +
        (numTemplates * pTemplate);

      activeSubResponse = {
        ...activeSubscription,
        calculatedPrice,
      };
    }

    // Fetch invoices
    const invoices = await prisma.invoice.findMany({
      where: { user_id: userId },
      orderBy: { billing_date: "desc" },
    });

    res.json({
      activeSubscription: activeSubResponse || null,
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
    const { 
      planId, 
      billingCycle, 
      learnUnitName,
      maxStudents,
      maxTeachers,
      maxLessons,
      maxGrades,
      maxTemplates
    } = req.body;

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

    // Parse dynamic capacity limits
    const numStudents = Number(maxStudents ?? 20);
    const numTeachers = Number(maxTeachers ?? 5);
    const numLessons = Number(maxLessons ?? 50);
    const numGrades = Number(maxGrades ?? 20);
    const numTemplates = Number(maxTemplates ?? 200);

    // Calculate dynamic price for Learning Center plan
    const planAny = plan as any;
    let calculatedPrice = billingCycle === "annually" ? Number(plan.price_annually) : Number(plan.price_monthly);
    if (plan.name === "learning_center") {
      const pStudent = Number(billingCycle === "annually" ? planAny.price_per_student_annually : planAny.price_per_student_monthly);
      const pTeacher = Number(billingCycle === "annually" ? planAny.price_per_teacher_annually : planAny.price_per_teacher_monthly);
      const pLesson = Number(billingCycle === "annually" ? planAny.price_per_lesson_annually : planAny.price_per_lesson_monthly);
      const pGrade = Number(billingCycle === "annually" ? planAny.price_per_grade_annually : planAny.price_per_grade_monthly);
      const pTemplate = Number(billingCycle === "annually" ? planAny.price_per_template_annually : planAny.price_per_template_monthly);

      calculatedPrice += 
        (numStudents * pStudent) +
        (numTeachers * pTeacher) +
        (numLessons * pLesson) +
        (numGrades * pGrade) +
        (numTemplates * pTemplate);
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

      const targetMaxStudents = plan.name === "learning_center" ? numStudents : plan.max_students;
      const targetMaxTeachers = plan.name === "learning_center" ? numTeachers : plan.max_teachers;
      const targetMaxLessons = plan.name === "learning_center" ? numLessons : plan.max_lessons;
      const targetMaxTemplates = plan.name === "learning_center" ? numTemplates : plan.max_templates;
      const targetMaxGrades = plan.name === "learning_center" ? numGrades : plan.max_grades;

      const sub = await tx.subscriptionPlan.create({
        data: {
          user_id: userId,
          plan_id: plan.id,
          status: "active",
          billing_cycle: billingCycle,
          start_date: startDate,
          end_date: endDate,
          auto_renew: true,
          slots_purchased: plan.name === "learning_center" ? numStudents : (plan.max_students || 0),
          max_students: targetMaxStudents,
          max_teachers: targetMaxTeachers,
          max_lessons: targetMaxLessons,
          max_templates: targetMaxTemplates,
          max_grades: targetMaxGrades,
          max_subjects: plan.max_subjects,
          effect_from: new Date(),
          effect_to: null,
        } as any,
      });

      // 3. Create the Invoice record
      const cycleLabel = billingCycle === "annually" ? "Annual" : "Monthly";
      await tx.invoice.create({
        data: {
          user_id: userId,
          subscription_plan_id: sub.id,
          amount: calculatedPrice,
          status: "paid",
          description: `${plan.name.toUpperCase()} Subscription Plan - ${cycleLabel} Cycle`,
        },
      });

      // 4. Update user role
      await tx.user.update({
        where: { id: userId },
        data: {
          role_id: roleRecord.id,
          slots_purchased: plan.name === "learning_center" ? numStudents : (plan.max_students || 0),
        },
      });

      // 5. Manage Learn Unit if supervisor plan (Family or Learning Center)
      if (roleName === "supervisor") {
        const existingUnit = await tx.learnUnit.findUnique({
          where: { supervisor_id: userId },
        });

        if (existingUnit) {
          // Update limits of existing learn unit
          await tx.learnUnit.update({
            where: { id: existingUnit.id },
            data: {
              max_students: targetMaxStudents,
              max_teachers: targetMaxTeachers,
              max_lessons: targetMaxLessons,
              max_templates: targetMaxTemplates,
              max_grades: targetMaxGrades,
              max_subjects: plan.max_subjects,
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
              max_lessons: targetMaxLessons,
              max_templates: targetMaxTemplates,
              max_grades: targetMaxGrades,
              max_subjects: plan.max_subjects,
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
