import type { NextFunction, Request, Response } from "express";
import { getSessionUser } from "./store.js";
import type { User } from "./types.js";

export type AuthedRequest = Request & { user?: User };

export const asyncRoute = (handler: (req: AuthedRequest, res: Response, next: NextFunction) => Promise<unknown> | unknown) => {
  return (req: AuthedRequest, res: Response, next: NextFunction) => Promise.resolve(handler(req, res, next)).catch(next);
};

export const requireUser = asyncRoute(async (req: AuthedRequest, res: Response, next: NextFunction) => {
  const user = await getSessionUser(req);
  if (!user) return res.status(401).json({ message: "Authentication required" });
  req.user = user;
  next();
});

export const requireAdmin = asyncRoute(async (req: AuthedRequest, res: Response, next: NextFunction) => {
  const user = await getSessionUser(req);
  if (!user) return res.status(401).json({ message: "Authentication required" });
  if (user.role !== "admin") return res.status(403).json({ message: "Admin access required" });
  req.user = user;
  next();
});
