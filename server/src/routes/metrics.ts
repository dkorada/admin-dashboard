import { Router } from "express";
import { z } from "zod";
import { addDays, monthKey, monthsBetween, parseDay, toDay } from "../lib/dates.js";
import { HttpError } from "../lib/http.js";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();
router.use(requireAuth);

const DAY = /^\d{4}-\d{2}-\d{2}$/;
const ACTIVE_WINDOW_DAYS = 30;

/**
 * Customers active at a point in time: signed up before it, not churned by then,
 * and seen in the 30 days before it (lastActiveAt is the most recent activity, so
 * anything later also counts as active at that point).
 */
function activeAt(end: Date, planWhere: { planId?: string }) {
  return {
    ...planWhere,
    signedUpAt: { lt: end },
    lastActiveAt: { gte: addDays(end, -ACTIVE_WINDOW_DAYS) },
    OR: [{ churnedAt: null }, { churnedAt: { gte: end } }],
  };
}

const filterSchema = z.object({
  from: z.string().regex(DAY, "from must be YYYY-MM-DD").optional(),
  to: z.string().regex(DAY, "to must be YYYY-MM-DD").optional(),
  plan: z.string().trim().min(1).optional(),
});

/** Plans, regions and the span of available data, used to build the filter controls. */
router.get("/meta", async (_req, res) => {
  const [plans, regions, range] = await Promise.all([
    prisma.plan.findMany({ orderBy: { sortOrder: "asc" } }),
    prisma.customer.findMany({ distinct: ["region"], select: { region: true }, orderBy: { region: "asc" } }),
    prisma.customer.aggregate({ _min: { signedUpAt: true }, _max: { lastActiveAt: true } }),
  ]);
  res.json({
    plans: plans.map((p) => ({ id: p.id, name: p.name, priceCents: p.priceCents })),
    regions: regions.map((r) => r.region),
    dataRange: {
      from: range._min.signedUpAt ? toDay(range._min.signedUpAt) : null,
      to: range._max.lastActiveAt ? toDay(range._max.lastActiveAt) : null,
    },
  });
});

/**
 * All dashboard data for one filter selection.
 * from/to are inclusive days (UTC); plan is a plan id or "all".
 * KPIs include the same figures for the preceding period of equal length, for trend deltas.
 */
router.get("/dashboard", async (req, res) => {
  const filters = filterSchema.parse(req.query);
  const planId = filters.plan && filters.plan !== "all" ? filters.plan : undefined;

  const plans = await prisma.plan.findMany({ orderBy: { sortOrder: "asc" } });
  if (planId && !plans.some((p) => p.id === planId)) throw new HttpError(400, `Unknown plan "${planId}"`);

  const bounds = await prisma.customer.aggregate({ _min: { signedUpAt: true }, _max: { lastActiveAt: true } });
  const defaultTo = bounds._max.lastActiveAt ?? new Date();
  const to = filters.to ? parseDay(filters.to) : parseDay(toDay(defaultTo));
  // Default: the last 12 calendar months, including the current one.
  const from = filters.from
    ? parseDay(filters.from)
    : new Date(Date.UTC(to.getUTCFullYear(), to.getUTCMonth() - 11, 1));
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) throw new HttpError(400, "Invalid date");
  if (from > to) throw new HttpError(400, "from must be on or before to");

  const start = from;
  const end = addDays(to, 1); // exclusive
  const span = end.getTime() - start.getTime();
  const prevStart = new Date(start.getTime() - span);
  const prevEnd = start;
  // Only compare against the previous period when the data actually covers it.
  const firstMonth = bounds._min.signedUpAt
    ? new Date(Date.UTC(bounds._min.signedUpAt.getUTCFullYear(), bounds._min.signedUpAt.getUTCMonth(), 1))
    : end;
  const hasPrevious = prevStart >= addDays(firstMonth, -7);

  const planWhere = planId ? { planId } : {};

  const [signups, payments, activeByRegion, prev] = await Promise.all([
    prisma.customer.findMany({
      where: { ...planWhere, signedUpAt: { gte: start, lt: end } },
      select: { signedUpAt: true },
    }),
    prisma.payment.findMany({
      where: { ...planWhere, paidAt: { gte: start, lt: end } },
      select: { paidAt: true, amountCents: true, planId: true, customerId: true },
    }),
    prisma.customer.groupBy({
      by: ["region"],
      where: activeAt(end, planWhere),
      _count: { _all: true },
    }),
    hasPrevious ? periodTotals(planWhere, prevStart, prevEnd) : null,
  ]);

  const months = monthsBetween(start, end);
  const signupsByMonth = new Map(months.map((m) => [m, 0]));
  for (const c of signups) {
    const key = monthKey(c.signedUpAt);
    signupsByMonth.set(key, (signupsByMonth.get(key) ?? 0) + 1);
  }

  const revenueByMonth = new Map(months.map((m) => [m, 0]));
  const revenueByPlan = new Map(plans.map((p) => [p.id, 0]));
  let revenueCents = 0;
  for (const p of payments) {
    revenueCents += p.amountCents;
    const key = monthKey(p.paidAt);
    revenueByMonth.set(key, (revenueByMonth.get(key) ?? 0) + p.amountCents);
    revenueByPlan.set(p.planId, (revenueByPlan.get(p.planId) ?? 0) + p.amountCents);
  }

  const activeCustomers = activeByRegion.reduce((sum, r) => sum + r._count._all, 0);

  res.json({
    filters: { from: toDay(start), to: toDay(to), plan: planId ?? "all" },
    kpis: {
      signups: { value: signups.length, previous: prev?.signups ?? null },
      revenueCents: { value: revenueCents, previous: prev?.revenueCents ?? null },
      activeCustomers: { value: activeCustomers, previous: prev?.activeCustomers ?? null },
      // Average invoice: revenue per paying account per month.
      arpaCents: {
        value: payments.length ? Math.round(revenueCents / payments.length) : 0,
        previous: prev?.arpaCents ?? null,
      },
    },
    signupsByMonth: months.map((month) => ({ month, signups: signupsByMonth.get(month) ?? 0 })),
    revenueByMonth: months.map((month) => ({ month, revenueCents: revenueByMonth.get(month) ?? 0 })),
    revenueByPlan: plans
      .filter((p) => !planId || p.id === planId)
      .map((p) => ({ plan: p.id, name: p.name, revenueCents: revenueByPlan.get(p.id) ?? 0 })),
    activeByRegion: activeByRegion
      .map((r) => ({ region: r.region, customers: r._count._all }))
      .sort((a, b) => b.customers - a.customers),
  });
});

async function periodTotals(planWhere: { planId?: string }, start: Date, end: Date) {
  const [signups, revenue, active] = await Promise.all([
    prisma.customer.count({ where: { ...planWhere, signedUpAt: { gte: start, lt: end } } }),
    prisma.payment.aggregate({
      where: { ...planWhere, paidAt: { gte: start, lt: end } },
      _sum: { amountCents: true },
      _count: { _all: true },
    }),
    prisma.customer.count({ where: activeAt(end, planWhere) }),
  ]);
  const revenueCents = revenue._sum.amountCents ?? 0;
  return {
    signups,
    revenueCents,
    activeCustomers: active,
    arpaCents: revenue._count._all ? Math.round(revenueCents / revenue._count._all) : 0,
  };
}

export default router;
