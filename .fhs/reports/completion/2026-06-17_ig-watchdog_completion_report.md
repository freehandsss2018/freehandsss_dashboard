# 完成記錄 — IG 漏單看門狗（本地唯讀，DYI 路線）

**日期**：2026-06-17
**Session**：108
**Flow**：`artifacts/2026-06-16-2330/`（Verdict: CONDITIONAL_READY → /execute）
**前置 Flow**：`artifacts/2026-06-16-2012/`（IG Graph API 路線，cancelled — Meta 驗證封死）

---

## 一、任務

偵測「IG message 人手出訂單，沒有經 V42，純系統無紀錄」的漏單（S1/S2）。
因 IG Graph API Advanced Access 需 Meta 商業驗證（FHS 無 BR/網站/業務帳單）而封死，
改用 Meta 原生「下載你的資訊」(DYI) 匯出 — 唯一合法、免驗證、免 App Review 途徑。

## 二、交付物（影響檔案）

| 動作 | 檔案 |
|------|------|
| `[NEW]` | `scripts/ig-watchdog/index.mjs`（主控）|
| `[NEW]` | `scripts/ig-watchdog/lib/decoder.mjs` + `decoder.test.mjs`|
| `[NEW]` | `scripts/ig-watchdog/lib/match.mjs` + `match.test.mjs`|
| `[NEW]` | `scripts/ig-watchdog/fixtures/`（`_gen.mjs` + 合成 inbox/orders/pipeline）|
| `[NEW]` | `scripts/ig-watchdog/hooks/pre-commit`（隱私守衛）|
| `[NEW]` | `scripts/ig-watchdog/SOP.md` + `package.json`|
| `[MODIFY]` | `.gitignore`（+`.fhs-local/`、`output/`、`*.zip`）|
| `[MODIFY]` | `docs/repo-map.md`、`scripts/README.md`、`CHANGELOG.md`|

## 三、架構決策

- **100% 本地、唯讀**：零 insert/update/upsert，不觸 captureFormState/raw_form_state/確收三欄/current.html/n8n。
- **純 JS (.mjs)**：零 build、零 runtime 依賴；外部不穩定 JSON 靠防禦碼非型別。
- **精簡 hybrid**：`index.mjs` + `lib/decoder` + `lib/match`，餘 inline。
- **v2 三自我修正機制**：別名字典 `ig_name_map.json`、🔴🟡⚪ 訊號分層+雜訊抑制、覆蓋帳本 `coverage.json`。

## 四、6 項強制修正（C1–C6，全內化）

- C1：`orders` 無 `total_amount`，改用 `order_id/customer_name/deposit/final_sale_price/created_at`（實地核實 0001_initial_schema.sql）
- C2：DM 訂金金額對 `orders.deposit`
- C3：`sales_pipeline` 命中也算非漏單（避免查詢誤報）
- C4：棄 string-similarity，CJK 用 Levenshtein+子串，名字僅一訊號
- C5：唯讀查詢用 anon key（最小權限）
- C6：mojibake 解碼加 U+FFFD 品質守衛

## 五、驗收

- **單元測試**：19/19 PASS（decoder 7 + match 12）`node --test`
- **離線 selftest**：5 thread → 🔴1（神秘新客，付款證據）/🟡1（問問手模，意圖無證據）/✅matched1（陳美玲）/📋pipeline1（李詢問）/skip1（路人甲無意圖）；mojibake 零亂碼
- **隱私**：`git check-ignore` 確認 `.fhs-local/`、`*.zip`、`output/` 全部 ignore；`git status` 僅 `M .gitignore` + `?? scripts/ig-watchdog/`，零私隱檔追蹤
- **pre-commit hook**：偵測 fixture DM JSON ✅、package.json 不誤觸 ✅

## 六、限制與後續

- 此系統覆蓋 **S1/S2 漏單**（IG 有單但 Supabase 無）。「未更新」(S3) 偵測為純 Supabase 內部掃描，與本 flow 解耦，可日後另開。
- DYI 匯出為**人工觸發**（Meta 非同步準備、連結 4 天時效），建議每週/每 3 日跑一次並選重疊窗口防覆蓋缺口。
- 待 Fat Mo 首次真實匯出後：跑 `--calibrate` 定 threshold + 建立 `ig_name_map.json` 別名。

## 七、回滾

刪 `scripts/ig-watchdog/` + `.fhs-local/` + 撤銷 `.gitignore` 相關 3 行，秒級復原，零線上影響。
