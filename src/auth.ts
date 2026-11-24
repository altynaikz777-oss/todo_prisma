import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export const authenticate = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Token required" });
  }

  try {
    res.locals.user = jwt.verify(header.slice(7), process.env.JWT_SECRET!);
    next();
  } catch (err) {
    res.status(401).json({ error: "Invalid token" });
  }
  console.log(req.headers);
};

export const requireRole =
  (role: string) => (_req: Request, res: Response, next: NextFunction) => {
    if (res.locals.user?.role !== role) {
      return res.status(403).json({ err: "Forbidden" });
    }
    next();
  };

  