import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globalSetup: ["./test/global-setup.ts"],
    env: {
      NODE_ENV: "test",
      DATABASE_URL: "file:./test.db",
      SESSION_SECRET: "test-session-secret-0123456789",
    },
    // Tests share one SQLite file, so run files one after another.
    fileParallelism: false,
    hookTimeout: 60_000,
    testTimeout: 20_000,
  },
});
