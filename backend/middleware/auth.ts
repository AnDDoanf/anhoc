import {type Request, type Response, type NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export const authenticate = (req: Request, res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: "Unauthorized" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!);
    (req as any).user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ message: "Invalid Token" });
  }
};

export const authorize = (action: string, resource: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user;
    if (!user) return res.status(401).json({ message: "Unauthorized" });

    const role = user.role;
    const permissions = user.permissions || {};

    // 1. Admin always has full access
    if (role === 'admin') {
      return next();
    }

    // 2. Check if the specific action is allowed for the resource
    // Logic: Has the specific action OR has 'manage' (total control over resource)
    const resourceActions = permissions[resource.toLowerCase()] || [];
    const isAllowed = 
      resourceActions.includes(action.toLowerCase()) || 
      resourceActions.includes('manage');

    if (isAllowed) {
      return next();
    }

    return res.status(403).json({ 
      message: `Forbidden: You do not have permission to ${action} ${resource}` 
    });
  };
};

export const isAdmin = (req: Request, res: Response, next: NextFunction) => {
  if ((req as any).user.role !== 'admin') {
    return res.status(403).json({ message: "Admin access required" });
  }
  next();
};