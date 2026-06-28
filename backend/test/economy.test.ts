import './setup.ts';

import { test, describe, after } from 'node:test';
import assert from 'node:assert';
import prisma, { shutdownPool } from '../lib/db.ts';
import { economyService } from '../services/economyService.ts';

describe('Shop & Economy Flow', () => {
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

  describe('Lives mechanics', () => {
    test('getMaxLives should scale with user levels and upgrades', () => {
      // Base max is 6 + floor(level/10). Level 1 extra 0 = 6
      assert.strictEqual(economyService.getMaxLives(1, 0), 6);
      // Level 20: 6 + 2 = 8
      assert.strictEqual(economyService.getMaxLives(20, 0), 8);
      // Level 1 + 2 extra lives upgrade = 8
      assert.strictEqual(economyService.getMaxLives(1, 2), 8);
    });

    test('consumeLife should decrement user lives count and throw if empty', async () => {
      let updatedStats: any = null;
      mockPrismaModel('studentStats', 'findUnique', async () => {
        return {
          user_id: 'user-1',
          level: 1,
          lives: 5,
          last_life_restored_at: new Date()
        };
      });

      mockPrismaModel('studentStats', 'update', async (params: any) => {
        updatedStats = params?.data;
        return null;
      });

      await economyService.consumeLife('user-1');
      assert.ok(updatedStats);
      assert.strictEqual(updatedStats.lives, 4);
      restoreMocks();
    });

    test('consumeLife should throw if user has 0 lives left', async () => {
      mockPrismaModel('studentStats', 'findUnique', async () => {
        return {
          user_id: 'user-1',
          level: 1,
          lives: 0,
          last_life_restored_at: new Date()
        };
      });

      await assert.rejects(
        async () => {
          await economyService.consumeLife('user-1');
        },
        /Out of lives/
      );
      restoreMocks();
    });
  });

  describe('Coin transactions and Shop purchases', () => {
    test('addCoins should increment coins ledger and log transaction', async () => {
      let updatedStats: any = null;
      mockPrismaModel('studentStats', 'findUnique', async () => {
        return {
          user_id: 'user-1',
          level: 1,
          coins: 200,
          coin_transactions: []
        };
      });

      mockPrismaModel('studentStats', 'update', async (params: any) => {
        updatedStats = params?.data;
        return { coins: updatedStats.coins };
      });

      const res = await economyService.addCoins('user-1', 50, 'completed_quest');
      assert.strictEqual(res.coins, 250);
      assert.strictEqual(updatedStats.coin_transactions.length, 1);
      assert.strictEqual(updatedStats.coin_transactions[0].amount, 50);
      assert.strictEqual(updatedStats.coin_transactions[0].reason, 'completed_quest');
      restoreMocks();
    });

    test('buyShopItem should deduct coins and add item to inventory', async () => {
      let updatedStats: any = null;
      mockPrismaModel('studentStats', 'findUnique', async () => {
        return {
          user_id: 'user-1',
          level: 1,
          coins: 500,
          inventory: {}
        };
      });

      mockPrismaModel('studentStats', 'update', async (params: any) => {
        updatedStats = params?.data;
        return null;
      });

      // Buy streak_shield (price: 80 coins)
      await economyService.buyShopItem('user-1', 'streak_shield');
      assert.ok(updatedStats);
      assert.strictEqual(updatedStats.coins, 420);
      assert.strictEqual(updatedStats.inventory.streak_shield, 1);
      restoreMocks();
    });

    test('buyShopItem should throw if user has insufficient coins', async () => {
      mockPrismaModel('studentStats', 'findUnique', async () => {
        return {
          user_id: 'user-1',
          level: 1,
          coins: 20,
          inventory: {}
        };
      });

      await assert.rejects(
        async () => {
          await economyService.buyShopItem('user-1', 'streak_shield');
        },
        /Insufficient coins/
      );
      restoreMocks();
    });
  });
});
