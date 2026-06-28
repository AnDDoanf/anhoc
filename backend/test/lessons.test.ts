import './setup.ts';

import { test, describe, after } from 'node:test';
import assert from 'node:assert';
import prisma, { shutdownPool } from '../lib/db.ts';

import {
  getVisibleSubjectsForViewer,
  canAccessLessonForViewer
} from '../services/contentAccessService.ts';
import { masteryService } from '../services/masteryService.ts';
import { streakService } from '../services/streakService.ts';

describe('Lessons & Content Access Flow', () => {
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

  describe('Subject visibility rules', () => {
    test('getVisibleSubjectsForViewer for admin should query all subjects', async () => {
      let queried = false;
      mockPrismaModel('subject', 'findMany', async () => {
        queried = true;
        return [{ id: 1, slug: 'math', is_classified: false }];
      });

      const subjects = await getVisibleSubjectsForViewer({ role: 'admin' });
      assert.strictEqual(queried, true);
      assert.strictEqual(subjects.length, 1);
      restoreMocks();
    });

    test('getVisibleSubjectsForViewer for guests should query non-classified subjects only', async () => {
      let passedWhere: any = null;
      mockPrismaModel('subject', 'findMany', async (params: any) => {
        passedWhere = params?.where;
        return [];
      });

      await getVisibleSubjectsForViewer(null);
      assert.ok(passedWhere);
      assert.strictEqual(passedWhere.is_classified, false);
      restoreMocks();
    });

    test('getVisibleSubjectsForViewer for students should fetch resolveViewerLearnUnitId if not provided', async () => {
      mockPrismaModel('user', 'findUnique', async () => ({ learn_unit_id: 'unit-123' }));
      mockPrismaModel('subject', 'findMany', async () => []);

      await getVisibleSubjectsForViewer({ id: 'user-1' });
      restoreMocks();
    });
  });

  describe('Lesson access rights', () => {
    test('canAccessLessonForViewer should return true for admins', async () => {
      const result = await canAccessLessonForViewer({ role: 'admin' }, 'lesson-1');
      assert.strictEqual(result, true);
    });

    test('canAccessLessonForViewer should return false if lesson findFirst returns null', async () => {
      mockPrismaModel('user', 'findUnique', async () => ({ learn_unit_id: null }));
      mockPrismaModel('subject', 'findMany', async () => []);
      mockPrismaModel('userSubjectAccessRequest', 'findMany', async () => []);
      mockPrismaModel('lesson', 'findFirst', async () => null);

      const result = await canAccessLessonForViewer({ id: 'user-1' }, 'lesson-1');
      assert.strictEqual(result, false);
      restoreMocks();
    });
  });

  describe('Mastery Service study session updates', () => {
    test('updateMastery should mark completed if score is >= 80', async () => {
      let upsertArgs: any = null;
      mockPrismaModel('userLessonMastery', 'findUnique', async () => null);
      mockPrismaModel('userLessonMastery', 'upsert', async (args: any) => {
        upsertArgs = args;
        return { completion_status: 'completed' };
      });
      mockServiceMethod(streakService, 'updateQuestProgress', async () => {});

      const result = await masteryService.updateMastery('user-1', 'lesson-1', 85, 120);
      assert.ok(upsertArgs);
      assert.strictEqual(upsertArgs.create.completion_status, 'completed');
      assert.strictEqual(result.completion_status, 'completed');
      restoreMocks();
    });

    test('updateMastery should mark in_progress if score is < 80', async () => {
      let upsertArgs: any = null;
      mockPrismaModel('userLessonMastery', 'findUnique', async () => null);
      mockPrismaModel('userLessonMastery', 'upsert', async (args: any) => {
        upsertArgs = args;
        return { completion_status: 'in_progress' };
      });

      const result = await masteryService.updateMastery('user-1', 'lesson-1', 50, 120);
      assert.ok(upsertArgs);
      assert.strictEqual(upsertArgs.create.completion_status, 'in_progress');
      assert.strictEqual(result.completion_status, 'in_progress');
      restoreMocks();
    });
  });
});
