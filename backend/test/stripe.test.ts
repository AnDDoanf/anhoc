import './setup.ts';

import Stripe from 'stripe';

// Intercept low-level Stripe request method using prototype chain
const dummyStripe = new Stripe('sk_test_mock');
const CustomersProto = Object.getPrototypeOf(dummyStripe.customers);
const StripeResourceProto = Object.getPrototypeOf(CustomersProto);

StripeResourceProto._makeRequest = async function (
  requestMethod: string,
  requestPath: string,
  methodArgs: any[],
  spec: any,
  overrideFlags: any
) {
  const path = requestPath || '';
  if (path.includes('/customers')) {
    return { id: 'mock_cus_123' };
  }
  if (path.includes('/products')) {
    return { id: 'mock_prod_123' };
  }
  if (path.includes('/prices')) {
    return { id: 'mock_price_123' };
  }
  if (path.includes('/checkout/sessions')) {
    return { id: 'mock_sess_123', url: 'https://checkout.stripe.com/pay' };
  }
  if (path.includes('/subscriptions/')) {
    return { id: 'sub_123', cancel_at_period_end: true };
  }
  return {};
};

import { test, describe, after } from 'node:test';
import assert from 'node:assert';
import prisma, { shutdownPool } from '../lib/db.ts';
import {
  getOrCreateCustomer,
  createCheckoutSession,
  cancelSubscription
} from '../services/stripeService.ts';

describe('Stripe Checkout & Webhook Flow', () => {
  const restores: (() => void)[] = [];

  after(async () => {
    try {
      await shutdownPool();
    } catch {}
  });

  const mockPrismaModel = (modelName: string, methodName: string, mockFn: any) => {
    const model = (prisma as any)[modelName];
    if (model) {
      const original = model[methodName];
      model[methodName] = mockFn;
      restores.push(() => {
        model[methodName] = original;
      });
    }
  };

  const restoreMocks = () => {
    for (const restore of restores) restore();
    restores.length = 0;
  };

  describe('Customer creation resolver', () => {
    test('getOrCreateCustomer should return existing customer ID if present', async () => {
      mockPrismaModel('user', 'findUnique', async () => {
        return { stripe_customer_id: 'cus_existing_999' };
      });

      const customerId = await getOrCreateCustomer('user-1', 'test@example.com');
      assert.strictEqual(customerId, 'cus_existing_999');
      restoreMocks();
    });

    test('getOrCreateCustomer should call Stripe create if customer ID is not set', async () => {
      mockPrismaModel('user', 'findUnique', async () => {
        return { stripe_customer_id: null };
      });
      mockPrismaModel('user', 'update', async () => {
        return null;
      });

      const customerId = await getOrCreateCustomer('user-1', 'test@example.com');
      assert.strictEqual(customerId, 'mock_cus_123');
      restoreMocks();
    });
  });

  describe('Checkout Session creations', () => {
    test('createCheckoutSession should return a session redirect URL', async () => {
      mockPrismaModel('user', 'findUnique', async () => {
        return { stripe_customer_id: 'cus_existing_999' };
      });

      const session = await createCheckoutSession({
        userId: 'user-1',
        email: 'test@example.com',
        planId: 1,
        planName: 'pro',
        billingCycle: 'monthly',
        calculatedPrice: 15,
        successUrl: 'http://localhost/success',
        cancelUrl: 'http://localhost/cancel'
      });

      assert.strictEqual(session.url, 'https://checkout.stripe.com/pay');
      restoreMocks();
    });
  });

  describe('Subscription cancellations updates', () => {
    test('cancelSubscription should flag cancellation at period end', async () => {
      mockPrismaModel('subscriptionPlan', 'updateMany', async () => {
        return { count: 1 };
      });

      const sub = await cancelSubscription('sub_123');
      assert.strictEqual(sub.cancel_at_period_end, true);
      restoreMocks();
    });
  });
});
