# Governance 治理層建立 + 記憶系統審視 + Obsidian D1 推翻 完成記錄

**日期**: 2026-07-04
**Session**: 137（Fable 5 立制度 session）
**Flow ID**: 2026-07-04-0806（記憶系統審視段落）
**執行者**: Claude Code（Fable 5 → 之後段落轉 Sonnet 5）
**授權**: Fat Mo `/cl-flow`（立制度任務）→ `/execute`（Verdict CONDITIONAL_READY）→ 追加口頭授權「可以執行1」「直接補上」

---

## 一、任務範圍

本 session 分兩個獨立但相連的任務：

**任務 A（立制度）**：Fat Mo 明確要求「這是唯一一次用 Fable 5 的機會，把判斷力轉成未來弱模型可沿用的制度」，交付 A-G 七項。

**任務 B（記憶系統審視）**：Fat Mo 認為現行 memory 系統混亂，且 Obsidian（原定專業記憶工具）因 2026-06-01（Session 51）判定的技術限制而半廢，要求全面審視並提出方案。

---

## 二、執行內容

### 任務 A：Governance 治理層（`.fhs/ai/governance/`，7 檔新建）

| 檔案 | 內容 |
|---|---|
| `00_INDEX.md` | 索引 + 與 AGENTS/commands/learnings/auto-memory 的職責邊界 |
| `01_diagnosis.md` | Harness 診斷：token 洩漏（handoff.md 121K tokens 無輪轉）/ 失焦（隨做隨寫缺失、scope creep）/ 出錯（自驗豁免漂移、巨檔誤替換、過期值沿用）前三名，全部實測數字 |
| `02_model-dispatch.md` | 指揮官不下場門檻、派工三件套、model 分派表（sonnet/opus/haiku/fable）+ 升降級機械規則、驗證不自驗分流表、巨檔紀律 |
| `03_judgment-rubrics.md` | R1-R6：何時升級模型/何時算完成/何時該問人/方向錯了的訊號/品質底線怎麼驗/誠實極限，每條附 FHS 史正反例 |
| `04_delegation-templates.md` | 搜尋/實作/重構/研究/審查 五套派工模板，填空即用 |
| `05_maintenance-protocol.md` | 權限矩陣（可自改 vs 先問 Fat Mo）、教訓落點分流、handoff 輪轉 SOP、精簡觸發、季度健檢 |
| `06_letter-to-future-sessions.md` | 給未來 session 的信：三件最重要的事 + 六種制度退化模式與預防 |

**CLAUDE.md 重寫**：從 4 條靜態指示改為路由層（治理路由表 + 三條免查紅線）。原檔備份 `backups/CLAUDE.md.2026-07-04.bak`。

**對抗審查**：fresh-context opus agent 審查全部 7 檔 + CLAUDE.md，verdict **PASS-with-fixes**（信心高，12 路徑 ls 實測 + 數字交叉核對）。2 個中級 findings（巨檔名單檔名大小寫不精確、handoff 前 120 行組成數字打架）+ 5 條風格建議，全部已修正並 read-back 驗證。

### 任務 B：記憶系統審視 → Obsidian D1 推翻 → wikilink 補建

**發現**：`/cl-flow-fast` 執行中查出 Session 51（2026-06-01）已有完整 D1/D2 決策——D1 認定「`.fhs/` 對 Obsidian 永遠不可見」為不可配置的平台限制。Fat Mo 確認此判定基於的方案「不健全，因讀不到 project 核心檔」。

**技術研究**（2 輪，第 1 輪 general-purpose 子任務誤解自身角色致零實質產出，重派後修正）：確認 Obsidian 無原生 dotfile 顯示設定，但社群外掛 `obsidian-hidden-folders-access`（dsebastien，2026-05 仍維護）可透過白名單機制讓 dot-directory 於 FileExplorer/Graph/metadata cache 正常索引。

**Pilot 實測**（computer-use 操作 Obsidian GUI）：
1. 安裝外掛（`.obsidian/plugins/hidden-folders-access/`），白名單 `.fhs`
2. `.fhs/` 立即出現於檔案樹，子資料夾/檔案正常展開
3. 最大風險項驗證：`handoff.md`（3,918 行/166,408 字元）**瞬間開啟零延遲**；`lessons/`（70 檔，卡在外掛已知當機門檻）**瞬間展開零當機**
4. Graph View 初測（`path:.fhs` 篩選）僅 4 個孤立節點——確認為內容缺乏 `[[wikilink]]`，非外掛失敗（點擊節點確認檔案正常開啟且有 metadata/backlink）

**wikilink 補建**（Fat Mo 授權「直接補上」）：
- 主對話直接執行：`docs/FHS_Knowledge_Map.md`（移除過時「.fhs 不可見」聲明，加入 `.fhs/` 側關鍵檔案連結）、governance 7 檔互相交叉連結、`decisions.md` S51 條目加後續更新提示 + 新增 D4 條目記錄本次推翻決策
- 派 subagent（general-purpose, sonnet）：`learnings.md`（49條）↔ `lessons/`（70檔）配對，**成功配對 5 條，44 條因證據不足寧缺勿配**，git diff 逐行核對確認零誤改原文
- **最終驗證**：Graph View 篩選 `.fhs` 由「4 個孤立點」變為「約 12 節點密集互連的關聯網」

---

## 三、影響檔案

| 檔案 | 動作 | 說明 |
|---|---|---|
| `.fhs/ai/governance/` | [NEW] | 7 個新檔 + backups/ 子資料夾 |
| `CLAUDE.md` | [MODIFY] | 重寫為路由層 |
| `.obsidian/plugins/hidden-folders-access/` | [NEW] | 第三方社群外掛（main.js/manifest.json/styles.css） |
| `.obsidian/community-plugins.json` | [NEW] | 啟用外掛清單 |
| `docs/FHS_Knowledge_Map.md` | [MODIFY] | 移除過時聲明 + 加入 `.fhs/` 側連結 |
| `.fhs/notes/decisions.md` | [MODIFY] | S51 條目加更新提示 + 新增 S137 D4 條目 |
| `.fhs/memory/learnings.md` | [MODIFY] | 5 條追加 wikilink（無原文改動） |
| `.fhs/memory/lessons/*.md`（6 檔） | [MODIFY] | 追加反向連結標頭（無原文改動） |
| `docs/repo-map.md` | [MODIFY] | 加入 governance/ 目錄結構 + `.obsidian/plugins/` 說明 |
| `README.md` | [MODIFY] | 資料夾結構表加入 governance/ 一行 |

## 四、風險與緩解

- **第三方外掛依賴**：`hidden-folders-access` 非官方套件，若停止維護或行為變更，`.fhs` 可見性可能回退——純顯示層風險，不影響底層資料完整性，可隨時停用外掛還原。
- **Obsidian D2（三層記憶職責邊界）維持不變**：Notion 人類真相源最高優先、AI 唯一寫入 `.fhs/memory`、Obsidian 視覺層不參與衝突解析——本次僅解除 D1 技術限制認定，未變更任何寫入權責。
- **wikilink 覆蓋不完整**：49 條 learnings 僅 5 條配對成功，44 條因缺乏足夠證據暫未連結（多數 lesson 未單獨蒸餾成檔案）——誠實現況，非任務缺陷；未來新增 lessons 檔案時應同步補建連結（已記入 `05_maintenance-protocol.md` 維護協議）。

## 五、待辦（Fat Mo 授權後執行）

- 6 支 subagent frontmatter 過時 model ID（`claude-sonnet-4-6`）更新
- `handoff.md` 首次輪轉（`05_maintenance-protocol.md` §4 SOP 已備）
- AGENTS.md 本體未動（僅診斷），如需採納 governance 建議需另行授權

---

【交付前雙紀律自檢】
驗收：制度治理任務 — fresh-context opus 對抗審查 PASS-with-fixes（governance 7 檔）+ Obsidian pilot 實機驗證（screenshot/Graph View 前後對照，非文檔宣稱）+ git diff 逐行核對 wikilink 補建零誤改原文 = ✅；無財務欄位/HTML ID/raw_form_state/n8n/migration 改動，不觸發 finance-auditor
Subagent：✅ 已使用（general-purpose × 4：對抗審查 opus 1次、Obsidian 技術研究 sonnet 2次[第1次失敗重派]、learnings↔lessons wikilink 配對 sonnet 1次）；委派理由：對抗審查需要沒寫過原文的視角、技術研究需大量 WebSearch 避免污染主對話、批量檔案配對屬機械式多檔案操作
