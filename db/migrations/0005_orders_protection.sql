-- 0005: order abuse protection + faster orders screen.
-- ip_hash = SHA-256(secret + IP), never the raw IP: enough to count orders per IP per hour.
ALTER TABLE orders ADD COLUMN ip_hash TEXT;
CREATE INDEX orders_store_ip_created ON orders(store_id, ip_hash, created_at);
CREATE INDEX orders_store_phone_created ON orders(store_id, phone, created_at);
