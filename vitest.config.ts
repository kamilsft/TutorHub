// vitest.config.ts
// Test runner configuration for TutorHub
// Uses @vitejs/plugin-react; forces NODE_ENV to 'development' so act() works in jsdom tests
// Node environment is the default; component tests opt-in to jsdom via @vitest-environment jsdom

import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  // Override NODE_ENV so React loads its development build (which includes act() support)
  define: {
    "process.env.NODE_ENV": JSON.stringify("development"),
  },
  test: {
    environment: "node",
    globals: false,
    // Run each test file in isolation to prevent mock bleed-over between suites
    isolate: true,
    // Global setup loads @testing-library/jest-dom matchers for component tests
    setupFiles: ["./tests/setup.ts"],
    coverage: {
      provider: "v8",
      exclude: [
        // Infrastructure — not testable with Vitest
        "lib/prisma.ts",
        "middleware.ts",
        // Seed/CLI scripts
        "scripts/**",
        // Next.js page components and layouts (not business logic)
        "app/**/page.tsx",
        "app/**/layout.tsx",
        "app/globals.css",
        // Test support files — fixtures are data, not logic
        "tests/fixtures/**",
        "tests/setup.ts",
        // Config files
        "*.config.*",
        "next-env.d.ts",
      ],
    },
  },
  resolve: {
    alias: {
      // Mirror the @/* -> ./* alias from tsconfig.json so test imports match app imports
      "@": path.resolve(__dirname, "."),
    },
  },
});
