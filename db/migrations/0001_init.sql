-- 0001_init: first schema. Never edit this file once applied; add 0002_*.sql instead.
-- Money is stored in whole Algerian dinars (INTEGER). Dates are ISO strings (UTC).

CREATE TABLE stores (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  slug            TEXT    NOT NULL UNIQUE,
  name            TEXT    NOT NULL,
  lang            TEXT    NOT NULL DEFAULT 'ar' CHECK (lang IN ('ar', 'fr')),
  design          TEXT    NOT NULL DEFAULT 'glow',
  primary_color   TEXT    NOT NULL DEFAULT '#db2777',
  whatsapp        TEXT,
  meta_pixel_id   TEXT,
  tiktok_pixel_id TEXT,
  owner_name      TEXT    NOT NULL DEFAULT '',
  owner_phone     TEXT    NOT NULL,
  password_hash   TEXT    NOT NULL,
  status          TEXT    NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended')),
  expires_at      TEXT    NOT NULL,
  created_at      TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- Every hostname that opens a store: demo.yourbrand.com, clientstore.com, ...
CREATE TABLE domains (
  hostname        TEXT    PRIMARY KEY,
  store_id        INTEGER NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  kind            TEXT    NOT NULL DEFAULT 'subdomain' CHECK (kind IN ('subdomain', 'custom')),
  cf_hostname_id  TEXT,
  created_at      TEXT    NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX domains_store ON domains(store_id);

CREATE TABLE products (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  store_id        INTEGER NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  slug            TEXT    NOT NULL,
  name            TEXT    NOT NULL,
  description     TEXT    NOT NULL DEFAULT '',
  price           INTEGER NOT NULL CHECK (price > 0),
  old_price       INTEGER,
  stock           INTEGER,                         -- NULL = not tracked
  images          TEXT    NOT NULL DEFAULT '[]',   -- JSON ["stores/1/abc.webp", ...], first = main photo
  video_url       TEXT,                            -- YouTube or Facebook link
  variants        TEXT    NOT NULL DEFAULT '[]',   -- JSON [{"name":"Couleur","options":["Rouge","Bleu"]}]
  sections        TEXT    NOT NULL DEFAULT '{}',   -- JSON {"benefits":[],"steps":[],"reviews":[],"faq":[{"q":"","a":""}],"hide":[]}
  visible         INTEGER NOT NULL DEFAULT 1,
  sort            INTEGER NOT NULL DEFAULT 0,
  created_at      TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT    NOT NULL DEFAULT (datetime('now')),
  UNIQUE (store_id, slug)
);
CREATE INDEX products_store_sort ON products(store_id, sort, id);

-- Bundle prices: 2 pieces -> 5,200 DA
CREATE TABLE offers (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  store_id        INTEGER NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  product_id      INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  qty             INTEGER NOT NULL CHECK (qty >= 2),
  total_price     INTEGER NOT NULL CHECK (total_price > 0),
  UNIQUE (product_id, qty)
);
CREATE INDEX offers_store_product ON offers(store_id, product_id);

-- Delivery price per wilaya (1..69). NULL price = no delivery of that type.
CREATE TABLE delivery_prices (
  store_id        INTEGER NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  wilaya          INTEGER NOT NULL CHECK (wilaya BETWEEN 1 AND 69),
  home_price      INTEGER,
  desk_price      INTEGER,
  PRIMARY KEY (store_id, wilaya)
);

CREATE TABLE orders (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  store_id        INTEGER NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  product_id      INTEGER REFERENCES products(id) ON DELETE SET NULL,
  product_name    TEXT    NOT NULL,
  variant         TEXT    NOT NULL DEFAULT '',
  qty             INTEGER NOT NULL,
  products_total  INTEGER NOT NULL,
  delivery_type   TEXT    NOT NULL CHECK (delivery_type IN ('home', 'desk')),
  delivery_price  INTEGER NOT NULL,
  total           INTEGER NOT NULL,
  customer_name   TEXT    NOT NULL,
  phone           TEXT    NOT NULL,
  wilaya          INTEGER NOT NULL,
  commune         TEXT    NOT NULL DEFAULT '',
  address         TEXT    NOT NULL DEFAULT '',
  status          TEXT    NOT NULL DEFAULT 'new'
                  CHECK (status IN ('new', 'confirmed', 'no_answer', 'cancelled', 'shipped', 'delivered', 'returned')),
  no_answer_count INTEGER NOT NULL DEFAULT 0,
  is_duplicate    INTEGER NOT NULL DEFAULT 0,
  created_at      TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT    NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX orders_store_created ON orders(store_id, created_at DESC);
CREATE INDEX orders_store_status ON orders(store_id, status);
CREATE INDEX orders_store_phone ON orders(store_id, phone);

-- Numbers a seller blocked (fake orders)
CREATE TABLE blacklist (
  store_id        INTEGER NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  phone           TEXT    NOT NULL,
  created_at      TEXT    NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (store_id, phone)
);
