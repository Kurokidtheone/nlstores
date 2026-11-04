-- Demo store for the GLOW design (beauty / skincare), Arabic, for the LIVE database.
--
-- BEFORE PASTING: replace yourbrand.com below with your real domain (domain not bought yet).
-- How to run it: Cloudflare dashboard -> Storage & Databases -> D1 SQL Database -> stores-db
--                -> Console -> paste this whole file -> Execute.
-- Opens at https://demo-glow.yourbrand.com — seller dashboard /dashboard : 0555000100 / demo1234
-- (a public demo password: never reuse it for a client).
-- Photos and the 4 review screenshots are placeholder images shipped with the app
-- (public/demo/glow/*.svg): replace them in the product editor (Photos, Avis clients).
-- Safe to run twice: existing rows are kept.

INSERT OR IGNORE INTO stores (slug, name, lang, design, primary_color, accent_color, whatsapp, owner_name, owner_phone, password_hash,
                            expires_at, announcement, announcement_on, delivery_checked)
VALUES ('demo-glow', 'لمسة جمال', 'ar', 'glow', '#b83268', '#3d1426', '0555000100', 'Demo Glow', '0555000100',
        'pbkdf2$100000$LmSWY/SuUD2sQyj45XyUXw==$EcZQsE4QKacDHbxgjOfKhYfCRoT14j71tLWjWFCobVk=', '2099-12-31T00:00:00Z', '🎁 هدية مجانية مع كل طلب من قطعتين — الدفع عند الاستلام', 1, 1);

INSERT OR IGNORE INTO domains (hostname, store_id, kind)
SELECT 'demo-glow.yourbrand.com', id, 'subdomain' FROM stores WHERE slug = 'demo-glow';

INSERT OR IGNORE INTO products (store_id, slug, name, description, price, old_price, images, variants, sections, visible, sort)
SELECT id, 'serum-vitamine-c', 'سيروم فيتامين C المضيء 30 مل', 'سيروم خفيف بتركيز 15% من فيتامين C مع حمض الهيالورونيك، يمنح بشرتك إشراقة طبيعية ويوحد لونها من الأسبوع الثاني.
يمتص بسرعة ولا يترك أثرا دهنيا، مناسب للاستعمال اليومي.', 2900, 3900, '["demo/glow/serum-1.svg","demo/glow/serum-2.svg"]', '[]',
       '{"benefits":["يوحد لون البشرة ويخفف البقع الداكنة","إشراقة واضحة من الأسبوع الثاني","ترطيب خفيف بدون لمعان","مناسب لجميع أنواع البشرة"],"steps":["نظفي وجهك وجففيه جيدا","ضعي 3 إلى 4 قطرات على الوجه والرقبة","دلكي بلطف ثم ضعي واقي الشمس صباحا"],"reviews":["demo/glow/review-1.svg","demo/glow/review-2.svg","demo/glow/review-3.svg","demo/glow/review-4.svg"],"faq":[{"q":"متى تظهر النتيجة؟","a":"تبدأ الإشراقة من الأسبوع الثاني، والنتيجة الكاملة بعد 4 إلى 6 أسابيع من الاستعمال اليومي."},{"q":"هل المنتجات أصلية؟","a":"نعم، كل منتجاتنا أصلية ومختومة. يمكنك فحص المنتج أمام عامل التوصيل قبل الدفع."},{"q":"كم تستغرق مدة التوصيل؟","a":"من 24 إلى 72 ساعة حسب ولايتك، إلى المنزل أو إلى مكتب التوصيل، في 69 ولاية."},{"q":"كيف أدفع؟","a":"الدفع عند الاستلام فقط: لا تدفعين أي شيء قبل أن تستلمي طلبك."}],"hide":[]}', 1, 0
FROM stores WHERE slug = 'demo-glow';

INSERT OR IGNORE INTO offers (store_id, product_id, qty, total_price)
SELECT p.store_id, p.id, 2, 5200 FROM products p JOIN stores s ON s.id = p.store_id WHERE s.slug = 'demo-glow' AND p.slug = 'serum-vitamine-c';

INSERT OR IGNORE INTO offers (store_id, product_id, qty, total_price)
SELECT p.store_id, p.id, 3, 7200 FROM products p JOIN stores s ON s.id = p.store_id WHERE s.slug = 'demo-glow' AND p.slug = 'serum-vitamine-c';

INSERT OR IGNORE INTO products (store_id, slug, name, description, price, old_price, images, variants, sections, visible, sort)
SELECT id, 'creme-hyaluronique', 'كريم الترطيب العميق بحمض الهيالورونيك 50 مل', 'كريم غني بحمض الهيالورونيك والسيراميد، يرطب البشرة لمدة 48 ساعة ويقوي حاجزها الطبيعي.
ملمس كريمي خفيف، مثالي قبل المكياج.', 2500, 3400, '["demo/glow/cream-1.svg","demo/glow/cream-2.svg"]', '[{"name":"نوع البشرة","options":["جافة","عادية","مختلطة"]}]',
       '{"benefits":["ترطيب يدوم 48 ساعة","بشرة ناعمة وممتلئة من أول استعمال","يقوي حاجز البشرة","قاعدة مثالية للمكياج"],"steps":["ضعي كمية صغيرة على بشرة نظيفة","وزعيها بحركات دائرية من الداخل إلى الخارج","استعمليه صباحا ومساء"],"reviews":["demo/glow/review-1.svg","demo/glow/review-2.svg","demo/glow/review-3.svg","demo/glow/review-4.svg"],"faq":[{"q":"هل يناسب البشرة الحساسة؟","a":"نعم، الكريم خال من العطور والكحول ومناسب للبشرة الحساسة."},{"q":"هل المنتجات أصلية؟","a":"نعم، كل منتجاتنا أصلية ومختومة. يمكنك فحص المنتج أمام عامل التوصيل قبل الدفع."},{"q":"كم تستغرق مدة التوصيل؟","a":"من 24 إلى 72 ساعة حسب ولايتك، إلى المنزل أو إلى مكتب التوصيل، في 69 ولاية."},{"q":"كيف أدفع؟","a":"الدفع عند الاستلام فقط: لا تدفعين أي شيء قبل أن تستلمي طلبك."}],"hide":[]}', 1, 1
FROM stores WHERE slug = 'demo-glow';

INSERT OR IGNORE INTO offers (store_id, product_id, qty, total_price)
SELECT p.store_id, p.id, 2, 4500 FROM products p JOIN stores s ON s.id = p.store_id WHERE s.slug = 'demo-glow' AND p.slug = 'creme-hyaluronique';

INSERT OR IGNORE INTO products (store_id, slug, name, description, price, old_price, images, variants, sections, visible, sort)
SELECT id, 'huile-argan', 'زيت الأرغان الطبيعي 100% للشعر والبشرة 100 مل', 'زيت أرغان نقي معصور على البارد، يغذي الشعر الجاف ويقوي الأطراف، ويرطب البشرة والأظافر.
بدون أي إضافات.', 2200, 2900, '["demo/glow/argan-1.svg","demo/glow/argan-2.svg"]', '[]',
       '{"benefits":["شعر لامع وناعم بدون تقصف","يغذي البشرة الجافة والأظافر","معصور على البارد 100% طبيعي","زجاجة تكفي 3 أشهر"],"steps":["ضعي 3 قطرات على أطراف الشعر الرطب","للبشرة: دلكي قطرتين مساء","للعلاج العميق: اتركيه ليلة كاملة ثم اغسلي الشعر"],"reviews":["demo/glow/review-1.svg","demo/glow/review-2.svg","demo/glow/review-3.svg","demo/glow/review-4.svg"],"faq":[{"q":"هل يجعل الشعر دهنيا؟","a":"لا، إذا استعملت 2 إلى 3 قطرات فقط على الأطراف يمتص بسرعة ويترك الشعر لامعا."},{"q":"هل المنتجات أصلية؟","a":"نعم، كل منتجاتنا أصلية ومختومة. يمكنك فحص المنتج أمام عامل التوصيل قبل الدفع."},{"q":"كم تستغرق مدة التوصيل؟","a":"من 24 إلى 72 ساعة حسب ولايتك، إلى المنزل أو إلى مكتب التوصيل، في 69 ولاية."},{"q":"كيف أدفع؟","a":"الدفع عند الاستلام فقط: لا تدفعين أي شيء قبل أن تستلمي طلبك."}],"hide":[]}', 1, 2
FROM stores WHERE slug = 'demo-glow';

INSERT OR IGNORE INTO offers (store_id, product_id, qty, total_price)
SELECT p.store_id, p.id, 2, 3900 FROM products p JOIN stores s ON s.id = p.store_id WHERE s.slug = 'demo-glow' AND p.slug = 'huile-argan';

INSERT OR IGNORE INTO offers (store_id, product_id, qty, total_price)
SELECT p.store_id, p.id, 3, 5400 FROM products p JOIN stores s ON s.id = p.store_id WHERE s.slug = 'demo-glow' AND p.slug = 'huile-argan';

-- Delivery to the 69 wilayas: Alger 400 / 300, south 900 / 600, elsewhere 600 / 400 DA (home / stop desk)
INSERT OR IGNORE INTO delivery_prices (store_id, wilaya, home_price, desk_price)
WITH RECURSIVE w(n) AS (SELECT 1 UNION ALL SELECT n + 1 FROM w WHERE n < 69)
SELECT s.id, w.n,
       CASE WHEN w.n = 16 THEN 400 WHEN w.n IN (1, 3, 7, 8, 11, 30, 32, 33, 37, 39, 47, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 61, 69) THEN 900 ELSE 600 END,
       CASE WHEN w.n = 16 THEN 300 WHEN w.n IN (1, 3, 7, 8, 11, 30, 32, 33, 37, 39, 47, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 61, 69) THEN 600 ELSE 400 END
FROM w, stores s WHERE s.slug = 'demo-glow';
