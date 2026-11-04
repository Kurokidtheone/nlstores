// Applies the D1 migrations (db/migrations) to the live database, ONLY inside a Cloudflare Workers
// Build of the production branch. Locally, and on preview branches, it does nothing.
// Cloudflare sets WORKERS_CI=1 and WORKERS_CI_BRANCH in its build environment.
import { execSync } from "node:child_process";

const ci = process.env.WORKERS_CI === "1";
const branch = process.env.WORKERS_CI_BRANCH ?? "";
const production = process.env.PRODUCTION_BRANCH ?? "main";

if (!ci) {
  console.log("[migrations] not a Cloudflare build: skipped (local: npm run db:migrate:local)");
} else if (branch && branch !== production) {
  console.log(`[migrations] preview branch "${branch}": skipped (only "${production}" changes the live database)`);
} else {
  console.log("[migrations] applying db/migrations to the live D1 database stores-db…");
  execSync("npx wrangler d1 migrations apply stores-db --remote", { stdio: "inherit" });
}
