import './setup.ts';

import { test, describe, after } from 'node:test';
import assert from 'node:assert';
import prisma, { shutdownPool } from '../lib/db.ts';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import {
  normalizeHumanName,
  buildFullName,
  buildLoginIdBase,
  createUniqueDisplayName,
  createUniqueLoginId,
  getUserIdentity,
  findUserIdByIdentifier
} from '../services/userIdentityService.ts';

describe('Auth & Identity Flow', () => {
  const restores: (() => void)[] = [];

  after(async () => {
    try {
      await shutdownPool();
    } catch {}
  });

  const mockPrismaUser = (methodName: string, mockFn: any) => {
    const original = (prisma.user as any)[methodName];
    (prisma.user as any)[methodName] = mockFn;
    restores.push(() => {
      (prisma.user as any)[methodName] = original;
    });
  };

  const mockPrisma = (methodName: string, mockFn: any) => {
    const original = (prisma as any)[methodName];
    (prisma as any)[methodName] = mockFn;
    restores.push(() => {
      (prisma as any)[methodName] = original;
    });
  };

  const restoreMocks = () => {
    for (const restore of restores) restore();
    restores.length = 0;
  };

  describe('Name and login ID formatting helpers', () => {
    test('normalizeHumanName should strip outer spaces and limit length', () => {
      assert.strictEqual(normalizeHumanName('  John  Doe  '), 'John Doe');
      assert.strictEqual(normalizeHumanName('a'.repeat(100)).length, 50);
    });

    test('buildFullName should build the full name from parts', () => {
      assert.strictEqual(buildFullName('John', 'Doe'), 'John Doe');
      assert.strictEqual(buildFullName('John', 'Doe', 'Explicit Name'), 'Explicit Name');
    });

    test('buildLoginIdBase should strip accents and format login IDs', () => {
      assert.strictEqual(buildLoginIdBase('Nguyễn', 'Văn_Hùng'), 'nguyen_van_hung');
      assert.strictEqual(buildLoginIdBase('đ', 'Đ'), 'd_d');
    });
  });

  describe('Unique name/id generator functions (Prisma mock)', () => {
    test('createUniqueDisplayName should return candidate if not taken', async () => {
      mockPrismaUser('findUnique', async () => null);

      const name = await createUniqueDisplayName('Test Student');
      assert.strictEqual(name, 'Test Student');

      restoreMocks();
    });

    test('createUniqueDisplayName should append number if taken', async () => {
      let callCount = 0;
      mockPrismaUser('findUnique', async () => {
        callCount++;
        return callCount === 1 ? { id: 'existing' } : null;
      });

      const name = await createUniqueDisplayName('Test Student');
      assert.strictEqual(name, 'Test Student 1');

      restoreMocks();
    });

    test('createUniqueLoginId should return login_id when query returns empty rows', async () => {
      mockPrisma('$queryRaw', async () => []);

      const loginId = await createUniqueLoginId('John', 'Doe');
      assert.strictEqual(loginId, 'john_doe');

      restoreMocks();
    });
  });

  describe('User profile details queries', () => {
    test('getUserIdentity should fetch user record and return formatted identity', async () => {
      mockPrisma('$queryRaw', async () => {
        return [{
          first_name: 'John',
          last_name: 'Doe',
          login_id: 'john_doe_99',
          username: 'John Doe'
        }];
      });

      const result = await getUserIdentity('c7d0d024-4db2-4d2d-8e47-49c00b21a364');
      assert.strictEqual(result.first_name, 'John');
      assert.strictEqual(result.last_name, 'Doe');
      assert.strictEqual(result.login_id, 'john_doe_99');
      assert.strictEqual(result.full_name, 'John Doe');

      restoreMocks();
    });

    test('findUserIdByIdentifier should match on email or login_id', async () => {
      mockPrisma('$queryRaw', async () => {
        return [{ id: 'user-uuid' }];
      });

      const userId = await findUserIdByIdentifier('john@example.com');
      assert.strictEqual(userId, 'user-uuid');

      restoreMocks();
    });
  });

  describe('JWT and password validation services', () => {
    test('should hash and compare passwords', async () => {
      const password = 'my-secret-password';
      const hash = await bcrypt.hash(password, 8);
      const isMatch = await bcrypt.compare(password, hash);
      assert.strictEqual(isMatch, true);
    });

    test('should sign and verify JSON web tokens', () => {
      const payload = { userId: '12345', role: 'student' };
      const secret = 'temp-secret';
      const token = jwt.sign(payload, secret, { expiresIn: '1h' });
      
      const decoded = jwt.verify(token, secret) as any;
      assert.strictEqual(decoded.userId, '12345');
      assert.strictEqual(decoded.role, 'student');
    });
  });
});
