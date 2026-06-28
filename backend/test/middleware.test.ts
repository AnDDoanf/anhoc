import { test, describe } from 'node:test';
import assert from 'node:assert';
import EventEmitter from 'events';

// Import the middlewares relative to backend/test
import { correlationId } from '../middleware/correlation.ts';
import { requestTimeout } from '../middleware/timeout.ts';
import { errorHandler } from '../middleware/errorHandler.ts';
import { requestLogger } from '../middleware/logging.ts';

describe('correlationId Middleware', () => {
  test('should generate a correlation ID if one is not present in headers', () => {
    const req: any = { headers: {} };
    const resHeaders: Record<string, string> = {};
    const res: any = {
      setHeader: (name: string, value: string) => {
        resHeaders[name] = value;
      }
    };
    let nextCalled = false;
    const next = () => { nextCalled = true; };

    correlationId(req, res, next);

    const generatedId = req.headers['x-correlation-id'];
    assert.ok(generatedId, 'Correlation ID should be generated');
    assert.strictEqual(typeof generatedId, 'string');
    assert.strictEqual(resHeaders['x-correlation-id'], generatedId, 'Correlation ID should be set in response headers');
    assert.strictEqual(req.correlationId, generatedId, 'Correlation ID should be attached to request context');
    assert.strictEqual(nextCalled, true, 'Next function should be called');
  });

  test('should reuse an existing correlation ID if present in request headers', () => {
    const existingId = 'existing-uuid-1234';
    const req: any = { headers: { 'x-correlation-id': existingId } };
    const resHeaders: Record<string, string> = {};
    const res: any = {
      setHeader: (name: string, value: string) => {
        resHeaders[name] = value;
      }
    };
    let nextCalled = false;
    const next = () => { nextCalled = true; };

    correlationId(req, res, next);

    assert.strictEqual(req.headers['x-correlation-id'], existingId);
    assert.strictEqual(resHeaders['x-correlation-id'], existingId);
    assert.strictEqual(req.correlationId, existingId);
    assert.strictEqual(nextCalled, true);
  });
});

describe('requestTimeout Middleware', () => {
  test('should register a timeout with res.setTimeout', () => {
    let timeoutValue = 0;
    let callbackRegistered: Function | null = null;
    const req: any = {};
    const res: any = {
      setTimeout: (ms: number, cb: Function) => {
        timeoutValue = ms;
        callbackRegistered = cb;
      }
    };
    let nextCalled = false;
    const next = () => { nextCalled = true; };

    requestTimeout(5000)(req, res, next);

    assert.strictEqual(timeoutValue, 5000);
    assert.ok(callbackRegistered);
    assert.strictEqual(nextCalled, true);
  });

  test('should return 503 Service Unavailable if timeout fires and headers not sent', () => {
    let callbackRegistered: Function | null = null;
    const req: any = {};
    let statusReturned = 0;
    let jsonPayload: any = null;
    const res: any = {
      headersSent: false,
      setTimeout: (ms: number, cb: Function) => {
        callbackRegistered = cb;
      },
      status: (code: number) => {
        statusReturned = code;
        return {
          json: (payload: any) => {
            jsonPayload = payload;
          }
        };
      }
    };
    const next = () => { };

    requestTimeout(5000)(req, res, next);

    // Simulate timeout firing
    if (callbackRegistered) {
      (callbackRegistered as Function)();
    }

    assert.strictEqual(statusReturned, 503);
    assert.strictEqual(jsonPayload.error, 'Service Unavailable');
    assert.strictEqual(jsonPayload.message, 'Request timed out');
  });

  test('should not write error if headers have already been sent', () => {
    let callbackRegistered: Function | null = null;
    const req: any = {};
    let statusCalled = false;
    const res: any = {
      headersSent: true,
      setTimeout: (ms: number, cb: Function) => {
        callbackRegistered = cb;
      },
      status: (code: number) => {
        statusCalled = true;
        return { json: () => { } };
      }
    };
    const next = () => { };

    requestTimeout(5000)(req, res, next);

    // Simulate timeout firing
    if (callbackRegistered) {
      (callbackRegistered as Function)();
    }

    assert.strictEqual(statusCalled, false, 'status() should not be called since headers were sent');
  });
});

describe('errorHandler Middleware', () => {
  test('should return custom error status and clean payload with correlation ID', () => {
    const err = { message: 'Custom failed test', status: 400 };
    const req: any = { correlationId: 'test-correlation-uuid', originalUrl: '/test', method: 'GET' };
    let statusReturned = 0;
    let jsonPayload: any = null;
    const res: any = {
      status: (code: number) => {
        statusReturned = code;
        return {
          json: (payload: any) => {
            jsonPayload = payload;
          }
        };
      }
    };
    const next = () => { };

    errorHandler(err, req, res, next);

    assert.strictEqual(statusReturned, 400);
    assert.strictEqual(jsonPayload.error, 'Something went wrong!');
    assert.strictEqual(jsonPayload.message, 'Custom failed test');
    assert.strictEqual(jsonPayload.correlationId, 'test-correlation-uuid');
  });

  test('should default status to 500 when status field is not provided', () => {
    const err = new Error('Generic internal error');
    const req: any = { correlationId: 'another-test-uuid', originalUrl: '/test', method: 'POST' };
    let statusReturned = 0;
    let jsonPayload: any = null;
    const res: any = {
      status: (code: number) => {
        statusReturned = code;
        return {
          json: (payload: any) => {
            jsonPayload = payload;
          }
        };
      }
    };
    const next = () => { };

    errorHandler(err, req, res, next);

    assert.strictEqual(statusReturned, 500);
    assert.strictEqual(jsonPayload.error, 'Something went wrong!');
    assert.strictEqual(jsonPayload.correlationId, 'another-test-uuid');
  });
});

class MockResponse extends EventEmitter {
  statusCode: number = 200;
}

describe('requestLogger Middleware', () => {
  test('should set listener on finish event and log request metrics', () => {
    const req: any = { correlationId: 'uuid-log', originalUrl: '/my-lessons', method: 'GET', ip: '127.0.0.1' };
    const res = new MockResponse();
    let nextCalled = false;
    const next = () => { nextCalled = true; };

    requestLogger(req, res as any, next);

    assert.strictEqual(nextCalled, true, 'Next must be called');

    // Simulate request finishing
    res.emit('finish');

    assert.ok(true, 'Finish event handled without throwing errors');
  });
});

import { createRateLimiter } from '../middleware/rateLimiter.ts';

describe('rateLimiter Middleware', () => {
  test('should allow requests below threshold and block when exceeded', () => {
    const limiter = createRateLimiter({
      windowMs: 1000,
      max: 2,
      message: 'Too many requests'
    });

    const headers: Record<string, any> = {};
    let statusReturned = 0;
    let jsonPayload: any = null;

    const res: any = {
      setHeader: (name: string, value: any) => {
        headers[name] = value;
      },
      status: (code: number) => {
        statusReturned = code;
        return {
          json: (payload: any) => {
            jsonPayload = payload;
          }
        };
      }
    };

    const req1: any = { ip: '192.168.1.1', originalUrl: '/test-route', headers: {}, socket: {} };
    let next1 = false;
    limiter(req1, res, () => { next1 = true; });
    assert.strictEqual(next1, true, 'First request should pass');
    assert.strictEqual(headers['X-RateLimit-Remaining'], 1);

    const req2: any = { ip: '192.168.1.1', originalUrl: '/test-route', headers: {}, socket: {} };
    let next2 = false;
    limiter(req2, res, () => { next2 = true; });
    assert.strictEqual(next2, true, 'Second request should pass');
    assert.strictEqual(headers['X-RateLimit-Remaining'], 0);

    const req3: any = { ip: '192.168.1.1', originalUrl: '/test-route', headers: {}, socket: {} };
    let next3 = false;
    limiter(req3, res, () => { next3 = true; });
    assert.strictEqual(next3, false, 'Third request should be blocked');
    assert.strictEqual(statusReturned, 429);
    assert.strictEqual(jsonPayload.error, 'Too many requests');
  });
});
