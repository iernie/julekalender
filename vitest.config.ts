import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    // The emulators are shared mutable state; running files in parallel makes
    // seeded documents collide.
    fileParallelism: false,
    testTimeout: 20000,
    hookTimeout: 30000,
  },
});
