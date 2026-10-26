import bcrypt from "bcryptjs";
import type { PrismaClient } from "@prisma/client";

// Deterministic generator for 12 months of realistic-looking SaaS data:
// growing monthly sign-ups with seasonality, plan and region mix, upgrades,
// churn, trial periods and monthly invoices.

export const DEMO_ACCOUNTS = [
  { email: "admin@demo.dev", password: "Admin123!", name: "Avery Admin", role: "ADMIN" },
  { email: "viewer@demo.dev", password: "Viewer123!", name: "Vic Viewer", role: "VIEWER" },
] as const;

const EXTRA_STAFF = [
  { email: "priya.nair@demo.dev", name: "Priya Nair", role: "ADMIN", active: true },
  { email: "marco.rossi@demo.dev", name: "Marco Rossi", role: "VIEWER", active: true },
  { email: "lena.fischer@demo.dev", name: "Lena Fischer", role: "VIEWER", active: true },
  { email: "kwame.mensah@demo.dev", name: "Kwame Mensah", role: "VIEWER", active: true },
  { email: "sofia.garcia@demo.dev", name: "Sofía García", role: "ADMIN", active: true },
  { email: "tom.becker@demo.dev", name: "Tom Becker", role: "VIEWER", active: false },
] as const;

export const PLANS = [
  { id: "starter", name: "Starter", priceCents: 1900, sortOrder: 1, weight: 0.46, churn: 0.055 },
  { id: "pro", name: "Pro", priceCents: 4900, sortOrder: 2, weight: 0.32, churn: 0.032 },
  { id: "business", name: "Business", priceCents: 12900, sortOrder: 3, weight: 0.16, churn: 0.02 },
  { id: "enterprise", name: "Enterprise", priceCents: 39900, sortOrder: 4, weight: 0.06, churn: 0.01 },
] as const;

const REGIONS = [
  { name: "North America", weight: 0.37 },
  { name: "Europe", weight: 0.29 },
  { name: "Asia Pacific", weight: 0.19 },
  { name: "Latin America", weight: 0.09 },
  { name: "Middle East & Africa", weight: 0.06 },
];

const PREFIXES = ["Acme", "Blue", "Bright", "Cloud", "Core", "Delta", "Echo", "Flux", "Granite", "Harbor", "Iron", "Juniper", "Kite", "Lumen", "Maple", "Nova", "Orbit", "Pixel", "Quartz", "River", "Summit", "Tidal", "Umbra", "Vertex", "Willow", "Zenith"];
const SUFFIXES = ["Labs", "Works", "Analytics", "Systems", "Health", "Logistics", "Studio", "Foods", "Finance", "Robotics", "Media", "Energy", "Retail", "Bio", "Security", "Travel"];

const DAY = 24 * 60 * 60 * 1000;
const TRIAL_DAYS = 14;

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pickWeighted<T extends { weight: number }>(items: readonly T[], r: number): T {
  let acc = 0;
  for (const item of items) {
    acc += item.weight;
    if (r < acc) return item;
  }
  return items[items.length - 1];
}

function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setUTCMonth(d.getUTCMonth() + months);
  return d;
}

export interface SeedOptions {
  /** End of the generated history. Defaults to now. */
  now?: Date;
  /** Multiplier on monthly sign-up volume (tests use a small value). */
  scale?: number;
  seed?: number;
}

export async function seedDatabase(prisma: PrismaClient, options: SeedOptions = {}) {
  const now = options.now ?? new Date();
  const scale = options.scale ?? 1;
  const rand = mulberry32(options.seed ?? 20241026);

  await prisma.payment.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.plan.deleteMany();
  await prisma.user.deleteMany();

  // Staff accounts
  const users = [
    ...DEMO_ACCOUNTS.map((a) => ({ email: a.email, name: a.name, role: a.role, active: true, password: a.password })),
    ...EXTRA_STAFF.map((s) => ({ ...s, password: "Demo1234!" })),
  ];
  for (const [i, u] of users.entries()) {
    await prisma.user.create({
      data: {
        email: u.email,
        name: u.name,
        role: u.role,
        active: u.active,
        passwordHash: await bcrypt.hash(u.password, 10),
        createdAt: new Date(now.getTime() - (400 - i * 30) * DAY),
        lastLoginAt: u.active ? new Date(now.getTime() - Math.floor(rand() * 20) * DAY) : null,
      },
    });
  }

  await prisma.plan.createMany({
    data: PLANS.map(({ id, name, priceCents, sortOrder }) => ({ id, name, priceCents, sortOrder })),
  });

  // Customers: 12 full months back from the start of the current month, plus the month to date.
  const firstMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 12, 1));
  const customers: {
    id: string; company: string; email: string; region: string; planId: string;
    signedUpAt: Date; lastActiveAt: Date; churnedAt: Date | null;
  }[] = [];
  const payments: { customerId: string; planId: string; amountCents: number; paidAt: Date }[] = [];

  let n = 0;
  for (let m = 0; m <= 12; m++) {
    const monthStart = addMonths(firstMonth, m);
    const monthEnd = addMonths(firstMonth, m + 1);
    const growth = 110 * Math.pow(1.075, m); // ~7.5% month-over-month growth
    const seasonality = 1 + 0.12 * Math.sin(((monthStart.getUTCMonth() + 2) / 12) * 2 * Math.PI);
    const campaign = m === 8 ? 1.35 : 1; // a launch campaign spike
    const target = growth * seasonality * campaign * (0.9 + rand() * 0.2) * scale;
    const windowEnd = Math.min(monthEnd.getTime(), now.getTime());
    const fraction = (windowEnd - monthStart.getTime()) / (monthEnd.getTime() - monthStart.getTime());
    const count = Math.max(0, Math.round(target * fraction));

    for (let i = 0; i < count; i++) {
      n++;
      const signedUpAt = new Date(monthStart.getTime() + rand() * (windowEnd - monthStart.getTime()));
      let plan = pickWeighted(PLANS, rand());
      const region = pickWeighted(REGIONS, rand()).name;
      const company = `${PREFIXES[Math.floor(rand() * PREFIXES.length)]} ${SUFFIXES[Math.floor(rand() * SUFFIXES.length)]}`;
      const id = `cus_${String(n).padStart(5, "0")}`;
      const enterpriseSeats = 1 + Math.floor(rand() * 4);

      // Walk the subscription month by month: trial, invoices, possible upgrade, possible churn.
      let churnedAt: Date | null = null;
      const trialDrop = rand() < 0.12; // never converted after the trial
      let billingDate = new Date(signedUpAt.getTime() + TRIAL_DAYS * DAY);
      if (trialDrop) {
        churnedAt = billingDate <= now ? billingDate : null;
      } else {
        while (billingDate <= now) {
          const amount = plan.id === "enterprise" ? plan.priceCents * enterpriseSeats : plan.priceCents;
          payments.push({ customerId: id, planId: plan.id, amountCents: amount, paidAt: billingDate });
          if (rand() < plan.churn) {
            churnedAt = new Date(billingDate.getTime() + rand() * 28 * DAY);
            if (churnedAt > now) churnedAt = null;
            break;
          }
          if (rand() < 0.03) {
            const next = PLANS.find((p) => p.sortOrder === plan.sortOrder + 1);
            if (next) plan = next;
          }
          billingDate = addMonths(billingDate, 1);
        }
      }

      let lastActiveAt: Date;
      if (churnedAt) {
        lastActiveAt = new Date(Math.max(signedUpAt.getTime(), churnedAt.getTime() - rand() * 10 * DAY));
      } else {
        const r = rand();
        const daysAgo = r < 0.7 ? rand() * 7 : r < 0.9 ? 7 + rand() * 23 : 30 + rand() * 60;
        lastActiveAt = new Date(Math.max(signedUpAt.getTime(), now.getTime() - daysAgo * DAY));
      }

      customers.push({
        id,
        company,
        email: `billing+${n}@${company.toLowerCase().replace(/[^a-z]+/g, "")}.example`,
        region,
        planId: plan.id,
        signedUpAt,
        lastActiveAt,
        churnedAt,
      });
    }
  }

  for (let i = 0; i < customers.length; i += 500) {
    await prisma.customer.createMany({ data: customers.slice(i, i + 500) });
  }
  for (let i = 0; i < payments.length; i += 1000) {
    await prisma.payment.createMany({ data: payments.slice(i, i + 1000) });
  }

  return { users: users.length, customers: customers.length, payments: payments.length };
}
