import { defineConfig } from "drizzle-kit";
import path from "path";
import { existsSync } from "node:fs";
import { loadEnvFile } from "node:process";

const localEnv = path.resolve(__dirname, "../../.env");
if (existsSync(localEnv)) loadEnvFile(localEnv);

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL, ensure the database is provisioned");
}

export default defineConfig({
  schema: path.join(__dirname, "./src/schema/index.ts"),
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
});
