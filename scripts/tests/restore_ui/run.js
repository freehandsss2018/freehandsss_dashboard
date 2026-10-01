// 「重開訂單還原」UI 測試。由 Playwright browser_run_code_unsafe 以 filename 載入執行。
// 設定：下方 cfg（version: 'fixed'|'prefix'；viewport: 'desktop'|'mobile'；mode: 'assert'|'observe'；file 為 base 下要測的 HTML）。
//   assert  ＝ 任一案例不符預期、或任何被禁止的請求，即 throw（腳本失敗）；用於驗收「修復後」版本。
//   observe ＝ 只記錄不 throw；用於對照組（修復前版本，預期有失敗，證明測試有效）。
// 網路策略（誠實說明）：
//   - 讀取真實 Supabase GET（不是 fixture），突變案例以真實回應改寫後回傳；
//   - 非 GET 請求一律 abort 並記 violation，唯獨放行讀取型 POST（rpc/get_*、storage 簽名網址）——它們是頁面載入讀取，非寫入；
//   - 只攔截此 page 內的請求，腳本不點任何保存／同步掣。這只能證明「測試期間頁面沒有發出被禁止的請求」，不能擔保頁面外行為。
async (page) => {
  const cfg = { version: 'fixed', viewport: 'desktop', mode: 'assert', base: 'http://localhost:3000', file: 'freehandsss_dashboardV42.html' };
  await page.setViewportSize(cfg.viewport === 'mobile' ? { width: 375, height: 812 } : { width: 1440, height: 900 });

  const violations = [];
  let mutation = null;
  let allowedReadPosts = 0;

  await page.route('**/*', async (route) => {
    const req = route.request();
    const url = req.url();
    const isReadPost = req.method() === 'POST' && (/\/rest\/v1\/rpc\/get_/.test(url) || /\/storage\/v1\/object\/sign\//.test(url));
    if (isReadPost) { allowedReadPosts++; return route.continue(); }
    if (req.method() !== 'GET' && req.method() !== 'OPTIONS' && req.method() !== 'HEAD') {
      violations.push(req.method() + ' ' + url.slice(0, 120));
      return route.abort();
    }
    if (mutation && url.includes('/rest/v1/')) {
      const resp = await route.fetch();
      let body = await resp.text();
      try {
        const j = JSON.parse(body);
        const items = url.includes('/rest/v1/order_items');
        if (mutation.kind === 'legacyKey' && items) j.forEach(i => { if (/_M_RH$/.test(i.item_key)) { i.item_key = 'TEMP_M_01'; i.specification = ''; } });
        if (mutation.kind === 'kEngravingHasDirectionWord' && items) j.forEach(i => { if (/_K_RH$/.test(i.item_key)) { i.specification = '[上排]左手 [下排]BABY'; i.engraving_text = '[上排]左手 [下排]BABY'; } });
        if (mutation.kind === 'mSpecHasOtherDirection' && items) j.forEach(i => { if (/_M_RH$/.test(i.item_key)) { i.specification = '左手'; i.engraving_text = '左手'; } });
        if (mutation.kind === 'famOnly' && items) { for (let n = j.length - 1; n >= 0; n--) if (/_K_(LF|RH|LH|RF)$/.test(j[n].item_key)) j.splice(n, 1); }
        if (mutation.kind === 'famWithElder' && items) j.forEach(i => { if (/_K_FAM_COMBO$/.test(i.item_key)) { i.specification = '爸：A 媽：B 寶：C | 合成: 父母手 + 大寶右腳 + 嬰兒左手'; i.engraving_text = i.specification; } });
        if (mutation.kind === 'famOnlyEmptyRaw' && items) { for (let n = j.length - 1; n >= 0; n--) if (/_K_(LF|RH|LH|RF)$/.test(j[n].item_key)) j.splice(n, 1); }
        if ((mutation.kind === 'emptyRaw' || mutation.kind === 'famOnlyEmptyRaw') && url.includes('/rest/v1/orders')) j.forEach(o => { o.raw_form_state = {}; });
        body = JSON.stringify(j);
      } catch (e) { /* 非 JSON 直接放行 */ }
      return route.fulfill({ response: resp, body });
    }
    return route.continue();
  });

  const IDS = {
    M: ['m_lh_en','m_rh_en','m_lf_en','m_rf_en','m_e_lh_en','m_e_rh_en','m_e_lf_en','m_e_rf_en'],
    K: ['k_lh_en','k_rh_en','k_lf_en','k_rf_en','k_e_lh_en','k_e_rh_en','k_e_lf_en','k_e_rf_en'],
  };
  const results = [];

  async function runCase(name, orderId, kind) {
    const consoleErrors = [];
    const onErr = (m) => { if (m.type() === 'error') consoleErrors.push(m.text().slice(0, 160)); };
    page.on('console', onErr);
    mutation = null;
    await page.goto(cfg.base + '/' + cfg.file, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => typeof window.reconstructOrderFromSupabase === 'function', null, { timeout: 30000 });
    await page.waitForTimeout(2500);
    mutation = kind ? { kind, orderId } : null;
    const out = await page.evaluate(async ({ orderId, IDS }) => {
      const ok = await window.reconstructOrderFromSupabase(orderId, document.getElementById('fetchStatus'));
      await new Promise(r => setTimeout(r, 1800));
      const on = (id) => { const e = document.getElementById(id); return !!(e && e.checked); };
      const val = (id) => { const e = document.getElementById(id); return e ? e.value : null; };
      const res = { ok, M: IDS.M.filter(on).map(s => s.replace(/^m_|_en$/g, '').toUpperCase()), K: IDS.K.filter(on).map(s => s.replace(/^k_|_en$/g, '').toUpperCase()) };
      res.qtyM = {}; IDS.M.filter(on).forEach(id => { res.qtyM[id.replace(/^m_|_en$/g, '').toUpperCase()] = val(id.replace('_en', '_qty')); });
      res.qtyK = {}; IDS.K.filter(on).forEach(id => { res.qtyK[id.replace(/^k_|_en$/g, '').toUpperCase()] = val(id.replace('_en', '_qty')); });
      res.kText = {}; IDS.K.filter(on).forEach(id => { const b = id.replace('_en', ''); res.kText[id.replace(/^k_|_en$/g, '').toUpperCase()] = [val(b + '_top'), val(b + '_bot')]; });
      res.sharedK = [val('d51SharedQtyK_'), val('d51SharedTopK_'), val('d51SharedBotK_')];
      const ovEl = document.getElementById('d51OverrideRowsK_'); res.ovOpen = !!(ovEl && ovEl.classList.contains('show'));
      const txt = (document.body.textContent || '').replace(/\s+/g, ' ');
      const m = txt.match(/吊飾\s*\d+\s*個\s*\/\s*\d+\s*條頸鏈\s*:?\s*\$?\s*[\d,]*/);
      res.necklaceCard = m ? m[0].trim() : null;
      const q = txt.match(/系統精算建議報價\s*\$\s*([\d,]+)/);
      res.suggested = q ? q[1] : null;
      return res;
    }, { orderId, IDS });
    page.off('console', onErr);
    const exp = await page.evaluate(async ({ orderId }) => {
      const r = await fetch(`${window.SB_URL}/rest/v1/order_items?order_fhs_id=eq.${encodeURIComponent(orderId)}&select=item_key,engraving_text,specification,quantity`, { headers: { apikey: window.SB_ANON_KEY, Authorization: `Bearer ${window.SB_ANON_KEY}` } });
      const items = await r.json();
      const dir = (cat, k) => { const m = k.match(new RegExp('_' + cat + '_((?:E_)?(?:LH|RH|LF|RF))$', 'i')); return m ? m[1].toUpperCase() : null; };
      const M = {}, K = {}, Ktext = {};
      items.forEach(i => {
        const dm = dir('M', i.item_key), dk = dir('K', i.item_key);
        if (dm) M[dm] = i.quantity || 1;
        if (dk) {
          K[dk] = i.quantity || 1;
          const eg = i.engraving_text || (/\[(上|下)排\]/.test(i.specification || '') ? i.specification : '');
          const tm = eg.match(/\[上排\]([^\[]*)/), bm = eg.match(/\[下排\]([^\[]*)/);
          Ktext[dk] = [tm ? tm[1].trim() : eg.replace(/\[下排\][^\[]*/g, '').trim(), bm ? bm[1].trim() : ''];
        }
      });
      return { M, K, Ktext };
    }, { orderId });

    let expMparts = Object.keys(exp.M).sort(), expKparts = Object.keys(exp.K).sort();
    const checkQtyText = !(kind === 'legacyKey' || kind === 'kEngravingHasDirectionWord' || kind === 'famWithElder');
    if (kind === 'famOnlyEmptyRaw') { expKparts = []; } // 品項只剩家庭組合且 raw_form_state 為空：不得憑空產生任何單品鎖匙扣部位
    if (kind === 'famOnly') expKparts = ['LF', 'RH']; // 突變只刪品項；raw_form_state 仍保留原 K 左腳／右手（還原只加不減）→ 預期＝raw 的 LF,RH，關鍵是「不得多出 LH」
    if (kind === 'legacyKey') expMparts = Array.from(new Set(expMparts.concat(['LH', 'RH']))).sort(); // 舊格式無方向：後備左手＋raw_form_state 保留原右手 → 聯集（既有 legacy 行為）
    const gotM = out.M.slice().sort(), gotK = out.K.slice().sort();
    const fails = [];
    if (out.ok !== true) fails.push('reconstructOrderFromSupabase 未回傳 true：' + out.ok);
    if (!out.suggested) fails.push('建議售價讀不到（報價卡未渲染）');
    if (JSON.stringify(gotM) !== JSON.stringify(expMparts)) fails.push(`M 部位 got=${gotM} exp=${expMparts}`);
    if (JSON.stringify(gotK) !== JSON.stringify(expKparts)) fails.push(`K 部位 got=${gotK} exp=${expKparts}`);
    if (checkQtyText) {
      Object.keys(exp.M).forEach(d => { if (String(out.qtyM[d]) !== String(exp.M[d])) fails.push(`M ${d} 數量 got=${out.qtyM[d]} exp=${exp.M[d]}`); });
      Object.keys(exp.K).forEach(d => { if (String(out.qtyK[d]) !== String(exp.K[d])) fails.push(`K ${d} 數量 got=${out.qtyK[d]} exp=${exp.K[d]}`); });
      Object.keys(exp.Ktext).forEach(d => { const g = out.kText[d] || []; if ((g[0] || '') !== exp.Ktext[d][0] || (g[1] || '') !== exp.Ktext[d][1]) fails.push(`K ${d} 刻字 got=${JSON.stringify(g)} exp=${JSON.stringify(exp.Ktext[d])}`); });
    }
    // 共用欄位／分開填不變式（K 嬰兒區）：選中部位的 數量／上排／下排 全部相同 → 共用欄位須等於該值；有不同 → 須自動展開「分開填」
    const kk = Object.keys(out.qtyK).filter(d => !d.startsWith('E_'));
    if (kk.length && checkQtyText) {
      const tuples = kk.map(d => [String(out.qtyK[d]), (out.kText[d] || [])[0] || '', (out.kText[d] || [])[1] || '']);
      const same = tuples.every(t => t.join('|') === tuples[0].join('|'));
      if (same) { const sh = [String(out.sharedK[0]), out.sharedK[1] || '', out.sharedK[2] || '']; if (sh.join('|') !== tuples[0].join('|')) fails.push('K 共用欄位 got=' + JSON.stringify(sh) + ' exp=' + JSON.stringify(tuples[0])); }
      else if (!out.ovOpen) fails.push('K 各部位數量／刻字不同，但「分開填」未自動展開');
    }
    if (consoleErrors.length) fails.push(`console error ×${consoleErrors.length}: ${consoleErrors[0]}`);
    results.push({ case: name, order: orderId, viewport: cfg.viewport, version: cfg.version, kind: kind || 'real', pass: fails.length === 0, fails, card: out.necklaceCard, suggested: out.suggested });
  }

  const cases = [
    ['U1 吊飾 右手＋左腳（0600930）', '0600930'],
    ['U2 吊飾四肢＋鎖匙扣四肢（0600721）', '0600721'],
    ['U3 大寶右手＋嬰兒左手（0600804）', '0600804'],
    ['U5 鎖匙扣單品＋家庭組合（0600107）', '0600107'],
    ['U7 舊格式鎖匙扣：刻字在 specification、左手4件＋左腳2件（0600105）', '0600105'],
    ['吊飾 左手＋左腳＋鎖匙扣（0600710）', '0600710'],
    ['吊飾 左手＋左腳＋鎖匙扣（0600803）', '0600803'],
    ['吊飾 左手＋右腳＋鎖匙扣（0600903）', '0600903'],
    ['吊飾 單件右手（0600727）', '0600727'],
    ['吊飾 右手＋右腳＋鎖匙扣（0600800）', '0600800'],
    ['U4 舊格式 TEMP_M_01 後備', '0600930', 'legacyKey'],
    ['U6 只有家庭組合、無單品鎖匙扣（0600107 突變）', '0600107', 'famOnly'],
    ['U6b 家庭組合含大寶右腳（0600107 突變）', '0600107', 'famWithElder'],
    ['U8 鎖匙扣刻字含「左手」（0600710 突變）', '0600710', 'kEngravingHasDirectionWord'],
    ['U8b 吊飾右手刻字含「左手」（0600930 突變）', '0600930', 'mSpecHasOtherDirection'],
    ['U9 raw_form_state 為空僅靠品項重建（0600930）', '0600930', 'emptyRaw'],
    ['U6c 只剩家庭組合＋raw_form_state 為空（0600107 突變，真正的純家庭組合單）', '0600107', 'famOnlyEmptyRaw'],
  ];
  for (const c of cases) {
    try { await runCase(c[0], c[1], c[2]); }
    catch (e) { results.push({ case: c[0], order: c[1], viewport: cfg.viewport, version: cfg.version, kind: c[2] || 'real', pass: false, fails: ['腳本錯誤: ' + String(e).slice(0, 160)] }); }
  }
  await page.unroute('**/*'); // 必須移除：殘留的攔截器會改寫之後所有頁面載入的資料（曾令總覽出現假的 href="#icon-… 文字，2026-10-01 誤報事件）
  const failed = results.filter(r => !r.pass);
  const summary = { cfg: { version: cfg.version, viewport: cfg.viewport, mode: cfg.mode, file: cfg.file }, total: results.length, passed: results.length - failed.length, failed: failed.length, violations, allowedReadPosts, results };
  if (violations.length) throw new Error('TEST ABORT: 偵測到被禁止的寫入類請求 ' + JSON.stringify(violations));
  if (cfg.mode === 'assert' && failed.length) throw new Error('TEST FAILED (' + failed.length + '/' + results.length + '): ' + JSON.stringify(failed.map(f => ({ c: f.case, o: f.order, f: f.fails }))));
  return JSON.stringify(summary);
}
