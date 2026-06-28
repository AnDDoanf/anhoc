import './setup.ts';

import { test, describe, after } from 'node:test';
import assert from 'node:assert';
import prisma, { shutdownPool } from '../lib/db.ts';
import { levelService } from '../services/levelService.ts';
import { streakService, getUtcDateStr, getYesterdayUtcDateStr } from '../services/streakService.ts';

describe('Gamification & Streak Flow', () => {
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

  const mockPrismaMethod = (methodName: string, mockFn: any) => {
    const original = (prisma as any)[methodName];
    (prisma as any)[methodName] = mockFn;
    restores.push(() => {
      (prisma as any)[methodName] = original;
    });
  };

  const mockServiceMethod = (service: any, methodName: string, mockFn: any) => {
    const original = service[methodName];
    service[methodName] = mockFn;
    restores.push(() => {
      service[methodName] = original;
    });
  };

  const restoreMocks = () => {
    for (const restore of restores) restore();
    restores.length = 0;
  };

  describe('Level and XP Progressions', () => {
    test('getXpRequired should return XP requirement scaling with level', () => {
      const xpLvl1 = levelService.getXpRequired(1);
      const xpLvl2 = levelService.getXpRequired(2);
      assert.ok(xpLvl2 > xpLvl1);
    });

    test('getLevelFromTotalXp should return calculated level index', () => {
      // level 1: needs 100 XP
      assert.strictEqual(levelService.getLevelFromTotalXp(0), 1);
      assert.strictEqual(levelService.getLevelFromTotalXp(50), 1);
      // at 100+ total XP, level should be 2
      assert.strictEqual(levelService.getLevelFromTotalXp(120), 2);
    });

    test('addXp should cap free student stats at 500 XP', async () => {
      mockPrismaModel('user', 'findUnique', async () => {
        return {
          id: 'user-1',
          role: { name: 'free_student' },
          student_stats: { total_xp: 490, level: 1 }
        };
      });

      mockPrismaMethod('$transaction', async () => {
        return [null, { total_xp: 500, level: 2 }];
      });
      mockServiceMethod(streakService, 'updateQuestProgress', async () => {});

      const stats = await levelService.addXp('user-1', 50, 'study');
      assert.ok(stats);
      assert.ok(stats.total_xp !== null && stats.total_xp <= 500);

      restoreMocks();
    });
  });

  describe('Streak Helper Functions', () => {
    test('getUtcDateStr and getYesterdayUtcDateStr should return correct ISO date string parts', () => {
      const fixedDate = new Date('2026-06-28T05:00:00Z');
      assert.strictEqual(getUtcDateStr(fixedDate), '2026-06-28');
      assert.strictEqual(getYesterdayUtcDateStr(fixedDate), '2026-06-27');
    });
  });
});
