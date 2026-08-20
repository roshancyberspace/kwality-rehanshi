-- Women's Salon & Spa — service packages import
-- phpMyAdmin / MySQL: select your DB, then Import this file.
-- Safe to run more than once: existing package names for this service are skipped.

SET @sid := (
  SELECT id
  FROM services
  WHERE name = 'Women''s Salon & Spa'
     OR slug IN ('womens-salon-spa', 'women-s-salon-spa', 'women-salon-at-home')
     OR name LIKE '%Women%Salon%'
  ORDER BY CASE WHEN status = 'Active' THEN 0 ELSE 1 END, id
  LIMIT 1
);

SELECT IF(@sid IS NULL, 'ERROR: Women''s Salon & Spa service not found. Create the service first.', CONCAT('Using service_id = ', @sid)) AS import_status;

UPDATE services SET status = 'Active' WHERE id = @sid;

-- Sub-services (created only if missing)
INSERT INTO sub_services (service_id, name, slug, description, sort_order, status, created_at, updated_at)
SELECT @sid, v.name, v.slug, v.description, v.sort_order, 'Active', NOW(), NOW()
FROM (
  SELECT 'Waxing' AS name, 'womens-salon-spa-waxing' AS slug, 'Full body and area waxing with hygienic products.' AS description, 10 AS sort_order
  UNION ALL SELECT 'D-Tan / Bleach', 'womens-salon-spa-d-tan-bleach', 'Face and body de-tan and bleach treatments.', 11
  UNION ALL SELECT 'Korean Facials', 'womens-salon-spa-korean-facials', 'Korean and signature facial rituals.', 12
  UNION ALL SELECT 'Face Cleanup', 'womens-salon-spa-face-cleanup', 'Deep cleanup and glow treatments.', 13
  UNION ALL SELECT 'Manicure & Pedicure', 'womens-salon-spa-manicure-pedicure', 'Hygienic nail grooming and spa mani-pedi.', 14
  UNION ALL SELECT 'Threading', 'womens-salon-spa-threading', 'Precision eyebrow and face threading.', 15
) v
WHERE @sid IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM sub_services ss WHERE ss.service_id = @sid AND ss.name = v.name
  );

SET @ss_waxing := (SELECT id FROM sub_services WHERE service_id = @sid AND name = 'Waxing' LIMIT 1);
SET @ss_dtan := (SELECT id FROM sub_services WHERE service_id = @sid AND name = 'D-Tan / Bleach' LIMIT 1);
SET @ss_korean := (SELECT id FROM sub_services WHERE service_id = @sid AND name = 'Korean Facials' LIMIT 1);
SET @ss_cleanup := (SELECT id FROM sub_services WHERE service_id = @sid AND name = 'Face Cleanup' LIMIT 1);
SET @ss_mani := (
  SELECT id FROM sub_services
  WHERE service_id = @sid AND name IN ('Manicure & Pedicure', 'Manicure and Pedicure')
  LIMIT 1
);
SET @ss_thread := (SELECT id FROM sub_services WHERE service_id = @sid AND name = 'Threading' LIMIT 1);

INSERT INTO service_packages (
  service_id, sub_service_id, category_key, name, price, duration, rating, description,
  highlights, included, not_included, process, warranty, sort_order, status, created_at, updated_at
)
SELECT
  @sid,
  v.sub_id,
  v.category_key,
  v.name,
  v.price,
  v.duration,
  4.80,
  v.description,
  JSON_ARRAY('Trained beautician', 'Hygienic tools', 'Branded products'),
  JSON_ARRAY('Consultation', v.name, 'Cleanup'),
  JSON_ARRAY('Retail products', 'Extra add-ons unless specified'),
  JSON_ARRAY('Book slot', 'Beautician arrives', 'Service delivery', 'Final check'),
  'Service quality support on eligible issues.',
  v.sort_order,
  'Active',
  NOW(),
  NOW()
FROM (
  -- WAXING
  SELECT @ss_waxing AS sub_id, 'waxing' AS category_key, 'Spatula Waxing – Full Arms & Legs + Underarms' AS name, 1039.00 AS price, '75 mins' AS duration, 1 AS sort_order, 'Full arms, full legs and underarms spatula waxing.' AS description
  UNION ALL SELECT @ss_waxing, 'waxing', 'Roll-On Waxing', 1399.00, '75 mins', 2, 'Smooth roll-on waxing for a cleaner finish.'
  UNION ALL SELECT @ss_waxing, 'waxing', 'Full Arms & Underarms Waxing', 639.00, '45 mins', 3, 'Full arms and underarms waxing. Starts at this price.'
  UNION ALL SELECT @ss_waxing, 'waxing', 'Full Face Brazilian Waxing', 349.00, '30 mins', 4, 'Full face Brazilian waxing.'
  UNION ALL SELECT @ss_waxing, 'waxing', 'Full Legs Waxing', 549.00, '40 mins', 5, 'Full legs waxing.'
  UNION ALL SELECT @ss_waxing, 'waxing', 'Underarms Waxing', 149.00, '15 mins', 6, 'Underarms waxing.'
  UNION ALL SELECT @ss_waxing, 'waxing', 'Half Legs Waxing', 369.00, '25 mins', 7, 'Half legs waxing.'
  UNION ALL SELECT @ss_waxing, 'waxing', 'Stomach Waxing', 499.00, '25 mins', 8, 'Stomach waxing.'
  UNION ALL SELECT @ss_waxing, 'waxing', 'Back Waxing', 549.00, '30 mins', 9, 'Back waxing.'
  UNION ALL SELECT @ss_waxing, 'waxing', 'Bikini Waxing', 1099.00, '35 mins', 10, 'Bikini waxing.'
  UNION ALL SELECT @ss_waxing, 'waxing', 'Butt Waxing', 349.00, '25 mins', 11, 'Butt waxing.'
  UNION ALL SELECT @ss_waxing, 'waxing', 'Bikini Line Waxing', 499.00, '25 mins', 12, 'Bikini line waxing.'
  UNION ALL SELECT @ss_waxing, 'waxing', 'Full Body Waxing', 1849.00, '120 mins', 13, 'Full body waxing.'

  -- D-TAN / BLEACH
  UNION ALL SELECT @ss_dtan, 'd-tan', 'Face & Neck D-Tan', 449.00, '35 mins', 20, 'Face and neck de-tan / bleach.'
  UNION ALL SELECT @ss_dtan, 'd-tan', 'Back D-Tan', 599.00, '40 mins', 21, 'Back de-tan / bleach.'
  UNION ALL SELECT @ss_dtan, 'd-tan', 'Chest D-Tan', 499.00, '35 mins', 22, 'Chest de-tan / bleach.'
  UNION ALL SELECT @ss_dtan, 'd-tan', 'Hands D-Tan', 599.00, '35 mins', 23, 'Hands de-tan / bleach.'
  UNION ALL SELECT @ss_dtan, 'd-tan', 'Full Legs D-Tan', 649.00, '45 mins', 24, 'Full legs de-tan / bleach.'
  UNION ALL SELECT @ss_dtan, 'd-tan', 'Full Body D-Tan', 1599.00, '90 mins', 25, 'Full body de-tan / bleach.'

  -- KOREAN / SIGNATURE FACIALS
  UNION ALL SELECT @ss_korean, 'korean-facials', 'Korean Glass Skin Facial', 2149.00, '75 mins', 30, 'Korean glass skin facial ritual.'
  UNION ALL SELECT @ss_korean, 'korean-facials', 'K-Glow Age-Rewind Facial', 1899.00, '70 mins', 31, 'K-Glow age-rewind facial.'
  UNION ALL SELECT @ss_korean, 'korean-facials', 'Korean Sea-Algae Hydra-Boost', 2349.00, '75 mins', 32, 'Korean sea-algae hydra-boost facial.'
  UNION ALL SELECT @ss_korean, 'korean-facials', 'Vitamin C Facial', 2299.00, '70 mins', 33, 'Vitamin C brightening facial.'
  UNION ALL SELECT @ss_korean, 'korean-facials', 'Rice Water Mochi Skin Ritual', 1999.00, '70 mins', 34, 'Rice water mochi skin ritual.'
  UNION ALL SELECT @ss_korean, 'korean-facials', 'Remy Belle Extreme Radiance', 459.00, '40 mins', 35, 'Remy Belle extreme radiance facial.'
  UNION ALL SELECT @ss_korean, 'korean-facials', 'Signature Brightening Facial', 2599.00, '80 mins', 36, 'Signature brightening facial.'
  UNION ALL SELECT @ss_korean, 'korean-facials', 'Korean Mask', 499.00, '30 mins', 37, 'Korean mask treatment.'
  UNION ALL SELECT @ss_korean, 'korean-facials', 'Casmara Brightening Facial', 2959.00, '80 mins', 38, 'Casmara brightening facial.'
  UNION ALL SELECT @ss_korean, 'korean-facials', 'Multi-Peptide Anti-Ageing Facial', 2699.00, '80 mins', 39, 'Multi-peptide anti-ageing facial.'
  UNION ALL SELECT @ss_korean, 'korean-facials', 'Casmara Anti-Ageing Facial', 3949.00, '90 mins', 40, 'Casmara anti-ageing facial.'
  UNION ALL SELECT @ss_korean, 'korean-facials', 'Hydraboost Facial', 2049.00, '70 mins', 41, 'Hydraboost facial.'
  UNION ALL SELECT @ss_korean, 'korean-facials', 'Casmara Hydralotion Facial', 2939.00, '80 mins', 42, 'Casmara hydralotion facial.'
  UNION ALL SELECT @ss_korean, 'korean-facials', 'O3 Kumkumadi Ayurvedic Facial', 1199.00, '60 mins', 43, 'O3 Kumkumadi Ayurvedic facial.'
  UNION ALL SELECT @ss_korean, 'korean-facials', 'O3+ Radiance Luxury Facial', 1749.00, '70 mins', 44, 'O3+ radiance luxury facial.'
  UNION ALL SELECT @ss_korean, 'korean-facials', 'Blossom Kochar Gold Facial', 1299.00, '60 mins', 45, 'Blossom Kochar gold facial.'
  UNION ALL SELECT @ss_korean, 'korean-facials', 'Blossom Kochar Diamond Facial', 1299.00, '60 mins', 46, 'Blossom Kochar diamond facial.'
  UNION ALL SELECT @ss_korean, 'korean-facials', 'Blossom Kochar Aroma Facial', 1149.00, '55 mins', 47, 'Blossom Kochar aroma facial.'

  -- FACE CLEANUP
  UNION ALL SELECT @ss_cleanup, 'face-cleanup', 'Hydra Mud Glow Cleanup', 1299.00, '50 mins', 50, 'Hydra mud glow cleanup.'
  UNION ALL SELECT @ss_cleanup, 'face-cleanup', 'Detox Mud Cleanup', 1299.00, '50 mins', 51, 'Detox mud cleanup.'
  UNION ALL SELECT @ss_cleanup, 'face-cleanup', 'Repechage Hydra Boost', 2199.00, '60 mins', 52, 'Repechage hydra boost cleanup.'
  UNION ALL SELECT @ss_cleanup, 'face-cleanup', 'Repechage Brightening', 1749.00, '55 mins', 53, 'Repechage brightening cleanup.'
  UNION ALL SELECT @ss_cleanup, 'face-cleanup', 'O3+ Cleanup', 999.00, '45 mins', 54, 'O3+ cleanup.'

  -- MANICURE / PEDICURE
  UNION ALL SELECT @ss_mani, 'manicure-pedicure', 'Signature Mani-Pedi Combo', 1749.00, '90 mins', 60, 'Signature manicure and pedicure combo.'
  UNION ALL SELECT @ss_mani, 'manicure-pedicure', 'Ice Cream Delight Pedicure', 1519.00, '60 mins', 61, 'Ice cream delight pedicure.'
  UNION ALL SELECT @ss_mani, 'manicure-pedicure', 'Rejuvenating Crystal Spa Pedicure', 1899.00, '70 mins', 62, 'Rejuvenating crystal spa pedicure.'
  UNION ALL SELECT @ss_mani, 'manicure-pedicure', 'Cut, File & Polish (Feet)', 349.00, '25 mins', 63, 'Feet cut, file and polish.'
  UNION ALL SELECT @ss_mani, 'manicure-pedicure', 'Ice Cream Delight Manicure', 1199.00, '50 mins', 64, 'Ice cream delight manicure.'
  UNION ALL SELECT @ss_mani, 'manicure-pedicure', 'O3+ Sea-Algae', 399.00, '30 mins', 65, 'O3+ sea-algae treatment.'
  UNION ALL SELECT @ss_mani, 'manicure-pedicure', 'Cut, File & Polish (Hands)', 299.00, '20 mins', 66, 'Hands cut, file and polish.'
  UNION ALL SELECT @ss_mani, 'manicure-pedicure', 'Lotus Pedicure Blossom', 799.00, '45 mins', 67, 'Lotus blossom pedicure.'
  UNION ALL SELECT @ss_mani, 'manicure-pedicure', 'Blossom Pedicure', 699.00, '40 mins', 68, 'Blossom pedicure.'
  UNION ALL SELECT @ss_mani, 'manicure-pedicure', 'Crystal Pedicure', 849.00, '45 mins', 69, 'Crystal pedicure.'
  UNION ALL SELECT @ss_mani, 'manicure-pedicure', 'Lotus Manicure', 449.00, '30 mins', 70, 'Lotus manicure.'
  UNION ALL SELECT @ss_mani, 'manicure-pedicure', 'Blossom Manicure', 399.00, '25 mins', 71, 'Blossom manicure.'
  UNION ALL SELECT @ss_mani, 'manicure-pedicure', 'Crystal Manicure', 499.00, '30 mins', 72, 'Crystal manicure.'

  -- THREADING
  UNION ALL SELECT @ss_thread, 'threading', 'Threading', 99.00, '15 mins', 80, 'Classic threading.'
  UNION ALL SELECT @ss_thread, 'threading', 'Upper Lips Threading', 69.00, '10 mins', 81, 'Upper lips threading.'
  UNION ALL SELECT @ss_thread, 'threading', '4 Heads Threading', 99.00, '15 mins', 82, 'Four heads threading.'
  UNION ALL SELECT @ss_thread, 'threading', 'Chin Threading', 69.00, '10 mins', 83, 'Chin threading.'
) v
WHERE @sid IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM service_packages p
    WHERE p.service_id = @sid
      AND p.name = v.name
  );

-- Packages listed without a rate were skipped:
-- Blossom Kochar cleanup diamond / aroma / gold (rate missing)

SELECT COUNT(*) AS womens_salon_packages
FROM service_packages
WHERE service_id = @sid
  AND category_key IN ('waxing', 'd-tan', 'korean-facials', 'face-cleanup', 'manicure-pedicure', 'threading');
