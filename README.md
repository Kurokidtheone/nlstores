# Next Level Stores — starter

Ready-made COD stores for Algerian sellers. One Next.js app on Cloudflare serves every store:
each client is a row in the database, picked by the domain the visitor opened.

Tested locally in a headless browser at 390px: product editor (photos, video, variants, offers, landing
sections, duplicate, delete, sort), product page + 69-wilaya order form, order API (prices recomputed),
seller login, admin login + "create store", isolation between stores.

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
├── CLAUDE.md                     # rules every Claude Code session follows
├── middleware.ts                 # Host -> store / admin / redirect
├── app/
│   ├── s/[host]/
│   │   ├── (shop)/               # PUBLIC STOREFRONT
│   │   │   ├── layout.tsx        #   store lookup, expiry check, RTL/LTR, colors, pixels
│   │   │   ├── page.tsx          #   home: 1 product -> its landing page, else catalog
│   │   │   ├── p/[slug]/         #   product landing page + order form (hidden = seller preview only)
│   │   │   ├── policy/           #   delivery & returns text (linked in the footer)
│   │   │   └── thank-you/        #   Purchase event (Meta + TikTok)
│   │   └── dashboard/            # SELLER DASHBOARD (on the store's own domain)
│   │       ├── actions.ts        #   ALL seller server actions (requireSeller + store_id on every query)
│   │       ├── login/
│   │       ├── password/         #   change password (forced while must_change_password = 1)
│   │       └── (app)/            #   logged-in pages + bottom nav
│   │           ├── page.tsx      #     home stats + "store setup" checklist
│   │           ├── orders/       #     call, "no answer" counter, status, block number
│   │           ├── products/     #     list (order up/down, empty state), new/ (quick add)
│   │           │   └── [id]/     #     FULL PRODUCT EDITOR (ProductEditor.tsx)
│   │           ├── delivery/     #     home / stop desk price per wilaya (69)
│   │           ├── settings/     #     logo, design + preview, palettes, announcement bar, policy, language, WhatsApp, pixels
│   │           └── help/         #     tutorial videos (lib/help.ts) + WhatsApp support
│   ├── admin/                    # OWNER PANEL (admin.yourbrand.com)
│   │   ├── actions.ts            #   create-and-go-live (one D1 batch), resend welcome, domain check, renew, suspend
│   │   ├── page.tsx              #   stores, payments, domain status, support buttons, renewal reminder
│   │   ├── impersonate/          #   "open dashboard as this store" (logged, single-use 60 s link)
│   │   ├── WelcomePanel.tsx      #   welcome message: Copy + Send on WhatsApp
│   │   └── stores/new/           #   ONE screen: client, store, payment, quick products
│   └── api/
│       ├── orders/               # POST order (prices recomputed server-side)
│       ├── upload/               # seller image upload -> R2 (stores/<storeId>/<uuid>.webp)
│       ├── admin/upload|media/   # admin uploads: receipts/ (private), staging/ (quick product photos)
│       └── media/[...key]/       # serves R2 images with 1-year cache
├── designs/
│   ├── registry.ts               # design list; a design = options + CSS, not new code
│   ├── templates.ts              # getTemplate(design): what a new store starts with
│   ├── glow/ maison/ style/ bebe/ tech/   # index.ts (options, palettes) + template.ts (texts, sample product)
│   └── shared/                   # ProductLanding, OrderForm, ProductGrid, StoreHeader, StoreFooter, AnnouncementBar, Gallery, VideoEmbed
├── components/
│   ├── Pixels.tsx                # Meta + TikTok base code, Purchase event
│   ├── UploadField.tsx           # photo picker, browser compression -> /api/upload
│   └── dash/                     # dashboard UI bits (French + Arabic labels, nav bar)
├── lib/
│   ├── tenant.ts                 # host -> store, expiry + 7-day grace, requireSeller/requireAdmin
│   ├── products.ts               # product JSON model + server-side validation of the editor
│   ├── orders.ts                 # createOrder (validation, blacklist, offers, duplicates), stats
│   ├── catalog.ts                # products, offers, delivery prices (read helpers)
│   ├── media.ts                  # R2 delete / copy, scoped to one store
│   ├── video.ts                  # YouTube / Facebook link -> embed
│   ├── policy.ts                 # default delivery & returns text (AR + FR)
│   ├── help.ts                   # tutorial video links + support WhatsApp number
│   ├── onboarding.ts             # validation of the admin "new store" screen
│   ├── welcome.ts                # welcome message (AR / FR, CNAME steps for custom domains)
│   ├── plans.ts, password.ts     # 20,000 / 25,000 DA plans, 8-char temporary passwords
│   ├── auth.ts                   # PBKDF2 passwords + signed session cookie (Web Crypto)
│   ├── cloudflare-domains.ts     # Cloudflare for SaaS custom hostnames
│   ├── algeria/wilayas.ts        # 69 wilayas, FR + AR
│   ├── algeria/phone.ts          # 05/06/07 validation, wa.me links
│   └── i18n.ts                   # storefront text AR / FR
├── db/
│   ├── migrations/               # 0001_init, 0002_store_self_service, 0003_onboarding; every change = a NEW file
│   ├── seed-demo.sql             # demo store for local dev (demo.localhost)
│   └── seeds/demo.sql            # demo store for the live D1 (paste in the D1 console)
├── docs/screenshots/             # 390px screenshots from the automated browser tests
├── scripts/hash-password.mjs     # node scripts/hash-password.mjs <password>
└── wrangler.jsonc                # D1 + R2 bindings, vars, migrations_dir
```

## Run it locally

```bash
npm install
cp .env.example .env.local        # NEXT_PUBLIC_ROOT_DOMAIN=localhost
cp .dev.vars.example .dev.vars    # SESSION_SECRET, ADMIN_PASSWORD, ROOT_DOMAIN=localhost
npm run db:local                  # applies db/migrations + the demo seed to the LOCAL D1
npm run dev
```

- Store: http://demo.localhost:3000 (Chrome and Firefox resolve `*.localhost` by themselves)
- Seller dashboard: http://demo.localhost:3000/dashboard — `0555000000` / `demo1234`
- Admin: http://admin.localhost:3000 — password from `ADMIN_PASSWORD` in `.dev.vars`
- A store you create in admin with sub-domain `abc` opens at http://abc.localhost:3000
  (the welcome message holds an 8-character temporary password; the seller chooses their own at first login)

Database changes: add `db/migrations/0002_what_changed.sql`, run `npm run db:migrate:local`.
Never edit a migration that is already applied.

## Deploy to Cloudflare

Deployment is automatic: Cloudflare Workers Builds is connected to this GitHub repository.
Every push to `main` runs `npx opennextjs-cloudflare build`, then `npm run deploy:ci`
(applies new D1 migrations, then deploys). The click-by-click setup is in the pull request
that added it. Domain not bought yet: `yourbrand.com` is a placeholder everywhere.

Before going live on a domain:
- Routes: `*.yourbrand.com/*` and `admin.yourbrand.com/*` on the Worker + a proxied wildcard DNS record `*`.
- Switch to **Workers Paid ($5/month)** before the first client runs ads (free plan = 100,000 requests/day for all stores together).

### Custom domains (the +5,000 DA upsell)

1. Cloudflare → SSL/TLS → Custom Hostnames: enable Cloudflare for SaaS, set the fallback origin (e.g. `stores.yourbrand.com`, a proxied record).
2. Add a Worker route `*/*` so traffic for client domains reaches the Worker.
3. When you create a store in admin with a custom domain, the hostname is created through the API (needs `CF_ZONE_ID` and the `CF_API_TOKEN` secret).
4. At the registrar of the client domain: `CNAME www → stores.yourbrand.com` (and redirect the apex to `www`, or use a registrar that supports CNAME flattening). SSL turns active on its own.

## Before the first paying client

- [ ] Commune dropdown: import the 1,541 communes mapped to the 69 wilayas (currently a free-text field)
- [ ] Rate-limit `POST /api/orders` and the login forms (Cloudflare WAF rate-limiting rule)
- [x] Product edit page: variants, offers, landing sections, sort
- [ ] Orders export (CSV / Excel)
- [x] Seller: change password, logo upload, settings, setup checklist
- [ ] Paste the 4 tutorial video links in `lib/help.ts`
- [ ] Daily D1 backup (`wrangler d1 export` on a schedule)
- [ ] Courier wilaya codes: Yalidine / ZR may still use the 58 old codes; map them in the courier add-on
- [ ] Verify wilayas 59–69 numbering against the Journal officiel list
- [ ] Clean up photos uploaded in the editor but never saved (orphan R2 files)

## Notes

- Next.js 15.5 because `@opennextjs/cloudflare` supports it fully; upgrade to 16 later (middleware becomes `proxy.ts`).
- Prices sent by the browser are never trusted: `createOrder` reads price, offers and delivery from D1.
- Stock is checked when ordering but not decremented (fake COD orders would eat it); the seller updates it.
- A seller session cookie is set on the store's own host, and every query filters by `store_id`.
- D1 caps one database at 10 GB: split stores across databases or archive old orders before you reach it.
