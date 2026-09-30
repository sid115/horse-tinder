import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
export default function setup() {
  process.env.DATABASE_URL = "file:./test.db";
  if (!existsSync(path.join(process.cwd(), "prisma", "schema.prisma"))) return;
  execSync("npx prisma db push --force-reset --skip-generate", {
    stdio: "inherit",
    env: { ...process.env, DATABASE_URL: "file:./test.db" },
  });
}
