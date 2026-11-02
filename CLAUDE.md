# Rules for every session

Next Level Stores: one Next.js app on Cloudflare (Workers + D1 + R2) serves many COD stores for Algerian sellers. Read README.md for the map of the code.

1. **Multi-tenant.** Every query on a store table filters by `store_id`. Seller pages and actions always start with `requireSeller()`; admin ones with `requireAdmin()`. Never take a `store_id` from the browser.
2. **Never trust the browser with money.** Prices, totals and delivery fees sent by the browser are ignored; recompute them from the database (see `lib/orders.ts`).
3. **Storefront text** lives in `lib/i18n.ts` in Arabic and French. Arabic pages are RTL; wrap prices in `<bdi>`.
4. **Algeria has 69 wilayas.** Always use `lib/algeria/wilayas.ts`; never hardcode 58.
5. **Designs = options + CSS** (`designs/<id>/index.ts` and `app/globals.css` `[data-design]`). Shared sections live in `designs/shared`. New features go in shared sections so every design gets them.
6. **Database changes:** never edit an applied migration. Every change is a new numbered file in `db/migrations/` (`0002_….sql`, `0003_….sql`, …).
7. **Mobile first:** test every screen at 390px wide.
8. **Keep the seller dashboard simple:** French + Arabic labels, big buttons, no feature without a clear daily use.
9. **Workflow.** You run in Claude Code on the web; the owner has no terminal.
   1. Work on a branch.
   2. `npm install`.
   3. `npm run db:local` (applies migrations, then the demo seed, to the LOCAL D1).
   4. `npm run dev`.
   5. Test the pages you changed yourself in a headless browser at 390px: stores at `demo.localhost:3000`, admin at `admin.localhost:3000`.
   6. Run `npm run typecheck` and `npm run build` and fix every error.
   7. Open a pull request with a summary, screenshots, and a "How to test on demo.&lt;domain&gt;" list.
   8. Never commit secrets, `.dev.vars` or `.env.local`.
10. **Dashboard work for the owner:** anything to do in the Cloudflare or GitHub dashboard goes in the pull request as exact click-by-click steps.

## Not decided yet

- **Domain not bought yet.** `wrangler.jsonc` (`ROOT_DOMAIN`, `ADMIN_HOST`) and the build variables still use the placeholder `yourbrand.com`. When the owner gives the domain, replace it everywhere (`grep -rn yourbrand.com`).
- **D1 database ID:** `REPLACE_WITH_D1_ID` in `wrangler.jsonc` until the owner creates `stores-db` in Cloudflare.
