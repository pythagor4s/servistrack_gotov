import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    exclude: ["**/node_modules/**", "**/*.int.test.ts"],
    env: {
      DATABASE_URL:
        "postgresql://test:test@localhost:5432/servis_track_test?schema=public",
      JWT_SECRET: "test-secret-not-for-production",
    },
  },
});
