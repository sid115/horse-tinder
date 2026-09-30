import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";
export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    environmentMatchGlobs: [["lib/**/*.test.ts", "node"]],
    setupFiles: ["./vitest.setup.ts"],
    globalSetup: ["./tests/global-setup.ts"],
    include: ["**/*.test.{ts,tsx}"],
    exclude: ["node_modules", ".next"],
  },
  resolve: { alias: { "@": path.resolve(__dirname, ".") } },
});
