// Builds prisma/demo.db: a fresh, seeded SQLite file that ships with the Netlify function.
import { execSync } from "node:child_process";
import { rmSync } from "node:fs";

rmSync("prisma/demo.db", { force: true });
const env = { ...process.env, DATABASE_URL: "file:./demo.db" };
execSync("npx prisma db push --skip-generate", { stdio: "inherit", env });
execSync("npx tsx prisma/seed.ts", { stdio: "inherit", env });
