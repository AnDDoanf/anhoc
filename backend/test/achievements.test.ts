import './setup.ts';

import { test, describe, after } from 'node:test';
import assert from 'node:assert';
import prisma, { shutdownPool } from '../lib/db.ts';
import { checkAndAwardAchievements } from '../services/achievementService.ts';
import { levelService } from '../services/levelService.ts';

describe('Achievements & Notifications Flow', () => {
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

  describe('Achievements rules checks', () => {
    test('checkAndAwardAchievements should query earned logs and return achievements array', async () => {
      // Mock pre-fetch queries
      mockPrismaModel('userAchievement', 'findMany', async () => []);
      mockPrismaModel('testAttempt', 'findMany', async () => []);
      mockPrismaModel('user', 'findUnique', async () => {
        return {
          id: 'user-1',
          role: { name: 'sub_student' }
        };
      });
      mockPrismaModel('activityEvidence', 'count', async () => 0);
      mockPrismaModel('questionSnapshot', 'count', async () => 0);
      mockPrismaModel('achievement', 'findUnique', async () => null);

      // Add mocks for direct loop queries
      mockPrismaModel('grade', 'findMany', async () => []);
      mockPrismaModel('lesson', 'count', async () => 0);
      mockPrismaModel('testAttempt', 'count', async () => 0);

      // Mock levelService
      mockServiceMethod(levelService, 'addXp', async () => {
        return {};
      });

      const awarded = await checkAndAwardAchievements('user-1');
      assert.ok(Array.isArray(awarded));
      restoreMocks();
    });
  });
});
