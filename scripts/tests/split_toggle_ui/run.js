// Playwright browser_run_code_unsafe: paste this expression into the runner.
// cfg.mode: assert (fixed version) or observe (e978c42 baseline).
// The runner never clicks Save/Sync and aborts every write request.
async (page) => {
  const cfg = { mode: 'assert', viewport: 'desktop', base: 'http://localhost:3000', file: 'freehandsss_dashboardV42.html' };
  await page.setViewportSize(cfg.viewport === 'mobile' ? { width: 375, height: 812 } : { width: 1440, height: 900 });
  const violations = [], results = [];
  // 以 confirm stub 控制確認框（Playwright MCP 會截走原生 dialog，page.on(dialog) 會令腳本卡住）
  await page.addInitScript(() => { window.__dlg = []; window.__choice = 'accept'; window.confirm = m => { window.__dlg.push(String(m)); return window.__choice !== 'dismiss'; }; window.alert = m => { window.__dlg.push(String(m)); }; });
  await page.route('**/*', route => {
    const request = route.request(), method = request.method(), url = request.url();
    // Existing page initialization uses these read-only POST endpoints.
    const readPost = method === 'POST' && (/\/rest\/v1\/rpc\/get_/.test(url) || /\/storage\/v1\/object\/sign\//.test(url));
    if (!['GET', 'HEAD', 'OPTIONS'].includes(method) && !readPost) {
      violations.push(method + ' ' + url.slice(0, 120));
      return route.abort();
    }
    return route.continue();
  });
  const fresh = async () => {
    await page.goto(cfg.base + '/' + cfg.file, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => typeof window.fhsD51KToggleOverride === 'function' && typeof window.babySetMode === 'function');
  };
  const check = (ok, message) => { if (!ok) throw new Error(message); };
  const run = async (name, fn) => {
    try { await fresh(); await fn(); results.push({ case: name, pass: true }); }
    catch (e) { results.push({ case: name, pass: false, error: String(e) }); }
  };
  const confirmAction = async (fn, answer) => {
    const before = await page.evaluate(a => { window.__choice = a; return window.__dlg.length; }, answer);
    try { await fn(); } finally { await page.evaluate(() => { window.__choice = 'accept'; }); }
    return page.evaluate(n => window.__dlg.slice(n), before);
  };
  const kSetup = async (prefix, left = ['4', 'Yun', '0905'], foot = ['2', 'Yun', '0905']) => {
    await page.evaluate(({ prefix, left, foot }) => {
      fhsD51KPill(prefix, 'lh'); fhsD51KPill(prefix, 'lf');
      fhsD51KToggleOverride(prefix);
      [['lh', left], ['lf', foot]].forEach(([part, values]) => {
        ['qty', 'top', 'bot'].forEach((field, i) => {
          const el = document.getElementById('k_' + prefix + part + '_' + field);
          el.value = values[i]; el.dispatchEvent(new Event('input', { bubbles: true }));
        });
      });
    }, { prefix, left, foot });
  };
  const kToggle = prefix => page.evaluate(p => fhsD51KToggleOverride(p), prefix);
  const kState = prefix => page.evaluate(p => {
    const v = id => document.getElementById(id).value;
    const part = x => ['qty', 'top', 'bot'].map(f => v('k_' + p + x + '_' + f));
    return { split: document.getElementById('d51OverrideRowsK_' + p).classList.contains('show'),
      lh: part('lh'), lf: part('lf'), shared: ['Qty', 'Top', 'Bot'].map(f => v('d51Shared' + f + 'K_' + p)) };
  }, prefix);
  const limbs = slot => page.evaluate(s => {
    const who = s ? '嬰兒#' + s : '嬰兒', out = {};
    ['左手', '右手', '左腳', '右腳'].forEach(part => {
      out[part] = document.querySelector('.limb-sel[data-who="' + who + '"][data-part="' + part + '"]').value;
    });
    return out;
  }, slot);
  const colors = { 左手: '粉紅色', 右手: '藍色', 左腳: '粉紅色', 右腳: '藍色' };
  const pending = { 左手: '待定', 右手: '待定', 左腳: '待定', 右腳: '待定' };
  const setColors = slot => page.evaluate(({ slot, colors }) => {
    const who = slot ? '嬰兒#' + slot : '嬰兒';
    Object.entries(colors).forEach(([part, color]) => {
      const el = document.querySelector('.limb-sel[data-who="' + who + '"][data-part="' + part + '"]');
      el.value = color; el.dispatchEvent(new Event('change', { bubbles: true }));
    });
  }, { slot, colors });
  const pMode = (slot, mode) => page.evaluate(({ slot, mode }) => slot ? fhsPExtraBabyMode(slot, mode) : babySetMode(mode), { slot, mode });
  const extra = async () => page.evaluate(() => { fhsPExtraAdd(); return _pActiveSlots()[0]; });
  const equal = (actual, expected, what) => check(JSON.stringify(actual) === JSON.stringify(expected), what + ': got ' + JSON.stringify(actual) + ', expected ' + JSON.stringify(expected));

  await run('T1 K 嬰兒取消統一', async () => {
    await kSetup(''); const before = await kState('');
    const d = await confirmAction(() => kToggle(''), 'dismiss');
    check(d.length === 1 && d[0].includes('左手') && d[0].includes('左腳'), '確認框未列出部位差異');
    equal(await kState(''), before, '取消後全部欄位');
  });
  await run('T2 K 嬰兒確認統一', async () => {
    await kSetup(''); const d = await confirmAction(() => kToggle(''), 'accept');
    const s = await kState(''); check(d.length === 1, '未顯示確認框');
    check(!s.split && s.shared[0] === '4' && s.lh[0] === '4' && s.lf[0] === '4', '統一值不正確');
  });
  await run('T3 K 嬰兒還原數量', async () => {
    await kSetup(''); await confirmAction(() => kToggle(''), 'accept'); await kToggle('');
    const s = await kState(''); check(s.split && s.lh[0] === '4' && s.lf[0] === '2', '數量未還原');
  });
  await run('T4 K 改統一數量後不還原', async () => {
    await kSetup(''); await confirmAction(() => kToggle(''), 'accept');
    await page.evaluate(() => { const e = document.getElementById('d51SharedQtyK_'); e.value = '5'; e.dispatchEvent(new Event('input', { bubbles: true })); });
    await kToggle(''); const s = await kState(''); check(s.lh[0] === '5' && s.lf[0] === '5', '舊快照未失效');
  });
  await run('T5 K 刻字差異還原', async () => {
    await kSetup('', ['4', 'Yun', '0905'], ['4', 'Ming', '0905']);
    await confirmAction(() => kToggle(''), 'accept'); await kToggle('');
    const s = await kState(''); check(s.lh[1] === 'Yun' && s.lf[1] === 'Ming', '刻字未還原');
  });
  await run('T6 K 大寶取消、確認、還原', async () => {
    await kSetup('e_'); const before = await kState('e_');
    const d = await confirmAction(() => kToggle('e_'), 'dismiss'); check(d.length === 1, '大寶未確認');
    equal(await kState('e_'), before, '大寶取消');
    await confirmAction(() => kToggle('e_'), 'accept'); await kToggle('e_');
    const s = await kState('e_'); check(s.lh[0] === '4' && s.lf[0] === '2', '大寶未還原');
  });
  await run('T7 K 相同值免確認', async () => {
    await kSetup('', ['4', 'Yun', '0905'], ['4', 'Yun', '0905']);
    const d = await confirmAction(() => kToggle(''), 'accept'); check(d.length === 0, '相同值仍彈確認');
    check(!(await kState('')).split, '未切統一');
  });
  await run('T8 K resetForm 清快照', async () => {
    await kSetup(''); await confirmAction(() => kToggle(''), 'accept');
    await page.evaluate(() => resetForm(true));
    await page.evaluate(() => { fhsD51KPill('', 'lh'); fhsD51KPill('', 'lf'); });
    await kToggle(''); const s = await kState('');
    check(s.split && s.lf[0] !== '2', '舊單快照滲入新單');
  });
  await run('T8b K 載入訂單（restoreFormState）清快照', async () => {
    await kSetup(''); await confirmAction(() => kToggle(''), 'accept');
    await page.evaluate(() => restoreFormState(JSON.parse(captureFormState())));
    const s0 = await kState('');
    if (s0.split) await kToggle(''); // 還原後若各部位相同會落統一模式；確保之後切去分開填
    await kToggle(''); const s = await kState('');
    check(s.split && s.lf[0] === '4', '載入訂單後舊快照仍然還原（左腳變返 2）');
  });
  await run('T9 P 主件自訂色還原', async () => {
    await pMode(0, 'custom'); await setColors(0);
    const d = await confirmAction(() => pMode(0, 'all'), 'accept'); check(d.length === 1 && d[0].includes('右手'), '未提示受影響肢體');
    await pMode(0, 'custom'); equal(await limbs(0), colors, '主件顏色');
  });
  await run('T10 P 改快選色使快照失效', async () => {
    await pMode(0, 'custom'); await setColors(0); await confirmAction(() => pMode(0, 'all'), 'accept');
    await page.evaluate(() => { const e = document.getElementById('babyQuickColor'); e.value = '香檳金'; e.dispatchEvent(new Event('change', { bubbles: true })); });
    await pMode(0, 'custom'); equal(await limbs(0), pending, '改色後主件');
  });
  await run('T11 P 首次自訂待定', async () => {
    await pMode(0, 'custom'); equal(await limbs(0), pending, '首次自訂');
  });
  await run('T12 P 主件取消快選', async () => {
    await pMode(0, 'custom'); await setColors(0);
    const d = await confirmAction(() => pMode(0, 'all'), 'dismiss'); check(d.length === 1, '未提示');
    equal(await limbs(0), colors, '取消後主件顏色');
    check(await page.evaluate(() => document.getElementById('babyBtn_custom').classList.contains('active')), '取消後離開自訂');
  });
  await run('T13 P 追加件還原及取消', async () => {
    const slot = await extra(); await pMode(slot, 'custom'); await setColors(slot);
    const d = await confirmAction(() => pMode(slot, 'all'), 'dismiss'); check(d.length === 1, '追加件未提示');
    equal(await limbs(slot), colors, '取消後追加件顏色');
    await confirmAction(() => pMode(slot, 'all'), 'accept'); await pMode(slot, 'custom');
    equal(await limbs(slot), colors, '追加件顏色還原');
  });
  await run('T15 P 重建及追加件款式切換清快照', async () => {
    await pMode(0, 'custom'); await setColors(0); await confirmAction(() => pMode(0, 'all'), 'accept');
    await page.evaluate(() => renderLimbGrid()); await pMode(0, 'custom');
    equal(await limbs(0), pending, '主件重建後');
    const slot = await extra(); await pMode(slot, 'custom'); await setColors(slot);
    await confirmAction(() => pMode(slot, 'all'), 'accept');
    await page.evaluate(s => { const e = document.getElementById('p' + s + '_pSubCat'); e.value = '玻璃瓶款式'; e.dispatchEvent(new Event('change', { bubbles: true })); }, slot);
    await pMode(slot, 'custom'); equal(await limbs(slot), pending, '追加件切款後');
  });
  await run('T16 P 玻璃瓶待定流程', async () => {
    await page.evaluate(() => { const e = document.getElementById('pSubCat'); e.value = '玻璃瓶款式'; e.dispatchEvent(new Event('change', { bubbles: true })); });
    equal(await limbs(0), pending, '玻璃瓶初始顏色');
    check(await page.evaluate(() => babyFillMode === 'glass_pending'), '玻璃瓶未進待定模式');
    await pMode(0, 'left');
    await page.evaluate(() => babyReturnToGlassPending());
    equal(await limbs(0), pending, '收回玻璃瓶後');
    check(await page.evaluate(() => babyFillMode === 'glass_pending'), '收回玻璃瓶後模式不正確');
  });

  await page.unroute('**/*');
  const failed = results.filter(r => !r.pass);
  const summary = { cfg, total: results.length, passed: results.length - failed.length, failed: failed.length, violations, results };
  if (violations.length) throw new Error('TEST ABORT: 偵測到被禁止的寫入類請求 ' + JSON.stringify(violations));
  if (cfg.mode === 'assert' && failed.length) throw new Error('TEST FAILED: ' + JSON.stringify(summary));
  return JSON.stringify(summary);
}
