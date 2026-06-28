import Stripe from "stripe";
import prisma from "../lib/db.ts";
import {
  createLearnUnitForSupervisor,
  createDefaultLearnUnitName,
} from "./learnUnitService.ts";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "");

export async function getOrCreateCustomer(userId: string, email: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { stripe_customer_id: true },
  });

  if (user?.stripe_customer_id) {
    return user.stripe_customer_id;
  }

  const customer = await stripe.customers.create({
    email,
    metadata: { userId },
  });

  await prisma.user.update({
    where: { id: userId },
    data: { stripe_customer_id: customer.id },
  });

  return customer.id;
}

export async function createCheckoutSession(params: {
  userId: string;
  email: string;
  planId: number;
  planName: string;
  billingCycle: string;
  calculatedPrice: number;
  successUrl: string;
  cancelUrl: string;
  learnUnitName?: string;
  maxStudents?: number;
  maxTeachers?: number;
  maxLessons?: number;
  maxGrades?: number;
  maxTemplates?: number;
}) {
  const customerId = await getOrCreateCustomer(params.userId, params.email);

  // 1. Dynamically create a Stripe Product
  const product = await stripe.products.create({
    name: `${params.planName.toUpperCase()} Subscription (${params.billingCycle})`,
    metadata: {
      planId: String(params.planId),
    },
  });

  // 2. Create a Price for that Product
  const price = await stripe.prices.create({
    product: product.id,
    unit_amount: Math.round(params.calculatedPrice * 100), // in cents
    currency: "usd",
    recurring: {
      interval: params.billingCycle === "annually" ? "year" : "month",
    },
  });

  // 3. Create Checkout Session
  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    payment_method_types: ["card"],
    line_items: [
      {
        price: price.id,
        quantity: 1,
      },
    ],
    mode: "subscription",
    success_url: params.successUrl,
    cancel_url: params.cancelUrl,
    metadata: {
      userId: params.userId,
      planId: String(params.planId),
      billingCycle: params.billingCycle,
      learnUnitName: params.learnUnitName || "",
      maxStudents: String(params.maxStudents ?? ""),
      maxTeachers: String(params.maxTeachers ?? ""),
      maxLessons: String(params.maxLessons ?? ""),
      maxGrades: String(params.maxGrades ?? ""),
      maxTemplates: String(params.maxTemplates ?? ""),
    },
  });

  return session;
}

export async function cancelSubscription(stripeSubscriptionId: string) {
  const sub = await stripe.subscriptions.update(stripeSubscriptionId, {
    cancel_at_period_end: true,
  });

  // Sync locally
  await prisma.subscriptionPlan.updateMany({
    where: { stripe_subscription_id: stripeSubscriptionId },
    data: { auto_renew: false },
  });

  return sub;
}

export async function reactivateSubscription(stripeSubscriptionId: string) {
  const sub = await stripe.subscriptions.update(stripeSubscriptionId, {
    cancel_at_period_end: false,
  });

  // Sync locally
  await prisma.subscriptionPlan.updateMany({
    where: { stripe_subscription_id: stripeSubscriptionId },
    data: { auto_renew: true },
  });

  return sub;
}

export async function upgradeSubscription(
  stripeSubscriptionId: string,
  newPlanName: string,
  billingCycle: string,
  newCalculatedPrice: number
) {
  const subscription = await stripe.subscriptions.retrieve(stripeSubscriptionId);
  const currentItemId = subscription.items.data[0]?.id;
  if (!currentItemId) {
    throw new Error("No items found on subscription");
  }

  // 1. Create a Product
  const product = await stripe.products.create({
    name: `${newPlanName.toUpperCase()} Subscription (${billingCycle})`,
  });

  // 2. Create a Price
  const price = await stripe.prices.create({
    product: product.id,
    unit_amount: Math.round(newCalculatedPrice * 100),
    currency: "usd",
    recurring: {
      interval: billingCycle === "annually" ? "year" : "month",
    },
  });

  // 3. Update Stripe subscription
  const updatedSub = await stripe.subscriptions.update(stripeSubscriptionId, {
    items: [
      {
        id: currentItemId,
        price: price.id,
      },
    ],
    proration_behavior: "always_invoice",
  });

  return updatedSub;
}

export async function activateLocalSubscription(
  stripeSubscriptionId: string,
  stripeInvoiceId: string,
  learnUnitName?: string
) {
  const subPlan = await prisma.subscriptionPlan.findUnique({
    where: { stripe_subscription_id: stripeSubscriptionId },
    include: { plan: true },
  });

  if (!subPlan) {
    throw new Error(`Subscription plan not found for stripeSubscriptionId: ${stripeSubscriptionId}`);
  }

  if (subPlan.status === "active") {
    return subPlan;
  }

  const userId = subPlan.user_id;
  const plan = subPlan.plan;

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
    throw new Error(`System role '${roleName}' not found`);
  }

  return await prisma.$transaction(async (tx) => {
    const currentSub = await tx.subscriptionPlan.findUnique({
      where: { id: subPlan.id },
    });
    if (currentSub?.status === "active") {
      return currentSub;
    }

    // 1. Terminate any other active subscriptions
    await tx.subscriptionPlan.updateMany({
      where: {
        user_id: userId,
        status: "active",
        id: { not: subPlan.id },
        effect_to: null,
      },
      data: {
        status: "cancelled",
        end_date: new Date(),
        effect_to: new Date(),
        auto_renew: false,
      },
    });

    // 2. Update to active
    const updatedSub = await tx.subscriptionPlan.update({
      where: { id: subPlan.id },
      data: {
        status: "active",
        start_date: new Date(),
        end_date: subPlan.billing_cycle === "annually"
          ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
          : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        updated_at: new Date(),
      },
    });

    // 3. Update invoice
    await tx.invoice.updateMany({
      where: { stripe_invoice_id: stripeInvoiceId },
      data: {
        status: "paid",
        billing_date: new Date(),
      },
    });

    // 4. Update user role
    await tx.user.update({
      where: { id: userId },
      data: {
        role_id: roleRecord.id,
        slots_purchased: updatedSub.slots_purchased,
      },
    });

    // 5. Manage learn unit if supervisor
    if (roleName === "supervisor") {
      const existingUnit = await tx.learnUnit.findUnique({
        where: { supervisor_id: userId },
      });

      if (existingUnit) {
        await tx.learnUnit.update({
          where: { id: existingUnit.id },
          data: {
            max_students: updatedSub.max_students,
            max_teachers: updatedSub.max_teachers,
            max_lessons: updatedSub.max_lessons,
            max_templates: updatedSub.max_templates,
            max_grades: updatedSub.max_grades,
            max_subjects: updatedSub.max_subjects,
          },
        });
      } else {
        const user = await tx.user.findUnique({ where: { id: userId } });
        const luName = learnUnitName?.trim() || createDefaultLearnUnitName(user?.username || "Supervisor");

        const newUnit = await createLearnUnitForSupervisor(
          userId,
          luName,
          {
            max_students: updatedSub.max_students,
            max_teachers: updatedSub.max_teachers,
            max_lessons: updatedSub.max_lessons,
            max_templates: updatedSub.max_templates,
            max_grades: updatedSub.max_grades,
            max_subjects: updatedSub.max_subjects,
          },
          tx as any
        );

        await tx.user.update({
          where: { id: userId },
          data: { learn_unit_id: newUnit.id },
        });
      }
    }

    return updatedSub;
  });
}

export async function verifyCheckoutSession(sessionId: string) {
  const session = await stripe.checkout.sessions.retrieve(sessionId);

  if (session.payment_status === "paid") {
    const subId = session.subscription as string;
    const invId = session.invoice as string;
    const learnUnitName = session.metadata?.learnUnitName;

    return await activateLocalSubscription(subId, invId, learnUnitName);
  }

  throw new Error("Checkout session has not been paid");
}
