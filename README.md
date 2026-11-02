# Next Level Stores — starter

Ready-made COD stores for Algerian sellers. One Next.js app on Cloudflare serves every store:
each client is a row in the database, picked by the domain the visitor opened.

Tested locally: product page with the 69-wilaya order form, order API (bundle price, stop desk price,
duplicate flag, validation), seller login + orders screen, admin login + "create store".

## How it fits together

```
visitor opens            middleware.ts rewrites to         page looks up
demo.yourbrand.com/p/x   /s/demo.yourbrand.com/p/x         domains.hostname -> stores row -> design + products
clientstore.com/         /s/clientstore.com
admin.yourbrand.com/     /admin                            your owner panel
yourbrand.com            redirect -> Next Level /stores page (sales + WhatsApp)
```

## Folder structure

```
nl-stores/
├── middleware.ts                 # Host -> store / admin / redirect
├── app/
│   ├── s/[host]/
│   │   ├── (shop)/               # PUBLIC STOREFRONT
│   │   │   ├── layout.tsx        #   store lookup, expiry check, RTL/LTR, colors, pixels
│   │   │   ├── page.tsx          #   home: 1 product -> its landing page, else catalog
│   │   │   ├── p/[slug]/         #   product landing page + order form
│   │   │   └── thank-you/        #   Purchase event (Meta + TikTok)
│   │   └── dashboard/            # SELLER DASHBOARD (on the store's own domain)
│   │       ├── actions.ts        #   all seller server actions (always scoped to store_id)
│   │       ├── login/  page.tsx (home stats)
│   │       ├── orders/           #   call, "no answer" counter, status, block number
│   │       ├── products/         #   quick add + photo upload (compressed in browser -> R2)
│   │       ├── delivery/         #   home / stop desk price per wilaya (69)
│   │       └── settings/         #   name, language, colors, WhatsApp, pixel IDs
│   ├── admin/                    # OWNER PANEL (admin.yourbrand.com)
│   │   ├── actions.ts            #   create store, renew (+1 year), suspend
│   │   ├── page.tsx              #   all stores, expiry, WhatsApp renewal reminder
│   │   └── stores/new/           #   form you fill after the WhatsApp payment
│   └── api/
│       ├── orders/               # POST order (prices recomputed server-side)
│       ├── upload/               # seller image upload -> R2
│       └── media/[...key]/       # serves R2 images with 1-year cache
├── designs/
│   ├── registry.ts               # design list; a design = options + CSS, not new code
│   ├── glow/ maison/ style/ bebe/ tech/
│   └── shared/                   # ProductLanding, OrderForm, ProductGrid, StoreHeader
├── lib/
│   ├── tenant.ts                 # host -> store, expiry + 7-day grace, requireSeller/requireAdmin
│   ├── orders.ts                 # createOrder (validation, blacklist, offers, duplicates), stats
│   ├── catalog.ts                # products, offers, delivery prices
│   ├── auth.ts                   # PBKDF2 passwords + signed session cookie (Web Crypto)
│   ├── cloudflare-domains.ts     # Cloudflare for SaaS custom hostnames
│   ├── algeria/wilayas.ts        # 69 wilayas, FR + AR
│   ├── algeria/phone.ts          # 05/06/07 validation, wa.me links
│   └── i18n.ts                   # storefront text AR / FR
├── components/Pixels.tsx         # Meta + TikTok base code, Purchase event
├── db/schema.sql                 # D1 tables
├── db/seed-demo.sql              # demo store for local dev
├── scripts/hash-password.mjs
└── wrangler.jsonc                # D1 + R2 bindings, vars
```

## Run it locally

```bash
npm install
cp .env.example .env.local        # NEXT_PUBLIC_ROOT_DOMAIN=localhost
cp .dev.vars.example .dev.vars    # SESSION_SECRET, ADMIN_PASSWORD
npm run db:local                  # creates the local D1 + demo store
npm run dev
```

- Store: http://demo.localhost:3000 (Chrome and Firefox resolve `*.localhost` by themselves)
- Seller dashboard: http://demo.localhost:3000/dashboard — `0555000000` / `demo1234`
- Admin: http://admin.localhost:3000 — password from `ADMIN_PASSWORD` in `.dev.vars`
- A store you create in admin with slug `abc` opens at http://abc.localhost:3000 locally
  only if `ROOT_DOMAIN` in `wrangler.jsonc` vars is `localhost` while developing.

## Deploy to Cloudflare (first time)

1. Buy `yourbrand.com`, add it to Cloudflare.
2. `npx wrangler d1 create stores-db` → paste the id into `wrangler.jsonc`.
3. `npx wrangler r2 bucket create stores-media`
4. In `wrangler.jsonc` set `ROOT_DOMAIN`, `ADMIN_HOST`, `CF_ZONE_ID`; in `.env.local` set the same domains for the build.
5. `npx wrangler secret put SESSION_SECRET` (long random), `ADMIN_PASSWORD`, `CF_API_TOKEN` (token with *SSL and Certificates: Edit* on the zone).
6. `npm run db:remote` then `npm run deploy`.
7. Routes: in Workers → nl-stores → Settings → Domains & Routes, add `*.yourbrand.com/*` and `admin.yourbrand.com/*`; add a wildcard DNS record `*` (proxied).
8. Switch to **Workers Paid ($5/month)** before the first client runs ads (free plan = 100,000 requests/day for all stores together).

### Custom domains (the +5,000 DA upsell)

1. Cloudflare → SSL/TLS → Custom Hostnames: enable Cloudflare for SaaS, set the fallback origin (e.g. `stores.yourbrand.com`, a proxied record).
2. Add a Worker route `*/*` so traffic for client domains reaches the Worker.
3. When you create a store in admin with a custom domain, the hostname is created through the API.
4. At the registrar of the client domain: `CNAME www → stores.yourbrand.com` (and redirect the apex to `www`, or use a registrar that supports CNAME flattening). SSL turns active on its own.

## Before the first paying client

- [ ] Commune dropdown: import the 1,541 communes mapped to the 69 wilayas (currently a free-text field)
- [ ] Rate-limit `POST /api/orders` (Cloudflare WAF rate-limiting rule)
- [ ] Product edit page: variants, offers, landing sections, sort
- [ ] Orders export (CSV / Excel)
- [ ] Seller: change password, logo upload
- [ ] Daily D1 backup (`wrangler d1 export` on a schedule)
- [ ] Courier wilaya codes: Yalidine / ZR may still use the 58 old codes; map them in the courier add-on
- [ ] Verify wilayas 59–69 numbering against the Journal officiel list

## Notes

- Next.js 15.5 because `@opennextjs/cloudflare` supports it fully; upgrade to 16 later (middleware becomes `proxy.ts`).
- Prices sent by the browser are never trusted: `createOrder` reads price, offers and delivery from D1.
- A seller session cookie is set on the store's own host, and every query filters by `store_id`.
- D1 caps one database at 10 GB: split stores across databases or archive old orders before you reach it.
