import { beforeAll, describe, expect, it } from "vitest";
import { ADMIN, VIEWER, app, login, prisma, request, resetDatabase } from "./helpers.js";

let adminCookie: string;
let viewerCookie: string;

beforeAll(async () => {
  await resetDatabase();
  adminCookie = await login(ADMIN.email, ADMIN.password);
  viewerCookie = await login(VIEWER.email, VIEWER.password);
});

async function userId(email: string) {
  return (await prisma.user.findUniqueOrThrow({ where: { email } })).id;
}

describe("role checks", () => {
  it("both roles can read the dashboard", async () => {
    await request(app).get("/api/metrics/dashboard").set("Cookie", adminCookie).expect(200);
    await request(app).get("/api/metrics/dashboard").set("Cookie", viewerCookie).expect(200);
  });

  it("anonymous users can't read the dashboard or users", async () => {
    await request(app).get("/api/metrics/dashboard").expect(401);
    await request(app).get("/api/users").expect(401);
  });

  it("viewers can't list users", async () => {
    const res = await request(app).get("/api/users").set("Cookie", viewerCookie);
    expect(res.status).toBe(403);
  });

  it("viewers can't change roles or deactivate users", async () => {
    const id = await userId("marco.rossi@demo.dev");
    await request(app).patch(`/api/users/${id}`).set("Cookie", viewerCookie).send({ role: "ADMIN" }).expect(403);
    await request(app).patch(`/api/users/${id}`).set("Cookie", viewerCookie).send({ active: false }).expect(403);
    const viewerId = await userId(VIEWER.email);
    await request(app).patch(`/api/users/${viewerId}`).set("Cookie", viewerCookie).send({ role: "ADMIN" }).expect(403);
  });

  it("admins can list users without password hashes", async () => {
    const res = await request(app).get("/api/users").set("Cookie", adminCookie).expect(200);
    expect(res.body.users.length).toBeGreaterThanOrEqual(8);
    expect(res.body.users[0].passwordHash).toBeUndefined();
  });

  it("admins can change a role, and it applies on the user's next request", async () => {
    const id = await userId("lena.fischer@demo.dev");
    const res = await request(app).patch(`/api/users/${id}`).set("Cookie", adminCookie).send({ role: "ADMIN" });
    expect(res.status).toBe(200);
    expect(res.body.user.role).toBe("ADMIN");

    const lena = await login("lena.fischer@demo.dev", "Demo1234!");
    await request(app).get("/api/users").set("Cookie", lena).expect(200);

    await request(app).patch(`/api/users/${id}`).set("Cookie", adminCookie).send({ role: "VIEWER" }).expect(200);
    await request(app).get("/api/users").set("Cookie", lena).expect(403);
  });

  it("deactivating a user signs them out and blocks sign-in", async () => {
    const kwame = await login("kwame.mensah@demo.dev", "Demo1234!");
    const id = await userId("kwame.mensah@demo.dev");
    await request(app).patch(`/api/users/${id}`).set("Cookie", adminCookie).send({ active: false }).expect(200);

    await request(app).get("/api/auth/me").set("Cookie", kwame).expect(401);
    await request(app).post("/api/auth/login").send({ email: "kwame.mensah@demo.dev", password: "Demo1234!" }).expect(403);

    await request(app).patch(`/api/users/${id}`).set("Cookie", adminCookie).send({ active: true }).expect(200);
    await login("kwame.mensah@demo.dev", "Demo1234!");
  });

  it("admins can't demote or deactivate themselves", async () => {
    const id = await userId(ADMIN.email);
    await request(app).patch(`/api/users/${id}`).set("Cookie", adminCookie).send({ role: "VIEWER" }).expect(400);
    await request(app).patch(`/api/users/${id}`).set("Cookie", adminCookie).send({ active: false }).expect(400);
  });

  it("validates updates", async () => {
    const id = await userId("marco.rossi@demo.dev");
    await request(app).patch(`/api/users/${id}`).set("Cookie", adminCookie).send({ role: "OWNER" }).expect(400);
    await request(app).patch(`/api/users/${id}`).set("Cookie", adminCookie).send({}).expect(400);
    await request(app).patch(`/api/users/does-not-exist`).set("Cookie", adminCookie).send({ role: "VIEWER" }).expect(404);
  });
});
