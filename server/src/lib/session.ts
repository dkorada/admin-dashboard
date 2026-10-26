import { createHmac, timingSafeEqual } from "node:crypto";
import { config } from "./config.js";

// Stateless session tokens: base64url(payload).base64url(hmac).
// The cookie only proves *who* the user is; role and active status are
// re-read from the database on every request, and sessionVersion lets us
// revoke every outstanding cookie for a user (logout everywhere, deactivation).

export interface SessionPayload {
  uid: string;
  ver: number;
  exp: number;
}

function sign(data: string): string {
  return createHmac("sha256", config.sessionSecret).update(data).digest("base64url");
}

export function createSessionToken(uid: string, ver: number, now = Date.now()): string {
  const payload: SessionPayload = { uid, ver, exp: now + config.sessionTtlMs };
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${body}.${sign(body)}`;
}

export function verifySessionToken(token: string | undefined, now = Date.now()): SessionPayload | null {
  if (!token) return null;
  const [body, mac] = token.split(".");
  if (!body || !mac) return null;

  const expected = Buffer.from(sign(body));
  const given = Buffer.from(mac);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;

  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString()) as SessionPayload;
    if (typeof payload.uid !== "string" || typeof payload.ver !== "number") return null;
    if (typeof payload.exp !== "number" || payload.exp < now) return null;
    return payload;
  } catch {
    return null;
  }
}
