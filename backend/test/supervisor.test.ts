import './setup.ts';

import { test, describe, after } from 'node:test';
import assert from 'node:assert';
import prisma, { shutdownPool } from '../lib/db.ts';
import {
  normalizeLearnUnitCode,
  createDefaultLearnUnitName,
  createUniqueLearnUnitCode,
  createLearnUnitForSupervisor
} from '../services/learnUnitService.ts';

describe('Classroom Supervisor Flow', () => {
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

  describe('Learn Unit Codes and naming helper rules', () => {
    test('normalizeLearnUnitCode should format code to uppercase', () => {
      assert.strictEqual(normalizeLearnUnitCode(' lu-math-001 '), 'LU-MATH-001');
    });

    test('createDefaultLearnUnitName should append Learn Unit to username', () => {
      assert.strictEqual(createDefaultLearnUnitName('Alice'), 'Alice Learn Unit');
      assert.strictEqual(createDefaultLearnUnitName('  Bob_Smith  '), 'Bob Smith Learn Unit');
    });

    test('createUniqueLearnUnitCode should return unique formatted code prefix', async () => {
      mockPrismaModel('learnUnit', 'findUnique', async () => null);

      const code = await createUniqueLearnUnitCode('Math Class');
      // Prefix is LU-MATHCL-001
      assert.ok(code.startsWith('LU-MATHCL-'));
      restoreMocks();
    });
  });

  describe('Supervisor Learn Unit creations', () => {
    test('createLearnUnitForSupervisor should fail if name is empty', async () => {
      await assert.rejects(
        async () => {
          await createLearnUnitForSupervisor('supervisor-1', '   ');
        },
        /name is required/
      );
    });

    test('createLearnUnitForSupervisor should persist workspace and save student limit', async () => {
      let createdData: any = null;
      mockPrismaModel('learnUnit', 'findUnique', async () => null);
      mockPrismaModel('learnUnit', 'create', async (args: any) => {
        createdData = args?.data;
        return { id: 'lu-1', code: createdData.code };
      });

      const limits = { max_students: 20, max_teachers: 2 };
      await createLearnUnitForSupervisor('supervisor-1', 'Physics Lab', limits);

      assert.ok(createdData);
      assert.strictEqual(createdData.name, 'Physics Lab');
      assert.strictEqual(createdData.max_students, 20);
      assert.strictEqual(createdData.max_teachers, 2);
      restoreMocks();
    });
  });
});
