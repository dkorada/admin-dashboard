import bcrypt from "bcryptjs";
import { Router, type CookieOptions } from "express";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { config } from "../lib/config.js";
import { HttpError } from "../lib/http.js";
import { prisma } from "../lib/prisma.js";
import { createSessionToken } from "../lib/session.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1).max(200),
});

// Compared against when the email is unknown so response time doesn't reveal which emails exist.
const DUMMY_HASH = bcrypt.hashSync("not-a-real-password", 10);

const cookieOptions: CookieOptions = {
  httpOnly: true,
  sameSite: "lax",
  secure: config.isProduction,
  path: "/",
};

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === "test",
  // Behind Netlify's proxy the socket address can be missing; prefer the client IP header it sets.
  keyGenerator: (req) => String(req.headers["x-nf-client-connection-ip"] ?? req.ip ?? "unknown"),
  validate: { ip: false },
  message: { error: "Too many sign-in attempts. Try again in a few minutes." },
});

router.post("/login", loginLimiter, async (req, res) => {
  const { email, password } = loginSchema.parse(req.body);

  const user = await prisma.user.findUnique({ where: { email } });
  const valid = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);
  if (!user || !valid) throw new HttpError(401, "Incorrect email or password");
  if (!user.active) throw new HttpError(403, "This account has been deactivated");

  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

  res.cookie(config.sessionCookie, createSessionToken(user.id, user.sessionVersion), {
    ...cookieOptions,
    maxAge: config.sessionTtlMs,
  });
  res.json({ user: { id: user.id, email: user.email, name: user.name, role: user.role } });
});

router.post("/logout", (_req, res) => {
  res.clearCookie(config.sessionCookie, cookieOptions);
  res.status(204).end();
});

router.get("/me", requireAuth, (req, res) => {
  res.json({ user: req.user });
});

export default router;
