import type { NextFunction, Request, Response } from "express";
import { config } from "../lib/config.js";
import { HttpError } from "../lib/http.js";
import { prisma } from "../lib/prisma.js";
import type { Role } from "../lib/roles.js";
import { verifySessionToken } from "../lib/session.js";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: Role;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export async function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const session = verifySessionToken(req.cookies?.[config.sessionCookie]);
  if (!session) return next(new HttpError(401, "Not signed in"));

  const user = await prisma.user.findUnique({ where: { id: session.uid } });
  if (!user || !user.active || user.sessionVersion !== session.ver) {
    return next(new HttpError(401, "Session expired, please sign in again"));
  }

  req.user = { id: user.id, email: user.email, name: user.name, role: user.role as Role };
  next();
}

export function requireRole(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) return next(new HttpError(401, "Not signed in"));
    if (!roles.includes(req.user.role)) {
      return next(new HttpError(403, "You don't have permission to do that"));
    }
    next();
  };
}
