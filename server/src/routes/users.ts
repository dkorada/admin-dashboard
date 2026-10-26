import { Router } from "express";
import { z } from "zod";
import { HttpError } from "../lib/http.js";
import { prisma } from "../lib/prisma.js";
import { ROLES } from "../lib/roles.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = Router();
router.use(requireAuth, requireRole("ADMIN"));

const publicFields = {
  id: true,
  email: true,
  name: true,
  role: true,
  active: true,
  lastLoginAt: true,
  createdAt: true,
} as const;

router.get("/", async (_req, res) => {
  const users = await prisma.user.findMany({
    select: publicFields,
    orderBy: [{ active: "desc" }, { role: "asc" }, { name: "asc" }],
  });
  res.json({ users });
});

const updateSchema = z
  .object({
    role: z.enum(ROLES).optional(),
    active: z.boolean().optional(),
  })
  .refine((v) => v.role !== undefined || v.active !== undefined, {
    message: "Provide role and/or active",
  });

router.patch("/:id", async (req, res) => {
  const changes = updateSchema.parse(req.body);
  const id = req.params.id;

  if (id === req.user!.id && (changes.role === "VIEWER" || changes.active === false)) {
    throw new HttpError(400, "You can't remove your own admin access");
  }

  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing) throw new HttpError(404, "User not found");

  // Never leave the workspace without an active admin.
  const losesAdmin =
    existing.role === "ADMIN" && existing.active && (changes.role === "VIEWER" || changes.active === false);
  if (losesAdmin) {
    const activeAdmins = await prisma.user.count({ where: { role: "ADMIN", active: true } });
    if (activeAdmins <= 1) throw new HttpError(400, "At least one active admin is required");
  }

  const user = await prisma.user.update({
    where: { id },
    data: {
      ...changes,
      // Deactivating signs the user out everywhere.
      ...(changes.active === false ? { sessionVersion: { increment: 1 } } : {}),
    },
    select: publicFields,
  });
  res.json({ user });
});

export default router;
