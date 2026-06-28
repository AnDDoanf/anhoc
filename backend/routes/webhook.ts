import { Router, type Request, type Response } from "express";
import Stripe from "stripe";
import prisma from "../lib/db.ts";
import { activateLocalSubscription } from "../services/stripeService.ts";

const router = Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "");
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET || "";

router.post("/", async (req: Request, res: Response) => {
  const sig = req.headers["stripe-signature"];

  let event: Stripe.Event;

  try {
    if (!sig) {
      return res.status(400).send("Webhook Error: Missing stripe-signature header");
    }
    // req.body contains raw buffer because we will parse it with express.raw
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err: any) {
    console.error(`❌ Webhook Error signature verification failed: ${err.message}`);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const sessionId = session.id;
        const subId = session.subscription as string;
        const invId = session.invoice as string;
        const learnUnitName = session.metadata?.learnUnitName;

        if (subId && invId) {
          await activateLocalSubscription(subId, invId, learnUnitName, sessionId);
          console.log(`✅ Subscription activated from checkout session: ${subId}`);
        }
        break;
      }

      case "invoice.paid": {
        const invoice = event.data.object as any;
        const subId = invoice.subscription as string;
        const stripeInvoiceId = invoice.id;

        if (subId && stripeInvoiceId) {
          const subPlan = await prisma.subscriptionPlan.findUnique({
            where: { stripe_subscription_id: subId },
          });

          if (subPlan) {
            const existingInvoice = await prisma.invoice.findUnique({
              where: { stripe_invoice_id: stripeInvoiceId },
            });

            if (!existingInvoice) {
              await prisma.invoice.create({
                data: {
                  user_id: subPlan.user_id,
                  subscription_plan_id: subPlan.id,
                  amount: invoice.amount_paid / 100,
                  stripe_invoice_id: stripeInvoiceId,
                  status: "paid",
                  description: `Recurring subscription renewal payment for ${subPlan.billing_cycle}`,
                  billing_date: new Date(),
                },
              });
            }

            const durationDays = subPlan.billing_cycle === "annually" ? 365 : 30;
            const newEndDate = new Date();
            newEndDate.setDate(newEndDate.getDate() + durationDays);

            await prisma.subscriptionPlan.update({
              where: { id: subPlan.id },
              data: {
                status: "active",
                end_date: newEndDate,
                updated_at: new Date(),
              },
            });
            console.log(`✅ Invoice paid and subscription extended: ${subId}`);
          }
        }
        break;
      }

      case "customer.subscription.deleted": {
        const stripeSub = event.data.object as Stripe.Subscription;
        const subId = stripeSub.id;

        const subPlan = await prisma.subscriptionPlan.findUnique({
          where: { stripe_subscription_id: subId },
        });

        if (subPlan) {
          const userId = subPlan.user_id;
          const freeRole = await prisma.role.findUnique({
            where: { name: "free_student" },
          });

          await prisma.$transaction(async (tx) => {
            await tx.subscriptionPlan.update({
              where: { id: subPlan.id },
              data: {
                status: "expired",
                end_date: new Date(),
                updated_at: new Date(),
              },
            });

            if (freeRole) {
              await tx.user.update({
                where: { id: userId },
                data: {
                  role_id: freeRole.id,
                  slots_purchased: 0,
                  learn_unit_id: null,
                },
              });
            }

            const existingUnit = await tx.learnUnit.findUnique({
              where: { supervisor_id: userId },
            });

            if (existingUnit) {
              await tx.user.updateMany({
                where: { learn_unit_id: existingUnit.id },
                data: { learn_unit_id: null },
              });

              await tx.learnUnit.delete({
                where: { id: existingUnit.id },
              });
            }
          });
          console.log(`❌ Subscription expired/deleted: ${subId}`);
        }
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
  } catch (error: any) {
    console.error(`Error processing webhook event ${event.type}:`, error);
    res.status(500).json({ error: "Webhook event execution failed", details: error.message });
  }
});

export default router;
