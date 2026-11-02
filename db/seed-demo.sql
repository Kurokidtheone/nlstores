-- Demo store for LOCAL development: http://demo.localhost:3000
-- Seller login: 0555000000 / demo1234
-- Run with: npm run db:local   (applies migrations first, then this file)
-- Safe to run twice: existing rows are kept.

INSERT OR IGNORE INTO stores (slug, name, lang, design, primary_color, whatsapp, owner_name, owner_phone, password_hash, expires_at)
VALUES ('demo', 'Glow Demo', 'ar', 'glow', '#db2777', '0555000000', 'Demo', '0555000000',
        'pbkdf2$100000$LmSWY/SuUD2sQyj45XyUXw==$EcZQsE4QKacDHbxgjOfKhYfCRoT14j71tLWjWFCobVk=',
        '2099-12-31T00:00:00Z');

INSERT OR IGNORE INTO domains (hostname, store_id, kind)
SELECT 'demo.localhost', id, 'subdomain' FROM stores WHERE slug = 'demo';

INSERT OR IGNORE INTO products (store_id, slug, name, description, price, old_price, stock, variants, sections, sort)
SELECT id, 'serum-vitamine-c', 'سيروم فيتامين C',
       'سيروم مركز بفيتامين C لبشرة مشرقة وموحدة اللون.' || char(10) || 'مناسب لجميع أنواع البشرة.',
       3200, 4500, 50,
       '[{"name":"الحجم","options":["30 ml","50 ml"]}]',
       '{"benefits":["يوحد لون البشرة","يقلل البقع الداكنة","ترطيب يدوم طوال اليوم"],"steps":["نظفي وجهك جيدا","ضعي 3 قطرات على الوجه","دلكي بلطف حتى يمتص"],"reviews":[],"faq":[{"q":"متى تظهر النتيجة؟","a":"من الأسبوع الثاني مع الاستعمال اليومي."},{"q":"هل الدفع عند الاستلام؟","a":"نعم، تدفعين عند استلام الطلب."}],"hide":["reviews"]}',
       0
FROM stores WHERE slug = 'demo';

INSERT OR IGNORE INTO products (store_id, slug, name, description, price, sections, sort)
SELECT id, 'creme-hydratante', 'كريم مرطب', 'كريم خفيف للترطيب اليومي.', 2400, '{}', 1
FROM stores WHERE slug = 'demo';

INSERT OR IGNORE INTO offers (store_id, product_id, qty, total_price)
SELECT p.store_id, p.id, 2, 5800 FROM products p JOIN stores s ON s.id = p.store_id
WHERE s.slug = 'demo' AND p.slug = 'serum-vitamine-c';

INSERT OR IGNORE INTO offers (store_id, product_id, qty, total_price)
SELECT p.store_id, p.id, 3, 8200 FROM products p JOIN stores s ON s.id = p.store_id
WHERE s.slug = 'demo' AND p.slug = 'serum-vitamine-c';

-- Delivery prices for all 69 wilayas (Alger cheaper, far south dearer)
INSERT OR IGNORE INTO delivery_prices (store_id, wilaya, home_price, desk_price)
WITH RECURSIVE w(n) AS (SELECT 1 UNION ALL SELECT n + 1 FROM w WHERE n < 69)
SELECT s.id, w.n,
       CASE WHEN w.n = 16 THEN 400 WHEN w.n IN (1, 11, 33, 37, 49, 50, 52, 53, 54, 56, 58) THEN 1200 ELSE 700 END,
       CASE WHEN w.n = 16 THEN 300 WHEN w.n IN (1, 11, 33, 37, 49, 50, 52, 53, 54, 56, 58) THEN 800 ELSE 450 END
FROM w, stores s WHERE s.slug = 'demo';
