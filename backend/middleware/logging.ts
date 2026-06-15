import { type Request, type Response, type NextFunction } from 'express';
import { logger } from '../lib/logger.ts';

export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  const correlationId = (req as any).correlationId;

  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info({
      method: req.method,
      url: req.originalUrl || req.url,
      status: res.statusCode,
      durationMs: duration,
      correlationId,
      ip: req.ip,
    }, `${req.method} ${req.originalUrl || req.url} finished in ${duration}ms`);
  });

  next();
};
