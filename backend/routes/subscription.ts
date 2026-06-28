import { Router, type Request, type Response } from "express";
import prisma from "../lib/db.ts";
import { authenticate } from "../middleware/auth.ts";
import {
  createLearnUnitForSupervisor,
  createDefaultLearnUnitName,
} from "../services/learnUnitService.ts";
import {
  createCheckoutSession,
  cancelSubscription,
  reactivateSubscription,
  verifyCheckoutSession,
} from "../services/stripeService.ts";

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

    if (activeSubscription.stripe_subscription_id) {
      if (activeSubscription.auto_renew) {
        await cancelSubscription(activeSubscription.stripe_subscription_id);
      } else {
        await reactivateSubscription(activeSubscription.stripe_subscription_id);
      }
      
      const updated = await prisma.subscriptionPlan.findUnique({
        where: { id: activeSubscription.id },
        include: { plan: true },
      });
      return res.json({ activeSubscription: updated });
    }

    // Fallback simulated logic for legacy/simulated
    const updated = await prisma.$transaction(async (tx) => {
      await tx.subscriptionPlan.update({
        where: { id: activeSubscription.id },
        data: {
          status: "superseded",
          effect_to: new Date(),
        },
      });

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

// Upgrade/Downgrade subscription checkout using Stripe
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

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Resolve the target plan
    const plan = await prisma.plan.findFirst({
      where: { id: Number(planId) },
    });

    if (!plan) {
      return res.status(404).json({ error: "Target plan not found" });
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

    // Success and cancel redirection URLs
    const origin = req.headers.origin || process.env.FRONTEND_URL || "http://localhost:5000";
    const successUrl = `${origin}/subscription?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${origin}/subscription?cancelled=true`;

    // Create Stripe checkout session
    const session = await createCheckoutSession({
      userId,
      email: user.email,
      planId: plan.id,
      planName: plan.name,
      billingCycle,
      calculatedPrice,
      successUrl,
      cancelUrl,
      learnUnitName,
      maxStudents: numStudents,
      maxTeachers: numTeachers,
      maxLessons: numLessons,
      maxGrades: numGrades,
      maxTemplates: numTemplates,
    });

    const targetMaxStudents = plan.name === "learning_center" ? numStudents : plan.max_students;
    const targetMaxTeachers = plan.name === "learning_center" ? numTeachers : plan.max_teachers;
    const targetMaxLessons = plan.name === "learning_center" ? numLessons : plan.max_lessons;
    const targetMaxTemplates = plan.name === "learning_center" ? numTemplates : plan.max_templates;
    const targetMaxGrades = plan.name === "learning_center" ? numGrades : plan.max_grades;

    // Create local SubscriptionPlan in "incomplete" status and Invoice in "pending" status
    await prisma.$transaction(async (tx) => {
      const sub = await tx.subscriptionPlan.create({
        data: {
          user_id: userId,
          plan_id: plan.id,
          status: "incomplete",
          billing_cycle: billingCycle,
          start_date: new Date(),
          end_date: null,
          auto_renew: true,
          slots_purchased: plan.name === "learning_center" ? numStudents : (plan.max_students || 0),
          max_students: targetMaxStudents,
          max_teachers: targetMaxTeachers,
          max_lessons: targetMaxLessons,
          max_templates: targetMaxTemplates,
          max_grades: targetMaxGrades,
          max_subjects: plan.max_subjects,
          stripe_subscription_id: session.id,
          effect_from: new Date(),
          effect_to: null,
        } as any,
      });

      const cycleLabel = billingCycle === "annually" ? "Annual" : "Monthly";
      await tx.invoice.create({
        data: {
          user_id: userId,
          subscription_plan_id: sub.id,
          amount: calculatedPrice,
          status: "pending",
          stripe_invoice_id: session.id,
          description: `${plan.name.toUpperCase()} Subscription Plan - ${cycleLabel} Cycle (Pending Payment)`,
        },
      });
    });

    res.json({ success: true, url: session.url });
  } catch (error: any) {
    res.status(500).json({ error: "Failed to process subscription checkout", details: error.message });
  }
});

// Verify manual checkout session
router.get("/verify-session", authenticate, async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.query;
    if (!sessionId || typeof sessionId !== "string") {
      return res.status(400).json({ error: "Missing sessionId parameter" });
    }

    const updatedSub = await verifyCheckoutSession(sessionId);
    res.json({ success: true, activeSubscription: updatedSub });
  } catch (error: any) {
    res.status(500).json({ error: "Failed to verify session", details: error.message });
  }
});

export default router;
