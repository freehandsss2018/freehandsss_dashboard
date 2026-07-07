# /fhs-usage-audit（Claude Code 使用行為審計 v1.0）

**用途**：掃描 Claude Code transcript（`~/.claude/projects/`），複盤「事後用量」——邊啲 prompt 重複出現、邊啲人手流程可變 skill/hook、邊啲 session 浪費 token 喺重複讀檔。輸出「可 skill 化清單 + 重複 prompt 清單 + 浪費模式清單」，並與上次快照對比趨勢。

**觸發指令**：`/fhs-usage-audit`
**性質**：唯讀診斷。不修改任何專案檔案，只寫入 `.fhs/.usage-report.json`（gitignore）與 `.fhs/memory/usage-audit/` 快照。
**版本**：v1.0.0（2026-07-07，S153 新建）

---

## 與 `/fhs-slim`、`/fhs-audit` 的分界（避免重複造輪）

| | `/fhs-audit` | `/fhs-slim` | `/fhs-usage-audit` |
|---|---|---|---|
| 審什麼 | 系統架構衛生（30項） | 文件五病（過肥/孤兒/過時/重複/斷鏈） | **AI 使用行為**（重複輸入/工具浪費/可 skill 化模式） |
| 資料來源 | repo 檔案結構 | repo 檔案結構 | `~/.claude/projects/*.jsonl`（repo 之外） |
| 執行動作 | 唯讀報告 | 唯讀＋內建清理流程 | 唯讀報告（**不含清理/實作**，發現的行動項另開任務） |
| 週期 | ~90天 | 每 session L1 自動偵測 | ~30天（用量模式變化較快） |

三者正交：slim 審文件、audit 審架構、usage-audit 審**行為**。不共用資料來源，不重複邏輯。

---

## 執行流程

### Step 1 — 跑 L1 掃描器

```
node scripts/usage-audit/scan.js
```

（若上次快取逾期或懷疑資料失真，可加 `--full` 強制全掃）

讀取輸出 `.fhs/.usage-report.json`（結構：`commands` / `tools` / `models` / `subagents` / `bash_prefix_top` / `read_targets_top` / `grep_paths_top` / `themes` / `repeated_prompts` / `short_prompts_top` / `sessions`）。

**紅線**：report 內任何欄位皆已由 scan.js 脫敏（JWT/PAT/KEY 已替換為 `[REDACTED_*]`），但若人工追加分析時直接讀取原始 `.jsonl`，必須沿用同等脫敏紀律，禁止將明文 token 貼入回覆或快照。

### Step 2 — 讀取上次快照（若存在）

讀 `.fhs/memory/usage-audit/` 目錄下最新一份 `YYYY-MM-DD.json`（按檔名排序取最新，不需全讀目錄逐一比對内容），與本次 report 做差異對比（新增的重複 prompt、消失的浪費模式、指令頻率變化）。無快照 → 標明「首次執行，無趨勢對比」。

### Step 3 — 產出三清單

1. **可 Skill 化清單**：`repeated_prompts`（count≥3）逐項判斷——是重複貼的長 prompt模板（建議做成 skill/指令參數）、還是輪詢式短句（`short_prompts_top`，建議接 Stop hook 通知取代人手輪詢）、還是定期檢查類（建議 `/schedule`）。
2. **重複 Prompt 清單**：直接列 `repeated_prompts` 前 N 項＋出現次數，標明哪些屬 bridge 指令本身的正常重複（如 `/rp`、`/read` 的 bridge 文字，這是指令觸發機制本身，非「壞重複」）vs 真正手打重複（如反覆貼的分析框架）。
3. **浪費模式清單**：交叉分析 `tools`（Read/Grep/Bash 占比）＋`read_targets_top`（同一巨檔被重讀次數）＋`bash_prefix_top`（`cd`/`grep`/`cat` 等應由專用工具取代的 Bash 呼叫）＋`sessions` 中 size_mb/user_msgs 比例異常者（token 消耗 vs 實際產出不成比例的 session）。

每清單條目格式：`發現 → 數據佐證 → 建議行動（若涉及新建 skill/hook/command，只提方案不動手，等 Fat Mo 裁決）`。

### Step 4 — 存快照

寫入 `.fhs/memory/usage-audit/YYYY-MM-DD.json`，內容為 Step 1 report 的聚合統計子集（**只存聚合數字，不存 `repeated_prompts` 以外的任何長文本樣本**，避免快照本身變成二次洩漏面或過肥文件）：

```json
{
  "date": "YYYY-MM-DD",
  "sessions_total": <int>,
  "commands": [...],
  "tools_top10": [...],
  "themes": [...],
  "repeated_prompts_top10": [...]
}
```

### Step 5 — 完成回報

輸出格式比照 `fhs-audit.md`／`fhs-slim.md` 慣例：

```
✅ /fhs-usage-audit 完成 [YYYY-MM-DD]
- 掃描：N sessions（M 檔新掃 / K 檔沿用快取）
- 可 Skill 化清單：[N 項，見上]
- 重複 Prompt 清單：[N 項，見上]
- 浪費模式清單：[N 項，見上]
- 與上次快照對比：[新增/消失的模式，或「首次執行」]
- 快照已存：.fhs/memory/usage-audit/YYYY-MM-DD.json
```

## 執行規則

- 全程唯讀，Step 1 只執行 scan.js（不修改專案內任何業務檔案）；Step 4 寫快照是本指令唯一的寫入動作
- 三清單中的「建議行動」若涉及新建 skill/subagent/command/hook，**只出方案，不動手實作**——比照 CLAUDE.md Rule 3，架構改動需 Fat Mo 先批准
- 發現的浪費模式若指向既有紅線違規（例如巨檔全讀、Bash 取代專用工具），可直接引用 CLAUDE.md「三條免查即生效紅線」原文，不必重新論證
- 若 `scan.js` 因設定檔缺失或路徑失效而提早退出，回報確切原因（比照 `read.md` 防守檢查），不得假裝掃描成功

## 版本更新日誌

- v1.0.0（2026-07-07，S153）：初版，對接 `scripts/usage-audit/scan.js`，與 `/fhs-slim`（文件衛生）正交
