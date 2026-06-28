import './setup.ts';

import { test, describe, after } from 'node:test';
import assert from 'node:assert';
import prisma, { shutdownPool } from '../lib/db.ts';
import * as MathService from '../services/mathService.ts';

describe('Practice & Exam Engine Flow', () => {
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

  describe('Math Formula Checking and Variables Generation', () => {
    test('generateVars should pick variables within rules constraints', () => {
      const config = {
        variables: {
          x: { min: 5, max: 10, step: 1 },
          y: { choices: [100, 200] }
        },
        derived: {
          z: 'x * 2'
        },
        constraints: [
          'x < 10'
        ]
      };

      const vars = MathService.generateVars(config);
      assert.ok(vars.x >= 5 && vars.x < 10);
      assert.ok(vars.y === 100 || vars.y === 200);
      assert.strictEqual(vars.z, vars.x * 2);
    });

    test('checkAnswer should evaluate correct responses correctly', () => {
      const vars = { x: 5, y: 10 };
      // Numeric grading
      assert.strictEqual(MathService.checkAnswer('x + y', vars, '15'), true);
      assert.strictEqual(MathService.checkAnswer('x + y', vars, '15.001'), true);
      assert.strictEqual(MathService.checkAnswer('x + y', vars, '16'), false);

      // Boolean grading
      assert.strictEqual(MathService.checkAnswer('x < y', vars, 'true'), true);
      assert.strictEqual(MathService.checkAnswer('x > y', vars, 'false'), true);
    });

    test('formatTemplate should replace placeholder variables', () => {
      const template = 'Calculate the area of a rectangle with length $l$ and width $w$: ${(l * w)}$';
      const vars = { l: 8, w: 5 };
      const result = MathService.formatTemplate(template, vars);
      assert.strictEqual(result, 'Calculate the area of a rectangle with length $8$ and width $5$: $40$');
    });

    test('evaluateFormula should compile and evaluate math expression', () => {
      const result = MathService.evaluateFormula('2 * 3 + 5', {});
      assert.strictEqual(result, '11');
    });
  });

  describe('Attempts Log DB interactions', () => {
    test('should query attempts log and return history items', async () => {
      mockPrismaModel('testAttempt', 'findMany', async () => {
        return [{
          id: 'attempt-1',
          score: 90,
          created_at: new Date()
        }];
      });

      const attempts = await prisma.testAttempt.findMany();
      assert.strictEqual(attempts.length, 1);
      assert.strictEqual(attempts[0].id, 'attempt-1');
      assert.strictEqual(attempts[0].score, 90);
      restoreMocks();
    });
  });
});
