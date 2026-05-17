-- Migration 0009: Backfill n8n_cost_adjustments + fix cost fields
-- Date: 2026-05-17
-- Auth: Fat Mo
-- Formula: total_cost = handmodel_cost + keychain_cost(RAW) + necklace_cost + n8n_cost_adjustments
-- Rule S2.5: n8n_cost_adjustments = (keychainItemCount - 1) x (-20)

-- ============================================================
-- LAYER A: Add n8n_cost_adjustments only
-- (keychain_cost correct, total_cost already reflects deduction)
-- ============================================================

-- 0600104 (Ivy) 2 keychains, verify: 0+470+0-20=450=total
UPDATE orders SET
  n8n_cost_adjustments = -20,
  n8n_adjustment_notes = '[{"type":"keychain_shipping_deduction","amount":-20,"desc":"S2.5 keychain 2nd item HK$20 shipping waived (combined shipment), 2 keychains total","basis":"Product Bible V3.7 S2.5","keychain_item_count":2}]'::jsonb,
  updated_at = NOW()
WHERE order_id = '0600104';

-- 0600105 (Kathy) 2 keychains, verify: 0+890+0-20=870=total
UPDATE orders SET
  n8n_cost_adjustments = -20,
  n8n_adjustment_notes = '[{"type":"keychain_shipping_deduction","amount":-20,"desc":"S2.5 keychain 2nd item HK$20 shipping waived (combined shipment), 2 keychains total","basis":"Product Bible V3.7 S2.5","keychain_item_count":2}]'::jsonb,
  updated_at = NOW()
WHERE order_id = '0600105';

-- 0600801 (KaLeiChan) 2 keychains, verify: 0+470+0-20=450=total
UPDATE orders SET
  n8n_cost_adjustments = -20,
  n8n_adjustment_notes = '[{"type":"keychain_shipping_deduction","amount":-20,"desc":"S2.5 keychain 2nd item HK$20 shipping waived (combined shipment), 2 keychains total","basis":"Product Bible V3.7 S2.5","keychain_item_count":2}]'::jsonb,
  updated_at = NOW()
WHERE order_id = '0600801';

-- ============================================================
-- LAYER B: Fix keychain_cost + add n8n_cost_adjustments
-- (migration captured only 1 keychain cost, total_cost is correct)
-- ============================================================

-- 0600802 (WingLee) Migration 0007 set kc=450 (post-deduction), restore to raw=470
-- adj=-20 and notes already set by Migration 0007, only fix kc
-- verify: 0+470+0-20=450=total
UPDATE orders SET
  keychain_cost = 470,
  updated_at = NOW()
WHERE order_id = '0600802';

-- 0600710 (Kathleen) 2 keychains (290x2=580 raw), verify: 210+580+425-20=1195=total
UPDATE orders SET
  keychain_cost = 580,
  n8n_cost_adjustments = -20,
  n8n_adjustment_notes = '[{"type":"keychain_shipping_deduction","amount":-20,"desc":"S2.5 keychain 2nd item HK$20 shipping waived (combined shipment), 2 keychains total","basis":"Product Bible V3.7 S2.5","keychain_item_count":2}]'::jsonb,
  updated_at = NOW()
WHERE order_id = '0600710';

-- 0600721 (Akira) 4 keychains (185x4=740 raw), verify: 210+740+0-60=890=total
UPDATE orders SET
  keychain_cost = 740,
  n8n_cost_adjustments = -60,
  n8n_adjustment_notes = '[{"type":"keychain_shipping_deduction","amount":-60,"desc":"S2.5 keychain items 2-4 HK$20 shipping waived each (combined shipment), 4 keychains total","basis":"Product Bible V3.7 S2.5","keychain_item_count":4}]'::jsonb,
  updated_at = NOW()
WHERE order_id = '0600721';

-- 0600723 (PrinceCheng) 2 keychains (500x2=1000 raw), verify: 210+1000+0-20=1190=total
UPDATE orders SET
  keychain_cost = 1000,
  n8n_cost_adjustments = -20,
  n8n_adjustment_notes = '[{"type":"keychain_shipping_deduction","amount":-20,"desc":"S2.5 keychain 2nd item HK$20 shipping waived (combined shipment), 2 keychains total","basis":"Product Bible V3.7 S2.5","keychain_item_count":2}]'::jsonb,
  updated_at = NOW()
WHERE order_id = '0600723';

-- 0600724 (Angel) 2 keychains (290x2=580 raw), verify: 210+580+0-20=770=total
UPDATE orders SET
  keychain_cost = 580,
  n8n_cost_adjustments = -20,
  n8n_adjustment_notes = '[{"type":"keychain_shipping_deduction","amount":-20,"desc":"S2.5 keychain 2nd item HK$20 shipping waived (combined shipment), 2 keychains total","basis":"Product Bible V3.7 S2.5","keychain_item_count":2}]'::jsonb,
  updated_at = NOW()
WHERE order_id = '0600724';

-- 0600800 (Amen) 2 keychains (185x2=370 raw), verify: 210+370+906-20=1466=total
UPDATE orders SET
  keychain_cost = 370,
  n8n_cost_adjustments = -20,
  n8n_adjustment_notes = '[{"type":"keychain_shipping_deduction","amount":-20,"desc":"S2.5 keychain 2nd item HK$20 shipping waived (combined shipment), 2 keychains total","basis":"Product Bible V3.7 S2.5","keychain_item_count":2}]'::jsonb,
  updated_at = NOW()
WHERE order_id = '0600800';

-- 0650429 (Shirley) 2 physical keychains (290x2=580 raw), verify: 0+580+0-20=560=total
UPDATE orders SET
  keychain_cost = 580,
  n8n_cost_adjustments = -20,
  n8n_adjustment_notes = '[{"type":"keychain_shipping_deduction","amount":-20,"desc":"S2.5 keychain 2nd item HK$20 shipping waived (combined shipment), 2 keychains total","basis":"Product Bible V3.7 S2.5","keychain_item_count":2}]'::jsonb,
  updated_at = NOW()
WHERE order_id = '0650429';

-- ============================================================
-- LAYER C: Fix necklace_cost
-- (migration captured only 1 of 2 necklace items)
-- ============================================================

-- 0600903 (Lokyi_C) 2 silver necklaces (475x2=950), verify: 0+235+950+0=1185=total
UPDATE orders SET
  necklace_cost = 950,
  updated_at = NOW()
WHERE order_id = '0600903';

-- ============================================================
-- LAYER D: Fix total_cost (P0 critical error)
-- ============================================================

-- 0600102 (nam.kaaa) total_cost was 210 (only handmodel_cost stored during migration)
-- 3 keychains: adj=(3-1)x(-20)=-40
-- correct total = hm(210) + kc(760) + nk(475) + adj(-40) = 1405
UPDATE orders SET
  total_cost = 1405,
  n8n_cost_adjustments = -40,
  n8n_adjustment_notes = '[{"type":"keychain_shipping_deduction","amount":-40,"desc":"S2.5 keychain items 2-3 HK$20 shipping waived each (combined shipment), 3 keychains total","basis":"Product Bible V3.7 S2.5","keychain_item_count":3}]'::jsonb,
  updated_at = NOW()
WHERE order_id = '0600102';

-- ============================================================
-- POST-UPDATE VERIFICATION (remove comment markers to run)
-- ============================================================
SELECT
  order_id,
  customer_name,
  ROUND(handmodel_cost::numeric, 0)   AS hm,
  ROUND(keychain_cost::numeric, 0)    AS kc,
  ROUND(necklace_cost::numeric, 0)    AS nk,
  ROUND(total_cost::numeric, 0)       AS total,
  n8n_cost_adjustments                AS adj,
  ROUND((
    handmodel_cost + keychain_cost + necklace_cost
    + COALESCE(n8n_cost_adjustments, 0)
  )::numeric, 0)                      AS formula_total,
  CASE
    WHEN ABS(total_cost - (
      handmodel_cost + keychain_cost + necklace_cost
      + COALESCE(n8n_cost_adjustments, 0)
    )) < 0.01 THEN 'OK'
    ELSE 'FAIL diff=' || ROUND((total_cost - (
      handmodel_cost + keychain_cost + necklace_cost
      + COALESCE(n8n_cost_adjustments, 0)
    ))::numeric, 2)::text
  END AS formula_check,
  (n8n_adjustment_notes IS NOT NULL)  AS has_notes
FROM orders
ORDER BY order_id;
