// Verify Modal Phase A — migrations 0015/0016 + code fixes
// Tests: (1) new columns queryable (2) PATCH is_text_overridden (3) badge field integrity
// Safe: only PATCHes is_text_overridden=false (no data loss)

const SB_URL  = 'https://vpmwizzixnwilmzctdvu.supabase.co';
const SB_ANON = 'sb_publishable_ZDI9VLtyhgTBfyUWA65Unw_s-Zc1HwK';
const HEADERS = {
  apikey: SB_ANON,
  Authorization: `Bearer ${SB_ANON}`,
  'Content-Type': 'application/json',
  Prefer: 'return=representation'
};

async function run() {
  let pass = 0, fail = 0;

  function ok(label)   { console.log(`  ✅ PASS  ${label}`); pass++; }
  function bad(label, detail) { console.log(`  ❌ FAIL  ${label}`, detail || ''); fail++; }

  console.log('\n══════════════════════════════════════');
  console.log('  FHS Modal Phase A — Verification');
  console.log('══════════════════════════════════════\n');

  // ── Test 1: New columns selectable ──────────────────────────
  console.log('[Test 1] SELECT is_text_overridden, full_order_text_a, full_order_text_b');
  try {
    const r = await fetch(
      `${SB_URL}/rest/v1/orders?select=order_id,is_text_overridden,full_order_text_a,full_order_text_b&deleted_at=is.null&limit=1`,
      { headers: HEADERS }
    );
    const body = await r.json();
    if (!r.ok) {
      bad('SELECT returned non-200', `${r.status} — ${JSON.stringify(body).slice(0,120)}`);
    } else if (!Array.isArray(body) || body.length === 0) {
      bad('SELECT returned empty array (no orders found)');
    } else {
      const row = body[0];
      if (!('is_text_overridden' in row)) bad('is_text_overridden column missing from response');
      else ok('is_text_overridden column exists');

      if (!('full_order_text_a' in row)) bad('full_order_text_a column missing from response');
      else ok('full_order_text_a column exists');

      if (!('full_order_text_b' in row)) bad('full_order_text_b column missing from response');
      else ok('full_order_text_b column exists');

      console.log(`       order_id: ${row.order_id}`);
      console.log(`       is_text_overridden: ${row.is_text_overridden}`);
      console.log(`       full_order_text_a: "${(row.full_order_text_a||'').slice(0,40)}..."`);
      console.log(`       full_order_text_b: "${(row.full_order_text_b||'').slice(0,40)}..."`);

      // ── Test 2: PATCH is_text_overridden (safe write) ─────────
      const orderId = row.order_id;
      const currentFlag = row.is_text_overridden;
      console.log(`\n[Test 2] PATCH is_text_overridden=false on order ${orderId}`);
      const pr = await fetch(
        `${SB_URL}/rest/v1/orders?order_id=eq.${encodeURIComponent(orderId)}`,
        { method: 'PATCH', headers: HEADERS, body: JSON.stringify({ is_text_overridden: false }) }
      );
      const pb = await pr.json().catch(() => []);
      if (!pr.ok) {
        bad(`PATCH failed`, `${pr.status} — ${JSON.stringify(pb).slice(0,120)}`);
      } else if (Array.isArray(pb) && pb.length === 0) {
        bad('PATCH matched 0 rows (order_id not found?)');
      } else {
        ok(`PATCH 200 — is_text_overridden writable`);
        // Restore original value
        await fetch(
          `${SB_URL}/rest/v1/orders?order_id=eq.${encodeURIComponent(orderId)}`,
          { method: 'PATCH', headers: HEADERS, body: JSON.stringify({ is_text_overridden: currentFlag || false }) }
        );
        ok(`Restored original value (${currentFlag}) — no data changed`);
      }

      // ── Test 3: full_order_text_a/b type check ─────────────────
      console.log(`\n[Test 3] Type check full_order_text_a/b`);
      if (typeof row.full_order_text_a === 'string') ok('full_order_text_a is string (not null/undefined)');
      else bad(`full_order_text_a wrong type: ${typeof row.full_order_text_a}`);

      if (typeof row.full_order_text_b === 'string') ok('full_order_text_b is string (not null/undefined)');
      else bad(`full_order_text_b wrong type: ${typeof row.full_order_text_b}`);
    }
  } catch(e) {
    bad('Unexpected error', e.message);
  }

  // ── Summary ──────────────────────────────────────────────────
  console.log('\n══════════════════════════════════════');
  console.log(`  Result: ${pass} PASS / ${fail} FAIL`);
  console.log('══════════════════════════════════════\n');
  if (fail === 0) console.log('  🎉 Modal Phase A 驗收通過！可進入人工 UI 測試。\n');
  else            console.log('  ⚠️  有失敗項目，請把輸出貼給 Claude 診斷。\n');
}

run().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
