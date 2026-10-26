const isProduction = process.env.NODE_ENV === "production";

function sessionSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (secret && secret.length >= 16) return secret;
  if (isProduction) {
    throw new Error("SESSION_SECRET must be set (at least 16 characters) in production.");
  }
  return "dev-only-session-secret-do-not-use-in-prod";
}

export const config = {
  isProduction,
  port: Number(process.env.PORT ?? 4000),
  sessionSecret: sessionSecret(),
  sessionCookie: "sid",
  sessionTtlMs: 1000 * 60 * 60 * 24 * 7,
};
