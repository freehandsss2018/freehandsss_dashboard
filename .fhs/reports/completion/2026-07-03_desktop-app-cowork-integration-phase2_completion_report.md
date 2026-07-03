# Phase 2 完成記錄：Claude Desktop App 收斂 — Skills 收斂 + Cowork 治理 + 三模式決策卡

**日期**: 2026-07-03
**Flow ID**: 2026-07-03-0014
**依據**: `artifacts/2026-07-03-0014/cl-final-plan-v2.md`（v2.3）
**執行者**: Claude (A3, Desktop Code 分頁 via VSCode ext session)
**授權**: Fat Mo `/execute Phase 2`

---

## 一、任務範圍（Verdict 已批准）

1. Skills 收斂：`.gemini/skills` 22 支複製至 `.claude/skills/`，`.fhs/ai/skills` 適用者橋接
2. Cowork 治理替代方案文件
3. 三模式決策卡（含單一寫者矩陣，涵蓋 Desktop/Cowork/AG/Cursor）

## 二、執行內容

### 2.1 Skills 收斂

- **`.gemini/skills` → `.claude/skills/`**：22 支全數複製（normalize/onboard/polish/animate/clarify/audit/quieter/typeset/harden/overdrive/delight/arrange/teach-impeccable/critique/colorize/bolder/frontend-design/optimize/adapt/distill/extract/px）
- **凍結標記**：22 支原目錄各自 SKILL.md 於 frontmatter 後插入 HTML 註解標記，不改動 frontmatter 本體，AG 解析不受影響
- **`.fhs/ai/skills` 橋接（實際 4 支，非原計劃假設的 6 支）**：

  | 目錄 | 處置 | 理由 |
  |---|---|---|
  | fhs-bug-triage | ✅ 橋接 | 有 name+description，可 Skill-tool 發現 |
  | fhs-p-product-display | ✅ 橋接 | 同上 |
  | fhs-overview-badge-layout | ✅ 橋接 | 同上 |
  | finance-gatekeeper | ✅ 橋接（description 為橋接層新增） | Master 缺 description，原設計為 pre-load 強制引用；橋接層補上使其亦可被 Skill-tool 發現 |
  | finance-calculator | ❌ 不橋接 | Master 已標記 DEPRECATED（併入 finance-gatekeeper），橋接會製造假活體 |
  | ui-ux-pro-max | ❌ 不橋接 | 純參考層，無 description 欄位，由 subagent 直接 Read 取用，非 Skill-tool 發現模式 |

  **偏差說明**：v2.3 計劃文字寫「6 支橋接」，執行時發現其中 2 支不適合橋接（1 支過時、1 支非 Skill 格式）。已如實記錄，未強行湊數。

### 2.2 Cowork 治理文件

`.fhs/reports/planning/fhs_cowork_governance.md` — 開場協議 / 讀寫分工 / 落盤紀律 / 衝突副本偵測，基於 Phase 0 P6–P8 探針實測結果撰寫（非假設）。

### 2.3 三模式決策卡

`.fhs/notes/FHS_Mode_Card.md` — 一句 heuristic + 情境對照表 + 單一寫者矩陣（Desktop Code/CLI/Cowork/AG/Cursor 五欄）+ 各工具入場條件 + Skills 資產狀態。

## 三、影響檔案清單

| 動作 | 路徑 |
|---|---|
| [NEW] | `.claude/skills/`（22+4 = 26 個技能目錄） |
| [MODIFY] | `.gemini/skills/*/SKILL.md`（22 支，僅新增凍結標記註解） |
| [NEW] | `.fhs/reports/planning/fhs_cowork_governance.md` |
| [NEW] | `.fhs/notes/FHS_Mode_Card.md` |
| [MODIFY] | `docs/repo-map.md`（Skills + 決策卡 + 治理文件條目） |
| [MODIFY] | `README.md`（AI 助理入口段落加 Desktop App/Cowork） |

## 四、驗證（V2b 對應）

- 新 session 中 Skill 工具清單即時顯示新增技能（過程中系統自動確認 fhs-bug-triage / fhs-p-product-display / fhs-overview-badge-layout / finance-gatekeeper 均可發現）
- 22 支 `.gemini` skills 亦於複製後即時出現在可用清單
- Token 負載：未實測精確數字，留待下次 session 邊界觀察（V2b 完整驗收項）

## 五、未完成/後續

- Phase 2.4 單一寫者矩陣已併入 Mode Card 產出（原計劃視為 Phase 2.4 獨立項，實際與 2.3 決策卡合併交付，無需另開文件）
- Phase 2.5 Cursor：C1 探針已由 Fat Mo 口頭確認「未安裝，近期不用」→ 整項擱置，零配置遺留（已記錄於 cl-final-plan-v2.md 與 decisions.md）
- V2b「context 佔用 ≤15k token」精確量測待後續驗收

---

【交付前雙紀律自檢】
驗收：純文件治理任務——引用同步清單見上表，Skill 工具即時發現新增技能已於執行過程系統層面確認（非口稱）；斷鏈數 0
Subagent：前置評估 general-purpose/Explore，Phase 2 為文件產出+檔案操作，無需委託，直接處理更高效 → ❌ 未使用 subagent
