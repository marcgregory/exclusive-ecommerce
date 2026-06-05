import type { User } from "./types.js";

declare module "express-session" {
  interface SessionData {
    userId?: string;
  }
}

declare global {
  namespace Express {
    interface Request {
      requestId?: string;
      user?: User;
    }
  }
}

export {};
