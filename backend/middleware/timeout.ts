import { type Request, type Response, type NextFunction } from 'express';

export const requestTimeout = (timeoutMs = 15000) => {
  return (req: Request, res: Response, next: NextFunction) => {
    res.setTimeout(timeoutMs, () => {
      if (!res.headersSent) {
        res.status(503).json({
          error: 'Service Unavailable',
          message: 'Request timed out'
        });
      }
    });
    next();
  };
};
