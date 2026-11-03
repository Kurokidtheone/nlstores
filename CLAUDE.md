# Rules for every session

Next Level Stores: one Next.js app on Cloudflare (Workers + D1 + R2) serves many COD stores for Algerian sellers. Read README.md for the map of the code. Seller pages live in `app/s/[host]/dashboard/(app)/`, seller writes in `app/s/[host]/dashboard/actions.ts`.

1. **Multi-tenant.** Every query on a store table filters by `store_id`. Seller pages and actions always start with `requireSeller()`; admin ones with `requireAdmin()`. Never take a `store_id` from the browser.
2. **Never trust the browser with money.** Prices, totals and delivery fees sent by the browser are ignored; recompute them from the database (see `lib/orders.ts`).
3. **Storefront text** lives in `lib/i18n.ts` in Arabic and French. Arabic pages are RTL; wrap prices in `<bdi>`.
4. **Algeria has 69 wilayas.** Always use `lib/algeria/wilayas.ts` (59–69 numbered as in décret 26-206) and `lib/algeria/communes.ts` (1,541 communes, generated; see README "Communes"); never hardcode 58.
5. **Designs = options + CSS** (`designs/<id>/index.ts` and `app/globals.css` `[data-design]`), plus the starting content of a new store in `designs/<id>/template.ts` (AR + FR, base in `designs/shared/template-base.ts`). Shared sections live in `designs/shared`. New features go in shared sections so every design gets them.
6. **Database changes:** never edit an applied migration. Every change is a new numbered file in `db/migrations/` (`0002_….sql`, `0003_….sql`, …).
7. **Mobile first:** test every screen at 390px wide.
8. **Keep the seller dashboard simple:** French + Arabic labels, big buttons, no feature without a clear daily use.
9. **Workflow.** You run in Claude Code on the web; the owner has no terminal.
   1. Work on a branch.
   2. `npm install`.
   3. `cp .dev.vars.example .dev.vars && cp .env.example .env.local`, then `npm run db:local` (applies migrations, then the demo seed, to the LOCAL D1).
   4. `NO_PROXY=localhost,.localhost,127.0.0.1 npm run dev` (the cloud sandbox proxy otherwise intercepts Next's internal calls to `*.localhost`).
   5. Test the pages you changed yourself in a headless browser at 390px: stores at `demo.localhost:3000`, admin at `admin.localhost:3000` (Playwright: launch Chromium with `--host-resolver-rules=MAP *.localhost 127.0.0.1` and `--no-proxy-server`). Demo seller: `0555000000` / `demo1234`.
   6. Run `npm run typecheck` and `npm run build` and fix every error.
   7. Open a pull request with a summary, screenshots, and a "How to test on demo.&lt;domain&gt;" list.
   8. Never commit secrets, `.dev.vars` or `.env.local`.
10. **Dashboard work for the owner:** anything to do in the Cloudflare or GitHub dashboard goes in the pull request as exact click-by-click steps.

## Not decided yet

- **Payment details:** `lib/billing.ts` still holds placeholder CCP / BaridiMob numbers until the owner gives the real ones.
- **Domain not bought yet.** `wrangler.jsonc` (`ROOT_DOMAIN`, `ADMIN_HOST`) and the build variables still use the placeholder `yourbrand.com`. When the owner gives the domain, replace it everywhere (`grep -rn yourbrand.com`).
