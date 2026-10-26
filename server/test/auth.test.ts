import { beforeAll, describe, expect, it } from "vitest";
import { createSessionToken } from "../src/lib/session.js";
import { ADMIN, VIEWER, app, login, prisma, request, resetDatabase } from "./helpers.js";

beforeAll(resetDatabase);

describe("POST /api/auth/login", () => {
  it("signs in with valid credentials and sets an HTTP-only session cookie", async () => {
    const res = await request(app).post("/api/auth/login").send({ email: ADMIN.email, password: ADMIN.password });

    expect(res.status).toBe(200);
    expect(res.body.user).toMatchObject({ email: ADMIN.email, role: "ADMIN" });
    expect(res.body.user.passwordHash).toBeUndefined();

    const cookie = res.headers["set-cookie"][0];
    expect(cookie).toMatch(/^sid=/);
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/SameSite=Lax/i);
  });

  it("treats the email case-insensitively", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "  Viewer@Demo.dev ", password: VIEWER.password });
    expect(res.status).toBe(200);
    expect(res.body.user.role).toBe("VIEWER");
  });

  it("rejects a wrong password without setting a cookie", async () => {
    const res = await request(app).post("/api/auth/login").send({ email: ADMIN.email, password: "wrong-password" });
    expect(res.status).toBe(401);
    expect(res.body.error).toBe("Incorrect email or password");
    expect(res.headers["set-cookie"]).toBeUndefined();
  });

  it("gives the same error for an unknown email", async () => {
    const res = await request(app).post("/api/auth/login").send({ email: "nobody@demo.dev", password: "whatever" });
    expect(res.status).toBe(401);
    expect(res.body.error).toBe("Incorrect email or password");
  });

  it("rejects malformed input", async () => {
    const res = await request(app).post("/api/auth/login").send({ email: "not-an-email" });
    expect(res.status).toBe(400);
  });

  it("refuses deactivated accounts", async () => {
    const res = await request(app).post("/api/auth/login").send({ email: "tom.becker@demo.dev", password: "Demo1234!" });
    expect(res.status).toBe(403);
  });

  it("stores passwords as bcrypt hashes", async () => {
    const user = await prisma.user.findUniqueOrThrow({ where: { email: ADMIN.email } });
    expect(user.passwordHash).toMatch(/^\$2[aby]\$10\$/);
    expect(user.passwordHash).not.toContain(ADMIN.password);
  });
});

describe("session", () => {
  it("GET /api/auth/me returns the signed-in user", async () => {
    const cookie = await login(VIEWER.email, VIEWER.password);
    const res = await request(app).get("/api/auth/me").set("Cookie", cookie);
    expect(res.status).toBe(200);
    expect(res.body.user).toMatchObject({ email: VIEWER.email, role: "VIEWER" });
  });

  it("GET /api/auth/me without a cookie is 401", async () => {
    await request(app).get("/api/auth/me").expect(401);
  });

  it("rejects a tampered cookie", async () => {
    const cookie = await login(VIEWER.email, VIEWER.password);
    const admin = await prisma.user.findUniqueOrThrow({ where: { email: ADMIN.email } });
    const [, mac] = cookie.slice("sid=".length).split(".");
    const forgedBody = Buffer.from(JSON.stringify({ uid: admin.id, ver: 0, exp: Date.now() + 1e6 })).toString("base64url");
    await request(app).get("/api/auth/me").set("Cookie", `sid=${forgedBody}.${mac}`).expect(401);
  });

  it("rejects an expired session", async () => {
    const admin = await prisma.user.findUniqueOrThrow({ where: { email: ADMIN.email } });
    const old = createSessionToken(admin.id, admin.sessionVersion, Date.now() - 30 * 24 * 3600 * 1000);
    await request(app).get("/api/auth/me").set("Cookie", `sid=${old}`).expect(401);
  });

  it("logout clears the cookie", async () => {
    const res = await request(app).post("/api/auth/logout").expect(204);
    expect(res.headers["set-cookie"][0]).toMatch(/sid=;/);
  });
});
