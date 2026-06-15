import { type Request, type Response, type NextFunction } from 'express';
import { randomUUID } from 'crypto';

export const correlationId = (req: Request, res: Response, next: NextFunction) => {
  const headerName = 'x-correlation-id';
  const id = (req.headers[headerName] as string) || randomUUID();
  
  req.headers[headerName] = id;
  res.setHeader(headerName, id);
  (req as any).correlationId = id;
  
  next();
};
