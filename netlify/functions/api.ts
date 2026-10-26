// Netlify Function that serves the whole Express API (/api/* is rewritten here in netlify.toml).
//
// SQLite on serverless: the build seeds server/prisma/demo.db and ships it with the
// function. On a cold start it's copied to /tmp (the only writable path) and used from
// there. Changes made through the UI (role changes, deactivations) last for the life of
// that function instance and reset on the next cold start, which suits a demo. For
// durable data, point DATABASE_URL at a hosted database instead.
import { copyFileSync, existsSync } from "node:fs";
import path from "node:path";
import serverless from "serverless-http";

type Handler = ReturnType<typeof serverless>;
let handlerPromise: Promise<Handler> | null = null;

const RUNTIME_DB = "/tmp/demo.db";

function bundledDbPath(): string {
  const candidates = [
    path.join(process.cwd(), "server/prisma/demo.db"),
    path.join(process.env.LAMBDA_TASK_ROOT ?? "", "server/prisma/demo.db"),
    path.join(__dirname, "server/prisma/demo.db"),
  ];
  const found = candidates.find((p) => existsSync(p));
  if (!found) throw new Error(`demo.db not found (looked in ${candidates.join(", ")})`);
  return found;
}

async function init(): Promise<Handler> {
  process.env.NODE_ENV ??= "production";
  if (!process.env.DATABASE_URL) {
    if (!existsSync(RUNTIME_DB)) copyFileSync(bundledDbPath(), RUNTIME_DB);
    process.env.DATABASE_URL = `file:${RUNTIME_DB}`;
  }
  // Imported after DATABASE_URL is set so Prisma picks it up.
  const { createApp } = await import("../../server/src/app");
  return serverless(createApp());
}

export const handler = async (event: object, context: object) => {
  try {
    handlerPromise ??= init();
    const h = await handlerPromise;
    return await h(event, context);
  } catch (err) {
    handlerPromise = null;
    console.error(err);
    return {
      statusCode: 500,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ error: `Server failed to start: ${(err as Error).message}` }),
    };
  }
};
