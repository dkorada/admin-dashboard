import request from "supertest";
import { createApp } from "../src/app.js";
import { prisma } from "../src/lib/prisma.js";
import { DEMO_ACCOUNTS, seedDatabase } from "../prisma/seed-data.js";

export const app = createApp();
export const NOW = new Date("2026-06-15T12:00:00Z");
export const ADMIN = DEMO_ACCOUNTS[0];
export const VIEWER = DEMO_ACCOUNTS[1];

export async function resetDatabase() {
  await seedDatabase(prisma, { now: NOW, scale: 0.25 });
}

/** Signs in and returns the session cookie. */
export async function login(email: string, password: string): Promise<string> {
  const res = await request(app).post("/api/auth/login").send({ email, password }).expect(200);
  const cookie = res.headers["set-cookie"]?.[0];
  if (!cookie) throw new Error("No session cookie returned");
  return cookie.split(";")[0];
}

export { prisma, request };
