import { defineConfig } from "vitest/config";
import path from "node:path";
const project = import.meta.dirname;
export default defineConfig({
  resolve: {
    alias: [
      {
        find: "@clerk/express",
        replacement: path.join(
          project,
          "artifacts/api-server/node_modules/@clerk/express",
        ),
      },
      {
        find: "@clerk/react/internal",
        replacement: path.join(project, "tests/clerk.ts"),
      },
      {
        find: "@clerk/react",
        replacement: path.join(project, "tests/clerk.ts"),
      },
      {
        find: "@clerk/themes",
        replacement: path.join(project, "tests/clerk-theme.ts"),
      },
      { find: "@workspace/db", replacement: path.join(project, "tests/db.ts") },
      {
        find: "@",
        replacement: path.join(project, "artifacts/clientflow/src"),
      },
      {
        find: /^react(?=\/|$)/,
        replacement: path.join(project, "node_modules/react"),
      },
      {
        find: /^react-dom(?=\/|$)/,
        replacement: path.join(project, "node_modules/react-dom"),
      },
    ],
  },
  esbuild: { jsx: "automatic" },
  test: {
    environment: "node",
    include: [
      "artifacts/api-server/src/**/*.test.ts",
      "tests/**/*.test.ts",
      "tests/**/*.test.tsx",
    ],
    fileParallelism: false,
    testTimeout: 30000,
    hookTimeout: 30000,
    env: { LOG_LEVEL: "silent", NODE_ENV: "test" },
  },
});
