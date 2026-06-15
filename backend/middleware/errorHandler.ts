import { type Request, type Response, type NextFunction } from 'express';
import { logger } from '../lib/logger.ts';

export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  const correlationId = (req as any).correlationId;
  
  logger.error({
    err: {
      message: err.message,
      stack: err.stack,
    },
    url: req.originalUrl || req.url,
    method: req.method,
    correlationId,
  }, `Unhandled error: ${err.message}`);

  res.status(err.status || 500).json({
    error: 'Something went wrong!',
    message: process.env.NODE_ENV === 'production' ? 'Internal Server Error' : err.message,
    correlationId,
  });
};
