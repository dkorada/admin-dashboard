import { execSync } from "node:child_process";
import { rmSync } from "node:fs";

// Fresh schema in a throwaway SQLite file for every test run.
export default function setup() {
  rmSync("prisma/test.db", { force: true });
  execSync("npx prisma db push --skip-generate", {
    stdio: "ignore",
    env: { ...process.env, DATABASE_URL: "file:./test.db" },
  });
}
