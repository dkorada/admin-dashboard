import { beforeAll, describe, expect, it } from "vitest";
import { VIEWER, app, login, prisma, request, resetDatabase } from "./helpers.js";

let cookie: string;

beforeAll(async () => {
  await resetDatabase();
  cookie = await login(VIEWER.email, VIEWER.password);
});

const get = (query: string) => request(app).get(`/api/metrics/dashboard${query}`).set("Cookie", cookie);

describe("GET /api/metrics/dashboard", () => {
  it("returns all chart series for the default range (last 12 months)", async () => {
    const res = await get("").expect(200);
    const body = res.body;

    expect(body.filters).toEqual({ from: "2025-07-01", to: "2026-06-15", plan: "all" });
    expect(body.signupsByMonth).toHaveLength(12);
    expect(body.signupsByMonth[0]).toEqual({ month: "2025-07", signups: expect.any(Number) });
    expect(body.revenueByPlan.map((r: { plan: string }) => r.plan)).toEqual(["starter", "pro", "business", "enterprise"]);
    expect(body.activeByRegion.length).toBe(5);
    expect(Object.keys(body.kpis)).toEqual(["signups", "revenueCents", "activeCustomers", "arpaCents"]);
  });

  it("keeps the series consistent with the KPI totals", async () => {
    const { body } = await get("?from=2026-01-01&to=2026-03-31").expect(200);
    const sum = (rows: Record<string, number>[], key: string) => rows.reduce((s, r) => s + r[key], 0);

    expect(sum(body.signupsByMonth, "signups")).toBe(body.kpis.signups.value);
    expect(sum(body.revenueByPlan, "revenueCents")).toBe(body.kpis.revenueCents.value);
    expect(sum(body.revenueByMonth, "revenueCents")).toBe(body.kpis.revenueCents.value);
    expect(sum(body.activeByRegion, "customers")).toBe(body.kpis.activeCustomers.value);
  });

  it("matches the database for a date range", async () => {
    const { body } = await get("?from=2026-02-01&to=2026-02-28").expect(200);
    const expected = await prisma.customer.count({
      where: { signedUpAt: { gte: new Date("2026-02-01T00:00:00Z"), lt: new Date("2026-03-01T00:00:00Z") } },
    });
    expect(body.signupsByMonth).toEqual([{ month: "2026-02", signups: expected }]);
    expect(body.kpis.signups.previous).toEqual(expect.any(Number));
  });

  it("filters every series by plan", async () => {
    const all = (await get("?from=2026-01-01&to=2026-05-31").expect(200)).body;
    const pro = (await get("?from=2026-01-01&to=2026-05-31&plan=pro").expect(200)).body;

    expect(pro.filters.plan).toBe("pro");
    expect(pro.revenueByPlan).toEqual([
      { plan: "pro", name: "Pro", revenueCents: all.revenueByPlan.find((r: { plan: string }) => r.plan === "pro").revenueCents },
    ]);
    expect(pro.kpis.signups.value).toBeLessThan(all.kpis.signups.value);
    expect(pro.kpis.activeCustomers.value).toBeLessThan(all.kpis.activeCustomers.value);

    const proSignups = await prisma.customer.count({
      where: { planId: "pro", signedUpAt: { gte: new Date("2026-01-01T00:00:00Z"), lt: new Date("2026-06-01T00:00:00Z") } },
    });
    expect(pro.kpis.signups.value).toBe(proSignups);
  });

  it("returns zero-filled months when nothing matches", async () => {
    const { body } = await get("?from=2020-01-01&to=2020-03-31").expect(200);
    expect(body.signupsByMonth).toEqual([
      { month: "2020-01", signups: 0 },
      { month: "2020-02", signups: 0 },
      { month: "2020-03", signups: 0 },
    ]);
    expect(body.kpis.revenueCents.value).toBe(0);
    expect(body.activeByRegion).toEqual([]);
  });

  it("rejects invalid filters", async () => {
    await get("?from=2026-05-01&to=2026-01-01").expect(400);
    await get("?from=01/01/2026").expect(400);
    await get("?plan=platinum").expect(400);
  });

  it("requires a session", async () => {
    await request(app).get("/api/metrics/dashboard").expect(401);
    await request(app).get("/api/metrics/meta").expect(401);
  });
});

describe("GET /api/metrics/meta", () => {
  it("lists plans, regions and the data range", async () => {
    const { body } = await request(app).get("/api/metrics/meta").set("Cookie", cookie).expect(200);
    expect(body.plans.map((p: { name: string }) => p.name)).toEqual(["Starter", "Pro", "Business", "Enterprise"]);
    expect(body.regions).toHaveLength(5);
    expect(body.dataRange.from).toBe("2025-06-01");
    expect(body.dataRange.to).toBe("2026-06-15");
  });
});
