import {type Request, type Response, type NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import prisma from '../lib/db.ts';

export const authenticate = async (req: Request, res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: "Unauthorized" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;

    if (decoded.id && decoded.active_session_id) {
      const user = await (prisma as any).user.findUnique({
        where: { id: decoded.id },
        select: { active_session_id: true }
      }) as any;

      if (user && user.active_session_id !== decoded.active_session_id) {
        const langHeader = req.headers["accept-language"] || "";
        const isVi = langHeader.toLowerCase().includes("vi");
        const message = isVi ? "Đăng nhập ở nơi khác" : "Login in another place";
        return res.status(401).json({ message });
      }
    }

    (req as any).user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ message: "Invalid Token" });
  }
};

export const optionalAuthenticate = async (req: Request, res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    next();
    return;
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;

    if (decoded.id && decoded.active_session_id) {
      const user = await (prisma as any).user.findUnique({
        where: { id: decoded.id },
        select: { active_session_id: true }
      }) as any;

      if (user && user.active_session_id !== decoded.active_session_id) {
        (req as any).user = undefined;
        next();
        return;
      }
    }

    (req as any).user = decoded;
  } catch {
    (req as any).user = undefined;
  }

  next();
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
  if (!(req as any).user || (req as any).user.role !== 'admin') {
    return res.status(403).json({ message: "Admin access required" });
  }
  next();
};

export const selfOrAdmin = (idParam = 'id') => {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user;
    if (!user) return res.status(401).json({ message: 'Unauthorized' });

    if (user.role === 'admin') return next();

    const targetId = req.params[idParam] as string;
    if (user.id === targetId) {
      return next();
    }

    return res.status(403).json({
      message: 'Forbidden: You can only access your own data',
    });
  };
};
